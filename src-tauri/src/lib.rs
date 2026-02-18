// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

mod mpv_handler;
mod file_scanner;
mod thumbnail_generator;
mod config;
mod ai;
mod metadata;
mod watch_history;
mod playlist;
mod subtitle_downloader;
mod discord_rpc;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(mpv_handler::MpvState::new())
        .manage(discord_rpc::DiscordRpcState::new())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
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
            mpv_handler::mpv_seek_relative,
            mpv_handler::mpv_get_hwdec_status,
            mpv_handler::mpv_set_audio_filter,
            mpv_handler::mpv_set_compressor,
            // Video Image Controls
            mpv_handler::mpv_set_brightness,
            mpv_handler::mpv_set_contrast,
            mpv_handler::mpv_set_saturation,
            mpv_handler::mpv_set_gamma,
            // Stream URL
            mpv_handler::mpv_load_url,
            //
            file_scanner::list_videos, 
            file_scanner::get_video_duration,
            thumbnail_generator::generate_thumbnail,
            thumbnail_generator::generate_seek_preview,
            thumbnail_generator::generate_preview,
            // Config
            config::save_last_folder,
            config::get_last_folder,
            // AI
            ai::whisper::run_whisper,
            // Metadata
            metadata::fetch_metadata,
            metadata::check_poster_exists,
            metadata::read_poster,
            metadata::fetch_movie_info,
            metadata::fetch_folder_poster,
            metadata::fetch_tv_info,
            // Watch History
            watch_history::save_watch_position,
            watch_history::get_watch_position,
            watch_history::get_watch_history,
            watch_history::clear_watch_history,
            // Playlists & Collections
            playlist::save_playlist,
            playlist::get_playlists,
            playlist::delete_playlist,
            playlist::save_collection,
            playlist::get_collections,
            playlist::delete_collection,
            // Subtitle Downloader
            subtitle_downloader::search_subtitles,
            subtitle_downloader::download_subtitle,
            // Discord RPC
            discord_rpc::discord_rpc_connect,
            discord_rpc::discord_rpc_update,
            discord_rpc::discord_rpc_disconnect,
            discord_rpc::discord_rpc_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
