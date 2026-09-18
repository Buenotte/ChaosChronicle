import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { YOUTUBE_TOPIC_STYLES } from '../lib/utils'

export default function YouTubeImportModal({ isOpen, onClose, onPackageCreated, onOpenPackage }) {
  const [url, setUrl] = useState('')
  const [style, setStyle] = useState('scipop')
  const [loading, setLoading] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [videoPreview, setVideoPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [createdPackage, setCreatedPackage] = useState(null)
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setUrl('')
      setVideoPreview(null)
      setCreatedPackage(null)
      setProgressStep(0)
    } else {
      const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  // Auto-fetch preview metadata when URL looks like a YouTube link
  useEffect(() => {
    if (!url || !isOpen) return
    const isYt = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url.trim())
    if (!isYt) return

    const timer = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const res = await fetch('/api/youtube/info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: url.trim() }),
        })
        const data = await res.json()
        if (data.success && data.metadata) setVideoPreview(data.metadata)
      } catch {}
      finally { setPreviewLoading(false) }
    }, 500)
    return () => clearTimeout(timer)
  }, [url, isOpen])

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text) {
        setUrl(text.trim())
        toast.info('Ссылка вставлена из буфера')
      }
    } catch {
      toast.error('Не удалось прочитать буфер обмена')
    }
  }

  const handleStartImport = async (e) => {
    e.preventDefault()
    if (!url.trim()) return toast.error('Укажите ссылку на YouTube видео')

    setLoading(true)
    setProgressStep(1)
    const toastId = toast.loading('🎬 Скачивание YouTube аудио...', { description: 'Извлечение звуковой дорожки и обложки...' })

    const step2Timer = setTimeout(() => {
      setProgressStep(2)
      toast.loading('🧠 Faster-Whisper распознает речь...', { id: toastId, description: 'Преобразование аудио в текст...' })
    }, 4500)

    const step3Timer = setTimeout(() => {
      setProgressStep(3)
      toast.loading('✨ Gemini 3.8 Flash пишет 3-мин. сценарий...', { id: toastId, description: 'Создание авторского монолога (400-550 слов)...' })
    }, 11000)

    try {
      const res = await fetch('/api/youtube/import-to-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), style }),
      })
      const result = await res.json()
      clearTimeout(step2Timer)
      clearTimeout(step3Timer)

      if (result.success) {
        setProgressStep(4)
        setCreatedPackage(result)
        toast.success('🎉 3-минутный сценарий готов и сохранён в новости!', {
          id: toastId,
          description: `Слов: ${result.wordCount} · Папка: ${result.folderName}`
        })
        if (onPackageCreated) onPackageCreated(result)
      } else {
        toast.error(result.error || 'Ошибка обработки YouTube видео', { id: toastId })
        setProgressStep(0)
      }
    } catch (err) {
      clearTimeout(step2Timer)
      clearTimeout(step3Timer)
      toast.error('Сбой импорта: ' + err.message, { id: toastId })
      setProgressStep(0)
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0, 0, 0, 0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', overflowY: 'auto' }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '680px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#13111f', border: '1px solid #7c3aed', boxShadow: '0 25px 65px rgba(0,0,0,0.85), 0 0 35px rgba(124, 58, 237, 0.25)', borderRadius: '16px', color: '#f3f4f6', padding: 0, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.5rem', borderBottom: '1px solid #2d2248', background: '#19152b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span style={{ fontSize: '1.6rem' }}>🎬</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: '#ffffff' }}>
                YouTube видео ➜ 3-Мин. Сценарий
              </h2>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#9ca3af' }}>
                Извлечение аудио, ИИ-транскрипция и автосохранение в новости
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.4rem', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.4rem 1.5rem' }}>
          {!createdPackage ? (
            <form onSubmit={handleStartImport}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#d1d5db' }}>
                  🔗 Ссылка на YouTube видео или Shorts:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="https://www.youtube.com/watch?v=... или Shorts"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    disabled={loading}
                    autoFocus
                    style={{ flex: 1, background: '#1c192e', border: '1px solid #4c1d95', borderRadius: '8px', padding: '0.65rem 0.85rem', color: '#ffffff', fontSize: '0.88rem', outline: 'none' }}
                  />
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    disabled={loading}
                    style={{ background: '#2e1065', border: '1px solid #6d28d9', color: '#c4b5fd', borderRadius: '8px', padding: '0.65rem 0.9rem', cursor: 'pointer', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
                  >
                    📋 Вставить
                  </button>
                </div>
              </div>

              {previewLoading && (
                <div style={{ padding: '0.75rem', background: '#181427', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', color: '#a78bfa' }}>
                  ⏳ Загрузка информации о видео...
                </div>
              )}
              {videoPreview && !previewLoading && (
                <div style={{ display: 'flex', gap: '0.85rem', background: '#1a162b', border: '1px solid #3b2d54', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
                  {videoPreview.thumbnail && (
                    <img src={videoPreview.thumbnail} alt="cover" style={{ width: '96px', height: '54px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
                  )}
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {videoPreview.title}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#9ca3af', marginTop: '0.2rem' }}>
                      📺 {videoPreview.channel} · ⏱️ {Math.round(videoPreview.duration || 0)} сек.
                    </div>
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#d1d5db' }}>
                  🎬 Стиль 3-минутного видео (интересные темы):
                </label>
                <select
                  value={style}
                  onChange={e => setStyle(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    background: '#1c192e',
                    border: '1px solid #4c1d95',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    color: '#ffffff',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                >
                  {YOUTUBE_TOPIC_STYLES.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                {(() => {
                  const curr = YOUTUBE_TOPIC_STYLES.find(s => s.id === style)
                  return curr ? (
                    <div style={{ fontSize: '0.74rem', color: '#a78bfa', marginTop: '0.35rem', fontStyle: 'italic' }}>
                      💡 {curr.desc}
                    </div>
                  ) : null
                })()}
              </div>

              {loading && (
                <div style={{ background: '#1a162b', border: '1px solid #7c3aed', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.25rem' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.5rem' }}>
                    🚀 Процесс создания новости:
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                    <div style={{ color: progressStep >= 1 ? '#4ade80' : '#6b7280' }}>
                      {progressStep > 1 ? '✅' : '⏳'} 1. Скачивание аудио и обложки (yt-dlp)
                    </div>
                    <div style={{ color: progressStep >= 2 ? '#4ade80' : '#6b7280' }}>
                      {progressStep > 2 ? '✅' : progressStep === 2 ? '⏳' : '○'} 2. Распознавание речи (Faster-Whisper ИИ)
                    </div>
                    <div style={{ color: progressStep >= 3 ? '#4ade80' : '#6b7280' }}>
                      {progressStep > 3 ? '✅' : progressStep === 3 ? '⏳' : '○'} 3. Генерация 3-мин. сценария (Gemini 3.8 Flash)
                    </div>
                    <div style={{ color: progressStep >= 4 ? '#4ade80' : '#6b7280' }}>
                      {progressStep >= 4 ? '✅' : '○'} 4. Сохранение новости в пакет
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  style={{ background: '#27272a', color: '#d4d4d8', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={loading || !url.trim()}
                  style={{
                    background: loading ? '#4c1d95' : 'linear-gradient(135deg, #ef4444, #7c3aed)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0.65rem 1.4rem',
                    fontSize: '0.88rem',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)',
                  }}
                >
                  {loading ? '⏳ Создание...' : '🚀 Извлечь Audio & Создать Сценарий'}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div style={{ background: '#064e3b', border: '1px solid #10b981', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', fontWeight: 800, fontSize: '0.95rem' }}>
                  <span>✨</span> Пакет успешно создан и сохранён в «Сохранённые»!
                </div>
                <div style={{ fontSize: '0.82rem', color: '#d1fae5', marginTop: '0.35rem' }}>
                  Заголовок: <strong>{createdPackage.title}</strong>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#a7f3d0', marginTop: '0.2rem' }}>
                  📊 Слов: {createdPackage.wordCount} (~3 мин.) · 🎙️ Озвучка: создается в Студии (раздел 3)
                </div>
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#d1d5db', marginBottom: '0.35rem' }}>
                  🎙️ Фрагмент готового 3-минутного сценария:
                </label>
                <div
                  style={{
                    background: '#181427',
                    border: '1px solid #3730a3',
                    borderRadius: '8px',
                    padding: '0.85rem',
                    fontSize: '0.82rem',
                    lineHeight: '1.45',
                    maxHeight: '170px',
                    overflowY: 'auto',
                    color: '#e0e7ff',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {createdPackage.text}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={onClose}
                  style={{ background: '#27272a', color: '#d4d4d8', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '0.88rem', cursor: 'pointer' }}
                >
                  Закрыть
                </button>
                <button
                  type="button"
                  disabled={loadingPhotos}
                  onClick={async () => {
                    setLoadingPhotos(true)
                    const toastId = toast.loading('🖼️ ИИ загружает 100 фото по тексту...')
                    try {
                      const res = await fetch('/api/auto-fetch-photos', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ folderName: createdPackage.folderName, count: 100 }),
                      })
                      const d = await res.json()
                      toast.dismiss(toastId)
                      if (d.success) {
                        toast.success(`🎉 Загружено ${d.count} фото!`)
                        if (onPackageCreated) onPackageCreated(createdPackage)
                      } else { toast.error('Ошибка: ' + d.error) }
                    } catch (e) { toast.dismiss(toastId); toast.error('Ошибка: ' + e.message) }
                    finally { setLoadingPhotos(false) }
                  }}
                  style={{ background: '#065f46', color: '#6ee7b7', border: '1px solid #10b981', borderRadius: '8px', padding: '0.65rem 1.2rem', fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {loadingPhotos ? '⏳ Загрузка 100 фото...' : '🖼️ 100 фото автоматом'}
                </button>
                {onOpenPackage && (
                  <button
                    type="button"
                    onClick={() => { onOpenPackage(createdPackage); onClose() }}
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '0.65rem 1.35rem',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
                    }}
                  >
                    📂 Открыть в Студии
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
