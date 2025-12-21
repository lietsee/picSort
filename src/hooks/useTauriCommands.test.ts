import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { invoke } from '@tauri-apps/api/core'
import { useTauriCommands } from './useTauriCommands'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

const mockInvoke = vi.mocked(invoke)

describe('useTauriCommands', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('scanImages', () => {
    it('scan_imagesコマンドを正しく呼び出す', async () => {
      const mockImages = [
        { path: '/path/img1.jpg', name: 'img1.jpg' },
        { path: '/path/img2.png', name: 'img2.png' },
      ]
      mockInvoke.mockResolvedValueOnce(mockImages)

      const { result } = renderHook(() => useTauriCommands())
      const images = await result.current.scanImages('/path/to/folder')

      expect(mockInvoke).toHaveBeenCalledWith('scan_images', {
        path: '/path/to/folder',
      })
      expect(images).toEqual(mockImages)
    })

    it('空の配列を返す場合も正しく動作する', async () => {
      mockInvoke.mockResolvedValueOnce([])

      const { result } = renderHook(() => useTauriCommands())
      const images = await result.current.scanImages('/empty/folder')

      expect(images).toEqual([])
    })
  })

  describe('moveFile', () => {
    it('move_fileコマンドを正しく呼び出す', async () => {
      mockInvoke.mockResolvedValueOnce('/dest/folder/image.jpg')

      const { result } = renderHook(() => useTauriCommands())
      const newPath = await result.current.moveFile(
        '/src/image.jpg',
        '/dest/folder'
      )

      expect(mockInvoke).toHaveBeenCalledWith('move_file', {
        src: '/src/image.jpg',
        destFolder: '/dest/folder',
      })
      expect(newPath).toBe('/dest/folder/image.jpg')
    })

    it('重複時に連番付きパスを返す', async () => {
      mockInvoke.mockResolvedValueOnce('/dest/folder/image_1.jpg')

      const { result } = renderHook(() => useTauriCommands())
      const newPath = await result.current.moveFile(
        '/src/image.jpg',
        '/dest/folder'
      )

      expect(newPath).toBe('/dest/folder/image_1.jpg')
    })
  })

  describe('loadSettings', () => {
    it('load_settingsコマンドを正しく呼び出す', async () => {
      const mockSettings = {
        destinations: { '1': '/path/dest1', '2': null },
        theme: 'system',
        language: 'ja',
        window: { width: 1280, height: 800, x: null, y: null },
      }
      mockInvoke.mockResolvedValueOnce(mockSettings)

      const { result } = renderHook(() => useTauriCommands())
      const settings = await result.current.loadSettings('/config/path')

      expect(mockInvoke).toHaveBeenCalledWith('load_settings', {
        configPath: '/config/path',
      })
      expect(settings).toEqual(mockSettings)
    })
  })

  describe('saveSettings', () => {
    it('save_settingsコマンドを正しく呼び出す', async () => {
      const settings = {
        destinations: { '1': '/path/dest1' },
        theme: 'dark' as const,
        language: 'en' as const,
        window: { width: 1920, height: 1080, x: 100, y: 50 },
      }
      mockInvoke.mockResolvedValueOnce(undefined)

      const { result } = renderHook(() => useTauriCommands())
      await result.current.saveSettings(settings, '/config/path')

      expect(mockInvoke).toHaveBeenCalledWith('save_settings', {
        settings,
        configPath: '/config/path',
      })
    })
  })
})
