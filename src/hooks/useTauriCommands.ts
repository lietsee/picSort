import { invoke } from '@tauri-apps/api/core'
import type { ImageInfo, Settings } from '../types'

export function useTauriCommands() {
  const scanImages = async (path: string): Promise<ImageInfo[]> => {
    return await invoke<ImageInfo[]>('scan_images', { path })
  }

  const moveFile = async (src: string, destFolder: string): Promise<string> => {
    return await invoke<string>('move_file', { src, destFolder })
  }

  const undoMove = async (currentPath: string, originalFolder: string): Promise<string> => {
    return await invoke<string>('undo_move', { currentPath, originalFolder })
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

  const startWatching = async (path: string): Promise<void> => {
    return await invoke<void>('start_watching', { path })
  }

  const stopWatching = async (): Promise<void> => {
    return await invoke<void>('stop_watching')
  }

  const getLogPath = async (): Promise<string> => {
    return await invoke<string>('get_log_path')
  }

  return {
    scanImages,
    moveFile,
    undoMove,
    loadSettings,
    saveSettings,
    startWatching,
    stopWatching,
    getLogPath,
  }
}
