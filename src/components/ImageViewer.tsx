import { convertFileSrc } from '@tauri-apps/api/core'
import type { ImageInfo } from '../types'

interface ImageViewerProps {
  image: ImageInfo | null
  loading?: boolean
}

export function ImageViewer({ image, loading = false }: ImageViewerProps) {
  if (loading) {
    return (
      <div className="image-viewer image-viewer-loading">
        <span>読み込み中...</span>
      </div>
    )
  }

  if (!image) {
    return (
      <div className="image-viewer image-viewer-empty">
        <span>画像がありません</span>
      </div>
    )
  }

  // Tauri 2.x: use convertFileSrc for local files
  const src = convertFileSrc(image.path)

  return (
    <div className="image-viewer">
      <img src={src} alt={image.name} className="image-viewer-img" />
      <span className="image-viewer-name">{image.name}</span>
    </div>
  )
}
