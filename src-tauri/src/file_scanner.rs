use walkdir::WalkDir;
use tauri::command;
use std::path::Path;
use std::process::Command;
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(serde::Serialize)]
pub struct VideoEntry {
    path: String,
    name: String,
    size: u64,
    modified: u64,
    created: u64,
}

#[command]
pub fn list_videos(folder_path: String) -> Result<Vec<VideoEntry>, String> {
    let supported_extensions = ["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv"];
    let mut videos = Vec::new();

    for entry in WalkDir::new(folder_path).into_iter().filter_map(|e| e.ok()) {
        let path = entry.path();
        if path.is_file() {
            if let Some(ext) = path.extension() {
                if let Some(ext_str) = ext.to_str() {
                    if supported_extensions.contains(&ext_str.to_lowercase().as_str()) {
                        if let Some(path_str) = path.to_str() {
                            let metadata = std::fs::metadata(path).map_err(|e| e.to_string())?;
                            let size = metadata.len();
                            let modified = metadata.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                                .duration_since(std::time::SystemTime::UNIX_EPOCH).unwrap_or_default().as_secs();
                            let created = metadata.created().unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                                .duration_since(std::time::SystemTime::UNIX_EPOCH).unwrap_or_default().as_secs();
                            
                            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

                            videos.push(VideoEntry {
                                path: path_str.to_string(),
                                name,
                                size,
                                modified,
                                created,
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Default Sort (Alphabetical by name)
    videos.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(videos)
}

#[command]
pub fn get_video_duration(video_path: String) -> Result<f64, String> {
    let mut command = Command::new("ffprobe");
    
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command
        .arg("-v").arg("error")
        .arg("-show_entries").arg("format=duration")
        .arg("-of").arg("default=noprint_wrappers=1:nokey=1")
        .arg(&video_path)
        .output()
        .map_err(|e| format!("FFprobe error: {}", e))?;

    if !output.status.success() {
        return Err("Failed to get duration".to_string());
    }

    let duration_str = String::from_utf8_lossy(&output.stdout);
    let duration: f64 = duration_str.trim().parse().map_err(|_| "Failed to parse duration".to_string())?;

    Ok(duration)
}
