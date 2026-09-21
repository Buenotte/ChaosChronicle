export default function ModalHeader({
  badge,
  badgeIcon,
  badgeStyle = {},
  icon,
  title,
  subtitle,
  isMaximized,
  onToggleMaximize,
  onClose,
  onMouseDown,
  isDragging = false,
  actions = null,
  className = '',
  style = {},
}) {
  return (
    <div
      className={`modal-header ${onMouseDown ? 'draggable-header' : ''} ${className}`.trim()}
      onMouseDown={onMouseDown}
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        cursor: onMouseDown ? (isDragging ? 'grabbing' : 'grab') : 'default',
        userSelect: onMouseDown ? 'none' : 'auto',
        ...style,
      }}
      title={onMouseDown ? 'Зажмите мышью, чтобы перетащить окно' : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flex: 1, minWidth: 0 }}>
        {icon && <span style={{ fontSize: '1.35rem' }}>{icon}</span>}
        <div style={{ flex: 1, minWidth: 0 }}>
          {badge && (
            <span className="modal-badge saved-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', ...badgeStyle }}>
              {badgeIcon && <span>{badgeIcon}</span>}
              {badge}
            </span>
          )}
          {title && <h2 className="modal-title" style={{ margin: 0, marginTop: badge ? '0.35rem' : 0 }}>{title}</h2>}
          {subtitle && <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '0.2rem' }}>{subtitle}</div>}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
        {actions}
        {onToggleMaximize && (
          <button
            type="button"
            className="copy-btn modal-close"
            onClick={onToggleMaximize}
            style={{ padding: '0.35rem 0.55rem', background: '#27272a', border: '1px solid #3f3f46' }}
            title={isMaximized ? 'Восстановить размер' : 'Развернуть на весь экран'}
          >
            {isMaximized ? '🗗' : '🗖'}
          </button>
        )}
        {onClose && (
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            title="Закрыть (Esc)"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

