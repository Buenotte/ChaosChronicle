import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'

export default function NewsScriptModal({ pkg, onClose, onSaved }) {
  if (!pkg) return null

  const [text, setText] = useState(pkg.scriptTxt || pkg.scriptMd || '')
  const [savingText, setSavingText] = useState(false)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioState, setAudioState] = useState({
    hasAudio: pkg.hasAudio,
    audioUrl: pkg.audioUrl,
  })

  // Drag & Drop State für Verschiebbarkeit
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 })

  useEffect(() => {
    setText(pkg.scriptTxt || pkg.scriptMd || '')
    setAudioState({
      hasAudio: pkg.hasAudio,
      audioUrl: pkg.audioUrl,
    })
    setPos({ x: 0, y: 0 })
  }, [pkg])

  // Drag Event Handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.modal-close') || e.target.closest('button') || e.target.closest('textarea')) return
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

  const handleSaveText = async () => {
    if (!text.trim()) return
    setSavingText(true)
    const toastId = toast.loading('Сохранение script.txt в папку news/...', {
      description: 'Обновление файла дикторского текста...',
    })

    try {
      const res = await fetch('/api/save-script-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          text,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения текста')

      if (onSaved) onSaved()

      toast.success('📜 Текст script.txt успешно обновлен!', {
        id: toastId,
        description: `Сохранено в news/${data.folderName}/script.txt`,
        duration: 10000,
      })
    } catch (err) {
      toast.error('Ошибка сохранения текста', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setSavingText(false)
    }
  }

  const handleGenerateAudioInTextModal = async () => {
    if (!pkg.bundleDir && !pkg.folderName) {
      toast.error('Сначала сохраните пакет в папку news/')
      return
    }
    setGeneratingAudio(true)
    const toastId = toast.loading('🎙️ Синтез речи Nikolay (ru-RU-DmitryNeural, 0%, -10%)...', {
      description: 'Генерация аудио-файла для озвучивания текста...',
    })

    try {
      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          text,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка генерации аудио')

      const newAudioUrl = `/news-static/${data.folderName}/${data.audioFileName}?t=${Date.now()}`
      setAudioState({
        hasAudio: true,
        audioUrl: newAudioUrl,
      })

      if (onSaved) onSaved()

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

  const [isMaximized, setIsMaximized] = useState(false)
  const computedAudioUrl = audioState.audioUrl || pkg.audioUrl || (pkg.folderName ? `/news-static/${pkg.folderName}/audio.mp3` : null)
  const hasAudioFile = audioState.hasAudio || pkg.hasAudio

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content script-editor-modal ${isDragging ? 'dragging' : ''}`}
        style={{
          maxWidth: isMaximized ? '96vw' : '780px',
          width: isMaximized ? '96vw' : '100%',
          height: isMaximized ? '94vh' : 'auto',
          maxHeight: isMaximized ? '94vh' : '88vh',
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          transition: isDragging ? 'none' : 'all 0.2s ease-out',
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
              📜 Текст и Озвучка диктора (🖐️ Перетащите окно)
            </span>
            <h2 className="modal-title">{pkg.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              className="modal-close"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Свернуть окно" : "Развернуть во весь экран"}
            >
              {isMaximized ? '🗗' : '🗖'}
            </button>
            <button className="modal-close" onClick={onClose} title="Закрыть окно">✕</button>
          </div>
        </div>

        <div className="modal-body">
          {/* Audio Player im Text-Dialog */}
          {hasAudioFile && computedAudioUrl ? (
            <div className="audio-player-box" style={{ marginBottom: '1rem' }}>
              <div className="audio-player-title">🎙️ Озвучка диктора Nikolay (ru-RU-DmitryNeural, 0%, -10%):</div>
              <audio controls src={computedAudioUrl} className="audio-element">
                Ваш браузер не поддерживает элемент audio.
              </audio>
            </div>
          ) : (
            <div className="empty-state" style={{ padding: '0.8rem 1rem', marginBottom: '1rem', textAlign: 'left', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 600, color: '#ef4444' }}>🎙️ Аудио-файл audio.mp3 отсутствует</p>
                </div>
                <button
                  className="audio-gen-btn"
                  onClick={handleGenerateAudioInTextModal}
                  disabled={generatingAudio}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {generatingAudio ? '⏳ Создание audio.mp3...' : '🎙️ Создать audio.mp3 (Nikolay)'}
                </button>
              </div>
            </div>
          )}

          {/* Text Editor */}
          <div className="script-editor-wrap">
            <label className="section-title" style={{ display: 'block', marginBottom: '0.5rem' }}>
              📝 Текст для озвучки Nikolay (можно редактировать и сохранить):
            </label>
            <textarea
              className="script-editor-textarea"
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Введите или отредактируйте текст..."
              rows={12}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="save-bundle-btn"
            onClick={handleSaveText}
            disabled={savingText}
          >
            {savingText ? '⏳ Сохранение...' : '💾 Сохранить изменения в script.txt'}
          </button>
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
