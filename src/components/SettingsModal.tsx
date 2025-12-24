import { useTheme, Theme } from '../contexts/ThemeContext'
import { useLanguage, Language } from '../contexts/LanguageContext'
import type { WordList } from '../types'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  destinations: Record<string, string | null>
  wordLists: Record<string, WordList | null>
  onSelectDestination: (key: string) => void
  onClearDestination: (key: string) => void
  onLoadWordList: (key: string) => void
  onClearWordList: (key: string) => void
}

const KEYBINDING_KEYS = [
  { key: '1-0', descKey: 'shortcuts.moveToDestination' },
  { key: '← / A / P', descKey: 'shortcuts.prevImage' },
  { key: '→ / D / N', descKey: 'shortcuts.nextImage' },
  { key: 'Backspace', descKey: 'shortcuts.prevImage' },
  { key: 'F', descKey: 'shortcuts.toggleFullscreen' },
  { key: 'Cmd+Z / Ctrl+Z', descKey: 'shortcuts.undo' },
  { key: 'Cmd+Shift+Z / Ctrl+Y', descKey: 'shortcuts.redo' },
  { key: 'Cmd+, / Ctrl+,', descKey: 'shortcuts.openSettings' },
]

const VIDEO_KEYBINDING_KEYS = [
  { key: 'Space', descKey: 'shortcuts.videoPlayPause' },
  { key: '← / →', descKey: 'shortcuts.videoSeek30' },
  { key: '; / \'', descKey: 'shortcuts.videoSeek5' },
  { key: '↑ / ↓', descKey: 'shortcuts.videoVolume' },
]

const GRID_KEYBINDING_KEYS = [
  { key: 'G', descKey: 'shortcuts.toggleGridMode' },
  { key: 'Ctrl+A', descKey: 'shortcuts.selectAll' },
  { key: 'Escape', descKey: 'shortcuts.clearSelection' },
  { key: 'RShift+Click', descKey: 'shortcuts.matchingSelect' },
]

export function SettingsModal({
  isOpen,
  onClose,
  destinations,
  wordLists,
  onSelectDestination,
  onClearDestination,
  onLoadWordList,
  onClearWordList,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const { language, setLanguage, t } = useLanguage()

  if (!isOpen) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as Theme)
  }

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as Language)
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content settings-modal">
        <h2>{t('settings.title')}</h2>

        <section className="settings-section">
          <h3>{t('settings.appearance')}</h3>
          <div className="settings-row">
            <label htmlFor="theme-select">{t('settings.theme')}</label>
            <select
              id="theme-select"
              value={theme}
              onChange={handleThemeChange}
              className="settings-select"
            >
              <option value="system">{t('settings.themeSystem')}</option>
              <option value="light">{t('settings.themeLight')}</option>
              <option value="dark">{t('settings.themeDark')}</option>
            </select>
          </div>
          <div className="settings-row">
            <label htmlFor="language-select">{t('settings.language')}</label>
            <select
              id="language-select"
              value={language}
              onChange={handleLanguageChange}
              className="settings-select"
            >
              <option value="ja">日本語</option>
              <option value="en">English</option>
            </select>
          </div>
        </section>

        <section className="settings-section">
          <h3>{t('settings.destinations')}</h3>
          <div className="settings-destinations">
            {(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'] as const).map((key) => (
              <div key={key} className="settings-dest-row">
                <span className="settings-dest-key">{key}</span>
                <div className="settings-dest-info">
                  <span className="settings-dest-path" title={destinations[key] || undefined}>
                    {destinations[key]?.split('/').pop() || t('destButton.notSet')}
                  </span>
                  {wordLists[key] && (
                    <span className="settings-dest-wordlist" title={wordLists[key]?.fileName}>
                      📄 {wordLists[key]?.fileName}
                    </span>
                  )}
                </div>
                <div className="settings-dest-actions">
                  <button
                    className="btn-dest-select"
                    onClick={() => onSelectDestination(key)}
                    title={t('settings.selectFolder')}
                  >
                    📁
                  </button>
                  {destinations[key] && (
                    <button
                      className="btn-dest-clear"
                      onClick={() => onClearDestination(key)}
                      title={t('settings.clearFolder')}
                    >
                      ✕
                    </button>
                  )}
                  <button
                    className="btn-wordlist-load"
                    onClick={() => onLoadWordList(key)}
                    title={t('settings.loadWordList')}
                  >
                    📄
                  </button>
                  {wordLists[key] && (
                    <button
                      className="btn-wordlist-clear"
                      onClick={() => onClearWordList(key)}
                      title={t('settings.clearWordList')}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <h3>{t('settings.shortcuts')}</h3>
          <div className="settings-keybindings">
            {KEYBINDING_KEYS.map(({ key, descKey }) => (
              <div key={key} className="settings-keybind-row">
                <kbd className="settings-key">{key}</kbd>
                <span className="settings-keybind-desc">{t(descKey)}</span>
              </div>
            ))}
          </div>
          <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>{t('shortcuts.videoSection')}</h4>
          <div className="settings-keybindings">
            {VIDEO_KEYBINDING_KEYS.map(({ key, descKey }) => (
              <div key={key} className="settings-keybind-row">
                <kbd className="settings-key">{key}</kbd>
                <span className="settings-keybind-desc">{t(descKey)}</span>
              </div>
            ))}
          </div>
          <h4 style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>{t('shortcuts.gridSection')}</h4>
          <div className="settings-keybindings">
            {GRID_KEYBINDING_KEYS.map(({ key, descKey }) => (
              <div key={key} className="settings-keybind-row">
                <kbd className="settings-key">{key}</kbd>
                <span className="settings-keybind-desc">{t(descKey)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="modal-actions">
          <button onClick={onClose} className="btn-primary">
            {t('settings.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
