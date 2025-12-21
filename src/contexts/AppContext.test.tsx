import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { AppProvider, useApp } from './AppContext'
import type { ImageInfo } from '../types'

describe('AppContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <AppProvider>{children}</AppProvider>
  )

  it('初期状態が正しい', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    expect(result.current.state.sourceFolder).toBeNull()
    expect(result.current.state.images).toEqual([])
    expect(result.current.state.currentIndex).toBe(0)
    expect(result.current.state.status).toBe('idle')
  })

  it('SET_SOURCE_FOLDER でフォルダが設定される', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => {
      result.current.dispatch({
        type: 'SET_SOURCE_FOLDER',
        payload: '/path/to/folder',
      })
    })

    expect(result.current.state.sourceFolder).toBe('/path/to/folder')
    expect(result.current.state.images).toEqual([])
    expect(result.current.state.currentIndex).toBe(0)
  })

  it('SET_IMAGES で画像リストが設定される', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    const images: ImageInfo[] = [
      { path: '/path/img1.jpg', name: 'img1.jpg' },
      { path: '/path/img2.jpg', name: 'img2.jpg' },
    ]

    act(() => {
      result.current.dispatch({ type: 'SET_IMAGES', payload: images })
    })

    expect(result.current.state.images).toEqual(images)
    expect(result.current.state.currentIndex).toBe(0)
  })

  it('SET_CURRENT_INDEX でインデックスが変更される', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    const images: ImageInfo[] = [
      { path: '/path/img1.jpg', name: 'img1.jpg' },
      { path: '/path/img2.jpg', name: 'img2.jpg' },
    ]

    act(() => {
      result.current.dispatch({ type: 'SET_IMAGES', payload: images })
    })

    act(() => {
      result.current.dispatch({ type: 'SET_CURRENT_INDEX', payload: 1 })
    })

    expect(result.current.state.currentIndex).toBe(1)
  })

  it('REMOVE_CURRENT_IMAGE で現在の画像が削除される', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    const images: ImageInfo[] = [
      { path: '/path/img1.jpg', name: 'img1.jpg' },
      { path: '/path/img2.jpg', name: 'img2.jpg' },
      { path: '/path/img3.jpg', name: 'img3.jpg' },
    ]

    act(() => {
      result.current.dispatch({ type: 'SET_IMAGES', payload: images })
      result.current.dispatch({ type: 'SET_CURRENT_INDEX', payload: 1 })
    })

    act(() => {
      result.current.dispatch({ type: 'REMOVE_CURRENT_IMAGE' })
    })

    expect(result.current.state.images.length).toBe(2)
    expect(result.current.state.images[0].name).toBe('img1.jpg')
    expect(result.current.state.images[1].name).toBe('img3.jpg')
  })

  it('SET_DESTINATION で分別先が設定される', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => {
      result.current.dispatch({
        type: 'SET_DESTINATION',
        payload: { key: '1', path: '/path/to/dest1' },
      })
    })

    expect(result.current.state.destinations['1']).toBe('/path/to/dest1')
  })

  it('SET_STATUS でステータスが変更される', () => {
    const { result } = renderHook(() => useApp(), { wrapper })

    act(() => {
      result.current.dispatch({
        type: 'SET_STATUS',
        payload: { status: 'loading', message: '読み込み中...' },
      })
    })

    expect(result.current.state.status).toBe('loading')
    expect(result.current.state.statusMessage).toBe('読み込み中...')
  })
})
