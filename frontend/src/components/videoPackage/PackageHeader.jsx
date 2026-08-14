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
  onClose,
}) {
  return (
    <div className="modal-header">
      <div>
        <span className="modal-badge saved-badge">
          📂 Видео-пакет в news/{pkg.folderName || ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{pkg.title}</h2>
        </div>
        <div className="modal-stats" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span className="saved-status-badge">📜 script.txt {hasTxt ? '✅' : '❌'}</span>
          <span className="saved-status-badge">📸 photos/ ({actualPhotoCount})</span>
          <span className="saved-status-badge">🎙️ audio.mp3 {audioState.hasAudio ? '✅' : '❌'}</span>
          <span className="saved-status-badge">🎬 video.mp4 {videoState.hasVideo ? '✅' : '❌'}</span>
          {currentThumbnail && (
            <span className="saved-status-badge" style={{ background: 'rgba(236,72,153,0.2)', border: '1px solid #ec4899', color: '#f472b6' }}>
              ✨ thumbnail.jpg ✅
            </span>
          )}
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
  )
}
