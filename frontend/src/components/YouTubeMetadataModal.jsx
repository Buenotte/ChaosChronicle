import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { FEUILLETON_STYLES } from '../lib/utils'

export default function YouTubeMetadataModal({ pkg, onClose }) {
  if (!pkg) return null

  const [loading, setLoading] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState('golubuzki')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [facebookPost, setFacebookPost] = useState('')

  const fetchMetadata = async (force = false, styleOverride = selectedStyle) => {
    setLoading(true)
    const styleLabel = FEUILLETON_STYLES.find(s => s.id === styleOverride)?.name?.split(' (')[0] || 'Голобуцкий'
    const toastId = force
      ? toast.loading(`🤖 Генерация метаданных в стиле: ${styleLabel}...`)
      : toast.loading('📥 Загрузка метаданных...')

    try {
      const res = await fetch('/api/youtube-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: pkg.folderName,
          bundleDir: pkg.bundleDir,
          title: pkg.title,
          style: styleOverride,
          force,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setTitle(data.title || '')
        setDescription(data.description || '')
        setTags(data.tags || '')
        setHashtags(data.hashtags || '')
        setFacebookPost(data.facebookPost || '')
        toast.success(force ? `✨ Метаданные (${styleLabel}) готовы!` : '✅ Метаданные загружены!', { id: toastId })
      } else {
        toast.error('Ошибка генерации инфо', { id: toastId, description: data.error })
      }
    } catch (err) {
      toast.error('Ошибка загрузки: ' + err.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMetadata(false, selectedStyle)
  }, [pkg?.folderName])

  const copyToClipboard = (text, label) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success(`📋 ${label} скопирован в буфер обмена!`)
  }

  const copyAll = () => {
    const fullText = `=== НАЗВАНИЕ ВИДЕО (YOUTUBE) ===\n${title}\n\n=== ОПИСАНИЕ ВИДЕО (YOUTUBE) ===\n${description}\n\n=== ТЕГИ (YOUTUBE STUDIO) ===\n${tags}\n\n=== ХЭШТЕГИ ===\n${hashtags}\n\n=== ПОСТ ДЛЯ FACEBOOK ===\n${facebookPost}`
    navigator.clipboard.writeText(fullText)
    toast.success('📋 Все метаданные скопированы в буфер!')
  }

  const currentStyleObj = FEUILLETON_STYLES.find(s => s.id === selectedStyle)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '840px', width: '94%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div>
            <span className="modal-badge" style={{ background: '#dc2626', color: '#fff' }}>
              📺 YouTube & 📱 Facebook Метаданные ({currentStyleObj?.name?.split(' (')[0] || 'Голобуцкий'})
            </span>
            <h2 className="modal-title" style={{ fontSize: '1.2rem', marginTop: '0.3rem' }}>
              {pkg.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>🎭 Стиль:</span>
              {FEUILLETON_STYLES.map(s => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => {
                    setSelectedStyle(s.id)
                    fetchMetadata(false, s.id)
                  }}
                  className={`saved-status-badge ${selectedStyle === s.id ? 'active' : 'inactive'} clickable`}
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                >
                  {s.icon} {s.name.split(' (')[0]}
                </button>
              ))}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* 1. YouTube Заголовок */}
          <div style={{ background: '#181c27', padding: '1rem', borderRadius: '10px', border: '1px solid #232936' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>
                🏷️ 1. Название видео (YouTube Title)
              </label>
              <button
                type="button"
                className="copy-btn"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#3b82f6' }}
                onClick={() => copyToClipboard(title, 'Заголовок')}
              >
                📋 Скопировать заголовок
              </button>
            </div>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Генерация заголовка..."
              style={{
                width: '100%',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#fff',
                padding: '0.65rem 0.8rem',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.3rem', textAlign: 'right' }}>
              Длина: {title.length} / 100 символов
            </div>
          </div>

          {/* 2. Описание видео для YouTube */}
          <div style={{ background: '#181c27', padding: '1rem', borderRadius: '10px', border: '1px solid #232936' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>
                📝 2. Описание видео (YouTube Description)
              </label>
              <button
                type="button"
                className="copy-btn"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#10b981' }}
                onClick={() => copyToClipboard(description, 'Описание')}
              >
                📋 Скопировать описание
              </button>
            </div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Генерация описания..."
              rows={6}
              style={{
                width: '100%',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#e6edf3',
                padding: '0.65rem 0.8rem',
                fontSize: '0.85rem',
                lineHeight: '1.45',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* 3. Готовый пост для Facebook */}
          <div style={{ background: '#131b2e', padding: '1rem', borderRadius: '10px', border: '1px solid #1e3a8a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                📱 3. Готовый пост для Facebook (с приветствием и эмодзи)
              </label>
              <button
                type="button"
                className="copy-btn"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#2563eb' }}
                onClick={() => copyToClipboard(facebookPost, 'Пост для Facebook')}
              >
                📋 Скопировать пост FB
              </button>
            </div>
            <textarea
              value={facebookPost}
              onChange={e => setFacebookPost(e.target.value)}
              placeholder="Генерация короткого вирусного поста для Facebook..."
              rows={6}
              style={{
                width: '100%',
                background: '#0a101f',
                border: '1px solid #1d4ed8',
                borderRadius: '6px',
                color: '#f8fafc',
                padding: '0.65rem 0.8rem',
                fontSize: '0.88rem',
                lineHeight: '1.45',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* 4. Теги для YouTube Studio */}
          <div style={{ background: '#181c27', padding: '1rem', borderRadius: '10px', border: '1px solid #232936' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>
                🏷️ 4. Теги для YouTube Studio (Keywords)
              </label>
              <button
                type="button"
                className="copy-btn"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#8b5cf6' }}
                onClick={() => copyToClipboard(tags, 'Теги')}
              >
                📋 Скопировать теги
              </button>
            </div>
            <textarea
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="Теги через запятую..."
              rows={2}
              style={{
                width: '100%',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#e6edf3',
                padding: '0.65rem 0.8rem',
                fontSize: '0.85rem',
                resize: 'none',
              }}
            />
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.3rem', textAlign: 'right' }}>
              {tags.length} / 500 символов
            </div>
          </div>

          {/* 5. Хэштеги */}
          <div style={{ background: '#181c27', padding: '1rem', borderRadius: '10px', border: '1px solid #232936' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>
                #️⃣ 5. Хэштеги (Hashtags)
              </label>
              <button
                type="button"
                className="copy-btn"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', background: '#ec4899' }}
                onClick={() => copyToClipboard(hashtags, 'Хэштеги')}
              >
                📋 Скопировать хэштеги
              </button>
            </div>
            <input
              type="text"
              value={hashtags}
              onChange={e => setHashtags(e.target.value)}
              placeholder="#ChaosChronicle #новости..."
              style={{
                width: '100%',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#38bdf8',
                padding: '0.65rem 0.8rem',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button
            type="button"
            className="refresh-btn"
            onClick={() => fetchMetadata(true, selectedStyle)}
            disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            🔄 {loading ? 'Генерация...' : `Сгенерировать (${currentStyleObj?.name?.split(' (')[0] || 'стиль'})`}
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="copy-btn"
              style={{ background: '#dc2626', fontWeight: 700, padding: '0.6rem 1.1rem' }}
              onClick={copyAll}
            >
              ⚡ Скопировать всё сразу
            </button>
            <button type="button" className="close-btn" onClick={onClose}>
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
