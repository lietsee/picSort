import { useEffect, useState } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import { useLanguage } from '../contexts/LanguageContext'
import type { ImageInfo } from '../types'

interface ImageViewerProps {
  image: ImageInfo | null
  nextImage?: ImageInfo | null
  loading?: boolean
}

const MAX_SCALE = 3 // 元サイズの3倍まで

export function ImageViewer({ image, nextImage, loading = false }: ImageViewerProps) {
  const { t } = useLanguage()
  const [maxSize, setMaxSize] = useState<{ width?: number; height?: number }>({})

  // 画像が変わったらmaxSizeをリセット
  useEffect(() => {
    setMaxSize({})
  }, [image?.path])

  // 次の画像を先読み
  useEffect(() => {
    if (nextImage?.path) {
      const img = new Image()
      img.src = convertFileSrc(nextImage.path)
    }
  }, [nextImage])

  // 画像読み込み時に拡大上限を設定
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget
    setMaxSize({
      width: img.naturalWidth * MAX_SCALE,
      height: img.naturalHeight * MAX_SCALE,
    })
  }

  if (loading) {
    return (
      <div className="image-viewer image-viewer-loading">
        <span>{t('imageViewer.loading')}</span>
      </div>
    )
  }

  if (!image) {
    return (
      <div className="image-viewer image-viewer-empty">
        <span>{t('imageViewer.noImages')}</span>
      </div>
    )
  }

  // Tauri 2.x: use convertFileSrc for local files
  const src = convertFileSrc(image.path)

  return (
    <div className="image-viewer">
      <img
        src={src}
        alt={image.name}
        className="image-viewer-img"
        onLoad={handleImageLoad}
        style={{ maxWidth: maxSize.width, maxHeight: maxSize.height }}
      />
      <span className="image-viewer-name">{image.name}</span>
    </div>
  )
}
