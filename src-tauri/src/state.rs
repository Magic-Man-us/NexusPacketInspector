use std::collections::HashMap;
use std::sync::Arc;

use parking_lot::RwLock;
use tokio_util::sync::CancellationToken;

use crate::parser::packet::ParsedPacket;
use crate::plugins::registry::PluginRegistry;
use crate::plugins::traits::{PacketEnrichment, PluginResult};

pub struct AppState {
    pub packets: RwLock<Vec<ParsedPacket>>,
    pub filtered_indices: RwLock<Vec<usize>>,
    pub file_path: RwLock<Option<String>>,
    pub is_loading: RwLock<bool>,
    pub plugin_registry: Arc<PluginRegistry>,
    pub plugin_results: RwLock<HashMap<String, PluginResult>>,
    pub plugin_cancels: RwLock<HashMap<String, CancellationToken>>,
    pub enrichments: RwLock<HashMap<String, PacketEnrichment>>,
}

impl AppState {
    pub fn new(registry: PluginRegistry) -> Self {
        Self {
            packets: RwLock::new(Vec::new()),
            filtered_indices: RwLock::new(Vec::new()),
            file_path: RwLock::new(None),
            is_loading: RwLock::new(false),
            plugin_registry: Arc::new(registry),
            plugin_results: RwLock::new(HashMap::new()),
            plugin_cancels: RwLock::new(HashMap::new()),
            enrichments: RwLock::new(HashMap::new()),
        }
    }
}
