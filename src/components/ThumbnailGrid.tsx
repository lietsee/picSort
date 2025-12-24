import React, { useRef, useMemo, useState, useEffect } from 'react'
import { Grid as VirtualGrid, type CellComponentProps } from 'react-window'
import { ThumbnailItem } from './ThumbnailItem'
import { useThumbnails } from '../hooks/useThumbnails'
import type { ImageInfo } from '../types'

interface ThumbnailGridProps {
  images: ImageInfo[]
  selectedPaths: string[]
  onSelect: (path: string, modifiers: { ctrl: boolean; shift: boolean }) => void
  onDoubleClick: (path: string) => void
  thumbnailSize?: number
}

const GAP = 8
const PADDING = 8

// cellProps で渡す追加データの型
interface CellExtraProps {
  images: ImageInfo[]
  selectedSet: Set<string>
  onSelect: (path: string, modifiers: { ctrl: boolean; shift: boolean }) => void
  onDoubleClick: (path: string) => void
  thumbnailSize: number
  columnCount: number
  requestThumbnail: (path: string) => Promise<string>
  getCachedThumbnail: (path: string) => string | null
}

// CellComponentProps<CellExtraProps> を使用した正しい型定義
// React.FC ではなく関数宣言を使用（react-window が ReactElement を期待するため）
function Cell({
  ariaAttributes,
  columnIndex,
  rowIndex,
  style,
  images,
  selectedSet,
  onSelect,
  onDoubleClick,
  thumbnailSize,
  columnCount,
  requestThumbnail,
  getCachedThumbnail,
}: CellComponentProps<CellExtraProps>): React.ReactElement {
  const index = rowIndex * columnCount + columnIndex

  if (index >= images.length) {
    return <div {...ariaAttributes} style={style} />
  }

  const image = images[index]
  const isSelected = selectedSet.has(image.path)

  const handleClick = (e: React.MouseEvent) => {
    onSelect(image.path, {
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
    })
  }

  const handleDoubleClick = () => {
    onDoubleClick(image.path)
  }

  return (
    <div
      {...ariaAttributes}
      style={{
        ...style,
        left: Number(style.left) + PADDING,
        top: Number(style.top) + PADDING,
        width: thumbnailSize,
        height: thumbnailSize,
      }}
    >
      <ThumbnailItem
        image={image}
        isSelected={isSelected}
        thumbnailSize={thumbnailSize}
        requestThumbnail={requestThumbnail}
        getCachedThumbnail={getCachedThumbnail}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      />
    </div>
  )
}

export function ThumbnailGrid({
  images,
  selectedPaths,
  onSelect,
  onDoubleClick,
  thumbnailSize = 200,
}: ThumbnailGridProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { requestThumbnail, getCachedThumbnail } = useThumbnails(thumbnailSize)

  // 選択状態のSetを作成（高速ルックアップ）
  const selectedSet = useMemo(() => new Set(selectedPaths), [selectedPaths])

  // コンテナサイズを監視
  const [gridSize, setGridSize] = useState({ width: 800, height: 600 })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setGridSize({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        })
      }
    })

    resizeObserver.observe(container)
    return () => resizeObserver.disconnect()
  }, [])

  const columnCount = useMemo(() => {
    const containerWidth = gridSize.width - PADDING * 2
    const itemWidth = thumbnailSize + GAP
    return Math.max(1, Math.floor(containerWidth / itemWidth))
  }, [gridSize.width, thumbnailSize])

  const rowCount = Math.ceil(images.length / columnCount)

  // cellProps に渡すデータ（予約propsは含めない）
  const cellProps: CellExtraProps = useMemo(() => ({
    images,
    selectedSet,
    onSelect,
    onDoubleClick,
    thumbnailSize,
    columnCount,
    requestThumbnail,
    getCachedThumbnail,
  }), [images, selectedSet, onSelect, onDoubleClick, thumbnailSize, columnCount, requestThumbnail, getCachedThumbnail])

  if (images.length === 0) {
    return (
      <div className="thumbnail-grid-empty">
        <span>画像がありません</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="thumbnail-grid-container">
      <VirtualGrid
        columnCount={columnCount}
        columnWidth={thumbnailSize + GAP}
        defaultHeight={gridSize.height}
        defaultWidth={gridSize.width}
        rowCount={rowCount}
        rowHeight={thumbnailSize + GAP}
        overscanCount={2}
        cellComponent={Cell}
        cellProps={cellProps}
        style={{ width: gridSize.width, height: gridSize.height }}
      />
    </div>
  )
}
