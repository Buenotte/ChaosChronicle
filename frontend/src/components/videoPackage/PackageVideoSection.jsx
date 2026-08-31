import { useState } from 'react'

export const BANNER_STYLES = [
  { id: 'modern_dark', name: '✨ Modern Dark (Стандартный со стеклом и золотым колокольчиком)', file: 'banner_modern_dark.webm' },
  { id: 'youtube_studio', name: '🔴 YouTube Studio Official (Оригинальная анимация с колокольчиком и курсором)', file: 'banner_youtube_studio.webm' },
]

export default function PackageVideoSection({
  videoState,
  actualPhotoCount,
  audioState,
  generatingVideo,
  videoProgress,
  progressLog,
  selectedTransition,
  setSelectedTransition,
  includeSubBanner = true,
  setIncludeSubBanner,
  subBannerTime = 25,
  setSubBannerTime,
  bannerStyle = 'modern_dark',
  setBannerStyle,
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
  const [showBannerPreview, setShowBannerPreview] = useState(false)
  const activeBannerFile = BANNER_STYLES.find(b => b.id === bannerStyle)?.file || 'banner_modern_dark.webm'

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

      {/* 🎬 Live-Fortschrittsbalken beim Rendern (immer sichtbar bei Erstellung & Neuerstellung) */}
      {generatingVideo && (
        <div style={{ background: '#181c27', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #10b981', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.45rem', fontSize: '0.84rem', fontWeight: 600, color: '#e8eaf0' }}>
            <span>🎬 Рендеринг видео 16:9 (FFmpeg)...</span>
            <span style={{ color: '#10b981' }}>{videoProgress}%</span>
          </div>
          <div style={{ height: '8px', background: '#27272a', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${videoProgress}%`, height: '100%', background: '#10b981', transition: 'width 0.3s ease-out' }} />
          </div>
          {progressLog && <p style={{ fontSize: '0.76rem', color: '#9ca3af', marginTop: '0.45rem', fontFamily: 'monospace' }}>{progressLog}</p>}
        </div>
      )}

      {videoState.hasVideo ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="video-player-box" style={{ position: 'relative' }}>
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

            {/* 🔔 Live Preview Banner Overlay */}
            {showBannerPreview && (
              <div style={{
                position: 'absolute',
                bottom: '48px',
                left: '50%',
                transform: 'translateX(-50%)',
                width: '60%',
                maxWidth: '520px',
                pointerEvents: 'none',
                zIndex: 25,
                filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.65))',
              }}>
                <video
                  key={activeBannerFile}
                  src={`/assets/banner/${activeBannerFile}`}
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: '100%', height: 'auto', display: 'block' }}
                />
              </div>
            )}

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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                value={selectedTransition}
                onChange={e => setSelectedTransition(e.target.value)}
                style={{
                  background: '#181c27',
                  border: '1px solid #1e2436',
                  borderRadius: '8px',
                  color: '#e8eaf0',
                  padding: '0.5rem 0.65rem',
                  fontSize: '0.82rem',
                }}
              >
                <option value="concat">Прямая склейка (Быстро)</option>
                <option value="crossfade">Плавное растворение (Crossfade)</option>
                <option value="fadeblack">Через черный экран</option>
              </select>
              <button
                className="copy-btn"
                style={{ background: '#3f3f46', fontWeight: 600 }}
                onClick={onGenerateVideo}
                disabled={generatingVideo}
              >
                {generatingVideo ? '⏳ Пересборка...' : '🔄 Собрать видео заново'}
              </button>
              <button
                className="copy-btn"
                style={{ background: '#10b981' }}
                onClick={onOpenVideoModal}
              >
                🎬 Во весь экран
              </button>
              <button
                type="button"
                className="copy-btn"
                style={{
                  background: showBannerPreview ? '#ec4899' : '#1e293b',
                  color: '#fff',
                  border: '1px solid #3b82f6',
                  fontWeight: 600,
                }}
                onClick={() => setShowBannerPreview(!showBannerPreview)}
                title="Показать / скрыть живую анимацию баннера прямо в плеере без пересборки видео"
              >
                {showBannerPreview ? '🙈 Скрыть баннер' : '👁️ Тест баннера'}
              </button>
            </div>

            <BannerSettingsBar
              includeSubBanner={includeSubBanner}
              setIncludeSubBanner={setIncludeSubBanner}
              bannerStyle={bannerStyle}
              setBannerStyle={setBannerStyle}
              subBannerTime={subBannerTime}
              setSubBannerTime={setSubBannerTime}
            />
          </div>
        </div>
      ) : (
        <div>
          {/* Live Preview Box vor dem Rendern, falls gewünscht */}
          {showBannerPreview && (
            <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', background: '#090d16', borderRadius: '8px', overflow: 'hidden', marginBottom: '0.75rem', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>🖼️ 16:9 Фон видео (Предпросмотр баннера)</div>
              <div style={{ position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)', width: '60%', maxWidth: '520px', pointerEvents: 'none', zIndex: 25, filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.65))' }}>
                <video key={activeBannerFile} src={`/assets/banner/${activeBannerFile}`} autoPlay loop muted playsInline style={{ width: '100%', height: 'auto', display: 'block' }} />
              </div>
            </div>
          )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
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
                <button
                  type="button"
                  className="copy-btn"
                  style={{
                    background: showBannerPreview ? '#ec4899' : '#1e293b',
                    color: '#fff',
                    border: '1px solid #3b82f6',
                    fontWeight: 600,
                  }}
                  onClick={() => setShowBannerPreview(!showBannerPreview)}
                  title="Посмотреть анимацию баннера прямо сейчас"
                >
                  {showBannerPreview ? '🙈 Скрыть тест' : '👁️ Тест баннера'}
                </button>
              </div>

              <BannerSettingsBar
                includeSubBanner={includeSubBanner}
                setIncludeSubBanner={setIncludeSubBanner}
                bannerStyle={bannerStyle}
                setBannerStyle={setBannerStyle}
                subBannerTime={subBannerTime}
                setSubBannerTime={setSubBannerTime}
              />
            </div>
          </div>
        )}
    </div>
  )
}

function BannerSettingsBar({ includeSubBanner, setIncludeSubBanner, bannerStyle, setBannerStyle, subBannerTime, setSubBannerTime }) {
  if (!setIncludeSubBanner) return null
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', background: '#181c27', padding: '0.45rem 0.75rem', borderRadius: '6px', border: '1px solid #27272a' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', color: '#cbd5e1', cursor: 'pointer', margin: 0 }}>
        <input
          type="checkbox"
          checked={includeSubBanner}
          onChange={e => setIncludeSubBanner(e.target.checked)}
          style={{ accentColor: '#10b981', cursor: 'pointer' }}
        />
        <span>🔔 Анимация подписки</span>
      </label>

      {includeSubBanner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexWrap: 'wrap' }}>
          {setBannerStyle && (
            <select
              value={bannerStyle}
              onChange={e => setBannerStyle(e.target.value)}
              style={{
                background: '#0f172a',
                border: '1px solid #3b82f6',
                borderRadius: '4px',
                color: '#e2e8f0',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.2rem 0.45rem',
              }}
            >
              {BANNER_STYLES.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}

          {setSubBannerTime && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>на:</span>
              <input
                type="number"
                min={0}
                max={600}
                value={subBannerTime}
                onChange={e => setSubBannerTime(Math.max(0, parseInt(e.target.value) || 0))}
                style={{
                  width: '48px',
                  background: '#0f172a',
                  border: '1px solid #3b82f6',
                  borderRadius: '4px',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.35rem',
                  textAlign: 'center',
                }}
              />
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>сек.</span>

              <div style={{ display: 'flex', gap: '0.2rem' }}>
                {[15, 25, 30, 45].map(sec => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => setSubBannerTime(sec)}
                    style={{
                      background: subBannerTime === sec ? '#3b82f6' : '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '4px',
                      color: subBannerTime === sec ? '#fff' : '#94a3b8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '0.15rem 0.35rem',
                      cursor: 'pointer',
                    }}
                  >
                    {sec}с
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
