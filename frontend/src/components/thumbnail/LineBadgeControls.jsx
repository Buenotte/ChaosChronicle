export const BADGE_STYLES = [
  { id: 'solid', label: '📄 Классика', desc: 'Ровная скругленная плашка' },
  { id: 'torn', label: '⚡ Рваный гранж', desc: 'Зубчатые рваные края бумаги' },
  { id: 'dashed', label: '✂️ Пунктир', desc: 'Дерзкая пунктирная рамка' },
  { id: 'slanted', label: '📐 Скос', desc: 'Динамичный срез (Action Skew)' },
  { id: 'tape', label: '🩹 Скотч', desc: 'Стикер / клейкая лента' },
]

export const BADGE_SHADOWS = [
  { id: 'soft', label: '🌑 Глубокая' },
  { id: 'hard', label: '⬛ Брутальная 3D' },
  { id: 'glow', label: '💡 Неон' },
  { id: 'none', label: '🚫 Без тени' },
]

export const BADGE_COLORS = [
  { id: '#000000', label: 'Черный' },
  { id: '#18181b', label: 'Графит' },
  { id: '#dc2626', label: 'Красный' },
  { id: '#b91c1c', label: 'Темно-красный' },
  { id: '#f59e0b', label: 'Желтый' },
  { id: '#1e3a8a', label: 'Синий' },
  { id: '#ffffff', label: 'Белый' },
]

export default function LineBadgeControls({
  lineBadges = {},
  setLineBadges,
  previewLines = [],
  setBoxStyle,
  setHasBox,
  setBoxOpacity,
}) {
  const cfg = lineBadges || {}
  const enabled = !!cfg.enabled
  const curStyle = cfg.style || 'solid'
  const curShadow = cfg.shadow || 'soft'
  const curColor = cfg.color || '#000000'
  const curOpacity = cfg.opacity !== undefined ? Number(cfg.opacity) : 90
  const tiltMode = cfg.tiltMode || 'none'
  const lineTilts = Array.isArray(cfg.lineTilts) ? cfg.lineTilts : []
  const lineColors = Array.isArray(cfg.lineColors) ? cfg.lineColors : []
  const perLineColorsEnabled = !!cfg.perLineColorsEnabled

  const update = (patch) => {
    const next = { ...cfg, ...patch }
    setLineBadges(next)
    if (patch.opacity !== undefined && setBoxOpacity) setBoxOpacity(Number(patch.opacity))
    if (patch.enabled !== undefined) {
      if (patch.enabled) {
        if (setBoxStyle) setBoxStyle('per_line')
        if (setHasBox) setHasBox(true)
      } else {
        if (setBoxStyle) setBoxStyle('none')
        if (setHasBox) setHasBox(false)
      }
    } else if (!enabled) {
      next.enabled = true
      setLineBadges(next)
      if (setBoxStyle) setBoxStyle('per_line')
      if (setHasBox) setHasBox(true)
    }
  }

  return (
    <div style={{ background: '#141416', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Шапка с тумблером включения */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: enabled ? '#f59e0b' : '#9ca3af' }}>
            🏷️ Плашки под каждой строкой
          </span>
          {enabled && (
            <span style={{ fontSize: '0.68rem', background: '#f59e0b22', color: '#f59e0b', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>
              АКТИВНО
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => update({ enabled: !enabled })}
          style={{
            background: enabled ? '#f59e0b' : '#27272a',
            color: enabled ? '#000' : '#d4d4d8',
            border: 'none',
            borderRadius: '6px',
            padding: '0.25rem 0.65rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          {enabled ? 'Включено' : 'Выключено'}
        </button>
      </div>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', borderTop: '1px solid #27272a', paddingTop: '0.65rem' }}>
          {/* 1. Стиль формы плашки */}
          <div>
            <label style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Контур и текстура плашки:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.35rem' }}>
              {BADGE_STYLES.map(s => {
                const active = curStyle === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => update({ style: s.id })}
                    style={{
                      background: active ? '#f59e0b22' : '#18181b',
                      color: active ? '#f59e0b' : '#e4e4e7',
                      border: active ? '1.5px solid #f59e0b' : '1px solid #27272a',
                      borderRadius: '6px',
                      padding: '0.35rem 0.5rem',
                      fontSize: '0.72rem',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    title={s.desc}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 2. Эффект тени плашки */}
          <div>
            <label style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, display: 'block', marginBottom: '0.35rem' }}>
              Тень / Объем плашки:
            </label>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {BADGE_SHADOWS.map(s => {
                const active = curShadow === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => update({ shadow: s.id })}
                    style={{
                      background: active ? '#38bdf822' : '#18181b',
                      color: active ? '#38bdf8' : '#e4e4e7',
                      border: active ? '1.5px solid #38bdf8' : '1px solid #27272a',
                      borderRadius: '5px',
                      padding: '0.2rem 0.5rem',
                      fontSize: '0.72rem',
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                    }}
                  >
                    {s.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 3. Углы наклона строк */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600 }}>
                Углы наклона строк:
              </label>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button
                  type="button"
                  onClick={() => update({ tiltMode: tiltMode === 'zigzag' ? 'none' : 'zigzag' })}
                  style={{
                    background: tiltMode === 'zigzag' ? '#a855f7' : '#27272a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                  title="Автоматическое чередование наклона строк для дерзкого эффекта"
                >
                  🔀 Зиг-заг ({tiltMode === 'zigzag' ? 'Вкл' : 'Выкл'})
                </button>
                <button
                  type="button"
                  onClick={() => update({ tiltMode: tiltMode === 'custom' ? 'none' : 'custom' })}
                  style={{
                    background: tiltMode === 'custom' ? '#6366f1' : '#27272a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.15rem 0.45rem',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  🎛️ Ручной наклон
                </button>
              </div>
            </div>

            {tiltMode === 'custom' && previewLines.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: '#09090b', padding: '0.45rem', borderRadius: '6px' }}>
                {previewLines.map((lineText, idx) => {
                  const val = Number(lineTilts[idx]) || 0
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af', width: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {idx + 1}. {lineText}
                      </span>
                      <input
                        type="range"
                        min="-6"
                        max="6"
                        step="0.5"
                        value={val}
                        onChange={e => {
                          const arr = [...lineTilts]
                          arr[idx] = Number(e.target.value)
                          update({ lineTilts: arr })
                        }}
                        style={{ flex: 1, accentColor: '#6366f1', height: '4px', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.7rem', color: '#6366f1', minWidth: '32px', textAlign: 'right', fontWeight: 600 }}>
                        {val > 0 ? `+${val}°` : `${val}°`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 4. Цвета и прозрачность плашек */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600 }}>
                Цвет плашек:
              </label>
              <button
                type="button"
                onClick={() => update({ perLineColorsEnabled: !perLineColorsEnabled })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: perLineColorsEnabled ? '#f59e0b' : '#94a3b8',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                {perLineColorsEnabled ? 'Общий цвет для всех' : 'Свой цвет для каждой строки'}
              </button>
            </div>

            {!perLineColorsEnabled ? (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {BADGE_COLORS.map(c => {
                  const active = curColor === c.id
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => update({ color: c.id })}
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '5px',
                        background: c.id,
                        border: active ? '2px solid #f59e0b' : '1px solid #3f3f46',
                        cursor: 'pointer',
                        transform: active ? 'scale(1.15)' : 'scale(1)',
                      }}
                      title={c.label}
                    />
                  )
                })}
                <input
                  type="color"
                  value={curColor}
                  onChange={e => update({ color: e.target.value })}
                  style={{ width: '26px', height: '26px', padding: 0, border: 'none', borderRadius: '5px', cursor: 'pointer', background: 'transparent' }}
                  title="Кастомный HEX цвет плашки"
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: '#09090b', padding: '0.45rem', borderRadius: '6px' }}>
                {previewLines.map((lineText, idx) => {
                  const lineCol = lineColors[idx] || curColor
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.7rem', color: '#e4e4e7', width: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {idx + 1}. {lineText}
                      </span>
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        {BADGE_COLORS.slice(0, 5).map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              const arr = [...lineColors]
                              arr[idx] = c.id
                              update({ lineColors: arr })
                            }}
                            style={{
                              width: '16px',
                              height: '16px',
                              borderRadius: '4px',
                              background: c.id,
                              border: lineCol === c.id ? '2px solid #f59e0b' : '1px solid #3f3f46',
                              cursor: 'pointer',
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          value={lineCol}
                          onChange={e => {
                            const arr = [...lineColors]
                            arr[idx] = e.target.value
                            update({ lineColors: arr })
                          }}
                          style={{ width: '18px', height: '18px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 5. Прозрачность плашек */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <label style={{ fontSize: '0.75rem', color: '#a1a1aa', fontWeight: 600, width: '110px' }}>
              Прозрачность:
            </label>
            <input
              type="range"
              min="10"
              max="100"
              value={curOpacity}
              onChange={e => update({ opacity: Number(e.target.value) })}
              style={{ flex: 1, accentColor: '#f59e0b', height: '4px', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', minWidth: '36px', textAlign: 'right', fontWeight: 700 }}>
              {curOpacity}%
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
