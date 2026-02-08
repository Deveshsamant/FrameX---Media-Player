// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

mod mpv_handler;
mod file_scanner;
mod thumbnail_generator;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(mpv_handler::MpvState::new())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet, 
            mpv_handler::play_video, 
            mpv_handler::load_video,
            mpv_handler::toggle_pause,
            mpv_handler::seek,
            mpv_handler::set_volume,
            mpv_handler::mpv_toggle_pause,
            mpv_handler::mpv_seek,
            mpv_handler::mpv_set_volume,
            mpv_handler::mpv_toggle_mute,
            mpv_handler::mpv_toggle_fullscreen,
            mpv_handler::mpv_set_speed,
            mpv_handler::mpv_cycle_subtitles,
            mpv_handler::mpv_cycle_audio,
            mpv_handler::mpv_seek_absolute,
            mpv_handler::stop_video,
            // Settings
            mpv_handler::mpv_get_tracks,
            mpv_handler::mpv_set_subtitle,
            mpv_handler::mpv_set_audio,
            mpv_handler::mpv_set_sub_delay,
            mpv_handler::mpv_set_sub_scale,
            mpv_handler::mpv_set_aspect_ratio,
            mpv_handler::mpv_set_hwdec,
            mpv_handler::mpv_set_loop,
            mpv_handler::mpv_add_volume,
            mpv_handler::mpv_seek_relative,
            //
            file_scanner::list_videos, 
            thumbnail_generator::generate_thumbnail
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
