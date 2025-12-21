interface DestButtonProps {
  keyNum: string
  path: string | null
  onSelect: () => void
  disabled?: boolean
  active?: boolean
}

export function DestButton({
  keyNum,
  path,
  onSelect,
  disabled = false,
  active = false,
}: DestButtonProps) {
  const folderName = path ? path.split('/').pop() : '未設定'

  return (
    <button
      onClick={onSelect}
      disabled={disabled}
      className={`dest-button ${active ? 'active' : ''}`}
    >
      <span className="dest-button-key">{keyNum}</span>
      <span className="dest-button-name">{folderName}</span>
    </button>
  )
}
