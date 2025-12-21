export interface ImageInfo {
  path: string
  name: string
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

export type Status = 'idle' | 'loading' | 'success' | 'error'

export interface AppState {
  sourceFolder: string | null
  images: ImageInfo[]
  currentIndex: number
  destinations: Record<string, string | null>
  status: Status
  statusMessage: string
}

export type AppAction =
  | { type: 'SET_SOURCE_FOLDER'; payload: string }
  | { type: 'SET_IMAGES'; payload: ImageInfo[] }
  | { type: 'SET_CURRENT_INDEX'; payload: number }
  | { type: 'REMOVE_CURRENT_IMAGE' }
  | { type: 'SET_DESTINATION'; payload: { key: string; path: string | null } }
  | { type: 'SET_STATUS'; payload: { status: Status; message?: string } }
