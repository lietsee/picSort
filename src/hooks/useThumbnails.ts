import { useRef, useCallback } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import { useTauriCommands } from './useTauriCommands'

interface ThumbnailCacheEntry {
  thumbnailUrl: string
  lastAccessed: number
}

const MAX_CACHE_SIZE = 200

export function useThumbnails(thumbnailSize: number = 200) {
  const { generateThumbnail } = useTauriCommands()
  const cacheRef = useRef<Map<string, ThumbnailCacheEntry>>(new Map())
  const pendingRef = useRef<Map<string, Promise<string>>>(new Map())

  // LRUキャッシュから古いエントリを削除
  const evictOldEntries = useCallback(() => {
    const cache = cacheRef.current
    if (cache.size <= MAX_CACHE_SIZE) return

    // 最終アクセス時間でソートして古いものを削除
    const entries = Array.from(cache.entries())
    entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)

    const toRemove = entries.slice(0, cache.size - MAX_CACHE_SIZE)
    for (const [key] of toRemove) {
      cache.delete(key)
    }
  }, [])

  // サムネイルを取得（キャッシュあり）
  const requestThumbnail = useCallback(async (path: string): Promise<string> => {
    const cache = cacheRef.current
    const pending = pendingRef.current

    // キャッシュにあれば返す
    const cached = cache.get(path)
    if (cached) {
      cached.lastAccessed = Date.now()
      return cached.thumbnailUrl
    }

    // 既にリクエスト中なら待つ
    const pendingRequest = pending.get(path)
    if (pendingRequest) {
      return pendingRequest
    }

    // 新しいリクエストを作成
    const request = (async () => {
      try {
        const result = await generateThumbnail(path, thumbnailSize)
        const thumbnailUrl = convertFileSrc(result.thumbnailPath)

        // キャッシュに追加
        cache.set(path, {
          thumbnailUrl,
          lastAccessed: Date.now(),
        })

        evictOldEntries()

        return thumbnailUrl
      } finally {
        pending.delete(path)
      }
    })()

    pending.set(path, request)
    return request
  }, [generateThumbnail, thumbnailSize, evictOldEntries])

  // キャッシュからサムネイルURLを取得（同期版、なければnull）
  const getCachedThumbnail = useCallback((path: string): string | null => {
    const cached = cacheRef.current.get(path)
    if (cached) {
      cached.lastAccessed = Date.now()
      return cached.thumbnailUrl
    }
    return null
  }, [])

  // キャッシュをクリア
  const clearCache = useCallback(() => {
    cacheRef.current.clear()
    pendingRef.current.clear()
  }, [])

  return {
    requestThumbnail,
    getCachedThumbnail,
    clearCache,
  }
}
