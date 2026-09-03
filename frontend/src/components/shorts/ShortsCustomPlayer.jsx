import { useState, useRef, useEffect } from 'react'

export default function ShortsCustomPlayer({ src, onEditMode }) {
  const videoRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [showIcon, setShowIcon] = useState(false)

  useEffect(() => {
    if (videoRef.current) {
      try { videoRef.current.load() } catch {}
      videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false))
    }
  }, [src])

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
    setShowIcon(true)
    setTimeout(() => setShowIcon(false), 600)
  }

  const toggleMute = (e) => {
    e.stopPropagation()
    if (!videoRef.current) return
    videoRef.current.muted = !isMuted
    setIsMuted(!isMuted)
  }

  const handleTimeUpdate = () => {
    if (!videoRef.current) return
    const dur = videoRef.current.duration || 1
    setProgress((videoRef.current.currentTime / dur) * 100)
  }

  const handleSeek = (e) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1))
    if (videoRef.current && videoRef.current.duration) {
      videoRef.current.currentTime = pos * videoRef.current.duration
      setProgress(pos * 100)
    }
  }

  return (
    <div
      onClick={togglePlay}
      style={{
        position: 'relative', width: '100%', height: '100%', background: '#000',
        cursor: 'pointer', overflow: 'hidden', userSelect: 'none'
      }}
    >
      <video
        key={src}
        ref={videoRef}
        src={src}
        loop
        playsInline
        autoPlay
        muted={isMuted}
        onTimeUpdate={handleTimeUpdate}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Floating Play/Pause Feedback Icon */}
      {showIcon && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', background: 'rgba(0,0,0,0.25)', transition: 'all 0.3s ease'
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.7)', borderRadius: '50%', width: '56px', height: '56px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', color: '#fff'
          }}>
            {isPlaying ? '▶' : '⏸'}
          </div>
        </div>
      )}

      {/* Top Floating Controls */}
      <div style={{
        position: 'absolute', top: '10px', right: '10px', zIndex: 20,
        display: 'flex', gap: '0.4rem', alignItems: 'center'
      }}>
        <button
          type="button"
          onClick={toggleMute}
          style={{
            background: 'rgba(0,0,0,0.65)', border: '1px solid rgba(255,255,255,0.2)',
            color: '#fff', borderRadius: '50%', width: '28px', height: '28px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', cursor: 'pointer'
          }}
          title={isMuted ? 'Включить звук' : 'Выключить звук'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        {onEditMode && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEditMode(); }}
            style={{
              background: 'rgba(244,63,94,0.85)', border: 'none', color: '#fff',
              borderRadius: '6px', padding: '0.25rem 0.55rem', fontSize: '0.72rem',
              fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
            }}
          >
            ✏️ Изменить
          </button>
        )}
      </div>

      {/* Bottom Progress Bar (TikTok/Shorts style) */}
      <div
        onClick={handleSeek}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '6px',
          background: 'rgba(255,255,255,0.2)', cursor: 'ew-resize', zIndex: 20
        }}
      >
        <div style={{
          width: `${progress}%`, height: '100%',
          background: 'linear-gradient(90deg, #f43f5e, #ec4899)',
          boxShadow: '0 0 8px #f43f5e'
        }} />
      </div>
    </div>
  )
}
