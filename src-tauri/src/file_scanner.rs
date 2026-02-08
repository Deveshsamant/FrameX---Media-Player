use walkdir::WalkDir;
use tauri::command;
use std::path::Path;

#[command]
pub fn list_videos(folder_path: String) -> Result<Vec<String>, String> {
    let supported_extensions = ["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv"];
    let mut videos = Vec::new();

    for entry in WalkDir::new(folder_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if let Some(ext_str) = ext.to_str() {
                    if supported_extensions.contains(&ext_str.to_lowercase().as_str()) {
                        if let Some(path_str) = path.to_str() {
                            videos.push(path_str.to_string());
                        }
                    }
                }
            }
        }
    }
    
    // Sort videos alphabetically
    videos.sort();

    Ok(videos)
}
