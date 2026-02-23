use std::sync::Arc;

use tauri::{AppHandle, Emitter, State};
use tokio_util::sync::CancellationToken;

use crate::plugins::traits::{PacketEnrichment, PluginInfo, PluginProgress, PluginResult};
use crate::state::AppState;

#[tauri::command]
pub fn list_plugins(state: State<'_, AppState>) -> Vec<PluginInfo> {
    state.plugin_registry.list()
}

#[tauri::command]
pub fn get_plugin_params(state: State<'_, AppState>, name: String) -> Result<serde_json::Value, String> {
    state
        .plugin_registry
        .get(&name)
        .map(|p| p.default_params())
        .ok_or_else(|| format!("Plugin '{}' not found", name))
}

#[tauri::command]
pub fn check_plugin_available(state: State<'_, AppState>, name: String) -> Result<bool, String> {
    state
        .plugin_registry
        .get(&name)
        .map(|p| p.is_available())
        .ok_or_else(|| format!("Plugin '{}' not found", name))
}

#[tauri::command]
pub async fn run_plugin(
    app: AppHandle,
    state: State<'_, AppState>,
    name: String,
    params: serde_json::Value,
) -> Result<PluginResult, String> {
    // Clone the Arc<PluginRegistry> so we don't hold State<'_> across .await
    let registry = Arc::clone(&state.plugin_registry);

    // Validate plugin exists and is available (synchronous, borrows registry not state)
    let plugin = registry
        .get(&name)
        .ok_or_else(|| format!("Plugin '{}' not found", name))?;

    if !plugin.is_available() {
        return Err(format!("Plugin '{}' is not available (CLI tool not installed)", name));
    }

    // Set up cancellation token (quick synchronous state access)
    let cancel = CancellationToken::new();
    state
        .plugin_cancels
        .write()
        .insert(name.clone(), cancel.clone());

    let (progress_tx, mut progress_rx) = tokio::sync::mpsc::channel::<PluginProgress>(64);

    // Spawn progress forwarder to Tauri events
    let app2 = app.clone();
    tokio::spawn(async move {
        while let Some(progress) = progress_rx.recv().await {
            let _ = app2.emit("plugin-progress", &progress);
        }
    });

    // Execute plugin — `plugin` borrows from the cloned Arc, not from State<'_>
    let result = plugin
        .execute(params, cancel.clone(), progress_tx)
        .await
        .map_err(|e| e.to_string())?;

    // Store result and enrichments (quick synchronous state access after .await)
    {
        let mut results = state.plugin_results.write();
        results.insert(name.clone(), result.clone());
    }
    {
        let mut enrichments = state.enrichments.write();
        for e in &result.enrichments {
            enrichments.insert(e.ip.clone(), e.clone());
        }
    }

    // Remove cancel token
    state.plugin_cancels.write().remove(&name);

    let _ = app.emit("plugin-complete", &result);

    Ok(result)
}

#[tauri::command]
pub fn cancel_plugin(state: State<'_, AppState>, name: String) -> Result<(), String> {
    let cancels = state.plugin_cancels.read();
    if let Some(token) = cancels.get(&name) {
        token.cancel();
        Ok(())
    } else {
        Err(format!("No running plugin '{}' to cancel", name))
    }
}

#[tauri::command]
pub fn get_plugin_result(state: State<'_, AppState>, name: String) -> Result<Option<PluginResult>, String> {
    let results = state.plugin_results.read();
    Ok(results.get(&name).cloned())
}

#[tauri::command]
pub fn get_enrichments(state: State<'_, AppState>) -> Vec<PacketEnrichment> {
    state.enrichments.read().values().cloned().collect()
}
