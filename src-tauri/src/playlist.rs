use serde::{Deserialize, Serialize};
use tauri::command;
use std::fs;
use std::path::PathBuf;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Playlist {
    pub id: String,
    pub name: String,
    pub items: Vec<String>,
    pub created: u64,
    pub modified: u64,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Collection {
    pub id: String,
    pub name: String,
    pub description: String,
    pub items: Vec<String>,
    pub poster_path: Option<String>,
}

#[derive(Serialize, Deserialize, Default)]
struct PlaylistStore {
    playlists: Vec<Playlist>,
    collections: Vec<Collection>,
}

fn get_store_path() -> PathBuf {
    let config_dir = dirs_config_path();
    config_dir.join("playlists.json")
}

fn dirs_config_path() -> PathBuf {
    let home = std::env::var("APPDATA")
        .or_else(|_| std::env::var("HOME"))
        .unwrap_or_else(|_| ".".to_string());
    let path = PathBuf::from(home).join("FrameX");
    let _ = fs::create_dir_all(&path);
    path
}

fn load_store() -> PlaylistStore {
    let path = get_store_path();
    if path.exists() {
        let data = fs::read_to_string(&path).unwrap_or_default();
        serde_json::from_str(&data).unwrap_or_default()
    } else {
        PlaylistStore::default()
    }
}

fn save_store(store: &PlaylistStore) -> Result<(), String> {
    let path = get_store_path();
    let data = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(&path, data).map_err(|e| e.to_string())
}

fn now_timestamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs()
}

// ---- Playlist Commands ----

#[command]
pub fn save_playlist(name: String, items: Vec<String>, id: Option<String>) -> Result<Playlist, String> {
    let mut store = load_store();
    let now = now_timestamp();

    if let Some(ref playlist_id) = id {
        // Update existing
        if let Some(p) = store.playlists.iter_mut().find(|p| &p.id == playlist_id) {
            p.name = name;
            p.items = items;
            p.modified = now;
            let updated = p.clone();
            save_store(&store)?;
            return Ok(updated);
        }
    }

    // Create new
    let playlist = Playlist {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        items,
        created: now,
        modified: now,
    };
    store.playlists.push(playlist.clone());
    save_store(&store)?;
    Ok(playlist)
}

#[command]
pub fn get_playlists() -> Result<Vec<Playlist>, String> {
    let store = load_store();
    Ok(store.playlists)
}

#[command]
pub fn delete_playlist(id: String) -> Result<(), String> {
    let mut store = load_store();
    store.playlists.retain(|p| p.id != id);
    save_store(&store)
}

// ---- Collection Commands ----

#[command]
pub fn save_collection(name: String, description: String, items: Vec<String>, id: Option<String>) -> Result<Collection, String> {
    let mut store = load_store();

    if let Some(ref coll_id) = id {
        if let Some(c) = store.collections.iter_mut().find(|c| &c.id == coll_id) {
            c.name = name;
            c.description = description;
            c.items = items;
            let updated = c.clone();
            save_store(&store)?;
            return Ok(updated);
        }
    }

    let collection = Collection {
        id: uuid::Uuid::new_v4().to_string(),
        name,
        description,
        items,
        poster_path: None,
    };
    store.collections.push(collection.clone());
    save_store(&store)?;
    Ok(collection)
}

#[command]
pub fn get_collections() -> Result<Vec<Collection>, String> {
    let store = load_store();
    Ok(store.collections)
}

#[command]
pub fn delete_collection(id: String) -> Result<(), String> {
    let mut store = load_store();
    store.collections.retain(|c| c.id != id);
    save_store(&store)
}
