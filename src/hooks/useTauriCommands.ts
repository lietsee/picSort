import { invoke } from '@tauri-apps/api/core'
import type { ImageInfo, Settings, ThumbnailResult, ThumbnailBatchResult } from '../types'

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

  const generateThumbnail = async (path: string, size: number): Promise<ThumbnailResult> => {
    return await invoke<ThumbnailResult>('generate_thumbnail', { path, size })
  }

  const generateThumbnailsBatch = async (
    paths: string[],
    size: number
  ): Promise<ThumbnailBatchResult> => {
    return await invoke<ThumbnailBatchResult>('generate_thumbnails_batch', { paths, size })
  }

  const moveFilesBatch = async (
    sources: string[],
    destFolder: string
  ): Promise<string[]> => {
    return await invoke<string[]>('move_files_batch', { sources, destFolder })
  }

  const cleanupThumbnailCache = async (
    maxAgeDays: number,
    maxSizeMb: number
  ): Promise<number> => {
    return await invoke<number>('cleanup_thumbnail_cache', { maxAgeDays, maxSizeMb })
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
    generateThumbnail,
    generateThumbnailsBatch,
    moveFilesBatch,
    cleanupThumbnailCache,
  }
}
