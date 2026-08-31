import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'

export const SHORTS_FONTS = [
  { id: 'impact', name: 'Impact (Классика)', family: 'Impact, sans-serif' },
  { id: 'arial_black', name: 'Arial Black (Жирный)', family: '"Arial Black", sans-serif' },
  { id: 'Buran_USSR.ttf', name: 'Buran USSR (Плакат)', family: '"Buran USSR", Impact, sans-serif' },
  { id: 'RussoOne-Regular.ttf', name: 'Russo One (Современный)', family: '"Russo One", sans-serif' },
  { id: 'DelaGothicOne-Regular.ttf', name: 'Dela Gothic (Монолит)', family: '"Dela Gothic One", sans-serif' },
  { id: 'RubikMonoOne-Regular.ttf', name: 'Rubik Mono (Плотный)', family: '"Rubik Mono One", sans-serif' },
  { id: 'Saxonia_Antiqua_Bold.ttf', name: 'Saxonia Antiqua Bold', family: '"Saxonia Antiqua", serif' },
]

export const TEXT_COLORS = [
  { id: 'yellow', hex: '#FFE600', label: 'Желтый' },
  { id: 'white', hex: '#FFFFFF', label: 'Белый' },
  { id: 'red', hex: '#FF2A2A', label: 'Красный' },
  { id: 'cyan', hex: '#00F0FF', label: 'Голубой' },
  { id: 'green', hex: '#00FF66', label: 'Зеленый' },
  { id: 'orange', hex: '#FF8C00', label: 'Оранжевый' },
]

export const BOX_COLORS = [
  { id: 'black', hex: '#000000', label: 'Черный' },
  { id: 'red', hex: '#FF2A2A', label: 'Красный' },
  { id: 'blue', hex: '#1D4ED8', label: 'Синий' },
  { id: 'yellow', hex: '#FFE600', label: 'Желтый' },
  { id: 'purple', hex: '#7C3AED', label: 'Фиолетовый' },
]

export const SHADOW_PRESETS = [
  { id: 'hard', name: '🌑 3D Тень', css: '3px 3px 0px #000, 0 3px 8px rgba(0,0,0,0.9)' },
  { id: 'soft', name: '🌫️ Мягкая', css: '0 4px 12px rgba(0,0,0,0.8)' },
  { id: 'glow_red', name: '🔴 Неон Красный', css: '0 0 16px #ff0033, 0 0 8px #ff0033' },
  { id: 'glow_yellow', name: '🟡 Неон Желтый', css: '0 0 16px #ffe600, 0 0 8px #ffe600' },
  { id: 'glow_cyan', name: '🔵 Неон Голубой', css: '0 0 16px #00f0ff, 0 0 8px #00f0ff' },
  { id: 'none', name: '🚫 Без тени', css: 'none' },
]

export function wrapShortsText(rawText, maxChars = 12) {
  const inputLines = String(rawText || '').split('\n')
  const wrappedLines = []
  for (const line of inputLines) {
    const words = line.trim().split(/\s+/).filter(Boolean)
    if (words.length === 0) continue
    let cur = ''
    for (const w of words) {
      if (!cur) cur = w
      else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w
      else { wrappedLines.push(cur); cur = w }
    }
    if (cur) wrappedLines.push(cur)
  }
  return wrappedLines.join('\n')
}

export default function ShortsEditorModal({ pkg, previewPhotoUrl = '', shortState, generatingShort, onGenerateShort, onClose }) {
  const cfg = pkg?.shortsConfig || {}
  const [text, setText] = useState(cfg.hookTitle || pkg?.title || '')
  const [font, setFont] = useState(cfg.font || 'impact')
  const [fontSize, setFontSize] = useState(cfg.fontSize || 110)
  const [fontColor, setFontColor] = useState(cfg.fontColor || 'yellow')
  const [shadowStyle, setShadowStyle] = useState(cfg.shadowStyle || 'hard')
  const [boxEnabled, setBoxEnabled] = useState(cfg.boxEnabled ?? true)
  const [boxColor, setBoxColor] = useState(cfg.boxColor || 'black')
  const [boxOpacity, setBoxOpacity] = useState(cfg.boxOpacity ?? 75)
  const [posY, setPosY] = useState(cfg.posY || 200)
  const [isDragging, setIsDragging] = useState(false)
  const [viewMode, setViewMode] = useState(shortState?.hasShort ? 'video' : 'editor')
  const previewRef = useRef(null)

  useEffect(() => {
    if (shortState?.hasShort && shortState?.shortUrl) setViewMode('video')
  }, [shortState?.shortUrl])

  const activeColorHex = TEXT_COLORS.find(c => c.id === fontColor)?.hex || '#FFE600'
  const activeBoxHex = BOX_COLORS.find(c => c.id === boxColor)?.hex || '#000000'
  const activeFontFamily = SHORTS_FONTS.find(f => f.id === font)?.family || 'Impact, sans-serif'
  const activeShadowCss = SHADOW_PRESETS.find(s => s.id === shadowStyle)?.css || '3px 3px 0px #000'

  const maxChars = Math.max(4, Math.floor(920 / ((Number(fontSize) || 110) * 0.58)))
  const displayText = wrapShortsText(text, maxChars) || 'ТЕКСТ ТИЗЕРА'

  const handleApply = async () => {
    if (!onGenerateShort) return
    const res = await onGenerateShort({
      hookTitle: text, font, fontSize: Number(fontSize) || 110, fontColor, strokeWidth: 8,
      shadowStyle, boxEnabled: !!boxEnabled, boxColor, boxOpacity: boxEnabled ? Number(boxOpacity) || 75 : 0, posY: Number(posY) || 200,
    })
    if (res?.success) setViewMode('video')
  }

  const handlePreviewMouseDown = (e) => { if (viewMode === 'editor') { setIsDragging(true); updatePosFromEvent(e); } }
  const handlePreviewMouseMove = (e) => { if (isDragging && viewMode === 'editor') updatePosFromEvent(e); }
  const updatePosFromEvent = (e) => {
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min((e.clientY - rect.top) / rect.height, 1))
    setPosY(Math.round(ratio * 1920))
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '960px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#090d16', border: '1px solid #27272a' }}>
        <div className="modal-header" style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ fontSize: '1.15rem', color: '#f43f5e', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📱 Студия Shorts: Авто-перенос и точный просмотр (9:16)
          </h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', gap: '1.5rem', padding: '1.25rem', overflowY: 'auto', flexWrap: 'wrap' }}>
          {/* Левая панель */}
          <div style={{ flex: 1, minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f43f5e' }}>✏️ Текст тизера на Shorts (Enter для переноса):</label>
              <textarea rows={2} value={text} onChange={e => { setText(e.target.value); setViewMode('editor') }} placeholder="Введите текст тизера..." style={{ background: '#111827', border: '1px solid #374151', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '0.88rem', resize: 'vertical' }} />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '0.3rem' }}>📍 Размещение текста на экране:</label>
              <div style={{ display: 'flex', gap: '0.45rem' }}>
                <button type="button" onClick={() => { setPosY(140); setViewMode('editor') }} style={{ flex: 1, background: posY <= 350 ? '#f43f5e' : '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>🔝 Вверху</button>
                <button type="button" onClick={() => { setPosY(720); setViewMode('editor') }} style={{ flex: 1, background: posY > 350 && posY < 1100 ? '#f43f5e' : '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>🎯 В центре</button>
                <button type="button" onClick={() => { setPosY(1300); setViewMode('editor') }} style={{ flex: 1, background: posY >= 1100 ? '#f43f5e' : '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>🔻 Внизу</button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>🔤 Шрифт:</label>
                <select value={font} onChange={e => { setFont(e.target.value); setViewMode('editor') }} style={{ width: '100%', background: '#111827', border: '1px solid #374151', color: '#fff', borderRadius: '6px', padding: '0.4rem', fontSize: '0.8rem' }}>
                  {SHORTS_FONTS.map(f => (<option key={f.id} value={f.id}>{f.name}</option>))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>🎨 Цвет букв:</label>
                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center', marginTop: '0.15rem' }}>
                  {TEXT_COLORS.map(c => (<button key={c.id} type="button" onClick={() => { setFontColor(c.id); setViewMode('editor') }} style={{ width: '22px', height: '22px', borderRadius: '50%', background: c.hex, border: fontColor === c.id ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)', cursor: 'pointer', boxShadow: fontColor === c.id ? '0 0 8px #fff' : 'none' }} title={c.label} />))}
                </div>
              </div>
            </div>

            {/* Тени и Свечение */}
            <div>
              <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '0.25rem' }}>✨ Стиль тени и свечения:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                {SHADOW_PRESETS.map(s => (
                  <button key={s.id} type="button" onClick={() => { setShadowStyle(s.id); setViewMode('editor') }} style={{ background: shadowStyle === s.id ? '#f43f5e' : '#1f2937', color: '#fff', border: '1px solid #374151', borderRadius: '4px', padding: '0.35rem 0.2rem', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 600 }}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '0.2rem' }}>📏 Размер ({fontSize}px):</label>
                <input type="range" min="40" max="220" value={fontSize} onChange={e => { setFontSize(Number(e.target.value)); setViewMode('editor') }} style={{ width: '100%' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: '#9ca3af', display: 'block', marginBottom: '0.2rem' }}>📍 Высота Y ({posY}px):</label>
                <input type="range" min="40" max="1750" value={posY} onChange={e => { setPosY(Number(e.target.value)); setViewMode('editor') }} style={{ width: '100%' }} />
              </div>
            </div>

            {/* Плашка фона */}
            <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f3f4f6' }}>🔲 Фон/Плашка под текстом:</span>
                <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.78rem', color: boxEnabled ? '#10b981' : '#9ca3af' }}>
                  <input type="checkbox" checked={boxEnabled} onChange={e => { setBoxEnabled(e.target.checked); setViewMode('editor') }} style={{ accentColor: '#f43f5e', cursor: 'pointer' }} />
                  {boxEnabled ? 'ВКЛЮЧЕН' : 'ОТКЛЮЧЕН'}
                </label>
              </div>
              {boxEnabled && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', alignItems: 'center', paddingTop: '0.3rem', borderTop: '1px solid #1f2937' }}>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#9ca3af', display: 'block', marginBottom: '0.2rem' }}>Цвет фона:</label>
                    <div style={{ display: 'flex', gap: '0.3rem' }}>
                      {BOX_COLORS.map(b => (<button key={b.id} type="button" onClick={() => { setBoxColor(b.id); setViewMode('editor') }} style={{ width: '20px', height: '20px', borderRadius: '4px', background: b.hex, border: boxColor === b.id ? '2px solid #f43f5e' : '1px solid rgba(255,255,255,0.2)', cursor: 'pointer', boxShadow: boxColor === b.id ? '0 0 6px #f43f5e' : 'none' }} title={b.label} />))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.74rem', color: '#9ca3af', display: 'block', marginBottom: '0.2rem' }}>Прозрачность ({boxOpacity}%):</label>
                    <input type="range" min="10" max="100" value={boxOpacity} onChange={e => { setBoxOpacity(Number(e.target.value)); setViewMode('editor') }} style={{ width: '100%' }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Правая панель: Большой экран 9:16 */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem', flexShrink: 0, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '0.4rem', background: '#111827', padding: '4px', borderRadius: '8px', border: '1px solid #1f2937' }}>
              <button
                type="button"
                onClick={() => setViewMode('editor')}
                style={{
                  background: viewMode === 'editor' ? '#f43f5e' : 'transparent',
                  color: '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700,
                  boxShadow: viewMode === 'editor' ? '0 2px 8px rgba(244,63,94,0.4)' : 'none',
                }}
              >
                ✏️ Редактировать макет
              </button>
              <button
                type="button"
                disabled={!shortState?.hasShort}
                onClick={() => setViewMode('video')}
                style={{
                  background: viewMode === 'video' ? '#10b981' : 'transparent',
                  color: !shortState?.hasShort ? '#6b7280' : '#fff', border: 'none', borderRadius: '6px', padding: '0.4rem 0.85rem', fontSize: '0.82rem', cursor: shortState?.hasShort ? 'pointer' : 'not-allowed', fontWeight: 700,
                  boxShadow: viewMode === 'video' ? '0 2px 8px rgba(16,185,129,0.4)' : 'none',
                }}
              >
                ▶ Смотреть видео {shortState?.hasShort ? '✨' : ''}
              </button>
            </div>

            <div
              ref={previewRef} onMouseDown={handlePreviewMouseDown} onMouseMove={handlePreviewMouseMove}
              onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)}
              style={{
                width: '240px', height: '426px', borderRadius: '14px', position: 'relative', overflow: 'hidden',
                background: '#000', border: isDragging ? '2px solid #f43f5e' : '2px solid #334155',
                boxShadow: isDragging ? '0 0 24px rgba(244,63,94,0.45)' : '0 8px 30px rgba(0,0,0,0.8)',
                cursor: viewMode === 'editor' ? 'grab' : 'default', userSelect: 'none',
              }}
            >
              {viewMode === 'video' && shortState?.hasShort ? (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <video
                    key={shortState.shortUrl}
                    src={shortState.shortUrl}
                    controls
                    preload="metadata"
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                  <button
                    type="button"
                    onClick={() => setViewMode('editor')}
                    style={{
                      position: 'absolute', top: '10px', right: '10px', zIndex: 30,
                      background: 'rgba(0,0,0,0.75)', color: '#f43f5e', border: '1px solid #f43f5e',
                      borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 700,
                    }}
                  >
                    ✏️ Изменить
                  </button>
                </div>
              ) : (
                <>
                  {previewPhotoUrl && (<img src={previewPhotoUrl} alt="Shorts Preview" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, pointerEvents: 'none' }} />)}
                  <div style={{ position: 'absolute', top: `${(posY / 1920) * 100}%`, left: '50%', transform: 'translateX(-50%)', width: '92%', textAlign: 'center', zIndex: 10, pointerEvents: 'none' }}>
                    <span style={{ display: 'inline-block', fontFamily: activeFontFamily, fontSize: `${(fontSize / 1080) * 240}px`, color: activeColorHex, lineHeight: 1.15, fontWeight: 900, textTransform: 'uppercase', WebkitTextStroke: '1px #000', textShadow: activeShadowCss, background: boxEnabled ? `${activeBoxHex}${Math.round((boxOpacity / 100) * 255).toString(16).padStart(2, '0')}` : 'transparent', padding: boxEnabled ? '6px 10px' : '0', borderRadius: '6px', whiteSpace: 'pre-wrap', textAlign: 'center' }}>
                      {displayText}
                    </span>
                  </div>
                  <div style={{ position: 'absolute', bottom: '10px', left: '12px', zIndex: 12, fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>
                    ▶ YouTube Shorts (9:16)
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Футер */}
        <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          {shortState?.hasShort ? (
            <a
              href={shortState.shortUrl}
              download="short.mp4"
              onClick={() => toast.success('💾 Видео short.mp4 сохранено в папку новости!')}
              className="copy-btn"
              style={{ background: '#10b981', color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', fontWeight: 700 }}
            >
              💾 Сохранить готовый short.mp4
            </a>
          ) : <div />}
          <div style={{ display: 'flex', gap: '0.65rem' }}>
            <button type="button" className="close-btn" style={{ padding: '0.5rem 1rem' }} onClick={onClose}>Закрыть</button>
            <button type="button" className="copy-btn" disabled={generatingShort} onClick={handleApply} style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)', color: '#fff', fontWeight: 700, padding: '0.55rem 1.25rem', fontSize: '0.88rem' }}>
              {generatingShort ? '⏳ Монтаж Shorts (4 сек)...' : '⚡ Смонтировать Short (9:16)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
