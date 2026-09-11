import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { CATEGORIES } from '../lib/utils'

export default function CustomNewsModal({ isOpen, onClose, onNewsCreated }) {
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [category, setCategory] = useState('absurd')
  const [source, setSource] = useState('YouTube')
  const [link, setLink] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const fileInputRef = useRef(null)

  const availableCategories = CATEGORIES.filter(c => c.key !== 'alle' && c.key !== 'vse' && c.key !== 'saved')

  // Оптимизация и сжатие изображения на клиенте перед OCR
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const reader = new FileReader()
      reader.onload = (e) => {
        img.onload = () => {
          const maxDim = 1600
          let { width, height } = img
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)
          resolve(canvas.toDataURL('image/jpeg', 0.85))
        }
        img.onerror = () => reject(new Error('Не удалось прочитать изображение'))
        img.src = e.target.result
      }
      reader.onerror = () => reject(new Error('Ошибка чтения файла'))
      reader.readAsDataURL(file)
    })
  }

  const processImageFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Пожалуйста, выберите файл изображения (PNG, JPG, WebP)')
      return
    }

    setOcrLoading(true)
    const toastId = toast.loading('🧠 ИИ распознает скриншот...', {
      description: 'Чтение текста, определение автора и темы...'
    })

    try {
      const base64Data = await compressImage(file)
      setPreviewUrl(base64Data)

      const res = await fetch('/api/news/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data }),
      })
      const result = await res.json()
      if (result.success && result.data) {
        const { title: ocrTitle, summary: ocrSummary, source: ocrSource, category: ocrCat } = result.data
        if (ocrTitle) setTitle(ocrTitle)
        if (ocrSummary) setSummary(ocrSummary)
        if (ocrSource) setSource(ocrSource)
        if (ocrCat && availableCategories.some(c => c.key === ocrCat)) setCategory(ocrCat)
        toast.success('✨ Скриншот успешно распознан!', {
          id: toastId,
          description: (ocrSource || 'Источник') + ' | ' + (ocrTitle ? ocrTitle.slice(0, 45) + '...' : '')
        })
      } else {
        toast.error(result.error || 'Не удалось распознать новость', { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка распознавания: ' + err.message, { id: toastId })
    } finally {
      setOcrLoading(false)
    }
  }

  // Обработка вставки из буфера обмена (Ctrl + V) и Escape
  useEffect(() => {
    if (!isOpen) return
    const handlePaste = (e) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            e.preventDefault()
            processImageFile(file)
            break
          }
        }
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('paste', handlePaste)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('paste', handlePaste)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (openFeuilleton = false) => {
    if (!title.trim()) {
      toast.error('Пожалуйста, введите заголовок новости')
      return
    }

    setSubmitting(true)
    const toastId = toast.loading('Добавление новости...')

    try {
      const res = await fetch('/api/news/custom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          summary: summary.trim(),
          category,
          source: source.trim() || 'Своя новость',
          link: link.trim(),
        }),
      })

      const data = await res.json()
      if (data.success && data.article) {
        toast.success('Новость успешно добавлена!', { id: toastId })
        onNewsCreated(data.article, openFeuilleton)
        onClose()
        setTitle('')
        setSummary('')
        setPreviewUrl(null)
      } else {
        toast.error(data.error || 'Ошибка при добавлении новости', { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка сети: ' + err.message, { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100, overflowY: 'auto' }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '680px',
          width: '94%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#111827',
          border: '1px solid #374151',
          borderRadius: '14px',
          padding: 0,
          overflow: 'hidden',
          boxShadow: '0 25px 60px rgba(0,0,0,0.75)',
        }}
      >
        {/* Заголовок модального окна */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.4rem', borderBottom: '1px solid #1f2937', background: '#131b2e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '1.4rem' }}>✍️</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#f3f4f6', fontWeight: 700 }}>Добавить свою новость</h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#9ca3af' }}>Текстом или мгновенно со скриншота (YouTube, Telegram, Twitter)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.3rem', cursor: 'pointer', padding: '0.2rem 0.5rem', borderRadius: '4px' }}
          >
            ✕
          </button>
        </div>

        {/* Прокручиваемое тело формы */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.2rem 1.4rem', display: 'flex', flexDirection: 'column', gap: '1rem', overscrollBehavior: 'contain' }}>
          {/* Дропзона для скриншота */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => e.preventDefault()}
            onDrop={e => { e.preventDefault(); if (e.dataTransfer.files?.[0]) processImageFile(e.dataTransfer.files[0]) }}
            style={{
              border: '2px dashed #4b5563',
              borderRadius: '10px',
              padding: '0.9rem',
              textAlign: 'center',
              cursor: 'pointer',
              background: ocrLoading ? '#1e1b4b' : '#181f2f',
              borderColor: ocrLoading ? '#8b5cf6' : '#4b5563',
              transition: 'all 0.2s',
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => { if (e.target.files?.[0]) processImageFile(e.target.files[0]) }}
            />
            {ocrLoading ? (
              <div style={{ color: '#a78bfa', fontWeight: 700, fontSize: '0.86rem' }}>
                ⏳ ИИ анализирует скриншот и извлекает текст...
              </div>
            ) : previewUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem' }}>
                <img src={previewUrl} alt="Скриншот" style={{ maxHeight: '48px', borderRadius: '4px', border: '1px solid #4b5563' }} />
                <div style={{ textAlign: 'left' }}>
                  <span style={{ color: '#34d399', fontWeight: 700, fontSize: '0.82rem' }}>✅ Скриншот загружен</span>
                  <div style={{ color: '#9ca3af', fontSize: '0.74rem' }}>Нажмите, чтобы заменить другой картинкой</div>
                </div>
              </div>
            ) : (
              <div>
                <span style={{ fontSize: '1.2rem', display: 'block', marginBottom: '0.2rem' }}>📸</span>
                <span style={{ color: '#f3f4f6', fontWeight: 600, fontSize: '0.84rem' }}>
                  Загрузите скриншот или нажмите <kbd style={{ background: '#374151', padding: '1px 5px', borderRadius: '4px', color: '#93c5fd' }}>Ctrl + V</kbd>
                </span>
                <div style={{ color: '#9ca3af', fontSize: '0.73rem', marginTop: '0.2rem' }}>
                  ИИ автоматически прочитает текст, заполнит заголовок и автора
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '0.3rem' }}>
              📌 Заголовок / Тема новости <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="Например: В Нижегородской области борщевик внесли в реестр растений-иноагентов"
              value={title}
              onChange={e => setTitle(e.target.value)}
              style={{ width: '100%', background: '#1f2937', border: '1px solid #4b5563', borderRadius: '6px', color: '#fff', padding: '0.55rem 0.75rem', fontSize: '0.88rem' }}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: '#e5e7eb', margin: 0 }}>
                📝 Полный текст новости (Telegram / Источник / Пост)
              </label>
              {summary && (
                <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                  {summary.split(/\s+/).filter(Boolean).length} слов · {summary.length} симв.
                </span>
              )}
            </div>
            <textarea
              rows={6}
              placeholder="Вставьте полный оригинальный текст из Telegram или контекст новости (абзацы и форматирование сохраняются полностью)..."
              value={summary}
              onChange={e => setSummary(e.target.value)}
              style={{ width: '100%', background: '#1f2937', border: '1px solid #4b5563', borderRadius: '6px', color: '#fff', padding: '0.6rem 0.75rem', fontSize: '0.86rem', resize: 'vertical', minHeight: '110px', lineHeight: 1.5 }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '0.3rem' }}>
                🏷️ Рубрика
              </label>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                style={{ width: '100%', background: '#1f2937', border: '1px solid #4b5563', borderRadius: '6px', color: '#fff', padding: '0.5rem 0.6rem', fontSize: '0.84rem' }}
              >
                {availableCategories.map(c => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '0.3rem' }}>
                📡 Источник / Автор
              </label>
              <input
                type="text"
                placeholder="YouTube / varlamov / Telegram"
                value={source}
                onChange={e => setSource(e.target.value)}
                style={{ width: '100%', background: '#1f2937', border: '1px solid #4b5563', borderRadius: '6px', color: '#fff', padding: '0.5rem 0.6rem', fontSize: '0.84rem' }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#e5e7eb', marginBottom: '0.3rem' }}>
              🔗 Ссылка на первоисточник (опционально)
            </label>
            <input
              type="url"
              placeholder="https://t.me/... или https://youtube.com/..."
              value={link}
              onChange={e => setLink(e.target.value)}
              style={{ width: '100%', background: '#1f2937', border: '1px solid #4b5563', borderRadius: '6px', color: '#fff', padding: '0.5rem 0.6rem', fontSize: '0.84rem' }}
            />
          </div>
        </div>

        {/* Футер с кнопками */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', padding: '0.9rem 1.4rem', borderTop: '1px solid #1f2937', background: '#131b2e', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ background: '#374151', color: '#e5e7eb', border: 'none', borderRadius: '6px', padding: '0.5rem 0.95rem', fontSize: '0.84rem', cursor: 'pointer', fontWeight: 600 }}
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={submitting || ocrLoading}
            style={{ background: '#4b5563', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1.05rem', fontSize: '0.84rem', cursor: 'pointer', fontWeight: 700 }}
          >
            ➕ В ленту
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={submitting || ocrLoading}
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', border: '1px solid #a78bfa', borderRadius: '6px', padding: '0.5rem 1.15rem', fontSize: '0.84rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>⚡</span>
            <span>Создать фельетон</span>
          </button>
        </div>
      </div>
    </div>
  )
}
