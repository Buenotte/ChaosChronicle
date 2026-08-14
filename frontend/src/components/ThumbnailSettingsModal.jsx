import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

const BUILTIN_FONTS = [
  { id: 'arialbd', name: 'Arial Bold', family: 'Arial, sans-serif', desc: 'Стандартный жирный, универсальный' },
  { id: 'impact', name: 'Impact', family: 'Impact, "Arial Black", sans-serif', desc: 'Классический YouTube / вирусный стиль' },
  { id: 'segoeuib', name: 'Segoe UI Bold', family: '"Segoe UI", sans-serif', desc: 'Современный четкий премиум' },
  { id: 'tahomabd', name: 'Tahoma Bold', family: 'Tahoma, sans-serif', desc: 'Широкий массивный' },
  { id: 'trebucbd', name: 'Trebuchet Bold', family: '"Trebuchet MS", sans-serif', desc: 'Динамичный журнальный' },
  { id: 'verdanab', name: 'Verdana Bold', family: 'Verdana, sans-serif', desc: 'Максимальная читаемость' },
  { id: 'georgiab', name: 'Georgia Bold', family: 'Georgia, serif', desc: 'С засечками / редакционный' },
]

const COLORS = [
  { id: 'yellow', hex: '#FFE600', label: 'Желтый' },
  { id: 'white', hex: '#FFFFFF', label: 'Белый' },
  { id: 'red', hex: '#FF2A2A', label: 'Красный' },
  { id: 'cyan', hex: '#00F0FF', label: 'Голубой' },
  { id: 'orange', hex: '#FF8C00', label: 'Оранжевый' },
  { id: 'green', hex: '#00FF66', label: 'Зеленый' },
]

const STROKE_COLORS = [
  { id: 'black', hex: '#000000', label: 'Черный' },
  { id: 'darkred', hex: '#5b0606', label: 'Темно-красный' },
  { id: 'darkblue', hex: '#0a1931', label: 'Темно-синий' },
  { id: 'white', hex: '#ffffff', label: 'Белый' },
]

export default function ThumbnailSettingsModal({ pkg, currentThumbnail, onClose, onUpdated }) {
  if (!pkg) return null

  const fileInputRef = useRef(null)
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
  const [shadowColor, setShadowColor] = useState('black')
  const [position, setPosition] = useState('center')
  const [hasBox, setHasBox] = useState(false)

  const [saving, setSaving] = useState(false)
  const [generatingTitle, setGeneratingTitle] = useState(false)

  // Load custom fonts on mount
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
        // Register fonts with browser FontFace
        data.fonts.forEach(async (f) => {
          try {
            const fontFace = new FontFace(f.name, `url(${f.url})`)
            await fontFace.load()
            document.fonts.add(fontFace)
          } catch (e) {
            console.warn('FontFace load warning:', e)
          }
        })
      }
    } catch (e) {
      console.warn('Custom fonts fetch warning:', e)
    }
  }

  // Handle local font file upload
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
          // Register in browser for live preview
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

  const handleSelectFont = (fId, family) => {
    setFont(fId)
    setFontFamilyName(family)
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
            shadowColor: shadowColor === 'black' ? 'black@0.92' : shadowColor,
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

  // Formatting lines for live preview
  const formatPreviewLines = (raw) => {
    const clean = String(raw || '')
      .replace(/[\r\n\t]/g, ' ')
      .replace(/["'«»`]/g, '')
      .trim()
    if (!clean) return ['ЗАГОЛОВОК ОБЛОЖКИ']

    const words = clean.split(/\s+/)
    let lines = []
    let curLine = ''
    const targetChars = 22

    for (const w of words) {
      if ((curLine + ' ' + w).trim().length <= targetChars) {
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

  // Color hex lookups
  const activeColorHex = COLORS.find(c => c.id === fontColor)?.hex || '#FFE600'
  const activeStrokeHex = STROKE_COLORS.find(c => c.id === borderColor)?.hex || '#000000'

  // Computed preview font size (scaled for 640px preview width vs 1280px full width)
  const calcLiveFontSize = () => {
    if (fontSize !== 'auto') {
      return (Number(customSizeNum) * 0.46) + 'px'
    }
    const longestLine = Math.max(...previewLines.map(l => l.length), 10)
    const rawPx = Math.floor(1200 / (longestLine * 0.62))
    const clamped = Math.min(Math.max(rawPx, 50), 86)
    return (clamped * 0.46) + 'px'
  }

  const previewSrc = currentThumbnail || `/news-static/${pkg.folderName}/thumbnail/thumbnail.jpg?t=${Date.now()}`

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="modal-content"
        style={{ maxWidth: '960px', width: '96vw', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
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

          {/* 🖼️ ЖИВОЙ ИНТЕРАКТИВНЫЙ ПРЕДПРОСМОТР (LIVE PREVIEW) */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#ec4899', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                👁️ ЖИВОЙ ПРЕДПРОСМОТР ОБЛОЖКИ (16:9):
              </label>
              <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                Обновляется мгновенно при любых изменениях
              </span>
            </div>

            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '16/9',
                maxHeight: '360px',
                borderRadius: '10px',
                overflow: 'hidden',
                background: '#09090b',
                boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                border: '2px solid #3f3f46',
                display: 'flex',
                alignItems: position === 'top' ? 'flex-start' : position === 'bottom' ? 'flex-end' : 'center',
                justifyContent: 'center',
                padding: position === 'top' ? '20px 16px' : position === 'bottom' ? '20px 16px' : '0 16px',
              }}
            >
              {/* Фоновое изображение */}
              <img
                src={previewSrc}
                alt="Thumbnail Preview"
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  filter: 'brightness(0.85)',
                }}
                onError={(e) => { e.target.style.display = 'none' }}
              />

              {/* Накладываемый живой текст с точной имитацией FFmpeg */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  textAlign: 'center',
                  fontFamily: fontFamilyName,
                  fontSize: calcLiveFontSize(),
                  fontWeight: 900,
                  lineHeight: 1.16,
                  color: activeColorHex,
                  letterSpacing: '0.5px',
                  // CSS Stroke / Outline
                  WebkitTextStroke: `${Math.round(borderWidth * 0.45)}px ${activeStrokeHex}`,
                  // CSS Shadow
                  textShadow: `${Math.round(shadowDistance * 0.45)}px ${Math.round(shadowDistance * 0.45)}px ${Math.round(shadowDistance * 0.45)}px rgba(0,0,0,0.92)`,
                  background: hasBox ? 'rgba(0, 0, 0, 0.72)' : 'transparent',
                  padding: hasBox ? '8px 18px' : '0',
                  borderRadius: hasBox ? '8px' : '0',
                  userSelect: 'none',
                  pointerEvents: 'none',
                  maxWidth: '92%',
                }}
              >
                {previewLines.map((line, idx) => (
                  <div key={idx} style={{ whiteSpace: 'nowrap' }}>
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 📝 РЕДАКТИРОВАНИЕ ТЕКСТА ЗАГОЛОВКА */}
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
                title="Сгенерировать короткий сатирический заголовок из 4-5 слов"
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

          {/* СЕТКА НАСТРОЕК В ДВЕ КОЛОНКИ */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            
            {/* КОЛОНКА 1: ШРИФТ И РАЗМЕР */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Выбор шрифта + Загрузка с диска */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
                    🔤 Шрифт:
                  </label>
                  <button
                    type="button"
                    className="copy-btn"
                    disabled={uploadingFont}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: '#3b82f6', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                    title="Загрузить шрифт .ttf или .otf с вашего компьютера"
                  >
                    {uploadingFont ? '⏳ Загрузка...' : '📂 Выбрать шрифт с диска (.ttf/.otf)'}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".ttf,.otf,.woff,.woff2"
                    style={{ display: 'none' }}
                    onChange={handleFontFileUpload}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto' }}>
                  {/* Загруженные пользователем шрифты */}
                  {customFonts.map(cf => {
                    const isSelected = font === cf.id
                    return (
                      <button
                        key={cf.id}
                        type="button"
                        onClick={() => handleSelectFont(cf.id, `"${cf.name}", sans-serif`)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          background: isSelected ? 'rgba(59, 130, 246, 0.2)' : '#18181b',
                          border: isSelected ? '2px solid #3b82f6' : '1px solid #27272a',
                          borderRadius: '6px',
                          color: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: `"${cf.name}", sans-serif` }}>
                          ⭐ {cf.name} (Пользовательский)
                        </span>
                        {isSelected && <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓</span>}
                      </button>
                    )
                  })}

                  {/* Встроенные стандартные шрифты */}
                  {BUILTIN_FONTS.map(f => {
                    const isSelected = font === f.id
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleSelectFont(f.id, f.family)}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '0.5rem 0.75rem',
                          background: isSelected ? 'rgba(59, 130, 246, 0.2)' : '#18181b',
                          border: isSelected ? '2px solid #3b82f6' : '1px solid #27272a',
                          borderRadius: '6px',
                          color: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: f.family }}>{f.name}</div>
                          <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{f.desc}</div>
                        </div>
                        {isSelected && <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Размер шрифта */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem', fontWeight: 600 }}>
                  📏 Размер шрифта: {fontSize === 'auto' ? 'Авто (Адаптивный)' : `${customSizeNum}px`}
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setFontSize('auto')}
                    style={{
                      padding: '0.4rem 0.75rem',
                      borderRadius: '6px',
                      background: fontSize === 'auto' ? '#3b82f6' : '#27272a',
                      color: '#fff',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    Авто
                  </button>
                  <input
                    type="range"
                    min="45"
                    max="115"
                    value={customSizeNum}
                    onChange={e => {
                      setCustomSizeNum(Number(e.target.value))
                      setFontSize(e.target.value)
                    }}
                    style={{ flex: 1, accentColor: '#3b82f6', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#fff', minWidth: '40px', textAlign: 'right', fontWeight: 700 }}>
                    {fontSize === 'auto' ? 'Auto' : `${customSizeNum}px`}
                  </span>
                </div>
              </div>

              {/* Позиция заголовка */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem', fontWeight: 600 }}>
                  📍 Расположение по вертикали:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'top', label: '⬆️ Вверху' },
                    { id: 'center', label: '🎯 По центру' },
                    { id: 'bottom', label: '⬇️ Внизу' },
                  ].map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPosition(p.id)}
                      style={{
                        padding: '0.45rem',
                        borderRadius: '6px',
                        background: position === p.id ? '#3b82f6' : '#18181b',
                        border: position === p.id ? '1px solid #60a5fa' : '1px solid #27272a',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* КОЛОНКА 2: ЦВЕТА, КОНТУР И ТЕНЬ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              {/* Цвет текста */}
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem', fontWeight: 600 }}>
                  🎨 Цвет текста:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
                  {COLORS.map(c => {
                    const isSelected = fontColor === c.id
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setFontColor(c.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          background: isSelected ? 'rgba(255,255,255,0.1)' : '#18181b',
                          border: isSelected ? `2px solid ${c.hex}` : '1px solid #27272a',
                          color: '#fff',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                        }}
                      >
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: c.hex, display: 'inline-block', border: '1px solid #000' }} />
                        <span style={{ fontWeight: isSelected ? 700 : 400 }}>{c.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* 🔲 КОНТУР / ОБВОДКА (STROKE) */}
              <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#f4f4f5', marginBottom: '0.4rem', fontWeight: 700 }}>
                  🔲 Контур (Обводка букв): {borderWidth}px
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="18"
                    value={borderWidth}
                    onChange={e => setBorderWidth(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#10b981', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#fff', minWidth: '35px', textAlign: 'right', fontWeight: 700 }}>
                    {borderWidth}px
                  </span>
                </div>
                {/* Цвет контура */}
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  {STROKE_COLORS.map(sc => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => setBorderColor(sc.id)}
                      style={{
                        flex: 1,
                        padding: '0.3rem',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        background: borderColor === sc.id ? '#27272a' : '#09090b',
                        border: borderColor === sc.id ? '2px solid #10b981' : '1px solid #27272a',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 👥 ТЕНЬ (SHADOW) */}
              <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: '#f4f4f5', marginBottom: '0.4rem', fontWeight: 700 }}>
                  👥 Тень текста: {shadowDistance}px
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <input
                    type="range"
                    min="0"
                    max="14"
                    value={shadowDistance}
                    onChange={e => setShadowDistance(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#ec4899', cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: '0.85rem', color: '#fff', minWidth: '35px', textAlign: 'right', fontWeight: 700 }}>
                    {shadowDistance}px
                  </span>
                </div>
              </div>

              {/* Полупрозрачная подложка */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', color: '#d4d4d8' }}>
                <input
                  type="checkbox"
                  checked={hasBox}
                  onChange={e => setHasBox(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
                />
                ⬛ Темная контрастная плашка под текстом (для шумного фона)
              </label>

            </div>

          </div>

          {/* КНОПКИ ДЕЙСТВИЙ */}
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', borderTop: '1px solid #27272a', paddingTop: '1rem', flexWrap: 'wrap' }}>
            <button
              className="copy-btn"
              disabled={saving}
              style={{
                background: '#10b981',
                flex: 2,
                minWidth: '220px',
                padding: '0.75rem',
                fontSize: '0.95rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              onClick={() => handleApply(false)}
            >
              {saving ? '⏳ Сохранение...' : '💾 Применить стиль и сохранить обложку'}
            </button>

            <button
              className="copy-btn"
              disabled={saving}
              style={{
                background: '#8b5cf6',
                flex: 1,
                minWidth: '180px',
                padding: '0.75rem',
                fontSize: '0.88rem',
                fontWeight: 600,
              }}
              onClick={() => handleApply(true)}
              title="Создать совершенно новое AI-изображение и наложить этот стиль заголовка"
            >
              🤖 Новый AI-фон с этим стилем
            </button>

            <button
              className="copy-btn"
              style={{ background: '#3f3f46', padding: '0.75rem 1.2rem' }}
              onClick={onClose}
            >
              Отмена
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
