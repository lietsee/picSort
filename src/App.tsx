import { useCallback, useEffect, useRef, useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { appDataDir, join } from '@tauri-apps/api/path'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { AppProvider, useApp } from './contexts/AppContext'
import { useKeyboard } from './hooks/useKeyboard'
import { useTauriCommands } from './hooks/useTauriCommands'
import { DestButton } from './components/DestButton'
import { ImageViewer } from './components/ImageViewer'
import { StatusBar } from './components/StatusBar'
import { WelcomeModal } from './components/WelcomeModal'
import type { Settings } from './types'

function AppContent() {
  const { state, dispatch } = useApp()
  const { scanImages, moveFile, loadSettings, saveSettings } = useTauriCommands()
  const configPathRef = useRef<string | null>(null)
  const isInitializedRef = useRef(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const settingsRef = useRef<Settings | null>(null)

  // 設定ファイルパスを取得して設定を読み込む
  useEffect(() => {
    const initSettings = async () => {
      if (isInitializedRef.current) return
      isInitializedRef.current = true

      try {
        const dataDir = await appDataDir()
        const configPath = await join(dataDir, 'config.json')
        configPathRef.current = configPath

        const settings = await loadSettings(configPath)
        settingsRef.current = settings

        // 分別先フォルダを復元
        Object.entries(settings.destinations).forEach(([key, path]) => {
          if (path) {
            dispatch({
              type: 'SET_DESTINATION',
              payload: { key, path },
            })
          }
        })

        // 初回起動時はウェルカムモーダルを表示
        if (settings.showWelcome !== false) {
          setShowWelcome(true)
        }
      } catch {
        // 設定ファイルが存在しない場合は初回起動
        setShowWelcome(true)
      }
    }

    initSettings()
  }, [dispatch, loadSettings])

  // 分別先が変更されたら設定を保存
  useEffect(() => {
    const saveCurrentSettings = async () => {
      if (!configPathRef.current || !isInitializedRef.current) return

      const settings = {
        destinations: state.destinations,
        theme: 'system' as const,
        language: 'ja' as const,
        window: { width: 1280, height: 800, x: null, y: null },
      }

      try {
        await saveSettings(settings, configPathRef.current)
      } catch {
        // 保存失敗は無視
      }
    }

    // 初期化後のみ保存
    if (isInitializedRef.current) {
      saveCurrentSettings()
    }
  }, [state.destinations, saveSettings])

  const currentImage =
    state.images.length > 0 ? state.images[state.currentIndex] : null
  const nextImage =
    state.currentIndex < state.images.length - 1
      ? state.images[state.currentIndex + 1]
      : null

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
      if (!currentImage) return

      const destination = state.destinations[key]
      if (!destination) {
        dispatch({
          type: 'SET_STATUS',
          payload: {
            status: 'error',
            message: `分別先${key}が設定されていません`,
          },
        })
        return
      }

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

  const handleToggleFullscreen = useCallback(async () => {
    try {
      const window = getCurrentWindow()
      const isFullscreen = await window.isFullscreen()
      await window.setFullscreen(!isFullscreen)
    } catch {
      // フルスクリーン切替失敗は無視
    }
  }, [])

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const items = e.dataTransfer.items
      if (items.length > 0) {
        const item = items[0]
        // webkitGetAsEntry for directory detection
        const entry = item.webkitGetAsEntry?.()
        if (entry?.isDirectory) {
          // Tauriコンテキストでは、dataTransfer.filesからパスを取得
          const file = e.dataTransfer.files[0]
          if (file && 'path' in file) {
            const folderPath = (file as unknown as { path: string }).path
            dispatch({ type: 'SET_SOURCE_FOLDER', payload: folderPath })
            dispatch({
              type: 'SET_STATUS',
              payload: { status: 'loading', message: 'スキャン中...' },
            })

            try {
              const images = await scanImages(folderPath)
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
        }
      }
    },
    [dispatch, scanImages]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleCloseWelcome = useCallback(() => {
    setShowWelcome(false)
  }, [])

  const handleDontShowWelcomeAgain = useCallback(async () => {
    if (!configPathRef.current) return

    const settings: Settings = {
      destinations: state.destinations,
      theme: 'system',
      language: 'ja',
      showWelcome: false,
    }

    try {
      await saveSettings(settings, configPathRef.current)
    } catch {
      // 保存失敗は無視
    }
  }, [state.destinations, saveSettings])

  // ウィンドウ状態保存（終了時）
  useEffect(() => {
    const saveWindowState = async () => {
      if (!configPathRef.current) return

      try {
        const window = getCurrentWindow()
        const size = await window.innerSize()
        const position = await window.outerPosition()

        const settings: Settings = {
          destinations: state.destinations,
          theme: 'system',
          language: 'ja',
          showWelcome: settingsRef.current?.showWelcome ?? true,
          window: {
            width: size.width,
            height: size.height,
            x: position.x,
            y: position.y,
          },
        }

        await saveSettings(settings, configPathRef.current)
      } catch {
        // 保存失敗は無視
      }
    }

    // ウィンドウ終了時に保存
    const handleBeforeUnload = () => {
      saveWindowState()
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [state.destinations, saveSettings])

  useKeyboard({ onMove: handleMove, onNavigate: handleNavigate, onToggleFullscreen: handleToggleFullscreen })

  const displayIndex = state.images.length > 0 ? state.currentIndex + 1 : 0

  return (
    <div className="app" onDrop={handleDrop} onDragOver={handleDragOver}>
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        onDontShowAgain={handleDontShowWelcomeAgain}
      />
      <header className="app-header">
        <h1>picSort</h1>
        <button onClick={handleSelectFolder} className="btn-select-folder">
          フォルダを選択
        </button>
      </header>

      <main className="app-main">
        <ImageViewer
          image={currentImage}
          nextImage={nextImage}
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
            onClear={() => dispatch({ type: 'SET_DESTINATION', payload: { key, path: null } })}
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
