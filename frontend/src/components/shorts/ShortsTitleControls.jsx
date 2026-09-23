import ShortsTypographyControls from './ShortsTypographyControls'
import LineBadgeControls from '../thumbnail/LineBadgeControls'
import { SHORTS_FONTS, TEXT_COLORS } from './shortsConfig'

export default function ShortsTitleControls({
  showHookTitle, setShowHookTitle,
  text, setText,
  font, setFont,
  fontSize, setFontSize,
  fontColor, setFontColor,
  strokeWidth, setStrokeWidth,
  strokeColor, setStrokeColor,
  shadowDistance, setShadowDistance,
  shadowColor, setShadowColor,
  wordColors, setWordColors,
  wordFontSizes, setWordFontSizes,
  posY, setPosY,
  lineBadges, setLineBadges,
  setBoxOpacity, setBoxEnabled,
  wordsList, displayText,
  onDirty,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', background: '#111827', padding: '0.75rem', borderRadius: '8px', border: '1px solid #374151' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!showHookTitle} onChange={e => { setShowHookTitle(e.target.checked); onDirty() }} style={{ accentColor: '#f43f5e', width: '16px', height: '16px', cursor: 'pointer' }} />
          Показывать верхний заголовок (Хук)
        </label>
        <span style={{ fontSize: '0.72rem', color: showHookTitle ? '#10b981' : '#6b7280', fontWeight: 700 }}>
          {showHookTitle ? 'ВКЛ' : 'ВЫКЛ'}
        </span>
      </div>

      {showHookTitle && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <textarea rows={2} value={text} onChange={e => { setText(e.target.value); onDirty() }} placeholder="Введите текст заголовка..." style={{ background: '#090d16', border: '1px solid #374151', color: '#fff', borderRadius: '6px', padding: '0.45rem 0.65rem', fontSize: '0.82rem', resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button type="button" onClick={() => { setPosY(140); onDirty() }} style={{ flex: 1, background: posY <= 350 ? '#f43f5e' : '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: '4px', padding: '0.3rem', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 600 }}>🔝 Вверху</button>
            <button type="button" onClick={() => { setPosY(720); onDirty() }} style={{ flex: 1, background: posY > 350 && posY < 1100 ? '#f43f5e' : '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: '4px', padding: '0.3rem', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 600 }}>🎯 В центре</button>
            <button type="button" onClick={() => { setPosY(1300); onDirty() }} style={{ flex: 1, background: posY >= 1100 ? '#f43f5e' : '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: '4px', padding: '0.3rem', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 600 }}>🔻 Внизу</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '0.15rem' }}>🔤 Шрифт:</span>
              <select value={font} onChange={e => { setFont(e.target.value); onDirty() }} style={{ width: '100%', background: '#090d16', border: '1px solid #374151', color: '#fff', borderRadius: '4px', padding: '0.3rem', fontSize: '0.75rem' }}>
                {SHORTS_FONTS.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
              </select>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block', marginBottom: '0.15rem' }}>🎨 Цвет:</span>
              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                {TEXT_COLORS.map(c => (<button key={c.id} type="button" onClick={() => { setFontColor(c.id); onDirty() }} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c.hex, border: fontColor === c.id ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)', cursor: 'pointer' }} title={c.label} />))}
              </div>
            </div>
          </div>

          <ShortsTypographyControls strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth} strokeColor={strokeColor} setStrokeColor={setStrokeColor} shadowDistance={shadowDistance} setShadowDistance={setShadowDistance} shadowColor={shadowColor} setShadowColor={setShadowColor} words={wordsList} wordColors={wordColors} setWordColors={setWordColors} wordFontSizes={wordFontSizes} setWordFontSizes={setWordFontSizes} fontColor={fontColor} fontSize={fontSize} onDirty={onDirty} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block' }}>📏 Размер ({fontSize}px):</span>
              <input type="range" min="40" max="220" value={fontSize} onChange={e => { setFontSize(Number(e.target.value)); onDirty() }} style={{ width: '100%' }} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'block' }}>📍 Высота Y ({posY}px):</span>
              <input type="range" min="40" max="1750" value={posY} onChange={e => { setPosY(Number(e.target.value)); onDirty() }} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#090d16', padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #374151' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: (lineBadges?.enabled || (boxEnabled && lineBadges?.enabled !== false)) ? '#f59e0b' : '#9ca3af' }}>
                🏷️ Плашки под строками:
              </span>
              <span style={{ fontSize: '0.72rem', color: (lineBadges?.enabled || (boxEnabled && lineBadges?.enabled !== false)) ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                {(lineBadges?.enabled || (boxEnabled && lineBadges?.enabled !== false)) ? 'ВКЛ' : 'ВЫКЛ (Без плашек)'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const next = !(lineBadges?.enabled || (boxEnabled && lineBadges?.enabled !== false))
                setBoxEnabled(next)
                setLineBadges(prev => ({ ...(prev || {}), enabled: next }))
                onDirty()
              }}
              style={{
                background: (lineBadges?.enabled || (boxEnabled && lineBadges?.enabled !== false)) ? '#ef444422' : '#10b98122',
                color: (lineBadges?.enabled || (boxEnabled && lineBadges?.enabled !== false)) ? '#ef4444' : '#10b981',
                border: (lineBadges?.enabled || (boxEnabled && lineBadges?.enabled !== false)) ? '1px solid #ef4444' : '1px solid #10b981',
                borderRadius: '5px', padding: '0.2rem 0.55rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              {(lineBadges?.enabled || (boxEnabled && lineBadges?.enabled !== false)) ? '❌ Выключить плашки' : '✨ Включить плашки'}
            </button>
          </div>

          <LineBadgeControls lineBadges={lineBadges} setLineBadges={(newBadges) => { setLineBadges(newBadges); onDirty() }} previewLines={displayText.split('\n').filter(Boolean)} setBoxOpacity={(op) => { setBoxOpacity(op); onDirty() }} setHasBox={(has) => { setBoxEnabled(has); onDirty() }} />
        </>
      )}
    </div>
  )
}
