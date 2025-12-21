use std::fs;
use std::path::PathBuf;
use std::time::{Duration, SystemTime};
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// ログ保持期間（日数）
const LOG_RETENTION_DAYS: u64 = 7;

/// ログファイル最大サイズ（バイト）
const MAX_LOG_SIZE: u64 = 10 * 1024 * 1024; // 10MB

/// ログディレクトリを取得
fn get_log_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.picsort.app")
        .join("logs")
}

/// 古いログファイルをクリーンアップ
fn cleanup_old_logs(log_dir: &PathBuf) {
    let retention_duration = Duration::from_secs(LOG_RETENTION_DAYS * 24 * 60 * 60);
    let now = SystemTime::now();

    if let Ok(entries) = fs::read_dir(log_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_file() {
                continue;
            }

            // .log ファイルのみ対象
            if path.extension().map(|e| e != "log").unwrap_or(true) {
                continue;
            }

            // ファイルの変更日時をチェック
            if let Ok(metadata) = path.metadata() {
                if let Ok(modified) = metadata.modified() {
                    if let Ok(age) = now.duration_since(modified) {
                        if age > retention_duration {
                            if let Err(e) = fs::remove_file(&path) {
                                eprintln!("古いログファイルの削除に失敗: {:?}: {}", path, e);
                            }
                        }
                    }
                }

                // 現在のログファイルがサイズ制限を超えている場合は切り詰め
                if path.file_name().map(|n| n == "picsort.log").unwrap_or(false) {
                    if metadata.len() > MAX_LOG_SIZE {
                        // ファイルを空にする（次回書き込みで新しく始める）
                        if let Err(e) = fs::write(&path, "") {
                            eprintln!("ログファイルのリセットに失敗: {:?}: {}", path, e);
                        }
                    }
                }
            }
        }
    }
}

/// ロギングを初期化
pub fn init_logging() {
    let log_dir = get_log_dir();

    // ログディレクトリを作成
    if let Err(e) = std::fs::create_dir_all(&log_dir) {
        eprintln!("ログディレクトリの作成に失敗: {}", e);
        // フォールバック: コンソールのみ
        init_console_only();
        return;
    }

    // 古いログファイルをクリーンアップ
    cleanup_old_logs(&log_dir);

    // ファイルアペンダー（日次ローテーション）
    let file_appender = RollingFileAppender::new(Rotation::DAILY, &log_dir, "picsort.log");

    // 環境変数でログレベルを設定可能
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info,picsort=debug"));

    // ファイル用レイヤー
    let file_layer = fmt::layer()
        .with_writer(file_appender)
        .with_ansi(false)
        .with_target(true)
        .with_thread_ids(false)
        .with_file(true)
        .with_line_number(true);

    // コンソール用レイヤー（開発時）
    let console_layer = fmt::layer()
        .with_writer(std::io::stderr)
        .with_ansi(true)
        .with_target(true)
        .with_level(true);

    tracing_subscriber::registry()
        .with(env_filter)
        .with(file_layer)
        .with(console_layer)
        .init();

    tracing::info!("ログシステム初期化完了: {:?}", log_dir);
}

/// コンソールのみのロギング（フォールバック）
fn init_console_only() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(fmt::layer().with_writer(std::io::stderr))
        .init();
}

/// ログファイルのパスを取得
#[tauri::command]
pub fn get_log_path() -> String {
    get_log_dir()
        .join("picsort.log")
        .to_string_lossy()
        .to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_log_dir() {
        let dir = get_log_dir();
        assert!(dir.to_string_lossy().contains("picsort"));
    }

    #[test]
    fn test_log_constants() {
        assert_eq!(LOG_RETENTION_DAYS, 7);
        assert_eq!(MAX_LOG_SIZE, 10 * 1024 * 1024);
    }
}
