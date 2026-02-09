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
    generate_thumbnail_at_time(video_path, 1.0)
}

#[command]
pub fn generate_seek_preview(video_path: String, time: f64) -> Result<String, String> {
    // For seek previews, we might want to round the time to the nearest 5 or 10 seconds 
    // to improve cache hit rate, or just use the exact time. 
    // For a smooth slider, exact time is better, but caching might flood.
    // Let's round to 1 decimal place for now.
    let rounded_time = (time * 10.0).round() / 10.0;
    generate_thumbnail_at_time(video_path, rounded_time)
}

fn generate_thumbnail_at_time(video_path: String, time: f64) -> Result<String, String> {
    let cache_dir = get_cache_dir();
    // Include time in hash and version to invalidate old low-res cache
    let hash_input = format!("{}::{}:v2", video_path, time);
    let cache_file = cache_dir.join(format!("{}.jpg", hash_path(&hash_input)));
    
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
        .arg("-ss").arg(time.to_string())
        .arg("-i").arg(&video_path)
        .arg("-frames:v").arg("1")
        .arg("-vf").arg("scale=640:-1") // HD Width
        .arg("-q:v").arg("2") // High Quality
        .arg(&output_path_str)
        .output()
        .map_err(|e| format!("FFmpeg error: {}", e))?;

    if !output.status.success() {
        return Err("Failed to generate thumbnail".to_string());
    }

    if !cache_file.exists() {
        return Err("Failed to generate thumbnail file".to_string());
    }

    let img_data = fs::read(&cache_file).map_err(|e| e.to_string())?;
    let base64_str = general_purpose::STANDARD.encode(&img_data);
    
    Ok(format!("data:image/jpeg;base64,{}", base64_str))
}

#[command]
pub fn generate_preview(video_path: String) -> Result<String, String> {
    let cache_dir = get_cache_dir();
    let hash_input = format!("{}:preview", video_path);
    let cache_file = cache_dir.join(format!("{}.webp", hash_path(&hash_input)));
    
    if cache_file.exists() {
        let img_data = fs::read(&cache_file).map_err(|e| e.to_string())?;
        let base64_str = general_purpose::STANDARD.encode(&img_data);
        return Ok(format!("data:image/webp;base64,{}", base64_str));
    }
    
    let output_path_str = cache_file.to_string_lossy().to_string();

    // Generate 3s animated webp preview from 10% or 5s mark
    // Try at 5s first. If it fails (video too short), try at 0s.
    let try_generate = |start_time: &str| -> Result<std::process::Output, std::io::Error> {
        let mut command = Command::new("ffmpeg");
        #[cfg(target_os = "windows")]
        command.creation_flags(CREATE_NO_WINDOW);
        
        command
            .arg("-y")
            .arg("-hide_banner")
            .arg("-loglevel").arg("error")
            .arg("-nostdin")
            .arg("-ss").arg(start_time)
            .arg("-t").arg("3.0")
            .arg("-i").arg(&video_path)
            .arg("-vf").arg("fps=10,scale=320:-1:flags=lanczos")
            .arg("-loop").arg("0")
            .arg("-q:v").arg("50")
            .arg(&output_path_str)
            .output()
    };

    // Ensure we start fresh
    if cache_file.exists() {
        let _ = fs::remove_file(&cache_file);
    }

    let mut output = try_generate("5.0").map_err(|e| format!("FFmpeg error: {}", e))?;

    if !output.status.success() {
        // Fallback to start
        output = try_generate("0.0").map_err(|e| format!("FFmpeg error (fallback): {}", e))?;
    }

    if !output.status.success() {
        return Err("Failed to generate preview".to_string());
    }

    if !cache_file.exists() {
        return Err("Failed to generate preview file".to_string());
    }

    let metadata = fs::metadata(&cache_file).map_err(|e| e.to_string())?;
    if metadata.len() == 0 {
        let _ = fs::remove_file(&cache_file); // Cleanup empty file
        return Err("Generated preview file is empty".to_string());
    }

    let img_data = fs::read(&cache_file).map_err(|e| e.to_string())?;
    let base64_str = general_purpose::STANDARD.encode(&img_data);
    
    Ok(format!("data:image/webp;base64,{}", base64_str))
}
