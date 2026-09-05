import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { FEUILLETON_STYLES, AI_MODELS } from '../lib/utils'

export default function YouTubeMetadataModal({ pkg, onSaved, onClose }) {
  if (!pkg) return null

  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(false)
  const [savingJson, setSavingJson] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState(pkg.style || 'clickbait')
  const [selectedTone, setSelectedTone] = useState(pkg.tone || (pkg.style === 'analytics' ? 'analytics' : 'grotesque'))
  const [titleModel, setTitleModel] = useState('gemini')
  const [descModel, setDescModel] = useState('gemini')
  const [fbModel, setFbModel] = useState('gemini')
  const [sectionLoading, setSectionLoading] = useState(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [facebookPost, setFacebookPost] = useState('')

  const fetchMetadata = async (force = false, styleOverride = selectedStyle, toneOverride = selectedTone) => {
    setLoading(true)
    const styleLabel = FEUILLETON_STYLES.find(s => s.id === styleOverride)?.name?.split(' (')[0] || 'Кликбейт'
    const toastId = force ? toast.loading(`🤖 Генерация всех метаданных...`) : null
    try {
      const res = await fetch('/api/youtube-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: pkg.folderName, bundleDir: pkg.bundleDir, title: pkg.title, style: styleOverride, tone: toneOverride, force, section: 'all' }),
      })
      const data = await res.json()
      if (data.success) {
        if (!data.notGenerated) {
          setTitle(data.title || '')
          setDescription(data.description || '')
          setTags(data.tags || '')
          setHashtags(data.hashtags || '')
          setFacebookPost(data.facebookPost || '')
          if (force && toastId) toast.success(`✨ Метаданные (${styleLabel}) готовы!`, { id: toastId })
        }
      } else {
        if (toastId) toast.error('Ошибка генерации инфо', { id: toastId, description: data.error })
      }
    } catch (err) {
      if (toastId) toast.error('Ошибка загрузки: ' + err.message, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  const fetchSection = async (section, model) => {
    setSectionLoading(section)
    const mObj = AI_MODELS.find(m => m.id === model)
    const toastId = toast.loading(`🤖 Генерация (${section === 'title' ? 'Заголовок' : (section === 'description' ? 'Описание' : 'Пост FB')}) через ${mObj?.name || model}...`)
    try {
      const res = await fetch('/api/youtube-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: pkg.folderName, bundleDir: pkg.bundleDir, title: pkg.title, style: selectedStyle, tone: selectedTone, force: true, section, model }),
      })
      const data = await res.json()
      if (data.success) {
        if (section === 'title' && data.title) setTitle(data.title)
        if (section === 'description') {
          if (data.description) setDescription(data.description)
          if (data.tags) setTags(data.tags)
          if (data.hashtags) setHashtags(data.hashtags)
        }
        if (section === 'facebookPost' && data.facebookPost) setFacebookPost(data.facebookPost)
        toast.success(`✨ Обновлено через ${mObj?.name?.split(' ')[1] || 'ИИ'}!`, { id: toastId })
      } else {
        toast.error('Ошибка генерации: ' + (data.error || 'Неизвестная ошибка'), { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка: ' + err.message, { id: toastId })
    } finally {
      setSectionLoading(null)
    }
  }

  useEffect(() => {
    fetchMetadata(false, selectedStyle, selectedTone)
  }, [pkg?.folderName])

  const handleSaveToProject = async () => {
    try {
      setSavingJson(true)
      const res = await fetch('/api/save-youtube-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: pkg.folderName,
          bundleDir: pkg.bundleDir,
          title,
          description,
          tags,
          hashtags,
          facebookPost,
          style: selectedStyle,
          tone: selectedTone,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('💾 Метаданные успешно сохранены в проект (JSON)!')
        if (onSaved) onSaved({ title, description, tags, hashtags, facebookPost })
      } else {
        toast.error('Ошибка сохранения: ' + (data.error || 'Неизвестная ошибка'))
      }
    } catch (err) {
      toast.error('Ошибка сохранения: ' + err.message)
    } finally {
      setSavingJson(false)
    }
  }

  const handleDownloadJson = () => {
    const payload = {
      title,
      description,
      tags,
      hashtags,
      facebookPost,
      style: selectedStyle,
      exportedAt: new Date().toISOString(),
      folderName: pkg.folderName || '',
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `youtube_metadata_${pkg.folderName || 'package'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('📥 Файл youtube_metadata.json успешно скачан!')
  }

  const handleUploadJson = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result)
        if (json.title !== undefined) setTitle(json.title)
        if (json.description !== undefined) setDescription(json.description)
        if (json.tags !== undefined) setTags(json.tags)
        if (json.hashtags !== undefined) setHashtags(json.hashtags)
        if (json.facebookPost !== undefined) setFacebookPost(json.facebookPost)
        if (json.style && FEUILLETON_STYLES.some(s => s.id === json.style)) setSelectedStyle(json.style)
        toast.success(`📂 Метаданные успешно загружены из файла "${file.name}"!`)
      } catch (err) {
        toast.error('Ошибка парсинга JSON-файла: ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

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
    <div className="modal-overlay" onClick={e => { e.stopPropagation(); onClose(); }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '850px', width: '94%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleUploadJson}
          onClick={e => e.stopPropagation()}
          accept=".json,application/json"
          style={{ display: 'none' }}
        />
        <div className="modal-header">
          <div style={{ flex: 1 }}>
            <span className="modal-badge" style={{ background: '#dc2626', color: '#fff' }}>
              📺 YouTube & 📱 Facebook Метаданные ({currentStyleObj?.name?.split(' (')[0] || 'Кликбейт'})
            </span>
            <h2 className="modal-title" style={{ fontSize: '1.2rem', marginTop: '0.3rem' }}>
              {pkg.title}
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>🎭 Стиль:</span>
                {FEUILLETON_STYLES.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      const nextTone = s.id === 'analytics' ? 'analytics' : selectedTone
                      setSelectedStyle(s.id)
                      if (s.id === 'analytics') setSelectedTone('analytics')
                      fetchMetadata(false, s.id, nextTone)
                    }}
                    className={`saved-status-badge ${selectedStyle === s.id ? 'active' : 'inactive'} clickable`}
                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.55rem' }}
                  >
                    {s.icon} {s.name.split(' (')[0]}
                  </button>
                ))}
              </div>

              {/* JSON Toolbar: Datei Export/Import */}
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); handleDownloadJson(); }}
                  className="copy-btn"
                  style={{ background: '#2563eb', color: '#fff', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  title="Скачать файл youtube_metadata.json на компьютер (Экспорт)"
                >
                  📥 Экспорт .json
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="copy-btn"
                  style={{ background: '#475569', color: '#fff', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
                  title="Загрузить сохраненный JSON-файл с компьютера (Импорт)"
                >
                  📂 Импорт .json
                </button>
              </div>
            </div>

            {/* Тональность: Гротеск vs Аналитика */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>🎯 Подача:</span>
              <button
                type="button"
                onClick={() => { setSelectedTone('grotesque'); fetchMetadata(false, selectedStyle, 'grotesque'); }}
                className={`saved-status-badge ${selectedTone === 'grotesque' ? 'active' : 'inactive'} clickable`}
                style={{ fontSize: '0.75rem', padding: '0.15rem 0.55rem', background: selectedTone === 'grotesque' ? '#dc2626' : undefined, color: '#fff' }}
              >
                💥 Гротеск / Сатира
              </button>
              <button
                type="button"
                onClick={() => { setSelectedTone('analytics'); fetchMetadata(false, selectedStyle, 'analytics'); }}
                className={`saved-status-badge ${selectedTone === 'analytics' ? 'active' : 'inactive'} clickable`}
                style={{ fontSize: '0.75rem', padding: '0.15rem 0.55rem', background: selectedTone === 'analytics' ? '#059669' : undefined, color: '#fff' }}
              >
                🧠 Увлекательная Аналитика
              </button>
            </div>
          </div>
          <button className="modal-close" onClick={e => { e.stopPropagation(); onClose(); }}>✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
          {/* 1. YouTube Заголовок */}
          <div style={{ background: '#181c27', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #232936' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>🏷️ 1. Название видео (YouTube Title)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <select value={titleModel} onChange={e => setTitleModel(e.target.value)} style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '5px', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}>
                  {AI_MODELS.map(m => (<option key={m.id} value={m.id}>{m.icon} {m.name.split(' ')[1]}</option>))}
                </select>
                <button type="button" className="copy-btn" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', background: '#3b82f6' }} onClick={() => fetchSection('title', titleModel)} disabled={sectionLoading === 'title'}>
                  {sectionLoading === 'title' ? '⏳' : '🔄'}
                </button>
                <button type="button" className="copy-btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: '#1e40af' }} onClick={() => copyToClipboard(title, 'Заголовок')}>
                  📋 Копировать
                </button>
              </div>
            </div>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Генерация заголовка..." style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#fff', padding: '0.55rem 0.75rem', fontSize: '0.95rem', fontWeight: 600 }} />
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem', textAlign: 'right' }}>Длина: {title.length} / 100 символов</div>
          </div>

          {/* 2. Описание видео для YouTube */}
          <div style={{ background: '#181c27', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #232936' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>📝 2. Описание видео (YouTube Description)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <select value={descModel} onChange={e => setDescModel(e.target.value)} style={{ background: '#0d1117', border: '1px solid #30363d', color: '#e6edf3', borderRadius: '5px', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}>
                  {AI_MODELS.map(m => (<option key={m.id} value={m.id}>{m.icon} {m.name.split(' ')[1]}</option>))}
                </select>
                <button type="button" className="copy-btn" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', background: '#10b981' }} onClick={() => fetchSection('description', descModel)} disabled={sectionLoading === 'description'}>
                  {sectionLoading === 'description' ? '⏳' : '🔄'}
                </button>
                <button type="button" className="copy-btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: '#047857' }} onClick={() => copyToClipboard(description, 'Описание')}>
                  📋 Копировать
                </button>
              </div>
            </div>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Генерация описания..." rows={5} style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#e6edf3', padding: '0.55rem 0.75rem', fontSize: '0.85rem', lineHeight: '1.45', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {/* 3. Готовый пост для Facebook */}
          <div style={{ background: '#131b2e', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #1e3a8a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#60a5fa' }}>📱 3. Готовый пост для Facebook</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <select value={fbModel} onChange={e => setFbModel(e.target.value)} style={{ background: '#0a101f', border: '1px solid #1d4ed8', color: '#93c5fd', borderRadius: '5px', padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}>
                  {AI_MODELS.map(m => (<option key={m.id} value={m.id}>{m.icon} {m.name.split(' ')[1]}</option>))}
                </select>
                <button type="button" className="copy-btn" style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem', background: '#2563eb' }} onClick={() => fetchSection('facebookPost', fbModel)} disabled={sectionLoading === 'facebookPost'}>
                  {sectionLoading === 'facebookPost' ? '⏳' : '🔄'}
                </button>
                <button type="button" className="copy-btn" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem', background: '#1d4ed8' }} onClick={() => copyToClipboard(facebookPost, 'Пост для Facebook')}>
                  📋 Копировать
                </button>
              </div>
            </div>
            <textarea value={facebookPost} onChange={e => setFacebookPost(e.target.value)} placeholder="Генерация короткого вирусного поста для Facebook..." rows={5} style={{ width: '100%', background: '#0a101f', border: '1px solid #1d4ed8', borderRadius: '6px', color: '#f8fafc', padding: '0.55rem 0.75rem', fontSize: '0.88rem', lineHeight: '1.45', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {/* 4. Теги для YouTube Studio */}
          <div style={{ background: '#181c27', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #232936' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>🏷️ 4. Теги для YouTube Studio (Keywords)</label>
              <button type="button" className="copy-btn" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', background: '#8b5cf6' }} onClick={() => copyToClipboard(tags, 'Теги')}>
                📋 Скопировать теги
              </button>
            </div>
            <textarea value={tags} onChange={e => setTags(e.target.value)} placeholder="Теги через запятую..." rows={2} style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#e6edf3', padding: '0.55rem 0.75rem', fontSize: '0.85rem', resize: 'none' }} />
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.2rem', textAlign: 'right' }}>{tags.length} / 500 символов</div>
          </div>

          {/* 5. Хэштеги */}
          <div style={{ background: '#181c27', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #232936' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>#️⃣ 5. Хэштеги (Hashtags)</label>
              <button type="button" className="copy-btn" style={{ padding: '0.3rem 0.65rem', fontSize: '0.8rem', background: '#ec4899' }} onClick={() => copyToClipboard(hashtags, 'Хэштеги')}>
                📋 Скопировать хэштеги
              </button>
            </div>
            <input type="text" value={hashtags} onChange={e => setHashtags(e.target.value)} placeholder="#ChaosChronicle #новости..." style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '6px', color: '#38bdf8', padding: '0.55rem 0.75rem', fontSize: '0.9rem', fontWeight: 600 }} />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <button type="button" className="refresh-btn" onClick={() => fetchMetadata(true, selectedStyle)} disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🔄 {loading ? 'Генерация...' : `Сгенерировать (${currentStyleObj?.name?.split(' (')[0] || 'стиль'})`}
          </button>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button type="button" className="copy-btn" style={{ background: '#10b981', fontWeight: 700, padding: '0.6rem 1rem' }} onClick={handleSaveToProject} disabled={savingJson}>
              {savingJson ? '⏳' : '💾 Сохранить'}
            </button>
            <button type="button" className="copy-btn" style={{ background: '#dc2626', fontWeight: 700, padding: '0.6rem 1rem' }} onClick={copyAll}>
              ⚡ Скопировать всё
            </button>
            <button type="button" className="close-btn" onClick={onClose}>Закрыть</button>
          </div>
        </div>
      </div>
    </div>
  )
}
