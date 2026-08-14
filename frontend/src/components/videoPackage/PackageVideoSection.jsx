export default function PackageVideoSection({
  videoState,
  actualPhotoCount,
  audioState,
  generatingVideo,
  videoProgress,
  progressLog,
  selectedTransition,
  setSelectedTransition,
  videoRef,
  isPlaying,
  currentTime,
  duration,
  togglePlay,
  seekVideo,
  onGenerateVideo,
  onOpenVideoModal,
  onTimeUpdate,
  onLoadedMetadata,
}) {
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
        4. Финальное видео 16:9 (FFmpeg):
      </h3>

      {videoState.hasVideo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="video-player-box">
            <video
              ref={videoRef}
              src={videoState.videoUrl}
              className="video-element"
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onEnded={() => {}}
              controls
              playsInline
            />
            {/* Custom overlay controls bar */}
            <div style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)',
              padding: '0.5rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              zIndex: 10,
            }}>
              <button
                type="button"
                onClick={togglePlay}
                style={{
                  background: isPlaying ? '#ec4899' : '#10b981',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {isPlaying ? '⏸' : '▶'}
              </button>

              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={seekVideo}
                style={{ flex: 1, accentColor: '#ec4899', cursor: 'pointer' }}
              />

              <span style={{ fontSize: '0.75rem', color: '#fff', fontFamily: 'monospace' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="copy-btn"
              style={{ background: '#10b981' }}
              onClick={onOpenVideoModal}
            >
              🎬 Открыть видео-модалку
            </button>
            <button
              className="copy-btn"
              style={{ background: '#3f3f46' }}
              onClick={onGenerateVideo}
              disabled={generatingVideo}
            >
              {generatingVideo ? '⏳ Пересборка...' : '🔄 Собрать видео заново'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          {generatingVideo ? (
            <div style={{ background: '#181c27', padding: '1rem', borderRadius: '8px', border: '1px solid #1e2436' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span>🎬 Рендеринг видео...</span>
                <span>{videoProgress}%</span>
              </div>
              <div style={{ height: '8px', background: '#27272a', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${videoProgress}%`, height: '100%', background: '#10b981', transition: 'width 0.3s' }} />
              </div>
              {progressLog && <p style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.5rem' }}>{progressLog}</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedTransition}
                onChange={e => setSelectedTransition(e.target.value)}
                style={{
                  background: '#181c27',
                  border: '1px solid #1e2436',
                  borderRadius: '8px',
                  color: '#e8eaf0',
                  padding: '0.55rem',
                  fontSize: '0.82rem',
                }}
              >
                <option value="concat">Прямая склейка (Быстро)</option>
                <option value="crossfade">Плавное растворение (Crossfade)</option>
                <option value="fadeblack">Через черный экран</option>
              </select>
              <button
                className="copy-btn"
                style={{ background: '#10b981', fontWeight: 700 }}
                onClick={onGenerateVideo}
                disabled={generatingVideo}
              >
                🎬 Создать видео (FFmpeg)
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
