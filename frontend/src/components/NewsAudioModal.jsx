import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

export default function NewsAudioModal({ pkg, onClose, onRefresh }) {
  if (!pkg) return null

  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioState, setAudioState] = useState({
    hasAudio: !!pkg.hasAudio,
    audioUrl: pkg.audioUrl,
  })

  // Drag & Drop State
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 })

  useEffect(() => {
    setAudioState({
      hasAudio: !!pkg.hasAudio,
      audioUrl: pkg.audioUrl,
    })
    setPos({ x: 0, y: 0 })
  }, [pkg])

  const handleMouseDown = (e) => {
    if (e.target.closest('.modal-close') || e.target.closest('button') || e.target.closest('audio')) return
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setPos({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy,
      })
    }

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleGenerateAudioInModal = async () => {
    if (!pkg.bundleDir && !pkg.folderName) {
      toast.error('Сначала сохраните пакет в папку news/')
      return
    }
    setGeneratingAudio(true)
    const toastId = toast.loading('🎙️ Синтез речи Nikolay (ru-RU-DmitryNeural, 0%, -10%)...', {
      description: 'Генерация звукового файла audio.mp3...',
    })

    try {
      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          text: pkg.scriptTxt || pkg.scriptMd || '',
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка генерации аудио')

      const newAudioUrl = `/news-static/${data.folderName}/${data.audioFileName}?t=${Date.now()}`
      pkg.hasAudio = true
      pkg.audioUrl = newAudioUrl
      setAudioState({
        hasAudio: true,
        audioUrl: newAudioUrl,
      })

      if (onRefresh) onRefresh()

      toast.success('🎙️ Голосовой файл audio.mp3 успешно создан!', {
        id: toastId,
        description: `Папка: news/${data.folderName}/audio.mp3 (${data.voice})`,
        duration: 10000,
      })
    } catch (err) {
      toast.error('Ошибка создания аудио', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setGeneratingAudio(false)
    }
  }

  const computedAudioUrl = audioState.audioUrl || pkg.audioUrl || (pkg.folderName ? `/news-static/${pkg.folderName}/audio.mp3` : null)
  const hasAudioFile = audioState.hasAudio || pkg.hasAudio || !!pkg.folderName

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content ${isDragging ? 'dragging' : ''}`}
        style={{
          maxWidth: '540px',
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="modal-header draggable-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
          title="Зажмите мышью, чтобы перетащить окно"
        >
          <div>
            <span className="modal-badge saved-badge">
              🎙️ Аудио-сопровождение (🖐️ Перетащите окно)
            </span>
            <h2 className="modal-title">{pkg.title}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {hasAudioFile && computedAudioUrl ? (
            <div className="audio-player-box" style={{ padding: '1.2rem' }}>
              <div className="audio-player-title" style={{ fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                🎙️ Озвучка диктора Nikolay (ru-RU-DmitryNeural, 0%, -10%):
              </div>
              <audio controls src={computedAudioUrl} className="audio-element">
                Ваш браузер не поддерживает элемент audio.
              </audio>
              <div style={{ marginTop: '0.85rem', textAlign: 'right' }}>
                <button
                  className="audio-gen-btn"
                  onClick={handleGenerateAudioInModal}
                  disabled={generatingAudio}
                  style={{ background: '#f59e0b', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}
                >
                  {generatingAudio ? '⏳ Пересоздание audio.mp3...' : '🔄 Пересоздать audio.mp3 (Nikolay)'}
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '1rem', textAlign: 'left', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#ef4444' }}>🎙️ Аудио-файл audio.mp3 отсутствует</p>
                </div>
                <button
                  className="audio-gen-btn"
                  onClick={handleGenerateAudioInModal}
                  disabled={generatingAudio}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {generatingAudio ? '⏳ Создание audio.mp3...' : '🎙️ Создать audio.mp3 (Nikolay)'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
