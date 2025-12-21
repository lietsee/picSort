interface StatusBarProps {
  current: number
  total: number
  message: string
  status?: 'idle' | 'loading' | 'success' | 'error'
}

export function StatusBar({
  current,
  total,
  message,
  status = 'idle',
}: StatusBarProps) {
  const statusClass =
    status === 'error'
      ? 'status-error'
      : status === 'success'
        ? 'status-success'
        : ''

  return (
    <div className={`status-bar ${statusClass}`} data-testid="status-bar">
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
