mod analysis;
mod commands;
mod parser;
mod plugins;
mod state;

use plugins::nmap::plugin::NmapPlugin;
use plugins::registry::PluginRegistry;
pub use state::AppState;

pub fn run() {
    let mut registry = PluginRegistry::new();
    registry.register(Box::new(NmapPlugin::new()));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(AppState::new(registry))
        .invoke_handler(tauri::generate_handler![
            commands::file::open_pcap,
            commands::file::get_packet_range,
            commands::filter::apply_filter,
            commands::plugin::list_plugins,
            commands::plugin::get_plugin_params,
            commands::plugin::run_plugin,
            commands::plugin::cancel_plugin,
            commands::plugin::get_plugin_result,
            commands::plugin::get_enrichments,
            commands::plugin::check_plugin_available,
            analysis::statistics::get_statistics,
            analysis::conversations::get_conversations,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
