import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import ImageLightboxModal from './ImageLightboxModal'
import ThumbnailSettingsModal from './ThumbnailSettingsModal'

export default function VideoPackageModal({ pkg, onOpenPhotos, onOpenScriptText, onOpenAudio, onOpenVideo, onClose, onRefresh }) {
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
  const [showThumbnailGrid, setShowThumbnailGrid] = useState(false)
  const [currentThumbnail, setCurrentThumbnail] = useState(pkg.folderName ? `/news-static/${pkg.folderName}/thumbnail/thumbnail.jpg?t=${Date.now()}` : null)

  const handleSetThumbnailDirect = async (photoUrl) => {
    try {
      const res = await fetch('/api/set-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl,
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCurrentThumbnail(`${data.thumbnailUrl}&t=${Date.now()}`)
        toast.success('🖼️ Обложка (thumbnail.jpg) успешно сохранена в видео-пакет!')
      } else {
        toast.error('Ошибка создания обложки: ' + (data.error || 'Неизвестная ошибка'))
      }
    } catch (err) {
      toast.error('Ошибка сохранения обложки', { description: err.message })
    }
  }

  const handleGenerateAiThumbnail = async () => {
    try {
      const toastId = toast.loading('🤖 Создание впечатляющей обложки 16:9 из всех фото...')
      const res = await fetch('/api/set-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'generate_ai',
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setCurrentThumbnail(`${data.thumbnailUrl}&t=${Date.now()}`)
        toast.success('✨ Впечатляющая обложка 16:9 (thumbnail.jpg) создана и сохранена!', { id: toastId })
      } else {
        toast.error('Ошибка генерации обложки', { id: toastId, description: data.error })
      }
    } catch (err) {
      toast.error('Ошибка генерации обложки', { description: err.message })
    }
  }

  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <ImageLightboxModal
        imageUrl={lightboxUrl}
        title="🖼️ 16:9 YouTube Обложка"
        onClose={() => setLightboxUrl(null)}
      />

      {showSettingsModal && (
        <ThumbnailSettingsModal
          pkg={pkg}
          currentThumbnail={currentThumbnail}
          onClose={() => setShowSettingsModal(false)}
          onUpdated={(newUrl) => setCurrentThumbnail(newUrl)}
        />
      )}
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
              {currentThumbnail && <span className="saved-status-badge" style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid #ec4899', color: '#f472b6' }}>✨ thumbnail.jpg ✅</span>}
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

          {/* Секция 1.5: Обложка (Thumbnail) */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#ec4899', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🖼️ Обложка видео 16:9 (thumbnail.jpg):
            </h3>

            {actualPhotoCount > 0 ? (
              <div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    className="copy-btn"
                    style={{ background: '#ec4899' }}
                    onClick={handleGenerateAiThumbnail}
                  >
                    ✨ Создать Gemini AI 16:9 Обложку
                  </button>

                  <button
                    className="copy-btn"
                    style={{ background: '#f59e0b', color: '#000', fontWeight: 700 }}
                    onClick={() => setShowSettingsModal(true)}
                  >
                    ⚙️ Настроить шрифт и текст
                  </button>

                  <button
                    className="copy-btn"
                    style={{ background: '#8b5cf6' }}
                    onClick={() => setShowThumbnailGrid(!showThumbnailGrid)}
                  >
                    {showThumbnailGrid ? '🔼 Скрыть фото' : `🖼️ Выбрать из ${actualPhotoCount} фото`}
                  </button>

                  <button
                    className="copy-btn"
                    style={{ background: '#0284c7' }}
                    onClick={() => onOpenPhotos(pkg)}
                  >
                    📸 Открыть все фото
                  </button>
                </div>

                {currentThumbnail && (
                  <div style={{ marginTop: '0.75rem', maxWidth: '480px' }}>
                    <div style={{ borderRadius: '12px', overflow: 'hidden', border: '2px solid #ec4899', background: '#09090b', position: 'relative' }}>
                      <img
                        src={currentThumbnail}
                        alt="16:9 YouTube Cover Thumbnail"
                        onClick={() => setLightboxUrl(currentThumbnail)}
                        title="🔍 Нажмите, чтобы открыть обложку в полном экране"
                        style={{ width: '100%', height: 'auto', aspectRatio: '16/9', display: 'block', objectFit: 'cover', cursor: 'zoom-in' }}
                        onError={e => {
                          e.target.src = `/news-static/${pkg.folderName}/thumbnail.jpg`
                        }}
                      />
                    </div>
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        className="copy-btn"
                        style={{ background: '#f59e0b', color: '#000', fontWeight: 700, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => setShowSettingsModal(true)}
                      >
                        ⚙️ Изменить шрифт / текст
                      </button>
                      <button
                        className="copy-btn"
                        style={{ background: '#10b981', flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={async () => {
                          const suggestedName = `thumbnail_${pkg.folderName || 'cover'}.jpg`;
                          try {
                            const res = await fetch(currentThumbnail);
                            const blob = await res.blob();
                            if ('showSaveFilePicker' in window) {
                              const handle = await window.showSaveFilePicker({
                                suggestedName,
                                types: [{
                                  description: 'JPEG Image (*.jpg)',
                                  accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
                                }],
                              });
                              const writable = await handle.createWritable();
                              await writable.write(blob);
                              await writable.close();
                              toast.success('💾 Обложка успешно сохранена в выбранную папку!');
                            } else {
                              const blobUrl = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = blobUrl;
                              a.download = suggestedName;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(blobUrl);
                              toast.success('💾 Обложка сохранена!');
                            }
                          } catch (err) {
                            if (err.name !== 'AbortError') {
                              window.open(currentThumbnail, '_blank');
                            }
                          }
                        }}
                      >
                        💾 Сохранить как... (Выбрать папку)
                      </button>
                      <button
                        className="copy-btn"
                        style={{ background: '#3b82f6', padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                        onClick={() => setLightboxUrl(currentThumbnail)}
                      >
                        🔍 На весь экран
                      </button>
                    </div>
                  </div>
                )}

                {showThumbnailGrid && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.5rem', padding: '0.65rem', background: '#111827', borderRadius: '10px', border: '1px solid rgba(236,72,153,0.3)', marginTop: '0.5rem' }}>
                    {(pkg.photoUrls || []).map((imgUrl, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSetThumbnailDirect(imgUrl)}
                        style={{
                          cursor: 'pointer',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: currentThumbnail && currentThumbnail.includes(`photo_${String(idx + 1).padStart(2, '0')}`) ? '3px solid #ec4899' : '1px solid rgba(255,255,255,0.15)',
                          position: 'relative',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <img src={imgUrl} alt={`Фото ${idx + 1}`} style={{ width: '100%', height: '85px', objectFit: 'cover' }} />
                        <div style={{ padding: '0.25rem', textAlign: 'center', background: 'rgba(0,0,0,0.85)', fontSize: '0.72rem', color: currentThumbnail && currentThumbnail.includes(`photo_${String(idx + 1).padStart(2, '0')}`) ? '#f472b6' : '#9ca3af', fontWeight: 600 }}>
                          {currentThumbnail && currentThumbnail.includes(`photo_${String(idx + 1).padStart(2, '0')}`) ? '✨ Обложка ✅' : 'Выбрать 🖼️'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: 0 }}>📷 Нет фото в папке news/photos/ для создания обложки</p>
            )}
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
