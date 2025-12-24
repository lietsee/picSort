import { useEffect, useState, memo } from 'react'
import type { ImageInfo } from '../types'

interface ThumbnailItemProps {
  image: ImageInfo
  isSelected: boolean
  thumbnailSize: number
  requestThumbnail: (path: string) => Promise<string>
  getCachedThumbnail: (path: string) => string | null
  onClick: (e: React.MouseEvent) => void
  onDoubleClick: () => void
}

export const ThumbnailItem = memo(function ThumbnailItem({
  image,
  isSelected,
  thumbnailSize,
  requestThumbnail,
  getCachedThumbnail,
  onClick,
  onDoubleClick,
}: ThumbnailItemProps) {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => {
    // 初期値としてキャッシュをチェック
    return getCachedThumbnail(image.path)
  })
  const [status, setStatus] = useState<'pending' | 'loading' | 'loaded' | 'error'>(
    thumbnailUrl ? 'loaded' : 'pending'
  )

  // image.path が変わったら state をリセット（react-windowのセル再利用対策）
  useEffect(() => {
    const cached = getCachedThumbnail(image.path)
    setThumbnailUrl(cached)
    setStatus(cached ? 'loaded' : 'pending')
  }, [image.path, getCachedThumbnail])

  useEffect(() => {
    // 既にロード済みならスキップ
    if (thumbnailUrl) return

    let cancelled = false
    setStatus('loading')

    requestThumbnail(image.path)
      .then((url) => {
        if (!cancelled) {
          setThumbnailUrl(url)
          setStatus('loaded')
        }
      })
      .catch(() => {
        if (!cancelled) {
          setStatus('error')
        }
      })

    return () => {
      cancelled = true
    }
  }, [image.path, requestThumbnail, thumbnailUrl])

  return (
    <div
      className={`thumbnail-item ${isSelected ? 'selected' : ''}`}
      style={{ width: thumbnailSize, height: thumbnailSize }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
    >
      {/* 選択チェックボックス */}
      <div className="thumbnail-checkbox">
        {isSelected && <span>✓</span>}
      </div>

      {/* サムネイル画像 */}
      {status === 'loaded' && thumbnailUrl ? (
        <img
          src={thumbnailUrl}
          alt={image.name}
          loading="lazy"
          draggable={false}
        />
      ) : status === 'loading' || status === 'pending' ? (
        <div className="thumbnail-loading">
          <div className="thumbnail-loading-spinner" />
        </div>
      ) : (
        <div className="thumbnail-error">
          <span>!</span>
        </div>
      )}

      {/* ファイル名 */}
      <span className="thumbnail-name" title={image.name}>
        {image.name}
      </span>
    </div>
  )
})
