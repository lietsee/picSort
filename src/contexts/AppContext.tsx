import { createContext, useContext, useReducer, ReactNode } from 'react'
import type { AppState, AppAction } from '../types'

const initialState: AppState = {
  sourceFolder: null,
  images: [],
  currentIndex: 0,
  destinations: { '1': null, '2': null, '3': null, '4': null, '5': null, '6': null, '7': null, '8': null, '9': null, '0': null },
  lastUsedDestination: null,
  status: 'idle',
  statusMessage: '',
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
      // 適切な位置に挿入（ソート順を維持）
      const newImages = [...state.images, newImage].sort((a, b) =>
        a.name.localeCompare(b.name)
      )
      // currentIndexを調整（挿入位置が現在位置以下なら+1）
      const insertedIndex = newImages.findIndex(img => img.path === newImage.path)
      const newIndex = insertedIndex <= state.currentIndex
        ? state.currentIndex + 1
        : state.currentIndex
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
