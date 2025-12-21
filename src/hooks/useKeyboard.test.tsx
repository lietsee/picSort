import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboard } from './useKeyboard'
import { AppProvider } from '../contexts/AppContext'

describe('useKeyboard', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider>{children}</AppProvider>
  )

  let mockOnMove: (key: string) => void
  let mockOnNavigate: (direction: 'prev' | 'next') => void
  let mockOnToggleFullscreen: () => void

  beforeEach(() => {
    mockOnMove = vi.fn()
    mockOnNavigate = vi.fn()
    mockOnToggleFullscreen = vi.fn()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('数字キー1-5でonMoveが呼ばれる', () => {
    renderHook(
      () => useKeyboard({ onMove: mockOnMove, onNavigate: mockOnNavigate }),
      { wrapper }
    )

    // キー1を押す
    const event1 = new KeyboardEvent('keydown', { key: '1' })
    window.dispatchEvent(event1)
    expect(mockOnMove).toHaveBeenCalledWith('1')

    // キー5を押す
    const event5 = new KeyboardEvent('keydown', { key: '5' })
    window.dispatchEvent(event5)
    expect(mockOnMove).toHaveBeenCalledWith('5')
  })

  it('矢印キーでonNavigateが呼ばれる', () => {
    renderHook(
      () => useKeyboard({ onMove: mockOnMove, onNavigate: mockOnNavigate }),
      { wrapper }
    )

    // ArrowRight
    const eventRight = new KeyboardEvent('keydown', { key: 'ArrowRight' })
    window.dispatchEvent(eventRight)
    expect(mockOnNavigate).toHaveBeenCalledWith('next')

    // ArrowLeft
    const eventLeft = new KeyboardEvent('keydown', { key: 'ArrowLeft' })
    window.dispatchEvent(eventLeft)
    expect(mockOnNavigate).toHaveBeenCalledWith('prev')
  })

  it('スペースキーでonNavigate(next)が呼ばれる', () => {
    renderHook(
      () => useKeyboard({ onMove: mockOnMove, onNavigate: mockOnNavigate }),
      { wrapper }
    )

    const event = new KeyboardEvent('keydown', { key: ' ' })
    window.dispatchEvent(event)
    expect(mockOnNavigate).toHaveBeenCalledWith('next')
  })

  it('A/Dキーでナビゲーションが呼ばれる', () => {
    renderHook(
      () => useKeyboard({ onMove: mockOnMove, onNavigate: mockOnNavigate }),
      { wrapper }
    )

    // Aキーで前へ
    const eventA = new KeyboardEvent('keydown', { key: 'a' })
    window.dispatchEvent(eventA)
    expect(mockOnNavigate).toHaveBeenCalledWith('prev')

    // Dキーで次へ
    const eventD = new KeyboardEvent('keydown', { key: 'd' })
    window.dispatchEvent(eventD)
    expect(mockOnNavigate).toHaveBeenCalledWith('next')
  })

  it('Backspaceで前の画像に移動する', () => {
    renderHook(
      () => useKeyboard({ onMove: mockOnMove, onNavigate: mockOnNavigate }),
      { wrapper }
    )

    const event = new KeyboardEvent('keydown', { key: 'Backspace' })
    window.dispatchEvent(event)
    expect(mockOnNavigate).toHaveBeenCalledWith('prev')
  })

  it('数字キーのリピートは無視される', () => {
    renderHook(
      () => useKeyboard({ onMove: mockOnMove, onNavigate: mockOnNavigate }),
      { wrapper }
    )

    // リピートイベント
    const event = new KeyboardEvent('keydown', { key: '1', repeat: true })
    window.dispatchEvent(event)
    expect(mockOnMove).not.toHaveBeenCalled()
  })

  it('無関係なキーでは何も呼ばれない', () => {
    renderHook(
      () => useKeyboard({ onMove: mockOnMove, onNavigate: mockOnNavigate }),
      { wrapper }
    )

    const event = new KeyboardEvent('keydown', { key: 'x' })
    window.dispatchEvent(event)
    expect(mockOnMove).not.toHaveBeenCalled()
    expect(mockOnNavigate).not.toHaveBeenCalled()
  })

  it('クリーンアップ時にイベントリスナーが削除される', () => {
    const { unmount } = renderHook(
      () => useKeyboard({ onMove: mockOnMove, onNavigate: mockOnNavigate }),
      { wrapper }
    )

    unmount()

    const event = new KeyboardEvent('keydown', { key: '1' })
    window.dispatchEvent(event)
    expect(mockOnMove).not.toHaveBeenCalled()
  })

  it('Fキーでフルスクリーン切替が呼ばれる', () => {
    renderHook(
      () => useKeyboard({
        onMove: mockOnMove,
        onNavigate: mockOnNavigate,
        onToggleFullscreen: mockOnToggleFullscreen
      }),
      { wrapper }
    )

    const event = new KeyboardEvent('keydown', { key: 'f' })
    window.dispatchEvent(event)
    expect(mockOnToggleFullscreen).toHaveBeenCalled()
  })

  it('onToggleFullscreenが未設定の場合Fキーで何も起きない', () => {
    renderHook(
      () => useKeyboard({ onMove: mockOnMove, onNavigate: mockOnNavigate }),
      { wrapper }
    )

    const event = new KeyboardEvent('keydown', { key: 'f' })
    window.dispatchEvent(event)
    // エラーが発生しないことを確認
    expect(mockOnMove).not.toHaveBeenCalled()
    expect(mockOnNavigate).not.toHaveBeenCalled()
  })
})
