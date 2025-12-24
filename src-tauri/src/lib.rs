mod commands;
mod config;
mod logging;

use commands::file_ops::{move_file, scan_images, undo_move};
use commands::watcher::{start_watching, stop_watching, WatcherStateHandle};
use commands::thumbnail::{
    cleanup_thumbnail_cache, generate_thumbnail, generate_thumbnails_batch, move_files_batch,
};
use config::settings::{load_settings, save_settings};
use logging::{get_log_path, init_logging};
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // ロギングを初期化
    init_logging();

    tracing::info!("picSort アプリケーション起動");

    let watcher_state: WatcherStateHandle = Arc::new(Mutex::new(Default::default()));

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .manage(watcher_state)
        .invoke_handler(tauri::generate_handler![
            scan_images,
            move_file,
            undo_move,
            load_settings,
            save_settings,
            start_watching,
            stop_watching,
            get_log_path,
            generate_thumbnail,
            generate_thumbnails_batch,
            move_files_batch,
            cleanup_thumbnail_cache
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
