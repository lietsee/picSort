interface StatusBarProps {
  current: number
  total: number
  message: string
  status?: 'idle' | 'loading' | 'success' | 'error' | 'warning'
}

export function StatusBar({
  current,
  total,
  message,
  status = 'idle',
}: StatusBarProps) {
  const getStatusClass = () => {
    switch (status) {
      case 'error':
        return 'status-error'
      case 'success':
        return 'status-success'
      case 'warning':
        return 'status-warning'
      default:
        return ''
    }
  }

  return (
    <div className={`status-bar ${getStatusClass()}`} data-testid="status-bar">
      <span className="status-counter">
        {current} / {total}
      </span>
      {message && (
        <span className="status-message" data-testid="status-message">
          {message}
        </span>
      )}
    </div>
  )
}
