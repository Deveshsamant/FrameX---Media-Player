use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::AppHandle;
use tauri::Manager;

#[derive(Serialize, Deserialize, Debug, Default)]
pub struct AppConfig {
    pub last_opened_folder: Option<String>,
}

fn get_config_path(app: &AppHandle) -> Option<PathBuf> {
    app.path().app_data_dir().ok().map(|p| p.join("config.json"))
}

#[tauri::command]
pub fn save_last_folder(app: AppHandle, path: String) -> Result<(), String> {
    save_last_folder_internal(&app, path)
}

pub fn save_last_folder_internal(app: &AppHandle, path: String) -> Result<(), String> {
    let config_path = get_config_path(app).ok_or("Failed to get config path")?;
    
    // Create config directory if it doesn't exist
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let mut config = if config_path.exists() {
        let content = fs::read_to_string(&config_path).unwrap_or_default();
        serde_json::from_str(&content).unwrap_or_default()
    } else {
        AppConfig::default()
    };

    config.last_opened_folder = Some(path);

    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(config_path, json).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub fn get_last_folder(app: AppHandle) -> Result<Option<String>, String> {
    let config_path = get_config_path(&app).ok_or("Failed to get config path")?;

    if !config_path.exists() {
        return Ok(None);
    }

    let content = fs::read_to_string(config_path).map_err(|e| e.to_string())?;
    let config: AppConfig = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(config.last_opened_folder)
}
