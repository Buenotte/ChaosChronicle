import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import BackgroundPhotoSelector from '../thumbnail/BackgroundPhotoSelector'
import { SHORTS_FONTS, TEXT_COLORS, BOX_COLORS, extractCleanSpeechText } from '../shorts/shortsConfig'

export const COLOR_PRESETS = [
  { id: 'yellow_white', label: '⚡ Желтый + Белый', active: 'yellow', inactive: 'white' },
  { id: 'cyan_white', label: '💎 Циан + Белый', active: 'cyan', inactive: 'white' },
  { id: 'red_yellow', label: '🔥 Красный + Желтый', active: 'red', inactive: 'yellow' },
  { id: 'green_white', label: '🌿 Зеленый + Белый', active: 'green', inactive: 'white' },
  { id: 'orange_white', label: '👑 Оранжевый + Белый', active: 'orange', inactive: 'white' },
  { id: 'white_gray', label: '⚪ Белый + Серый', active: 'white', inactive: 'cyan' },
]

export const VIDEO_SUBTITLE_FONTS = [
  { id: 'RussoOne-Regular.ttf', name: 'Russo One (Современный, четкий)', family: '"Russo One", "RussoOne-Regular", sans-serif' },
  { id: 'impact', name: 'Impact (Классический плакатный)', family: 'Impact, sans-serif' },
  { id: 'arial_black', name: 'Arial Black (Плотный жирный)', family: '"Arial Black", sans-serif' },
  { id: 'Unbounded-Black.ttf', name: 'Unbounded Black (Киберпанк)', family: '"Unbounded Black", "Unbounded-Black", sans-serif' },
  { id: 'DelaGothicOne-Regular.ttf', name: 'Dela Gothic (Монолит)', family: '"Dela Gothic One", "DelaGothicOne-Regular", sans-serif' },
  { id: 'RubikMonoOne-Regular.ttf', name: 'Rubik Mono (Плотный блочный)', family: '"Rubik Mono One", "RubikMonoOne-Regular", sans-serif' },
  { id: 'SeymourOne-Regular.ttf', name: 'Seymour One (Акцентный)', family: '"Seymour One", "SeymourOne-Regular", sans-serif' },
  { id: 'StalinistOne-Regular.ttf', name: 'Stalinist One (Брутализм)', family: '"Stalinist One", "StalinistOne-Regular", sans-serif' },
  { id: 'Buran_USSR.ttf', name: 'Buran USSR (Винтажный плакат)', family: '"Buran USSR", "Buran_USSR", Impact, sans-serif' },
  { id: 'Saxonia_Antiqua_Bold.ttf', name: 'Saxonia Antiqua Bold (С засечками)', family: '"Saxonia_Antiqua_Bold", serif' },
]

export default function VideoSubtitlesEditorModal({
  pkg,
  previewPhotoUrl = '',
  onConfigSaved,
  onClose,
}) {
  const cfg = pkg?.videoConfig || {}
  const [activeTab, setActiveTab] = useState('words') // 'words' | 'style'
  const [includeKaraokeSubtitles, setIncludeKaraokeSubtitles] = useState(cfg.includeKaraokeSubtitles ?? true)
  const [subtitleFont, setSubtitleFont] = useState(cfg.subtitleFont || 'RussoOne-Regular.ttf')
  const [subtitleFontSize, setSubtitleFontSize] = useState(cfg.subtitleFontSize || 44)
  const [subtitleColor, setSubtitleColor] = useState(cfg.subtitleColor || 'yellow')
  const [subtitleInactiveColor, setSubtitleInactiveColor] = useState(cfg.subtitleInactiveColor || 'white')
  const [subtitlePosY, setSubtitlePosY] = useState(cfg.subtitlePosY || 960)
  const [subtitleBoxMode, setSubtitleBoxMode] = useState(cfg.subtitleBoxMode || 'pill')
  const [subtitleBoxColor, setSubtitleBoxColor] = useState(cfg.subtitleBoxColor || 'black')
  const [subtitleBoxOpacity, setSubtitleBoxOpacity] = useState(cfg.subtitleBoxOpacity ?? 82)
  const [subtitlePacing, setSubtitlePacing] = useState(cfg.subtitlePacing || 'wave')
  const [subtitleStrokeWidth, setSubtitleStrokeWidth] = useState(cfg.subtitleStrokeWidth ?? 4)
  const [subtitleShadowDistance, setSubtitleShadowDistance] = useState(cfg.subtitleShadowDistance ?? 2)
  const [subtitleLineMode, setSubtitleLineMode] = useState(cfg.subtitleLineMode || 'auto') // 'auto' | 'single' | 'double'
  const [subtitleMaxWords, setSubtitleMaxWords] = useState(cfg.subtitleMaxWords || 8)
  const [subtitleMaxChars, setSubtitleMaxChars] = useState(cfg.subtitleMaxChars || 70)
  const [subtitleWordSpacing, setSubtitleWordSpacing] = useState(cfg.subtitleWordSpacing ?? 10)
  const [subtitleLineSpacing, setSubtitleLineSpacing] = useState(cfg.subtitleLineSpacing ?? 10)
  const [wordColors, setWordColors] = useState(cfg.wordColors || null)
  const [wordFontSizes, setWordFontSizes] = useState(cfg.wordFontSizes || null)

  const [selectedPhoto, setSelectedPhoto] = useState(cfg.selectedPhoto || null)
  const [isDragging, setIsDragging] = useState(false)
  const [viewMode, setViewMode] = useState('editor') // 'editor' | 'frame' | 'video'
  const [realFrameUrl, setRealFrameUrl] = useState(null)
  const [renderingFrame, setRenderingFrame] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [savingDefault, setSavingDefault] = useState(false)

  const previewRef = useRef(null)
  const [previewWidth, setPreviewWidth] = useState(340)
  const [speechScriptText, setSpeechScriptText] = useState('')
  const [globalWordIdx, setGlobalWordIdx] = useState(0)
  const [isSubtitlesPlaying, setIsSubtitlesPlaying] = useState(true)

  const applyConfig = (loadedCfg) => {
    if (!loadedCfg) return
    if (loadedCfg.includeKaraokeSubtitles !== undefined) setIncludeKaraokeSubtitles(loadedCfg.includeKaraokeSubtitles)
    if (loadedCfg.subtitleFont) setSubtitleFont(loadedCfg.subtitleFont)
    if (loadedCfg.subtitleFontSize !== undefined) setSubtitleFontSize(Number(loadedCfg.subtitleFontSize) || 44)
    if (loadedCfg.subtitleColor) setSubtitleColor(loadedCfg.subtitleColor)
    if (loadedCfg.subtitleInactiveColor) setSubtitleInactiveColor(loadedCfg.subtitleInactiveColor)
    if (loadedCfg.subtitlePosY !== undefined) setSubtitlePosY(Number(loadedCfg.subtitlePosY) || 960)
    if (loadedCfg.subtitleBoxMode) setSubtitleBoxMode(loadedCfg.subtitleBoxMode)
    if (loadedCfg.subtitleBoxColor) setSubtitleBoxColor(loadedCfg.subtitleBoxColor)
    if (loadedCfg.subtitleBoxOpacity !== undefined) setSubtitleBoxOpacity(Number(loadedCfg.subtitleBoxOpacity) ?? 82)
    if (loadedCfg.subtitlePacing) setSubtitlePacing(loadedCfg.subtitlePacing)
    if (loadedCfg.subtitleStrokeWidth !== undefined) setSubtitleStrokeWidth(Number(loadedCfg.subtitleStrokeWidth) ?? 4)
    if (loadedCfg.subtitleShadowDistance !== undefined) setSubtitleShadowDistance(Number(loadedCfg.subtitleShadowDistance) ?? 2)
    if (loadedCfg.subtitleLineMode) setSubtitleLineMode(loadedCfg.subtitleLineMode)
    if (loadedCfg.subtitleMaxWords !== undefined) setSubtitleMaxWords(Number(loadedCfg.subtitleMaxWords) || 8)
    if (loadedCfg.subtitleMaxChars !== undefined) setSubtitleMaxChars(Number(loadedCfg.subtitleMaxChars) || 70)
    if (loadedCfg.subtitleWordSpacing !== undefined) setSubtitleWordSpacing(Number(loadedCfg.subtitleWordSpacing) ?? 10)
    if (loadedCfg.subtitleLineSpacing !== undefined) setSubtitleLineSpacing(Number(loadedCfg.subtitleLineSpacing) ?? 10)
    if (loadedCfg.wordColors !== undefined) setWordColors(loadedCfg.wordColors)
    if (loadedCfg.wordFontSizes !== undefined) setWordFontSizes(loadedCfg.wordFontSizes)
    if (loadedCfg.selectedPhoto !== undefined) setSelectedPhoto(loadedCfg.selectedPhoto)
  }

  useEffect(() => {
    if (pkg?.videoConfig) {
      applyConfig(pkg.videoConfig)
    }
    const folderName = pkg?.folderName || ''
    const bundleDir = pkg?.bundleDir || ''
    if (folderName || bundleDir) {
      fetch(`/api/package-video-config?folderName=${encodeURIComponent(folderName)}&bundleDir=${encodeURIComponent(bundleDir)}`)
        .then(r => r.json())
        .then(data => {
          if (data?.success && data?.videoConfig) {
            pkg.videoConfig = data.videoConfig
            applyConfig(data.videoConfig)
          }
        })
        .catch(() => {})
    }
  }, [pkg?.folderName, pkg?.bundleDir])

  useEffect(() => {
    fetch('/api/custom-fonts').then(r => r.json()).then(data => {
      if (data?.success && Array.isArray(data.fonts)) {
        data.fonts.forEach(async (f) => {
          try {
            const fontFace = new FontFace(f.name, `url(${f.url})`)
            await fontFace.load()
            document.fonts.add(fontFace)
          } catch {}
        })
      }
    }).catch(() => {})

    if (pkg?.scriptTxt) {
      setSpeechScriptText(pkg.scriptTxt)
    }
    if (pkg?.folderName) {
      fetch(`/news-static/${pkg.folderName}/script.txt?t=${Date.now()}`)
        .then(r => r.ok ? r.text() : '')
        .then(t => { if (t) setSpeechScriptText(t) })
        .catch(() => {})
    }
  }, [pkg?.folderName, pkg?.scriptTxt])

  useEffect(() => {
    if (!isSubtitlesPlaying) return
    const timer = setInterval(() => setGlobalWordIdx(prev => prev + 1), 550)
    return () => clearInterval(timer)
  }, [isSubtitlesPlaying])

  useEffect(() => {
    const updatePreviewWidth = () => {
      if (previewRef.current) {
        const w = previewRef.current.clientWidth
        if (w > 0) setPreviewWidth(w)
      }
    }
    updatePreviewWidth()
    window.addEventListener('resize', updatePreviewWidth)
    return () => window.removeEventListener('resize', updatePreviewWidth)
  }, [])

  const rawList = (Array.isArray(pkg?.photoUrls) && pkg.photoUrls.length > 0 ? pkg.photoUrls : (Array.isArray(pkg?.photos) ? pkg.photos : [])).map(p => typeof p === 'string' ? p : p?.url || '').filter(Boolean)
  const cleanPhotos = rawList.filter(p => !p.includes('thumbnail.jpg'))
  const rawBg = pkg?.folderName ? `/news-static/${pkg.folderName}/thumbnail/raw_background.jpg` : null
  const thumbCover = (pkg?.hasThumbnail || pkg?.thumbnailUrl) && pkg?.folderName ? `/news-static/${pkg.folderName}/thumbnail/thumbnail.jpg` : null
  const photoList = cleanPhotos.length > 0 ? cleanPhotos : (rawBg ? [rawBg] : (thumbCover ? [thumbCover] : []))
  const currentBgSrc = selectedPhoto
    ? (selectedPhoto.startsWith('/news-static/') ? selectedPhoto : `/news-static/${pkg?.folderName}/${selectedPhoto}`)
    : (photoList[0] || previewPhotoUrl || thumbCover || '')

  const activeFontFamily = VIDEO_SUBTITLE_FONTS.find(f => f.id === subtitleFont)?.family || SHORTS_FONTS.find(f => f.id === subtitleFont)?.family || '"Russo One", sans-serif'
  const activeColorHex = TEXT_COLORS.find(c => c.id === subtitleColor)?.hex || '#FFE600'
  const activeInactiveColorHex = TEXT_COLORS.find(c => c.id === subtitleInactiveColor)?.hex || '#FFFFFF'
  const activeBoxHex = BOX_COLORS.find(c => c.id === subtitleBoxColor)?.hex || '#000000'

  // Exact 1:1 scale ratio from 1080p canvas (1920x1080) to live preview CSS canvas
  const scaleRatio = (previewWidth || 340) / 1920

  // Subtitle Wave Chunks calculation for 16:9 Landscape
  const cleanSpeech = extractCleanSpeechText(speechScriptText) || 'Пример караоке субтитров на финальном видео 16:9 с автоматической синхронизацией и подсветкой каждого произносимого слова'
  const allWords = cleanSpeech.split(/\s+/).filter(Boolean)
  const isSingle = subtitlePacing === 'single'
  const isTwoWords = subtitlePacing === 'blitz'
  const maxWordsPerWave = isSingle ? 1 : (isTwoWords ? 2 : (Number(subtitleMaxWords) || 8))
  const maxLenPerWave = isSingle ? 14 : (isTwoWords ? 24 : (Number(subtitleMaxChars) || 70))

  const waves = []
  let curChunk = []
  let curLen = 0
  for (let i = 0; i < allWords.length; i++) {
    const w = allWords[i]
    curChunk.push(w)
    curLen += w.length
    const isPunctEnd = /[.!?]$/.test(w)
    const reachedWordLimit = curChunk.length >= maxWordsPerWave
    const reachedLenLimit = curLen >= maxLenPerWave
    const isLastWord = i === allWords.length - 1

    if (isSingle || isTwoWords) {
      if (curChunk.length >= maxWordsPerWave || isLastWord) {
        waves.push([...curChunk])
        curChunk = []
        curLen = 0
      }
    } else if (reachedWordLimit || reachedLenLimit || isLastWord || (isPunctEnd && curChunk.length >= Math.max(2, Math.floor(maxWordsPerWave * 0.4)))) {
      waves.push([...curChunk])
      curChunk = []
      curLen = 0
    }
  }
  if (curChunk.length > 0) waves.push([...curChunk])

  const safeWaves = waves.length > 0 ? waves : [['Пример', 'караоке', 'субтитров', 'на', 'видео', '16:9']]
  const activeWaveIdx = Math.floor(globalWordIdx / 3) % safeWaves.length
  const activeWave = safeWaves[activeWaveIdx] || safeWaves[0]
  const highlightWordInWave = globalWordIdx % activeWave.length

  // Multi-line split calculation for the live preview
  const isMultiLine = (() => {
    if (subtitleLineMode === 'double') return activeWave.length >= 2
    if (subtitleLineMode === 'single') return false
    return activeWave.length >= 8
  })()
  const splitIdx = isMultiLine ? Math.ceil(activeWave.length / 2) : activeWave.length
  const line1Words = activeWave.slice(0, splitIdx)
  const line2Words = isMultiLine ? activeWave.slice(splitIdx) : []

  const handleWordColorSelect = (wordIdxInWave, colId) => {
    const base = wordColors ? [...wordColors] : []
    base[wordIdxInWave] = colId
    setWordColors(base)
    setViewMode('editor')
  }

  const handleWordSizeSelect = (wordIdxInWave, size) => {
    const base = wordFontSizes ? [...wordFontSizes] : []
    base[wordIdxInWave] = Number(size)
    setWordFontSizes(base)
    setViewMode('editor')
  }

  const handleResetWordStyles = () => {
    setWordColors(null)
    setWordFontSizes(null)
    setViewMode('editor')
  }

  const handleInstantFramePreview = async () => {
    try {
      setRenderingFrame(true)
      const res = await fetch('/api/preview-video-frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          selectedPhoto,
          speechSubtitlesEnabled: includeKaraokeSubtitles,
          subtitleColor,
          subtitleInactiveColor,
          subtitleFontSize: Number(subtitleFontSize) || 44,
          subtitlePosY: Number(subtitlePosY) || 960,
          subtitleFont,
          subtitleBoxMode,
          subtitleBoxColor,
          subtitleBoxOpacity: Number(subtitleBoxOpacity) ?? 82,
          subtitlePacing,
          subtitleStrokeWidth: Number(subtitleStrokeWidth) ?? 4,
          subtitleShadowDistance: Number(subtitleShadowDistance) ?? 2,
          subtitleLineMode,
          subtitleMaxWords: Number(subtitleMaxWords) || 8,
          subtitleMaxChars: Number(subtitleMaxChars) || 70,
          subtitleWordSpacing: Number(subtitleWordSpacing) ?? 10,
          subtitleLineSpacing: Number(subtitleLineSpacing) ?? 10,
          wordColors,
          wordFontSizes,
        }),
      })
      const data = await res.json()
      if (data.success && data.frameUrl) {
        setRealFrameUrl(`${data.frameUrl.split('?')[0]}?t=${Date.now()}`)
        setViewMode('frame')
        toast.success('⚡ Точный FFmpeg 1080p кадр готов!', { duration: 1500 })
      } else {
        toast.error('Ошибка создания кадра: ' + (data.error || 'Неизвестно'))
      }
    } catch (e) {
      toast.error('Ошибка FFmpeg: ' + e.message)
    } finally {
      setRenderingFrame(false)
    }
  }

  const handleSaveConfig = async () => {
    try {
      setSavingConfig(true)
      const payload = {
        bundleDir: pkg.bundleDir,
        folderName: pkg.folderName,
        includeKaraokeSubtitles: Boolean(includeKaraokeSubtitles),
        subtitleColor,
        subtitleInactiveColor,
        subtitleFontSize: Number(subtitleFontSize) || 44,
        subtitleFont,
        subtitlePosY: Number(subtitlePosY) || 960,
        subtitleBoxMode,
        subtitleBoxColor,
        subtitleBoxOpacity: Number(subtitleBoxOpacity) ?? 82,
        subtitlePacing,
        subtitleStrokeWidth: Number(subtitleStrokeWidth) ?? 4,
        subtitleShadowDistance: Number(subtitleShadowDistance) ?? 2,
        subtitleLineMode,
        subtitleMaxWords: Number(subtitleMaxWords) || 8,
        subtitleMaxChars: Number(subtitleMaxChars) || 70,
        subtitleWordSpacing: Number(subtitleWordSpacing) ?? 10,
        subtitleLineSpacing: Number(subtitleLineSpacing) ?? 10,
        wordColors,
        wordFontSizes,
        selectedPhoto,
      }
      const res = await fetch('/api/save-video-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        pkg.videoConfig = data.videoConfig
        if (onConfigSaved) onConfigSaved(data.videoConfig)
        toast.success('💾 Настройки субтитров 16:9 сохранены в проект!')
      } else {
        toast.error('Ошибка сохранения: ' + (data.error || 'Сбой'))
      }
    } catch (e) {
      toast.error('Ошибка сохранения: ' + e.message)
    } finally {
      setSavingConfig(false)
    }
  }

  const handleSaveAsDefault = async () => {
    try {
      setSavingDefault(true)
      const payload = {
        includeKaraokeSubtitles: Boolean(includeKaraokeSubtitles),
        subtitleColor,
        subtitleInactiveColor,
        subtitleFontSize: Number(subtitleFontSize) || 44,
        subtitleFont,
        subtitlePosY: Number(subtitlePosY) || 960,
        subtitleBoxMode,
        subtitleBoxColor,
        subtitleBoxOpacity: Number(subtitleBoxOpacity) ?? 82,
        subtitlePacing,
        subtitleStrokeWidth: Number(subtitleStrokeWidth) ?? 4,
        subtitleShadowDistance: Number(subtitleShadowDistance) ?? 2,
        subtitleLineMode,
        subtitleMaxWords: Number(subtitleMaxWords) || 8,
        subtitleMaxChars: Number(subtitleMaxChars) || 70,
        subtitleWordSpacing: Number(subtitleWordSpacing) ?? 10,
        subtitleLineSpacing: Number(subtitleLineSpacing) ?? 10,
      }
      const res = await fetch('/api/default-video-subtitles-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('⭐ Стиль сохранен как глобальный шаблон по умолчанию!')
      } else {
        toast.error('Ошибка: ' + (data.error || 'Сбой'))
      }
    } catch (e) {
      toast.error('Ошибка: ' + e.message)
    } finally {
      setSavingDefault(false)
    }
  }

  const handleResetToDefaultTemplate = async () => {
    try {
      const res = await fetch('/api/default-video-subtitles-config')
      const data = await res.json()
      if (data?.success && data?.config) {
        applyConfig(data.config)
        toast.success('🔄 Настройки сброшены к шаблону по умолчанию!')
      } else {
        applyConfig({
          includeKaraokeSubtitles: true,
          subtitleColor: 'yellow',
          subtitleInactiveColor: 'white',
          subtitleFontSize: 44,
          subtitleFont: 'RussoOne-Regular.ttf',
          subtitlePosY: 960,
          subtitleBoxMode: 'pill',
          subtitleBoxColor: 'black',
          subtitleBoxOpacity: 82,
          subtitlePacing: 'wave',
          subtitleStrokeWidth: 4,
          subtitleShadowDistance: 2,
          subtitleLineMode: 'auto',
          subtitleMaxWords: 8,
          subtitleMaxChars: 70,
          subtitleWordSpacing: 10,
          subtitleLineSpacing: 10,
          wordColors: null,
          wordFontSizes: null,
        })
        toast.success('🔄 Настройки сброшены к стандартным значениям!')
      }
      setViewMode('editor')
    } catch (e) {
      toast.error('Ошибка: ' + e.message)
    }
  }

  // Drag & drop Y position handler
  const updatePosFromEvent = (e) => {
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    if (clientY === undefined) return
    const calculatedY = Math.round(Math.max(0, Math.min((clientY - rect.top) / rect.height, 1)) * 1080)
    setSubtitlePosY(Math.max(100, Math.min(1040, calculatedY)))
  }

  const handlePreviewMouseDown = (e) => {
    if (viewMode !== 'editor') return
    setIsDragging(true)
    updatePosFromEvent(e)
    const handleMove = (ev) => { ev.preventDefault(); updatePosFromEvent(ev) }
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

  const isBoxOn = subtitleBoxMode !== 'none'
  const boxRgba = (() => {
    const hex = activeBoxHex
    const r = parseInt(hex.slice(1, 3) || '0', 16) || 0
    const g = parseInt(hex.slice(3, 5) || '0', 16) || 0
    const b = parseInt(hex.slice(5, 7) || '0', 16) || 0
    const op = ((Number(subtitleBoxOpacity) ?? 82) / 100).toFixed(2)
    return `rgba(${r}, ${g}, ${b}, ${op})`
  })()

  const hasCustomWordColors = Array.isArray(wordColors) && wordColors.some(Boolean)

  const renderWordSpan = (word, globalIndexInWave) => {
    const isHighlighted = globalIndexInWave === highlightWordInWave
    let curColor = isHighlighted ? activeColorHex : activeInactiveColorHex
    if (wordColors && wordColors[globalIndexInWave]) {
      curColor = TEXT_COLORS.find(c => c.id === wordColors[globalIndexInWave])?.hex || wordColors[globalIndexInWave]
    }
    const strokePx = Math.max(0.4, (Number(subtitleStrokeWidth) || 4) * scaleRatio)
    const shadowPx = Math.max(0.4, (Number(subtitleShadowDistance) || 2) * scaleRatio)
    const customWordSize = (wordFontSizes && wordFontSizes[globalIndexInWave] && Number(wordFontSizes[globalIndexInWave]) > 0)
      ? `${(Number(wordFontSizes[globalIndexInWave]) * scaleRatio).toFixed(2)}px`
      : undefined
    const cssWordMargin = Math.max(1, Math.round(((Number(subtitleWordSpacing ?? 10) + 12) * scaleRatio) / 2))

    return (
      <span
        key={globalIndexInWave}
        style={{
          color: curColor,
          fontSize: customWordSize,
          textShadow: `
            -${strokePx.toFixed(2)}px -${strokePx.toFixed(2)}px 0 #000,
             ${strokePx.toFixed(2)}px -${strokePx.toFixed(2)}px 0 #000,
            -${strokePx.toFixed(2)}px  ${strokePx.toFixed(2)}px 0 #000,
             ${strokePx.toFixed(2)}px  ${strokePx.toFixed(2)}px 0 #000,
             0px ${shadowPx.toFixed(2)}px ${(shadowPx * 2).toFixed(2)}px rgba(0,0,0,0.9)
          `,
          transform: 'none',
          display: 'inline-block',
          margin: `0 ${cssWordMargin}px`,
        }}
      >
        {word}
      </span>
    )
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '980px',
          width: '95vw',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#090d16',
          border: '1px solid #27272a',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ padding: '0.85rem 1.25rem', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1.1rem', color: '#38bdf8', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
            🎬 Студия субтитров видео 16:9 (Настройка слов и стиля)
          </h2>
          <button className="close-btn" onClick={onClose} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '1.3rem', cursor: 'pointer' }}>✕</button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '1.15rem', overflowY: 'auto' }}>
          {/* Top Background Selector */}
          <BackgroundPhotoSelector
            photoList={photoList}
            folderName={pkg?.folderName}
            selectedBgPhoto={selectedPhoto}
            onSelectPhoto={(p) => { setSelectedPhoto(p); setViewMode('editor') }}
            onResetToDefault={() => { setSelectedPhoto(null); setViewMode('editor') }}
          />

          {/* 2-Column Grid: Left Controls (Minmax), Right Compact 16:9 Preview (340px) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 340px', gap: '1.25rem', alignItems: 'start' }}>
            {/* LEFT COLUMN: CONTROLS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', minWidth: 0 }}>
              {/* Toggle Subtitles Enabled */}
              <div style={{
                background: '#0f172a',
                padding: '0.6rem 0.85rem',
                borderRadius: '8px',
                border: includeKaraokeSubtitles ? '1.5px solid #06b6d4' : '1px solid #27272a',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <label style={{ fontSize: '0.84rem', fontWeight: 800, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.45rem', cursor: 'pointer', margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={includeKaraokeSubtitles}
                    onChange={e => { setIncludeKaraokeSubtitles(e.target.checked); setViewMode('editor') }}
                    style={{ accentColor: '#06b6d4', width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>💬 Караоке-субтитры 16:9 на видео</span>
                </label>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: includeKaraokeSubtitles ? '#10b981' : '#6b7280' }}>
                  {includeKaraokeSubtitles ? '⚡ ВКЛЮЧЕНЫ' : 'ВЫКЛ'}
                </span>
              </div>

              {includeKaraokeSubtitles && (
                <>
                  {/* Tab switch: Words Colors vs Style */}
                  <div style={{ display: 'flex', gap: '0.35rem', background: '#0b1120', padding: '4px', borderRadius: '8px', border: '1px solid #334155' }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('words')}
                      style={{
                        flex: 1,
                        background: activeTab === 'words' ? '#0284c7' : 'transparent',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      🎨 Цвета караоке
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('style')}
                      style={{
                        flex: 1,
                        background: activeTab === 'style' ? '#0284c7' : 'transparent',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '0.45rem 0.5rem',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      📐 Строки, Шрифт и Плашка
                    </button>
                  </div>

                  {/* TAB 1: WORD COLORS & HIGHLIGHTS */}
                  {activeTab === 'words' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {/* 1. Main Palette: Active Word & Inactive Words */}
                      <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', background: '#090d16', padding: '0.55rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                          <div>
                            <span style={{ fontSize: '0.74rem', color: '#f59e0b', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                              🔥 Активное слово:
                            </span>
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              {TEXT_COLORS.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => { setSubtitleColor(c.id); setViewMode('editor') }}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: c.hex,
                                    border: subtitleColor === c.id ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)',
                                    cursor: 'pointer',
                                    boxShadow: subtitleColor === c.id ? '0 0 8px #38bdf8' : 'none',
                                  }}
                                  title={`Активное: ${c.label}`}
                                />
                              ))}
                            </div>
                          </div>

                          <div>
                            <span style={{ fontSize: '0.74rem', color: '#94a3b8', fontWeight: 700, display: 'block', marginBottom: '0.25rem' }}>
                              ⚪ Остальные слова:
                            </span>
                            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              {TEXT_COLORS.map(c => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => { setSubtitleInactiveColor(c.id); setViewMode('editor') }}
                                  style={{
                                    width: '22px',
                                    height: '22px',
                                    borderRadius: '50%',
                                    background: c.hex,
                                    border: subtitleInactiveColor === c.id ? '2px solid #fff' : '1px solid rgba(255,255,255,0.25)',
                                    cursor: 'pointer',
                                    boxShadow: subtitleInactiveColor === c.id ? '0 0 8px #a855f7' : 'none',
                                  }}
                                  title={`Остальные: ${c.label}`}
                                />
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem', fontWeight: 600 }}>
                            ⚡ Готовые цветовые комбинации:
                          </span>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
                            {COLOR_PRESETS.map(p => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSubtitleColor(p.active)
                                  setSubtitleInactiveColor(p.inactive)
                                  setViewMode('editor')
                                }}
                                style={{
                                  background: (subtitleColor === p.active && subtitleInactiveColor === p.inactive) ? '#0284c7' : '#1e293b',
                                  color: '#fff',
                                  border: '1px solid #334155',
                                  borderRadius: '5px',
                                  padding: '0.25rem 0.35rem',
                                  fontSize: '0.68rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {p.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: LINES FORMAT, TYPOGRAPHY, POSITION, PACING & BOX STYLE */}
                  {activeTab === 'style' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                      {/* 📐 Формат строк и длина субтитров */}
                      <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '8px', border: '1.5px solid #0284c7', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8' }}>
                          📐 Формат строк и длина субтитров:
                        </span>

                        {/* Режим строк: Строго 1 строка / Всегда 2 строки / Авто */}
                        <div>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                            Количество строк:
                          </span>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {[
                              { id: 'single', label: '1️⃣ Строго 1 строка', desc: 'Длинная строка' },
                              { id: 'double', label: '2️⃣ Всегда 2 строки', desc: 'Двустрочный YouTube стиль' },
                              { id: 'auto', label: '⚡ Авто-перенос', desc: 'По ширине экрана' },
                            ].map(m => (
                              <button
                                key={m.id}
                                type="button"
                                onClick={() => { setSubtitleLineMode(m.id); setViewMode('editor') }}
                                style={{
                                  flex: 1,
                                  background: subtitleLineMode === m.id ? '#0284c7' : '#1e293b',
                                  color: '#fff',
                                  border: subtitleLineMode === m.id ? '1px solid #38bdf8' : '1px solid #334155',
                                  borderRadius: '5px',
                                  padding: '0.35rem 0.2rem',
                                  fontSize: '0.72rem',
                                  fontWeight: subtitleLineMode === m.id ? 700 : 500,
                                  cursor: 'pointer',
                                }}
                                title={m.desc}
                              >
                                {m.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Слов в порции / Макс. слов */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Слов в порции субтитров:</span>
                            <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700 }}>{subtitleMaxWords} слов</span>
                          </div>
                          <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.3rem' }}>
                            {[
                              { val: 4, label: '4 сл.' },
                              { val: 6, label: '6 сл.' },
                              { val: 8, label: '8 сл. (Стандарт)' },
                              { val: 10, label: '10 сл.' },
                              { val: 12, label: '12 сл. (Широко)' },
                            ].map(preset => (
                              <button
                                key={preset.val}
                                type="button"
                                onClick={() => { setSubtitleMaxWords(preset.val); setViewMode('editor') }}
                                style={{
                                  flex: 1,
                                  background: subtitleMaxWords === preset.val ? '#0284c7' : '#1e293b',
                                  color: '#fff',
                                  border: '1px solid #334155',
                                  borderRadius: '4px',
                                  padding: '0.2rem 0.1rem',
                                  fontSize: '0.65rem',
                                  cursor: 'pointer',
                                  fontWeight: subtitleMaxWords === preset.val ? 700 : 400,
                                }}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                          <input
                            type="range"
                            min="3"
                            max="14"
                            step="1"
                            value={subtitleMaxWords}
                            onChange={e => { setSubtitleMaxWords(Number(e.target.value)); setViewMode('editor') }}
                            style={{ width: '100%', accentColor: '#06b6d4' }}
                          />
                        </div>

                        {/* Макс. длина (символов) */}
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Макс. длина строки:</span>
                            <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700 }}>{subtitleMaxChars} симв.</span>
                          </div>
                          <input
                            type="range"
                            min="25"
                            max="90"
                            step="5"
                            value={subtitleMaxChars}
                            onChange={e => { setSubtitleMaxChars(Number(e.target.value)); setViewMode('editor') }}
                            style={{ width: '100%', accentColor: '#06b6d4' }}
                          />
                        </div>
                      </div>

                      {/* Font & Size */}
                      <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>🔤 Шрифт субтитров:</span>
                            <select
                              value={subtitleFont}
                              onChange={e => { setSubtitleFont(e.target.value); setViewMode('editor') }}
                              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '6px', padding: '0.35rem', fontSize: '0.76rem' }}
                            >
                              {VIDEO_SUBTITLE_FONTS.map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Размер:</span>
                              <span style={{ fontSize: '0.74rem', color: '#38bdf8', fontWeight: 700 }}>{subtitleFontSize}px</span>
                            </div>
                            <input
                              type="range"
                              min="24"
                              max="80"
                              step="2"
                              value={subtitleFontSize}
                              onChange={e => { setSubtitleFontSize(Number(e.target.value)); setViewMode('editor') }}
                              style={{ width: '100%', accentColor: '#06b6d4' }}
                            />
                          </div>
                        </div>

                        {/* Stroke & Shadow */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.35rem', borderTop: '1px solid #1e293b' }}>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Обводка ({subtitleStrokeWidth}px):</span>
                            <input
                              type="range" min="0" max="10" step="1"
                              value={subtitleStrokeWidth}
                              onChange={e => { setSubtitleStrokeWidth(Number(e.target.value)); setViewMode('editor') }}
                              style={{ width: '100%', accentColor: '#06b6d4' }}
                            />
                          </div>
                          <div>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block' }}>Тень ({subtitleShadowDistance}px):</span>
                            <input
                              type="range" min="0" max="8" step="1"
                              value={subtitleShadowDistance}
                              onChange={e => { setSubtitleShadowDistance(Number(e.target.value)); setViewMode('editor') }}
                              style={{ width: '100%', accentColor: '#06b6d4' }}
                            />
                          </div>
                        </div>

                        {/* Word Spacing & Line Spacing */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', paddingTop: '0.35rem', borderTop: '1px solid #1e293b' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>↔️ Отступ слов (+{subtitleWordSpacing}px):</span>
                              {subtitleWordSpacing !== 10 && (
                                <button type="button" onClick={() => { setSubtitleWordSpacing(10); setViewMode('editor') }} style={{ background: 'none', border: 'none', color: '#06b6d4', fontSize: '0.62rem', cursor: 'pointer', padding: 0 }}>Сброс</button>
                              )}
                            </div>
                            <input
                              type="range" min="0" max="35" step="1"
                              value={subtitleWordSpacing}
                              onChange={e => { setSubtitleWordSpacing(Number(e.target.value)); setViewMode('editor') }}
                              style={{ width: '100%', accentColor: '#06b6d4' }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>↕️ Межстрочный (+{subtitleLineSpacing}px):</span>
                              {subtitleLineSpacing !== 10 && (
                                <button type="button" onClick={() => { setSubtitleLineSpacing(10); setViewMode('editor') }} style={{ background: 'none', border: 'none', color: '#06b6d4', fontSize: '0.62rem', cursor: 'pointer', padding: 0 }}>Сброс</button>
                              )}
                            </div>
                            <input
                              type="range" min="0" max="40" step="1"
                              value={subtitleLineSpacing}
                              onChange={e => { setSubtitleLineSpacing(Number(e.target.value)); setViewMode('editor') }}
                              style={{ width: '100%', accentColor: '#06b6d4' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Position & Pacing */}
                      <div style={{ background: '#0f172a', padding: '0.75rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.5rem', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>📍 Высота Y ({subtitlePosY}px):</span>
                            <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.25rem' }}>
                              <button type="button" onClick={() => { setSubtitlePosY(960); setViewMode('editor') }} style={{ flex: 1, background: subtitlePosY >= 920 ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.2rem', fontSize: '0.66rem', cursor: 'pointer', fontWeight: 600 }}>960px (Низ)</button>
                              <button type="button" onClick={() => { setSubtitlePosY(880); setViewMode('editor') }} style={{ flex: 1, background: subtitlePosY >= 700 && subtitlePosY < 920 ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.2rem', fontSize: '0.66rem', cursor: 'pointer' }}>880px</button>
                              <button type="button" onClick={() => { setSubtitlePosY(540); setViewMode('editor') }} style={{ flex: 1, background: subtitlePosY < 700 ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.2rem', fontSize: '0.66rem', cursor: 'pointer' }}>540px (Центр)</button>
                            </div>
                            <input
                              type="range" min="100" max="1040" step="10"
                              value={subtitlePosY}
                              onChange={e => { setSubtitlePosY(Number(e.target.value)); setViewMode('editor') }}
                              style={{ width: '100%', accentColor: '#06b6d4' }}
                            />
                          </div>

                          <div>
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>🌊 Темп показа:</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                              <button type="button" onClick={() => { setSubtitlePacing('wave'); setViewMode('editor') }} style={{ background: subtitlePacing === 'wave' ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.2rem', fontSize: '0.68rem', fontWeight: subtitlePacing === 'wave' ? 700 : 500, cursor: 'pointer' }}>🌊 Волна ({subtitleMaxWords} сл.)</button>
                              <button type="button" onClick={() => { setSubtitlePacing('blitz'); setViewMode('editor') }} style={{ background: subtitlePacing === 'blitz' ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.2rem', fontSize: '0.68rem', fontWeight: subtitlePacing === 'blitz' ? 700 : 500, cursor: 'pointer' }}>🔥 2-3 слова</button>
                              <button type="button" onClick={() => { setSubtitlePacing('single'); setViewMode('editor') }} style={{ background: subtitlePacing === 'single' ? '#0284c7' : '#1e293b', color: '#fff', border: '1px solid #334155', borderRadius: '4px', padding: '0.2rem', fontSize: '0.68rem', fontWeight: subtitlePacing === 'single' ? 700 : 500, cursor: 'pointer' }}>⚡ 1 слово</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Box / Badge Style */}
                      <div style={{ background: '#090d16', padding: '0.65rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 700, color: isBoxOn ? '#38bdf8' : '#9ca3af' }}>
                            🏷️ Плашка субтитров: {isBoxOn ? 'ВКЛ' : 'ВЫКЛ'}
                          </span>
                          <button
                            type="button"
                            onClick={() => { setSubtitleBoxMode(isBoxOn ? 'none' : 'pill'); setViewMode('editor') }}
                            style={{
                              background: isBoxOn ? '#ef444422' : '#10b98122',
                              color: isBoxOn ? '#ef4444' : '#10b981',
                              border: isBoxOn ? '1px solid #ef4444' : '1px solid #10b981',
                              borderRadius: '4px', padding: '0.15rem 0.45rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer'
                            }}
                          >
                            {isBoxOn ? '❌ Выключить' : '✨ Включить'}
                          </button>
                        </div>

                        <div style={{ display: 'flex', gap: '0.2rem' }}>
                          {[
                            { id: 'pill', label: '🔘 Овальная' },
                            { id: 'solid', label: '📐 Прямоугольная' },
                            { id: 'glow', label: '✨ Неон' },
                            { id: 'none', label: '🚫 Без фона' },
                          ].map(b => (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => { setSubtitleBoxMode(b.id); setViewMode('editor') }}
                              style={{
                                flex: 1,
                                background: subtitleBoxMode === b.id ? (b.id === 'none' ? '#ef4444' : '#0284c7') : '#1e293b',
                                color: '#fff',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '0.25rem 0.15rem',
                                fontSize: '0.68rem',
                                fontWeight: subtitleBoxMode === b.id ? 700 : 500,
                                cursor: 'pointer',
                              }}
                            >
                              {b.label}
                            </button>
                          ))}
                        </div>

                        {isBoxOn && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', alignItems: 'center', paddingTop: '0.35rem', borderTop: '1px solid #1e293b' }}>
                            <div>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Цвет фона:</span>
                              <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                                {BOX_COLORS.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => { setSubtitleBoxColor(c.id); setViewMode('editor') }}
                                    style={{
                                      width: '18px', height: '18px', borderRadius: '4px', background: c.hex,
                                      border: subtitleBoxColor === c.id ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                                      cursor: 'pointer',
                                    }}
                                    title={c.label}
                                  />
                                ))}
                              </div>
                            </div>
                            <div>
                              <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '0.2rem' }}>Прозрачность ({subtitleBoxOpacity}%):</span>
                              <input
                                type="range" min="10" max="100" step="5"
                                value={subtitleBoxOpacity}
                                onChange={e => { setSubtitleBoxOpacity(Number(e.target.value)); setViewMode('editor') }}
                                style={{ width: '100%', accentColor: '#06b6d4' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Default Template Management Buttons */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.4rem', marginTop: '0.4rem', background: '#0b1120', padding: '0.45rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <button
                  type="button"
                  onClick={handleSaveAsDefault}
                  disabled={savingDefault}
                  style={{
                    background: '#334155',
                    color: '#f8fafc',
                    border: '1px solid #475569',
                    borderRadius: '6px',
                    padding: '0.4rem 0.5rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                  }}
                  title="Сохранить эти настройки стиля и шрифта как глобальный шаблон по умолчанию для всех новых 16:9 видео"
                >
                  {savingDefault ? '⏳ Сохранение...' : '⭐ Шаблон по умолч.'}
                </button>
                <button
                  type="button"
                  onClick={handleResetToDefaultTemplate}
                  style={{
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '0.4rem 0.5rem',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.3rem',
                  }}
                  title="Загрузить глобальные настройки по умолчанию"
                >
                  🔄 К шаблону
                </button>
              </div>

              {/* Bottom Main Action Buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.35rem' }}>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={savingConfig}
                  style={{
                    flex: 1.3,
                    background: '#2563eb',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.55rem',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                  }}
                >
                  {savingConfig ? '⏳ Сохранение...' : '💾 Сохранить настройки в проект'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    flex: 0.7,
                    background: '#334155',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.55rem',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  ✕ Закрыть
                </button>
              </div>
            </div>

            {/* RIGHT COLUMN: COMPACT 16:9 PREVIEW PLAYER */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.55rem', flexShrink: 0, margin: '0 auto', width: '100%', maxWidth: '340px' }}>
              {/* Mode Switcher */}
              <div style={{ display: 'flex', gap: '0.35rem', background: '#111827', padding: '4px', borderRadius: '8px', border: '1px solid #1f2937', width: '100%', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => setViewMode('editor')}
                  style={{
                    flex: 1,
                    background: viewMode === 'editor' ? '#0284c7' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                >
                  👁️ Live CSS
                </button>
                <button
                  type="button"
                  disabled={renderingFrame}
                  onClick={handleInstantFramePreview}
                  style={{
                    flex: 1,
                    background: viewMode === 'frame' ? '#3b82f6' : 'transparent',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.76rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                  }}
                  title="Сгенерировать точный кадр через FFmpeg"
                >
                  {renderingFrame ? '⏳ FFmpeg...' : '⚡ FFmpeg'}
                </button>
                <button
                  type="button"
                  disabled={!pkg?.hasVideo}
                  onClick={() => setViewMode('video')}
                  style={{
                    flex: 1,
                    background: viewMode === 'video' ? '#10b981' : 'transparent',
                    color: !pkg?.hasVideo ? '#6b7280' : '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.35rem 0.5rem',
                    fontSize: '0.76rem',
                    cursor: pkg?.hasVideo ? 'pointer' : 'not-allowed',
                    fontWeight: 700,
                  }}
                >
                  ▶ Видео {pkg?.hasVideo ? '✨' : ''}
                </button>
              </div>

              {/* 16:9 Canvas Box */}
              <div
                ref={previewRef}
                onMouseDown={viewMode === 'editor' ? handlePreviewMouseDown : undefined}
                onTouchStart={viewMode === 'editor' ? handlePreviewMouseDown : undefined}
                style={{
                  position: 'relative',
                  width: '100%',
                  aspectRatio: '16/9',
                  background: '#000000',
                  borderRadius: '10px',
                  overflow: 'hidden',
                  border: '1.5px solid #334155',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
                  userSelect: 'none',
                  cursor: viewMode === 'editor' ? 'ns-resize' : 'default',
                }}
              >
                {viewMode === 'video' && pkg?.hasVideo ? (
                  <video
                    src={`/news-static/${pkg.folderName}/video.mp4?t=${Date.now()}`}
                    controls
                    autoPlay
                    loop
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                  />
                ) : viewMode === 'frame' && realFrameUrl ? (
                  <img
                    src={realFrameUrl}
                    alt="Точный FFmpeg кадр субтитров"
                    style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                  />
                ) : (
                  <>
                    {/* Background with blur edges */}
                    {currentBgSrc && (
                      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
                        <img
                          src={currentBgSrc}
                          alt="Фон"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            filter: 'blur(8px) brightness(0.6)',
                            transform: 'scale(1.1)',
                          }}
                        />
                        <img
                          src={currentBgSrc}
                          alt="Основное фото"
                          style={{
                            position: 'absolute',
                            inset: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'contain',
                          }}
                        />
                      </div>
                    )}

                    {/* Dark gradient */}
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.5) 100%)',
                      pointerEvents: 'none',
                    }} />

                    {/* Drag Line Indicator */}
                    {isDragging && (
                      <div style={{
                        position: 'absolute',
                        top: `${((subtitlePosY / 1080) * 100).toFixed(2)}%`,
                        left: 0,
                        right: 0,
                        height: '1px',
                        background: '#38bdf8',
                        boxShadow: '0 0 8px #38bdf8',
                        pointerEvents: 'none',
                        zIndex: 30,
                      }}>
                        <span style={{
                          position: 'absolute',
                          right: '6px',
                          top: '-16px',
                          background: '#0284c7',
                          color: '#fff',
                          fontSize: '0.6rem',
                          fontWeight: 700,
                          padding: '1px 4px',
                          borderRadius: '3px',
                        }}>
                          Y: {subtitlePosY}px
                        </span>
                      </div>
                    )}

                    {/* Karaoke Subtitles Overlay */}
                    {includeKaraokeSubtitles && (
                      <div
                        style={{
                          position: 'absolute',
                          top: `${((subtitlePosY / 1080) * 100).toFixed(2)}%`,
                          left: '50%',
                          transform: 'translate(-50%, -50%)',
                          width: '94%',
                          maxWidth: '94%',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          pointerEvents: 'none',
                          zIndex: 20,
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            flexDirection: isMultiLine ? 'column' : 'row',
                            flexWrap: isMultiLine ? 'nowrap' : 'wrap',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: isMultiLine ? `${Math.max(2, Math.round(((Number(subtitleLineSpacing ?? 10) + 10) / 1080) * ((previewWidth || 340) * 9 / 16)))}px` : '0px',
                            background: isBoxOn ? (subtitleBoxMode === 'glow' ? 'rgba(0,0,0,0.85)' : boxRgba) : 'transparent',
                            borderRadius: subtitleBoxMode === 'pill' ? '9999px' : (subtitleBoxMode === 'solid' ? '6px' : '9999px'),
                            padding: isBoxOn ? (isMultiLine ? '0.4em 1.1em' : '0.3em 1.1em') : '0',
                            border: subtitleBoxMode === 'glow' ? `2px solid ${activeColorHex}` : 'none',
                            boxShadow: subtitleBoxMode === 'glow'
                              ? `0 0 16px ${activeColorHex}88, 0 4px 10px rgba(0,0,0,0.8)`
                              : (isBoxOn ? '0 4px 12px rgba(0,0,0,0.6)' : 'none'),
                            fontFamily: activeFontFamily,
                            fontSize: `${((Number(subtitleFontSize) || 44) * scaleRatio).toFixed(2)}px`,
                            fontWeight: 900,
                            lineHeight: 1.2,
                            textAlign: 'center',
                            textTransform: 'uppercase',
                          }}
                        >
                          {/* Line 1 */}
                          <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                            {line1Words.map((word, idx) => renderWordSpan(word, idx))}
                          </div>

                          {/* Line 2 if multi-line */}
                          {isMultiLine && line2Words.length > 0 && (
                            <div style={{ display: 'inline-flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                              {line2Words.map((word, idx) => renderWordSpan(word, splitIdx + idx))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div style={{
                      position: 'absolute',
                      top: '6px',
                      left: '6px',
                      background: 'rgba(0,0,0,0.65)',
                      color: '#94a3b8',
                      fontSize: '0.62rem',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      pointerEvents: 'none',
                    }}>
                      💡 {isMultiLine ? '2 строки' : '1 строка'} • Y: {subtitlePosY}px
                    </div>
                  </>
                )}
              </div>

              {/* Player Animation Controls */}
              {viewMode === 'editor' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', width: '100%', justifyContent: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setIsSubtitlesPlaying(!isSubtitlesPlaying)}
                    style={{
                      background: isSubtitlesPlaying ? '#ec4899' : '#10b981',
                      border: 'none',
                      borderRadius: '5px',
                      color: '#fff',
                      padding: '0.25rem 0.6rem',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {isSubtitlesPlaying ? '⏸ Пауза' : '▶ Воспроизвести'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlobalWordIdx(prev => Math.max(0, prev - 1))}
                    style={{
                      background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1',
                      borderRadius: '5px', padding: '0.25rem 0.45rem', fontSize: '0.74rem', cursor: 'pointer'
                    }}
                    title="Предыдущее слово"
                  >
                    ⏮
                  </button>
                  <button
                    type="button"
                    onClick={() => setGlobalWordIdx(prev => prev + 1)}
                    style={{
                      background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1',
                      borderRadius: '5px', padding: '0.25rem 0.45rem', fontSize: '0.74rem', cursor: 'pointer'
                    }}
                    title="Следующее слово"
                  >
                    ⏭
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
