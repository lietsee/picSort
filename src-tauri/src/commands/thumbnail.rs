use serde::Serialize;
use sha2::{Sha256, Digest};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;
use tracing::{debug, info, warn};

/// サムネイル生成結果
#[derive(Debug, Serialize, Clone)]
pub struct ThumbnailResult {
    pub original_path: String,
    pub thumbnail_path: String,
}

/// バッチ生成結果
#[derive(Debug, Serialize)]
pub struct ThumbnailBatchResult {
    pub results: Vec<ThumbnailResult>,
    pub errors: Vec<ThumbnailError>,
}

/// サムネイル生成エラー
#[derive(Debug, Serialize)]
pub struct ThumbnailError {
    pub path: String,
    pub error: String,
}

const VIDEO_EXTENSIONS: [&str; 6] = ["mp4", "webm", "mov", "mkv", "avi", "ogv"];

/// 動画ファイルかどうかを判定
fn is_video_file(path: &Path) -> bool {
    path.extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| VIDEO_EXTENSIONS.contains(&ext.to_lowercase().as_str()))
        .unwrap_or(false)
}

/// サムネイルキャッシュディレクトリを取得（Tauri の app_cache_dir を使用）
fn get_thumbnail_cache_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let cache_dir = app
        .path()
        .app_cache_dir()
        .map_err(|e| format!("Could not determine app cache directory: {}", e))?
        .join("thumbnails");

    fs::create_dir_all(&cache_dir).map_err(|e| format!("Failed to create cache directory: {}", e))?;
    Ok(cache_dir)
}

/// ハッシュベースのサムネイルファイル名を生成
fn get_thumbnail_filename(original_path: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(original_path.as_bytes());
    let hash = hasher.finalize();
    format!("{}.jpg", hex::encode(&hash[..16]))
}

/// 画像からサムネイルを生成
fn generate_image_thumbnail(src_path: &Path, thumb_path: &Path, size: u32) -> Result<(), String> {
    let img = image::open(src_path)
        .map_err(|e| format!("Failed to open image: {}", e))?;

    let thumb = img.thumbnail(size, size);

    thumb.save_with_format(thumb_path, image::ImageFormat::Jpeg)
        .map_err(|e| format!("Failed to save thumbnail: {}", e))?;

    Ok(())
}

/// 動画から5秒付近のフレームを抽出してサムネイルを生成
/// 先頭フレームは黒画面になりやすいため、5秒付近を使用
fn generate_video_thumbnail(src_path: &Path, thumb_path: &Path, size: u32) -> Result<(), String> {
    // ffmpegを使用して5秒付近のフレームを抽出
    let output = Command::new("ffmpeg")
        .args([
            "-y",                           // 上書き確認なし
            "-ss", "5",                     // 5秒位置にシーク（黒画面回避）
            "-i", src_path.to_str().unwrap(),
            "-vf", &format!("scale={}:{}:force_original_aspect_ratio=decrease", size, size),
            "-frames:v", "1",
            "-q:v", "2",
            thumb_path.to_str().unwrap(),
        ])
        .output()
        .map_err(|e| format!("Failed to execute ffmpeg: {}. Is ffmpeg installed?", e))?;

    if !output.status.success() {
        // 5秒位置でエラーの場合（動画が短い等）、先頭から取得を試みる
        let fallback_output = Command::new("ffmpeg")
            .args([
                "-y",
                "-i", src_path.to_str().unwrap(),
                "-vf", &format!("scale={}:{}:force_original_aspect_ratio=decrease", size, size),
                "-frames:v", "1",
                "-q:v", "2",
                thumb_path.to_str().unwrap(),
            ])
            .output()
            .map_err(|e| format!("Failed to execute ffmpeg: {}", e))?;

        if !fallback_output.status.success() {
            let stderr = String::from_utf8_lossy(&fallback_output.stderr);
            return Err(format!("ffmpeg failed: {}", stderr));
        }
    }

    Ok(())
}

/// サムネイルを生成（キャッシュあり）
#[tauri::command]
pub fn generate_thumbnail(app: tauri::AppHandle, path: String, size: u32) -> Result<ThumbnailResult, String> {
    let src_path = Path::new(&path);

    if !src_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let cache_dir = get_thumbnail_cache_dir(&app)?;
    let thumb_filename = get_thumbnail_filename(&path);
    let thumb_path = cache_dir.join(&thumb_filename);

    // キャッシュが存在し、元ファイルより新しければ再利用
    if thumb_path.exists() {
        let orig_modified = fs::metadata(&path)
            .and_then(|m| m.modified())
            .ok();
        let thumb_modified = fs::metadata(&thumb_path)
            .and_then(|m| m.modified())
            .ok();

        if let (Some(orig), Some(thumb)) = (orig_modified, thumb_modified) {
            if thumb > orig {
                debug!("Using cached thumbnail for: {}", path);
                return Ok(ThumbnailResult {
                    original_path: path,
                    thumbnail_path: thumb_path.to_string_lossy().to_string(),
                });
            }
        }
    }

    // サムネイル生成
    info!("Generating thumbnail for: {}", path);

    if is_video_file(src_path) {
        generate_video_thumbnail(src_path, &thumb_path, size)?;
    } else {
        generate_image_thumbnail(src_path, &thumb_path, size)?;
    }

    Ok(ThumbnailResult {
        original_path: path,
        thumbnail_path: thumb_path.to_string_lossy().to_string(),
    })
}

/// 複数のサムネイルをバッチ生成
#[tauri::command]
pub async fn generate_thumbnails_batch(app: tauri::AppHandle, paths: Vec<String>, size: u32) -> ThumbnailBatchResult {
    let mut results = Vec::new();
    let mut errors = Vec::new();

    for path in paths {
        match generate_thumbnail(app.clone(), path.clone(), size) {
            Ok(result) => results.push(result),
            Err(e) => {
                warn!("Failed to generate thumbnail for {}: {}", path, e);
                errors.push(ThumbnailError { path, error: e });
            }
        }
    }

    ThumbnailBatchResult { results, errors }
}

/// 複数のファイルを一括移動
#[tauri::command]
pub fn move_files_batch(sources: Vec<String>, dest_folder: String) -> Result<Vec<String>, String> {
    let dest_path = Path::new(&dest_folder);

    if !dest_path.exists() {
        return Err(format!("Destination folder not found: {}", dest_folder));
    }

    let mut dest_paths = Vec::new();

    for src in &sources {
        let src_path = Path::new(src);

        if !src_path.exists() {
            return Err(format!("Source file not found: {}", src));
        }

        let file_name = src_path
            .file_name()
            .ok_or_else(|| format!("Invalid file path: {}", src))?;

        let mut final_dest = dest_path.join(file_name);

        // 重複ファイル名の処理
        if final_dest.exists() {
            let stem = src_path
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("file");
            let ext = src_path
                .extension()
                .and_then(|e| e.to_str())
                .unwrap_or("");

            let mut counter = 1;
            loop {
                let new_name = if ext.is_empty() {
                    format!("{}_{}", stem, counter)
                } else {
                    format!("{}_{}.{}", stem, counter, ext)
                };
                final_dest = dest_path.join(new_name);
                if !final_dest.exists() {
                    break;
                }
                counter += 1;
            }
        }

        fs::rename(src_path, &final_dest)
            .map_err(|e| format!("Failed to move file {}: {}", src, e))?;

        dest_paths.push(final_dest.to_string_lossy().to_string());
    }

    info!("Moved {} files to {}", sources.len(), dest_folder);
    Ok(dest_paths)
}

/// サムネイルキャッシュをクリーンアップ
#[tauri::command]
pub fn cleanup_thumbnail_cache(app: tauri::AppHandle, max_age_days: u64, _max_size_mb: u64) -> Result<u64, String> {
    let cache_dir = get_thumbnail_cache_dir(&app)?;

    if !cache_dir.exists() {
        return Ok(0);
    }

    let mut removed_count = 0u64;
    let now = std::time::SystemTime::now();
    let max_age = std::time::Duration::from_secs(max_age_days * 24 * 60 * 60);

    // 古いサムネイルを削除
    if let Ok(entries) = fs::read_dir(&cache_dir) {
        for entry in entries.flatten() {
            if let Ok(metadata) = entry.metadata() {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(age) = now.duration_since(modified) {
                        if age > max_age {
                            if fs::remove_file(entry.path()).is_ok() {
                                removed_count += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    info!("Cleaned up {} old thumbnails", removed_count);
    Ok(removed_count)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_thumbnail_filename() {
        let filename1 = get_thumbnail_filename("/path/to/image.jpg");
        let filename2 = get_thumbnail_filename("/path/to/image.jpg");
        let filename3 = get_thumbnail_filename("/path/to/other.png");

        assert_eq!(filename1, filename2);
        assert_ne!(filename1, filename3);
        assert!(filename1.ends_with(".jpg"));
    }

    #[test]
    fn test_is_video_file() {
        assert!(is_video_file(Path::new("/test/video.mp4")));
        assert!(is_video_file(Path::new("/test/video.MP4")));
        assert!(is_video_file(Path::new("/test/video.webm")));
        assert!(!is_video_file(Path::new("/test/image.jpg")));
        assert!(!is_video_file(Path::new("/test/image.png")));
    }
}
