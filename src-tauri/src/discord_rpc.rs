use serde::Serialize;
use tauri::command;
use std::sync::Mutex;

// Simple Discord RPC state manager
// This is a lightweight implementation that tracks what should be displayed
// A full Discord IPC implementation would require platform-specific socket handling
// This provides the backend hooks so the feature can be connected later

#[derive(Serialize, Clone, Debug, Default)]
pub struct RpcActivity {
    pub state: String,
    pub details: String,
    pub large_image: String,
    pub large_text: String,
    pub start_timestamp: Option<u64>,
}

pub struct DiscordRpcState {
    pub connected: Mutex<bool>,
    pub activity: Mutex<Option<RpcActivity>>,
}

impl DiscordRpcState {
    pub fn new() -> Self {
        Self {
            connected: Mutex::new(false),
            activity: Mutex::new(None),
        }
    }
}

fn now_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

#[command]
pub fn discord_rpc_connect(state: tauri::State<'_, DiscordRpcState>) -> Result<bool, String> {
    let mut connected = state.connected.lock().map_err(|e| e.to_string())?;
    *connected = true;
    println!("[Discord RPC] Connected (placeholder - configure Discord App ID for full integration)");
    Ok(true)
}

#[command]
pub fn discord_rpc_update(
    state: tauri::State<'_, DiscordRpcState>,
    details: String,
    activity_state: String,
) -> Result<(), String> {
    let connected = state.connected.lock().map_err(|e| e.to_string())?;
    if !*connected {
        return Ok(());
    }

    let activity = RpcActivity {
        state: activity_state.clone(),
        details: details.clone(),
        large_image: "framex_logo".to_string(),
        large_text: "FrameX Media Player".to_string(),
        start_timestamp: Some(now_timestamp()),
    };

    let mut act = state.activity.lock().map_err(|e| e.to_string())?;
    *act = Some(activity);

    println!("[Discord RPC] Activity: {} - {}", details, activity_state);
    Ok(())
}

#[command]
pub fn discord_rpc_disconnect(state: tauri::State<'_, DiscordRpcState>) -> Result<(), String> {
    let mut connected = state.connected.lock().map_err(|e| e.to_string())?;
    *connected = false;
    let mut act = state.activity.lock().map_err(|e| e.to_string())?;
    *act = None;
    println!("[Discord RPC] Disconnected");
    Ok(())
}

#[command]
pub fn discord_rpc_status(state: tauri::State<'_, DiscordRpcState>) -> Result<bool, String> {
    let connected = state.connected.lock().map_err(|e| e.to_string())?;
    Ok(*connected)
}
