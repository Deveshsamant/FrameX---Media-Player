use tauri::{command, State, AppHandle, Emitter, Window, Manager};
use libmpv2::{Mpv, events::Event};
use std::sync::{Arc, Mutex};
use std::sync::mpsc::{channel, Sender, Receiver};
use std::thread;
use raw_window_handle::{HasWindowHandle, RawWindowHandle};
use serde::Serialize;

#[derive(Serialize, Clone, Debug)]
pub struct Track {
    id: i64,
    #[serde(rename = "type")]
    kind: String, // "video", "audio", "sub"
    title: Option<String>,
    lang: Option<String>,
    selected: bool,
}

pub enum MpvCommand {
    LoadFile(String),
    Play,
    Pause,
    TogglePause,
    Seek(f64),
    SeekAbsolute(f64),
    SetVolume(f64),
    ToggleMute,
    ToggleFullscreen,
    SetSpeed(f64),
    CycleSubtitles,
    CycleAudio,
    Stop,
    // Settings Commands
    GetTracks,
    SetSubtitle(String), // id or "no" or "auto"
    SetAudio(String),
    SetSubDelay(f64),
    SetSubScale(f64),
    SetAspectRatio(String),
    SetHwDec(bool),
    SetLoop(String),
    // Shortcuts
    AddVolume(f64),
    SeekRelative(f64),
}

// Use Arc<Mutex> so the thread can clear the sender on shutdown
type SharedSender = Arc<Mutex<Option<Sender<MpvCommand>>>>;

pub struct MpvState {
    pub tx: SharedSender,
}

impl MpvState {
    pub fn new() -> Self {
        Self {
            tx: Arc::new(Mutex::new(None)),
        }
    }
}

// Initialize the MPV thread if it hasn't been already
fn ensure_mpv_running(state: &State<'_, MpvState>, wid: Option<i64>, app_handle: AppHandle) {
    let mut tx_guard = state.tx.lock().unwrap();
    
    if tx_guard.is_some() {
        return;
    }

    let (tx, rx): (Sender<MpvCommand>, Receiver<MpvCommand>) = channel();
    *tx_guard = Some(tx);
    
    // Clone the Arc so the thread can clear it on shutdown
    let shared_tx = Arc::clone(&state.tx);
    
    // Drop the guard before spawning to avoid holding the lock
    drop(tx_guard);

    thread::spawn(move || {
        // Find config directory BEFORE creating MPV
        let exe_dir = std::env::current_exe()
            .ok()
            .and_then(|p| p.parent().map(|p| p.to_path_buf()));
        
        // Create MPV instance
        let mut mpv = match Mpv::new() {
            Ok(m) => m,
            Err(e) => {
                eprintln!("Failed to create MPV instance: {}", e);
                *shared_tx.lock().unwrap() = None;
                return;
            }
        };
        
        // Helper to find config dir relative to a base path
        fn find_mpv_config(base_dir: &std::path::Path) -> Option<std::path::PathBuf> {
            // Try increasing levels of parent directories
            let attempts = [
                base_dir.join("mpv-config"),
                base_dir.join("..").join("mpv-config"),
                base_dir.join("..").join("..").join("mpv-config"),
                base_dir.join("..").join("..").join("..").join("mpv-config"),
                base_dir.join("src-tauri").join("mpv-config"),
            ];
            
            for path in &attempts {
                if path.exists() {
                     // Canonicalize if possible to resolve ..
                     return path.canonicalize().ok().or(Some(path.clone()));
                }
            }
            None
        }

        // Try to find the config directory based on exe location OR current working directory
        let config_dir_opt = std::env::current_exe().ok().and_then(|exe| {
            exe.parent().and_then(|p| find_mpv_config(p))
        }).or_else(|| {
            std::env::current_dir().ok().and_then(|cwd| find_mpv_config(&cwd))
        });

        // Configure MPV settings
        // IMPORTANT: Set config FIRST so mpv.conf is loaded and osc=no takes effect
        if let Some(config_dir) = config_dir_opt.as_ref() {
             let config_str = config_dir.to_string_lossy().to_string();
             let clean_config = if config_str.starts_with(r"\\?\") { &config_str[4..] } else { &config_str };
             let final_config = clean_config.replace("\\", "/");
             
             println!("Setting MPV config-dir: {}", final_config);
             let _ = mpv.set_property("config", "yes");
             let _ = mpv.set_property("config-dir", final_config.as_str());
             
             // Also set include to explicitly load mpv.conf
             let conf_file = format!("{}/mpv.conf", final_config);
             println!("Loading config file: {}", conf_file);
             // include property doesn't exist, so we rely on config-dir
        }
        
        // Core settings
        let _ = mpv.set_property("input-default-bindings", true);
        let _ = mpv.set_property("vo", "gpu");
        if let Some(w) = wid {
            let _ = mpv.set_property("wid", w);
        }
        let _ = mpv.set_property("keep-open", "yes");
        let _ = mpv.set_property("volume-max", 300i64);
        let _ = mpv.set_property("volume", 100i64);
        let _ = mpv.set_property("input-vo-keyboard", true);
        
        // FORCE disable default OSC explicitly from code
        let _ = mpv.set_property("osc", false);
        let _ = mpv.set_property("osd-bar", false);

        // Observe time and duration for UI updates
        let _ = mpv.observe_property("time-pos", libmpv2::Format::Double, 0);
        let _ = mpv.observe_property("time-pos", libmpv2::Format::Double, 0);
        let _ = mpv.observe_property("duration", libmpv2::Format::Double, 0);
        let _ = mpv.observe_property("volume", libmpv2::Format::Double, 0);
        let _ = mpv.observe_property("pause", libmpv2::Format::Flag, 0);
        
        // Now try to load the custom script
        if let Some(config_dir) = config_dir_opt {
             let script_path = config_dir.join("scripts").join("framex-controls.lua");
             
             let script_str = script_path.to_string_lossy().to_string();
             let clean_script = if script_str.starts_with(r"\\?\") { &script_str[4..] } else { &script_str };
             let final_script = clean_script.replace("\\", "/");
             
             println!("Attempting to load script: {}", final_script);
             
             // Load script
             match mpv.command("load-script", &[final_script.as_str()]) {
                 Ok(_) => println!("Script load command sent"),
                 Err(e) => {
                     eprintln!("Failed load-script: {}", e);
                     let _ = mpv.command("script-load", &[final_script.as_str()]);
                 }
             }
        } else {
             println!("CRITICAL: No config directory found!");
        }
        
        
        println!("MPV initialized (OSC disabled)");
        
        // Bind keyboard shortcuts for controls
        let _ = mpv.command("keybind", &["1", "seek -10"]);
        let _ = mpv.command("keybind", &["2", "seek -30"]);
        let _ = mpv.command("keybind", &["3", "seek -60"]);
        let _ = mpv.command("keybind", &["4", "seek 10"]);
        let _ = mpv.command("keybind", &["5", "seek 30"]);
        let _ = mpv.command("keybind", &["6", "seek 60"]);
        let _ = mpv.command("keybind", &["F1", "set volume 50"]);
        let _ = mpv.command("keybind", &["F2", "set volume 100"]);
        let _ = mpv.command("keybind", &["F3", "set volume 150"]);
        let _ = mpv.command("keybind", &["F4", "set volume 200"]);
        let _ = mpv.command("keybind", &["F5", "set volume 300"]);
        let _ = mpv.command("keybind", &["UP", "add volume 5"]);
        let _ = mpv.command("keybind", &["DOWN", "add volume -5"]);
        let _ = mpv.command("keybind", &["LEFT", "seek -5"]);
        let _ = mpv.command("keybind", &["RIGHT", "seek 5"]);
        let _ = mpv.command("keybind", &["SPACE", "cycle pause"]);
        let _ = mpv.command("keybind", &["f", "cycle fullscreen"]);
        let _ = mpv.command("keybind", &["m", "cycle mute"]);
        println!("Keyboard shortcuts bound!");
        
        // DIRECT mouse bindings
        // We bind MBTN_LEFT to sending a script-message "click_evt"
        // This allows us to catch the click in the event loop and check mouse-pos
        let _ = mpv.command("keybind", &["MBTN_LEFT", "script-message click_evt"]);
        let _ = mpv.command("keybind", &["MBTN_LEFT_DBL", "cycle fullscreen"]);

        // Unused OSD helper removed

        let mut show_osd = false;

        loop {
            // Check for commands from Tauri
            while let Ok(cmd) = rx.try_recv() {
                match cmd {
                    MpvCommand::LoadFile(path) => {
                        let file_path = if path.starts_with("http") { path } else { path };
                        println!("Loading: {}", file_path);
                        if let Err(e) = mpv.command("loadfile", &[&file_path]) { eprintln!("Error: {}", e); }
                        let _ = mpv.set_property("pause", false);
                    },
                    MpvCommand::Play => { let _ = mpv.set_property("pause", false); },
                    MpvCommand::Pause => { let _ = mpv.set_property("pause", true); },
                    MpvCommand::TogglePause => { let _ = mpv.command("cycle", &["pause"]); },
                    MpvCommand::Seek(seconds) => { let _ = mpv.command("seek", &[&seconds.to_string(), "relative"]); },
                    MpvCommand::SeekAbsolute(pos) => { let _ = mpv.command("seek", &[&pos.to_string(), "absolute"]); },
                    MpvCommand::SetVolume(vol) => { let _ = mpv.set_property("volume", vol); },
                    MpvCommand::ToggleMute => { let _ = mpv.command("cycle", &["mute"]); },
                    MpvCommand::ToggleFullscreen => { let _ = mpv.command("cycle", &["fullscreen"]); },
                    MpvCommand::SetSpeed(speed) => { let _ = mpv.set_property("speed", speed); },
                    MpvCommand::CycleSubtitles => { let _ = mpv.command("cycle", &["sub"]); },
                    MpvCommand::CycleAudio => { let _ = mpv.command("cycle", &["audio"]); },
                    MpvCommand::Stop => { let _ = mpv.command("stop", &[]); },
                    
                    // Settings Handlers
                    MpvCommand::GetTracks => {
                        let count: i64 = mpv.get_property("track-list/count").unwrap_or(0);
                        let mut tracks = Vec::new();
                        for i in 0..count {
                            let kind: String = mpv.get_property(&format!("track-list/{}/type", i)).unwrap_or_default();
                            let id: i64 = mpv.get_property(&format!("track-list/{}/id", i)).unwrap_or(0);
                            let title: Option<String> = mpv.get_property(&format!("track-list/{}/title", i)).ok();
                            let lang: Option<String> = mpv.get_property(&format!("track-list/{}/lang", i)).ok();
                            let selected: bool = mpv.get_property(&format!("track-list/{}/selected", i)).unwrap_or(false);
                            
                            tracks.push(Track { id, kind, title, lang, selected });
                        }
                        let _ = app_handle.emit("mpv-tracks", tracks);
                    },
                    MpvCommand::SetSubtitle(sid) => { let _ = mpv.set_property("sid", sid); },
                    MpvCommand::SetAudio(aid) => { let _ = mpv.set_property("aid", aid); },
                    MpvCommand::SetSubDelay(delay) => { let _ = mpv.set_property("sub-delay", delay); },
                    MpvCommand::SetSubScale(scale) => { let _ = mpv.set_property("sub-scale", scale); },
                    MpvCommand::SetAspectRatio(ratio) => { let _ = mpv.set_property("video-aspect-override", ratio); },
                    MpvCommand::SetHwDec(enable) => { let _ = mpv.set_property("hwdec", if enable { "auto" } else { "no" }); },
                    MpvCommand::SetLoop(mode) => {
                        match mode.as_str() {
                            "one" => {
                                let _ = mpv.set_property("loop-file", "inf");
                                let _ = mpv.set_property("loop-playlist", "no");
                            },
                            "all" => {
                                let _ = mpv.set_property("loop-file", "no");
                                let _ = mpv.set_property("loop-playlist", "inf");
                            },
                            _ => { // off
                                let _ = mpv.set_property("loop-file", "no");
                                let _ = mpv.set_property("loop-playlist", "no");
                            }
                        }
                    },
                    MpvCommand::AddVolume(delta) => { let _ = mpv.command("add", &["volume", &delta.to_string()]); },
                    MpvCommand::SeekRelative(seconds) => { let _ = mpv.command("seek", &[&seconds.to_string(), "relative"]); }
                }
            }
            
            let idle: bool = mpv.get_property("idle-active").unwrap_or(true);
            show_osd = !idle;
            
            // draw_osd removed

            // Check MPV events (INCLUDING CLICK HANDLING)
            match mpv.wait_event(0.05) {
                // ClientMessage handler removed for now to fix build

                Some(Ok(Event::Shutdown)) => {
                    println!("MPV Shutdown");
                    break; 
                },
                Some(Err(e)) => eprintln!("MPV Error: {}", e),
                Some(Ok(Event::PropertyChange { name, .. })) => {
                    if name == "time-pos" {
                        let pos: f64 = mpv.get_property("time-pos").unwrap_or(0.0);
                        let dur: f64 = mpv.get_property("duration").unwrap_or(1.0);
                        let _ = app_handle.emit("mpv-progress", (pos, dur));
                        let _ = app_handle.emit("mpv-progress", (pos, dur));
                    } else if name == "volume" {
                        let vol: f64 = mpv.get_property("volume").unwrap_or(100.0);
                        let _ = app_handle.emit("mpv-volume", vol);
                    } else if name == "pause" {
                        let paused: bool = mpv.get_property("pause").unwrap_or(false);
                        let _ = app_handle.emit("mpv-pause", paused);
                    }
                }
                Some(Ok(event)) => {
                   // println!("MPV Event: {:?}", event); // Quiet logs
                }
                _ => {}
            }



        }
        
        // IMPORTANT: Clear the sender so next load_video will spawn a new MPV instance
        println!("MPV Thread Exited - Clearing state for restart");
        *shared_tx.lock().unwrap() = None;
    });
}

#[command]
pub fn load_video(window: Window, state: State<'_, MpvState>, path: String) {
    let wid = window.window_handle().ok().and_then(|h| {
        match h.as_raw() {
            RawWindowHandle::Win32(w) => Some(w.hwnd.get() as i64),
            _ => None,
        }
    });

    ensure_mpv_running(&state, wid, window.app_handle().clone());
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::LoadFile(path));
    }
}

#[command]
pub fn toggle_pause(state: State<'_, MpvState>) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::TogglePause);
    }
}

#[command]
pub fn seek(state: State<'_, MpvState>, amount: f64) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::Seek(amount));
    }
}

#[command]
pub fn set_volume(state: State<'_, MpvState>, volume: f64) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SetVolume(volume));
    }
}

// Keep old play_video for compatibility
#[command]
pub fn play_video(window: Window, state: State<'_, MpvState>, path: String) {
    load_video(window, state, path);
}

#[command]
pub fn mpv_toggle_pause(state: State<'_, MpvState>) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::TogglePause);
    }
}

#[command]
pub fn mpv_seek(state: State<'_, MpvState>, seconds: f64) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::Seek(seconds));
    }
}

#[command]
pub fn mpv_set_volume(state: State<'_, MpvState>, volume: f64) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SetVolume(volume));
    }
}

#[command]
pub fn mpv_toggle_mute(state: State<'_, MpvState>) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::ToggleMute);
    }
}

#[command]
pub fn stop_video(state: State<'_, MpvState>) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::Stop);
    }
}

#[command]
pub fn mpv_toggle_fullscreen(state: State<'_, MpvState>) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::ToggleFullscreen);
    }
}

#[command]
pub fn mpv_set_speed(state: State<'_, MpvState>, speed: f64) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SetSpeed(speed));
    }
}

#[command]
pub fn mpv_cycle_subtitles(state: State<'_, MpvState>) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::CycleSubtitles);
    }
}

#[command]
pub fn mpv_cycle_audio(state: State<'_, MpvState>) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::CycleAudio);
    }
}

#[command]
pub fn mpv_seek_absolute(state: State<'_, MpvState>, position: f64) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SeekAbsolute(position));
    }
}

// New Settings Commands
#[command]
pub fn mpv_get_tracks(state: State<'_, MpvState>) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::GetTracks);
    }
}

#[command]
pub fn mpv_set_subtitle(state: State<'_, MpvState>, sid: String) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SetSubtitle(sid));
    }
}

#[command]
pub fn mpv_set_audio(state: State<'_, MpvState>, aid: String) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SetAudio(aid));
    }
}

#[command]
pub fn mpv_set_sub_delay(state: State<'_, MpvState>, delay: f64) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SetSubDelay(delay));
    }
}

#[command]
pub fn mpv_set_sub_scale(state: State<'_, MpvState>, scale: f64) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SetSubScale(scale));
    }
}

#[command]
pub fn mpv_set_aspect_ratio(state: State<'_, MpvState>, ratio: String) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SetAspectRatio(ratio));
    }
}

#[command]
pub fn mpv_set_hwdec(state: State<'_, MpvState>, enable: bool) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SetHwDec(enable));
    }
}

#[command]
pub fn mpv_set_loop(state: State<'_, MpvState>, mode: String) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SetLoop(mode));
    }
}

#[command]
pub fn mpv_add_volume(state: State<'_, MpvState>, delta: f64) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::AddVolume(delta));
    }
}

#[command]
pub fn mpv_seek_relative(state: State<'_, MpvState>, seconds: f64) {
    if let Some(tx) = state.tx.lock().unwrap().as_ref() {
        let _ = tx.send(MpvCommand::SeekRelative(seconds));
    }
}
