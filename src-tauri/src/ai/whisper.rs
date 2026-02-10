use tauri::{AppHandle, Emitter};
use std::process::Command;
use std::path::{Path, PathBuf};

#[derive(serde::Serialize, Clone)]
pub struct WhisperProgress {
    pub status: String,
    pub progress: f32,
}

#[tauri::command]
pub async fn run_whisper(
    app: AppHandle,
    video_path: String,
    model: Option<String>,
    language: Option<String>,
) -> Result<String, String> {
    let video_path = PathBuf::from(&video_path);
    
    if !video_path.exists() {
        return Err("Video file does not exist".to_string());
    }

    // Output .vtt file will be saved next to the video
    let output_path = video_path.with_extension("vtt");
    
    // Default to base model and force English as requested
    let model_name = model.unwrap_or_else(|| "base".to_string());
    // Force English
    let lang = "en".to_string(); 

    // Emit progress event
    let _ = app.emit("whisper-progress", WhisperProgress {
        status: "Starting transcription (English)...".to_string(),
        progress: 0.0,
    });

    // Run whisper command
    // User needs to have `whisper` in PATH or we can configure a specific path
    // Use system temp directory for Whisper output to avoid path/permission issues with OneDrive/spaces
    let temp_dir = std::env::temp_dir();
    let unique_id = uuid::Uuid::new_v4().to_string(); // Use uuid to be safe if multiple run
    let temp_output_dir = temp_dir.join(format!("framex_whisper_{}", unique_id));
    std::fs::create_dir_all(&temp_output_dir).map_err(|e| format!("Failed to create temp dir: {}", e))?;
    
    // Canonicalize temp dir to ensure Whisper gets a clean absolute path
    let temp_output_dir = temp_output_dir.canonicalize().unwrap_or(temp_output_dir);

    let mut cmd = Command::new("whisper");
    cmd.arg(&video_path)
        .arg("--model")
        .arg(&model_name)
        .arg("--output_format")
        .arg("vtt")
        .arg("--output_dir")
        .arg(&temp_output_dir)
        .arg("--language")
        .arg(&lang)
        .arg("--verbose")
        .arg("True");

    // Debug: Print command
    println!("Running Whisper command: {:?}", cmd);

    // Create the command with creation_flags to hide window on Windows if needed (Optional, but good for UX)
    // For now, standard spawn
    let output = cmd.output().map_err(|e| {
        format!("Failed to execute whisper: {}. Make sure whisper is installed and in PATH.", e)
    })?;

    println!("Whisper Output Status: {}", output.status);
    // println!("Whisper Stdout: {}", String::from_utf8_lossy(&output.stdout)); // Too noisy?
    println!("Whisper Stderr: {}", String::from_utf8_lossy(&output.stderr));

    if output.status.success() {
        // Find the generated .vtt file in the temp dir
        let mut found_temp_file = None;
        println!("Scanning temp dir: {:?}", temp_output_dir);
        
        if let Ok(entries) = std::fs::read_dir(&temp_output_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                println!("Found file in temp: {:?}", path);
                if path.extension().map_or(false, |ext| ext == "vtt") {
                    found_temp_file = Some(path);
                    // Don't break immediately, let's see all files for debug if needed, 
                    // but functionally we take the first VTT
                    // break; 
                }
            }
        }
        
        // Recover output path from loop
        // We need to re-scan or just take the one referencing found_temp_file
        // Ideally there's only one.
        
        if let Some(temp_file_path) = found_temp_file {
             // ... existing copy logic ...
             println!("Found temp file: {}", temp_file_path.display());
             // Move/Copy to final destination
             // We rename if possible, otherwise copy and delete
             // Trying rename first
             // Note: rename might fail across filesystems (unlikely here but possible), so we fallback to copy
             if std::fs::rename(&temp_file_path, &output_path).is_err() {
                  std::fs::copy(&temp_file_path, &output_path).map_err(|e| format!("Failed to copy file to destination: {}", e))?;
                  let _ = std::fs::remove_file(&temp_file_path);
             }
             
             // Clean up temp dir
             let _ = std::fs::remove_dir_all(&temp_output_dir);
 
             let _ = app.emit("whisper-progress", WhisperProgress {
                 status: "Transcription complete!".to_string(),
                 progress: 100.0,
             });
             Ok(output_path.to_string_lossy().to_string())
        } else {
             // Debugging: List what WAS there before deleting
             let files_str = if let Ok(entries) = std::fs::read_dir(&temp_output_dir) {
                 entries.filter_map(|e| e.ok()).map(|e| e.path().display().to_string()).collect::<Vec<_>>().join(", ")
             } else {
                 "Could not read dir".to_string()
             };
             
             let _ = std::fs::remove_dir_all(&temp_output_dir); // Cleanup
             Err(format!("Whisper finished but no .vtt file found in {}. Files present: [{}]", temp_output_dir.display(), files_str))
        }
    } else {
        let _ = std::fs::remove_dir_all(&temp_output_dir); // Cleanup
        let error = String::from_utf8_lossy(&output.stderr);
        Err(format!("Whisper failed: {}", error))
    }
}
