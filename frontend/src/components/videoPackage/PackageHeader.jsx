export default function PackageHeader({
  pkg,
  hasTxt,
  actualPhotoCount,
  audioState,
  videoState,
  currentThumbnail,
  isMaximized,
  setIsMaximized,
  onOpenTitleVariants,
  onOpenScript,
  onOpenPhotos,
  onDeletePackage,
  onClose,
}) {
  const hasTitle = Boolean(
    (pkg?.title_variants && pkg.title_variants.length > 0) ||
    pkg?.title_updated_at ||
    (pkg?.title && pkg.title !== 'Ohne Titel' && pkg.title !== (pkg?.original_title || ''))
  )

  return (
    <div className="modal-header">
      <div>
        <span className="modal-badge saved-badge">
          📂 Видео-пакет в news/{pkg.folderName || ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{pkg.title}</h2>
        </div>
        <div className="modal-stats" style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={`saved-status-badge ${hasTitle ? 'active' : 'inactive'} clickable`}
            onClick={onOpenTitleVariants}
            title="Нажмите, чтобы открыть генератор 10 заголовков"
          >
            ⚡ title {hasTitle ? '✅' : '❌'}
          </button>

          <button
            type="button"
            className={`saved-status-badge ${hasTxt ? 'active' : 'inactive'} ${onOpenScript ? 'clickable' : ''}`}
            onClick={onOpenScript}
            title="Сценарий монолога (script.txt)"
          >
            📜 script.txt {hasTxt ? '✅' : '❌'}
          </button>

          <button
            type="button"
            className={`saved-status-badge ${actualPhotoCount > 0 ? 'active' : 'inactive'} ${onOpenPhotos ? 'clickable' : ''}`}
            onClick={onOpenPhotos}
            title="Фотографии к новости (photos/)"
          >
            📸 photos/ ({actualPhotoCount}) {actualPhotoCount > 0 ? '✅' : '❌'}
          </button>

          <span
            className={`saved-status-badge ${audioState.hasAudio ? 'active' : 'inactive'}`}
            title="Аудио-озвучка (audio.mp3)"
          >
            🎙️ audio.mp3 {audioState.hasAudio ? '✅' : '❌'}
          </span>

          <span
            className={`saved-status-badge ${videoState.hasVideo ? 'active' : 'inactive'}`}
            title="1080p Видео-ролик (video.mp4)"
          >
            🎬 video.mp4 {videoState.hasVideo ? '✅' : '❌'}
          </span>

          <span
            className={`saved-status-badge ${currentThumbnail ? 'active' : 'inactive'}`}
            title="16:9 YouTube Обложка (thumbnail.jpg)"
          >
            ✨ thumbnail.jpg {currentThumbnail ? '✅' : '❌'}
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
        {onDeletePackage && (
          <button
            type="button"
            className="modal-close"
            onClick={onDeletePackage}
            title="Удалить весь этот пакет с диска"
            style={{ color: '#ef4444', borderColor: '#ef4444' }}
          >
            🗑️
          </button>
        )}
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
  )
}
