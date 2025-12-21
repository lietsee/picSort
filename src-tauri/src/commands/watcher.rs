use notify::{Config, Event, RecommendedWatcher, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};
use tracing::{debug, error, info, warn};

/// デバウンス時間（ミリ秒）
const DEBOUNCE_MS: u64 = 500;

/// ファイルシステム変更イベントの種類
#[derive(Clone, serde::Serialize)]
#[serde(tag = "type", content = "path")]
pub enum FsChangeEvent {
    Created(String),
    Modified(String),
    Removed(String),
}

/// ペンディングイベント
#[derive(Clone)]
struct PendingEvent {
    event_type: PendingEventType,
    timestamp: Instant,
}

#[derive(Clone, PartialEq)]
enum PendingEventType {
    Created,
    Modified,
    Removed,
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

        // デバウンス用のペンディングイベント
        let mut pending_events: HashMap<String, PendingEvent> = HashMap::new();
        let debounce_duration = Duration::from_millis(DEBOUNCE_MS);

        loop {
            // 停止シグナルをチェック
            if stop_rx.try_recv().is_ok() {
                info!("ファイル監視を停止");
                break;
            }

            // イベントを処理
            match rx.recv_timeout(Duration::from_millis(50)) {
                Ok(Ok(event)) => {
                    collect_event(&mut pending_events, event);
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

            // デバウンス済みイベントを発火
            emit_debounced_events(&app_handle, &mut pending_events, debounce_duration);
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

/// イベントをペンディングリストに追加
fn collect_event(pending: &mut HashMap<String, PendingEvent>, event: Event) {
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

    for path in image_paths {
        let event_type = match event.kind {
            EventKind::Create(_) => Some(PendingEventType::Created),
            EventKind::Modify(_) => Some(PendingEventType::Modified),
            EventKind::Remove(_) => Some(PendingEventType::Removed),
            _ => None,
        };

        if let Some(evt_type) = event_type {
            // 同じパスのイベントは上書き（最新のみ保持）
            pending.insert(
                path,
                PendingEvent {
                    event_type: evt_type,
                    timestamp: Instant::now(),
                },
            );
        }
    }
}

/// デバウンス期間を過ぎたイベントを発火
fn emit_debounced_events(
    app: &AppHandle,
    pending: &mut HashMap<String, PendingEvent>,
    debounce_duration: Duration,
) {
    let now = Instant::now();
    let mut to_emit = Vec::new();

    // デバウンス期間を過ぎたイベントを収集
    for (path, event) in pending.iter() {
        if now.duration_since(event.timestamp) >= debounce_duration {
            to_emit.push((path.clone(), event.clone()));
        }
    }

    // イベントを発火して削除
    for (path, event) in to_emit {
        pending.remove(&path);

        let change_event = match event.event_type {
            PendingEventType::Created => {
                info!("ファイル作成検知（デバウンス後）: {}", path);
                FsChangeEvent::Created(path)
            }
            PendingEventType::Modified => {
                debug!("ファイル変更検知（デバウンス後）: {}", path);
                FsChangeEvent::Modified(path)
            }
            PendingEventType::Removed => {
                info!("ファイル削除検知（デバウンス後）: {}", path);
                FsChangeEvent::Removed(path)
            }
        };

        if let Err(e) = app.emit("fs-change", change_event) {
            error!("イベント送信エラー: {}", e);
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

    #[test]
    fn test_debounce_constant() {
        assert_eq!(DEBOUNCE_MS, 500);
    }
}
