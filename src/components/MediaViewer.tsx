import { useEffect, useState, useRef, useCallback } from 'react'
import { convertFileSrc } from '@tauri-apps/api/core'
import { useLanguage } from '../contexts/LanguageContext'
import type { ImageInfo } from '../types'

interface MediaViewerProps {
  media: ImageInfo | null
  nextMedia?: ImageInfo | null
  loading?: boolean
  onNavigate?: (direction: 'prev' | 'next') => void
  onIsVideoChange?: (isVideo: boolean) => void
}

const MAX_SCALE = 3 // 元サイズの3倍まで
const VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'mkv', 'avi', 'ogv']
const SEEK_SECONDS = 30
const SEEK_SECONDS_SHORT = 5
const VOLUME_STEP = 0.05

function isVideoFile(path: string): boolean {
  const lower = path.toLowerCase()
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(`.${ext}`))
}

export function MediaViewer({
  media,
  nextMedia,
  loading = false,
  onNavigate,
  onIsVideoChange,
}: MediaViewerProps) {
  const { t } = useLanguage()
  const [maxSize, setMaxSize] = useState<{ width?: number; height?: number }>({})
  const [volume, setVolume] = useState(0) // デフォルトミュート
  const videoRef = useRef<HTMLVideoElement>(null)

  const isVideo = media ? isVideoFile(media.path) : false

  // isVideo状態を親に通知
  useEffect(() => {
    onIsVideoChange?.(isVideo)
  }, [isVideo, onIsVideoChange])

  // メディアが変わったらmaxSizeをリセット
  useEffect(() => {
    setMaxSize({})
  }, [media?.path])

  // 音量変更を反映
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      videoRef.current.muted = volume === 0
    }
  }, [volume])

  // 次の画像を先読み（動画は先読みしない）
  useEffect(() => {
    if (nextMedia && !isVideoFile(nextMedia.path)) {
      const img = new Image()
      img.src = convertFileSrc(nextMedia.path)
    }
  }, [nextMedia])

  // 動画用キーボード操作
  const handleVideoKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isVideo || !videoRef.current) return

      // 入力フィールドにフォーカスがある場合は無視
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      const video = videoRef.current
      const key = event.key

      switch (key) {
        case 'ArrowRight':
          event.preventDefault()
          // 終端に近い場合は次のファイルへ
          if (video.currentTime >= video.duration - 0.5) {
            onNavigate?.('next')
          } else {
            video.currentTime = Math.min(video.currentTime + SEEK_SECONDS, video.duration)
          }
          break

        case 'ArrowLeft':
          event.preventDefault()
          if (video.currentTime <= 0.5) {
            if (video.paused) {
              onNavigate?.('prev') // 停止中なら前のファイルへ
            } else {
              video.pause() // 再生中なら停止
            }
          } else {
            video.currentTime = Math.max(video.currentTime - SEEK_SECONDS, 0)
          }
          break

        case 'ArrowUp':
          event.preventDefault()
          setVolume(v => Math.min(v + VOLUME_STEP, 1))
          break

        case 'ArrowDown':
          event.preventDefault()
          setVolume(v => Math.max(v - VOLUME_STEP, 0))
          break

        case ';':
          event.preventDefault()
          video.currentTime = Math.max(video.currentTime - SEEK_SECONDS_SHORT, 0)
          if (video.currentTime === 0) {
            if (video.paused) {
              onNavigate?.('prev') // 停止中なら前のファイルへ
            } else {
              video.pause() // 再生中なら停止
            }
          }
          break

        case "'":
          event.preventDefault()
          video.currentTime = Math.min(video.currentTime + SEEK_SECONDS_SHORT, video.duration)
          break

        case ' ':
          event.preventDefault()
          if (video.paused) {
            video.play()
          } else {
            video.pause()
          }
          break
      }
    },
    [isVideo, onNavigate]
  )

  useEffect(() => {
    if (isVideo) {
      window.addEventListener('keydown', handleVideoKeyDown)
      return () => {
        window.removeEventListener('keydown', handleVideoKeyDown)
      }
    }
  }, [isVideo, handleVideoKeyDown])

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

  if (!media) {
    return (
      <div className="image-viewer image-viewer-empty">
        <span>{t('imageViewer.noImages')}</span>
      </div>
    )
  }

  const src = convertFileSrc(media.path)

  return (
    <div className="image-viewer">
      {isVideo ? (
        <video
          ref={videoRef}
          src={src}
          className="image-viewer-img"
          autoPlay
          controls
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.volume = volume
              videoRef.current.muted = volume === 0
            }
          }}
        />
      ) : (
        <img
          src={src}
          alt={media.name}
          className="image-viewer-img"
          onLoad={handleImageLoad}
          style={{ maxWidth: maxSize.width, maxHeight: maxSize.height }}
        />
      )}
      <span className="image-viewer-name">{media.name}</span>
      {isVideo && volume > 0 && (
        <span className="volume-indicator">🔊 {Math.round(volume * 100)}%</span>
      )}
    </div>
  )
}

// 後方互換性のためにImageViewerもエクスポート
export { MediaViewer as ImageViewer }
