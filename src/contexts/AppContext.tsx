import { createContext, useContext, useReducer, ReactNode } from 'react'
import type { AppState, AppAction } from '../types'

const initialState: AppState = {
  sourceFolder: null,
  images: [],
  currentIndex: 0,
  destinations: { '1': null, '2': null, '3': null, '4': null, '5': null },
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

    case 'SET_DESTINATION':
      return {
        ...state,
        destinations: {
          ...state.destinations,
          [action.payload.key]: action.payload.path,
        },
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
