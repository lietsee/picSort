import { invoke } from '@tauri-apps/api/core'
import type { ImageInfo, Settings } from '../types'

export function useTauriCommands() {
  const scanImages = async (path: string): Promise<ImageInfo[]> => {
    return await invoke<ImageInfo[]>('scan_images', { path })
  }

  const moveFile = async (src: string, destFolder: string): Promise<string> => {
    return await invoke<string>('move_file', { src, destFolder })
  }

  const loadSettings = async (configPath: string): Promise<Settings> => {
    return await invoke<Settings>('load_settings', { configPath })
  }

  const saveSettings = async (
    settings: Settings,
    configPath: string
  ): Promise<void> => {
    return await invoke<void>('save_settings', { settings, configPath })
  }

  return {
    scanImages,
    moveFile,
    loadSettings,
    saveSettings,
  }
}
