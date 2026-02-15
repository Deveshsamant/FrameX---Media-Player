use serde::{Deserialize, Serialize};
use std::fs;
use std::io::Write; 
use tauri::AppHandle;
use tauri::Manager;
use regex::Regex;
use base64::{Engine as _, engine::general_purpose};

// TMDB API Key
const TMDB_API_KEY: &str = "d47c8f61c0cacd4e41aeadb58ffa938e";

#[derive(Debug, Serialize, Deserialize)]
struct TmdbSearchResult {
    results: Vec<TmdbMovie>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TmdbMovie {
    id: u64,
    #[serde(rename = "poster_path")]
    poster_path: Option<String>,
    title: String,
    #[serde(rename = "release_date")]
    release_date: Option<String>,
    overview: Option<String>,
    #[serde(rename = "vote_average")]
    vote_average: Option<f64>,
    #[serde(rename = "vote_count")]
    vote_count: Option<u64>,
    #[serde(rename = "original_language")]
    original_language: Option<String>,
    popularity: Option<f64>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TmdbGenre {
    id: u64,
    name: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct TmdbMovieDetail {
    id: u64,
    title: String,
    overview: Option<String>,
    #[serde(rename = "release_date")]
    release_date: Option<String>,
    #[serde(rename = "vote_average")]
    vote_average: Option<f64>,
    #[serde(rename = "vote_count")]
    vote_count: Option<u64>,
    runtime: Option<u64>,
    genres: Option<Vec<TmdbGenre>>,
    #[serde(rename = "poster_path")]
    poster_path: Option<String>,
    #[serde(rename = "backdrop_path")]
    backdrop_path: Option<String>,
    #[serde(rename = "original_language")]
    original_language: Option<String>,
    popularity: Option<f64>,
    tagline: Option<String>,
    status: Option<String>,
    #[serde(rename = "budget")]
    budget: Option<u64>,
    revenue: Option<u64>,
}

/// The struct returned to the frontend with all movie info
#[derive(Debug, Serialize, Deserialize)]
pub struct MovieInfo {
    pub title: String,
    pub overview: String,
    pub release_date: String,
    pub vote_average: f64,
    pub vote_count: u64,
    pub runtime: u64,
    pub genres: Vec<String>,
    pub original_language: String,
    pub tagline: String,
    pub status: String,
    pub budget: u64,
    pub revenue: u64,
}

#[tauri::command]
pub async fn fetch_metadata(app: AppHandle, video_path: String) -> Result<Option<String>, String> {
    // 1. Extract video name and directory
    let path = std::path::Path::new(&video_path);
    let video_name = path.file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid video path")?;
    let video_dir = path.parent()
        .ok_or("Could not get video directory")?;
    
    // 2. Clean the video name
    let clean_name = clean_video_name(video_name);
    println!("🎬 Fetching poster for: '{}' (cleaned: '{}')", video_name, clean_name);

    if clean_name.trim().is_empty() {
        println!("⚠️  Cleaned name is empty, skipping");
        return Ok(None);
    }

    // 3. Check if poster already exists
    let poster_filename = format!("{}.poster.jpg", 
        path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("poster")
    );
    let poster_path = video_dir.join(&poster_filename);
    
    if poster_path.exists() {
        println!("✅ Poster already exists: {}", poster_path.display());
        return Ok(Some(poster_path.to_string_lossy().to_string()));
    }

    // 4. Search TMDB API
    let client = reqwest::Client::new();
    let encoded_name = urlencoding::encode(&clean_name);
    let url = format!(
        "https://api.themoviedb.org/3/search/movie?api_key={}&query={}&language=en-US&page=1",
        TMDB_API_KEY, encoded_name
    );
    
    println!("🔍 Searching TMDB API: {}", url);

    let resp = client.get(&url)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !resp.status().is_success() {
        println!("❌ API Error: {}", resp.status());
        return Err(format!("API Error: {}", resp.status()));
    }

    let result: TmdbSearchResult = resp.json().await.map_err(|e| format!("JSON Parse error: {}", e))?;
    
    println!("📊 TMDB returned {} results", result.results.len());

    if let Some(movie) = result.results.first() {
        if let Some(poster_path_tmdb) = &movie.poster_path {
            // 5. Construct high-res poster URL
            let poster_url = format!("https://image.tmdb.org/t/p/original{}", poster_path_tmdb);
            println!("✅ Found movie: '{}' ({}) with poster URL: {}", 
                movie.title, 
                movie.release_date.as_deref().unwrap_or("Unknown"), 
                poster_url
            );

            // 6. Download Image
            let img_bytes = client.get(&poster_url)
                .send()
                .await
                .map_err(|e| format!("Image download failed: {}", e))?
                .bytes()
                .await
                .map_err(|e| format!("Image bytes error: {}", e))?;

            // 7. Save to same directory as video
            let mut file = fs::File::create(&poster_path).map_err(|e| e.to_string())?;
            file.write_all(&img_bytes).map_err(|e| e.to_string())?;
            
            println!("💾 Saved poster to: {}", poster_path.display());

            return Ok(Some(poster_path.to_string_lossy().to_string()));
        } else {
            println!("⚠️  Movie found but no poster available");
        }
    }

    println!("❌ No results found for '{}'", clean_name);
    Ok(None)
}

#[tauri::command]
pub fn check_poster_exists(video_path: String) -> Option<String> {
    let path = std::path::Path::new(&video_path);
    let poster_filename = format!("{}.poster.jpg", 
        path.file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("poster")
    );
    
    if let Some(video_dir) = path.parent() {
        let poster_path = video_dir.join(&poster_filename);
        if poster_path.exists() {
            return Some(poster_path.to_string_lossy().to_string());
        }
    }
    
    None
}

fn clean_video_name(name: &str) -> String {
    // 1. Remove extension
    let stem = std::path::Path::new(name).file_stem().and_then(|s| s.to_str()).unwrap_or(name);
    
    // 2. Replace dots, underscores, hyphens with spaces
    let clean_text = stem.replace('.', " ").replace('_', " ").replace('-', " ");

    // 3. Regex to find the "cut point" (Year, Resolution, Quality tags)
    // We want everything BEFORE this point.
    // Matches: 
    // - Years: 19xx, 20xx (with word boundaries)
    // - Resolutions: 1080p, 720p, 4k, 2160p
    // - Quality/Source: bluray, web-dl, webrip, hdtv, dvdrip, cam
    // - Codecs: x264, x265, hevc, h264
    // - Audio: aac, ac3, dts, 5.1
    // - Groups: rarbg, yify, eztv (generic match for common short acronyms at end?) -> hard to genericize, relying on tags above usually enough
    
    let re = Regex::new(r"(?i)\b(19\d{2}|20\d{2}|4k|2160p|1080p|720p|480p|144p|bluray|web-dl|webrip|hdtv|dvdrip|cam|x264|x265|hevc|h264|aac|ac3|dts|remux|proper|repack)\b").unwrap();
    
    if let Some(mat) = re.find(&clean_text) {
        let clean = clean_text[..mat.start()].trim().to_string();
        // Remove trailing brackets if any remains
        let re_brackets = Regex::new(r"[\(\[\{].*?[\)\]\}]").unwrap();
        let final_clean = re_brackets.replace_all(&clean, "").trim().to_string();
        
        // Remove any trailing non-alphanumeric characters (like ' -')
        let re_trail = Regex::new(r"[^a-zA-Z0-9]+$").unwrap();
        return re_trail.replace_all(&final_clean, "").to_string();
    }

    // Fallback: just return the replaced text trimmed
    let re_allow = Regex::new(r"[^a-zA-Z0-9 ]").unwrap();
    let cleaned = re_allow.replace_all(&clean_text, "").to_string();
    cleaned.trim().to_string()
}

/// Reads a poster image from disk and returns it as a base64 data URL.
/// This avoids the need for asset protocol permissions.
#[tauri::command]
pub fn read_poster(poster_path: String) -> Result<String, String> {
    let path = std::path::Path::new(&poster_path);
    
    if !path.exists() {
        return Err(format!("Poster file not found: {}", poster_path));
    }

    let img_data = fs::read(path).map_err(|e| format!("Failed to read poster: {}", e))?;
    
    // Determine MIME type from extension
    let ext = path.extension()
        .and_then(|e| e.to_str())
        .unwrap_or("jpg")
        .to_lowercase();
    
    let mime = match ext.as_str() {
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/jpeg",
    };

    let base64_str = general_purpose::STANDARD.encode(&img_data);
    Ok(format!("data:{};base64,{}", mime, base64_str))
}

/// Fetches full movie info from TMDB based on the video filename.
#[tauri::command]
pub async fn fetch_movie_info(_app: AppHandle, video_path: String) -> Result<MovieInfo, String> {
    let path = std::path::Path::new(&video_path);
    let video_name = path.file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid video path")?;
    
    let clean_name = clean_video_name(video_name);
    println!("🎬 Fetching movie info for: '{}' (cleaned: '{}')", video_name, clean_name);

    if clean_name.trim().is_empty() {
        return Err("Could not extract movie name from filename".to_string());
    }

    let client = reqwest::Client::new();
    let encoded_name = urlencoding::encode(&clean_name);
    
    // 1. Search TMDB
    let search_url = format!(
        "https://api.themoviedb.org/3/search/movie?api_key={}&query={}&language=en-US&page=1",
        TMDB_API_KEY, encoded_name
    );
    
    let resp = client.get(&search_url)
        .send()
        .await
        .map_err(|e| format!("TMDB search request failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("TMDB API Error: {}", resp.status()));
    }

    let search_result: TmdbSearchResult = resp.json().await
        .map_err(|e| format!("Failed to parse TMDB search response: {}", e))?;
    
    let movie = search_result.results.first()
        .ok_or_else(|| format!("No movie found for '{}'", clean_name))?;
    
    let movie_id = movie.id;
    
    // 2. Fetch full movie details
    let detail_url = format!(
        "https://api.themoviedb.org/3/movie/{}?api_key={}&language=en-US",
        movie_id, TMDB_API_KEY
    );
    
    let detail_resp = client.get(&detail_url)
        .send()
        .await
        .map_err(|e| format!("TMDB detail request failed: {}", e))?;

    if !detail_resp.status().is_success() {
        return Err(format!("TMDB detail API Error: {}", detail_resp.status()));
    }

    let detail: TmdbMovieDetail = detail_resp.json().await
        .map_err(|e| format!("Failed to parse TMDB detail response: {}", e))?;
    
    println!("✅ Found movie details: '{}' ({})", detail.title, detail.release_date.as_deref().unwrap_or("Unknown"));

    Ok(MovieInfo {
        title: detail.title,
        overview: detail.overview.unwrap_or_default(),
        release_date: detail.release_date.unwrap_or_else(|| "Unknown".to_string()),
        vote_average: detail.vote_average.unwrap_or(0.0),
        vote_count: detail.vote_count.unwrap_or(0),
        runtime: detail.runtime.unwrap_or(0),
        genres: detail.genres.unwrap_or_default().into_iter().map(|g| g.name).collect(),
        original_language: detail.original_language.unwrap_or_else(|| "en".to_string()),
        tagline: detail.tagline.unwrap_or_default(),
        status: detail.status.unwrap_or_else(|| "Unknown".to_string()),
        budget: detail.budget.unwrap_or(0),
        revenue: detail.revenue.unwrap_or(0),
    })
}

// --- Folder Poster Support ---

#[derive(Debug, Serialize, Deserialize)]
struct TmdbMultiSearchResult {
    results: Vec<TmdbMultiResult>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TmdbMultiResult {
    #[serde(rename = "media_type")]
    media_type: Option<String>,
    #[serde(rename = "poster_path")]
    poster_path: Option<String>,
    // movie uses "title", tv uses "name"
    title: Option<String>,
    name: Option<String>,
}

/// Fetches a poster for a folder using TMDB multi-search (movies + TV/anime).
/// Saves the poster as `poster.jpg` inside the folder.
#[tauri::command]
pub async fn fetch_folder_poster(_app: AppHandle, folder_path: String) -> Result<Option<String>, String> {
    let path = std::path::Path::new(&folder_path);
    
    if !path.is_dir() {
        return Err("Not a valid directory".to_string());
    }

    let folder_name = path.file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid folder name")?;

    // Check if poster already exists
    let poster_path = path.join("poster.jpg");
    if poster_path.exists() {
        return Ok(Some(poster_path.to_string_lossy().to_string()));
    }

    let clean_name = clean_video_name(folder_name);
    println!("📁 Fetching folder poster for: '{}' (cleaned: '{}')", folder_name, clean_name);

    if clean_name.trim().is_empty() {
        return Ok(None);
    }

    let client = reqwest::Client::new();
    let encoded_name = urlencoding::encode(&clean_name);

    // Use multi-search to find movies, TV shows, and anime
    let search_url = format!(
        "https://api.themoviedb.org/3/search/multi?api_key={}&query={}&language=en-US&page=1",
        TMDB_API_KEY, encoded_name
    );

    let resp = client.get(&search_url)
        .send()
        .await
        .map_err(|e| format!("TMDB search failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("TMDB API Error: {}", resp.status()));
    }

    let search_result: TmdbMultiSearchResult = resp.json().await
        .map_err(|e| format!("Failed to parse TMDB response: {}", e))?;

    // Find the first result with a poster (movie or tv)
    let poster_url_path = search_result.results.iter()
        .filter(|r| {
            let mt = r.media_type.as_deref().unwrap_or("");
            mt == "movie" || mt == "tv"
        })
        .find_map(|r| r.poster_path.as_ref());

    let poster_rel = match poster_url_path {
        Some(p) => p.clone(),
        None => {
            println!("📁 No poster found for folder: '{}'", folder_name);
            return Ok(None);
        }
    };

    // Download poster
    let img_url = format!("https://image.tmdb.org/t/p/w500{}", poster_rel);
    let img_resp = client.get(&img_url)
        .send()
        .await
        .map_err(|e| format!("Failed to download poster: {}", e))?;

    let img_bytes = img_resp.bytes().await
        .map_err(|e| format!("Failed to read poster bytes: {}", e))?;

    // Save as poster.jpg inside the folder
    let mut file = fs::File::create(&poster_path)
        .map_err(|e| format!("Failed to save poster: {}", e))?;
    file.write_all(&img_bytes)
        .map_err(|e| format!("Failed to write poster: {}", e))?;

    println!("✅ Saved folder poster: {}", poster_path.display());
    Ok(Some(poster_path.to_string_lossy().to_string()))
}

// --- TV / Anime Info Support ---

#[derive(Debug, Serialize, Deserialize)]
struct TmdbTvSearchResult {
    results: Vec<TmdbTv>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TmdbTv {
    id: u64,
    name: String,
    #[serde(rename = "first_air_date")]
    first_air_date: Option<String>,
    #[serde(rename = "poster_path")]
    poster_path: Option<String>,
    overview: Option<String>,
    #[serde(rename = "vote_average")]
    vote_average: Option<f64>,
    #[serde(rename = "vote_count")]
    vote_count: Option<u64>,
}

#[derive(Debug, Serialize, Deserialize)]
struct TmdbTvDetail {
    id: u64,
    name: String,
    overview: Option<String>,
    #[serde(rename = "first_air_date")]
    first_air_date: Option<String>,
    #[serde(rename = "last_air_date")]
    last_air_date: Option<String>,
    #[serde(rename = "vote_average")]
    vote_average: Option<f64>,
    #[serde(rename = "vote_count")]
    vote_count: Option<u64>,
    #[serde(rename = "number_of_seasons")]
    number_of_seasons: Option<u32>,
    #[serde(rename = "number_of_episodes")]
    number_of_episodes: Option<u32>,
    genres: Option<Vec<TmdbGenre>>,
    #[serde(rename = "original_language")]
    original_language: Option<String>,
    tagline: Option<String>,
    status: Option<String>,
    #[serde(rename = "episode_run_time")]
    episode_run_time: Option<Vec<u32>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct TvInfo {
    pub title: String,
    pub overview: String,
    pub first_air_date: String,
    pub last_air_date: String,
    pub vote_average: f64,
    pub vote_count: u64,
    pub number_of_seasons: u32,
    pub number_of_episodes: u32,
    pub episode_runtime: u32,
    pub genres: Vec<String>,
    pub original_language: String,
    pub tagline: String,
    pub status: String,
}

/// Fetches TV show / anime info from TMDB based on the folder name.
#[tauri::command]
pub async fn fetch_tv_info(_app: AppHandle, folder_path: String) -> Result<TvInfo, String> {
    let path = std::path::Path::new(&folder_path);
    let folder_name = path.file_name()
        .and_then(|n| n.to_str())
        .ok_or("Invalid folder path")?;
    
    let clean_name = clean_video_name(folder_name);
    println!("📺 Fetching TV info for: '{}' (cleaned: '{}')", folder_name, clean_name);

    if clean_name.trim().is_empty() {
        return Err("Could not extract name from folder".to_string());
    }

    let client = reqwest::Client::new();
    let encoded_name = urlencoding::encode(&clean_name);
    
    // Search TMDB TV shows
    let search_url = format!(
        "https://api.themoviedb.org/3/search/tv?api_key={}&query={}&language=en-US&page=1",
        TMDB_API_KEY, encoded_name
    );
    
    let resp = client.get(&search_url)
        .send()
        .await
        .map_err(|e| format!("TMDB TV search failed: {}", e))?;

    if !resp.status().is_success() {
        return Err(format!("TMDB API Error: {}", resp.status()));
    }

    let search_result: TmdbTvSearchResult = resp.json().await
        .map_err(|e| format!("Failed to parse TMDB TV response: {}", e))?;
    
    let tv = search_result.results.first()
        .ok_or_else(|| format!("No TV show found for '{}'", clean_name))?;
    
    let tv_id = tv.id;
    
    // Fetch full TV details
    let detail_url = format!(
        "https://api.themoviedb.org/3/tv/{}?api_key={}&language=en-US",
        tv_id, TMDB_API_KEY
    );
    
    let detail_resp = client.get(&detail_url)
        .send()
        .await
        .map_err(|e| format!("TMDB TV detail failed: {}", e))?;

    if !detail_resp.status().is_success() {
        return Err(format!("TMDB TV detail API Error: {}", detail_resp.status()));
    }

    let detail: TmdbTvDetail = detail_resp.json().await
        .map_err(|e| format!("Failed to parse TMDB TV detail: {}", e))?;
    
    println!("✅ Found TV details: '{}' ({} seasons)", detail.name, detail.number_of_seasons.unwrap_or(0));

    let ep_runtime = detail.episode_run_time
        .as_ref()
        .and_then(|v| v.first().copied())
        .unwrap_or(0);

    Ok(TvInfo {
        title: detail.name,
        overview: detail.overview.unwrap_or_default(),
        first_air_date: detail.first_air_date.unwrap_or_else(|| "Unknown".to_string()),
        last_air_date: detail.last_air_date.unwrap_or_else(|| "Unknown".to_string()),
        vote_average: detail.vote_average.unwrap_or(0.0),
        vote_count: detail.vote_count.unwrap_or(0),
        number_of_seasons: detail.number_of_seasons.unwrap_or(0),
        number_of_episodes: detail.number_of_episodes.unwrap_or(0),
        episode_runtime: ep_runtime,
        genres: detail.genres.unwrap_or_default().into_iter().map(|g| g.name).collect(),
        original_language: detail.original_language.unwrap_or_else(|| "ja".to_string()),
        tagline: detail.tagline.unwrap_or_default(),
        status: detail.status.unwrap_or_else(|| "Unknown".to_string()),
    })
}
