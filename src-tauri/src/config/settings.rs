use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub enum Theme {
    System,
    Light,
    Dark,
}

impl Default for Theme {
    fn default() -> Self {
        Theme::System
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct WindowSettings {
    pub width: u32,
    pub height: u32,
    pub x: Option<i32>,
    pub y: Option<i32>,
}

impl Default for WindowSettings {
    fn default() -> Self {
        Self {
            width: 1024,
            height: 768,
            x: None,
            y: None,
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct Settings {
    pub destinations: HashMap<String, Option<String>>,
    pub theme: Theme,
    pub language: String,
    pub window: WindowSettings,
}

impl Default for Settings {
    fn default() -> Self {
        let mut destinations = HashMap::new();
        for i in 1..=5 {
            destinations.insert(i.to_string(), None);
        }

        Self {
            destinations,
            theme: Theme::default(),
            language: "ja".to_string(),
            window: WindowSettings::default(),
        }
    }
}

/// 設定を読み込む（ファイルがなければデフォルト値）
#[tauri::command]
pub fn load_settings(config_path: String) -> Result<Settings, String> {
    let path = Path::new(&config_path);

    if !path.exists() {
        return Ok(Settings::default());
    }

    let content = fs::read_to_string(path).map_err(|e| e.to_string())?;
    let settings: Settings = serde_json::from_str(&content).map_err(|e| e.to_string())?;

    Ok(settings)
}

/// 設定を保存する
#[tauri::command]
pub fn save_settings(settings: Settings, config_path: String) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(&config_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_load_settings_default() {
        // Arrange: 存在しないパス
        let dir = tempdir().unwrap();
        let config_path = dir.path().join("settings.json");

        // Act: 設定読み込み
        let result = load_settings(config_path.to_string_lossy().to_string());

        // Assert: デフォルト設定が返る
        assert!(result.is_ok());
        let settings = result.unwrap();
        assert_eq!(settings.destinations.len(), 5);
        assert!(settings.destinations.values().all(|v| v.is_none()));
        assert_eq!(settings.language, "ja");
        assert!(matches!(settings.theme, Theme::System));
    }

    #[test]
    fn test_save_and_load_settings() {
        // Arrange: カスタム設定を作成
        let dir = tempdir().unwrap();
        let config_path = dir.path().join("settings.json");

        let mut settings = Settings::default();
        settings
            .destinations
            .insert("1".to_string(), Some("/path/to/folder1".to_string()));
        settings.theme = Theme::Dark;
        settings.language = "en".to_string();

        // Act: 保存して読み込み
        save_settings(settings.clone(), config_path.to_string_lossy().to_string()).unwrap();
        let loaded = load_settings(config_path.to_string_lossy().to_string()).unwrap();

        // Assert: 保存した内容が読み込める
        assert_eq!(loaded.destinations.get("1"), settings.destinations.get("1"));
        assert!(matches!(loaded.theme, Theme::Dark));
        assert_eq!(loaded.language, "en");
    }
}
