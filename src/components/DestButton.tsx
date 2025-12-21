interface DestButtonProps {
  keyNum: string
  path: string | null
  onSelect: () => void
  onClear?: () => void
  disabled?: boolean
  active?: boolean
}

export function DestButton({
  keyNum,
  path,
  onSelect,
  onClear,
  disabled = false,
  active = false,
}: DestButtonProps) {
  const folderName = path ? path.split('/').pop() : '未設定'

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (path && onClear) {
      onClear()
    }
  }

  return (
    <button
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      disabled={disabled}
      className={`dest-button ${active ? 'active' : ''}`}
      title={path ? '右クリックで設定解除' : 'クリックしてフォルダを選択'}
    >
      <span className="dest-button-key">{keyNum}</span>
      <span className="dest-button-name">{folderName}</span>
    </button>
  )
}
