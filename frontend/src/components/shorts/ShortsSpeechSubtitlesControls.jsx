import { TEXT_COLORS, SHORTS_FONTS } from './shortsConfig'

export default function ShortsSpeechSubtitlesControls({
  enabled, setEnabled, font, setFont, color, setColor, fontSize, setFontSize,
  posY, setPosY, boxMode, setBoxMode, pacing, setPacing, onDirty,
}) {
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>🔥 Цвет ключевых слов:</span>
              <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                {TEXT_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setColor(c.id); if (onDirty) onDirty(); }}
                    style={{
                      width: '22px', height: '22px', borderRadius: '50%', background: c.hex,
                      border: color === c.id ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)',
                      cursor: 'pointer', boxShadow: color === c.id ? '0 0 8px #38bdf8' : 'none'
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>🌊 Режим показа:</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button type="button" onClick={() => { setPacing('wave'); if (onDirty) onDirty(); }} style={{ flex: 1.2, background: (!pacing || pacing === 'wave' || pacing === 'standard') ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }} title="Плавная волна 3-4 слова">🌊 Волна (3-4)</button>
                <button type="button" onClick={() => { setPacing('blitz'); if (onDirty) onDirty(); }} style={{ flex: 1, background: (pacing === 'blitz' || pacing === 'two') ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }} title="2 слова в строку">🔥 2 слова</button>
                <button type="button" onClick={() => { setPacing('single'); if (onDirty) onDirty(); }} style={{ flex: 1, background: pacing === 'single' ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }} title="1 слово по центру">⚡ 1 слово</button>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
            <div>
              <span style={{ fontSize: '0.74rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>📦 Подложка / Фон:</span>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                {[
                  { id: 'pill', label: '🔘 Плашка' },
                  { id: 'glow', label: '✨ Неон' },
                  { id: 'none', label: '3D Контур' },
                ].map(b => (
                  <button key={b.id} type="button" onClick={() => { setBoxMode(b.id); if (onDirty) onDirty(); }} style={{ flex: 1, background: (boxMode || 'pill') === b.id ? '#059669' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.25rem', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer' }}>
                    {b.label}
                  </button>
                ))}
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
        </div>
      )}
    </div>
  )
}
