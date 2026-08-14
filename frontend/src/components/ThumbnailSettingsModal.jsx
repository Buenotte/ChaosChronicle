import { useState, useEffect } from 'react'
import { toast } from 'sonner'

const FONTS = [
  { id: 'arialbd', name: 'Arial Bold', desc: 'Стандартный жирный, универсальный' },
  { id: 'impact', name: 'Impact', desc: 'Классический YouTube / вирусный стиль' },
  { id: 'segoeuib', name: 'Segoe UI Bold', desc: 'Современный четкий премиум' },
  { id: 'tahomabd', name: 'Tahoma Bold', desc: 'Широкий массивный' },
  { id: 'trebucbd', name: 'Trebuchet Bold', desc: 'Динамичный журнальный' },
  { id: 'verdanab', name: 'Verdana Bold', desc: 'Максимальная читаемость' },
  { id: 'georgiab', name: 'Georgia Bold', desc: 'С засечками / редакционный' },
]

const COLORS = [
  { id: 'yellow', hex: '#FFE600', label: 'Желтый' },
  { id: 'white', hex: '#FFFFFF', label: 'Белый' },
  { id: 'red', hex: '#FF2A2A', label: 'Красный' },
  { id: 'cyan', hex: '#00F0FF', label: 'Голубой' },
  { id: 'orange', hex: '#FF8C00', label: 'Оранжевый' },
  { id: 'green', hex: '#00FF66', label: 'Зеленый' },
]

export default function ThumbnailSettingsModal({ pkg, currentThumbnail, onClose, onUpdated }) {
  if (!pkg) return null

  const [text, setText] = useState(pkg.title || pkg.original_title || '')
  const [font, setFont] = useState('arialbd')
  const [fontSize, setFontSize] = useState('auto')
  const [fontColor, setFontColor] = useState('yellow')
  const [position, setPosition] = useState('center')
  const [borderWidth, setBorderWidth] = useState(9)
  const [hasBox, setHasBox] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generatingTitle, setGeneratingTitle] = useState(false)

  useEffect(() => {
    if (pkg) {
      setText(pkg.title || pkg.original_title || '')
    }
  }, [pkg])

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
            fontSize,
            fontColor,
            position,
            borderWidth,
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

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-content"
        style={{ maxWidth: '640px', width: '94vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚙️ Настройки заголовка и шрифта обложки
          </h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Исходная новость */}
          <div style={{ background: '#18181b', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #27272a' }}>
            <span style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', fontWeight: 600, marginBottom: '0.2rem' }}>
              📰 ПОЛНАЯ ТЕМА НОВОСТИ:
            </span>
            <span style={{ fontSize: '0.9rem', color: '#f4f4f5', fontWeight: 600 }}>
              {pkg.original_title || pkg.title}
            </span>
          </div>

          {/* Текст заголовка */}
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
              rows={3}
              style={{
                width: '100%',
                background: '#18181b',
                color: '#fff',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                padding: '0.65rem',
                fontSize: '0.95rem',
                resize: 'vertical',
                lineHeight: 1.35,
              }}
              placeholder="Введите текст заголовка..."
            />
            <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
              💡 Можно нажимать Enter для разделения на конкретные строки.
            </span>
          </div>

          {/* Выбор шрифта */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.35rem', fontWeight: 600 }}>
              🔤 Шрифт:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '0.45rem' }}>
              {FONTS.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFont(f.id)}
                  style={{
                    background: font === f.id ? '#3b82f6' : '#27272a',
                    color: '#fff',
                    border: font === f.id ? '2px solid #60a5fa' : '1px solid #3f3f46',
                    borderRadius: '8px',
                    padding: '0.5rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{f.name}</div>
                  <div style={{ fontSize: '0.7rem', color: font === f.id ? '#e0f2fe' : '#a1a1aa' }}>{f.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Размер шрифта */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
                📏 Размер шрифта:
              </label>
              <span style={{ fontSize: '0.85rem', color: '#60a5fa', fontWeight: 700 }}>
                {fontSize === 'auto' ? 'Автоматически (80-86px)' : `${fontSize} px`}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className="copy-btn"
                style={{ background: fontSize === 'auto' ? '#3b82f6' : '#27272a', fontSize: '0.8rem' }}
                onClick={() => setFontSize('auto')}
              >
                Auto (Рекомендуется)
              </button>
              {[58, 68, 78, 86, 96, 108].map(sz => (
                <button
                  key={sz}
                  type="button"
                  className="copy-btn"
                  style={{ background: fontSize === sz ? '#3b82f6' : '#27272a', fontSize: '0.8rem' }}
                  onClick={() => setFontSize(sz)}
                >
                  {sz}px
                </button>
              ))}
            </div>
          </div>

          {/* Цвет текста */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.35rem', fontWeight: 600 }}>
              🎨 Цвет текста:
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setFontColor(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: fontColor === c.id ? '#3f3f46' : '#27272a',
                    border: fontColor === c.id ? `2px solid ${c.hex}` : '1px solid #3f3f46',
                    borderRadius: '8px',
                    padding: '0.4rem 0.75rem',
                    cursor: 'pointer',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                  }}
                >
                  <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: c.hex, display: 'inline-block' }} />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Позиция и Контур */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Позиция */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.35rem', fontWeight: 600 }}>
                📍 Расположение:
              </label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {[
                  { id: 'top', label: '⬆️ Сверху' },
                  { id: 'center', label: '🎯 По центру' },
                  { id: 'bottom', label: '⬇️ Снизу' },
                ].map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPosition(p.id)}
                    style={{
                      flex: 1,
                      background: position === p.id ? '#3b82f6' : '#27272a',
                      border: position === p.id ? '2px solid #60a5fa' : '1px solid #3f3f46',
                      color: '#fff',
                      borderRadius: '6px',
                      padding: '0.45rem',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Подложка */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.35rem', fontWeight: 600 }}>
                ⬛ Подложка (Фон):
              </label>
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                <button
                  type="button"
                  onClick={() => setHasBox(false)}
                  style={{
                    flex: 1,
                    background: !hasBox ? '#10b981' : '#27272a',
                    border: !hasBox ? '2px solid #34d399' : '1px solid #3f3f46',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '0.45rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Прозрачный
                </button>
                <button
                  type="button"
                  onClick={() => setHasBox(true)}
                  style={{
                    flex: 1,
                    background: hasBox ? '#8b5cf6' : '#27272a',
                    border: hasBox ? '2px solid #a78bfa' : '1px solid #3f3f46',
                    color: '#fff',
                    borderRadius: '6px',
                    padding: '0.45rem',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Темный фон
                </button>
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.65rem', borderTop: '1px solid #27272a', paddingTop: '1rem' }}>
            <button
              className="copy-btn"
              disabled={saving}
              style={{ background: '#10b981', flex: 1.3, padding: '0.65rem', fontSize: '0.95rem', fontWeight: 700 }}
              onClick={() => handleApply(false)}
            >
              🎨 Применить к текущей обложке
            </button>

            <button
              className="copy-btn"
              disabled={saving}
              style={{ background: '#ec4899', flex: 1, padding: '0.65rem', fontSize: '0.85rem' }}
              onClick={() => handleApply(true)}
            >
              ✨ Новое AI фото + Текст
            </button>

            <button
              className="copy-btn"
              style={{ background: '#3f3f46', padding: '0.65rem 1rem' }}
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
