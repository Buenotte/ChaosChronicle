import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import LiveThumbnailPreview from './thumbnail/LiveThumbnailPreview'
import BackgroundPhotoSelector from './thumbnail/BackgroundPhotoSelector'
import FontPicker, { BUILTIN_FONTS } from './thumbnail/FontPicker'
import TypographyStyleControls, { COLORS, STROKE_COLORS } from './thumbnail/TypographyStyleControls'
import PositionControls from './thumbnail/PositionControls'

export default function ThumbnailSettingsModal({ pkg, currentThumbnail, onClose, onUpdated }) {
  if (!pkg) return null

  const cfg = pkg?.thumbnailStyle || pkg?.headlineConfig || {}
  const [text, setText] = useState(cfg.text || pkg?.title || pkg?.original_title || '')
  const [font, setFont] = useState(cfg.font || 'impact'), [fontFamilyName, setFontFamilyName] = useState(cfg.fontFamilyName || 'Impact, sans-serif')
  const [customFonts, setCustomFonts] = useState([]), [uploadingFont, setUploadingFont] = useState(false)
  const [fontSize, setFontSize] = useState(cfg.fontSize || 'auto'), [customSizeNum, setCustomSizeNum] = useState(cfg.fontSize && cfg.fontSize !== 'auto' ? Number(cfg.fontSize) : 82), [isItalic, setIsItalic] = useState(!!cfg.isItalic), [tiltAngle, setTiltAngle] = useState(Number(cfg.tiltAngle) || 0)
  const [lineSpacing, setLineSpacing] = useState(cfg.lineSpacing !== undefined ? Number(cfg.lineSpacing) : 1.15), [wordSpacing, setWordSpacing] = useState(cfg.wordSpacing !== undefined ? Number(cfg.wordSpacing) : 0), [fontColor, setFontColor] = useState(cfg.fontColor || 'yellow'), [borderColor, setBorderColor] = useState(cfg.borderColor || 'black')
  const [lineColors, setLineColors] = useState(Array.isArray(cfg.lineColors) ? cfg.lineColors : null), [lineFontSizes, setLineFontSizes] = useState(Array.isArray(cfg.lineFontSizes) ? cfg.lineFontSizes : null), [wordColors, setWordColors] = useState(Array.isArray(cfg.wordColors) ? cfg.wordColors : null), [wordFontSizes, setWordFontSizes] = useState(Array.isArray(cfg.wordFontSizes) ? cfg.wordFontSizes : null)
  const [borderWidth, setBorderWidth] = useState(cfg.borderWidth !== undefined ? Number(cfg.borderWidth) : 9), [shadowDistance, setShadowDistance] = useState(cfg.shadowDistance !== undefined ? Number(cfg.shadowDistance) : 4), [position, setPosition] = useState(cfg.position || 'center'), [textAlign, setTextAlign] = useState(cfg.textAlign || 'center')
  const [offsetY, setOffsetY] = useState(cfg.offsetY !== undefined && cfg.offsetY !== null ? Number(cfg.offsetY) : 50), [offsetX, setOffsetX] = useState(cfg.offsetX !== undefined && cfg.offsetX !== null ? Number(cfg.offsetX) : 50)
  const isInitBadges = cfg.boxStyle === 'per_line' || Boolean(cfg.lineBadges?.enabled), initOp = cfg.lineBadges?.opacity !== undefined ? Number(cfg.lineBadges.opacity) : (cfg.boxOpacity !== undefined ? Number(cfg.boxOpacity) : 85)
  const [hasBox, setHasBox] = useState(isInitBadges ? true : !!cfg.hasBox), [boxStyle, setBoxStyle] = useState(isInitBadges ? 'per_line' : (cfg.boxStyle || (cfg.hasBox ? 'dark_soft' : 'none'))), [boxOpacity, setBoxOpacity] = useState(initOp)
  const [lineBadges, setLineBadges] = useState(cfg.lineBadges ? { ...cfg.lineBadges, enabled: isInitBadges, opacity: initOp } : { enabled: isInitBadges, style: 'solid', shadow: 'soft', tiltMode: 'none', lineTilts: null, color: '#000000', lineColors: null, opacity: initOp })
  const [selectedBgPhoto, setSelectedBgPhoto] = useState(null), [saving, setSaving] = useState(false), [generatingTitle, setGeneratingTitle] = useState(false)
  const [realThumbnailUrl, setRealThumbnailUrl] = useState(null), [previewMode, setPreviewMode] = useState('css'), [renderingPreview, setRenderingPreview] = useState(false)
  const [titleTone, setTitleTone] = useState(pkg?.style === 'analytics' || pkg?.tone === 'analytics' ? 'analytics' : 'satire'), [titleVariants, setTitleVariants] = useState(Array.isArray(pkg.title_variants) ? pkg.title_variants : []), [loadingVariants, setLoadingVariants] = useState(false)

  const getHeadlineConfig = () => {
    const isBadgesOn = Boolean(lineBadges?.enabled || boxStyle === 'per_line'), finalBoxStyle = isBadgesOn ? 'per_line' : boxStyle
    const finalOp = lineBadges?.opacity !== undefined ? Number(lineBadges.opacity) : (Number(boxOpacity) || 85)
    return {
      text, font, fontFamilyName, fontSize: fontSize === 'auto' ? 'auto' : Number(customSizeNum),
      isItalic, tiltAngle: Number(tiltAngle) || 0, lineSpacing: Number(lineSpacing) || 1.15, wordSpacing: Number(wordSpacing) || 0,
      fontColor, lineColors: Array.isArray(lineColors) ? lineColors : null, lineFontSizes: Array.isArray(lineFontSizes) ? lineFontSizes : null,
      wordColors: Array.isArray(wordColors) ? wordColors : null, wordFontSizes: Array.isArray(wordFontSizes) ? wordFontSizes : null,
      customLines: formatPreviewLines(text), borderColor, borderWidth: Number(borderWidth), shadowDistance: Number(shadowDistance),
      position, offsetY: offsetY !== undefined && offsetY !== null ? Number(offsetY) : 50,
      offsetX: offsetX !== undefined && offsetX !== null ? Number(offsetX) : 50, textAlign: textAlign || 'center',
      hasBox: finalBoxStyle !== 'none', boxStyle: finalBoxStyle, boxOpacity: finalOp,
      lineBadges: { ...(lineBadges || {}), enabled: isBadgesOn, opacity: finalOp },
    }
  }

  const handleInstantRealRender = async () => {
    try {
      setRenderingPreview(true)
      const photoUrl = selectedBgPhoto ? (selectedBgPhoto.startsWith('/news-static/') ? selectedBgPhoto : `/news-static/${pkg.folderName}/${selectedBgPhoto}`) : null
      const res = await fetch('/api/set-thumbnail', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'apply_headline', bundleDir: pkg.bundleDir, folderName: pkg.folderName, photoUrl, headlineConfig: getHeadlineConfig() }),
      })
      const data = await res.json()
      if (data.success && data.thumbnailUrl) {
        setRealThumbnailUrl(`${data.thumbnailUrl.split('?')[0]}?t=${Date.now()}`); setPreviewMode('real'); toast.success('⚡ Реальный рендер готов!', { duration: 1200 })
      }
    } catch (err) { toast.error('Ошибка: ' + err.message) }
    finally { setRenderingPreview(false) }
  }

  useEffect(() => {
    fetchCustomFonts()
    if (pkg?.folderName) fetchThumbnailStyle()
  }, [pkg?.folderName])

  const resolveFontFamily = (fontId, customList = []) => {
    const builtin = BUILTIN_FONTS.find(f => f.id === fontId)
    if (builtin) return builtin.family
    const custom = customList.find(c => c.id === fontId)
    return custom ? `"${custom.name}", sans-serif` : 'Impact, sans-serif'
  }

  const applyStyleObject = (c) => {
    if (!c) return
    if (c.customLines && Array.isArray(c.customLines) && c.customLines.length > 0) setText(c.customLines.join('\n'))
    else if (c.text) setText(c.text)
    if (c.font) { setFont(c.font); setFontFamilyName(c.fontFamilyName || resolveFontFamily(c.font, customFonts)); }
    if (c.fontSize !== undefined) { setFontSize(c.fontSize); if (c.fontSize !== 'auto') setCustomSizeNum(Number(c.fontSize)); }
    if (c.fontColor) setFontColor(c.fontColor); if (c.lineColors !== undefined) setLineColors(Array.isArray(c.lineColors) ? c.lineColors : null)
    const targetText = c.text || text || pkg?.title || ''
    const currentWords = targetText.replace(/[\r\n\t]/g, ' ').trim().split(/\s+/).filter(Boolean)
    if (c.wordColors !== undefined) setWordColors(Array.isArray(c.wordColors) && c.wordColors.length === currentWords.length ? c.wordColors : null)
    if (c.wordFontSizes !== undefined) setWordFontSizes(Array.isArray(c.wordFontSizes) && c.wordFontSizes.length === currentWords.length ? c.wordFontSizes : null)
    if (c.borderColor) setBorderColor(c.borderColor); if (c.borderWidth !== undefined) setBorderWidth(Number(c.borderWidth))
    if (c.shadowDistance !== undefined) setShadowDistance(Number(c.shadowDistance)); if (c.lineSpacing !== undefined) setLineSpacing(Number(c.lineSpacing)); if (c.wordSpacing !== undefined) setWordSpacing(Number(c.wordSpacing))
    if (c.isItalic !== undefined) setIsItalic(Boolean(c.isItalic)); if (c.tiltAngle !== undefined) setTiltAngle(Number(c.tiltAngle)); if (c.position) setPosition(c.position)
    if (c.offsetY !== undefined && c.offsetY !== null) setOffsetY(Number(c.offsetY))
    else if (c.position === 'top') setOffsetY(12); else if (c.position === 'bottom') setOffsetY(85); else if (c.position === 'center') setOffsetY(50); setOffsetX(c.offsetX !== undefined && c.offsetX !== null ? Number(c.offsetX) : 50); if (c.textAlign) setTextAlign(c.textAlign)
    const isBadges = c.boxStyle === 'per_line' || Boolean(c.lineBadges?.enabled), opVal = c.lineBadges?.opacity !== undefined ? Number(c.lineBadges.opacity) : (c.boxOpacity !== undefined ? Number(c.boxOpacity) : 85)
    if (isBadges) { setBoxStyle('per_line'); setHasBox(true); setLineBadges(prev => ({ ...(prev || {}), ...(c.lineBadges || {}), enabled: true, opacity: opVal })) }
    else { if (c.hasBox !== undefined) setHasBox(Boolean(c.hasBox)); if (c.boxStyle !== undefined) setBoxStyle(c.boxStyle); else if (c.hasBox) setBoxStyle('dark_soft'); if (c.lineBadges) setLineBadges(c.lineBadges) }
    setBoxOpacity(opVal); if (c.photoUrl) setSelectedBgPhoto(c.photoUrl)
  }

  const fetchThumbnailStyle = async () => {
    try {
      if (pkg?.folderName) {
        const res = await fetch(`/api/thumbnail-style?folderName=${encodeURIComponent(pkg.folderName)}`)
        const data = await res.json()
        if (data.success && data.style && data.style.font) {
          applyStyleObject(data.style)
          return
        }
      }
      const defRes = await fetch('/api/default-thumbnail-style')
      const defData = await defRes.json()
      if (defData.success && defData.style) applyStyleObject(defData.style)
    } catch {}
  }

  const handleSaveAsDefault = async () => {
    try {
      const res = await fetch('/api/save-default-thumbnail-style', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(getHeadlineConfig()) })
      const data = await res.json(); if (data.success) toast.success('⭐ Шаблон сохранен!'); else toast.error('Ошибка шаблона: ' + (data.error || ''))
    } catch (err) { toast.error('Ошибка: ' + err.message) }
  }
  const handleResetToDefault = async () => {
    try {
      const res = await fetch('/api/default-thumbnail-style'), data = await res.json()
      if (data.success && data.style) { applyStyleObject(data.style); toast.success('🔄 Стандартный шаблон применен!') }
    } catch (err) { toast.error('Ошибка: ' + err.message) }
  }

  const fetchCustomFonts = async () => {
    try {
      const res = await fetch('/api/custom-fonts'), data = await res.json()
      if (data.success && Array.isArray(data.fonts)) {
        setCustomFonts(data.fonts)
        data.fonts.forEach(async (f) => {
          try { const fontFace = new FontFace(f.name, `url(${f.url})`); await fontFace.load(); document.fonts.add(fontFace); } catch {}
        })
      }
    } catch {}
  }

  const handleFontFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      setUploadingFont(true)
      const toastId = toast.loading(`🔤 Загрузка шрифта "${file.name}"...`)
      const reader = new FileReader()
      reader.onload = async () => {
        try {
          const base64Data = reader.result.split(',')[1]
          const res = await fetch('/api/upload-font', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, fontName: file.name.replace(/\.[^.]+$/, ''), base64Data }),
          })
          const data = await res.json()
          if (data.success && data.font) {
            try { const ff = new FontFace(data.font.name, `url(${data.font.url})`); await ff.load(); document.fonts.add(ff); } catch {}
            setCustomFonts(prev => [data.font, ...prev.filter(f => f.id !== data.font.id)])
            setFont(data.font.id); setFontFamilyName(`"${data.font.name}", sans-serif`)
            toast.success(`🔤 Шрифт "${data.font.name}" применен!`, { id: toastId })
          } else { toast.error('Ошибка: ' + (data.error || ''), { id: toastId }) }
        } catch (postErr) { toast.error('Ошибка: ' + postErr.message, { id: toastId }) }
        finally { setUploadingFont(false) }
      }
      reader.readAsDataURL(file)
    } catch (err) { setUploadingFont(false); toast.error('Ошибка файла: ' + err.message) }
  }

  const handleDeleteFont = async (fontId, fontName) => {
    try {
      const res = await fetch('/api/delete-font', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fontId }) })
      const data = await res.json()
      if (data.success) {
        toast.success(`🗑️ Шрифт "${fontName}" удален`); setCustomFonts(prev => prev.filter(f => f.id !== fontId))
        if (font === fontId) { setFont('impact'); setFontFamilyName('Impact, "Arial Black", sans-serif'); }
      }
    } catch (err) { toast.error('Ошибка: ' + err.message) }
  }

  const handleGeneratePunchyTitle = async () => {
    try {
      setGeneratingTitle(true)
      const res = await fetch('/api/generate-punchy-title', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pkg.original_title || pkg.title || text, summary: pkg.summary || '', text: pkg.scriptTxt || pkg.text || '', tone: titleTone }),
      })
      const data = await res.json(); if (data.success && data.title) { setText(data.title); toast.success(`⚡ Заголовок создан: "${data.title}"`); }
    } catch (e) { toast.error('Ошибка генерации: ' + e.message) }
    finally { setGeneratingTitle(false) }
  }

  const handleFetchVariants = async () => {
    try {
      setLoadingVariants(true)
      const res = await fetch('/api/generate-title-variants', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pkg.original_title || pkg.title || text, summary: pkg.summary || '', text: pkg.scriptTxt || pkg.text || '',
          bundleDir: pkg.bundleDir, folderName: pkg.folderName, style: titleTone === 'analytics' ? 'analytics' : 'golubuzki', forceRegenerate: true,
        }),
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.variants) && data.variants.length > 0) {
        setTitleVariants(data.variants); toast.success('✨ 10 вариантов заголовков создано!');
      } else toast.error('Не удалось создать варианты: ' + (data.error || 'Ошибка'))
    } catch (e) { toast.error('Ошибка: ' + e.message) }
    finally { setLoadingVariants(false) }
  }

  const handleApply = async () => {
    const toastId = toast.loading('🎨 Сохранение обложки и стиля...')
    try {
      setSaving(true)
      const photoUrl = selectedBgPhoto ? (selectedBgPhoto.startsWith('/news-static/') ? selectedBgPhoto : `/news-static/${pkg.folderName}/${selectedBgPhoto}`) : null
      const res = await fetch('/api/set-thumbnail', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'apply_headline', bundleDir: pkg.bundleDir, folderName: pkg.folderName, photoUrl, headlineConfig: getHeadlineConfig() }),
      })
      const data = await res.json()
      toast.dismiss(toastId)
      if (data.success) {
        if (data.thumbnailUrl) {
          const freshThumb = `${data.thumbnailUrl.split('?')[0]}?t=${Date.now()}`
          setRealThumbnailUrl(freshThumb)
          if (onUpdated) onUpdated(freshThumb, data.style)
        } else if (onUpdated) onUpdated(null, data.style)
        if (data.style) applyStyleObject(data.style)
        toast.success('✨ Обложка и стиль сохранены!')
      } else toast.error('Ошибка: ' + (data.error || 'Не удалось обновить'))
    } catch (err) { toast.dismiss(toastId); toast.error('Ошибка сохранения: ' + err.message) }
    finally { setSaving(false) }
  }

  const formatPreviewLines = (raw) => {
    const str = String(raw || '')
    if (str.includes('\n') || str.includes('\r')) {
      const manual = str.split(/\r?\n|\r/).map(l => l.trim().toUpperCase()).filter(Boolean)
      if (manual.length > 0) return manual
    }
    const words = str.replace(/[\r\n\t]/g, ' ').replace(/["'«»`]/g, '').trim().split(/\s+/).filter(Boolean)
    if (!words.length) return ['ЗАГОЛОВОК ОБЛОЖКИ']
    let lines = [], cur = ''
    for (const w of words) {
      if ((cur + ' ' + w).trim().length <= 16) cur = (cur + ' ' + w).trim()
      else { if (cur) lines.push(cur); cur = w; if (lines.length >= 4) break }
    }
    if (cur && lines.length < 4) lines.push(cur)
    return lines.map(l => l.toUpperCase())
  }

  const previewLines = formatPreviewLines(text)
  const allWords = String(text || '').replace(/[\r\n\t]/g, ' ').replace(/["'«»`]/g, '').trim().split(/\s+/).filter(Boolean)
  const activeColorHex = fontColor?.startsWith('#') ? fontColor : (COLORS.find(c => c.id === fontColor)?.hex || '#FFE600')
  const activeStrokeHex = borderColor?.startsWith('#') ? borderColor : (STROKE_COLORS.find(c => c.id === borderColor)?.hex || '#000000')
  const calcLiveFontSize = (overrideSize = null) => {
    let sz = overrideSize && !isNaN(Number(overrideSize)) && Number(overrideSize) > 0 ? Number(overrideSize) : (fontSize !== 'auto' && !isNaN(Number(customSizeNum)) ? Number(customSizeNum) : null)
    if (sz) sz = Math.min(Math.max(sz, 32), 160)
    else { const longest = Math.max(...previewLines.map(l => l.length), 8); sz = Math.min(Math.max(Math.floor(1160 / (longest * 0.65)), 48), 92); }
    return (((sz * 0.72) / 1280) * 100).toFixed(3) + 'cqw'
  }

  const rawBackgroundSrc = pkg?.folderName ? `/news-static/${pkg.folderName}/thumbnail/raw_background.jpg?t=${Date.now()}` : null
  const fallbackSrc = currentThumbnail || (pkg?.folderName ? `/news-static/${pkg.folderName}/thumbnail/thumbnail.jpg` : '')
  const currentBgSrc = selectedBgPhoto ? (selectedBgPhoto.startsWith('/news-static/') ? selectedBgPhoto : `/news-static/${pkg.folderName}/${selectedBgPhoto}`) : (rawBackgroundSrc || fallbackSrc)
  const photoList = Array.isArray(pkg.photoUrls) && pkg.photoUrls.length > 0 ? pkg.photoUrls : (Array.isArray(pkg.photos) ? pkg.photos : [])

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="modal-content" style={{ maxWidth: '1240px', width: '96vw', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>🎨 Настройка заголовка, шрифта, контура и фона</h2>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>Живая визуализация 16:9 • Выбор любого фото для фона • Настройка каждого слова и строки</p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Сетка на 2 сбалансированные половины: Слева Превью и Заголовок, Справа Шрифты и Стили */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
            {/* ⬅️ Левая половина: Превью, Тема, Заголовок с ИИ генератором и Выбор фото */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ background: '#18181b', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #27272a' }}>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa', display: 'block', fontWeight: 600 }}>📰 ТЕМА НОВОСТИ:</span>
                <span style={{ fontSize: '0.85rem', color: '#f4f4f5', fontWeight: 600 }}>{pkg.original_title || pkg.title}</span>
              </div>

              <LiveThumbnailPreview
                previewSrc={currentBgSrc} position={position} offsetY={offsetY} offsetX={offsetX} textAlign={textAlign}
                onOffsetYChange={(newY) => { setOffsetY(newY); setPosition('custom'); }}
                onOffsetXChange={(newX) => { setOffsetX(newX); setPosition('custom'); }}
                fontFamilyName={fontFamilyName} calcLiveFontSize={calcLiveFontSize} lineSpacing={lineSpacing} wordSpacing={wordSpacing} lineColors={lineColors}
                lineFontSizes={lineFontSizes} wordColors={wordColors} wordFontSizes={wordFontSizes} activeColorHex={activeColorHex}
                borderWidth={borderWidth} activeStrokeHex={activeStrokeHex} shadowDistance={shadowDistance} hasBox={hasBox}
                boxStyle={boxStyle} boxOpacity={boxOpacity} lineBadges={lineBadges} isItalic={isItalic} tiltAngle={tiltAngle} previewLines={previewLines}
                previewMode={previewMode} setPreviewMode={setPreviewMode} realThumbnailUrl={realThumbnailUrl}
                onTriggerRealRender={handleInstantRealRender} renderingPreview={renderingPreview}
              />

              {/* 📝 Текст заголовка и ИИ генерация */}
              <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <label style={{ fontSize: '0.82rem', color: '#9ca3af', fontWeight: 600 }}>📝 Заголовок:</label>
                    <div style={{ display: 'inline-flex', borderRadius: '6px', overflow: 'hidden', border: '1px solid #3f3f46' }}>
                      <button type="button" onClick={() => setTitleTone('satire')} style={{ background: titleTone === 'satire' ? '#ec4899' : '#27272a', color: '#fff', border: 'none', padding: '0.15rem 0.45rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>💥 Сатира</button>
                      <button type="button" onClick={() => setTitleTone('analytics')} style={{ background: titleTone === 'analytics' ? '#6366f1' : '#27272a', color: '#fff', border: 'none', padding: '0.15rem 0.45rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>🧠 Аналитика</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button type="button" className="copy-btn" disabled={generatingTitle} onClick={handleGeneratePunchyTitle} style={{ background: titleTone === 'analytics' ? '#6366f1' : '#ec4899', fontSize: '0.73rem', padding: '0.2rem 0.55rem' }}>
                      {generatingTitle ? '⏳...' : '⚡ 1 заголовок'}
                    </button>
                    <button type="button" className="copy-btn" disabled={loadingVariants} onClick={handleFetchVariants} style={{ background: '#8b5cf6', fontSize: '0.73rem', padding: '0.2rem 0.55rem' }}>
                      {loadingVariants ? '⏳...' : '✨ 10 вариантов'}
                    </button>
                  </div>
                </div>
                <textarea
                  value={text} onChange={e => setText(e.target.value)} rows={2}
                  style={{ width: '100%', background: '#09090b', color: '#fff', border: '1px solid #3f3f46', borderRadius: '6px', padding: '0.55rem', fontSize: '0.95rem', fontWeight: 700, resize: 'vertical', lineHeight: 1.3 }}
                  placeholder="Введите текст заголовка..."
                />
                {titleVariants && titleVariants.length > 0 && (
                  <div style={{ marginTop: '0.35rem', display: 'flex', flexWrap: 'wrap', gap: '0.3rem', maxHeight: '90px', overflowY: 'auto' }}>
                    {titleVariants.map((v, idx) => {
                      const isCur = v.trim().toUpperCase() === text.trim().toUpperCase()
                      return (
                        <button
                          key={idx} type="button" onClick={() => setText(v)}
                          style={{
                            background: isCur ? '#f59e0b' : '#27272a', color: isCur ? '#000' : '#e4e4e7',
                            border: isCur ? '1px solid #fbbf24' : '1px solid #3f3f46', borderRadius: '5px', padding: '0.2rem 0.45rem', fontSize: '0.72rem', fontWeight: isCur ? 700 : 500, cursor: 'pointer', textAlign: 'left'
                          }}
                          title="Кликните, чтобы применить к обложке"
                        >
                          {isCur ? '✓ ' : ''}{v}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>

              <BackgroundPhotoSelector
                photoList={photoList} folderName={pkg.folderName} selectedBgPhoto={selectedBgPhoto}
                onSelectPhoto={(p) => setSelectedBgPhoto(p)} onResetToDefault={() => setSelectedBgPhoto(null)}
              />

              {/* 📍 Расположение текста (2D Drag, пресеты, слайдеры X/Y) */}
              <PositionControls
                offsetX={offsetX} setOffsetX={setOffsetX}
                offsetY={offsetY} setOffsetY={setOffsetY}
                textAlign={textAlign} setTextAlign={setTextAlign}
                setPosition={setPosition}
              />

              {/* 🔤 Выбор шрифта и загрузка */}
              <FontPicker
                font={font} customFonts={customFonts} uploadingFont={uploadingFont}
                onSelectFont={(fId, fam) => { setFont(fId); setFontFamilyName(fam); }}
                onFontFileUpload={handleFontFileUpload} onDeleteFont={handleDeleteFont}
              />
            </div>

            {/* ➡️ Правая половина: Все настройки оформления */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <TypographyStyleControls
                fontSize={fontSize} setFontSize={setFontSize} customSizeNum={customSizeNum} setCustomSizeNum={setCustomSizeNum}
                lineSpacing={lineSpacing} setLineSpacing={setLineSpacing} wordSpacing={wordSpacing} setWordSpacing={setWordSpacing} previewLines={previewLines}
                lineColors={lineColors} setLineColors={setLineColors} lineFontSizes={lineFontSizes} setLineFontSizes={setLineFontSizes}
                words={allWords} wordColors={wordColors} setWordColors={setWordColors} wordFontSizes={wordFontSizes} setWordFontSizes={setWordFontSizes}
                isItalic={isItalic} setIsItalic={setIsItalic} tiltAngle={tiltAngle} setTiltAngle={setTiltAngle}
                fontColor={fontColor} setFontColor={setFontColor} borderColor={borderColor} setBorderColor={setBorderColor}
                borderWidth={borderWidth} setBorderWidth={setBorderWidth} shadowDistance={shadowDistance} setShadowDistance={setShadowDistance}
                hasBox={hasBox} setHasBox={setHasBox} boxStyle={boxStyle} setBoxStyle={setBoxStyle} boxOpacity={boxOpacity} setBoxOpacity={setBoxOpacity}
                lineBadges={lineBadges} setLineBadges={setLineBadges}
              />
            </div>
          </div>

          {/* Кнопки действий */}
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.65rem', borderTop: '1px solid #27272a', paddingTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="copy-btn" disabled={saving} style={{ background: '#10b981', flex: 1, minWidth: '220px', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700 }} onClick={handleApply}>
              {saving ? '⏳ Сохранение...' : '💾 Применить и сохранить обложку'}
            </button>
            <button type="button" className="copy-btn" style={{ background: '#8b5cf6', padding: '0.75rem 1rem', fontWeight: 600 }} onClick={handleSaveAsDefault} title="Сделать оформление шаблоном по умолчанию">⭐ Шаблон по умолчанию</button>
            <button type="button" className="copy-btn" style={{ background: '#3b82f6', padding: '0.75rem 0.9rem', fontWeight: 600 }} onClick={handleResetToDefault} title="Загрузить шаблон по умолчанию">🔄 К шаблону</button>
            <button className="copy-btn" style={{ background: '#3f3f46', padding: '0.75rem 1.2rem', fontWeight: 600 }} onClick={onClose}>✕ Закрыть</button>
          </div>
        </div>
      </div>
    </div>
  )
}
