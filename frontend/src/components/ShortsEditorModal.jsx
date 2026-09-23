import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import BackgroundPhotoSelector from './thumbnail/BackgroundPhotoSelector'
import ShortsCustomPlayer from './shorts/ShortsCustomPlayer'
import { STROKE_COLORS, SHADOW_COLORS } from './shorts/ShortsTypographyControls'
import ShortsSpeechSubtitlesControls from './shorts/ShortsSpeechSubtitlesControls'
import ShortsTitleControls from './shorts/ShortsTitleControls'
import { SHORTS_FONTS, TEXT_COLORS, BOX_COLORS, wrapShortsText, extractCleanSpeechText } from './shorts/shortsConfig'

export default function ShortsEditorModal({ pkg, previewPhotoUrl = '', shortState, generatingShort, onGenerateShort, onClose }) {
  const cfg = pkg?.shortsConfig || {}
  const [activeTab, setActiveTab] = useState('speech')
  const [duration, setDuration] = useState(cfg.duration || pkg?.short_duration || 25)
  const [showHookTitle, setShowHookTitle] = useState(cfg.showHookTitle ?? true)
  const [text, setText] = useState(cfg.hookTitle || pkg?.title || '')
  const [font, setFont] = useState(cfg.font || 'impact'), [fontSize, setFontSize] = useState(cfg.fontSize || 110), [fontColor, setFontColor] = useState(cfg.fontColor || 'yellow')
  const [strokeWidth, setStrokeWidth] = useState(cfg.strokeWidth ?? 8), [strokeColor, setStrokeColor] = useState(cfg.strokeColor || 'black')
  const [shadowDistance, setShadowDistance] = useState(cfg.shadowDistance ?? 4), [shadowColor, setShadowColor] = useState(cfg.shadowColor || 'black'), [shadowStyle, setShadowStyle] = useState(cfg.shadowStyle || 'hard')
  const [wordColors, setWordColors] = useState(cfg.wordColors || null), [wordFontSizes, setWordFontSizes] = useState(cfg.wordFontSizes || null)
  const [boxEnabled, setBoxEnabled] = useState(cfg.boxEnabled ?? true), [boxColor, setBoxColor] = useState(cfg.boxColor || 'black'), [boxOpacity, setBoxOpacity] = useState(cfg.boxOpacity ?? 75), [posY, setPosY] = useState(cfg.posY || 200)

  const [speechSubtitlesEnabled, setSpeechSubtitlesEnabled] = useState(cfg.speechSubtitlesEnabled ?? true), [speechFont, setSpeechFont] = useState(cfg.speechFont || 'impact')
  const [speechColor, setSpeechColor] = useState(cfg.speechColor || 'yellow'), [speechInactiveColor, setSpeechInactiveColor] = useState(cfg.speechInactiveColor || 'white'), [speechFontSize, setSpeechFontSize] = useState(cfg.speechFontSize || 115)
  const [speechPosY, setSpeechPosY] = useState(cfg.speechPosY || 980), [speechBoxMode, setSpeechBoxMode] = useState(cfg.speechBoxMode || 'pill'), [speechPacing, setSpeechPacing] = useState(cfg.speechPacing || 'wave')
  const [speechBoxColor, setSpeechBoxColor] = useState(cfg.speechBoxColor || 'black'), [speechBoxOpacity, setSpeechBoxOpacity] = useState(cfg.speechBoxOpacity ?? 88)

  const [lineBadges, setLineBadges] = useState(cfg.lineBadges || {
    enabled: cfg.boxEnabled ?? true, style: 'solid', shadow: 'soft', tiltMode: 'none', lineTilts: null,
    color: cfg.boxColor && BOX_COLORS.find(c => c.id === cfg.boxColor)?.hex ? BOX_COLORS.find(c => c.id === cfg.boxColor).hex : (cfg.boxColor || '#000000'),
    lineColors: null, opacity: cfg.boxOpacity ?? 75,
  })
  const [selectedPhoto, setSelectedPhoto] = useState(cfg.selectedPhoto || null), [isDragging, setIsDragging] = useState(false), [viewMode, setViewMode] = useState('editor')
  const [realFrameUrl, setRealFrameUrl] = useState(null), [renderingFrame, setRenderingFrame] = useState(false), [savingConfig, setSavingConfig] = useState(false)
  const previewRef = useRef(null)

  const [speechScriptText, setSpeechScriptText] = useState('')
  useEffect(() => {
    fetch('/api/custom-fonts').then(r => r.json()).then(data => {
      if (data?.success && Array.isArray(data.fonts)) {
        data.fonts.forEach(async (f) => {
          try { const fontFace = new FontFace(f.name, `url(${f.url})`); await fontFace.load(); document.fonts.add(fontFace) } catch {}
        })
      }
    }).catch(() => {})
    if (pkg?.folderName) {
      fetch(`/news-static/${pkg.folderName}/script.txt`).then(r => r.ok ? r.text() : '').then(t => { if (t) setSpeechScriptText(t) }).catch(() => {})
    }
  }, [pkg?.folderName])

  const [globalWordIdx, setGlobalWordIdx] = useState(0)
  const [isSubtitlesPlaying, setIsSubtitlesPlaying] = useState(true)

  useEffect(() => {
    if (!isSubtitlesPlaying) return
    const timer = setInterval(() => { setGlobalWordIdx(prev => prev + 1) }, 550)
    return () => clearInterval(timer)
  }, [isSubtitlesPlaying])

  const rawList = (Array.isArray(pkg?.photoUrls) && pkg.photoUrls.length > 0 ? pkg.photoUrls : (Array.isArray(pkg?.photos) ? pkg.photos : [])).map(p => typeof p === 'string' ? p : p?.url || '').filter(Boolean)
  const cleanPhotos = rawList.filter(p => !p.includes('thumbnail.jpg'))
  const rawBg = pkg?.folderName ? `/news-static/${pkg.folderName}/thumbnail/raw_background.jpg` : null
  const thumbCover = (pkg?.hasThumbnail || pkg?.thumbnailUrl) && pkg?.folderName ? `/news-static/${pkg.folderName}/thumbnail/thumbnail.jpg` : null
  const photoList = cleanPhotos.length > 0 ? cleanPhotos : (rawBg ? [rawBg] : (thumbCover ? [thumbCover] : []))
  const currentBgSrc = selectedPhoto
    ? (selectedPhoto.startsWith('/news-static/') ? selectedPhoto : `/news-static/${pkg?.folderName}/${selectedPhoto}`)
    : (photoList[0] || previewPhotoUrl || thumbCover || '')

  const FONT_SCALE_CSS = 0.812
  const activeColorHex = TEXT_COLORS.find(c => c.id === fontColor)?.hex || '#FFE600', activeBoxHex = BOX_COLORS.find(c => c.id === boxColor)?.hex || '#000000'
  const activeStrokeHex = STROKE_COLORS.find(c => c.id === strokeColor)?.hex || '#000000', activeShadowHex = SHADOW_COLORS.find(c => c.id === shadowColor)?.hex || '#000000'
  const activeFontFamily = SHORTS_FONTS.find(f => f.id === font)?.family || 'Impact, sans-serif'
  const activeSpeechFontFamily = SHORTS_FONTS.find(f => f.id === speechFont)?.family || activeFontFamily
  const activeShadowCss = shadowDistance > 0 ? `${(((shadowDistance * FONT_SCALE_CSS) / 1080) * 240).toFixed(2)}px ${(((shadowDistance * FONT_SCALE_CSS) / 1080) * 240).toFixed(2)}px 0px ${activeShadowHex}` : 'none'
  const maxChars = Math.max(4, Math.floor(920 / ((Number(fontSize) || 110) * 0.58)))
  const displayText = wrapShortsText(text, maxChars) || 'ТЕКСТ ТИЗЕРА'
  const wordsList = displayText.split(/\s+/).filter(Boolean)

  const handleInstantFramePreview = async () => {
    try {
      setRenderingFrame(true)
      const res = await fetch('/api/preview-short-frame', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir, folderName: pkg.folderName, selectedPhoto, hookTitle: text, showHookTitle, font, fontSize: Number(fontSize) || 110, fontColor, strokeWidth: Number(strokeWidth) || 0, strokeColor, shadowDistance: Number(shadowDistance) || 0, shadowColor, shadowStyle, wordColors, wordFontSizes, boxEnabled: !!boxEnabled, boxColor, boxOpacity: boxEnabled ? Number(boxOpacity) || 75 : 0, posY: Number(posY) || 200, lineBadges,
          speechSubtitlesEnabled, speechFont, speechColor, speechInactiveColor, speechFontSize: Number(speechFontSize) || 115, speechPosY: Number(speechPosY) || 980, speechBoxMode, speechBoxColor, speechBoxOpacity: Number(speechBoxOpacity) || 88, speechPacing,
        }),
      })
      const data = await res.json()
      if (data.success && data.frameUrl) {
        setRealFrameUrl(`${data.frameUrl.split('?')[0]}?t=${Date.now()}`); setViewMode('frame'); toast.success('⚡ Точный FFmpeg кадр готов!', { duration: 1200 })
      }
    } catch (e) { toast.error('Ошибка: ' + e.message) }
    finally { setRenderingFrame(false) }
  }

  const getLineBadgeStyle = (idx) => {
    const bCfg = lineBadges || {}
    const isBadgesOn = bCfg.enabled || (boxEnabled && bCfg.enabled !== false)
    let lineAngle = 0
    if (Array.isArray(bCfg.lineTilts) && bCfg.lineTilts[idx] !== undefined && Number(bCfg.lineTilts[idx]) !== 0) {
      lineAngle = Number(bCfg.lineTilts[idx]) || 0
    } else if (bCfg.tiltMode === 'zigzag') {
      lineAngle = [-2.0, 1.8, -1.6, 2.0][idx % 4]
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
    const op = ((Number(rawOp)) / 100).toFixed(2), rawCol = (Array.isArray(bCfg.lineColors) && bCfg.lineColors[idx]) ? bCfg.lineColors[idx] : (bCfg.color || activeBoxHex)
    const hex = rawCol.startsWith('#') ? rawCol : (BOX_COLORS.find(c => c.id === rawCol)?.hex || '#000000')
    const r = parseInt(hex.slice(1, 3) || '0', 16) || 0, g = parseInt(hex.slice(3, 5) || '0', 16) || 0, b = parseInt(hex.slice(5, 7) || '0', 16) || 0
    const bg = `rgba(${r}, ${g}, ${b}, ${op})`
    const defPadX = sType === 'slanted' ? 56 : (sType === 'torn' ? 56 : (sType === 'tape' ? 48 : 40)), defPadY = sType === 'torn' ? 14 : 10
    const rawPadX = (Array.isArray(bCfg.linePadX) && bCfg.linePadX[idx] !== undefined) ? Number(bCfg.linePadX[idx]) : (bCfg.padX !== undefined ? Number(bCfg.padX) : defPadX)
    const rawPadY = (Array.isArray(bCfg.linePadY) && bCfg.linePadY[idx] !== undefined) ? Number(bCfg.linePadY[idx]) : (bCfg.padY !== undefined ? Number(bCfg.padY) : defPadY)
    const cssPadX = Math.max(2, Math.round((rawPadX / 1080) * 240)), cssPadY = Math.max(1, Math.round((rawPadY / 1080) * 240))
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg?.bundleDir, folderName: pkg?.folderName, duration: Number(duration) || 25, hookTitle: text, showHookTitle, font, fontSize: Number(fontSize) || 110,
          fontColor, strokeWidth: Number(strokeWidth) || 0, strokeColor, shadowDistance: Number(shadowDistance) || 0, shadowColor, shadowStyle,
          wordColors, wordFontSizes, boxEnabled: !!boxEnabled, boxColor, boxOpacity: boxEnabled ? Number(boxOpacity) || 75 : 0, posY: Number(posY) || 200, lineBadges, selectedPhoto,
          speechSubtitlesEnabled, speechFont, speechColor, speechInactiveColor, speechFontSize: Number(speechFontSize) || 115, speechPosY: Number(speechPosY) || 980, speechBoxMode, speechBoxColor, speechBoxOpacity: Number(speechBoxOpacity) || 88, speechPacing,
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
      duration: Number(duration) || 25, hookTitle: text, showHookTitle, font, fontSize: Number(fontSize) || 110, fontColor, strokeWidth: Number(strokeWidth) || 0, strokeColor,
      shadowDistance: Number(shadowDistance) || 0, shadowColor, shadowStyle, wordColors, wordFontSizes, boxEnabled: !!boxEnabled,
      boxColor, boxOpacity: boxEnabled ? Number(boxOpacity) || 75 : 0, posY: Number(posY) || 200, lineBadges, selectedPhoto,
      speechSubtitlesEnabled, speechFont, speechColor, speechInactiveColor, speechFontSize: Number(speechFontSize) || 115, speechPosY: Number(speechPosY) || 980, speechBoxMode, speechBoxColor, speechBoxOpacity: Number(speechBoxOpacity) || 88, speechPacing,
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
    setIsDragging(true); updatePosFromEvent(e)
    const handleMove = (ev) => { ev.preventDefault(); updatePosFromEvent(ev) }
    const handleUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
    window.addEventListener('mousemove', handleMove); window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false }); window.addEventListener('touchend', handleUp)
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '980px', width: '95vw', maxHeight: '92vh', display: 'flex', flexDirection: 'column', background: '#090d16', border: '1px solid #27272a' }}>
        <div className="modal-header" style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #1e293b' }}>
          <h2 style={{ fontSize: '1.15rem', color: '#f43f5e', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            📱 Студия Shorts: Переключение Заголовок / Субтитры (9:16)
          </h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.15rem', overflowY: 'auto' }}>
          <BackgroundPhotoSelector photoList={photoList} folderName={pkg?.folderName} selectedBgPhoto={selectedPhoto} onSelectPhoto={(p) => { setSelectedPhoto(p); setViewMode('editor') }} onResetToDefault={() => { setSelectedPhoto(null); setViewMode('editor') }} />

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 260px', gap: '1.25rem', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', minWidth: 0 }}>
              <div style={{ background: '#18181b', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #3b82f6', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#38bdf8' }}>⏱️ Длительность: <span style={{ color: '#facc15' }}>{duration} сек.</span></label>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>{duration <= 15 ? '⚡ Быстрый хук' : duration <= 35 ? '🔥 Оптимально' : '🎬 Развёрнутый'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {[15, 30, 60].map(sec => (
                    <button key={sec} type="button" onClick={() => { setDuration(sec); setViewMode('editor') }} style={{ flex: 1, background: duration === sec ? '#2563eb' : '#27272a', color: '#fff', border: duration === sec ? '1px solid #60a5fa' : '1px solid #3f3f46', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.78rem', fontWeight: duration === sec ? 700 : 500, cursor: 'pointer' }}>
                      {sec === 15 ? '⚡ 15с' : sec === 30 ? '🔥 30с' : '🎬 60с'}
                    </button>
                  ))}
                </div>
                <input type="range" min="10" max="60" step="1" value={duration} onChange={e => { setDuration(Number(e.target.value)); setViewMode('editor') }} style={{ width: '100%', accentColor: '#f43f5e', marginTop: '0.15rem', cursor: 'pointer' }} />
              </div>

              {/* 🔀 ПЕРЕКЛЮЧАТЕЛЬ РЕЖИМОВ: СУБТИТРЫ РЕЧИ / ЗАГОЛОВОК */}
              <div style={{ display: 'flex', gap: '0.35rem', background: '#0b1120', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
                <button type="button" onClick={() => setActiveTab('speech')} style={{ flex: 1, background: activeTab === 'speech' ? '#0284c7' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.45rem 0.5rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                  🎬 Субтитры {speechSubtitlesEnabled ? '🟢' : '⚪'}
                </button>
                <button type="button" onClick={() => setActiveTab('title')} style={{ flex: 1, background: activeTab === 'title' ? '#f43f5e' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.45rem 0.5rem', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                  🔝 Заголовок {showHookTitle ? '🟢' : '⚪'}
                </button>
              </div>

              {/* Вкладка 1: Субтитры речи */}
              {activeTab === 'speech' && (
                <ShortsSpeechSubtitlesControls
                  enabled={speechSubtitlesEnabled} setEnabled={setSpeechSubtitlesEnabled}
                  font={speechFont} setFont={setSpeechFont}
                  color={speechColor} setColor={setSpeechColor}
                  inactiveColor={speechInactiveColor} setInactiveColor={setSpeechInactiveColor}
                  fontSize={speechFontSize} setFontSize={setSpeechFontSize} posY={speechPosY} setPosY={setSpeechPosY}
                  boxMode={speechBoxMode} setBoxMode={setSpeechBoxMode}
                  boxColor={speechBoxColor} setBoxColor={setSpeechBoxColor}
                  boxOpacity={speechBoxOpacity} setBoxOpacity={setSpeechBoxOpacity}
                  pacing={speechPacing} setPacing={setSpeechPacing}
                  onDirty={() => setViewMode('editor')}
                />
              )}

              {/* Вкладка 2: Заголовок */}
              {activeTab === 'title' && (
                <ShortsTitleControls
                  showHookTitle={showHookTitle} setShowHookTitle={setShowHookTitle}
                  text={text} setText={setText}
                  font={font} setFont={setFont} fontSize={fontSize} setFontSize={setFontSize}
                  fontColor={fontColor} setFontColor={setFontColor}
                  strokeWidth={strokeWidth} setStrokeWidth={setStrokeWidth} strokeColor={strokeColor} setStrokeColor={setStrokeColor}
                  shadowDistance={shadowDistance} setShadowDistance={setShadowDistance} shadowColor={shadowColor} setShadowColor={setShadowColor}
                  wordColors={wordColors} setWordColors={setWordColors} wordFontSizes={wordFontSizes} setWordFontSizes={setWordFontSizes}
                  posY={posY} setPosY={setPosY} lineBadges={lineBadges} setLineBadges={setLineBadges}
                  boxEnabled={boxEnabled} setBoxOpacity={setBoxOpacity} setBoxEnabled={setBoxEnabled}
                  wordsList={wordsList} displayText={displayText}
                  onDirty={() => setViewMode('editor')}
                />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem', flexShrink: 0, margin: '0 auto' }}>
              <div style={{ display: 'flex', gap: '0.35rem', background: '#111827', padding: '4px', borderRadius: '8px', border: '1px solid #1f2937', flexWrap: 'wrap', justifyContent: 'center' }}>
                <button type="button" onClick={() => setViewMode('editor')} style={{ background: viewMode === 'editor' ? '#f43f5e' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, boxShadow: viewMode === 'editor' ? '0 2px 8px rgba(244,63,94,0.4)' : 'none' }}>👁️ CSS</button>
                <button type="button" disabled={renderingFrame} onClick={() => handleInstantFramePreview()} style={{ background: viewMode === 'frame' ? '#3b82f6' : 'transparent', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, boxShadow: viewMode === 'frame' ? '0 2px 8px rgba(59,130,246,0.4)' : 'none' }} title="Сгенерировать точный кадр через FFmpeg">{renderingFrame ? '⏳ FFmpeg...' : '⚡ FFmpeg'}</button>
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
                    
                    {showHookTitle && (
                      <div style={{
                        position: 'absolute', top: `${(posY / 1920) * 100}%`, left: '50%', transform: 'translateX(-50%)',
                        width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', textAlign: 'center',
                        zIndex: 10, pointerEvents: 'none',
                        opacity: activeTab === 'title' ? 1 : 0.28,
                        transition: 'opacity 0.25s ease',
                      }}>
                        {(() => {
                          let wordGlobalIdx = 0
                          return displayText.split('\n').map((line, lIdx) => {
                            const lineWords = line.split(/\s+/).filter(Boolean)
                            const { outerStyle, innerStyle } = getLineBadgeStyle(lIdx)
                            return (
                              <span key={lIdx} style={outerStyle}>
                                <span
                                  style={{
                                    ...innerStyle, fontFamily: activeFontFamily, lineHeight: 1, fontWeight: 900, textTransform: 'uppercase',
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
                    )}

                    {speechSubtitlesEnabled && (
                      <div style={{
                        position: 'absolute', top: `${(speechPosY / 1920) * 100}%`, left: '50%', transform: 'translate(-50%, -50%)',
                        width: '94%', textAlign: 'center', zIndex: 11, pointerEvents: 'none',
                        opacity: activeTab === 'speech' ? 1 : 0.28,
                        transition: 'opacity 0.25s ease',
                      }}>
                        {(() => {
                          const speechBoxHex = BOX_COLORS.find(c => c.id === speechBoxColor)?.hex || (typeof speechBoxColor === 'string' && speechBoxColor.startsWith('#') ? speechBoxColor : '#000000')
                          const sbR = parseInt(speechBoxHex.slice(1, 3) || '0', 16) || 0
                          const sbG = parseInt(speechBoxHex.slice(3, 5) || '0', 16) || 0
                          const sbB = parseInt(speechBoxHex.slice(5, 7) || '0', 16) || 0
                          const sbAlpha = ((Number(speechBoxOpacity) ?? 88) / 100).toFixed(2)
                          const speechBgRgba = `rgba(${sbR}, ${sbG}, ${sbB}, ${sbAlpha})`
                          const speechRadius = speechBoxMode === 'solid' ? '4px' : (speechBoxMode === 'pill' ? '20px' : '8px')
                          const speechBorder = speechBoxMode === 'glow' ? `1.5px solid ${TEXT_COLORS.find(c => c.id === speechColor)?.hex || '#FFE600'}` : 'none'
                          const speechShadow = speechBoxMode === 'glow' ? `0 0 12px ${TEXT_COLORS.find(c => c.id === speechColor)?.hex || '#FFE600'}` : (speechBoxMode === 'none' ? 'none' : '0 4px 15px rgba(0,0,0,0.7)')

                          return (
                            <span style={{
                              fontFamily: activeSpeechFontFamily, fontSize: `${((speechFontSize * FONT_SCALE_CSS) / 1080) * 240}px`, fontWeight: 900,
                              textTransform: 'uppercase', lineHeight: 1.1, color: '#FFFFFF', WebkitTextStroke: '1.8px #000',
                              textShadow: '0 3px 8px rgba(0,0,0,0.95), 2px 2px 0 #000',
                              background: speechBoxMode === 'none' ? 'transparent' : speechBgRgba,
                              border: speechBorder,
                              boxShadow: speechShadow,
                              padding: speechBoxMode === 'none' ? '0' : '4px 14px', borderRadius: speechRadius, display: 'inline-block',
                            }}>
                              {(() => {
                                const rawSpeech = extractCleanSpeechText(speechScriptText || pkg?.scriptTxt || pkg?.scriptMd || text || '')
                                const rawWords = rawSpeech.split(/\s+/).filter(Boolean)
                                const isSingle = speechPacing === 'single', isTwo = speechPacing === 'blitz' || speechPacing === 'two'
                                const waveSize = isSingle ? 1 : (isTwo ? 2 : 4), totalWords = rawWords.length > 0 ? rawWords.length : 4
                                const activeGlobal = globalWordIdx % totalWords, waveStart = Math.floor(activeGlobal / waveSize) * waveSize
                                const waveWords = rawWords.length > 0 ? rawWords.slice(waveStart, waveStart + waveSize) : (isSingle ? ['СУБТИТРЫ'] : ['СУБТИТРЫ', 'РЕЧИ', 'В', 'КАДРЕ'])
                                const activeInWave = activeGlobal % waveSize

                                return waveWords.map((w, idx) => (
                                  <span key={idx} style={{
                                    color: (idx === activeInWave)
                                      ? (TEXT_COLORS.find(c => c.id === speechColor)?.hex || '#FFE600')
                                      : (TEXT_COLORS.find(c => c.id === speechInactiveColor)?.hex || '#FFFFFF'),
                                    transform: (idx === activeInWave) ? 'scale(1.15)' : 'scale(1)',
                                    display: 'inline-block', margin: idx > 0 ? '0 0 0 0.52em' : '0',
                                    transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
                                  }}>
                                    {w}
                                  </span>
                                ))
                              })()}
                            </span>
                          )
                        })()}
                      </div>
                    )}

                    <div style={{ position: 'absolute', bottom: '10px', left: '12px', zIndex: 12, fontSize: '0.72rem', color: 'rgba(255,255,255,0.5)', pointerEvents: 'none' }}>▶ YouTube Shorts (9:16)</div>
                  </>
                )}
              </div>

              {viewMode === 'editor' && speechSubtitlesEnabled && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
                  background: '#0f172a', padding: '0.35rem 0.65rem', borderRadius: '8px', border: '1px solid #1e293b', width: '100%', maxWidth: '240px'
                }}>
                  <button
                    type="button"
                    onClick={() => { setGlobalWordIdx(0); setIsSubtitlesPlaying(true) }}
                    style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', borderRadius: '5px', padding: '0.25rem 0.45rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                    title="Начать субтитры с самого начала"
                  >
                    ⏮️ Сначала
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSubtitlesPlaying(prev => !prev)}
                    style={{ background: isSubtitlesPlaying ? '#f43f5e' : '#10b981', color: '#fff', border: 'none', borderRadius: '5px', padding: '0.25rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                    title={isSubtitlesPlaying ? 'Поставить на паузу' : 'Возобновить'}
                  >
                    {isSubtitlesPlaying ? '⏸️' : '▶️'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSubtitlesPlaying(false); setGlobalWordIdx(prev => Math.max(0, prev - 1)) }}
                    style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '5px', padding: '0.25rem 0.35rem', fontSize: '0.72rem', cursor: 'pointer' }}
                    title="Предыдущее слово"
                  >
                    ⏪
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsSubtitlesPlaying(false); setGlobalWordIdx(prev => prev + 1) }}
                    style={{ background: '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '5px', padding: '0.25rem 0.35rem', fontSize: '0.72rem', cursor: 'pointer' }}
                    title="Следующее слово"
                  >
                    ⏩
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer" style={{ padding: '0.85rem 1.25rem', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          {shortState?.hasShort ? (
            <a href={shortState.shortUrl} download="short.mp4" onClick={() => toast.success('💾 Видео short.mp4 сохранено в папку новости!')} className="copy-btn" style={{ background: '#10b981', color: '#fff', textDecoration: 'none', padding: '0.5rem 1rem', fontWeight: 700 }}>
              💾 Скачать short.mp4
            </a>
          ) : <div />}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button type="button" className="close-btn" style={{ padding: '0.5rem 0.9rem' }} onClick={onClose}>Закрыть</button>
            <button type="button" className="copy-btn" disabled={savingConfig || generatingShort} onClick={handleSaveConfig} style={{ background: '#059669', color: '#fff', fontWeight: 700, padding: '0.5rem 1rem', fontSize: '0.84rem' }} title="Сохранить настройки">
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
