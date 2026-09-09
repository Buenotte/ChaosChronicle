import React, { useState } from 'react'

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
  { id: '#000000', label: 'Черный' }, { id: '#18181b', label: 'Графит' },
  { id: '#dc2626', label: 'Красный' }, { id: '#b91c1c', label: 'Темно-красный' },
  { id: '#f59e0b', label: 'Желтый' }, { id: '#1e3a8a', label: 'Синий' },
  { id: '#ffffff', label: 'Белый' },
]

export default function LineBadgeControls({
  lineBadges = {}, setLineBadges, previewLines = [],
  setBoxStyle, setHasBox, setBoxOpacity,
}) {
  const [tab, setTab] = useState('global')
  const cfg = lineBadges || {}
  const enabled = !!cfg.enabled
  const curStyle = cfg.style || 'solid', curShadow = cfg.shadow || 'soft', curColor = cfg.color || '#000000'
  const curOpacity = cfg.opacity !== undefined ? Number(cfg.opacity) : 90
  const tiltMode = cfg.tiltMode || 'none'
  const lineTilts = Array.isArray(cfg.lineTilts) ? cfg.lineTilts : []
  const lineColors = Array.isArray(cfg.lineColors) ? cfg.lineColors : []
  const lineStyles = Array.isArray(cfg.lineStyles) ? cfg.lineStyles : []
  const linesEnabled = Array.isArray(cfg.linesEnabled) ? cfg.linesEnabled : []

  const update = (patch) => {
    const next = { ...cfg, ...patch }
    setLineBadges(next)
    if (patch.opacity !== undefined && setBoxOpacity) setBoxOpacity(Number(patch.opacity))
    if (patch.enabled !== undefined) {
      if (patch.enabled) { if (setBoxStyle) setBoxStyle('per_line'); if (setHasBox) setHasBox(true); }
      else { if (setBoxStyle) setBoxStyle('none'); if (setHasBox) setHasBox(false); }
    } else if (!enabled) {
      next.enabled = true; setLineBadges(next);
      if (setBoxStyle) setBoxStyle('per_line'); if (setHasBox) setHasBox(true);
    }
  }

  const setLineProp = (field, idx, val) => {
    const arr = [...(Array.isArray(cfg[field]) ? cfg[field] : [])]
    arr[idx] = val
    update({ [field]: arr })
  }

  const applyGlobalToAll = () => {
    const cnt = previewLines.length || 4
    update({
      lineStyles: Array(cnt).fill(curStyle),
      lineColors: Array(cnt).fill(curColor),
      linesEnabled: Array(cnt).fill(true),
    })
  }

  return (
    <div style={{ background: '#141416', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: enabled ? '#f59e0b' : '#9ca3af' }}>🏷️ Плашки под строками</span>
          {enabled && <span style={{ fontSize: '0.65rem', background: '#f59e0b22', color: '#f59e0b', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>АКТИВНО</span>}
        </div>
        <button type="button" onClick={() => update({ enabled: !enabled })} style={{ background: enabled ? '#f59e0b' : '#27272a', color: enabled ? '#000' : '#d4d4d8', border: 'none', borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
          {enabled ? 'Включено' : 'Выключено'}
        </button>
      </div>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', borderTop: '1px solid #27272a', paddingTop: '0.6rem' }}>
          <div style={{ display: 'flex', background: '#09090b', borderRadius: '6px', padding: '2px', border: '1px solid #27272a' }}>
            <button type="button" onClick={() => setTab('global')} style={{ flex: 1, padding: '0.35rem', fontSize: '0.72rem', fontWeight: tab === 'global' ? 700 : 500, background: tab === 'global' ? '#27272a' : 'transparent', color: tab === 'global' ? '#f59e0b' : '#9ca3af', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              🌐 Общие настройки
            </button>
            <button type="button" onClick={() => setTab('per_line')} style={{ flex: 1, padding: '0.35rem', fontSize: '0.72rem', fontWeight: tab === 'per_line' ? 700 : 500, background: tab === 'per_line' ? '#27272a' : 'transparent', color: tab === 'per_line' ? '#38bdf8' : '#9ca3af', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              🎯 Для каждой строки ({previewLines.length})
            </button>
          </div>

          {tab === 'global' ? (
            <>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Форма плашки:</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.3rem' }}>
                  {BADGE_STYLES.map(s => (
                    <button key={s.id} type="button" onClick={() => update({ style: s.id })} style={{ background: curStyle === s.id ? '#f59e0b22' : '#18181b', color: curStyle === s.id ? '#f59e0b' : '#e4e4e7', border: curStyle === s.id ? '1.5px solid #f59e0b' : '1px solid #27272a', borderRadius: '6px', padding: '0.3rem 0.45rem', fontSize: '0.7rem', fontWeight: curStyle === s.id ? 700 : 500, cursor: 'pointer', textAlign: 'left' }} title={s.desc}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Тень / 3D объем:</label>
                <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                  {BADGE_SHADOWS.map(s => (
                    <button key={s.id} type="button" onClick={() => update({ shadow: s.id })} style={{ background: curShadow === s.id ? '#38bdf822' : '#18181b', color: curShadow === s.id ? '#38bdf8' : '#e4e4e7', border: curShadow === s.id ? '1.5px solid #38bdf8' : '1px solid #27272a', borderRadius: '5px', padding: '0.2rem 0.45rem', fontSize: '0.7rem', fontWeight: curShadow === s.id ? 700 : 500, cursor: 'pointer' }}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, display: 'block', marginBottom: '0.3rem' }}>Базовый цвет плашки:</label>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {BADGE_COLORS.map(c => (
                    <button key={c.id} type="button" onClick={() => update({ color: c.id })} style={{ width: '22px', height: '22px', borderRadius: '5px', background: c.id, border: curColor === c.id ? '2px solid #f59e0b' : '1px solid #3f3f46', cursor: 'pointer', transform: curColor === c.id ? 'scale(1.15)' : 'scale(1)' }} title={c.label} />
                  ))}
                  <input type="color" value={curColor} onChange={e => update({ color: e.target.value })} style={{ width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '5px', cursor: 'pointer', background: 'transparent' }} title="Кастомный HEX цвет" />
                </div>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <label style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600 }}>Динамика / Наклон:</label>
                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    <button type="button" onClick={() => update({ tiltMode: tiltMode === 'zigzag' ? 'none' : 'zigzag' })} style={{ background: tiltMode === 'zigzag' ? '#a855f7' : '#27272a', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.15rem 0.4rem', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
                      🔀 Зиг-заг ({tiltMode === 'zigzag' ? 'Вкл' : 'Выкл'})
                    </button>
                    <button type="button" onClick={() => update({ tiltMode: tiltMode === 'custom' ? 'none' : 'custom' })} style={{ background: tiltMode === 'custom' ? '#6366f1' : '#27272a', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.15rem 0.4rem', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer' }}>
                      🎛️ Ручной наклон
                    </button>
                  </div>
                </div>
                {tiltMode === 'custom' && previewLines.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', background: '#09090b', padding: '0.4rem', borderRadius: '6px' }}>
                    {previewLines.map((lineText, idx) => {
                      const val = Number(lineTilts[idx]) || 0
                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <span style={{ fontSize: '0.68rem', color: '#9ca3af', width: '70px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{idx + 1}. {lineText}</span>
                          <input type="range" min="-6" max="6" step="0.5" value={val} onChange={e => setLineProp('lineTilts', idx, Number(e.target.value))} style={{ flex: 1, accentColor: '#6366f1', height: '4px', cursor: 'pointer' }} />
                          <span style={{ fontSize: '0.68rem', color: '#6366f1', minWidth: '30px', textAlign: 'right', fontWeight: 600 }}>{val > 0 ? `+${val}°` : `${val}°`}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600, width: '100px' }}>Прозрачность:</label>
                <input type="range" min="10" max="100" value={curOpacity} onChange={e => update({ opacity: Number(e.target.value) })} style={{ flex: 1, accentColor: '#f59e0b', height: '4px', cursor: 'pointer' }} />
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', minWidth: '32px', textAlign: 'right', fontWeight: 700 }}>{curOpacity}%</span>
              </div>

              <button type="button" onClick={applyGlobalToAll} style={{ background: '#27272a', color: '#94a3b8', border: '1px dashed #3f3f46', borderRadius: '6px', padding: '0.35rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
                🔄 Применить эти параметры ко всем строкам
              </button>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Настройка плашки для каждой отдельной строки:</div>
              {previewLines.map((lineText, idx) => {
                const isLineOn = linesEnabled[idx] !== false
                const lStyle = lineStyles[idx] || curStyle
                const lCol = lineColors[idx] || curColor
                const lTilt = Number(lineTilts[idx]) || 0
                return (
                  <div key={idx} style={{ background: '#09090b', border: isLineOn ? '1px solid #3f3f46' : '1px dashed #27272a', borderRadius: '6px', padding: '0.4rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flex: 1, minWidth: '120px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b' }}>#{idx + 1}</span>
                        <span style={{ fontSize: '0.72rem', color: '#e4e4e7', fontWeight: 600, maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lineText || `Строка ${idx + 1}`}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', minWidth: '120px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#a1a1aa' }}>Наклон:</span>
                        <input type="range" min="-6" max="6" step="0.5" value={lTilt} onChange={e => setLineProp('lineTilts', idx, Number(e.target.value))} style={{ flex: 1, accentColor: '#6366f1', height: '3px', cursor: 'pointer' }} />
                        <span style={{ fontSize: '0.65rem', color: '#6366f1', minWidth: '24px', textAlign: 'right', fontWeight: 600 }}>{lTilt > 0 ? `+${lTilt}°` : `${lTilt}°`}</span>
                      </div>
                      <button type="button" onClick={() => setLineProp('linesEnabled', idx, !isLineOn)} style={{ background: isLineOn ? '#10b98122' : '#ef444422', color: isLineOn ? '#10b981' : '#ef4444', border: isLineOn ? '1px solid #10b981' : '1px solid #ef4444', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                        {isLineOn ? '✓ Плашка' : '✕ Без плашки'}
                      </button>
                    </div>
                    {isLineOn && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', paddingTop: '0.2rem', borderTop: '1px solid #18181b' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto' }}>
                          {BADGE_STYLES.map(s => (
                            <button key={s.id} type="button" onClick={() => setLineProp('lineStyles', idx, s.id)} style={{ background: lStyle === s.id ? '#f59e0b22' : '#18181b', color: lStyle === s.id ? '#f59e0b' : '#a1a1aa', border: lStyle === s.id ? '1px solid #f59e0b' : '1px solid #27272a', borderRadius: '4px', padding: '0.15rem 0.35rem', fontSize: '0.65rem', fontWeight: lStyle === s.id ? 700 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                              {s.label}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <span style={{ fontSize: '0.65rem', color: '#a1a1aa' }}>Цвет:</span>
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            {BADGE_COLORS.slice(0, 5).map(c => (
                              <button key={c.id} type="button" onClick={() => setLineProp('lineColors', idx, c.id)} style={{ width: '16px', height: '16px', borderRadius: '3px', background: c.id, border: lCol === c.id ? '2px solid #f59e0b' : '1px solid #3f3f46', cursor: 'pointer' }} />
                            ))}
                            <input type="color" value={lCol} onChange={e => setLineProp('lineColors', idx, e.target.value)} style={{ width: '18px', height: '18px', padding: 0, border: 'none', borderRadius: '3px', cursor: 'pointer', background: 'transparent' }} />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
