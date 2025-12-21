import { useCallback, useEffect, useRef, useState } from 'react'
import { open } from '@tauri-apps/plugin-dialog'
import { appDataDir, join } from '@tauri-apps/api/path'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { listen, UnlistenFn } from '@tauri-apps/api/event'
import { AppProvider, useApp } from './contexts/AppContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider, useLanguage } from './contexts/LanguageContext'
import { useKeyboard } from './hooks/useKeyboard'
import { useTauriCommands } from './hooks/useTauriCommands'
import { useHistory } from './hooks/useHistory'
import { Header } from './components/Header'
import { DestButton } from './components/DestButton'
import { ImageViewer } from './components/ImageViewer'
import { StatusBar } from './components/StatusBar'
import { WelcomeModal } from './components/WelcomeModal'
import { SettingsModal } from './components/SettingsModal'
import type { Settings } from './types'

// ファイルシステム変更イベントの型
interface FsChangeEvent {
  type: 'Created' | 'Modified' | 'Removed'
  path: string
}

function AppContent() {
  const { state, dispatch } = useApp()
  const { t } = useLanguage()
  const { scanImages, moveFile, undoMove, loadSettings, saveSettings, startWatching } = useTauriCommands()
  const { addToHistory, undo, redo, canUndo, canRedo } = useHistory()
  const configPathRef = useRef<string | null>(null)
  const isInitializedRef = useRef(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const settingsRef = useRef<Settings | null>(null)
  const unlistenRef = useRef<UnlistenFn | null>(null)

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
        payload: { status: 'loading', message: t('status.scanning') },
      })

      try {
        const images = await scanImages(selected as string)
        dispatch({ type: 'SET_IMAGES', payload: images })

        // ファイルシステム監視を開始
        await startWatching(selected as string)

        dispatch({
          type: 'SET_STATUS',
          payload: {
            status: 'idle',
            message: t('status.imagesLoaded', { count: images.length }),
          },
        })
      } catch (error) {
        dispatch({
          type: 'SET_STATUS',
          payload: { status: 'error', message: t('status.error', { error: String(error) }) },
        })
      }
    }
  }, [dispatch, scanImages, startWatching, t])

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
      if (!currentImage || !state.sourceFolder) return

      const destination = state.destinations[key]
      if (!destination) {
        dispatch({
          type: 'SET_STATUS',
          payload: {
            status: 'error',
            message: t('status.destNotSet', { key }),
          },
        })
        return
      }

      const sourcePath = currentImage.path
      const sourceFolder = state.sourceFolder

      try {
        const destPath = await moveFile(sourcePath, destination)
        // 履歴に追加
        addToHistory({ sourcePath, sourceFolder, destPath })
        dispatch({ type: 'REMOVE_CURRENT_IMAGE' })
        dispatch({ type: 'SET_LAST_USED_DESTINATION', payload: key })
        dispatch({
          type: 'SET_STATUS',
          payload: { status: 'success', message: t('status.fileMoved') },
        })
      } catch (error) {
        dispatch({
          type: 'SET_STATUS',
          payload: { status: 'error', message: t('status.moveError', { error: String(error) }) },
        })
      }
    },
    [state.destinations, state.sourceFolder, currentImage, moveFile, dispatch, t, addToHistory]
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
              payload: { status: 'loading', message: t('status.scanning') },
            })

            try {
              const images = await scanImages(folderPath)
              dispatch({ type: 'SET_IMAGES', payload: images })

              // ファイルシステム監視を開始
              await startWatching(folderPath)

              dispatch({
                type: 'SET_STATUS',
                payload: {
                  status: 'idle',
                  message: t('status.imagesLoaded', { count: images.length }),
                },
              })
            } catch (error) {
              dispatch({
                type: 'SET_STATUS',
                payload: { status: 'error', message: t('status.error', { error: String(error) }) },
              })
            }
          }
        }
      }
    },
    [dispatch, scanImages, startWatching, t]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleCloseWelcome = useCallback(() => {
    setShowWelcome(false)
  }, [])

  const handleOpenSettings = useCallback(() => {
    setShowSettings(true)
  }, [])

  const handleCloseSettings = useCallback(() => {
    setShowSettings(false)
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

  // ファイルシステム変更イベントをリッスン
  useEffect(() => {
    const setupListener = async () => {
      // 既存のリスナーを解除
      if (unlistenRef.current) {
        unlistenRef.current()
      }

      unlistenRef.current = await listen<FsChangeEvent>('fs-change', async (event) => {
        const { type, path } = event.payload
        const fileName = path.split('/').pop() || ''

        if (type === 'Created') {
          // ファイルが追加された場合、画像リストを再スキャン
          if (state.sourceFolder) {
            try {
              const images = await scanImages(state.sourceFolder)
              dispatch({ type: 'SET_IMAGES', payload: images })
              dispatch({
                type: 'SET_STATUS',
                payload: {
                  status: 'idle',
                  message: t('status.fileAdded', { name: fileName }),
                },
              })
            } catch {
              // 再スキャン失敗は無視
            }
          }
        } else if (type === 'Removed') {
          // ファイルが削除された場合、画像リストから削除
          const removedIndex = state.images.findIndex((img) => img.path === path)
          if (removedIndex !== -1) {
            dispatch({ type: 'SET_IMAGES', payload: state.images.filter((img) => img.path !== path) })
            dispatch({
              type: 'SET_STATUS',
              payload: {
                status: 'idle',
                message: t('status.fileRemoved', { name: fileName }),
              },
            })
          }
        }
      })
    }

    setupListener()

    return () => {
      if (unlistenRef.current) {
        unlistenRef.current()
      }
    }
  }, [state.sourceFolder, state.images, scanImages, dispatch, t])

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

  const handleUndo = useCallback(async () => {
    if (!canUndo) return

    const item = undo()
    if (!item) return

    try {
      await undoMove(item.destPath, item.sourceFolder)
      // ソースフォルダを再スキャン
      if (state.sourceFolder) {
        const images = await scanImages(state.sourceFolder)
        dispatch({ type: 'SET_IMAGES', payload: images })
      }
      dispatch({
        type: 'SET_STATUS',
        payload: { status: 'success', message: t('status.undone') },
      })
    } catch (error) {
      dispatch({
        type: 'SET_STATUS',
        payload: { status: 'error', message: t('status.undoError', { error: String(error) }) },
      })
    }
  }, [canUndo, undo, undoMove, state.sourceFolder, scanImages, dispatch, t])

  const handleRedo = useCallback(async () => {
    if (!canRedo) return

    const item = redo()
    if (!item) return

    // Redo: ファイルを再度移動（sourcePath はファイルのフルパス）
    try {
      // destPath からフォルダ部分を抽出（クロスプラットフォーム対応）
      const destFolder = item.destPath.replace(/[\\/][^\\/]+$/, '')
      await moveFile(item.sourcePath, destFolder)
      // ソースフォルダを再スキャン
      if (state.sourceFolder) {
        const images = await scanImages(state.sourceFolder)
        dispatch({ type: 'SET_IMAGES', payload: images })
      }
      dispatch({
        type: 'SET_STATUS',
        payload: { status: 'success', message: t('status.redone') },
      })
    } catch (error) {
      dispatch({
        type: 'SET_STATUS',
        payload: { status: 'error', message: t('status.redoError', { error: String(error) }) },
      })
    }
  }, [canRedo, redo, moveFile, state.sourceFolder, scanImages, dispatch, t])

  useKeyboard({
    onMove: handleMove,
    onNavigate: handleNavigate,
    onToggleFullscreen: handleToggleFullscreen,
    onOpenSettings: handleOpenSettings,
    onUndo: handleUndo,
    onRedo: handleRedo,
  })

  const displayIndex = state.images.length > 0 ? state.currentIndex + 1 : 0

  return (
    <div className="app" onDrop={handleDrop} onDragOver={handleDragOver}>
      <WelcomeModal
        isOpen={showWelcome}
        onClose={handleCloseWelcome}
        onDontShowAgain={handleDontShowWelcomeAgain}
      />
      <SettingsModal
        isOpen={showSettings}
        onClose={handleCloseSettings}
        destinations={state.destinations}
      />
      <Header
        title="picSort"
        sourcePath={state.sourceFolder}
        onSelectFolder={handleSelectFolder}
        onOpenSettings={handleOpenSettings}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />

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
              {t('navigation.prev')}
            </button>
            <button
              onClick={() => handleNavigate('next')}
              disabled={state.currentIndex >= state.images.length - 1}
            >
              {t('navigation.next')}
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
            lastUsed={state.lastUsedDestination === key}
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
    <ThemeProvider>
      <LanguageProvider>
        <AppProvider>
          <AppContent />
        </AppProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
