use std::path::PathBuf;
use tracing_appender::rolling::{RollingFileAppender, Rotation};
use tracing_subscriber::{fmt, layer::SubscriberExt, util::SubscriberInitExt, EnvFilter};

/// ログディレクトリを取得
fn get_log_dir() -> PathBuf {
    dirs::data_local_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("com.picsort.app")
        .join("logs")
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
}
