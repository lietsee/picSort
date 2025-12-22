import { useEffect, useCallback } from 'react'

interface UseKeyboardOptions {
  onMove: (key: string) => void
  onNavigate: (direction: 'prev' | 'next') => void
  onToggleFullscreen?: () => void
  onOpenSettings?: () => void
  onUndo?: () => void
  onRedo?: () => void
  isVideo?: boolean // 動画再生中は矢印キーのナビゲーションをスキップ
}

export function useKeyboard({
  onMove,
  onNavigate,
  onToggleFullscreen,
  onOpenSettings,
  onUndo,
  onRedo,
  isVideo = false,
}: UseKeyboardOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 入力フィールドにフォーカスがある場合は無視
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const key = event.key

      // Cmd+, / Ctrl+,: 設定を開く
      if (key === ',' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        onOpenSettings?.()
        return
      }

      // Cmd+Z / Ctrl+Z: Undo
      if (key === 'z' && (event.metaKey || event.ctrlKey) && !event.shiftKey) {
        event.preventDefault()
        onUndo?.()
        return
      }

      // Cmd+Shift+Z / Ctrl+Shift+Z: Redo
      if (key === 'z' && (event.metaKey || event.ctrlKey) && event.shiftKey) {
        event.preventDefault()
        onRedo?.()
        return
      }

      // Ctrl+Y: Redo (Windows)
      if (key === 'y' && event.ctrlKey) {
        event.preventDefault()
        onRedo?.()
        return
      }

      // 数字キー（1-5）: 仕分け（リピート無効）
      if (['1', '2', '3', '4', '5'].includes(key)) {
        if (event.repeat) return // キーリピート無効
        onMove(key)
        return
      }

      // 矢印キー・A/D・スペース・Backspace: 画像移動
      // 動画再生中は矢印キーはMediaViewerが処理するのでスキップ
      if (key === 'ArrowLeft' || key === 'a' || key === 'A' || key === 'Backspace') {
        if (isVideo && key === 'ArrowLeft') return // 動画時は←をスキップ
        onNavigate('prev')
        return
      }

      if (key === 'ArrowRight' || key === 'd' || key === 'D' || key === ' ') {
        if (isVideo && key === 'ArrowRight') return // 動画時は→をスキップ
        onNavigate('next')
        return
      }

      // 動画時の↑↓はMediaViewerが処理するのでスキップ
      if (isVideo && (key === 'ArrowUp' || key === 'ArrowDown')) {
        return
      }

      // F キー: フルスクリーン切替
      if ((key === 'f' || key === 'F') && onToggleFullscreen) {
        onToggleFullscreen()
        return
      }

      // Escape: フルスクリーン解除（ブラウザ標準で処理されるため不要だが明示的に対応）
      if (key === 'Escape' && onToggleFullscreen) {
        // Escapeはフルスクリーン解除のみ（ブラウザが処理）
        return
      }
    },
    [onMove, onNavigate, onToggleFullscreen, onOpenSettings, onUndo, onRedo, isVideo]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
