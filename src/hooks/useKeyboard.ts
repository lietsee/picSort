import { useEffect, useCallback } from 'react'

interface UseKeyboardOptions {
  onMove: (key: string) => void
  onNavigate: (direction: 'prev' | 'next') => void
}

export function useKeyboard({ onMove, onNavigate }: UseKeyboardOptions) {
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

      // 数字キー（1-5）: 仕分け
      if (['1', '2', '3', '4', '5'].includes(key)) {
        onMove(key)
        return
      }

      // 矢印キー・スペース: 画像移動
      if (key === 'ArrowLeft') {
        onNavigate('prev')
        return
      }

      if (key === 'ArrowRight' || key === ' ') {
        onNavigate('next')
        return
      }
    },
    [onMove, onNavigate]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])
}
