import { useLanguage } from '../contexts/LanguageContext'

interface HeaderProps {
  title: string
  sourcePath: string | null
  onSelectFolder: () => void
  onOpenSettings: () => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}

/**
 * パスを省略表示（右端から40文字を確保）
 */
function truncatePath(path: string, maxLength = 40): string {
  if (path.length <= maxLength) return path

  // 右端から maxLength 文字を取得し、先頭に ... を付ける
  return '...' + path.slice(-(maxLength - 3))
}

export function Header({
  title,
  sourcePath,
  onSelectFolder,
  onOpenSettings,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: HeaderProps) {
  const { t } = useLanguage()

  return (
    <header className="app-header">
      <div className="header-left">
        <h1>{title}</h1>
        {sourcePath && (
          <span className="header-path" title={sourcePath}>
            {truncatePath(sourcePath)}
          </span>
        )}
      </div>
      <div className="header-right">
        <div className="header-history-buttons">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="btn-icon"
            title={`${t('header.undo')} (Cmd+Z)`}
            aria-label={t('header.undo')}
          >
            ↶
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="btn-icon"
            title={`${t('header.redo')} (Cmd+Shift+Z)`}
            aria-label={t('header.redo')}
          >
            ↷
          </button>
        </div>
        <button onClick={onSelectFolder} className="btn-select-folder">
          {t('header.selectFolder')}
        </button>
        <button
          onClick={onOpenSettings}
          className="btn-settings"
          title={`${t('header.settings')} (Cmd+,)`}
          aria-label={t('header.settings')}
        >
          ⚙
        </button>
      </div>
    </header>
  )
}
