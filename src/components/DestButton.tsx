import { confirm } from '@tauri-apps/plugin-dialog'
import { useLanguage } from '../contexts/LanguageContext'

interface DestButtonProps {
  keyNum: string
  path: string | null
  onSelect: () => void
  onClear?: () => void
  disabled?: boolean
  active?: boolean
  lastUsed?: boolean
}

export function DestButton({
  keyNum,
  path,
  onSelect,
  onClear,
  disabled = false,
  active = false,
  lastUsed = false,
}: DestButtonProps) {
  const { t } = useLanguage()
  const folderName = path ? path.split('/').pop() : t('destButton.notSet')

  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (path && onClear) {
      const name = path.split('/').pop() || path
      const confirmed = await confirm(t('destButton.confirmClear', { folder: name }), {
        title: t('destButton.confirmTitle'),
        kind: 'warning',
      })
      if (confirmed) {
        onClear()
      }
    }
  }

  // クラス名を構築
  const classNames = ['dest-button']
  if (active) classNames.push('active')
  if (lastUsed) classNames.push('last-used')

  // ツールチップテキスト
  const tooltip = path
    ? `${path}\n(${t('destButton.rightClickToClear')})`
    : t('destButton.clickToSelect')

  return (
    <button
      onClick={onSelect}
      onContextMenu={handleContextMenu}
      disabled={disabled}
      className={classNames.join(' ')}
      title={tooltip}
    >
      <span className="dest-button-key">{keyNum}</span>
      <span className="dest-button-name">{folderName}</span>
      {lastUsed && <span className="dest-button-indicator">●</span>}
    </button>
  )
}
