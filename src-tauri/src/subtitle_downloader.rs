use serde::{Deserialize, Serialize};
use tauri::command;
use std::fs;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SubtitleResult {
    pub id: String,
    pub file_name: String,
    pub language: String,
    pub download_count: i64,
    pub hearing_impaired: bool,
    pub file_id: i64,
    pub release: String,
}

#[derive(Deserialize)]
struct OsSearchResponse {
    data: Vec<OsSubtitleData>,
}

#[derive(Deserialize)]
struct OsSubtitleData {
    id: String,
    attributes: OsAttributes,
}

#[derive(Deserialize)]
struct OsAttributes {
    language: Option<String>,
    download_count: Option<i64>,
    hearing_impaired: Option<bool>,
    release: Option<String>,
    files: Vec<OsFile>,
}

#[derive(Deserialize)]
struct OsFile {
    file_id: i64,
    file_name: Option<String>,
}

#[derive(Deserialize)]
struct OsDownloadResponse {
    link: String,
}

#[command]
pub async fn search_subtitles(
    query: String,
    language: Option<String>,
    api_key: String,
) -> Result<Vec<SubtitleResult>, String> {
    if api_key.is_empty() {
        return Err("OpenSubtitles API key is required. Set it in Settings → Integrations.".to_string());
    }

    let lang = language.unwrap_or_else(|| "en".to_string());
    let url = format!(
        "https://api.opensubtitles.com/api/v1/subtitles?query={}&languages={}",
        urlencoding::encode(&query),
        urlencoding::encode(&lang)
    );

    let client = reqwest::Client::new();
    let response = client
        .get(&url)
        .header("Api-Key", &api_key)
        .header("Content-Type", "application/json")
        .header("User-Agent", "FrameX v0.1.0")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(format!("API error {}: {}", status, body));
    }

    let data: OsSearchResponse = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let results: Vec<SubtitleResult> = data.data.into_iter().map(|d| {
        let file = d.attributes.files.first();
        SubtitleResult {
            id: d.id,
            file_name: file.and_then(|f| f.file_name.clone()).unwrap_or_default(),
            language: d.attributes.language.unwrap_or_else(|| lang.clone()),
            download_count: d.attributes.download_count.unwrap_or(0),
            hearing_impaired: d.attributes.hearing_impaired.unwrap_or(false),
            file_id: file.map(|f| f.file_id).unwrap_or(0),
            release: d.attributes.release.unwrap_or_default(),
        }
    }).collect();

    Ok(results)
}

#[command]
pub async fn download_subtitle(
    file_id: i64,
    save_dir: String,
    file_name: String,
    api_key: String,
) -> Result<String, String> {
    if api_key.is_empty() {
        return Err("OpenSubtitles API key is required.".to_string());
    }

    let client = reqwest::Client::new();

    // Step 1: Get download link
    let dl_response = client
        .post("https://api.opensubtitles.com/api/v1/download")
        .header("Api-Key", &api_key)
        .header("Content-Type", "application/json")
        .header("User-Agent", "FrameX v0.1.0")
        .json(&serde_json::json!({ "file_id": file_id }))
        .send()
        .await
        .map_err(|e| format!("Download request failed: {}", e))?;

    if !dl_response.status().is_success() {
        return Err(format!("Download API error: {}", dl_response.status()));
    }

    let dl_data: OsDownloadResponse = dl_response
        .json()
        .await
        .map_err(|e| format!("Parse download response: {}", e))?;

    // Step 2: Download the actual file
    let file_bytes = client
        .get(&dl_data.link)
        .send()
        .await
        .map_err(|e| format!("File download failed: {}", e))?
        .bytes()
        .await
        .map_err(|e| format!("Read bytes: {}", e))?;

    // Step 3: Save to disk
    let save_path = std::path::Path::new(&save_dir).join(&file_name);
    fs::write(&save_path, &file_bytes)
        .map_err(|e| format!("Save failed: {}", e))?;

    Ok(save_path.to_string_lossy().to_string())
}
