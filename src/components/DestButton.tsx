import { confirm } from '@tauri-apps/plugin-dialog'
import { useLanguage } from '../contexts/LanguageContext'
import { getFileName } from '../utils/path'

interface DestButtonProps {
  keyNum: string
  path: string | null
  onSelect: () => void
  onClear?: () => void
  onMatchingSelect?: () => void
  disabled?: boolean
  active?: boolean
  lastUsed?: boolean
  matching?: boolean
}

export function DestButton({
  keyNum,
  path,
  onSelect,
  onClear,
  onMatchingSelect,
  disabled = false,
  active = false,
  lastUsed = false,
  matching = false,
}: DestButtonProps) {
  const { t } = useLanguage()
  const folderName = path ? getFileName(path) : t('destButton.notSet')

  const handleClick = (e: React.MouseEvent) => {
    // 右Shift + 左クリック でマッチング選択
    if (e.shiftKey && onMatchingSelect && path) {
      e.preventDefault()
      onMatchingSelect()
      return
    }
    onSelect()
  }

  const handleContextMenu = async (e: React.MouseEvent) => {
    e.preventDefault()
    if (path && onClear) {
      const name = getFileName(path) || path
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
  if (matching) classNames.push('matching')

  // ツールチップテキスト
  const tooltip = path
    ? `${path}\n(${t('destButton.rightClickToClear')})`
    : t('destButton.clickToSelect')

  return (
    <button
      onClick={handleClick}
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
