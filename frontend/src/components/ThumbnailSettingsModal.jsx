import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import LiveThumbnailPreview from './thumbnail/LiveThumbnailPreview'
import FontPicker, { BUILTIN_FONTS } from './thumbnail/FontPicker'
import TypographyStyleControls, { COLORS, STROKE_COLORS } from './thumbnail/TypographyStyleControls'

export default function ThumbnailSettingsModal({ pkg, currentThumbnail, onClose, onUpdated }) {
  if (!pkg) return null

  const [text, setText] = useState(pkg.title || pkg.original_title || '')
  const [font, setFont] = useState('impact')
  const [fontFamilyName, setFontFamilyName] = useState('Impact, sans-serif')
  const [customFonts, setCustomFonts] = useState([])
  const [uploadingFont, setUploadingFont] = useState(false)

  const [fontSize, setFontSize] = useState('auto')
  const [customSizeNum, setCustomSizeNum] = useState(78)
  const [fontColor, setFontColor] = useState('yellow')
  const [borderColor, setBorderColor] = useState('black')
  const [borderWidth, setBorderWidth] = useState(9)
  const [shadowDistance, setShadowDistance] = useState(4)
  const [position, setPosition] = useState('center')
  const [hasBox, setHasBox] = useState(false)

  const [saving, setSaving] = useState(false)
  const [generatingTitle, setGeneratingTitle] = useState(false)

  useEffect(() => {
    fetchCustomFonts()
  }, [])

  useEffect(() => {
    if (pkg) {
      setText(pkg.title || pkg.original_title || '')
    }
  }, [pkg])

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
      const reader = new FileReader()
      reader.onload = async () => {
        const base64Data = reader.result.split(',')[1]
        const res = await fetch('/api/upload-font', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file.name,
            fontName: file.name.replace(/\.[^.]+$/, ''),
            base64Data,
          }),
        })
        const data = await res.json()
        if (data.success && data.font) {
          try {
            const fontFace = new FontFace(data.font.name, `url(${data.font.url})`)
            await fontFace.load()
            document.fonts.add(fontFace)
          } catch {}

          setCustomFonts(prev => [data.font, ...prev.filter(f => f.id !== data.font.id)])
          setFont(data.font.id)
          setFontFamilyName(`"${data.font.name}", sans-serif`)
          toast.success(`🔤 Шрифт "${data.font.name}" успешно загружен и применен!`)
        } else {
          toast.error('Ошибка загрузки шрифта: ' + (data.error || 'Неизвестная ошибка'))
        }
        setUploadingFont(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      setUploadingFont(false)
      toast.error('Ошибка чтения файла шрифта: ' + err.message)
    }
  }

  const handleGeneratePunchyTitle = async () => {
    try {
      setGeneratingTitle(true)
      const res = await fetch('/api/generate-punchy-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pkg.original_title || pkg.title || text,
          summary: pkg.summary || ''
        }),
      })
      const data = await res.json()
      if (data.success && data.title) {
        setText(data.title)
        toast.success(`⚡ Заголовок в стиле Голобуцкого создан: "${data.title}"`)
      }
    } catch (e) {
      toast.error('Ошибка генерации заголовка: ' + e.message)
    } finally {
      setGeneratingTitle(false)
    }
  }

  const handleApply = async (generateNewAi = false) => {
    try {
      setSaving(true)
      const toastId = toast.loading(generateNewAi ? '🤖 Генерация нового AI фото и заголовка...' : '🎨 Применение настроек шрифта...')
      
      const res = await fetch('/api/set-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: generateNewAi ? 'generate_ai' : 'apply_headline',
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          headlineConfig: {
            text,
            font,
            fontSize: fontSize === 'auto' ? 'auto' : Number(customSizeNum),
            fontColor,
            borderColor,
            borderWidth: Number(borderWidth),
            shadowDistance: Number(shadowDistance),
            position,
            hasBox,
          }
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('✨ Обложка успешно обновлена!', { id: toastId })
        if (onUpdated) onUpdated(`${data.thumbnailUrl}&t=${Date.now()}`)
        onClose()
      } else {
        toast.error('Ошибка: ' + (data.error || 'Не удалось обновить'), { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка сохранения: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const formatPreviewLines = (raw) => {
    const clean = String(raw || '').replace(/[\r\n\t]/g, ' ').replace(/["'«»`]/g, '').trim()
    if (!clean) return ['ЗАГОЛОВОК ОБЛОЖКИ']
    const words = clean.split(/\s+/)
    let lines = []
    let curLine = ''
    for (const w of words) {
      if ((curLine + ' ' + w).trim().length <= 22) {
        curLine = (curLine + ' ' + w).trim()
      } else {
        if (curLine) lines.push(curLine)
        curLine = w
        if (lines.length >= 3) break
      }
    }
    if (curLine && lines.length < 3) lines.push(curLine)
    return lines.map(l => l.toUpperCase())
  }

  const previewLines = formatPreviewLines(text)
  const activeColorHex = COLORS.find(c => c.id === fontColor)?.hex || '#FFE600'
  const activeStrokeHex = STROKE_COLORS.find(c => c.id === borderColor)?.hex || '#000000'

  const calcLiveFontSize = () => {
    if (fontSize !== 'auto') return (Number(customSizeNum) * 0.46) + 'px'
    const longest = Math.max(...previewLines.map(l => l.length), 10)
    const rawPx = Math.floor(1200 / (longest * 0.62))
    return (Math.min(Math.max(rawPx, 50), 86) * 0.46) + 'px'
  }

  const previewSrc = currentThumbnail || `/news-static/${pkg.folderName}/thumbnail/thumbnail.jpg?t=${Date.now()}`

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div className="modal-content" style={{ maxWidth: '960px', width: '96vw', maxHeight: '92vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
              🎨 Настройка заголовка, шрифта, контура и тени
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
              Живая визуализация 16:9 • Выбор шрифта с диска • Настройка контура и тени
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
            previewSrc={previewSrc}
            position={position}
            fontFamilyName={fontFamilyName}
            calcLiveFontSize={calcLiveFontSize}
            activeColorHex={activeColorHex}
            borderWidth={borderWidth}
            activeStrokeHex={activeStrokeHex}
            shadowDistance={shadowDistance}
            hasBox={hasBox}
            previewLines={previewLines}
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

          {/* Настройки шрифта, размеров, цветов, контура и тени */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <FontPicker
              font={font}
              customFonts={customFonts}
              uploadingFont={uploadingFont}
              onSelectFont={(fId, fam) => { setFont(fId); setFontFamilyName(fam); }}
              onFontFileUpload={handleFontFileUpload}
            />

            <TypographyStyleControls
              fontSize={fontSize}
              setFontSize={setFontSize}
              customSizeNum={customSizeNum}
              setCustomSizeNum={setCustomSizeNum}
              fontColor={fontColor}
              setFontColor={setFontColor}
              borderColor={borderColor}
              setBorderColor={setBorderColor}
              borderWidth={borderWidth}
              setBorderWidth={setBorderWidth}
              shadowDistance={shadowDistance}
              setShadowDistance={setShadowDistance}
              position={position}
              setPosition={setPosition}
              hasBox={hasBox}
              setHasBox={setHasBox}
            />
          </div>

          {/* Кнопки действий */}
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', borderTop: '1px solid #27272a', paddingTop: '1rem', flexWrap: 'wrap' }}>
            <button
              className="copy-btn"
              disabled={saving}
              style={{ background: '#10b981', flex: 2, minWidth: '220px', padding: '0.75rem', fontSize: '0.95rem', fontWeight: 700 }}
              onClick={() => handleApply(false)}
            >
              {saving ? '⏳ Сохранение...' : '💾 Применить стиль и сохранить обложку'}
            </button>

            <button
              className="copy-btn"
              disabled={saving}
              style={{ background: '#8b5cf6', flex: 1, minWidth: '180px', padding: '0.75rem', fontSize: '0.88rem', fontWeight: 600 }}
              onClick={() => handleApply(true)}
            >
              🤖 Новый AI-фон с этим стилем
            </button>

            <button className="copy-btn" style={{ background: '#3f3f46', padding: '0.75rem 1.2rem' }} onClick={onClose}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
