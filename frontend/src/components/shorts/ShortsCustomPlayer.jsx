import { useState, useRef, useEffect } from 'react'

export default function ShortsCustomPlayer({ src, onEditMode }) {
  const videoRef = useRef(null)
  const progressTrackRef = useRef(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [showIcon, setShowIcon] = useState(false)

  useEffect(() => {
    if (videoRef.current) {
      try { videoRef.current.load() } catch {}
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
    }
  }, [src])

  const togglePlay = (e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play().catch(err => console.error('Play error:', err))
    } else {
      videoRef.current.pause()
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
    if (!videoRef.current || isSeeking) return
    const cur = videoRef.current.currentTime || 0
    const dur = videoRef.current.duration || 1
    setCurrentTime(cur)
    setDuration(dur)
    setProgress((cur / dur) * 100)
  }

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration || 0)
  }

  const updateSeek = (clientX) => {
    if (!videoRef.current || !progressTrackRef.current) return
    const rect = progressTrackRef.current.getBoundingClientRect()
    const pos = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1))
    const dur = videoRef.current.duration || duration || 1
    const newTime = pos * dur
    videoRef.current.currentTime = newTime
    setCurrentTime(newTime)
    setProgress(pos * 100)
  }

  const handleStartSeek = (e) => {
    e.stopPropagation()
    setIsSeeking(true)
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    updateSeek(clientX)
    const handleMove = (ev) => {
      ev.preventDefault()
      const x = ev.touches ? ev.touches[0].clientX : ev.clientX
      updateSeek(x)
    }
    const handleEnd = () => {
      setIsSeeking(false)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleEnd)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleEnd)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleEnd)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleEnd)
  }

  const skipTime = (delta, e) => {
    if (e && e.stopPropagation) e.stopPropagation()
    if (!videoRef.current) return
    const dur = videoRef.current.duration || duration || 1
    const target = Math.max(0, Math.min((videoRef.current.currentTime || 0) + delta, dur))
    videoRef.current.currentTime = target
    setCurrentTime(target)
    setProgress((target / dur) * 100)
  }

  const formatSecs = (sec) => {
    const s = Math.floor(sec || 0)
    const m = Math.floor(s / 60), r = s % 60
    return `${m}:${String(r).padStart(2, '0')}`
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
        muted={isMuted}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
      />

      {/* Floating Play Button when paused */}
      {!isPlaying && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', background: 'rgba(0,0,0,0.35)', transition: 'all 0.2s ease'
        }}>
          <div style={{
            background: 'rgba(244,63,94,0.92)', borderRadius: '50%', width: '58px', height: '58px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', color: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.7)', paddingLeft: '4px'
          }}>
            ▶
          </div>
        </div>
      )}

      {/* Floating Play/Pause Feedback Icon */}
      {showIcon && isPlaying && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none', background: 'rgba(0,0,0,0.25)', transition: 'all 0.3s ease'
        }}>
          <div style={{
            background: 'rgba(0,0,0,0.7)', borderRadius: '50%', width: '52px', height: '52px',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#fff'
          }}>
            ▶
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
            background: 'rgba(0,0,0,0.75)', border: '1px solid rgba(255,255,255,0.2)',
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
              background: 'rgba(244,63,94,0.9)', border: 'none', color: '#fff',
              borderRadius: '6px', padding: '0.25rem 0.55rem', fontSize: '0.72rem',
              fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
            }}
          >
            ✏️ Настройки
          </button>
        )}
      </div>

      {/* Bottom Interactive Controls Bar */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 25,
          background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.5) 70%, transparent 100%)',
          padding: '0.4rem 0.5rem 0.35rem 0.5rem', display: 'flex', flexDirection: 'column', gap: '0.25rem'
        }}
      >
        {/* Draggable Progress Bar Track */}
        <div
          ref={progressTrackRef}
          onMouseDown={handleStartSeek}
          onTouchStart={handleStartSeek}
          style={{
            position: 'relative', width: '100%', height: '18px', display: 'flex',
            alignItems: 'center', cursor: 'pointer', padding: '4px 0'
          }}
          title="Перемотка видео (нажмите или тяните)"
        >
          <div style={{
            position: 'relative', width: '100%', height: isSeeking ? '8px' : '5px',
            background: 'rgba(255,255,255,0.25)', borderRadius: '4px', overflow: 'hidden',
            transition: 'height 0.15s ease'
          }}>
            <div style={{
              width: `${progress}%`, height: '100%',
              background: 'linear-gradient(90deg, #f43f5e, #ec4899)',
              boxShadow: '0 0 8px #f43f5e'
            }} />
          </div>
          {/* Glowing Draggable Thumb */}
          <div style={{
            position: 'absolute', left: `calc(${progress}% - 6px)`, width: '12px', height: '12px',
            borderRadius: '50%', background: '#fff', boxShadow: '0 0 6px #f43f5e, 0 2px 4px rgba(0,0,0,0.8)',
            border: '2px solid #f43f5e', transform: isSeeking ? 'scale(1.3)' : 'scale(1)',
            transition: 'transform 0.1s ease', pointerEvents: 'none'
          }} />
        </div>

        {/* Playback Buttons & Time Display */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.3rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
            <button
              type="button"
              onClick={togglePlay}
              style={{
                background: '#27272a', border: '1px solid #3f3f46', color: '#fff',
                borderRadius: '5px', width: '26px', height: '24px', fontSize: '0.72rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 700
              }}
              title={isPlaying ? 'Пауза' : 'Воспроизвести'}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <button
              type="button"
              onClick={(e) => skipTime(-5, e)}
              style={{
                background: '#1e293b', border: '1px solid #334155', color: '#38bdf8',
                borderRadius: '5px', padding: '0.15rem 0.4rem', fontSize: '0.68rem',
                cursor: 'pointer', fontWeight: 700
              }}
              title="Перемотать на 5 сек назад"
            >
              ⏪ -5с
            </button>
            <button
              type="button"
              onClick={(e) => skipTime(5, e)}
              style={{
                background: '#1e293b', border: '1px solid #334155', color: '#38bdf8',
                borderRadius: '5px', padding: '0.15rem 0.4rem', fontSize: '0.68rem',
                cursor: 'pointer', fontWeight: 700
              }}
              title="Перемотать на 5 сек вперёд"
            >
              ⏩ +5с
            </button>
          </div>

          <span style={{ fontSize: '0.68rem', color: '#cbd5e1', fontWeight: 600, fontFamily: 'monospace' }}>
            {formatSecs(currentTime)} / {formatSecs(duration)}
          </span>
        </div>
      </div>
    </div>
  )
}
