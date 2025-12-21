use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use tauri::{AppHandle, Emitter};
use tracing::{debug, error, info, warn};

/// ファイルシステム変更イベントの種類
#[derive(Clone, serde::Serialize)]
#[serde(tag = "type", content = "path")]
pub enum FsChangeEvent {
    Created(String),
    Modified(String),
    Removed(String),
}

/// ウォッチャーの状態を管理
pub struct WatcherState {
    sender: Option<Sender<()>>,
    watching_path: Option<PathBuf>,
}

impl Default for WatcherState {
    fn default() -> Self {
        Self {
            sender: None,
            watching_path: None,
        }
    }
}

/// グローバルなウォッチャー状態
pub type WatcherStateHandle = Arc<Mutex<WatcherState>>;

/// 監視を開始
#[tauri::command]
pub fn start_watching(
    app: AppHandle,
    path: String,
    state: tauri::State<'_, WatcherStateHandle>,
) -> Result<(), String> {
    let path = PathBuf::from(&path);

    if !path.exists() || !path.is_dir() {
        return Err("指定されたパスが存在しないか、ディレクトリではありません".to_string());
    }

    // 既存の監視を停止
    {
        let mut watcher_state = state.lock().map_err(|e| e.to_string())?;
        if let Some(sender) = watcher_state.sender.take() {
            let _ = sender.send(());
        }
    }

    let (stop_tx, stop_rx): (Sender<()>, Receiver<()>) = channel();
    let watch_path = path.clone();
    let app_handle = app.clone();

    info!("ファイル監視を開始: {:?}", path);

    thread::spawn(move || {
        let (tx, rx) = channel::<Result<Event, notify::Error>>();

        let mut watcher = match RecommendedWatcher::new(
            move |res| {
                let _ = tx.send(res);
            },
            Config::default(),
        ) {
            Ok(w) => w,
            Err(e) => {
                error!("ウォッチャーの作成に失敗: {}", e);
                return;
            }
        };

        if let Err(e) = watcher.watch(&watch_path, RecursiveMode::NonRecursive) {
            error!("監視の開始に失敗: {}", e);
            return;
        }

        debug!("ウォッチャースレッド開始");

        loop {
            // 停止シグナルをチェック
            if stop_rx.try_recv().is_ok() {
                info!("ファイル監視を停止");
                break;
            }

            // イベントを処理
            match rx.recv_timeout(std::time::Duration::from_millis(100)) {
                Ok(Ok(event)) => {
                    process_event(&app_handle, event);
                }
                Ok(Err(e)) => {
                    warn!("ファイル監視エラー: {}", e);
                }
                Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {
                    // タイムアウトは正常
                }
                Err(std::sync::mpsc::RecvTimeoutError::Disconnected) => {
                    debug!("チャンネル切断");
                    break;
                }
            }
        }
    });

    // 状態を更新
    {
        let mut watcher_state = state.lock().map_err(|e| e.to_string())?;
        watcher_state.sender = Some(stop_tx);
        watcher_state.watching_path = Some(path);
    }

    Ok(())
}

/// 監視を停止
#[tauri::command]
pub fn stop_watching(state: tauri::State<'_, WatcherStateHandle>) -> Result<(), String> {
    let mut watcher_state = state.lock().map_err(|e| e.to_string())?;

    if let Some(sender) = watcher_state.sender.take() {
        let _ = sender.send(());
        info!("ファイル監視停止リクエスト送信");
    }

    watcher_state.watching_path = None;
    Ok(())
}

/// イベントを処理してフロントエンドに通知
fn process_event(app: &AppHandle, event: Event) {
    use notify::EventKind;

    let paths: Vec<String> = event
        .paths
        .iter()
        .filter_map(|p| p.to_str().map(String::from))
        .collect();

    if paths.is_empty() {
        return;
    }

    // 画像ファイルのみ処理
    let image_extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp", "tiff", "tif"];
    let image_paths: Vec<String> = paths
        .into_iter()
        .filter(|p| {
            let lower = p.to_lowercase();
            image_extensions.iter().any(|ext| lower.ends_with(ext))
        })
        .collect();

    if image_paths.is_empty() {
        return;
    }

    for path in image_paths {
        let change_event = match event.kind {
            EventKind::Create(_) => {
                info!("ファイル作成検知: {}", path);
                Some(FsChangeEvent::Created(path))
            }
            EventKind::Modify(_) => {
                debug!("ファイル変更検知: {}", path);
                Some(FsChangeEvent::Modified(path))
            }
            EventKind::Remove(_) => {
                info!("ファイル削除検知: {}", path);
                Some(FsChangeEvent::Removed(path))
            }
            _ => None,
        };

        if let Some(evt) = change_event {
            if let Err(e) = app.emit("fs-change", evt) {
                error!("イベント送信エラー: {}", e);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_watcher_state_default() {
        let state = WatcherState::default();
        assert!(state.sender.is_none());
        assert!(state.watching_path.is_none());
    }
}
