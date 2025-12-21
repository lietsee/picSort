import { useCallback, useEffect, useState } from 'react'
import type { MoveHistoryItem } from '../types'

const MAX_HISTORY = 50
const STORAGE_KEY = 'picsort_history'

interface StoredHistory {
  history: MoveHistoryItem[]
  currentIndex: number
}

function loadFromStorage(): StoredHistory {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as StoredHistory
      return {
        history: parsed.history || [],
        currentIndex: parsed.currentIndex ?? -1,
      }
    }
  } catch {
    // パース失敗は無視
  }
  return { history: [], currentIndex: -1 }
}

interface UseHistoryReturn {
  history: MoveHistoryItem[]
  canUndo: boolean
  canRedo: boolean
  addToHistory: (item: Omit<MoveHistoryItem, 'id' | 'timestamp'>) => void
  undo: () => MoveHistoryItem | null
  redo: () => MoveHistoryItem | null
  clearHistory: () => void
}

/**
 * Undo/Redo履歴を管理するフック
 * sessionStorage に履歴を永続化
 */
export function useHistory(): UseHistoryReturn {
  const [history, setHistory] = useState<MoveHistoryItem[]>(() => loadFromStorage().history)
  const [currentIndex, setCurrentIndex] = useState(() => loadFromStorage().currentIndex)

  // 履歴変更時に sessionStorage に保存
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ history, currentIndex }))
    } catch {
      // 保存失敗は無視（容量超過など）
    }
  }, [history, currentIndex])

  const canUndo = currentIndex >= 0
  const canRedo = currentIndex < history.length - 1

  const addToHistory = useCallback((item: Omit<MoveHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: MoveHistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }

    setHistory((prev) => {
      // 現在位置より後の履歴を削除（新しい操作があった場合）
      const newHistory = prev.slice(0, currentIndex + 1)
      newHistory.push(newItem)

      // 最大履歴数を超えたら古いものを削除
      if (newHistory.length > MAX_HISTORY) {
        return newHistory.slice(-MAX_HISTORY)
      }
      return newHistory
    })

    setCurrentIndex((prev) => Math.min(prev + 1, MAX_HISTORY - 1))
  }, [currentIndex])

  const undo = useCallback((): MoveHistoryItem | null => {
    if (!canUndo) return null

    const item = history[currentIndex]
    setCurrentIndex((prev) => prev - 1)
    return item
  }, [canUndo, currentIndex, history])

  const redo = useCallback((): MoveHistoryItem | null => {
    if (!canRedo) return null

    const nextIndex = currentIndex + 1
    const item = history[nextIndex]
    setCurrentIndex(nextIndex)
    return item
  }, [canRedo, currentIndex, history])

  const clearHistory = useCallback(() => {
    setHistory([])
    setCurrentIndex(-1)
  }, [])

  // 現在のポインター以降の有効な履歴のみ返す
  const visibleHistory = history.slice(0, currentIndex + 1)

  return {
    history: visibleHistory,
    canUndo,
    canRedo,
    addToHistory,
    undo,
    redo,
    clearHistory,
  }
}
