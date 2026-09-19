import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { YOUTUBE_TOPIC_STYLES } from '../lib/utils'
import YouTubeFactsModal from './YouTubeFactsModal'

const btnStyle = (bg, color, border = 'none') => ({
  background: bg, color, border, borderRadius: '8px', padding: '0.65rem 1.1rem',
  fontSize: '0.86rem', fontWeight: 600, cursor: 'pointer',
})

export default function YouTubeImportModal({ isOpen, onClose, onPackageCreated, onOpenPackage }) {
  const [url, setUrl] = useState('')
  const [style, setStyle] = useState('scipop')
  const [loading, setLoading] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [videoPreview, setVideoPreview] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [createdPackage, setCreatedPackage] = useState(null)
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [facts, setFacts] = useState([])
  const [factsModalOpen, setFactsModalOpen] = useState(false)
  const [factsLoading, setFactsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setUrl(''); setVideoPreview(null); setCreatedPackage(null); setProgressStep(0); setFacts([]); setFactsModalOpen(false)
    } else {
      const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }
  }, [isOpen])

  useEffect(() => {
    if (!url || !isOpen || !/^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url.trim())) return
    const timer = setTimeout(async () => {
      setPreviewLoading(true)
      try {
        const res = await fetch('/api/youtube/info', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) })
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
      if (text) { setUrl(text.trim()); toast.info('Ссылка вставлена из буфера') }
    } catch { toast.error('Не удалось прочитать буфер обмена') }
  }

  const handleExtractFacts = async () => {
    if (!url.trim()) return toast.error('Укажите ссылку на YouTube видео')
    setFactsLoading(true)
    const toastId = toast.loading('🔍 Извлечение 20 фактов...', { description: 'Получение транскрипта и анализ через Gemini...' })
    try {
      const res = await fetch('/api/youtube/extract-facts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: url.trim() }) })
      const data = await res.json()
      if (data.success && data.facts?.length > 0) {
        setFacts(data.facts)
        if (data.metadata) setVideoPreview(data.metadata)
        toast.success(`🎉 Найдено ${data.facts.length} ключевых фактов!`, { id: toastId })
        setFactsModalOpen(true)
      } else { toast.error(data.error || 'Не удалось извлечь факты', { id: toastId }) }
    } catch (err) { toast.error('Ошибка анализа: ' + err.message, { id: toastId }) }
    finally { setFactsLoading(false) }
  }

  const handleStartImport = async (e, selectedFacts = null) => {
    if (e) e.preventDefault()
    if (!url.trim()) return toast.error('Укажите ссылку на YouTube видео')
    setLoading(true); setProgressStep(1)
    const toastId = toast.loading('🎬 Скачивание YouTube аудио...', { description: 'Извлечение дорожки и обложки...' })
    const t2 = setTimeout(() => { setProgressStep(2); toast.loading('🧠 Whisper распознает речь...', { id: toastId }) }, 4500)
    const t3 = setTimeout(() => { setProgressStep(3); toast.loading('✨ Gemini 3.8 Flash пишет сценарий...', { id: toastId }) }, 11000)

    try {
      const res = await fetch('/api/youtube/import-to-package', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim(), style, selectedFacts }),
      })
      const result = await res.json()
      clearTimeout(t2); clearTimeout(t3)
      if (result.success) {
        setProgressStep(4); setCreatedPackage(result); setFactsModalOpen(false)
        toast.success('🎉 3-минутный сценарий готов!', { id: toastId, description: `Слов: ${result.wordCount}` })
        if (onPackageCreated) onPackageCreated(result)
      } else {
        toast.error(result.error || 'Ошибка обработки YouTube видео', { id: toastId }); setProgressStep(0)
      }
    } catch (err) {
      clearTimeout(t2); clearTimeout(t3)
      toast.error('Сбой импорта: ' + err.message, { id: toastId }); setProgressStep(0)
    } finally { setLoading(false) }
  }

  if (!isOpen) return null

  const steps = ['1. Скачивание аудио и обложки', '2. Распознавание речи (Whisper)', '3. Генерация сценария (Gemini)', '4. Сохранение в новости']

  return (
    <>
      <div className="modal-overlay" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem', overflowY: 'auto' }}>
        <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px', width: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#13111f', border: '1px solid #7c3aed', boxShadow: '0 25px 65px rgba(0,0,0,0.85)', borderRadius: '16px', color: '#f3f4f6', overflow: 'hidden' }}>
          <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.1rem 1.5rem', borderBottom: '1px solid #2d2248', background: '#19152b' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.6rem' }}>🎬</span>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>YouTube видео ➜ 3-Мин. Сценарий</h2>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#9ca3af' }}>Аудио, Whisper, 20 ключевых фактов и автопакет</p>
              </div>
            </div>
            <button type="button" onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#9ca3af', fontSize: '1.4rem', cursor: 'pointer' }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1.4rem 1.5rem' }}>
            {!createdPackage ? (
              <form onSubmit={e => handleStartImport(e)}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#d1d5db' }}>🔗 Ссылка на YouTube видео или Shorts:</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input type="text" placeholder="https://www.youtube.com/watch?v=... или Shorts" value={url} onChange={e => setUrl(e.target.value)} disabled={loading || factsLoading} autoFocus style={{ flex: 1, background: '#1c192e', border: '1px solid #4c1d95', borderRadius: '8px', padding: '0.65rem 0.85rem', color: '#fff', fontSize: '0.88rem', outline: 'none' }} />
                    <button type="button" onClick={handlePasteClipboard} disabled={loading || factsLoading} style={btnStyle('#2e1065', '#c4b5fd', '1px solid #6d28d9')}>📋 Вставить</button>
                  </div>
                </div>

                {previewLoading && <div style={{ padding: '0.75rem', background: '#181427', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem', color: '#a78bfa' }}>⏳ Загрузка информации о видео...</div>}
                {videoPreview && !previewLoading && (
                  <div style={{ display: 'flex', gap: '0.85rem', background: '#1a162b', border: '1px solid #3b2d54', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem', alignItems: 'center' }}>
                    {videoPreview.thumbnail && <img src={videoPreview.thumbnail} alt="cover" style={{ width: '96px', height: '54px', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />}
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: '#f3f4f6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{videoPreview.title}</div>
                      <div style={{ fontSize: '0.76rem', color: '#9ca3af', marginTop: '0.2rem' }}>📺 {videoPreview.channel} · ⏱️ {Math.round(videoPreview.duration || 0)} сек.</div>
                    </div>
                  </div>
                )}

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem', color: '#d1d5db' }}>🎬 Стиль 3-минутного видео:</label>
                  <select value={style} onChange={e => setStyle(e.target.value)} disabled={loading || factsLoading} style={{ width: '100%', background: '#1c192e', border: '1px solid #4c1d95', borderRadius: '8px', padding: '0.65rem 0.85rem', color: '#fff', fontSize: '0.88rem', outline: 'none' }}>
                    {YOUTUBE_TOPIC_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {loading && (
                  <div style={{ background: '#1a162b', border: '1px solid #7c3aed', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.25rem' }}>
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#c4b5fd', marginBottom: '0.5rem' }}>🚀 Процесс создания новости:</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', fontSize: '0.8rem' }}>
                      {steps.map((text, idx) => {
                        const sNum = idx + 1
                        return <div key={text} style={{ color: progressStep >= sNum ? '#4ade80' : '#6b7280' }}>{progressStep > sNum ? '✅ ' : progressStep === sNum ? '⏳ ' : '○ '}{text}</div>
                      })}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={handleExtractFacts} disabled={loading || factsLoading || !url.trim()} style={{ ...btnStyle('#241a48', '#c4b5fd', '1.5px solid #8b5cf6'), display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {factsLoading ? '⏳ Поиск фактов...' : '🔍 Выбрать из 20 фактов'}
                  </button>
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button type="button" onClick={onClose} disabled={loading || factsLoading} style={btnStyle('#27272a', '#d4d4d8')}>Отмена</button>
                    <button type="submit" disabled={loading || factsLoading || !url.trim()} style={{ ...btnStyle(loading ? '#4c1d95' : 'linear-gradient(135deg, #ef4444, #7c3aed)', '#fff'), fontWeight: 700 }}>
                      {loading ? '⏳ Создание...' : '🚀 Создать сразу (авто)'}
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div>
                <div style={{ background: '#064e3b', border: '1px solid #10b981', borderRadius: '10px', padding: '0.9rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7', fontWeight: 800, fontSize: '0.95rem' }}><span>✨</span> Пакет успешно сохранён!</div>
                  <div style={{ fontSize: '0.82rem', color: '#d1fae5', marginTop: '0.35rem' }}>Заголовок: <strong>{createdPackage.title}</strong></div>
                  <div style={{ fontSize: '0.78rem', color: '#a7f3d0', marginTop: '0.2rem' }}>📊 Слов: {createdPackage.wordCount} (~3 мин.) · 🎙️ Озвучка: Студия (раздел 3)</div>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#d1d5db', marginBottom: '0.35rem' }}>🎙️ Фрагмент готового 3-минутного сценария:</label>
                  <div style={{ background: '#181427', border: '1px solid #3730a3', borderRadius: '8px', padding: '0.85rem', fontSize: '0.82rem', lineHeight: '1.45', maxHeight: '170px', overflowY: 'auto', color: '#e0e7ff', whiteSpace: 'pre-wrap' }}>
                    {createdPackage.text}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <button type="button" onClick={onClose} style={btnStyle('#27272a', '#d4d4d8')}>Закрыть</button>
                  <button type="button" disabled={loadingPhotos} onClick={async () => {
                    setLoadingPhotos(true)
                    const tId = toast.loading('🖼️ ИИ загружает 100 фото...')
                    try {
                      const res = await fetch('/api/auto-fetch-photos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ folderName: createdPackage.folderName, count: 100 }) })
                      const d = await res.json()
                      toast.dismiss(tId)
                      if (d.success) { toast.success(`🎉 Загружено ${d.count} фото!`); if (onPackageCreated) onPackageCreated(createdPackage) }
                      else toast.error('Ошибка: ' + d.error)
                    } catch (e) { toast.dismiss(tId); toast.error('Ошибка: ' + e.message) }
                    finally { setLoadingPhotos(false) }
                  }} style={btnStyle('#065f46', '#6ee7b7', '1px solid #10b981')}>
                    {loadingPhotos ? '⏳ Загрузка...' : '🖼️ 100 фото'}
                  </button>
                  {onOpenPackage && (
                    <button type="button" onClick={() => { onOpenPackage(createdPackage); onClose() }} style={{ ...btnStyle('linear-gradient(135deg, #10b981, #059669)', '#fff'), fontWeight: 700 }}>
                      📂 Открыть в Студии
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <YouTubeFactsModal
        isOpen={factsModalOpen}
        onClose={() => setFactsModalOpen(false)}
        facts={facts}
        videoTitle={videoPreview?.title}
        onConfirm={(selectedFacts) => handleStartImport(null, selectedFacts)}
        loading={loading}
      />
    </>
  )
}
