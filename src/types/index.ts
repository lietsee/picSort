export interface ImageInfo {
  path: string
  name: string
  size?: number
  modifiedAt?: number
}

export interface Settings {
  destinations: Record<string, string | null>
  theme: 'system' | 'light' | 'dark'
  language: 'ja' | 'en'
  showWelcome?: boolean
  window?: {
    width: number
    height: number
    x: number | null
    y: number | null
  }
}

export type Status = 'idle' | 'loading' | 'success' | 'error' | 'warning'

export interface AppState {
  sourceFolder: string | null
  images: ImageInfo[]
  currentIndex: number
  destinations: Record<string, string | null>
  lastUsedDestination: string | null
  status: Status
  statusMessage: string
}

// Undo/Redo履歴アイテム
export interface MoveHistoryItem {
  id: string
  sourcePath: string      // 元のファイルパス（フルパス）
  sourceFolder: string    // 元のフォルダパス（Undo時に使用）
  destPath: string        // 移動先ファイルパス（フルパス）
  timestamp: number
}

export type AppAction =
  | { type: 'SET_SOURCE_FOLDER'; payload: string }
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_CURRENT_INDEX'; payload: number }
  | { type: 'REMOVE_CURRENT_IMAGE' }
  | { type: 'SET_DESTINATION'; payload: { key: string; path: string | null } }
  | { type: 'SET_LAST_USED_DESTINATION'; payload: string }
  | { type: 'SET_STATUS'; payload: { status: Status; message?: string } }
