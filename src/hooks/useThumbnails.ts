import { useRef, useCallback } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import { useTauriCommands } from './useTauriCommands'

interface ThumbnailCacheEntry {
  thumbnailUrl: string
  lastAccessed: number
}

interface QueueResolver {
  resolve: (url: string) => void
  reject: (err: Error) => void
}

const MAX_CACHE_SIZE = 500
const MAX_CONCURRENT = 6

export function useThumbnails(thumbnailSize: number = 200) {
  const { generateThumbnail } = useTauriCommands()
  const cacheRef = useRef<Map<string, ThumbnailCacheEntry>>(new Map())
  const pendingRef = useRef<Map<string, Promise<string>>>(new Map())
  const queueRef = useRef<string[]>([])
  const activeCountRef = useRef(0)
  const resolversRef = useRef<Map<string, QueueResolver>>(new Map())
  const processingRef = useRef(false)

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

  // キューから1件処理
  const processOne = useCallback(async () => {
    const path = queueRef.current.shift()
    if (!path) return false

    const resolver = resolversRef.current.get(path)
    if (!resolver) return true // 次へ進む

    activeCountRef.current++

    try {
      const result = await generateThumbnail(path, thumbnailSize)
      const thumbnailUrl = convertFileSrc(result.thumbnailPath)

      cacheRef.current.set(path, {
        thumbnailUrl,
        lastAccessed: Date.now(),
      })
      evictOldEntries()

      resolver.resolve(thumbnailUrl)
    } catch (err) {
      resolver.reject(err as Error)
    } finally {
      activeCountRef.current--
      resolversRef.current.delete(path)
      pendingRef.current.delete(path)
    }

    return true
  }, [generateThumbnail, thumbnailSize, evictOldEntries])

  // キュー処理ループ（非同期で並列実行）
  const processQueue = useCallback(() => {
    // 既に処理中の場合はスキップ（再帰的に呼ばれる）
    if (processingRef.current) return
    processingRef.current = true

    const runLoop = async () => {
      while (queueRef.current.length > 0 && activeCountRef.current < MAX_CONCURRENT) {
        // 同時に複数起動
        const slots = MAX_CONCURRENT - activeCountRef.current
        const batch = Math.min(slots, queueRef.current.length)

        const promises: Promise<boolean>[] = []
        for (let i = 0; i < batch; i++) {
          promises.push(processOne())
        }

        // 最初の1つが完了するまで待機
        if (promises.length > 0) {
          await Promise.race(promises)
        }
      }
      processingRef.current = false
    }

    runLoop()
  }, [processOne])

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

    // 新しいPromiseを作成してキューに追加
    const promise = new Promise<string>((resolve, reject) => {
      resolversRef.current.set(path, { resolve, reject })
      queueRef.current.push(path)
    })

    pending.set(path, promise)

    // キュー処理を開始
    processQueue()

    return promise
  }, [processQueue])

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
    queueRef.current = []
    resolversRef.current.clear()
  }, [])

  return {
    requestThumbnail,
    getCachedThumbnail,
    clearCache,
  }
}
