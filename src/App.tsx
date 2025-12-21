import { useCallback } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { AppProvider, useApp } from './contexts/AppContext'
import { useKeyboard } from './hooks/useKeyboard'
import { useTauriCommands } from './hooks/useTauriCommands'
import { DestButton } from './components/DestButton'
import { ImageViewer } from './components/ImageViewer'
import { StatusBar } from './components/StatusBar'

function AppContent() {
  const { state, dispatch } = useApp()
  const { scanImages, moveFile } = useTauriCommands()

  const currentImage =
    state.images.length > 0 ? state.images[state.currentIndex] : null

  const handleSelectFolder = useCallback(async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    })

    if (selected) {
      dispatch({ type: 'SET_SOURCE_FOLDER', payload: selected as string })
      dispatch({
        type: 'SET_STATUS',
        payload: { status: 'loading', message: 'スキャン中...' },
      })

      try {
        const images = await scanImages(selected as string)
        dispatch({ type: 'SET_IMAGES', payload: images })
        dispatch({
          type: 'SET_STATUS',
          payload: {
            status: 'idle',
            message: `${images.length}枚の画像を読み込みました`,
          },
        })
      } catch (error) {
        dispatch({
          type: 'SET_STATUS',
          payload: { status: 'error', message: `エラー: ${error}` },
        })
      }
    }
  }, [dispatch, scanImages])

  const handleSelectDestination = useCallback(
    async (key: string) => {
      const selected = await open({
        directory: true,
        multiple: false,
      })

      if (selected) {
        dispatch({
          type: 'SET_DESTINATION',
          payload: { key, path: selected as string },
        })
      }
    },
    [dispatch]
  )

  const handleMove = useCallback(
    async (key: string) => {
      const destination = state.destinations[key]
      if (!destination || !currentImage) return

      try {
        await moveFile(currentImage.path, destination)
        dispatch({ type: 'REMOVE_CURRENT_IMAGE' })
        dispatch({
          type: 'SET_STATUS',
          payload: { status: 'success', message: 'ファイルを移動しました' },
        })
      } catch (error) {
        dispatch({
          type: 'SET_STATUS',
          payload: { status: 'error', message: `移動エラー: ${error}` },
        })
      }
    },
    [state.destinations, currentImage, moveFile, dispatch]
  )

  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      if (state.images.length === 0) return

      let newIndex = state.currentIndex
      if (direction === 'prev') {
        newIndex = Math.max(0, state.currentIndex - 1)
      } else {
        newIndex = Math.min(state.images.length - 1, state.currentIndex + 1)
      }
      dispatch({ type: 'SET_CURRENT_INDEX', payload: newIndex })
    },
    [state.currentIndex, state.images.length, dispatch]
  )

  useKeyboard({ onMove: handleMove, onNavigate: handleNavigate })

  const displayIndex = state.images.length > 0 ? state.currentIndex + 1 : 0

  return (
    <div className="app">
      <header className="app-header">
        <h1>picSort</h1>
        <button onClick={handleSelectFolder} className="btn-select-folder">
          フォルダを選択
        </button>
      </header>

      <main className="app-main">
        <ImageViewer
          image={currentImage}
          loading={state.status === 'loading'}
        />

        {state.images.length > 0 && (
          <div className="nav-buttons">
            <button
              onClick={() => handleNavigate('prev')}
              disabled={state.currentIndex === 0}
            >
              前へ
            </button>
            <button
              onClick={() => handleNavigate('next')}
              disabled={state.currentIndex >= state.images.length - 1}
            >
              次へ
            </button>
          </div>
        )}
      </main>

      <aside className="app-sidebar">
        {(['1', '2', '3', '4', '5'] as const).map((key) => (
          <DestButton
            key={key}
            keyNum={key}
            path={state.destinations[key]}
            onSelect={() => handleSelectDestination(key)}
            disabled={!currentImage}
          />
        ))}
      </aside>

      <footer className="app-footer">
        <StatusBar
          current={displayIndex}
          total={state.images.length}
          message={state.statusMessage}
          status={state.status}
        />
      </footer>
    </div>
  )
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  )
}

export default App
