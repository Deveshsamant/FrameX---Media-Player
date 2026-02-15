use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WatchEntry {
    pub path: String,
    pub position: f64,
    pub duration: f64,
    pub last_watched: u64,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct WatchHistoryData {
    entries: HashMap<String, WatchEntry>,
}

fn get_history_path(app: &AppHandle) -> Option<PathBuf> {
    app.path()
        .app_data_dir()
        .ok()
        .map(|p| p.join("watch_history.json"))
}

fn load_history(app: &AppHandle) -> WatchHistoryData {
    let Some(path) = get_history_path(app) else {
        return WatchHistoryData::default();
    };
    if !path.exists() {
        return WatchHistoryData::default();
    }
    let content = fs::read_to_string(&path).unwrap_or_default();
    serde_json::from_str(&content).unwrap_or_default()
}

fn save_history(app: &AppHandle, data: &WatchHistoryData) -> Result<(), String> {
    let path = get_history_path(app).ok_or("Failed to get history path")?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let json = serde_json::to_string_pretty(data).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())?;
    Ok(())
}

/// Save the current playback position for a video.
/// Only saves if position is > 5s and < 95% of duration (to avoid saving at the very end).
#[tauri::command]
pub fn save_watch_position(
    app: AppHandle,
    path: String,
    position: f64,
    duration: f64,
) -> Result<(), String> {
    if duration <= 0.0 {
        return Ok(());
    }

    let progress_percent = position / duration;

    // If nearly finished (>95%), remove the entry so it doesn't resume
    if progress_percent > 0.95 {
        let mut data = load_history(&app);
        data.entries.remove(&path);
        save_history(&app, &data)?;
        return Ok(());
    }

    // Only save if past the first 5 seconds
    if position < 5.0 {
        return Ok(());
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::SystemTime::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let mut data = load_history(&app);
    data.entries.insert(
        path.clone(),
        WatchEntry {
            path,
            position,
            duration,
            last_watched: now,
        },
    );
    save_history(&app, &data)?;
    Ok(())
}

/// Get the saved watch position for a specific video.
#[tauri::command]
pub fn get_watch_position(app: AppHandle, path: String) -> Result<Option<f64>, String> {
    let data = load_history(&app);
    Ok(data.entries.get(&path).map(|e| e.position))
}

/// Get all watch history entries, sorted by last_watched (most recent first).
#[tauri::command]
pub fn get_watch_history(app: AppHandle) -> Result<Vec<WatchEntry>, String> {
    let data = load_history(&app);
    let mut entries: Vec<WatchEntry> = data.entries.into_values().collect();
    entries.sort_by(|a, b| b.last_watched.cmp(&a.last_watched));
    // Only return the most recent 50
    entries.truncate(50);
    Ok(entries)
}

/// Clear all watch history.
#[tauri::command]
pub fn clear_watch_history(app: AppHandle) -> Result<(), String> {
    let data = WatchHistoryData::default();
    save_history(&app, &data)?;
    Ok(())
}
