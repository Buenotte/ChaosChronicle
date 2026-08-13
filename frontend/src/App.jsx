import { useState, useEffect, useCallback, useRef } from 'react'
import { Toaster, toast } from 'sonner'

const CATEGORIES = [
  { key: 'vse',       label: '🌐 Все новости',        color: '#6b7280' },
  { key: 'kultura',   label: '🎭 Культура',            color: '#8b5cf6' },
  { key: 'politika',  label: '🏛️ Политика',           color: '#ef4444' },
  { key: 'tekh',      label: '🤖 Технологии',          color: '#06b6d4' },
  { key: 'ekonomika', label: '📈 Экономика',           color: '#10b981' },
  { key: 'mir',       label: '🌍 Мир',                 color: '#f59e0b' },
  { key: 'sport',     label: '⚽ Спорт',               color: '#22c55e' },
  { key: 'ukraina',   label: '🇺🇦 Война в Украине',   color: '#facc15' },
]

const AI_MODELS = [
  { id: 'gemini',   name: '✨ Gemini 3.6 Flash',         icon: '⚡' },
  { id: 'deepseek', name: '🧠 DeepSeek V3 / R1',         icon: '🌊' },
  { id: 'qwen',     name: '🦁 Qwen 2.5 72B',             icon: '👑' },
  { id: 'free',     name: '🎁 OpenRouter Free Router',   icon: '🆓' },
]

const CATEGORY_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.key, c.color]))

function timeAgo(pubDate) {
  if (!pubDate) return ''
  const now = new Date()
  const date = new Date(pubDate)
  if (isNaN(date)) return ''
  const diffMs = now - date
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Только что'
  if (mins < 60) return `${mins} мин. назад`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ч. назад`
  const days = Math.floor(hrs / 24)
  return `${days} дн. назад`
}

function cleanMatchTitle(str) {
  if (!str) return ''
  return str.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '')
}

// Modal zum Bearbeiten und Speichern von script.txt mit integriertem Audio-Player (Verschiebbar per Drag & Drop)
function NewsScriptModal({ pkg, onClose, onSaved }) {
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
    // Falls Klick auf Close-Button oder Input, kein Drag
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

// Modal zum Abspielen & Generieren von audio.mp3 in einem eigenen Dialog (Verschiebbar)
function NewsAudioModal({ pkg, onClose, onRefresh }) {
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



// Einziges, vereintes Modal für das komplette Video-Produktionspaket (Status + Audio + Fotos + Skript-Text)
function VideoPackageModal({ pkg, onOpenPhotos, onOpenScriptText, onOpenAudio, onOpenVideo, onClose, onRefresh }) {
  if (!pkg) return null

  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [generatingVideo, setGeneratingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  const [progressLog, setProgressLog] = useState('')

  const [selectedVoice, setSelectedVoice] = useState('nikolay')
  const [selectedTransition, setSelectedTransition] = useState('concat')

  const [audioState, setAudioState] = useState({
    hasAudio: !!pkg.hasAudio,
    audioUrl: pkg.audioUrl,
  })
  const [videoState, setVideoState] = useState({
    hasVideo: !!pkg.hasVideo,
    videoUrl: pkg.videoUrl,
  })

  useEffect(() => {
    setAudioState({
      hasAudio: !!pkg.hasAudio,
      audioUrl: pkg.audioUrl,
    })
    setVideoState({
      hasVideo: !!pkg.hasVideo,
      videoUrl: pkg.videoUrl,
    })
    setIsPlaying(false)
    setCurrentTime(0)
  }, [pkg])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      setDuration(videoRef.current.duration || 0)
    }
  }

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const formatTime = (secs) => {
    if (isNaN(secs)) return '0:00'
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  const photosList = pkg.photoUrls || []
  const actualPhotoCount = photosList.length || (pkg.photosCount || 0)
  const hasTxt = !!(pkg.scriptTxt && !pkg.scriptTxt.includes('Нажмите «✍️'))

  const handleGenerateAudioDirect = async () => {
    if (!pkg.bundleDir && !pkg.folderName) {
      toast.error('Сначала сохраните пакет в папку news/')
      return
    }
    setGeneratingAudio(true)
    const toastId = toast.loading(`🎙️ Синтез речи ${selectedVoice} (edge-tts)...`, {
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
          voiceKey: selectedVoice,
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

      toast.success(`🎙️ Голосовой файл audio.mp3 успешно создан!`, {
        id: toastId,
        description: `Папка: news/${data.folderName}/audio.mp3 (${data.voice})`,
        duration: 8000,
      })
    } catch (err) {
      toast.error('Ошибка создания аудио', { id: toastId, description: err.message })
    } finally {
      setGeneratingAudio(false)
    }
  }

  const handleGenerateVideoDirect = async () => {
    if (!pkg.bundleDir && !pkg.folderName) {
      toast.error('Сначала сохраните пакет в папку news/')
      return
    }
    setGeneratingVideo(true)
    setVideoProgress(0)
    setProgressLog('Начало...')

    // Eindeutige Job-ID für SSE-Fortschritt
    const jobId = `job_${Date.now()}`

    // SSE-Verbindung für Echtzeit-Fortschritt
    const evtSource = new EventSource(`/api/video-progress/${jobId}`)
    evtSource.onmessage = (e) => {
      const data = JSON.parse(e.data)
      setVideoProgress(data.progress || 0)
      setProgressLog(data.log || '')
      if (data.status === 'done' || data.status === 'error') {
        evtSource.close()
      }
    }
    evtSource.onerror = () => evtSource.close()

    const toastId = toast.loading(`🎬 Монтаж видео (16:9 FFmpeg – ${selectedTransition === 'xfade' ? 'xFade Переходы' : 'Прямой монтаж'})...`, {
      description: 'Сведение фото, переходов и аудио-файла audio.mp3...',
    })

    try {
      const res = await fetch('/api/generate-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          transition: selectedTransition,
          jobId,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка создания видео')

      const newVideoUrl = `/news-static/${data.folderName}/${data.videoFileName}?t=${Date.now()}`
      pkg.hasVideo = true
      pkg.videoUrl = newVideoUrl
      setVideoState({
        hasVideo: true,
        videoUrl: newVideoUrl,
      })
      setVideoProgress(100)
      evtSource.close()

      if (onRefresh) onRefresh()

      toast.success('🎬 Видео-файл video.mp4 успешно создан!', {
        id: toastId,
        description: `Папка: news/${data.folderName}/video/video.mp4 (16:9 – ${data.transition})`,
        duration: 8000,
      })
    } catch (err) {
      evtSource.close()
      setVideoProgress(0)
      toast.error('Ошибка монтажа видео', { id: toastId, description: err.message })
    } finally {
      setGeneratingVideo(false)
    }
  }

  const [isMaximized, setIsMaximized] = useState(false)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content saved-package-modal"
        style={{
          width: isMaximized ? '96vw' : '100%',
          maxWidth: isMaximized ? '96vw' : '780px',
          height: isMaximized ? '94vh' : 'auto',
          maxHeight: isMaximized ? '94vh' : '88vh',
          transition: 'all 0.25s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="modal-badge saved-badge">
              📂 Видео-пакет в news/{pkg.folderName || ''}
            </span>
            <h2 className="modal-title">{pkg.title}</h2>
            <div className="modal-stats" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className="saved-status-badge">📜 script.txt {hasTxt ? '✅' : '❌'}</span>
              <span className="saved-status-badge">📸 photos/ ({actualPhotoCount})</span>
              <span className="saved-status-badge">🎙️ audio.mp3 {audioState.hasAudio ? '✅' : '❌'}</span>
              <span className="saved-status-badge">🎬 video.mp4 {videoState.hasVideo ? '✅' : '❌'}</span>
            </div>
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
          {/* Секция 1: Текст */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: '0.5rem' }}>1. Скрипт текста:</h3>
            <button
              className="copy-btn"
              style={{ background: '#3b82f6' }}
              onClick={() => onOpenScriptText(pkg)}
            >
              📜 Открыть и редактировать текст
            </button>
          </div>

          {/* Секция 2: Аудио */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: '0.5rem' }}>2. Озвучка (audio.mp3):</h3>

            {/* Stimmen-Auswahl */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem', flexWrap: 'wrap' }}>
              {[
                { key: 'nikolay',  label: '👨 Nikolay',  desc: 'Männlich, tief' },
                { key: 'dmitry',   label: '👨 Dmitry',   desc: 'Männlich, schnell' },
                { key: 'svetlana', label: '👩 Svetlana', desc: 'Weiblich' },
                { key: 'darya',    label: '👩 Darya',    desc: 'Weiblich, langsam' },
              ].map(v => (
                <button
                  key={v.key}
                  onClick={() => setSelectedVoice(v.key)}
                  title={v.desc}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '6px',
                    border: selectedVoice === v.key ? '2px solid #f59e0b' : '1px solid rgba(255,255,255,0.15)',
                    background: selectedVoice === v.key ? 'rgba(245,158,11,0.18)' : 'rgba(255,255,255,0.05)',
                    color: selectedVoice === v.key ? '#fbbf24' : '#9ca3af',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: selectedVoice === v.key ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {v.label}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              <button
                className="copy-btn"
                style={{ background: '#f59e0b' }}
                onClick={handleGenerateAudioDirect}
                disabled={generatingAudio}
              >
                {generatingAudio ? '⏳ Создание audio.mp3...' : (audioState.hasAudio ? `🔄 Пересоздать (${selectedVoice})` : `🎙️ Создать (${selectedVoice})`)}
              </button>

              {audioState.hasAudio && (
                <button
                  className="copy-btn"
                  style={{ background: '#d97706' }}
                  onClick={() => onOpenAudio({ ...pkg, ...audioState })}
                >
                  ▶️ Воспроизвести аудио
                </button>
              )}
            </div>
          </div>

          {/* Секция 3: Видео-плеер 16:9 (Прямо в главном диалоге) */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#a855f7', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🎬 Видео-монтаж 16:9 (video.mp4):
            </h3>

            {/* Transitions-Auswahl */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.65rem' }}>
              {[
                { key: 'concat', label: '⚡ Прямой монтаж', desc: 'Быстро, без переходов' },
                { key: 'xfade', label: '✨ xFade Переходы', desc: 'Плавное перетекание, более медленная рендеринг' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setSelectedTransition(t.key)}
                  title={t.desc}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '6px',
                    border: selectedTransition === t.key ? '2px solid #a855f7' : '1px solid rgba(255,255,255,0.15)',
                    background: selectedTransition === t.key ? 'rgba(168,85,247,0.18)' : 'rgba(255,255,255,0.05)',
                    color: selectedTransition === t.key ? '#c084fc' : '#9ca3af',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    fontWeight: selectedTransition === t.key ? 700 : 400,
                    transition: 'all 0.15s',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {videoState.hasVideo ? (
              <div className="video-player-box" style={{ padding: '0.5rem', background: '#09090b', borderRadius: '12px', maxWidth: '560px', margin: '0 auto' }}>
                <video
                  ref={videoRef}
                  controls
                  preload="metadata"
                  playsInline
                  src={videoState.videoUrl || (pkg.folderName ? `/news-static/${pkg.folderName}/video/video.mp4` : null)}
                  className="video-element"
                  style={{ width: '100%', maxHeight: '310px', objectFit: 'contain' }}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleTimeUpdate}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                >
                  Ваш браузер не поддерживает видео-плеер.
                </video>

                {/* Interaktive Steuerungsleiste */}
                <div style={{
                  marginTop: '0.6rem',
                  padding: '0.75rem 1rem',
                  background: '#18181b',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  flexWrap: 'wrap',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <button
                    onClick={togglePlay}
                    style={{
                      background: isPlaying ? '#ef4444' : '#10b981',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '0.45rem 1.1rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    {isPlaying ? '⏸️ Пауза' : '▶️ Старт'}
                  </button>

                  <span style={{ fontSize: '0.85rem', color: '#d1d5db', fontFamily: 'monospace', minWidth: '85px' }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>

                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.1"
                    value={currentTime}
                    onChange={handleSeek}
                    style={{ flex: 1, minWidth: '120px', cursor: 'pointer', accentColor: '#a855f7' }}
                  />

                  <button
                    className="audio-gen-btn"
                    onClick={handleGenerateVideoDirect}
                    disabled={generatingVideo}
                    style={{ background: '#a855f7', fontSize: '0.8rem', padding: '0.4rem 0.8rem', marginLeft: 'auto' }}
                  >
                    {generatingVideo ? '⏳ Монтаж...' : '🔄 Пересоздать 16:9'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="empty-state" style={{ padding: '1rem', textAlign: 'left', background: 'rgba(168, 85, 247, 0.08)', border: '1px solid rgba(168, 85, 247, 0.25)', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, color: '#a855f7' }}>🎬 Видео-файл video.mp4 еще не смонтирован</p>
                  </div>
                  <button
                    className="audio-gen-btn"
                    onClick={handleGenerateVideoDirect}
                    disabled={generatingVideo || !audioState.hasAudio || actualPhotoCount === 0}
                    style={{ background: '#a855f7', whiteSpace: 'nowrap' }}
                  >
                    {generatingVideo ? '⏳ Монтаж 16:9...' : '🎬 Создать видео (MP4 / 16:9)'}
                  </button>
                </div>
              </div>
            )}

            {/* FFmpeg Live-Fortschrittsbalken */}
            {generatingVideo && (
              <div style={{ marginTop: '0.75rem', background: '#18181b', borderRadius: '10px', padding: '0.75rem 1rem', border: '1px solid rgba(168,85,247,0.3)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#c084fc', fontWeight: 600 }}>📊 FFmpeg – Прогресс монтажа</span>
                  <span style={{ fontSize: '0.8rem', color: '#a855f7', fontFamily: 'monospace' }}>{videoProgress}%</span>
                </div>
                <div style={{ background: '#27272a', borderRadius: '6px', height: '8px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${videoProgress}%`,
                    background: 'linear-gradient(90deg, #7c3aed, #a855f7, #c084fc)',
                    borderRadius: '6px',
                    transition: 'width 0.4s ease',
                    boxShadow: '0 0 8px rgba(168,85,247,0.6)',
                  }} />
                </div>
                {progressLog && (
                  <p style={{ margin: '0.4rem 0 0', fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>{progressLog}</p>
                )}
              </div>
            )}
          </div>

          {/* Секция 4: Фотографии */}
          <div>
            <h3 style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: '0.5rem' }}>4. Галерея фотографий:</h3>
            <button
              className="copy-btn"
              style={{ background: '#10b981' }}
              onClick={() => {
                onOpenPhotos({ title: pkg.title, bundleDir: pkg.bundleDir, url: pkg.url })
              }}
            >
              🖼️ Открыть фото в отдельном диалоге ({actualPhotoCount})
            </button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

function NewsCard({ article, index, onGenerate, onOpenPhotos, isGenerating, isSavedPkg, savedPkg, onViewSavedPackage, onViewArtifacts }) {
  const [imgError, setImgError] = useState(false)
  const catColor = CATEGORY_COLOR[article.category] || '#6b7280'

  return (
    <article
      className={`news-card ${isSavedPkg ? 'saved-news-card' : ''}`}
      style={{ '--cat-color': catColor, animationDelay: `${index * 30}ms` }}
    >
      {article.imageUrl && !imgError && (
        <div className="card-image">
          <img
            src={article.imageUrl}
            alt={article.title}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>
      )}
      <div className="card-body">
        <div className="card-meta">
          <span className="card-badge" style={{ background: catColor }}>
            {CATEGORIES.find(c => c.key === article.category)?.label || article.category}
          </span>
          <span className="card-source">{article.source}</span>
          <span className="card-time">{timeAgo(article.pubDate)}</span>
          {isSavedPkg && (
            <span className="saved-status-badge">
              🟢 📦 Сохранено в news/
            </span>
          )}
        </div>
        <h2 className="card-title">
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            {article.title}
          </a>
        </h2>
        {article.summary && (
          <p className="card-summary">{article.summary}</p>
        )}

        <div className="card-actions-grid">
          <button
            className="generate-btn"
            onClick={() => onGenerate(article)}
            disabled={isGenerating}
          >
            {isGenerating ? '⏳ Создание...' : '✍️ Фельетон (3 мин)'}
          </button>
          <button
            className="photos-btn"
            onClick={() => onOpenPhotos(article)}
            title="Посмотреть фото к этой новости"
          >
            🖼️ Фото
          </button>

          <button
            className="view-saved-btn"
            onClick={() => {
              const pkgToView = savedPkg || {
                title: article.title,
                folderName: '(Пакет еще не сохранен в news/)',
                source: article.source,
                model: 'gemini',
                date: article.pubDate,
                photosCount: article.images ? article.images.length : (article.imageUrl ? 1 : 0),
                photoUrls: article.images || (article.imageUrl ? [article.imageUrl] : []),
                hasAudio: false,
                scriptTxt: 'Нажмите «✍️ Фельетон» и «📦 Сохранить», чтобы создать script.txt',
              }
              onViewSavedPackage(pkgToView)
            }}
            title="Открыть готовый видео-пакет (Аудио, Фото, Сценарий)"
          >
            📂 Видео-пакет
          </button>
        </div>
      </div>
    </article>
  )
}

function FeuilletonModal({ feuilleton, onOpenPhotos, onClose }) {
  if (!feuilleton) return null

  const [saving, setSaving] = useState(false)
  const [savedInfo, setSavedInfo] = useState(null)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioInfo, setAudioInfo] = useState(null)

  const handleSavePackage = async () => {
    setSaving(true)
    const toastId = toast.loading('Сохранение видео-пакета в news/...', {
      description: 'Скачивание 20 фото, файла script.txt и project.json...',
    })

    try {
      const res = await fetch('/api/save-news-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: feuilleton.title,
          text: feuilleton.text,
          model: feuilleton.modelName,
          source: feuilleton.source,
          imageUrl: feuilleton.imageUrl,
          images: feuilleton.images || [],
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения')

      setSavedInfo(data)
      toast.success('📦 Видео-пакет сохранен!', {
        id: toastId,
        description: `📜 Текст: ✅ Готов | 📸 Фото: ✅ (${data.savedPhotosCount} шт. в news/) | 🎙️ Аудио: ⚠️ Отсутствует (нажмите «Создать audio.mp3»)`,
        duration: 12000,
      })
    } catch (err) {
      toast.error('Ошибка сохранения пакета', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateAudio = async () => {
    if (!savedInfo || !savedInfo.bundleDir) return
    setGeneratingAudio(true)

    let seconds = 0
    const toastId = toast.loading('🎙️ Генерация аудио-файла через edge-tts... [0 сек.]', {
      description: 'Голос: Nikolay (ru-RU-DmitryNeural) | Скорость: 0% | Голос: -10%',
    })

    const timer = setInterval(() => {
      seconds++
      toast.loading(`🎙️ Генерация аудио-файла через edge-tts... [${seconds} сек.]`, {
        id: toastId,
        description: 'Идет обработка текста и синтез речи (Nikolay, 0%, -10%)...',
      })
    }, 1000)

    try {
      const startTime = Date.now()
      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: savedInfo.bundleDir,
          text: feuilleton.text,
        }),
      })

      const data = await res.json()
      clearInterval(timer)

      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка озвучки')

      const totalTimeSec = Math.round((Date.now() - startTime) / 1000)
      setAudioInfo(data)

      toast.success('🎉 Все компоненты видео-пакета полностью готовы!', {
        id: toastId,
        description: `📜 Текст: ✅ | 📸 Фото: ✅ (${savedInfo.savedPhotosCount || 0} шт.) | 🎙️ Аудио: ✅ audio.mp3 (${totalTimeSec} сек., Nikolay)`,
        duration: 14000,
      })
    } catch (err) {
      clearInterval(timer)
      toast.error('Ошибка создания аудио', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setGeneratingAudio(false)
    }
  }

  const articleImages = feuilleton.images && feuilleton.images.length > 0
    ? feuilleton.images
    : (feuilleton.imageUrl ? [feuilleton.imageUrl] : [])

  let brollImageCounter = 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge">🎭 3-Минутный Сатирический Фельетон</span>
            <h2 className="modal-title">{feuilleton.title}</h2>
            <div className="modal-stats">
              <span>⏱️ Хронометраж: ~{feuilleton.minutes} мин.</span>
              <span>📝 Слов: {feuilleton.words}</span>
              <span>🤖 Модель: {feuilleton.modelName}</span>
            </div>
            {savedInfo && (
              <div className="saved-file-notice">
                📦 Видео-пакет сохранен в: <code>news/{savedInfo.folderName}</code> ({savedInfo.savedPhotosCount} фото скачано)
                {audioInfo && <span> · 🎙️ <code>audio.mp3</code> (Nikolay) создан</span>}
              </div>
            )}
          </div>
          <div className="modal-header-actions">
            <button
              className="photos-header-btn"
              onClick={() => onOpenPhotos({ title: feuilleton.title, images: feuilleton.images, id: feuilleton.id, url: feuilleton.url })}
            >
              🖼️ Фото к новости
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Audio Player im Haupt-Feuilleton-Dialog */}
        {savedInfo && (audioInfo || savedInfo.hasAudio) && (
          <div style={{ padding: '0 1.5rem', marginTop: '1rem' }}>
            <div className="audio-player-box" style={{ marginBottom: 0 }}>
              <div className="audio-player-title">🎙️ Прослушать озвучку Nikolay (audio.mp3, 0%, -10%):</div>
              <audio controls src={`/news-static/${savedInfo.folderName}/audio.mp3`} className="audio-element" autoPlay>
                Ваш браузер не поддерживает элемент audio.
              </audio>
            </div>
          </div>
        )}

        <div className="modal-body">
          {feuilleton.text.split('\n\n').map((paragraph, idx) => {
            const isBRoll = paragraph.startsWith('[B-Roll:')
            if (isBRoll) {
              const currentPhoto = articleImages[brollImageCounter % (articleImages.length || 1)]
              brollImageCounter++

              return (
                <div key={idx} className="broll-inline-card">
                  {currentPhoto && (
                    <div className="broll-photo-wrap">
                      <img
                        src={currentPhoto}
                        alt={`Кадр к новости - ${feuilleton.title}`}
                        className="broll-inline-photo"
                        onError={e => e.target.parentNode.style.display = 'none'}
                      />
                      <div className="broll-photo-badge">
                        📸 Оригинальное фото к этой новости #{((brollImageCounter - 1) % (articleImages.length || 1)) + 1}
                      </div>
                    </div>
                  )}
                  <div className="broll-tag">
                    <span className="broll-icon">🖼️ Visual B-Roll / Кадр:</span> {paragraph.replace('[B-Roll:', '').replace(']', '').trim()}
                  </div>
                </div>
              )
            }

            return (
              <p key={idx} className="feuilleton-p">
                {paragraph}
              </p>
            )
          })}
        </div>

        <div className="modal-footer">
          <button
            className="save-bundle-btn"
            onClick={handleSavePackage}
            disabled={saving || !!savedInfo}
          >
            {saving ? '⏳ Сохранение...' : (savedInfo ? '✅ Пакет сохранен в news/' : '📦 Сохранить видео-пакет в news/')}
          </button>
          
          {savedInfo && (
            <button
              className="audio-gen-btn"
              onClick={handleGenerateAudio}
              disabled={generatingAudio || !!audioInfo}
            >
              {generatingAudio ? '⏳ Озвучка Nikolay...' : (audioInfo ? '🎙️ audio.mp3 создан' : '🎙️ Создать audio.mp3 (Nikolay)')}
            </button>
          )}

          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

function NewsPhotosModal({ newsTopic, photos, loading, onClose, onSaved, onReload }) {
  if (!newsTopic) return null

  const [items, setItems] = useState([])
  const [savingPhotos, setSavingPhotos] = useState(false)
  const [savedCount, setSavedCount] = useState(null)

  useEffect(() => {
    setItems(photos || [])
  }, [photos])

  const handleRemovePhoto = async (indexToRemove) => {
    const photoToRemove = items[indexToRemove]
    const imgSrc = typeof photoToRemove === 'string' ? photoToRemove : (photoToRemove?.url || '')

    if (imgSrc && imgSrc.startsWith('/news-static/')) {
      try {
        const res = await fetch('/api/delete-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoUrl: imgSrc,
            bundleDir: newsTopic?.bundleDir,
          }),
        })
        const data = await res.json()
        if (data.success && data.deleted) {
          toast.success('🗑️ Фото физически удалено с диска!')
        }
      } catch (err) {
        console.error('Fehler beim Löschen des Fotos:', err)
      }
    } else {
      toast.info('Фото удалено из списка')
    }

    setItems(prev => prev.filter((_, idx) => idx !== indexToRemove))
    if (onSaved) onSaved()
  }

  const handleSavePhotosToFolder = async () => {
    if (items.length === 0) return
    setSavingPhotos(true)
    const toastId = toast.loading(`💾 Скачивание ${items.length} фото в папку news/...`, {
      description: 'Сохранение оригинальных изображений в формате .jpg/.png...',
    })

    try {
      const res = await fetch('/api/save-news-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newsTopic.title,
          bundleDir: newsTopic.bundleDir,
          photos: items.map(p => p.url),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения фото')

      setSavedCount(data.savedPhotosCount)
      if (onSaved) onSaved()

      toast.success(`📸 ${data.savedPhotosCount} фото успешно сохранены!`, {
        id: toastId,
        description: `Папка: news/${data.folderName}/photos/`,
        duration: 12000,
      })
    } catch (err) {
      toast.error('Ошибка сохранения фото', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setSavingPhotos(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge">📸 Оригинальные фото к этой новости (100% Точность)</span>
            <h2 className="modal-title">{newsTopic.title}</h2>
            <div className="modal-stats">
              <span>📰 Все изображения из статьи и прямых репортажей</span>
              {items.length > 0 && <span>🖼️ Отобрано фото: {items.length}</span>}
              {savedCount !== null && <span className="saved-status-badge">🟢 {savedCount} фото в news/photos/</span>}
            </div>
          </div>
          <div className="modal-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="copy-btn"
              style={{ background: '#06b6d4' }}
              onClick={onReload}
              disabled={loading}
              title="Перенайти и обновить фото из агентств и поисковиков"
            >
              {loading ? '⏳ Поиск...' : '🔄 Перенайти 30 фото'}
            </button>
            {items.length > 0 && (
              <button
                className="save-bundle-btn"
                onClick={handleSavePhotosToFolder}
                disabled={savingPhotos}
              >
                {savingPhotos ? '⏳ Скачивание...' : `💾 Сохранить ${items.length} фото в news/`}
              </button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="empty-state">
              <p>⟳ Поиск фотографий из разных источников по теме новости...</p>
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="empty-state">
              <p>📷 Фотографий в списке нет.</p>
            </div>
          )}

          {!loading && items.length > 0 && (() => {
            const articlePhotos = items.filter(p => ['article', 'rss', 'local'].includes(p?.quality) || (typeof p === 'string' ? p : p?.url || '').startsWith('/news-static/'))
            const searchPhotos  = items.filter(p => p?.quality === 'search' && !(typeof p === 'string' ? p : p?.url || '').startsWith('/news-static/'))

            const PhotoCard = ({ photo, globalIndex }) => {
              const imgSrc = typeof photo === 'string' ? photo : (photo?.url || '')
              const titleText = photo?.articleTitle || photo?.source || `Фото #${globalIndex + 1}`
              const quality = photo?.quality || (imgSrc.startsWith('/news-static/') ? 'local' : 'search')
              const qualityBadge = {
                article: { label: '🏆 Из статьи', color: '#10b981' },
                rss:     { label: '📡 RSS',        color: '#3b82f6' },
                local:   { label: '💾 Сохранено',  color: '#6366f1' },
                search:  { label: '🔍 Поиск',      color: '#f59e0b' },
              }[quality] || { label: '🔍 Поиск', color: '#f59e0b' }

              return (
                <div className="photo-card-item">
                  <div className="photo-card-img-wrap">
                    <img src={imgSrc} alt={titleText} loading="lazy" />
                    <span className="photo-source-badge" style={{ background: qualityBadge.color }}>
                      {qualityBadge.label}
                    </span>
                    <button
                      className="remove-photo-btn"
                      onClick={() => handleRemovePhoto(globalIndex)}
                      title="Удалить это фото из списка"
                    >
                      🗑️ Удалить
                    </button>
                  </div>
                  <p className="photo-card-title">{titleText}</p>
                </div>
              )
            }

            return (
              <>
                {/* Раздел 1: Гарантированные фото из статьи */}
                {articlePhotos.length > 0 && (
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.4rem 0.75rem', background: 'rgba(16,185,129,0.12)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>🏆 Гарантированные фото из оригинальной статьи ({articlePhotos.length})</span>
                      <span style={{ fontSize: '0.75rem', color: '#6b7280', marginLeft: 'auto' }}>100% к этой новости</span>
                    </div>
                    <div className="multi-source-photos-grid">
                      {articlePhotos.map((photo, i) => {
                        const globalIndex = items.indexOf(photo)
                        return <PhotoCard key={i} photo={photo} globalIndex={globalIndex} />
                      })}
                    </div>
                  </div>
                )}

                {/* Раздел 2: Дополнительные фото из поисковика */}
                {searchPhotos.length > 0 && (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', padding: '0.4rem 0.75rem', background: 'rgba(245,158,11,0.1)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.3)' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f59e0b' }}>🔍 Дополнительный материал из поисковика Bing ({searchPhotos.length})</span>
                      <span style={{ fontSize: '0.75rem', color: '#ef4444', marginLeft: 'auto' }}>⚠️ Релевантность не гарантирована</span>
                    </div>
                    <div className="multi-source-photos-grid">
                      {searchPhotos.map((photo, i) => {
                        const globalIndex = items.indexOf(photo)
                        return <PhotoCard key={i} photo={photo} globalIndex={globalIndex} />
                      })}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [articles, setArticles] = useState([])
  const [category, setCategory] = useState('vse')
  const [selectedModel, setSelectedModel] = useState('gemini')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [lastRefresh, setLastRefresh] = useState('')
  const [search, setSearch] = useState('')

  // Feuilleton Generation State
  const [generatingId, setGeneratingId] = useState(null)
  const [currentFeuilleton, setCurrentFeuilleton] = useState(null)

  // News Photos Modal State
  const [photoTopic, setPhotoTopic] = useState(null)
  const [newsPhotos, setNewsPhotos] = useState([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  const handleFetchNewsPhotos = async (article, forceLive = false) => {
    if (!article) return
    setPhotoTopic(article)
    setLoadingPhotos(true)
    setNewsPhotos([])

    const toastId = forceLive
      ? toast.loading('🔎 Поиск 30 фото в мировых агентствах...', { description: article.title })
      : null

    try {
      const url = `/api/news-photos?title=${encodeURIComponent(article.title)}&articleId=${encodeURIComponent(article.id || '')}&url=${encodeURIComponent(article.url || '')}&category=${encodeURIComponent(article.category || 'alle')}${forceLive ? '&forceLive=true' : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setNewsPhotos(data.photos || [])
        if (toastId) {
          toast.success(`📸 Найдено ${data.count} фото из агентств!`, { id: toastId })
        }
      }
    } catch (err) {
      if (toastId) toast.error('Ошибка поиска фото', { id: toastId, description: err.message })
      else toast.error('Ошибка поиска фото', { description: err.message })
    } finally {
      setLoadingPhotos(false)
    }
  }

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status')
      if (res.ok) setBackendStatus('online')
      else setBackendStatus('offline')
    } catch {
      setBackendStatus('offline')
    }
  }, [])

  const fetchNews = useCallback(async (cat, force = false) => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/news?category=${cat === 'vse' ? 'alle' : cat}${force ? '&force=true' : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setArticles(data.articles || [])
      setLastRefresh(new Date().toLocaleTimeString('ru-RU'))

      if (force) {
        toast.success('Ленты новостей успешно обновлены!')
      }
    } catch (err) {
      setError(`Ошибка загрузки новостей: ${err.message}`)
      toast.error('Ошибка загрузки новостей', { description: err.message })
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Saved Video Packages State
  const [savedPackages, setSavedPackages] = useState([])
  const [activeSavedPackage, setActiveSavedPackage] = useState(null)
  const [scriptTextPackage, setScriptTextPackage] = useState(null)
  const [audioPackage, setAudioPackage] = useState(null)
  const [videoPackage, setVideoPackage] = useState(null)

  const fetchSavedPackages = useCallback(async () => {
    try {
      const res = await fetch('/api/saved-packages')
      const data = await res.json()
      if (data.success) {
        const pkgs = data.packages || []
        setSavedPackages(pkgs)
        setActiveSavedPackage(current => {
          if (!current) return null
          const updated = pkgs.find(p => p.folderName === current.folderName)
          return updated ? { ...current, ...updated } : current
        })
      }
    } catch (err) {
      console.error('Fetch saved packages error:', err.message)
    }
  }, [])

  useEffect(() => {
    checkStatus()
    fetchNews(category)
    fetchSavedPackages()
  }, [category, fetchNews, checkStatus, fetchSavedPackages])

  const handleGenerate = async (article) => {
    setGeneratingId(article.id)
    const toastId = toast.loading('ИИ пишет 3-минутный фельетон...', {
      description: `Тема: ${article.title.slice(0, 45)}...`,
    })

    try {
      const res = await fetch('/api/generate-feuilleton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          summary: article.summary,
          model: selectedModel,
          source: article.source,
          imageUrl: article.imageUrl,
          images: article.images || (article.imageUrl ? [article.imageUrl] : []),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка генерации')

      const modelObj = AI_MODELS.find(m => m.id === selectedModel)
      const feuObj = {
        title: article.title,
        text: data.text,
        words: data.words,
        minutes: data.minutes,
        modelName: modelObj ? modelObj.name : data.model,
        savedFile: data.savedFile,
        fileName: data.fileName,
        savedPhotosCount: data.savedPhotosCount,
        imageUrl: article.imageUrl,
        images: article.images || (article.imageUrl ? [article.imageUrl] : []),
        id: article.id,
        url: article.url,
        source: article.source,
      }
      setCurrentFeuilleton(feuObj)

      toast.success('🎭 Фельетон успешно создан!', {
        id: toastId,
        description: `📜 Текст: ✅ Готов (${data.words} слов) | 📦 Пакет: ⚠️ Не сохранен в news/ | 🎙️ Аудио: ⚠️ Не создано`,
        action: {
          label: '📂 Открыть и сохранить',
          onClick: () => setCurrentFeuilleton(feuObj),
        },
        duration: 12000,
      })
    } catch (err) {
      toast.error('Ошибка генерации фельетона', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setGeneratingId(null)
    }
  }

  const filtered = search.trim()
    ? articles.filter(a =>
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.summary?.toLowerCase().includes(search.toLowerCase())
      )
    : articles

  return (
    <div className="app">
      {/* Sonner Toast Container */}
      <Toaster position="top-right" theme="dark" richColors closeButton />

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <h1 className="brand-title">ChaosChronicle</h1>
            <p className="brand-sub">Новости · Сатирический Фельетон (3 мин)</p>
          </div>

          <div className="header-actions">
            {/* KI Modell Selectbox */}
            <div className="model-select-wrap">
              <label htmlFor="ai-model-select" className="model-label">🤖 ИИ Модель:</label>
              <select
                id="ai-model-select"
                className="model-select"
                value={selectedModel}
                onChange={e => {
                  setSelectedModel(e.target.value)
                  const m = AI_MODELS.find(x => x.id === e.target.value)
                  if (m) toast.info(`Модель изменена: ${m.name}`)
                }}
              >
                {AI_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="search-wrap">
              <input
                id="news-search"
                type="text"
                className="search-input"
                placeholder="Поиск новостей..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>

            <button
              id="refresh-btn"
              className="refresh-btn"
              onClick={() => {
                fetchNews(category, true)
                toast.info('Обновление свежих новостей из RSS...')
              }}
              disabled={loading}
              title="Обновить свежие новости"
            >
              <span className={loading ? 'spin' : ''}>↻</span>
            </button>
          </div>
        </div>

        {/* Kategorie-Tabs */}
        <nav className="category-tabs" role="tablist" aria-label="Категории новостей">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              id={`tab-${cat.key}`}
              role="tab"
              aria-selected={category === cat.key}
              className={`tab-btn ${category === cat.key ? 'active' : ''}`}
              style={{ '--tab-color': cat.color }}
              onClick={() => setCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-indicator">
          <span className={`status-dot ${backendStatus === 'online' ? 'online' : 'offline'}`} />
          <span className="status-text">
            Сервер {backendStatus === 'online' ? 'онлайн' : 'недоступен'}
          </span>
        </div>
        {filtered.length > 0 && (
          <span className="status-count">{filtered.length} статей загружено</span>
        )}
        <span className="status-active-model">
          Выбрана модель: <strong>{AI_MODELS.find(m => m.id === selectedModel)?.name}</strong>
        </span>
        {lastRefresh && (
          <span className="status-refresh">
            Обновлено: {lastRefresh}
          </span>
        )}
        {loading && <span className="status-loading">⟳ Загрузка...</span>}
      </div>

      {/* Hauptinhalt */}
      <main className="app-main">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => fetchNews(category)}>Попробовать снова</button>
          </div>
        )}

        {loading && articles.length === 0 && (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-img" />
                <div className="skeleton-body">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line medium" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="empty-state">
            <p>📰 Статьи не найдены{search ? ` по запросу «${search}»` : ''}.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="news-grid">
            {filtered.map((article, i) => {
              const articleClean = cleanMatchTitle(article?.title)
              const matchingSavedPkg = (savedPackages || []).find(p => {
                const pClean = cleanMatchTitle(p?.title || p?.folderName)
                if (!pClean || !articleClean) return false
                const subArt = articleClean.slice(0, 12)
                const subPkg = pClean.slice(0, 12)
                return pClean.includes(subArt) || articleClean.includes(subPkg)
              })

              return (
                <NewsCard
                  key={article.id || i}
                  article={article}
                  index={i}
                  onGenerate={handleGenerate}
                  onOpenPhotos={handleFetchNewsPhotos}
                  isGenerating={generatingId === article.id}
                  isSavedPkg={!!matchingSavedPkg}
                  savedPkg={matchingSavedPkg}
                  onViewSavedPackage={pkg => setActiveSavedPackage(pkg)}
                  onViewArtifacts={pkg => setActiveArtifactsPackage(pkg)}
                />
              )
            })}
          </div>
        )}
      </main>

      {/* Feuilleton Modal */}
      <FeuilletonModal
        feuilleton={currentFeuilleton}
        onOpenPhotos={handleFetchNewsPhotos}
        onClose={() => {
          setCurrentFeuilleton(null)
          fetchSavedPackages()
        }}
      />

      {/* Video Package Viewer Modal */}
      <VideoPackageModal
        pkg={activeSavedPackage}
        onOpenPhotos={handleFetchNewsPhotos}
        onOpenScriptText={pkg => setScriptTextPackage(pkg)}
        onOpenAudio={pkg => setAudioPackage(pkg)}
        onOpenVideo={pkg => setVideoPackage(pkg)}
        onClose={() => setActiveSavedPackage(null)}
        onRefresh={fetchSavedPackages}
      />

      {/* Script Text Editor Modal */}
      <NewsScriptModal
        pkg={scriptTextPackage}
        onClose={() => setScriptTextPackage(null)}
        onSaved={fetchSavedPackages}
      />

      {/* News Audio Player Modal */}
      <NewsAudioModal
        pkg={audioPackage}
        onClose={() => setAudioPackage(null)}
        onRefresh={fetchSavedPackages}
      />



      {/* Multi-Source News Photos Modal */}
      <NewsPhotosModal
        newsTopic={photoTopic}
        photos={newsPhotos}
        loading={loadingPhotos}
        onClose={() => setPhotoTopic(null)}
        onSaved={fetchSavedPackages}
        onReload={() => handleFetchNewsPhotos(photoTopic, true)}
      />

      <footer className="app-footer">
        <p>ChaosChronicle PoC · Новости из открытых RSS-лент · ИИ: Gemini 3.6 Flash, DeepSeek R1, Qwen</p>
      </footer>
    </div>
  )
}
