import { useLanguage } from '../contexts/LanguageContext'

interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onDontShowAgain: () => void
}

export function WelcomeModal({ isOpen, onClose, onDontShowAgain }: WelcomeModalProps) {
  const { t } = useLanguage()

  if (!isOpen) return null

  const handleDontShowAgain = () => {
    onDontShowAgain()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{t('welcome.title')}</h2>

        <div className="welcome-instructions">
          <h3>{t('welcome.basicUsage')}</h3>
          <ul>
            <li>{t('welcome.basicStep1')}</li>
            <li>{t('welcome.basicStep2')}</li>
            <li>{t('welcome.basicStep3')}</li>
          </ul>

          <h3>{t('welcome.keyboardShortcuts')}</h3>
          <ul>
            <li><strong>1-0</strong>: {t('welcome.shortcut1_5')}</li>
            <li><strong>← / A / Backspace</strong>: {t('welcome.shortcutPrev')}</li>
            <li><strong>→ / D / Space</strong>: {t('welcome.shortcutNext')}</li>
            <li><strong>F</strong>: {t('welcome.shortcutFullscreen')}</li>
          </ul>

          <h3>{t('welcome.tips')}</h3>
          <ul>
            <li>{t('welcome.tipRightClick')}</li>
            <li>{t('welcome.tipAutoSave')}</li>
          </ul>
        </div>

        <div className="modal-actions">
          <button onClick={handleDontShowAgain} className="btn-secondary">
            {t('welcome.dontShowAgain')}
          </button>
          <button onClick={onClose} className="btn-primary">
            {t('welcome.start')}
          </button>
        </div>
      </div>
    </div>
  )
}
