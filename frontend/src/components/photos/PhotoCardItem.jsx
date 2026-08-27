export default function PhotoCardItem({
  photo,
  index,
  totalCount,
  isSingleSaving,
  isDragged,
  isDragOver,
  onLightbox,
  onRemove,
  onSaveSingle,
  onMove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
}) {
  const imgSrc = typeof photo === 'string' ? photo : (photo?.url || '')
  const isLocal = imgSrc.startsWith('/news-static/') || photo?.isSavedLocal
  const titleText = photo?.articleTitle || photo?.source || `Фото #${index + 1}`
  const sourceText = isLocal ? 'На диске' : (photo?.source || 'Веб-поиск')
  const isPinterest = (photo?.source || '').toLowerCase().includes('pinterest')
  const badgeBg = isLocal
    ? 'rgba(5, 150, 105, 0.85)'
    : isPinterest
    ? 'rgba(225, 29, 72, 0.9)'
    : 'rgba(15, 23, 42, 0.85)'
  const badgeIcon = isLocal ? '✓' : isPinterest ? '📌' : '📍'

  return (
    <div
      className="photo-card-item"
      draggable={true}
      onDragStart={(e) => onDragStart && onDragStart(e, index)}
      onDragOver={(e) => onDragOver && onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop && onDrop(e, index)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: '#0b0f19',
        borderRadius: '8px',
        overflow: 'hidden',
        border: isDragOver
          ? '2px solid #38bdf8'
          : isLocal
          ? '1px solid #10b981'
          : '1px solid #1e293b',
        boxShadow: isDragOver ? '0 0 16px rgba(56, 189, 248, 0.45)' : 'none',
        opacity: isDragged ? 0.35 : 1,
        transform: isDragged ? 'scale(0.95)' : isDragOver ? 'scale(1.02)' : 'none',
        transition: 'all 0.15s ease-out',
        cursor: 'grab',
      }}
    >
      <div
        className="photo-card-img-wrap"
        onClick={() => onLightbox(imgSrc)}
        style={{ cursor: 'zoom-in', position: 'relative', width: '100%', height: '105px', background: '#020617' }}
        title="🔍 Нажмите для просмотра во весь экран"
      >
        <img
          src={imgSrc}
          alt={titleText}
          loading="lazy"
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }}
        />
        <span
          style={{
            position: 'absolute',
            top: '6px',
            left: '6px',
            maxWidth: '120px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            background: badgeBg,
            backdropFilter: 'blur(4px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#f8fafc',
            fontSize: '0.66rem',
            padding: '0.12rem 0.4rem',
            borderRadius: '4px',
            fontWeight: 600,
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          {badgeIcon} {sourceText}
        </span>

        {/* ⠿ Индикатор Drag & Drop */}
        <span
          style={{
            position: 'absolute',
            top: '6px',
            right: '32px',
            background: 'rgba(0, 0, 0, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            color: '#cbd5e1',
            fontSize: '0.64rem',
            fontWeight: 700,
            padding: '0.12rem 0.35rem',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 2,
          }}
          title="Зажмите и перетащите фото на любую позицию"
        >
          ⠿ Drag
        </span>

        {/* 🔢 Номер позиции в видео */}
        <span
          style={{
            position: 'absolute',
            bottom: '6px',
            left: '6px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(56, 189, 248, 0.4)',
            color: '#38bdf8',
            fontSize: '0.72rem',
            fontWeight: 800,
            padding: '0.12rem 0.45rem',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        >
          #{index + 1}
        </span>

        <button
          className="remove-photo-btn"
          onClick={(e) => onRemove(e, index)}
          title={isLocal ? 'Удалить с диска' : 'Скрыть'}
          style={{ zIndex: 3 }}
        >
          ✕
        </button>
      </div>

      <div style={{ padding: '0.55rem 0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '0.74rem', color: '#94a3b8', lineHeight: 1.25, maxHeight: '2.5em', overflow: 'hidden' }}>
          {titleText}
        </p>

        {/* 🔁 Управление порядком и сохранение */}
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', marginTop: 'auto' }}>
          {onMove && (
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMove(index, -1) }}
                disabled={index === 0}
                style={{
                  background: index === 0 ? '#1e2433' : '#334155',
                  color: index === 0 ? '#475569' : '#fff',
                  border: '1px solid #475569',
                  borderRadius: '5px',
                  padding: '0.28rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: index === 0 ? 'default' : 'pointer',
                  fontWeight: 700,
                }}
                title="Сдвинуть влево (раньше в видео)"
              >
                ⬅️
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onMove(index, 1) }}
                disabled={index >= (totalCount || 1) - 1}
                style={{
                  background: index >= (totalCount || 1) - 1 ? '#1e2433' : '#334155',
                  color: index >= (totalCount || 1) - 1 ? '#475569' : '#fff',
                  border: '1px solid #475569',
                  borderRadius: '5px',
                  padding: '0.28rem 0.5rem',
                  fontSize: '0.75rem',
                  cursor: index >= (totalCount || 1) - 1 ? 'default' : 'pointer',
                  fontWeight: 700,
                }}
                title="Сдвинуть вправо (позже в видео)"
              >
                ➡️
              </button>
            </div>
          )}

          {isLocal ? (
            <div style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', marginLeft: 'auto' }}>
              <span>✓ В photos/</span>
            </div>
          ) : (
            <button
              onClick={(e) => onSaveSingle(e, index)}
              disabled={isSingleSaving}
              style={{
                flex: 1,
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                padding: '0.35rem 0.5rem',
                fontSize: '0.74rem',
                fontWeight: 700,
                cursor: isSingleSaving ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem',
                marginLeft: 'auto',
              }}
              title="Скачать фото в news/.../photos/"
            >
              {isSingleSaving ? '⏳...' : '💾 В папку'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
