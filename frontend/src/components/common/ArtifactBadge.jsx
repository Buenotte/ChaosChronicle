export const ARTIFACT_CONFIG = {
  script:    { label: 'Скрипт',    icon: '📜', color: '#93c5fd', bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.35)' },
  photos:    { label: 'фото',      icon: '📸', color: '#67e8f9', bg: 'rgba(6, 182, 212, 0.18)', border: 'rgba(6, 182, 212, 0.35)' },
  thumbnail: { label: '16:9 Обложка', icon: '✨', color: '#f472b6', bg: 'rgba(236, 72, 153, 0.18)', border: 'rgba(236, 72, 153, 0.35)' },
  audio:     { label: 'Аудио',     icon: '🎙️', color: '#fcd34d', bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.35)' },
  video:     { label: 'Видео',     icon: '🎬', color: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.2)',  border: 'rgba(16, 185, 129, 0.4)' },
  shorts:    { label: 'Shorts',    icon: '⚡', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.2)',   border: 'rgba(244, 63, 94, 0.4)' },
  youtube:   { label: 'YouTube',   icon: '📺', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)',   border: 'rgba(239, 68, 68, 0.4)' },
  fb:        { label: 'FB',        icon: '📱', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.2)',  border: 'rgba(96, 165, 250, 0.4)' },
  title:     { label: 'title',     icon: '⚡', color: '#a78bfa', bg: 'rgba(139, 92, 246, 0.2)',  border: 'rgba(139, 92, 246, 0.4)' },
}

export default function ArtifactBadge({
  type,
  active = true,
  label,
  icon,
  count,
  onClick,
  title,
  variant = 'pill', // 'pill' or 'status'
  className = '',
  style = {},
}) {
  const cfg = ARTIFACT_CONFIG[type] || { label: type || 'Инфо', icon: '📦', color: '#9ca3af', bg: 'rgba(156, 163, 175, 0.2)', border: 'rgba(156, 163, 175, 0.35)' }
  const displayIcon = icon || cfg.icon
  const displayLabel = label || (count !== undefined ? `${count} ${cfg.label}` : cfg.label)

  if (variant === 'status') {
    const isClickable = Boolean(onClick)
    const statusClass = `saved-status-badge ${active ? 'active' : 'inactive'} ${isClickable ? 'clickable' : ''} ${className}`.trim()
    const content = `${displayIcon} ${displayLabel} ${active ? '✅' : '❌'}`

    if (isClickable) {
      return (
        <button type="button" className={statusClass} onClick={onClick} title={title} style={style}>
          {content}
        </button>
      )
    }

    return (
      <span className={statusClass} title={title} style={style}>
        {content}
      </span>
    )
  }

  // Pill variant
  return (
    <span
      className={`artifact-pill ${type} ${className}`.trim()}
      title={title || `${displayLabel} готов`}
      style={{
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        fontSize: '0.72rem',
        fontWeight: 700,
        padding: '0.2rem 0.45rem',
        borderRadius: '4px',
        ...style,
      }}
    >
      {displayIcon} {displayLabel} ✅
    </span>
  )
}
