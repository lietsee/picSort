import { useCallback, useEffect, useState } from 'react'
import type { MoveHistoryItem } from '../types'

const MAX_HISTORY = 50
const STORAGE_KEY = 'picsort_history'

interface HistoryState {
  history: MoveHistoryItem[]
  currentIndex: number
}

function loadFromStorage(): HistoryState {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as HistoryState
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
 *
 * 注意: historyとcurrentIndexを単一のstateで管理することで、
 * ループ内で複数回addToHistoryが呼ばれた場合も正しく動作する
 */
export function useHistory(): UseHistoryReturn {
  const [state, setState] = useState<HistoryState>(loadFromStorage)

  // 履歴変更時に sessionStorage に保存
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // 保存失敗は無視（容量超過など）
    }
  }, [state])

  const canUndo = state.currentIndex >= 0
  const canRedo = state.currentIndex < state.history.length - 1

  const addToHistory = useCallback((item: Omit<MoveHistoryItem, 'id' | 'timestamp'>) => {
    const newItem: MoveHistoryItem = {
      ...item,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }

    setState((prev) => {
      // 現在位置より後の履歴を削除（新しい操作があった場合）
      const newHistory = prev.history.slice(0, prev.currentIndex + 1)
      newHistory.push(newItem)

      // 最大履歴数を超えたら古いものを削除
      const trimmedHistory = newHistory.length > MAX_HISTORY
        ? newHistory.slice(-MAX_HISTORY)
        : newHistory

      return {
        history: trimmedHistory,
        currentIndex: Math.min(prev.currentIndex + 1, MAX_HISTORY - 1),
      }
    })
  }, [])

  const undo = useCallback((): MoveHistoryItem | null => {
    if (!canUndo) return null

    const item = state.history[state.currentIndex]
    setState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex - 1,
    }))
    return item
  }, [canUndo, state.currentIndex, state.history])

  const redo = useCallback((): MoveHistoryItem | null => {
    if (!canRedo) return null

    const nextIndex = state.currentIndex + 1
    const item = state.history[nextIndex]
    setState((prev) => ({
      ...prev,
      currentIndex: prev.currentIndex + 1,
    }))
    return item
  }, [canRedo, state.currentIndex, state.history])

  const clearHistory = useCallback(() => {
    setState({ history: [], currentIndex: -1 })
  }, [])

  // 現在のポインター以降の有効な履歴のみ返す
  const visibleHistory = state.history.slice(0, state.currentIndex + 1)

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
