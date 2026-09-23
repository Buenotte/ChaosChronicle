import { TEXT_COLORS, BOX_COLORS, SHORTS_FONTS } from './shortsConfig'

export default function ShortsSpeechSubtitlesControls({
  enabled, setEnabled, font, setFont, color, setColor, inactiveColor, setInactiveColor, fontSize, setFontSize,
  posY, setPosY, boxMode, setBoxMode, boxColor, setBoxColor, boxOpacity, setBoxOpacity, pacing, setPacing, onDirty,
}) {
  const isBoxOn = (boxMode || 'pill') !== 'none'

  return (
    <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '10px', border: enabled ? '1.5px solid #06b6d4' : '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.86rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!enabled} onChange={e => { setEnabled(e.target.checked); if (onDirty) onDirty(); }} style={{ accentColor: '#06b6d4', width: '17px', height: '17px', cursor: 'pointer' }} />
          🎬 Живые цветные субтитры речи в центре
        </label>
        <span style={{ fontSize: '0.72rem', color: enabled ? '#10b981' : '#6b7280', fontWeight: 700 }}>
          {enabled ? '⚡ ВКЛЮЧЕНЫ' : 'ВЫКЛ'}
        </span>
      </div>

      {enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', paddingTop: '0.35rem', borderTop: '1px solid #1e293b' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>🔤 Шрифт субтитров:</span>
              <select value={font || 'impact'} onChange={e => { setFont(e.target.value); if (onDirty) onDirty(); }} style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', padding: '0.35rem', fontSize: '0.78rem' }}>
                {SHORTS_FONTS.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
              </select>
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>📏 Размер ({fontSize || 115}px):</span>
              <input type="range" min="70" max="160" value={fontSize || 115} onChange={e => { setFontSize(Number(e.target.value)); if (onDirty) onDirty(); }} style={{ width: '100%', accentColor: '#06b6d4' }} />
            </div>
          </div>

          {/* 🎨 ВЫБОР ЦВЕТОВ: АКТИВНОЕ СЛОВО И ОСТАЛЬНЫЕ СЛОВА */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', background: '#090d16', padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#38bdf8', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>🔥 Активное слово:</span>
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {TEXT_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setColor(c.id); if (onDirty) onDirty(); }}
                    style={{
                      width: '20px', height: '20px', borderRadius: '50%', background: c.hex,
                      border: (color || 'yellow') === c.id ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)',
                      cursor: 'pointer', boxShadow: (color || 'yellow') === c.id ? '0 0 8px #38bdf8' : 'none'
                    }}
                    title={`Активное: ${c.label}`}
                  />
                ))}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '0.2rem' }}>⚪ Остальные слова:</span>
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {TEXT_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { if (setInactiveColor) setInactiveColor(c.id); if (onDirty) onDirty(); }}
                    style={{
                      width: '20px', height: '20px', borderRadius: '50%', background: c.hex,
                      border: (inactiveColor || 'white') === c.id ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)',
                      cursor: 'pointer', boxShadow: (inactiveColor || 'white') === c.id ? '0 0 8px #a855f7' : 'none'
                    }}
                    title={`Остальные: ${c.label}`}
                  />
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>🌊 Режим показа:</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button type="button" onClick={() => { setPacing('wave'); if (onDirty) onDirty(); }} style={{ flex: 1.2, background: (!pacing || pacing === 'wave' || pacing === 'standard') ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }} title="Плавная волна 3-4 слова">🌊 Волна (3-4)</button>
                <button type="button" onClick={() => { setPacing('blitz'); if (onDirty) onDirty(); }} style={{ flex: 1, background: (pacing === 'blitz' || pacing === 'two') ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }} title="2 слова в строку">🔥 2 слова</button>
                <button type="button" onClick={() => { setPacing('single'); if (onDirty) onDirty(); }} style={{ flex: 1, background: pacing === 'single' ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }} title="1 слово по центру">⚡ 1 слово</button>
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>📍 Высота ({posY || 980}px):</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button type="button" onClick={() => { setPosY(820); if (onDirty) onDirty(); }} style={{ flex: 1, background: posY <= 870 ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>820px</button>
                <button type="button" onClick={() => { setPosY(980); if (onDirty) onDirty(); }} style={{ flex: 1, background: posY > 870 && posY < 1100 ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>980px</button>
                <button type="button" onClick={() => { setPosY(1200); if (onDirty) onDirty(); }} style={{ flex: 1, background: posY >= 1100 ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem', fontSize: '0.7rem', cursor: 'pointer' }}>1200px</button>
              </div>
            </div>
          </div>

          {/* 🏷️ УПРАВЛЕНИЕ ПЛАШКОЙ СУБТИТРОВ */}
          <div style={{ background: '#090d16', padding: '0.55rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: isBoxOn ? '#38bdf8' : '#9ca3af' }}>
                  🏷️ Плашка субтитров:
                </span>
                <span style={{ fontSize: '0.72rem', color: isBoxOn ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                  {isBoxOn ? 'ВКЛ' : 'ВЫКЛ'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setBoxMode(isBoxOn ? 'none' : 'pill')
                  if (onDirty) onDirty()
                }}
                style={{
                  background: isBoxOn ? '#ef444422' : '#10b98122',
                  color: isBoxOn ? '#ef4444' : '#10b981',
                  border: isBoxOn ? '1px solid #ef4444' : '1px solid #10b981',
                  borderRadius: '5px', padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
                }}
              >
                {isBoxOn ? '❌ Выключить плашку' : '✨ Включить плашку'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {[
                { id: 'pill', label: '🔘 Овальная' },
                { id: 'solid', label: '📐 Прямоугольная' },
                { id: 'glow', label: '✨ Неон' },
                { id: 'none', label: '🚫 Без плашки' },
              ].map(b => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => { setBoxMode(b.id); if (onDirty) onDirty(); }}
                  style={{
                    flex: 1,
                    background: (boxMode || 'pill') === b.id ? (b.id === 'none' ? '#ef4444' : '#0284c7') : '#1e293b',
                    color: '#fff',
                    border: '1px solid #334155',
                    borderRadius: '4px',
                    padding: '0.25rem 0.2rem',
                    fontSize: '0.7rem',
                    fontWeight: (boxMode || 'pill') === b.id ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>

            {isBoxOn && (
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '0.5rem', alignItems: 'center', paddingTop: '0.35rem', borderTop: '1px solid #1e293b' }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>🎨 Цвет фона плашки:</span>
                  <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                    {BOX_COLORS.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { if (setBoxColor) setBoxColor(c.id); if (onDirty) onDirty(); }}
                        style={{
                          width: '20px', height: '20px', borderRadius: '4px', background: c.hex,
                          border: (boxColor || 'black') === c.id ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                          cursor: 'pointer', boxShadow: (boxColor || 'black') === c.id ? '0 0 6px #38bdf8' : 'none'
                        }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>
                    🌫️ Прозрачность ({boxOpacity ?? 88}%):
                  </span>
                  <input
                    type="range" min="20" max="100" step="5"
                    value={boxOpacity ?? 88}
                    onChange={e => { if (setBoxOpacity) setBoxOpacity(Number(e.target.value)); if (onDirty) onDirty(); }}
                    style={{ width: '100%', accentColor: '#06b6d4' }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
