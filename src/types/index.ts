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
  sourceFolder?: string | null
  window?: {
    width: number
    height: number
    x: number | null
    y: number | null
  }
  wordLists?: Record<string, WordList | null>
}

export type Status = 'idle' | 'loading' | 'success' | 'error' | 'warning'

export type ViewMode = 'single' | 'grid'

export interface AppState {
  sourceFolder: string | null
  images: ImageInfo[]
  currentIndex: number
  destinations: Record<string, string | null>
  lastUsedDestination: string | null
  status: Status
  statusMessage: string
  // Grid mode state
  viewMode: ViewMode
  selectedPaths: string[]
  lastSelectedIndex: number | null
}

// Undo/Redo履歴アイテム
export interface MoveHistoryItem {
  id: string
  sourcePath: string      // 元のファイルパス（フルパス）
  sourceFolder: string    // 元のフォルダパス（Undo時に使用）
  destPath: string        // 移動先ファイルパス（フルパス）
  timestamp: number
}

// Thumbnail types
export interface ThumbnailResult {
  originalPath: string
  thumbnailPath: string
}

export interface ThumbnailBatchResult {
  results: ThumbnailResult[]
  errors: ThumbnailError[]
}

export interface ThumbnailError {
  path: string
  error: string
}

// マッチング用単語リスト
export interface WordListEntry {
  type: 'work' | 'character'
  canonical: string
  aliases: string[]
  canonicalNormalized: string
  aliasesNormalized: string[]
  searchKeysNormalized: string[]
}

export interface WordList {
  fileName: string
  entries: WordListEntry[]
}

export type AppAction =
  | { type: 'SET_SOURCE_FOLDER'; payload: string }
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_IMAGES_PRESERVE_CURRENT'; payload: { images: ImageInfo[]; currentPath: string | null } }
  | { type: 'SET_CURRENT_INDEX'; payload: number }
  | { type: 'REMOVE_CURRENT_IMAGE' }
  | { type: 'REMOVE_IMAGE_BY_PATH'; payload: string }
  | { type: 'ADD_IMAGE_BY_PATH'; payload: ImageInfo }
  | { type: 'SET_DESTINATION'; payload: { key: string; path: string | null } }
  | { type: 'SET_LAST_USED_DESTINATION'; payload: string }
  | { type: 'SET_STATUS'; payload: { status: Status; message?: string } }
  // Grid mode actions
  | { type: 'SET_VIEW_MODE'; payload: ViewMode }
  | { type: 'TOGGLE_VIEW_MODE' }
  | { type: 'SELECT_SINGLE'; payload: string }
  | { type: 'TOGGLE_SELECTION'; payload: string }
  | { type: 'SELECT_RANGE'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'SELECT_ALL' }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'REMOVE_SELECTED_IMAGES' }
  | { type: 'SELECT_MATCHING_FILES'; payload: string[] }
