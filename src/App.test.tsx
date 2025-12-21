import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'
import App from './App'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
  convertFileSrc: vi.fn((path: string) => `asset://localhost${path}`),
}))

vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}))

const mockInvoke = vi.mocked(invoke)

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('アプリタイトルが表示される', () => {
    render(<App />)
    expect(screen.getByText('picSort')).toBeInTheDocument()
  })

  it('5つの振り分けボタンが表示される', () => {
    render(<App />)

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('フォルダ選択ボタンが表示される', () => {
    render(<App />)
    expect(screen.getByText('フォルダを選択')).toBeInTheDocument()
  })

  it('初期状態でステータスバーに 0 / 0 が表示される', () => {
    render(<App />)
    expect(screen.getByText('0 / 0')).toBeInTheDocument()
  })

  it('初期状態で「画像がありません」が表示される', () => {
    render(<App />)
    expect(screen.getByText('画像がありません')).toBeInTheDocument()
  })

  it('画像読み込み後にナビゲーションボタンが表示される', async () => {
    const mockImages = [
      { path: '/path/img1.jpg', name: 'img1.jpg' },
      { path: '/path/img2.jpg', name: 'img2.jpg' },
    ]
    mockInvoke.mockResolvedValueOnce(mockImages)

    const { open } = await import('@tauri-apps/plugin-dialog')
    vi.mocked(open).mockResolvedValueOnce('/path/to/folder')

    render(<App />)

    fireEvent.click(screen.getByText('フォルダを選択'))

    await waitFor(() => {
      expect(screen.getByText('1 / 2')).toBeInTheDocument()
    })

    expect(screen.getByText('前へ')).toBeInTheDocument()
    expect(screen.getByText('次へ')).toBeInTheDocument()
  })
})
