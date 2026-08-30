import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import LiveThumbnailPreview from './thumbnail/LiveThumbnailPreview'
import BackgroundPhotoSelector from './thumbnail/BackgroundPhotoSelector'
import FontPicker, { BUILTIN_FONTS } from './thumbnail/FontPicker'
import TypographyStyleControls, { COLORS, STROKE_COLORS } from './thumbnail/TypographyStyleControls'

export default function ThumbnailSettingsModal({ pkg, currentThumbnail, onClose, onUpdated }) {
  if (!pkg) return null

  const cfg = pkg?.thumbnailStyle || pkg?.headlineConfig || {}
  const [text, setText] = useState(cfg.text || pkg?.title || pkg?.original_title || '')
  const [font, setFont] = useState(cfg.font || 'impact')
  const [fontFamilyName, setFontFamilyName] = useState(cfg.fontFamilyName || 'Impact, sans-serif')
  const [customFonts, setCustomFonts] = useState([])
  const [uploadingFont, setUploadingFont] = useState(false)
  const [fontSize, setFontSize] = useState(cfg.fontSize || 'auto')
  const [customSizeNum, setCustomSizeNum] = useState(cfg.fontSize && cfg.fontSize !== 'auto' ? Number(cfg.fontSize) : 82)
  const [isItalic, setIsItalic] = useState(!!cfg.isItalic)
  const [tiltAngle, setTiltAngle] = useState(Number(cfg.tiltAngle) || 0)
  const [lineSpacing, setLineSpacing] = useState(cfg.lineSpacing !== undefined ? Number(cfg.lineSpacing) : 1.15)
  const [fontColor, setFontColor] = useState(cfg.fontColor || 'yellow')
  const [lineColors, setLineColors] = useState(Array.isArray(cfg.lineColors) ? cfg.lineColors : null)
  const [lineFontSizes, setLineFontSizes] = useState(Array.isArray(cfg.lineFontSizes) ? cfg.lineFontSizes : null)
  const [borderColor, setBorderColor] = useState(cfg.borderColor || 'black')
  const [borderWidth, setBorderWidth] = useState(cfg.borderWidth !== undefined ? Number(cfg.borderWidth) : 9)
  const [shadowDistance, setShadowDistance] = useState(cfg.shadowDistance !== undefined ? Number(cfg.shadowDistance) : 4)
  const [position, setPosition] = useState(cfg.position || 'center')
  const [offsetY, setOffsetY] = useState(cfg.offsetY !== undefined && cfg.offsetY !== null ? Number(cfg.offsetY) : 50)
  const [hasBox, setHasBox] = useState(!!cfg.hasBox)
  const [boxStyle, setBoxStyle] = useState(cfg.boxStyle || (cfg.hasBox ? 'dark_soft' : 'none'))
  const [boxOpacity, setBoxOpacity] = useState(cfg.boxOpacity !== undefined ? Number(cfg.boxOpacity) : 75)
  const [selectedBgPhoto, setSelectedBgPhoto] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generatingTitle, setGeneratingTitle] = useState(false)

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
    if (c.text) setText(c.text)
    if (c.font) { setFont(c.font); setFontFamilyName(c.fontFamilyName || resolveFontFamily(c.font, customFonts)); }
    if (c.fontSize !== undefined) { setFontSize(c.fontSize); if (c.fontSize !== 'auto') setCustomSizeNum(Number(c.fontSize)); }
    if (c.fontColor) setFontColor(c.fontColor)
    if (c.lineColors !== undefined) setLineColors(Array.isArray(c.lineColors) ? c.lineColors : null)
    if (c.lineFontSizes !== undefined) setLineFontSizes(Array.isArray(c.lineFontSizes) ? c.lineFontSizes : null)
    if (c.borderColor) setBorderColor(c.borderColor)
    if (c.borderWidth !== undefined) setBorderWidth(Number(c.borderWidth))
    if (c.shadowDistance !== undefined) setShadowDistance(Number(c.shadowDistance))
    if (c.lineSpacing !== undefined) setLineSpacing(Number(c.lineSpacing))
    if (c.isItalic !== undefined) setIsItalic(Boolean(c.isItalic))
    if (c.tiltAngle !== undefined) setTiltAngle(Number(c.tiltAngle))
    if (c.position) setPosition(c.position)
    if (c.offsetY !== undefined && c.offsetY !== null) setOffsetY(Number(c.offsetY))
    else if (c.position === 'top') setOffsetY(12)
    else if (c.position === 'bottom') setOffsetY(85)
    else if (c.position === 'center') setOffsetY(50)
    if (c.hasBox !== undefined) setHasBox(Boolean(c.hasBox))
    if (c.boxStyle !== undefined) setBoxStyle(c.boxStyle)
    else if (c.hasBox) setBoxStyle('dark_soft')
    if (c.boxOpacity !== undefined) setBoxOpacity(Number(c.boxOpacity))
    if (c.photoUrl) setSelectedBgPhoto(c.photoUrl)
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
      const headlineConfig = {
        font, fontFamilyName, fontSize: fontSize === 'auto' ? 'auto' : String(customSizeNum),
        fontColor, lineColors, lineFontSizes, borderColor, borderWidth: Number(borderWidth),
        shadowDistance: Number(shadowDistance), lineSpacing: Number(lineSpacing),
        isItalic, tiltAngle: Number(tiltAngle) || 0, position, offsetY: Number(offsetY),
        hasBox: boxStyle !== 'none', boxStyle, boxOpacity: Number(boxOpacity) || 75,
      }
      const res = await fetch('/api/save-default-thumbnail-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(headlineConfig),
      })
      const data = await res.json()
      if (data.success) toast.success('⭐ Текущие настройки сохранены как шаблон по умолчанию!')
      else toast.error('Не удалось сохранить шаблон: ' + (data.error || 'Ошибка'))
    } catch (err) { toast.error('Ошибка сохранения шаблона: ' + err.message) }
  }

  const handleResetToDefault = async () => {
    try {
      const res = await fetch('/api/default-thumbnail-style')
      const data = await res.json()
      if (data.success && data.style) {
        applyStyleObject(data.style)
        toast.success('🔄 Применен стандартный шаблон оформления!')
      }
    } catch (err) { toast.error('Ошибка: ' + err.message) }
  }

  const fetchCustomFonts = async () => {
    try {
      const res = await fetch('/api/custom-fonts')
      const data = await res.json()
      if (data.success && Array.isArray(data.fonts)) {
        setCustomFonts(data.fonts)
        data.fonts.forEach(async (f) => {
          try {
            const fontFace = new FontFace(f.name, `url(${f.url})`)
            await fontFace.load()
            document.fonts.add(fontFace)
          } catch {}
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
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, fontName: file.name.replace(/\.[^.]+$/, ''), base64Data }),
          })
          const data = await res.json()
          if (data.success && data.font) {
            try { const ff = new FontFace(data.font.name, `url(${data.font.url})`); await ff.load(); document.fonts.add(ff); } catch {}
            setCustomFonts(prev => [data.font, ...prev.filter(f => f.id !== data.font.id)])
            setFont(data.font.id); setFontFamilyName(`"${data.font.name}", sans-serif`)
            toast.success(`🔤 Шрифт "${data.font.name}" успешно применен!`, { id: toastId })
          } else { toast.error('Ошибка загрузки шрифта: ' + (data.error || 'Неизвестная ошибка'), { id: toastId }) }
        } catch (postErr) { toast.error('Ошибка отправки шрифта: ' + postErr.message, { id: toastId }) }
        finally { setUploadingFont(false) }
      }
      reader.readAsDataURL(file)
    } catch (err) { setUploadingFont(false); toast.error('Ошибка чтения файла: ' + err.message) }
  }

  const handleDeleteFont = async (fontId, fontName) => {
    try {
      const res = await fetch('/api/delete-font', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fontId }) })
      const data = await res.json()
      if (data.success) {
        toast.success(`🗑️ Шрифт "${fontName}" удален`)
        setCustomFonts(prev => prev.filter(f => f.id !== fontId))
        if (font === fontId) { setFont('impact'); setFontFamilyName('Impact, "Arial Black", sans-serif'); }
      } else { toast.error('Ошибка удаления: ' + (data.error || 'Неизвестная ошибка')) }
    } catch (err) { toast.error('Ошибка удаления: ' + err.message) }
  }

  const handleGeneratePunchyTitle = async () => {
    try {
      setGeneratingTitle(true)
      const res = await fetch('/api/generate-punchy-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: pkg.original_title || pkg.title || text, summary: pkg.summary || '' }),
      })
      const data = await res.json()
      if (data.success && data.title) {
        setText(data.title)
        toast.success(`⚡ Заголовок в стиле Голобуцкого создан: "${data.title}"`)
      }
    } catch (e) { toast.error('Ошибка генерации заголовка: ' + e.message) }
    finally { setGeneratingTitle(false) }
  }

  const handleApply = async () => {
    try {
      setSaving(true)
      const toastId = toast.loading('🎨 Сохранение обложки и стиля...')
      const photoUrl = selectedBgPhoto ? (selectedBgPhoto.startsWith('/news-static/') ? selectedBgPhoto : `/news-static/${pkg.folderName}/${selectedBgPhoto}`) : null
      const headlineConfig = {
        text, font, fontFamilyName,
        fontSize: fontSize === 'auto' ? 'auto' : Number(customSizeNum),
        isItalic, tiltAngle: Number(tiltAngle) || 0, lineSpacing: Number(lineSpacing) || 1.15,
        fontColor, lineColors: Array.isArray(lineColors) ? lineColors : null,
        lineFontSizes: Array.isArray(lineFontSizes) ? lineFontSizes : null,
        borderColor, borderWidth: Number(borderWidth), shadowDistance: Number(shadowDistance),
        position, offsetY: offsetY !== undefined && offsetY !== null ? Number(offsetY) : 50,
        hasBox: boxStyle !== 'none', boxStyle, boxOpacity: Number(boxOpacity) || 75,
      }
      const res = await fetch('/api/set-thumbnail', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'apply_headline', bundleDir: pkg.bundleDir, folderName: pkg.folderName, photoUrl, headlineConfig }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('✨ Обложка и стиль сохранены!', { id: toastId })
        if (onUpdated) onUpdated(`${data.thumbnailUrl}&t=${Date.now()}`)
      } else { toast.error('Ошибка: ' + (data.error || 'Не удалось обновить'), { id: toastId }) }
    } catch (err) { toast.error('Ошибка сохранения: ' + err.message) }
    finally { setSaving(false) }
  }

  const formatPreviewLines = (raw) => {
    if (typeof raw === 'string' && raw.includes('\n')) return raw.split('\n').map(l => l.trim().toUpperCase()).filter(Boolean)
    const words = String(raw || '').replace(/[\r\n\t]/g, ' ').replace(/["'«»`]/g, '').trim().split(/\s+/).filter(Boolean)
    if (!words.length) return ['ЗАГОЛОВОК ОБЛОЖКИ']
    let lines = [], cur = ''
    for (const w of words) {
      if ((cur + ' ' + w).trim().length <= 15) cur = (cur + ' ' + w).trim()
      else { if (cur) lines.push(cur); cur = w; if (lines.length >= 3) break }
    }
    if (cur && lines.length < 3) lines.push(cur)
    return lines.map(l => l.toUpperCase())
  }

  const previewLines = formatPreviewLines(text)
  const activeColorHex = fontColor?.startsWith('#') ? fontColor : (COLORS.find(c => c.id === fontColor)?.hex || '#FFE600')
  const activeStrokeHex = borderColor?.startsWith('#') ? borderColor : (STROKE_COLORS.find(c => c.id === borderColor)?.hex || '#000000')
  const calcLiveFontSize = (overrideSize = null) => {
    if (overrideSize !== null && overrideSize !== undefined && !isNaN(Number(overrideSize)) && Number(overrideSize) > 0) return (Number(overrideSize) * 0.52) + 'px'
    if (fontSize !== 'auto') return (Number(customSizeNum) * 0.52) + 'px'
    const longest = Math.max(...previewLines.map(l => l.length), 8)
    return (Math.min(Math.max(Math.floor(1160 / (longest * 0.65)), 48), 92) * 0.52) + 'px'
  }

  const rawBackgroundSrc = pkg?.folderName ? `/news-static/${pkg.folderName}/thumbnail/raw_background.jpg?t=${Date.now()}` : null
  const fallbackSrc = currentThumbnail || (pkg?.folderName ? `/news-static/${pkg.folderName}/thumbnail/thumbnail.jpg` : '')
  const currentBgSrc = selectedBgPhoto ? (selectedBgPhoto.startsWith('/news-static/') ? selectedBgPhoto : `/news-static/${pkg.folderName}/${selectedBgPhoto}`) : (rawBackgroundSrc || fallbackSrc)
  const photoList = Array.isArray(pkg.photoUrls) && pkg.photoUrls.length > 0 ? pkg.photoUrls : (Array.isArray(pkg.photos) ? pkg.photos : [])

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="modal-content" style={{ maxWidth: '960px', width: '96vw', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              🎨 Настройка заголовка, шрифта, контура и фона
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
              Живая визуализация 16:9 • Выбор любого фото для фона • Настройка шрифта
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Исходная новость */}
          <div style={{ background: '#18181b', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #27272a' }}>
            <span style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', fontWeight: 600, marginBottom: '0.2rem' }}>
              📰 ПОЛНАЯ ТЕМА НОВОСТИ:
            </span>
            <span style={{ fontSize: '0.9rem', color: '#f4f4f5', fontWeight: 600 }}>
              {pkg.original_title || pkg.title}
            </span>
          </div>

          {/* 👁️ Живой предпросмотр */}
          <LiveThumbnailPreview
            previewSrc={currentBgSrc}
            position={position}
            offsetY={offsetY}
            fontFamilyName={fontFamilyName}
            calcLiveFontSize={calcLiveFontSize}
            lineSpacing={lineSpacing}
            lineColors={lineColors}
            lineFontSizes={lineFontSizes}
            activeColorHex={activeColorHex}
            borderWidth={borderWidth}
            activeStrokeHex={activeStrokeHex}
            shadowDistance={shadowDistance}
            hasBox={hasBox}
            boxStyle={boxStyle}
            boxOpacity={boxOpacity}
            isItalic={isItalic}
            tiltAngle={tiltAngle}
            previewLines={previewLines}
          />

          {/* 🖼️ Выбор фона из фото пакета */}
          <BackgroundPhotoSelector
            photoList={photoList}
            folderName={pkg.folderName}
            selectedBgPhoto={selectedBgPhoto}
            onSelectPhoto={(p) => setSelectedBgPhoto(p)}
            onResetToDefault={() => setSelectedBgPhoto(null)}
          />

          {/* 📝 Текст заголовка */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
                📝 Текст заголовка на обложке:
              </label>
              <button
                type="button"
                className="copy-btn"
                disabled={generatingTitle}
                onClick={handleGeneratePunchyTitle}
                style={{ background: '#ec4899', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                {generatingTitle ? '⏳ Создание...' : '⚡ Сгенерировать в стиле Голобуцкого (4-5 слов)'}
              </button>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                background: '#18181b',
                color: '#fff',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                padding: '0.65rem',
                fontSize: '1rem',
                fontWeight: 700,
                resize: 'vertical',
                lineHeight: 1.35,
              }}
              placeholder="Введите текст заголовка..."
            />
          </div>

          {/* Настройки шрифта, размеров, начертания, наклона, цветов, контура и тени */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <FontPicker
              font={font}
              customFonts={customFonts}
              uploadingFont={uploadingFont}
              onSelectFont={(fId, fam) => { setFont(fId); setFontFamilyName(fam); }}
              onFontFileUpload={handleFontFileUpload}
              onDeleteFont={handleDeleteFont}
            />

            <TypographyStyleControls
              fontSize={fontSize} setFontSize={setFontSize} customSizeNum={customSizeNum} setCustomSizeNum={setCustomSizeNum}
              lineSpacing={lineSpacing} setLineSpacing={setLineSpacing} previewLines={previewLines}
              lineColors={lineColors} setLineColors={setLineColors} lineFontSizes={lineFontSizes} setLineFontSizes={setLineFontSizes}
              isItalic={isItalic} setIsItalic={setIsItalic} tiltAngle={tiltAngle} setTiltAngle={setTiltAngle}
              fontColor={fontColor} setFontColor={setFontColor} borderColor={borderColor} setBorderColor={setBorderColor}
              borderWidth={borderWidth} setBorderWidth={setBorderWidth} shadowDistance={shadowDistance} setShadowDistance={setShadowDistance}
              position={position} setPosition={setPosition} offsetY={offsetY} setOffsetY={setOffsetY}
              hasBox={hasBox} setHasBox={setHasBox} boxStyle={boxStyle} setBoxStyle={setBoxStyle} boxOpacity={boxOpacity} setBoxOpacity={setBoxOpacity}
            />
          </div>

          {/* Кнопки действий */}
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.65rem', borderTop: '1px solid #27272a', paddingTop: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button className="copy-btn" disabled={saving} style={{ background: '#10b981', flex: 1, minWidth: '220px', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700 }} onClick={handleApply}>
              {saving ? '⏳ Сохранение...' : '💾 Применить и сохранить обложку'}
            </button>
            <button type="button" className="copy-btn" style={{ background: '#8b5cf6', padding: '0.75rem 1rem', fontWeight: 600 }} onClick={handleSaveAsDefault} title="Сделать этот шрифт, цвета и оформление стандартными для всех новых пакетов">
              ⭐ Сохранить как шаблон по умолчанию
            </button>
            <button type="button" className="copy-btn" style={{ background: '#3b82f6', padding: '0.75rem 0.9rem', fontWeight: 600 }} onClick={handleResetToDefault} title="Загрузить стандартный шаблон по умолчанию">
              🔄 К шаблону
            </button>
            <button className="copy-btn" style={{ background: '#3f3f46', padding: '0.75rem 1.2rem', fontWeight: 600 }} onClick={onClose}>
              ✕ Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
