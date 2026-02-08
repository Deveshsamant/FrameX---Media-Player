use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::collections::hash_map::DefaultHasher;
use std::hash::{Hash, Hasher};
use tauri::command;
use base64::{Engine as _, engine::general_purpose};
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

fn get_cache_dir() -> PathBuf {
    let mut cache = std::env::temp_dir();
    cache.push("framex_thumbs");
    let _ = fs::create_dir_all(&cache);
    cache
}

fn hash_path(path: &str) -> String {
    let mut hasher = DefaultHasher::new();
    path.hash(&mut hasher);
    format!("{:x}", hasher.finish())
}

#[command]
pub fn generate_thumbnail(video_path: String) -> Result<String, String> {
    let cache_dir = get_cache_dir();
    let cache_file = cache_dir.join(format!("{}.jpg", hash_path(&video_path)));
    
    // Check cache first - instant return if exists
    if cache_file.exists() {
        let img_data = fs::read(&cache_file).map_err(|e| e.to_string())?;
        let base64_str = general_purpose::STANDARD.encode(&img_data);
        return Ok(format!("data:image/jpeg;base64,{}", base64_str));
    }
    
    let output_path_str = cache_file.to_string_lossy().to_string();

    let mut command = Command::new("ffmpeg");
    
    #[cfg(target_os = "windows")]
    command.creation_flags(CREATE_NO_WINDOW);

    let output = command
        .arg("-y")
        .arg("-hide_banner")
        .arg("-loglevel").arg("error")
        .arg("-nostdin")
        .arg("-ss").arg("1")
        .arg("-i").arg(&video_path)
        .arg("-frames:v").arg("1")
        .arg("-vf").arg("scale=280:-1")
        .arg("-q:v").arg("8")
        .arg(&output_path_str)
        .output()
        .map_err(|e| format!("FFmpeg error: {}", e))?;

    if !output.status.success() {
        // Fallback to 0s
        let mut retry = Command::new("ffmpeg");
        #[cfg(target_os = "windows")]
        retry.creation_flags(CREATE_NO_WINDOW);
        
        let _ = retry
            .arg("-y").arg("-hide_banner").arg("-loglevel").arg("error").arg("-nostdin")
            .arg("-i").arg(&video_path)
            .arg("-frames:v").arg("1")
            .arg("-vf").arg("scale=280:-1")
            .arg("-q:v").arg("8")
            .arg(&output_path_str)
            .output();
    }

    if !cache_file.exists() {
        return Err("Failed to generate thumbnail".to_string());
    }

    let img_data = fs::read(&cache_file).map_err(|e| e.to_string())?;
    let base64_str = general_purpose::STANDARD.encode(&img_data);
    
    Ok(format!("data:image/jpeg;base64,{}", base64_str))
}
