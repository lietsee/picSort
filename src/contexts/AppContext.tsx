import { createContext, useContext, useReducer, ReactNode } from 'react'
import type { AppState, AppAction } from '../types'

// 自然順ソート比較関数（Rustのnatordと同等）
function naturalCompare(a: string, b: string): number {
  const re = /(\d+)|(\D+)/g
  const aParts = a.match(re) || []
  const bParts = b.match(re) || []

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aPart = aParts[i] || ''
    const bPart = bParts[i] || ''

    const aNum = parseInt(aPart, 10)
    const bNum = parseInt(bPart, 10)

    if (!isNaN(aNum) && !isNaN(bNum)) {
      if (aNum !== bNum) return aNum - bNum
    } else {
      const cmp = aPart.localeCompare(bPart)
      if (cmp !== 0) return cmp
    }
  }
  return 0
}

const initialState: AppState = {
  sourceFolder: null,
  images: [],
  currentIndex: 0,
  destinations: { '1': null, '2': null, '3': null, '4': null, '5': null, '6': null, '7': null, '8': null, '9': null, '0': null },
  lastUsedDestination: null,
  status: 'idle',
  statusMessage: '',
  // Grid mode state
  viewMode: 'single',
  selectedPaths: [],
  lastSelectedIndex: null,
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SOURCE_FOLDER':
      return {
        ...state,
        sourceFolder: action.payload,
        images: [],
        currentIndex: 0,
      }

    case 'SET_IMAGES':
      return {
        ...state,
        images: action.payload,
        currentIndex: 0,
      }

    case 'SET_IMAGES_PRESERVE_CURRENT': {
      const newImages = action.payload.images
      const currentPath = action.payload.currentPath
      // 現在表示中のファイルのインデックスを探す
      let newIndex = 0
      if (currentPath) {
        const foundIndex = newImages.findIndex(img => img.path === currentPath)
        if (foundIndex !== -1) {
          newIndex = foundIndex
        }
      }
      return {
        ...state,
        images: newImages,
        currentIndex: newIndex,
      }
    }

    case 'SET_CURRENT_INDEX':
      return {
        ...state,
        currentIndex: action.payload,
      }

    case 'REMOVE_CURRENT_IMAGE': {
      const newImages = state.images.filter((_, i) => i !== state.currentIndex)
      const newIndex = Math.min(state.currentIndex, newImages.length - 1)
      return {
        ...state,
        images: newImages,
        currentIndex: Math.max(0, newIndex),
      }
    }

    case 'REMOVE_IMAGE_BY_PATH': {
      const pathToRemove = action.payload
      const removeIndex = state.images.findIndex(img => img.path === pathToRemove)
      if (removeIndex === -1) {
        return state // 既に削除済み
      }
      const newImages = state.images.filter(img => img.path !== pathToRemove)
      // currentIndexを適切に調整
      let newIndex = state.currentIndex
      if (removeIndex < state.currentIndex) {
        newIndex = state.currentIndex - 1
      } else if (removeIndex === state.currentIndex) {
        newIndex = Math.min(state.currentIndex, newImages.length - 1)
      }
      return {
        ...state,
        images: newImages,
        currentIndex: Math.max(0, newIndex),
      }
    }

    case 'ADD_IMAGE_BY_PATH': {
      const newImage = action.payload
      // 既に存在する場合は何もしない
      if (state.images.some(img => img.path === newImage.path)) {
        return state
      }
      // 現在表示中のファイルのパスを記憶
      const currentImagePath = state.images[state.currentIndex]?.path
      // 適切な位置に挿入（自然順ソートを維持）
      const newImages = [...state.images, newImage].sort((a, b) =>
        naturalCompare(a.name, b.name)
      )
      // 現在表示中だったファイルの新しいインデックスを探す
      let newIndex = state.currentIndex
      if (currentImagePath) {
        const foundIndex = newImages.findIndex(img => img.path === currentImagePath)
        if (foundIndex !== -1) {
          newIndex = foundIndex
        }
      }
      return {
        ...state,
        images: newImages,
        currentIndex: newIndex,
      }
    }

    case 'SET_DESTINATION':
      return {
        ...state,
        destinations: {
          ...state.destinations,
          [action.payload.key]: action.payload.path,
        },
      }

    case 'SET_LAST_USED_DESTINATION':
      return {
        ...state,
        lastUsedDestination: action.payload,
      }

    case 'SET_STATUS':
      return {
        ...state,
        status: action.payload.status,
        statusMessage: action.payload.message || '',
      }

    // Grid mode actions
    case 'SET_VIEW_MODE':
      return {
        ...state,
        viewMode: action.payload,
      }

    case 'TOGGLE_VIEW_MODE':
      return {
        ...state,
        viewMode: state.viewMode === 'single' ? 'grid' : 'single',
        selectedPaths: [], // Clear selection when switching modes
        lastSelectedIndex: null,
      }

    case 'SELECT_SINGLE':
      return {
        ...state,
        selectedPaths: [action.payload],
        lastSelectedIndex: state.images.findIndex(img => img.path === action.payload),
      }

    case 'TOGGLE_SELECTION': {
      const path = action.payload
      const isSelected = state.selectedPaths.includes(path)
      return {
        ...state,
        selectedPaths: isSelected
          ? state.selectedPaths.filter(p => p !== path)
          : [...state.selectedPaths, path],
        lastSelectedIndex: state.images.findIndex(img => img.path === path),
      }
    }

    case 'SELECT_RANGE': {
      const { fromIndex, toIndex } = action.payload
      const start = Math.min(fromIndex, toIndex)
      const end = Math.max(fromIndex, toIndex)
      const rangePaths = state.images.slice(start, end + 1).map(img => img.path)
      return {
        ...state,
        selectedPaths: rangePaths,
        lastSelectedIndex: toIndex,
      }
    }

    case 'SELECT_ALL':
      return {
        ...state,
        selectedPaths: state.images.map(img => img.path),
        lastSelectedIndex: state.images.length - 1,
      }

    case 'CLEAR_SELECTION':
      return {
        ...state,
        selectedPaths: [],
        lastSelectedIndex: null,
      }

    case 'REMOVE_SELECTED_IMAGES': {
      const newImages = state.images.filter(img => !state.selectedPaths.includes(img.path))
      const newIndex = Math.min(state.currentIndex, newImages.length - 1)
      return {
        ...state,
        images: newImages,
        currentIndex: Math.max(0, newIndex),
        selectedPaths: [],
        lastSelectedIndex: null,
      }
    }

    case 'SELECT_MATCHING_FILES': {
      const matchingPaths = action.payload
      // 現在の選択に追加（重複除去）
      const newSelectedPaths = [...new Set([...state.selectedPaths, ...matchingPaths])]
      return {
        ...state,
        selectedPaths: newSelectedPaths,
        lastSelectedIndex: matchingPaths.length > 0
          ? state.images.findIndex(img => img.path === matchingPaths[matchingPaths.length - 1])
          : state.lastSelectedIndex,
      }
    }

    default:
      return state
  }
}

const AppContext = createContext<{
  state: AppState
  dispatch: React.Dispatch<AppAction>
} | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}
