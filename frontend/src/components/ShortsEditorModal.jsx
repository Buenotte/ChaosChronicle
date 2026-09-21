import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import BackgroundPhotoSelector from './thumbnail/BackgroundPhotoSelector'
import ShortsCustomPlayer from './shorts/ShortsCustomPlayer'
import ShortsTypographyControls, { STROKE_COLORS, SHADOW_COLORS } from './shorts/ShortsTypographyControls'
import LineBadgeControls from './thumbnail/LineBadgeControls'
import { SHORTS_FONTS, TEXT_COLORS, BOX_COLORS, wrapShortsText } from './shorts/shortsConfig'

export default function ShortsEditorModal({ pkg, previewPhotoUrl = '', shortState, generatingShort, onGenerateShort, onClose }) {
  const cfg = pkg?.shortsConfig || {}
  const [duration, setDuration] = useState(cfg.duration || pkg?.short_duration || 25)
  const [text, setText] = useState(cfg.hookTitle || pkg?.title || '')
  const [font, setFont] = useState(cfg.font || 'impact')
  const [fontSize, setFontSize] = useState(cfg.fontSize || 110)
  const [fontColor, setFontColor] = useState(cfg.fontColor || 'yellow')
  const [strokeWidth, setStrokeWidth] = useState(cfg.strokeWidth ?? 8)
  const [strokeColor, setStrokeColor] = useState(cfg.strokeColor || 'black')
  const [shadowDistance, setShadowDistance] = useState(cfg.shadowDistance ?? 4)
  const [shadowColor, setShadowColor] = useState(cfg.shadowColor || 'black')
  const [shadowStyle, setShadowStyle] = useState(cfg.shadowStyle || 'hard')
  const [wordColors, setWordColors] = useState(cfg.wordColors || null)
  const [wordFontSizes, setWordFontSizes] = useState(cfg.wordFontSizes || null)
  const [boxEnabled, setBoxEnabled] = useState(cfg.boxEnabled ?? true)
  const [boxColor, setBoxColor] = useState(cfg.boxColor || 'black')
  const [boxOpacity, setBoxOpacity] = useState(cfg.boxOpacity ?? 75)
  const [posY, setPosY] = useState(cfg.posY || 200)
  const [lineBadges, setLineBadges] = useState(cfg.lineBadges || {
    enabled: cfg.boxEnabled ?? true,
    style: 'solid',
    shadow: 'soft',
    tiltMode: 'none',
    lineTilts: null,
    color: cfg.boxColor && BOX_COLORS.find(c => c.id === cfg.boxColor)?.hex ? BOX_COLORS.find(c => c.id === cfg.boxColor).hex : (cfg.boxColor || '#000000'),
    lineColors: null,
    opacity: cfg.boxOpacity ?? 75,
  })
  const [selectedPhoto, setSelectedPhoto] = useState(cfg.selectedPhoto || null)
  const [isDragging, setIsDragging] = useState(false)
  const [viewMode, setViewMode] = useState('editor')
  const [realFrameUrl, setRealFrameUrl] = useState(null)
  const [renderingFrame, setRenderingFrame] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const previewRef = useRef(null)

  useEffect(() => {
    fetch('/api/custom-fonts').then(r => r.json()).then(data => {
      if (data?.success && Array.isArray(data.fonts)) {
        data.fonts.forEach(async (f) => {
          try { const fontFace = new FontFace(f.name, `url(${f.url})`); await fontFace.load(); document.fonts.add(fontFace) } catch {}
        })
      }
    }).catch(() => {})
  }, [])

  const thumbCover = (pkg?.hasThumbnail || pkg?.thumbnailUrl) && pkg?.folderName ? `/news-static/${pkg.folderName}/thumbnail/thumbnail.jpg` : null
  const rawList = (Array.isArray(pkg?.photoUrls) && pkg.photoUrls.length > 0 ? pkg.photoUrls : (Array.isArray(pkg?.photos) ? pkg.photos : [])).map(p => typeof p === 'string' ? p : p?.url || '').filter(Boolean)
  const photoList = thumbCover ? [thumbCover, ...rawList.filter(p => !p.includes('thumbnail'))] : rawList
  const currentBgSrc = selectedPhoto
    ? (selectedPhoto.startsWith('/news-static/') ? selectedPhoto : `/news-static/${pkg?.folderName}/${selectedPhoto}`)
    : (thumbCover || previewPhotoUrl || (photoList[0] ? (photoList[0].startsWith('/news-static/') ? photoList[0] : `/news-static/${pkg?.folderName}/${photoList[0]}`) : ''))

  const FONT_SCALE_CSS = 0.812
  const activeColorHex = TEXT_COLORS.find(c => c.id === fontColor)?.hex || '#FFE600'
  const activeBoxHex = BOX_COLORS.find(c => c.id === boxColor)?.hex || '#000000'
  const activeStrokeHex = STROKE_COLORS.find(c => c.id === strokeColor)?.hex || '#000000'
  const activeShadowHex = SHADOW_COLORS.find(c => c.id === shadowColor)?.hex || '#000000'
  const activeFontFamily = SHORTS_FONTS.find(f => f.id === font)?.family || 'Impact, sans-serif'
  const activeShadowCss = shadowDistance > 0 ? `${(((shadowDistance * FONT_SCALE_CSS) / 1080) * 240).toFixed(2)}px ${(((shadowDistance * FONT_SCALE_CSS) / 1080) * 240).toFixed(2)}px 0px ${activeShadowHex}` : 'none'

  const maxChars = Math.max(4, Math.floor(920 / ((Number(fontSize) || 110) * 0.58)))
  const displayText = wrapShortsText(text, maxChars) || 'ТЕКСТ ТИЗЕРА'
  const wordsList = displayText.split(/\s+/).filter(Boolean)

  const handleInstantFramePreview = async () => {
    try {
      setRenderingFrame(true)
      const res = await fetch('/api/preview-short-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir, folderName: pkg.folderName, selectedPhoto, hookTitle: text, font, fontSize: Number(fontSize) || 110, fontColor, strokeWidth: Number(strokeWidth) || 0, strokeColor, shadowDistance: Number(shadowDistance) || 0, shadowColor, shadowStyle, wordColors, wordFontSizes, boxEnabled: !!boxEnabled, boxColor, boxOpacity: boxEnabled ? Number(boxOpacity) || 75 : 0, posY: Number(posY) || 200, lineBadges,
        }),
      })
      const data = await res.json()
      if (data.success && data.frameUrl) {
        setRealFrameUrl(`${data.frameUrl.split('?')[0]}?t=${Date.now()}`)
        setViewMode('frame')
        toast.success('⚡ Точный FFmpeg кадр готов!', { duration: 1200 })
      }
    } catch (e) {
      toast.error('Ошибка: ' + e.message)
    } finally {
      setRenderingFrame(false)
    }
  }

  const getLineBadgeStyle = (idx) => {
    const bCfg = lineBadges || {}
    const isBadgesOn = bCfg.enabled || (boxEnabled && bCfg.enabled !== false)
    let lineAngle = 0
    if (Array.isArray(bCfg.lineTilts) && bCfg.lineTilts[idx] !== undefined && Number(bCfg.lineTilts[idx]) !== 0) {
      lineAngle = Number(bCfg.lineTilts[idx]) || 0
    } else if (bCfg.tiltMode === 'zigzag') {
      const zAngles = [-2.0, 1.8, -1.6, 2.0]
      lineAngle = zAngles[idx % zAngles.length]
    } else if (bCfg.tiltMode === 'custom' && Array.isArray(bCfg.lineTilts) && bCfg.lineTilts[idx] !== undefined) {
      lineAngle = Number(bCfg.lineTilts[idx]) || 0
    }
    const outerStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 'max-content', margin: '2px 0', transform: lineAngle !== 0 ? `rotate(${lineAngle}deg)` : undefined, transformOrigin: 'center center' }
    if (!isBadgesOn) return { outerStyle, innerStyle: {} }
    const isLineOn = Array.isArray(bCfg.linesEnabled) ? bCfg.linesEnabled[idx] !== false : true
    if (!isLineOn) return { outerStyle, innerStyle: {} }
    const sType = (Array.isArray(bCfg.lineStyles) && bCfg.lineStyles[idx]) ? bCfg.lineStyles[idx] : (bCfg.style || 'solid')
    const shType = (Array.isArray(bCfg.lineShadows) && bCfg.lineShadows[idx]) ? bCfg.lineShadows[idx] : (bCfg.shadow || 'soft')
    const rawOp = (Array.isArray(bCfg.lineOpacities) && bCfg.lineOpacities[idx] !== undefined) ? bCfg.lineOpacities[idx] : (bCfg.opacity !== undefined ? bCfg.opacity : (boxOpacity || 75))
    const op = ((Number(rawOp)) / 100).toFixed(2)
    const rawCol = (Array.isArray(bCfg.lineColors) && bCfg.lineColors[idx]) ? bCfg.lineColors[idx] : (bCfg.color || activeBoxHex)
    const hex = rawCol.startsWith('#') ? rawCol : (BOX_COLORS.find(c => c.id === rawCol)?.hex || '#000000')
    const r = parseInt(hex.slice(1, 3) || '0', 16) || 0, g = parseInt(hex.slice(3, 5) || '0', 16) || 0, b = parseInt(hex.slice(5, 7) || '0', 16) || 0
    const bg = `rgba(${r}, ${g}, ${b}, ${op})`
    const defPadX = sType === 'slanted' ? 56 : (sType === 'torn' ? 56 : (sType === 'tape' ? 48 : 40))
    const defPadY = sType === 'torn' ? 14 : 10
    const rawPadX = (Array.isArray(bCfg.linePadX) && bCfg.linePadX[idx] !== undefined) ? Number(bCfg.linePadX[idx]) : (bCfg.padX !== undefined ? Number(bCfg.padX) : defPadX)
    const rawPadY = (Array.isArray(bCfg.linePadY) && bCfg.linePadY[idx] !== undefined) ? Number(bCfg.linePadY[idx]) : (bCfg.padY !== undefined ? Number(bCfg.padY) : defPadY)
    const cssPadX = Math.max(2, Math.round((rawPadX / 1080) * 240))
    const cssPadY = Math.max(1, Math.round((rawPadY / 1080) * 240))

    if (shType === 'soft') outerStyle.filter = 'drop-shadow(0 3px 6px rgba(0,0,0,0.85))'
    else if (shType === 'hard') outerStyle.filter = 'drop-shadow(2px 2px 0px rgba(0,0,0,0.95))'
    else if (shType === 'glow') outerStyle.filter = 'drop-shadow(0 0 8px rgba(245,158,11,0.85))'

    const innerStyle = { background: bg, padding: `${cssPadY}px ${cssPadX}px`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: 'max-content' }
    if (sType === 'solid') innerStyle.borderRadius = '4px'
    else if (sType === 'slanted') { innerStyle.clipPath = 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)'; }
    else if (sType === 'dashed') { innerStyle.borderRadius = '4px'; innerStyle.border = '1.5px dashed rgba(255,255,255,0.85)'; }
    else if (sType === 'tape') { innerStyle.borderRadius = '2px'; innerStyle.borderLeft = '3px solid rgba(255,255,255,0.45)'; innerStyle.borderRight = '3px solid rgba(255,255,255,0.45)'; }
    else if (sType === 'torn') {
      innerStyle.clipPath = (idx % 2 === 0) ? 'polygon(0% 2px, 6% 0px, 12% 3px, 19% 1px, 25% 4px, 32% 1px, 39% 4px, 46% 0px, 53% 4px, 60% 1px, 67% 4px, 74% 1px, 81% 4px, 88% 1px, 94% 3px, 100% 0px, calc(100% - 6px) 24%, calc(100% - 1px) 48%, calc(100% - 7px) 72%, 100% 100%, 94% calc(100% - 3px), 88% calc(100% - 1px), 81% calc(100% - 4px), 74% calc(100% - 1px), 67% calc(100% - 3px), 60% calc(100% - 0px), 53% calc(100% - 4px), 46% calc(100% - 1px), 39% calc(100% - 3px), 32% calc(100% - 1px), 25% calc(100% - 4px), 19% calc(100% - 1px), 12% calc(100% - 3px), 6% calc(100% - 1px), 0% calc(100% - 2px), 6px 75%, 1px 50%, 7px 25%, 0% 2px)' : 'polygon(0% 3px, 6% 1px, 13% 4px, 20% 0px, 27% 3px, 34% 1px, 41% 4px, 48% 1px, 55% 4px, 62% 0px, 69% 4px, 76% 1px, 83% 3px, 90% 1px, 96% 4px, 100% 1px, calc(100% - 7px) 28%, calc(100% - 1px) 52%, calc(100% - 6px) 76%, 100% 98%, 95% calc(100% - 3px), 88% calc(100% - 1px), 81% calc(100% - 4px), 74% calc(100% - 1px), 67% calc(100% - 4px), 60% calc(100% - 1px), 53% calc(100% - 3px), 46% calc(100% - 0px), 39% calc(100% - 4px), 32% calc(100% - 1px), 25% calc(100% - 3px), 18% calc(100% - 0px), 12% calc(100% - 3px), 6% calc(100% - 1px), 0% calc(100% - 3px), 7px 72%, 1px 48%, 6px 24%, 0% 3px)'
      innerStyle.background = `linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.02) 40%, rgba(0,0,0,0.18) 75%, rgba(0,0,0,0.35) 100%), ${bg}`
      innerStyle.boxShadow = 'inset 0 0 4px rgba(0,0,0,0.6)'
    }
    return { outerStyle, innerStyle }
  }

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true)
      const res = await fetch('/api/save-shorts-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg?.bundleDir, folderName: pkg?.folderName, duration: Number(duration) || 25, hookTitle: text, font, fontSize: Number(fontSize) || 110,
          fontColor, strokeWidth: Number(strokeWidth) || 0, strokeColor, shadowDistance: Number(shadowDistance) || 0,
          shadowColor, shadowStyle, wordColors, wordFontSizes, boxEnabled: !!boxEnabled, boxColor,
          boxOpacity: boxEnabled ? Number(boxOpacity) || 75 : 0, posY: Number(posY) || 200, lineBadges, selectedPhoto,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('💾 Настройки Shorts сохранены в пакет!')
        if (pkg) pkg.shortsConfig = data.shortsConfig
      } else { toast.error('Ошибка сохранения: ' + (data.error || 'Не удалось сохранить')) }
    } catch (err) { toast.error('Ошибка: ' + err.message) }
    finally { setSavingConfig(false) }
  }

  const handleApply = async () => {
    if (!onGenerateShort) return
    const res = await onGenerateShort({
      duration: Number(duration) || 25,
      hookTitle: text, font, fontSize: Number(fontSize) || 110, fontColor, strokeWidth: Number(strokeWidth) || 0, strokeColor,
      shadowDistance: Number(shadowDistance) || 0, shadowColor, shadowStyle, wordColors, wordFontSizes, boxEnabled: !!boxEnabled,
      boxColor, boxOpacity: boxEnabled ? Number(boxOpacity) || 75 : 0, posY: Number(posY) || 200, lineBadges, selectedPhoto,
    })
    if (res?.success) setViewMode('video')
  }

  const updatePosFromEvent = (e) => {
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const ratio = Math.max(0, Math.min((clientY - rect.top) / rect.height, 1))
    setPosY(Math.round(ratio * 1920))
  }

  const handlePreviewMouseDown = (e) => {
    if (viewMode !== 'editor') return
    setIsDragging(true)
    updatePosFromEvent(e)
    const handleMove = (ev) => {
      ev.preventDefault()
      updatePosFromEvent(ev)
    }
    const handleUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
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

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1.25rem', overflowY: 'auto' }}>
          <BackgroundPhotoSelector
            photoList={photoList}
            folderName={pkg?.folderName}
            selectedBgPhoto={selectedPhoto}
            onSelectPhoto={(p) => { setSelectedPhoto(p); setViewMode('editor') }}
            onResetToDefault={() => { setSelectedPhoto(null); setViewMode('editor') }}
          />

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 260px', gap: '1.25rem', alignItems: 'start' }}>
            {/* Левая панель */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minWidth: 0 }}>
              {/* ⏱️ Длительность Shorts */}
              <div style={{ background: '#18181b', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>
                    ⏱️ Длительность Shorts: <span style={{ color: '#facc15' }}>{duration} сек.</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                    {duration <= 15 ? '⚡ Быстрый хук' : duration <= 35 ? '🔥 Оптимально для YouTube' : '🎬 Развёрнутый тизер'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {[15, 30, 60].map(sec => (
                    <button key={sec} type="button" onClick={() => { setDuration(sec); setViewMode('editor') }} style={{ flex: 1, background: duration === sec ? '#2563eb' : '#27272a', color: '#fff', border: duration === sec ? '1px solid #60a5fa' : '1px solid #3f3f46', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.78rem', fontWeight: duration === sec ? 700 : 500, cursor: 'pointer' }}>
                      {sec === 15 ? '⚡ 15 сек' : sec === 30 ? '🔥 30 сек' : '🎬 60 сек'}
                    </button>
                  ))}
                </div>
                <input type="range" min="10" max="60" step="1" value={duration} onChange={e => { setDuration(Number(e.target.value)); setViewMode('editor') }} style={{ width: '100%', accentColor: '#f43f5e', marginTop: '0.15rem', cursor: 'pointer' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f43f5e' }}>✏️ Текст тизера на Shorts (Enter для переноса):</label>
                <textarea rows={2} value={text} onChange={e => { setText(e.target.value); setViewMode('editor') }} placeholder="Введите текст тизера..." style={{ background: '#111827', border: '1px solid #374151', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.85rem', fontSize: '0.88rem', resize: 'vertical', width: '100%', boxSizing: 'border-box' }} />
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

              <ShortsTypographyControls
                strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth} strokeColor={strokeColor} setStrokeColor={setStrokeColor}
                shadowDistance={shadowDistance} setShadowDistance={setShadowDistance} shadowColor={shadowColor} setShadowColor={setShadowColor}
                words={wordsList} wordColors={wordColors} setWordColors={setWordColors} wordFontSizes={wordFontSizes} setWordFontSizes={setWordFontSizes}
                fontColor={fontColor} fontSize={fontSize} onDirty={() => setViewMode('editor')}
              />

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

              {/* 🏷️ Плашки под строками (Badge Editor Panel) */}
              <LineBadgeControls
                lineBadges={lineBadges}
                setLineBadges={(newBadges) => { setLineBadges(newBadges); setViewMode('editor') }}
                previewLines={displayText.split('\n').filter(Boolean)}
                setBoxOpacity={(op) => { setBoxOpacity(op); setViewMode('editor') }}
                setHasBox={(has) => { setBoxEnabled(has); setViewMode('editor') }}
              />
            </div>

            {/* Правая панель: Большой экран 9:16 */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem', flexShrink: 0, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: '0.35rem', background: '#111827', padding: '4px', borderRadius: '8px', border: '1px solid #1f2937', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" onClick={() => setViewMode('editor')} style={{ background: viewMode === 'editor' ? '#f43f5e' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, boxShadow: viewMode === 'editor' ? '0 2px 8px rgba(244,63,94,0.4)' : 'none' }}>👁️ CSS</button>
                <button type="button" disabled={renderingFrame} onClick={() => handleInstantFramePreview()} style={{ background: viewMode === 'frame' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, boxShadow: viewMode === 'frame' ? '0 2px 8px rgba(59,130,246,0.4)' : 'none' }} title="Сгенерировать точный кадр через FFmpeg за 0.03 сек">{renderingFrame ? '⏳ FFmpeg...' : '⚡ FFmpeg'}</button>
                <button type="button" disabled={!shortState?.hasShort} onClick={() => setViewMode('video')} style={{ background: viewMode === 'video' ? '#10b981' : 'transparent', color: !shortState?.hasShort ? '#6b7280' : '#fff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', cursor: shortState?.hasShort ? 'pointer' : 'not-allowed', fontWeight: 700, boxShadow: viewMode === 'video' ? '0 2px 8px rgba(16,185,129,0.4)' : 'none' }}>▶ Видео {shortState?.hasShort ? '✨' : ''}</button>
              </div>

              <div
                ref={previewRef}
                onMouseDown={viewMode === 'editor' ? handlePreviewMouseDown : undefined}
                onTouchStart={viewMode === 'editor' ? handlePreviewMouseDown : undefined}
                style={{ width: '240px', height: '426px', borderRadius: '14px', position: 'relative', overflow: 'hidden', background: '#000', border: isDragging ? '2px solid #f43f5e' : '2px solid #334155', boxShadow: isDragging ? '0 0 24px rgba(244,63,94,0.45)' : '0 8px 30px rgba(0,0,0,0.8)', cursor: viewMode === 'editor' ? (isDragging ? 'grabbing' : 'grab') : 'default', userSelect: 'none' }}
              >
                {viewMode === 'video' && shortState?.hasShort ? (
                  <ShortsCustomPlayer src={shortState.shortUrl} onEditMode={() => setViewMode('editor')} />
                ) : viewMode === 'frame' && realFrameUrl ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                    <img src={realFrameUrl} alt="FFmpeg Rendered Frame" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    <button type="button" onClick={handleInstantFramePreview} style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 30, background: 'rgba(0,0,0,0.75)', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '6px', padding: '0.3rem 0.6rem', fontSize: '0.74rem', cursor: 'pointer', fontWeight: 700 }}>🔄 Обновить</button>
                  </div>
                ) : (
                  <>
                    {currentBgSrc && (<img src={currentBgSrc} alt="Shorts Preview" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 1, pointerEvents: 'none' }} />)}
                    <div style={{ position: 'absolute', top: `${(posY / 1920) * 100}%`, left: '50%', transform: 'translateX(-50%)', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center', zIndex: 10, pointerEvents: 'none' }}>
                      {(() => {
                        let wordGlobalIdx = 0
                        return displayText.split('\n').map((line, lIdx) => {
                          const lineWords = line.split(/\s+/).filter(Boolean)
                          const { outerStyle, innerStyle } = getLineBadgeStyle(lIdx)
                          return (
                            <span key={lIdx} style={outerStyle}>
                              <span
                                style={{
                                  ...innerStyle,
                                  fontFamily: activeFontFamily, lineHeight: 1, fontWeight: 900, textTransform: 'uppercase',
                                  WebkitTextStroke: strokeWidth > 0 ? `${(((strokeWidth * FONT_SCALE_CSS) / 1080) * 240).toFixed(2)}px ${activeStrokeHex}` : 'none', textShadow: activeShadowCss,
                                }}
                              >
                                {lineWords.map((w, wSubIdx) => {
                                  const curIdx = wordGlobalIdx++, wCol = (wordColors && wordColors[curIdx]) ? wordColors[curIdx] : fontColor
                                  const wColHex = TEXT_COLORS.find(c => c.id === wCol)?.hex || activeColorHex
                                  const wSz = (wordFontSizes && wordFontSizes[curIdx] && Number(wordFontSizes[curIdx]) > 0) ? Number(wordFontSizes[curIdx]) : Number(fontSize)
                                  return (<span key={wSubIdx} style={{ color: wColHex, fontSize: `${((wSz * FONT_SCALE_CSS) / 1080) * 240}px`, margin: wSubIdx > 0 ? '0 0 0 0.28em' : '0', display: 'inline-block' }}>{w}</span>)
                                })}
                              </span>
                            </span>
                          )
                        })
                      })()}
                    </div>
                    <div style={{ position: 'absolute', bottom: '10px', left: '12px', zIndex: 12, fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>▶ YouTube Shorts (9:16)</div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Футер */}
        <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          {shortState?.hasShort ? (
            <a href={shortState.shortUrl} download="short.mp4" onClick={() => toast.success('💾 Видео short.mp4 сохранено в папку новости!')} className="copy-btn" style={{ background: '#10b981', color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', fontWeight: 700 }}>
              💾 Скачать short.mp4
            </a>
          ) : <div />}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="close-btn" style={{ padding: '0.5rem 0.9rem' }} onClick={onClose}>Закрыть</button>
            <button type="button" className="copy-btn" disabled={savingConfig || generatingShort} onClick={handleSaveConfig} style={{ background: '#059669', color: '#fff', fontWeight: 700, padding: '0.5rem 1rem', fontSize: '0.84rem' }} title="Сохранить текст, шрифт, цвета, длительность и позицию в project.json">
              {savingConfig ? '⏳ Сохранение...' : '💾 Сохранить настройки'}
            </button>
            <button type="button" className="copy-btn" disabled={generatingShort} onClick={handleApply} style={{ background: 'linear-gradient(135deg, #f43f5e, #ec4899)', color: '#fff', fontWeight: 700, padding: '0.55rem 1.15rem', fontSize: '0.86rem' }}>
              {generatingShort ? `⏳ Монтаж Shorts (${duration} сек)...` : `⚡ Смонтировать Short (${duration} сек)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
