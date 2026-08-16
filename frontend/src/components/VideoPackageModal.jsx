import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import ImageLightboxModal from './ImageLightboxModal'
import ThumbnailSettingsModal from './ThumbnailSettingsModal'
import TitleVariantsModal from './TitleVariantsModal'
import YouTubeMetadataModal from './YouTubeMetadataModal'
import PackageHeader from './videoPackage/PackageHeader'
import PackageThumbnailSection from './videoPackage/PackageThumbnailSection'
import PackageAudioSection from './videoPackage/PackageAudioSection'
import PackageVideoSection from './videoPackage/PackageVideoSection'
import PackageYouTubeSection from './videoPackage/PackageYouTubeSection'

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

  const [selectedVoice, setSelectedVoice] = useState('aleg-neutral')
  const [selectedTransition, setSelectedTransition] = useState('concat')
  const [includeSubBanner, setIncludeSubBanner] = useState(true)

  const [audioState, setAudioState] = useState({ hasAudio: !!pkg.hasAudio, audioUrl: pkg.audioUrl })
  const [videoState, setVideoState] = useState({ hasVideo: !!pkg.hasVideo, videoUrl: pkg.videoUrl })

  useEffect(() => {
    setAudioState({ hasAudio: !!pkg.hasAudio, audioUrl: pkg.audioUrl })
    setVideoState({ hasVideo: !!pkg.hasVideo, videoUrl: pkg.videoUrl })
    setIsPlaying(false)
    setCurrentTime(0)
  }, [pkg])

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause()
      else videoRef.current.play()
      setIsPlaying(!isPlaying)
    }
  }

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime)
      setIsPlaying(!videoRef.current.paused)
    }
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration)
    }
  }

  const seekVideo = (e) => {
    const time = parseFloat(e.target.value)
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }

  const [isMaximized, setIsMaximized] = useState(false)
  const [currentThumbnail, setCurrentThumbnail] = useState(
    pkg.hasThumbnail ? (pkg.thumbnailUrl || (pkg.folderName ? `/news-static/${pkg.folderName}/thumbnail/thumbnail.jpg` : null)) : null
  )

  useEffect(() => {
    const thumb = pkg.hasThumbnail
      ? (pkg.thumbnailUrl || (pkg.folderName ? `/news-static/${pkg.folderName}/thumbnail/thumbnail.jpg?t=${Date.now()}` : null))
      : null
    setCurrentThumbnail(thumb)
  }, [pkg])

  const handleSaveAsNative = async () => {
    if (!currentThumbnail) return
    try {
      const resp = await fetch(currentThumbnail)
      const blob = await resp.blob()
      const defaultName = `thumbnail_${pkg.folderName || 'cover'}.jpg`
      if (window.showSaveFilePicker) {
        try {
          const handle = await window.showSaveFilePicker({ suggestedName: defaultName, types: [{ description: 'JPEG Image', accept: { 'image/jpeg': ['.jpg'] } }] })
          const writable = await handle.createWritable()
          await writable.write(blob)
          await writable.close()
          return toast.success('💾 Обложка сохранена!')
        } catch (e) { if (e.name === 'AbortError') return }
      }
      const url = window.URL.createObjectURL(blob), a = document.createElement('a')
      a.href = url; a.download = defaultName; document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url)
      toast.success('💾 Обложка скачана!')
    } catch (err) {
      toast.error('Ошибка сохранения: ' + err.message)
    }
  }

  const handleGenerateAudio = async () => {
    if (!hasTxt) return toast.error('❌ Текст сценария отсутствует. Сначала создайте текст в разделе «1»!')
    try {
      setGeneratingAudio(true)
      const toastId = toast.loading('🎙️ Генерация аудио-озвучки...')
      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleDir: pkg.bundleDir, folderName: pkg.folderName, voice: selectedVoice }),
      })
      const data = await res.json()
      if (data.success) {
        setAudioState({ hasAudio: true, audioUrl: data.audioUrl })
        toast.success('🎙️ Озвучка успешно сгенерирована!', { id: toastId })
        if (onRefresh) onRefresh()
      } else {
        toast.error('Ошибка генерации аудио: ' + data.error, { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка генерации аудио: ' + err.message)
    } finally {
      setGeneratingAudio(false)
    }
  }

  const handleGenerateVideo = async () => {
    if (!audioState.hasAudio) return toast.error('❌ Сначала создайте аудио-озвучку (audio.mp3) в разделе 3!')
    if (actualPhotoCount === 0) return toast.error('❌ В пакете нет фотографий. Сначала откройте раздел 2 и сохраните фото!')
    try {
      setGeneratingVideo(true)
      setVideoProgress(20)
      setProgressLog('Сборка параметров видео и монтаж слайд-шоу (FFmpeg)...')
      const toastId = toast.loading('🎬 Монтаж видео 16:9 через FFmpeg...')
      const res = await fetch('/api/render-video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          transition: selectedTransition,
          includeSubBanner,
          subBannerTime: 30,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setVideoProgress(100)
        setVideoState({ hasVideo: true, videoUrl: data.videoUrl })
        toast.success('🎬 Финальное видео 16:9 готово!', { id: toastId })
        if (onRefresh) onRefresh()
      } else {
        toast.error('Ошибка рендеринга видео: ' + data.error, { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка рендеринга видео: ' + err.message)
    } finally {
      setGeneratingVideo(false)
    }
  }

  const handleGenerateAiThumbnail = async () => {
    try {
      const toastId = toast.loading('🤖 Создание впечатляющей обложки 16:9...')
      const res = await fetch('/api/set-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'generate_ai', bundleDir: pkg.bundleDir, folderName: pkg.folderName, headlineConfig: { text: pkg.title } }),
      })
      const data = await res.json()
      if (data.success) {
        setCurrentThumbnail(`${data.thumbnailUrl}&t=${Date.now()}`)
        toast.success('✨ Впечатляющая обложка 16:9 создана и сохранена!', { id: toastId })
      } else {
        toast.error('Ошибка генерации обложки: ' + data.error, { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка генерации обложки: ' + err.message)
    }
  }

  const handleSelectPhotoAsThumbnail = async (photoUrl) => {
    try {
      const toastId = toast.loading('🖼️ Применение фото для обложки...')
      const res = await fetch('/api/set-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoUrl, bundleDir: pkg.bundleDir, folderName: pkg.folderName, headlineConfig: { text: pkg.title } }),
      })
      const data = await res.json()
      if (data.success) {
        setCurrentThumbnail(`${data.thumbnailUrl}&t=${Date.now()}`)
        toast.success('✨ Фото установлено фоном обложки!', { id: toastId })
        if (onRefresh) onRefresh()
      } else {
        toast.error('Ошибка: ' + (data.error || 'Не удалось обновить'), { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка: ' + err.message)
    }
  }

  const [lightboxUrl, setLightboxUrl] = useState(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showTitleVariantsModal, setShowTitleVariantsModal] = useState(false)
  const [showYouTubeModal, setShowYouTubeModal] = useState(false)

  useEffect(() => {
    try {
      const modalParam = new URLSearchParams(window.location.search).get('modal')
      if (modalParam === 'thumbnail') {
        setShowSettingsModal(true)
      }
    } catch {}
  }, [])

  const handleOpenSettings = () => {
    setShowSettingsModal(true)
    try { const url = new URL(window.location.href); url.searchParams.set('modal', 'thumbnail'); window.history.replaceState({}, '', url.toString()) } catch {}
  }
  const handleCloseSettings = () => {
    setShowSettingsModal(false)
    try { const url = new URL(window.location.href); url.searchParams.delete('modal'); window.history.replaceState({}, '', url.toString()) } catch {}
  }

  const handleDeletePackage = async () => {
    if (!window.confirm(`Вы уверены, что хотите удалить пакет "${pkg.title || pkg.folderName}"?`)) return
    try {
      const res = await fetch('/api/delete-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName: pkg.folderName, bundleDir: pkg.bundleDir }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`🗑️ Пакет "${pkg.title || pkg.folderName}" удален`)
        if (onRefresh) onRefresh()
        onClose()
      } else {
        toast.error('Ошибка удаления: ' + (data.error || 'Не удалось удалить'))
      }
    } catch (err) {
      toast.error('Ошибка удаления: ' + err.message)
    }
  }

  const hasTxt = pkg.hasScriptTxt || pkg.hasScriptMd || (pkg.scriptTxt && pkg.scriptTxt.length > 10)
  const actualPhotoCount = pkg.photosCount || (pkg.photoUrls ? pkg.photoUrls.length : 0)

  return (
    <div className="modal-overlay" onClick={onClose}>
      <ImageLightboxModal imageUrl={lightboxUrl} title="🖼️ 16:9 YouTube Обложка" onClose={() => setLightboxUrl(null)} />

      {showSettingsModal && (
        <ThumbnailSettingsModal
          pkg={pkg}
          currentThumbnail={currentThumbnail}
          onClose={handleCloseSettings}
          onUpdated={(newUrl) => {
            setCurrentThumbnail(newUrl)
            if (onRefresh) onRefresh()
          }}
        />
      )}

      {showTitleVariantsModal && (
        <TitleVariantsModal
          pkg={pkg}
          onClose={() => setShowTitleVariantsModal(false)}
          onTitleSaved={(newTitle, newThumb) => {
            pkg.title = newTitle
            if (newThumb) setCurrentThumbnail(newThumb)
            if (onRefresh) onRefresh()
          }}
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
        <PackageHeader
          pkg={pkg}
          hasTxt={hasTxt}
          actualPhotoCount={actualPhotoCount}
          audioState={audioState}
          videoState={videoState}
          currentThumbnail={currentThumbnail}
          isMaximized={isMaximized}
          setIsMaximized={setIsMaximized}
          onOpenTitleVariants={() => setShowTitleVariantsModal(true)}
          onOpenScript={() => onOpenScriptText && onOpenScriptText(pkg)}
          onOpenPhotos={() => onOpenPhotos && onOpenPhotos(pkg)}
          onDeletePackage={handleDeletePackage}
          onClose={onClose}
        />

        <div className="modal-body">
          {/* 1. Скрипт текста и Заголовок */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: '0.5rem' }}>1. Заголовок и сценарий:</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button className="copy-btn" style={{ background: '#3b82f6' }} onClick={() => onOpenScriptText(pkg)}>
                📜 Открыть и редактировать текст
              </button>
              <button className="copy-btn" style={{ background: '#ec4899', fontWeight: 600 }} onClick={() => setShowTitleVariantsModal(true)}>
                ⚡ Выбрать из 10 заголовков (Голобуцкий)
              </button>
            </div>
          </div>

          {/* 1.5 Обложка (Thumbnail) */}
          <PackageThumbnailSection
            actualPhotoCount={actualPhotoCount}
            currentThumbnail={currentThumbnail}
            photoUrls={pkg.photoUrls || []}
            folderName={pkg.folderName}
            onGenerateAiThumbnail={handleGenerateAiThumbnail}
            onSelectBgPhoto={handleSelectPhotoAsThumbnail}
            onOpenSettingsModal={handleOpenSettings}
            onOpenLightbox={() => setLightboxUrl(currentThumbnail)}
            onSaveAsNative={handleSaveAsNative}
          />

          {/* 2. Фотографии */}
          <div style={{ marginBottom: '1.25rem' }}>
            <h3 style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: '0.5rem' }}>2. Фотографии в пакете:</h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="photos-btn" onClick={() => onOpenPhotos(pkg)}>
                📸 Управление фото ({actualPhotoCount})
              </button>
            </div>
          </div>

          {/* 3. Аудио */}
          <PackageAudioSection
            hasTxt={hasTxt}
            audioState={audioState}
            selectedVoice={selectedVoice}
            setSelectedVoice={setSelectedVoice}
            generatingAudio={generatingAudio}
            onGenerateAudio={handleGenerateAudio}
            onOpenAudioModal={() => onOpenAudio(pkg)}
          />

          {/* 4. Видео */}
          <PackageVideoSection
            videoState={videoState}
            actualPhotoCount={actualPhotoCount}
            audioState={audioState}
            generatingVideo={generatingVideo}
            videoProgress={videoProgress}
            progressLog={progressLog}
            selectedTransition={selectedTransition}
            setSelectedTransition={setSelectedTransition}
            includeSubBanner={includeSubBanner}
            setIncludeSubBanner={setIncludeSubBanner}
            videoRef={videoRef}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            togglePlay={togglePlay}
            seekVideo={seekVideo}
            onGenerateVideo={handleGenerateVideo}
            onOpenVideoModal={() => onOpenVideo(pkg)}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
          />

          {/* 5. YouTube Метаданные */}
          <PackageYouTubeSection onOpenYouTubeModal={() => setShowYouTubeModal(true)} />
        </div>
      </div>

      {showYouTubeModal && (
        <YouTubeMetadataModal
          pkg={pkg}
          onClose={() => setShowYouTubeModal(false)}
        />
      )}
    </div>
  )
}
