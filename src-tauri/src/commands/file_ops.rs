use serde::Serialize;
use std::fs;
use std::path::Path;
use std::time::UNIX_EPOCH;
use tracing::{debug, error, info};

#[derive(Debug, Serialize)]
pub struct ImageInfo {
    pub path: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
    #[serde(rename = "modifiedAt", skip_serializing_if = "Option::is_none")]
    pub modified_at: Option<i64>,
}

const SUPPORTED_EXTENSIONS: &[&str] = &["jpg", "jpeg", "png", "gif", "bmp", "webp"];

/// 重複しないユニークなファイルパスを生成する
fn generate_unique_path(folder: &str, file_name: &str) -> Result<String, String> {
    let base_path = Path::new(folder).join(file_name);
    if !base_path.exists() {
        return Ok(base_path.to_string_lossy().to_string());
    }

    let stem = Path::new(file_name)
        .file_stem()
        .map(|s| s.to_string_lossy().to_string())
        .unwrap_or_default();
    let ext = Path::new(file_name)
        .extension()
        .map(|s| format!(".{}", s.to_string_lossy()))
        .unwrap_or_default();

    for i in 1..1000 {
        let new_name = format!("{}_{}{}", stem, i, ext);
        let new_path = Path::new(folder).join(&new_name);
        if !new_path.exists() {
            return Ok(new_path.to_string_lossy().to_string());
        }
    }

    Err("Could not generate unique filename".to_string())
}

/// ファイルを指定フォルダに移動する
#[tauri::command]
pub fn move_file(src: String, dest_folder: String) -> Result<String, String> {
    debug!("ファイル移動開始: {} -> {}", src, dest_folder);

    let src_path = Path::new(&src);
    if !src_path.exists() {
        error!("移動元ファイルが見つかりません: {}", src);
        return Err(format!("Source file not found: {}", src));
    }

    let file_name = src_path
        .file_name()
        .ok_or("Invalid file name")?
        .to_string_lossy()
        .to_string();

    let dest_path = generate_unique_path(&dest_folder, &file_name)?;

    fs::rename(&src, &dest_path).map_err(|e| {
        error!("ファイル移動エラー: {} -> {}: {}", src, dest_path, e);
        e.to_string()
    })?;

    info!("ファイル移動完了: {} -> {}", src, dest_path);
    Ok(dest_path)
}

/// ファイル移動を元に戻す
#[tauri::command]
pub fn undo_move(current_path: String, original_folder: String) -> Result<String, String> {
    debug!("Undo移動開始: {} -> {}", current_path, original_folder);

    let src_path = Path::new(&current_path);
    if !src_path.exists() {
        error!("Undoファイルが見つかりません: {}", current_path);
        return Err(format!("File not found: {}", current_path));
    }

    let file_name = src_path
        .file_name()
        .ok_or("Invalid file name")?
        .to_string_lossy()
        .to_string();

    let dest_path = generate_unique_path(&original_folder, &file_name)?;

    fs::rename(&current_path, &dest_path).map_err(|e| {
        error!("Undo移動エラー: {} -> {}: {}", current_path, dest_path, e);
        e.to_string()
    })?;

    info!("Undo移動完了: {} -> {}", current_path, dest_path);
    Ok(dest_path)
}

/// 指定フォルダ内の画像ファイルをスキャンして返す
#[tauri::command]
pub fn scan_images(path: String) -> Result<Vec<ImageInfo>, String> {
    debug!("画像スキャン開始: {}", path);

    let dir = Path::new(&path);
    if !dir.is_dir() {
        error!("ディレクトリではありません: {}", path);
        return Err(format!("Not a directory: {}", path));
    }

    let mut images = Vec::new();

    let entries = fs::read_dir(dir).map_err(|e| {
        error!("ディレクトリ読み込みエラー: {}: {}", path, e);
        e.to_string()
    })?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        // 隠しファイルをスキップ
        if file_name.starts_with('.') {
            continue;
        }

        // シンボリックリンクをスキップ
        if file_path.is_symlink() {
            continue;
        }

        if let Some(ext) = file_path.extension() {
            let ext_lower = ext.to_string_lossy().to_lowercase();
            if SUPPORTED_EXTENSIONS.contains(&ext_lower.as_str()) {
                // メタデータを取得
                let (size, modified_at) = match fs::metadata(&file_path) {
                    Ok(meta) => {
                        let size = Some(meta.len());
                        let modified_at = meta.modified().ok().and_then(|t| {
                            t.duration_since(UNIX_EPOCH)
                                .ok()
                                .map(|d| d.as_secs() as i64)
                        });
                        (size, modified_at)
                    }
                    Err(_) => (None, None),
                };

                images.push(ImageInfo {
                    path: file_path.to_string_lossy().to_string(),
                    name: file_name,
                    size,
                    modified_at,
                });
            }
        }
    }

    // 自然順ソート
    images.sort_by(|a, b| natord::compare(&a.name, &b.name));

    info!("画像スキャン完了: {} - {}枚の画像を検出", path, images.len());
    Ok(images)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use tempfile::tempdir;

    #[test]
    fn test_scan_images_finds_supported_formats() {
        // Arrange: テスト用の一時ディレクトリを作成
        let dir = tempdir().unwrap();

        // サポートされる形式のファイルを作成
        File::create(dir.path().join("image1.jpg")).unwrap();
        File::create(dir.path().join("image2.png")).unwrap();
        File::create(dir.path().join("image3.gif")).unwrap();

        // Act: scan_images を実行
        let result = scan_images(dir.path().to_string_lossy().to_string());

        // Assert: 3つの画像が見つかる
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 3);
    }

    #[test]
    fn test_scan_images_empty_folder() {
        // Arrange: 空のテスト用ディレクトリを作成
        let dir = tempdir().unwrap();

        // Act: scan_images を実行
        let result = scan_images(dir.path().to_string_lossy().to_string());

        // Assert: 空のVecが返る
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[test]
    fn test_scan_images_filters_unsupported() {
        // Arrange: サポート形式と非サポート形式を混在
        let dir = tempdir().unwrap();

        File::create(dir.path().join("image.jpg")).unwrap();
        File::create(dir.path().join("document.pdf")).unwrap();
        File::create(dir.path().join("data.txt")).unwrap();

        // Act: scan_images を実行
        let result = scan_images(dir.path().to_string_lossy().to_string());

        // Assert: jpgのみ検出
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 1);
    }

    #[test]
    fn test_scan_images_case_insensitive() {
        // Arrange: 大文字拡張子のファイルを作成
        let dir = tempdir().unwrap();

        File::create(dir.path().join("image1.JPG")).unwrap();
        File::create(dir.path().join("image2.Png")).unwrap();
        File::create(dir.path().join("image3.GIF")).unwrap();

        // Act: scan_images を実行
        let result = scan_images(dir.path().to_string_lossy().to_string());

        // Assert: 全て検出される
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 3);
    }

    #[test]
    fn test_scan_images_sorted_naturally() {
        // Arrange: 自然順ソートが必要なファイル名
        let dir = tempdir().unwrap();

        File::create(dir.path().join("img2.jpg")).unwrap();
        File::create(dir.path().join("img10.jpg")).unwrap();
        File::create(dir.path().join("img1.jpg")).unwrap();

        // Act: scan_images を実行
        let result = scan_images(dir.path().to_string_lossy().to_string()).unwrap();

        // Assert: 自然順でソートされる (img1, img2, img10)
        assert_eq!(result[0].name, "img1.jpg");
        assert_eq!(result[1].name, "img2.jpg");
        assert_eq!(result[2].name, "img10.jpg");
    }

    #[test]
    fn test_scan_images_excludes_hidden() {
        // Arrange: 隠しファイルと通常ファイルを作成
        let dir = tempdir().unwrap();

        File::create(dir.path().join("visible.jpg")).unwrap();
        File::create(dir.path().join(".hidden.jpg")).unwrap();

        // Act: scan_images を実行
        let result = scan_images(dir.path().to_string_lossy().to_string());

        // Assert: 隠しファイルはスキップ
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 1);
    }

    #[cfg(unix)]
    #[test]
    fn test_scan_images_skips_symlinks() {
        use std::os::unix::fs::symlink;

        // Arrange: 通常ファイルとシンボリックリンクを作成
        let dir = tempdir().unwrap();

        let target = dir.path().join("target.jpg");
        let link = dir.path().join("link.jpg");

        File::create(&target).unwrap();
        symlink(&target, &link).unwrap();

        // Act: scan_images を実行
        let result = scan_images(dir.path().to_string_lossy().to_string());

        // Assert: シンボリックリンクはスキップされ、通常ファイルのみ
        assert!(result.is_ok());
        assert_eq!(result.unwrap().len(), 1);
    }

    // ===== generate_unique_path tests =====

    #[test]
    fn test_generate_unique_path_no_conflict() {
        // Arrange: 空のディレクトリ
        let dir = tempdir().unwrap();

        // Act: ユニークパス生成
        let result = generate_unique_path(
            dir.path().to_str().unwrap(),
            "photo.jpg",
        );

        // Assert: 元のファイル名がそのまま使われる
        assert!(result.is_ok());
        assert!(result.unwrap().ends_with("photo.jpg"));
    }

    #[test]
    fn test_generate_unique_path_single_conflict() {
        // Arrange: 同名ファイルが存在
        let dir = tempdir().unwrap();
        File::create(dir.path().join("photo.jpg")).unwrap();

        // Act: ユニークパス生成
        let result = generate_unique_path(
            dir.path().to_str().unwrap(),
            "photo.jpg",
        );

        // Assert: _1 サフィックスが付く
        assert!(result.is_ok());
        assert!(result.unwrap().ends_with("photo_1.jpg"));
    }

    #[test]
    fn test_generate_unique_path_multiple_conflicts() {
        // Arrange: photo.jpg と photo_1.jpg が存在
        let dir = tempdir().unwrap();
        File::create(dir.path().join("photo.jpg")).unwrap();
        File::create(dir.path().join("photo_1.jpg")).unwrap();
        File::create(dir.path().join("photo_2.jpg")).unwrap();

        // Act: ユニークパス生成
        let result = generate_unique_path(
            dir.path().to_str().unwrap(),
            "photo.jpg",
        );

        // Assert: _3 サフィックスが付く
        assert!(result.is_ok());
        assert!(result.unwrap().ends_with("photo_3.jpg"));
    }

    // ===== move_file tests =====

    #[test]
    fn test_move_file_success() {
        // Arrange: ソースと移動先ディレクトリを作成
        let src_dir = tempdir().unwrap();
        let dest_dir = tempdir().unwrap();

        let src_path = src_dir.path().join("test.jpg");
        File::create(&src_path).unwrap();

        // Act: ファイル移動
        let result = move_file(
            src_path.to_string_lossy().to_string(),
            dest_dir.path().to_string_lossy().to_string(),
        );

        // Assert: 移動成功
        assert!(result.is_ok());
        assert!(!src_path.exists()); // 元ファイルはなくなる
        assert!(dest_dir.path().join("test.jpg").exists()); // 移動先に存在
    }

    #[test]
    fn test_move_file_with_duplicate() {
        // Arrange: 移動先に同名ファイルが存在
        let src_dir = tempdir().unwrap();
        let dest_dir = tempdir().unwrap();

        let src_path = src_dir.path().join("test.jpg");
        File::create(&src_path).unwrap();
        File::create(dest_dir.path().join("test.jpg")).unwrap();

        // Act: ファイル移動
        let result = move_file(
            src_path.to_string_lossy().to_string(),
            dest_dir.path().to_string_lossy().to_string(),
        );

        // Assert: 連番付きで移動
        assert!(result.is_ok());
        assert!(dest_dir.path().join("test_1.jpg").exists());
    }

    #[test]
    fn test_move_file_source_not_found() {
        // Arrange: 移動先のみ作成
        let dest_dir = tempdir().unwrap();

        // Act: 存在しないファイルを移動
        let result = move_file(
            "/nonexistent/path/file.jpg".to_string(),
            dest_dir.path().to_string_lossy().to_string(),
        );

        // Assert: エラー
        assert!(result.is_err());
        assert!(result.unwrap_err().contains("not found"));
    }
}
