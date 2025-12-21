interface WelcomeModalProps {
  isOpen: boolean
  onClose: () => void
  onDontShowAgain: () => void
}

export function WelcomeModal({ isOpen, onClose, onDontShowAgain }: WelcomeModalProps) {
  if (!isOpen) return null

  const handleDontShowAgain = () => {
    onDontShowAgain()
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>picSort へようこそ</h2>

        <div className="welcome-instructions">
          <h3>基本操作</h3>
          <ul>
            <li><strong>フォルダを選択</strong> または <strong>ドラッグ＆ドロップ</strong> で画像を読み込み</li>
            <li><strong>1〜5</strong> キーまたはサイドバーのボタンで分別先フォルダを設定</li>
            <li>設定後、同じキーを押すと画像を移動</li>
          </ul>

          <h3>キーボードショートカット</h3>
          <ul>
            <li><strong>1-5</strong>: 分別先に移動</li>
            <li><strong>← / A / Backspace</strong>: 前の画像</li>
            <li><strong>→ / D / Space</strong>: 次の画像</li>
            <li><strong>F</strong>: フルスクリーン切替</li>
          </ul>

          <h3>ヒント</h3>
          <ul>
            <li>分別先ボタンを <strong>右クリック</strong> で設定解除</li>
            <li>設定は自動保存されます</li>
          </ul>
        </div>

        <div className="modal-actions">
          <button onClick={handleDontShowAgain} className="btn-secondary">
            次回から表示しない
          </button>
          <button onClick={onClose} className="btn-primary">
            始める
          </button>
        </div>
      </div>
    </div>
  )
}
