# 技術アーキテクチャ

このドキュメントでは、画像仕分けアプリのシステム構成、コンポーネント設計、データフローを定義する。

## 1. システム構成図

```mermaid
graph TB
    subgraph Desktop["デスクトップアプリケーション"]
        subgraph Frontend["Frontend (React + TypeScript)"]
            UI["UI Components"]
            Context["React Context"]
            Hooks["Custom Hooks"]
        end

        subgraph Backend["Backend (Rust)"]
            Commands["Tauri Commands"]
            FileOps["File Operations"]
            ConfigMgr["Config Manager"]
            Logger["Logger"]
        end

        subgraph Tauri["Tauri Runtime"]
            IPC["IPC Bridge"]
            Window["Window Manager"]
            Dialog["Native Dialogs"]
        end
    end

    subgraph OS["Operating System"]
        FS["File System"]
        Settings["App Settings"]
        Logs["Log Files"]
    end

    UI <--> Context
    Context <--> Hooks
    Hooks <--> IPC
    IPC <--> Commands
    Commands --> FileOps
    Commands --> ConfigMgr
    Commands --> Logger
    FileOps --> FS
    ConfigMgr --> Settings
    Logger --> Logs
    Dialog --> FS
```

## 2. コンポーネント関係図

```mermaid
graph TD
    subgraph Providers["Context Providers"]
        AppProvider["AppProvider"]
        ThemeProvider["ThemeProvider"]
    end

    subgraph Pages["Pages"]
        MainPage["MainPage"]
    end

    subgraph Components["UI Components"]
        Header["Header"]
        DestButtons["DestinationButtons"]
        Preview["PreviewArea"]
        StatusBar["StatusBar"]
    end

    subgraph Hooks["Custom Hooks"]
        useImageList["useImageList"]
        useFileMove["useFileMove"]
        useKeyboard["useKeyboard"]
        useSettings["useSettings"]
        useTauriCommands["useTauriCommands"]
    end

    AppProvider --> MainPage
    ThemeProvider --> MainPage
    MainPage --> Header
    MainPage --> DestButtons
    MainPage --> Preview
    MainPage --> StatusBar

    Header --> useSettings
    DestButtons --> useSettings
    DestButtons --> useFileMove
    Preview --> useImageList
    StatusBar --> useImageList

    useImageList --> useTauriCommands
    useFileMove --> useTauriCommands
    useSettings --> useTauriCommands
```

## 3. データフロー図

```mermaid
sequenceDiagram
    participant User
    participant UI as React UI
    participant Context as AppContext
    participant Hooks as Custom Hooks
    participant Tauri as Tauri IPC
    participant Rust as Rust Backend
    participant FS as File System

    User->>UI: フォルダを選択
    UI->>Tauri: open_folder_dialog()
    Tauri->>Rust: invoke command
    Rust->>FS: OS dialog
    FS-->>Rust: selected path
    Rust-->>Tauri: path
    Tauri-->>UI: path

    UI->>Context: setSourceFolder(path)
    Context->>Hooks: useImageList triggered
    Hooks->>Tauri: scan_images(path)
    Tauri->>Rust: invoke command
    Rust->>FS: read directory
    FS-->>Rust: file list
    Rust-->>Tauri: image list
    Tauri-->>Hooks: image list
    Hooks->>Context: setImageList(images)
    Context-->>UI: re-render with images
```

## 4. ディレクトリ構造

```
picSort/
├── src/                          # Reactソースコード
│   ├── components/               # UIコンポーネント
│   │   ├── ui/                   # shadcn/ui コンポーネント
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── select.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── toast.tsx
│   │   ├── Header/
│   │   │   ├── Header.tsx
│   │   │   ├── FolderSelectButton.tsx
│   │   │   ├── PathDisplay.tsx
│   │   │   └── index.ts
│   │   ├── DestinationButtons/
│   │   │   ├── DestinationButtons.tsx
│   │   │   ├── DestButton.tsx
│   │   │   └── index.ts
│   │   ├── PreviewArea/
│   │   │   ├── PreviewArea.tsx
│   │   │   ├── ImageViewer.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   ├── DropZone.tsx
│   │   │   └── index.ts
│   │   ├── StatusBar/
│   │   │   ├── StatusBar.tsx
│   │   │   └── index.ts
│   │   ├── Settings/             # 設定画面
│   │   │   ├── Settings.tsx
│   │   │   ├── ThemeSelector.tsx
│   │   │   ├── LanguageSelector.tsx
│   │   │   ├── DestinationList.tsx
│   │   │   └── index.ts
│   │   └── Wizard/               # 初回ウィザード
│   │       ├── WelcomeWizard.tsx
│   │       └── index.ts
│   ├── contexts/                 # React Context
│   │   ├── AppContext.tsx
│   │   └── ThemeContext.tsx
│   ├── hooks/                    # Custom Hooks
│   │   ├── useImageList.ts
│   │   ├── useFileMove.ts
│   │   ├── useKeyboard.ts
│   │   ├── useSettings.ts
│   │   └── useTauriCommands.ts
│   ├── lib/                      # ユーティリティライブラリ
│   │   └── utils.ts              # clsx + tailwind-merge
│   ├── types/                    # TypeScript型定義
│   │   ├── image.ts
│   │   ├── settings.ts
│   │   └── index.ts
│   ├── utils/                    # ユーティリティ
│   │   ├── path.ts
│   │   └── format.ts
│   ├── i18n/                     # 国際化
│   │   ├── ja.json
│   │   └── en.json
│   ├── styles/                   # グローバルスタイル
│   │   └── globals.css           # Tailwind directives
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── src-tauri/                    # Rustソースコード
│   ├── src/
│   │   ├── commands/             # Tauriコマンド
│   │   │   ├── mod.rs
│   │   │   ├── file_ops.rs
│   │   │   ├── dialog.rs
│   │   │   └── config.rs
│   │   ├── utils/                # ユーティリティ
│   │   │   ├── mod.rs
│   │   │   └── path.rs
│   │   ├── config/               # 設定管理
│   │   │   ├── mod.rs
│   │   │   └── settings.rs
│   │   ├── logger/               # ログ管理
│   │   │   └── mod.rs
│   │   ├── watcher/              # ファイル監視
│   │   │   └── mod.rs
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── public/                       # 静的ファイル
├── docs/                         # ドキュメント
├── tests/                        # テスト
│   ├── unit/
│   └── e2e/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js            # Tailwind CSS 設定
├── postcss.config.js             # PostCSS 設定
├── components.json               # shadcn/ui 設定
└── README.md
```

## 5. Rust Backend

### 5.1 Tauriコマンド一覧

| コマンド | 引数 | 戻り値 | 説明 |
|---------|------|--------|------|
| `open_folder_dialog` | `title: String` | `Option<String>` | フォルダ選択ダイアログ表示 |
| `scan_images` | `path: String` | `Result<Vec<ImageInfo>>` | フォルダ内画像をスキャン |
| `move_file` | `src: String, dest: String` | `Result<String>` | ファイル移動（連番対応） |
| `read_image` | `path: String` | `Result<Vec<u8>>` | 画像バイナリ読み込み |
| `load_settings` | - | `Result<Settings>` | 設定読み込み |
| `save_settings` | `settings: Settings` | `Result<()>` | 設定保存 |
| `get_app_dir` | - | `String` | アプリデータディレクトリ取得 |
| `watch_folder` | `path: String` | `Result<()>` | フォルダ監視開始 |
| `unwatch_folder` | `path: String` | `Result<()>` | フォルダ監視停止 |

### 5.2 コマンド定義例

```rust
// src-tauri/src/commands/file_ops.rs

use tauri::command;
use std::path::Path;
use std::fs;

#[derive(serde::Serialize)]
pub struct ImageInfo {
    pub path: String,
    pub name: String,
    pub size: u64,
    pub modified_at: u64,
}

#[command]
pub fn scan_images(path: String) -> Result<Vec<ImageInfo>, String> {
    let dir = Path::new(&path);
    if !dir.is_dir() {
        return Err("Not a directory".to_string());
    }

    let mut images = Vec::new();
    let extensions = ["jpg", "jpeg", "png", "gif", "bmp", "webp"];

    for entry in fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if let Some(ext) = path.extension() {
            let ext_lower = ext.to_string_lossy().to_lowercase();
            if extensions.contains(&ext_lower.as_str()) {
                let metadata = entry.metadata().map_err(|e| e.to_string())?;
                images.push(ImageInfo {
                    path: path.to_string_lossy().to_string(),
                    name: entry.file_name().to_string_lossy().to_string(),
                    size: metadata.len(),
                    modified_at: metadata.modified()
                        .ok()
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_secs())
                        .unwrap_or(0),
                });
            }
        }
    }

    // 自然順ソート
    images.sort_by(|a, b| natord::compare(&a.name, &b.name));
    Ok(images)
}

#[command]
pub fn move_file(src: String, dest_folder: String) -> Result<String, String> {
    let src_path = Path::new(&src);
    if !src_path.exists() {
        return Err("Source file not found".to_string());
    }

    let file_name = src_path.file_name()
        .ok_or("Invalid file name")?
        .to_string_lossy()
        .to_string();

    let dest_path = generate_unique_path(&dest_folder, &file_name)?;

    fs::rename(&src, &dest_path).map_err(|e| e.to_string())?;

    Ok(dest_path)
}

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
```

### 5.3 設定管理

```rust
// src-tauri/src/config/settings.rs

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct Settings {
    pub destinations: HashMap<String, Option<String>>,
    pub theme: Theme,
    pub language: String,
    pub window: WindowSettings,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct WindowSettings {
    pub width: u32,
    pub height: u32,
    pub x: Option<i32>,
    pub y: Option<i32>,
}
```

## 6. React Frontend

### 6.1 Context設計

```typescript
// src/contexts/AppContext.tsx

import { createContext, useContext, useReducer, ReactNode } from 'react';

interface ImageInfo {
  path: string;
  name: string;
  size: number;
  modifiedAt: number;
}

interface AppState {
  sourceFolder: string | null;
  images: ImageInfo[];
  currentIndex: number;
  destinations: Record<string, string | null>;
  status: 'idle' | 'loading' | 'error';
  statusMessage: string;
}

type AppAction =
  | { type: 'SET_SOURCE_FOLDER'; payload: string }
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_CURRENT_INDEX'; payload: number }
  | { type: 'REMOVE_CURRENT_IMAGE' }
  | { type: 'SET_DESTINATION'; payload: { key: string; path: string | null } }
  | { type: 'SET_STATUS'; payload: { status: AppState['status']; message?: string } };

const initialState: AppState = {
  sourceFolder: null,
  images: [],
  currentIndex: 0,
  destinations: { '1': null, '2': null, '3': null, '4': null, '5': null },
  status: 'idle',
  statusMessage: '',
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SOURCE_FOLDER':
      return { ...state, sourceFolder: action.payload, images: [], currentIndex: 0 };
    case 'SET_IMAGES':
      return { ...state, images: action.payload, currentIndex: 0 };
    case 'SET_CURRENT_INDEX':
      return { ...state, currentIndex: action.payload };
    case 'REMOVE_CURRENT_IMAGE': {
      const newImages = state.images.filter((_, i) => i !== state.currentIndex);
      const newIndex = Math.min(state.currentIndex, newImages.length - 1);
      return { ...state, images: newImages, currentIndex: Math.max(0, newIndex) };
    }
    case 'SET_DESTINATION':
      return {
        ...state,
        destinations: { ...state.destinations, [action.payload.key]: action.payload.path },
      };
    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload.status,
        statusMessage: action.payload.message || '',
      };
    default:
      return state;
  }
}

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
}
```

### 6.2 Custom Hooks

```typescript
// src/hooks/useTauriCommands.ts

import { invoke } from '@tauri-apps/api/core';

interface ImageInfo {
  path: string;
  name: string;
  size: number;
  modified_at: number;
}

export function useTauriCommands() {
  const openFolderDialog = async (title: string): Promise<string | null> => {
    return await invoke<string | null>('open_folder_dialog', { title });
  };

  const scanImages = async (path: string): Promise<ImageInfo[]> => {
    return await invoke<ImageInfo[]>('scan_images', { path });
  };

  const moveFile = async (src: string, destFolder: string): Promise<string> => {
    return await invoke<string>('move_file', { src, destFolder });
  };

  return {
    openFolderDialog,
    scanImages,
    moveFile,
  };
}
```

```typescript
// src/hooks/useKeyboard.ts

import { useEffect, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';

export function useKeyboard() {
  const { state, dispatch } = useApp();

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 入力フィールドにフォーカスがある場合は無視
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return;
    }

    const key = event.key;

    // 数字キー（1-5）: 仕分け
    if (['1', '2', '3', '4', '5'].includes(key)) {
      const dest = state.destinations[key];
      if (!dest) {
        dispatch({
          type: 'SET_STATUS',
          payload: { status: 'error', message: `分別先${key}を設定してください` },
        });
        return;
      }
      // 移動処理をトリガー（別途実装）
      return;
    }

    // 矢印キー: 画像移動
    if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
      if (state.currentIndex > 0) {
        dispatch({ type: 'SET_CURRENT_INDEX', payload: state.currentIndex - 1 });
      }
      return;
    }

    if (key === 'ArrowRight' || key === 'd' || key === 'D' || key === ' ') {
      if (state.currentIndex < state.images.length - 1) {
        dispatch({ type: 'SET_CURRENT_INDEX', payload: state.currentIndex + 1 });
      }
      return;
    }
  }, [state, dispatch]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
}
```

### 6.3 Tauriコマンド呼び出しパターン

```typescript
// 推奨パターン: エラーハンドリング付き

import { useCallback, useState } from 'react';
import { useTauriCommands } from './useTauriCommands';
import { useApp } from '../contexts/AppContext';

export function useFileMove() {
  const { moveFile } = useTauriCommands();
  const { state, dispatch } = useApp();
  const [isMoving, setIsMoving] = useState(false);

  const moveCurrentImage = useCallback(async (destKey: string) => {
    const destFolder = state.destinations[destKey];
    if (!destFolder) {
      dispatch({
        type: 'SET_STATUS',
        payload: { status: 'error', message: `分別先${destKey}を設定してください` },
      });
      return false;
    }

    const currentImage = state.images[state.currentIndex];
    if (!currentImage) {
      return false;
    }

    setIsMoving(true);
    dispatch({
      type: 'SET_STATUS',
      payload: { status: 'loading', message: '移動中...' },
    });

    try {
      await moveFile(currentImage.path, destFolder);
      dispatch({ type: 'REMOVE_CURRENT_IMAGE' });
      dispatch({
        type: 'SET_STATUS',
        payload: { status: 'idle', message: `移動完了: ${destFolder}` },
      });
      return true;
    } catch (error) {
      dispatch({
        type: 'SET_STATUS',
        payload: { status: 'error', message: `移動失敗: ${error}` },
      });
      return false;
    } finally {
      setIsMoving(false);
    }
  }, [state, dispatch, moveFile]);

  return { moveCurrentImage, isMoving };
}
```

## 7. 型定義

```typescript
// src/types/index.ts

export interface ImageInfo {
  path: string;
  name: string;
  size: number;
  modifiedAt: number;
}

export interface Settings {
  destinations: Record<string, string | null>;
  theme: 'system' | 'light' | 'dark';
  language: 'ja' | 'en';
  window: WindowSettings;
}

export interface WindowSettings {
  width: number;
  height: number;
  x?: number;
  y?: number;
}

export type Status = 'idle' | 'loading' | 'error';

export interface StatusInfo {
  status: Status;
  message: string;
}
```

## 8. 通信プロトコル

### 8.1 Tauri IPC

```mermaid
sequenceDiagram
    participant React
    participant IPC as Tauri IPC
    participant Rust

    React->>IPC: invoke("command_name", { args })
    IPC->>Rust: Deserialize args
    Rust->>Rust: Execute command
    alt Success
        Rust->>IPC: Ok(result)
        IPC->>React: Promise.resolve(result)
    else Error
        Rust->>IPC: Err(message)
        IPC->>React: Promise.reject(error)
    end
```

### 8.2 エラー伝播

| レイヤー | エラー形式 | 例 |
|---------|-----------|-----|
| Rust | `Result<T, String>` | `Err("File not found".to_string())` |
| Tauri IPC | JavaScript Error | `{ message: "File not found" }` |
| React Hook | throw Error | `throw new Error("File not found")` |
| UI | statusMessage | ステータスバーに表示 |

## 9. ファイルシステム監視

### 9.1 実装方式

| OS | ライブラリ | 備考 |
|----|-----------|------|
| macOS | FSEvents via notify crate | 高効率 |
| Windows | ReadDirectoryChangesW via notify crate | 高効率 |
| ネットワークドライブ | ポーリング（30秒間隔） | フォールバック |

### 9.2 イベントフロー

```mermaid
sequenceDiagram
    participant FS as FileSystem
    participant Rust as Rust Backend
    participant IPC as Tauri IPC
    participant React as React UI

    Rust->>FS: watch_folder(path)
    FS-->>Rust: Watcher registered

    FS->>Rust: File created/deleted
    Rust->>Rust: Debounce 500ms
    Rust->>IPC: emit("folder_changed", { path, event })
    IPC->>React: Event received
    React->>React: Re-scan folder
```

### 9.3 Rust実装

```rust
// src-tauri/src/watcher/mod.rs

use notify::{RecommendedWatcher, RecursiveMode, Watcher, Config};
use std::sync::mpsc::channel;
use std::time::Duration;
use tauri::{AppHandle, Manager};

pub struct FolderWatcher {
    watcher: Option<RecommendedWatcher>,
}

impl FolderWatcher {
    pub fn new() -> Self {
        Self { watcher: None }
    }

    pub fn watch(&mut self, path: &str, app: AppHandle) -> Result<(), String> {
        let (tx, rx) = channel();

        let mut watcher = RecommendedWatcher::new(
            tx,
            Config::default().with_poll_interval(Duration::from_secs(30)),
        ).map_err(|e| e.to_string())?;

        watcher.watch(path.as_ref(), RecursiveMode::NonRecursive)
            .map_err(|e| e.to_string())?;

        // イベントループ（別スレッド）
        let app_handle = app.clone();
        std::thread::spawn(move || {
            let mut last_event = std::time::Instant::now();
            loop {
                match rx.recv_timeout(Duration::from_millis(100)) {
                    Ok(Ok(event)) => {
                        // デバウンス処理
                        if last_event.elapsed() > Duration::from_millis(500) {
                            app_handle.emit_all("folder_changed", &event).ok();
                            last_event = std::time::Instant::now();
                        }
                    }
                    Ok(Err(e)) => {
                        log::error!("Watch error: {:?}", e);
                    }
                    Err(_) => continue, // タイムアウト、続行
                }
            }
        });

        self.watcher = Some(watcher);
        Ok(())
    }

    pub fn unwatch(&mut self) {
        self.watcher = None;
    }
}
```

### 9.4 React側イベントハンドリング

```typescript
// src/hooks/useFolderWatcher.ts

import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { useApp } from '../contexts/AppContext';
import { useTauriCommands } from './useTauriCommands';

export function useFolderWatcher() {
  const { state, dispatch } = useApp();
  const { scanImages } = useTauriCommands();

  useEffect(() => {
    if (!state.sourceFolder) return;

    const unlisten = listen('folder_changed', async (event) => {
      console.log('Folder changed:', event.payload);

      // 再スキャン
      const images = await scanImages(state.sourceFolder!);
      dispatch({ type: 'SET_IMAGES', payload: images });
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [state.sourceFolder, scanImages, dispatch]);
}
```

## 10. 依存関係

### 10.1 package.json (主要依存)

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@tauri-apps/api": "^2.0.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "vitest": "^1.2.0",
    "@testing-library/react": "^14.1.0",
    "@playwright/test": "^1.40.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0"
  }
}
```

### 10.2 Cargo.toml

```toml
[package]
name = "picsort"
version = "1.0.0"
edition = "2021"
rust-version = "1.70"

[dependencies]
tauri = { version = "2", features = ["dialog", "fs"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "1"
tracing = "0.1"
tracing-subscriber = { version = "0.3", features = ["env-filter"] }
tracing-appender = "0.2"
notify = "6"
natord = "1.0"
chrono = { version = "0.4", features = ["serde"] }

[dev-dependencies]
tempfile = "3"

[build-dependencies]
tauri-build = { version = "2", features = [] }
```

### 10.3 shadcn/ui セットアップ

使用するコンポーネント：
- Button
- Dialog (設定画面、ウィザード)
- Dropdown Menu (テーマ選択)
- Select (言語選択)
- Checkbox
- Tooltip
- Toast (ステータス通知)

## 11. ログ設定 (tracing)

### 11.1 初期化

```rust
// src-tauri/src/logger/mod.rs

use tracing_subscriber::{
    fmt,
    layer::SubscriberExt,
    util::SubscriberInitExt,
    EnvFilter,
};
use tracing_appender::rolling::{RollingFileAppender, Rotation};

pub fn init_logger(log_dir: &std::path::Path) -> Result<(), Box<dyn std::error::Error>> {
    let file_appender = RollingFileAppender::new(
        Rotation::DAILY,
        log_dir,
        "picsort.log",
    );

    let (non_blocking, _guard) = tracing_appender::non_blocking(file_appender);

    tracing_subscriber::registry()
        .with(EnvFilter::new("info"))
        .with(
            fmt::layer()
                .with_writer(non_blocking)
                .with_ansi(false)
                .with_target(true)
        )
        .init();

    Ok(())
}
```

### 11.2 使用例

```rust
use tracing::{info, warn, error, instrument};

#[instrument(skip(path))]
pub fn scan_images(path: String) -> Result<Vec<ImageInfo>, AppError> {
    info!(path = %path, "Scanning folder");

    // ...処理...

    warn!(count = images.len(), "Scan completed");
    Ok(images)
}
```
