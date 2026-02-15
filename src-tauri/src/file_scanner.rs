
use tauri::command;
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
    entry_type: String, // "video" or "folder"
    poster_path: Option<String>,
}

use crate::config::save_last_folder_internal;

#[command]
pub fn list_videos(app: tauri::AppHandle, folder_path: String) -> Result<Vec<VideoEntry>, String> {
    let _ = save_last_folder_internal(&app, folder_path.clone());
    let supported_extensions = ["mp4", "mkv", "avi", "mov", "webm", "flv", "wmv"];
    let mut entries = Vec::new();

    // Read directory (non-recursive)
    let dir = std::fs::read_dir(&folder_path).map_err(|e| e.to_string())?;

    for entry in dir.filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        
        let path_str = match path.to_str() {
            Some(s) => s.to_string(),
            None => continue,
        };

        let metadata = match std::fs::metadata(&path) {
            Ok(m) => m,
            Err(_) => continue,
        };
        
        // Handle Folders
        if path.is_dir() {
            // Check for poster in the folder: poster.jpg, or {folder_name}.poster.jpg
            let mut folder_poster_path = None;
            let poster_check_1 = path.join("poster.jpg");
            let poster_check_2 = path.join(format!("{}.poster.jpg", &name));
            
            if poster_check_1.exists() {
                folder_poster_path = Some(poster_check_1.to_string_lossy().to_string());
            } else if poster_check_2.exists() {
                folder_poster_path = Some(poster_check_2.to_string_lossy().to_string());
            }

            entries.push(VideoEntry {
                path: path_str,
                name,
                size: 0,
                modified: metadata.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                    .duration_since(std::time::SystemTime::UNIX_EPOCH).unwrap_or_default().as_secs(),
                created: metadata.created().unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                    .duration_since(std::time::SystemTime::UNIX_EPOCH).unwrap_or_default().as_secs(),
                entry_type: "folder".to_string(),
                poster_path: folder_poster_path,
            });
            continue;
        }

        // Handle Videos
        if path.is_file() {
             if let Some(ext) = path.extension() {
                if let Some(ext_str) = ext.to_str() {
                    if supported_extensions.contains(&ext_str.to_lowercase().as_str()) {
                         let size = metadata.len();
                         let modified = metadata.modified().unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                                .duration_since(std::time::SystemTime::UNIX_EPOCH).unwrap_or_default().as_secs();
                         let created = metadata.created().unwrap_or(std::time::SystemTime::UNIX_EPOCH)
                                .duration_since(std::time::SystemTime::UNIX_EPOCH).unwrap_or_default().as_secs();
                         
                         // Check for poster - Anywhere, checking the folder name is unnecessary restriction
                         // let parent_name = path.parent()
                         //    .and_then(|p| p.file_name())
                         //    .and_then(|n| n.to_str())
                         //    .unwrap_or("");
 
                         let mut poster_path = None;
                         
                         // if parent_name.eq_ignore_ascii_case("Movies") {
                             let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("video");
                             let poster_filename = format!("{}.poster.jpg", stem);
                             // Also check for simple .jpg with same name (common convention)
                             let simple_poster_filename = format!("{}.jpg", stem);
                             
                             let parent_dir = path.parent().unwrap_or(std::path::Path::new(""));
                             let poster_path_buf = parent_dir.join(&poster_filename);
                             let simple_poster_path_buf = parent_dir.join(&simple_poster_filename);
                             
                             if poster_path_buf.exists() {
                                 poster_path = Some(poster_path_buf.to_string_lossy().to_string());
                             } else if simple_poster_path_buf.exists() {
                                // Only use .jpg if it's not the video itself (unlikely for mp4 but possible for some extensions)
                                 poster_path = Some(simple_poster_path_buf.to_string_lossy().to_string());
                             }
                         // }

                         entries.push(VideoEntry {
                            path: path_str,
                            name,
                            size,
                            modified,
                            created,
                            entry_type: "video".to_string(),
                            poster_path, // Add poster path
                        });
                    }
                }
             }
        }
    }
    
    // Sort: Folders first, then Videos. Both alphabetical.
    entries.sort_by(|a, b| {
        if a.entry_type != b.entry_type {
            if a.entry_type == "folder" { std::cmp::Ordering::Less } else { std::cmp::Ordering::Greater }
        } else {
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        }
    });

    Ok(entries)
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
    let duration = duration_str.trim().parse().map::<f64, _>(|d| d).unwrap_or(0.0);

    Ok(duration)
}
