export default function PositionControls({
  offsetX = 50, setOffsetX = null,
  offsetY = 50, setOffsetY = null,
  textAlign = 'center', setTextAlign = null,
  setPosition = null,
}) {
  return (
    <div style={{ background: '#18181b', padding: '0.65rem 0.75rem', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.82rem', color: '#f4f4f5', fontWeight: 700 }}>📍 Расположение (2D Drag):</label>
        <span style={{ fontSize: '0.76rem', color: '#38bdf8', fontWeight: 700 }}>
          X: {offsetX !== undefined && offsetX !== null ? offsetX : 50}% • Y: {offsetY !== undefined && offsetY !== null ? offsetY : 50}%
        </span>
      </div>

      {/* Выравнивание текста */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600 }}>Выравнивание текста:</span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
          {[
            { id: 'left', label: '⬅️ Слева', title: 'По левому краю' },
            { id: 'center', label: '🎯 Центр', title: 'По центру' },
            { id: 'right', label: '➡️ Справа', title: 'По правому краю' },
          ].map(a => {
            const isActive = (textAlign || 'center') === a.id
            return (
              <button
                key={a.id}
                type="button"
                title={a.title}
                onClick={() => setTextAlign && setTextAlign(a.id)}
                style={{
                  padding: '0.3rem', borderRadius: '6px',
                  background: isActive ? '#ec4899' : '#09090b',
                  border: isActive ? '1px solid #f472b6' : '1px solid #27272a',
                  color: '#fff', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600
                }}
              >
                {a.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Быстрые пресеты */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
        {[{ label: '📐 Слева', x: 28, y: 50 }, { label: '🎯 Центр', x: 50, y: 50 }, { label: '📐 Справа', x: 72, y: 50 }].map((p, i) => (
          <button
            key={i}
            type="button"
            onClick={() => { if (setOffsetX) setOffsetX(p.x); if (setOffsetY) setOffsetY(p.y); if (setPosition) setPosition('custom'); }}
            style={{ padding: '0.3rem', borderRadius: '6px', background: (offsetX === p.x) ? '#3b82f6' : '#09090b', border: (offsetX === p.x) ? '1px solid #60a5fa' : '1px solid #27272a', color: '#fff', cursor: 'pointer', fontSize: '0.74rem', fontWeight: 600 }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Слайдер X */}
      {setOffsetX && (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#a1a1aa', width: '18px' }}>X:</span>
          <input
            type="range" min="5" max="95" step="1"
            value={offsetX !== undefined && offsetX !== null ? Number(offsetX) : 50}
            onChange={e => { setOffsetX(Number(e.target.value)); if (setPosition) setPosition('custom'); }}
            style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer', height: '4px' }}
            title="Позиция по горизонтали (X)"
          />
          <span style={{ fontSize: '0.7rem', color: '#71717a' }}>{offsetX}%</span>
        </div>
      )}

      {/* Слайдер Y */}
      {setOffsetY && (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#a1a1aa', width: '18px' }}>Y:</span>
          <input
            type="range" min="5" max="95" step="1"
            value={offsetY !== undefined && offsetY !== null ? Number(offsetY) : 50}
            onChange={e => { setOffsetY(Number(e.target.value)); if (setPosition) setPosition('custom'); }}
            style={{ flex: 1, accentColor: '#ec4899', cursor: 'pointer', height: '4px' }}
            title="Позиция по вертикали (Y)"
          />
          <span style={{ fontSize: '0.7rem', color: '#71717a' }}>{offsetY}%</span>
        </div>
      )}
    </div>
  )
}
