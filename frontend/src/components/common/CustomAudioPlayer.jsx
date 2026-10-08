import { useState, useRef, useEffect } from 'react'

export default function CustomAudioPlayer({ src, title = '' }) {
  const audioRef = useRef(null)
  const progressTrackRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isSeeking, setIsSeeking] = useState(false)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      audioRef.current.volume = volume
      setIsPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      if (src) {
        audioRef.current.src = src
        audioRef.current.load()
      }
    }
  }, [src])

  const togglePlay = () => {
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      audioRef.current.volume = volume
      const playPromise = audioRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.error('Audio play error:', err)
            setIsPlaying(false)
          })
      }
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const handleTimeUpdate = () => {
    if (!audioRef.current || isSeeking) return
    setCurrentTime(audioRef.current.currentTime || 0)
    if (audioRef.current.duration && !isNaN(audioRef.current.duration) && isFinite(audioRef.current.duration)) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const dur = audioRef.current.duration
      if (dur && !isNaN(dur) && isFinite(dur)) {
        setDuration(dur)
      }
    }
  }

  const updateSeek = (clientX) => {
    if (!audioRef.current || !progressTrackRef.current) return
    const rect = progressTrackRef.current.getBoundingClientRect()
    const pos = Math.max(0, Math.min((clientX - rect.left) / rect.width, 1))
    const dur = audioRef.current.duration || duration || 1
    const newTime = pos * dur
    audioRef.current.currentTime = newTime
    setCurrentTime(newTime)
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

  const skipSeconds = (seconds) => {
    if (!audioRef.current) return
    const dur = audioRef.current.duration || duration || 1
    const target = Math.max(0, Math.min((audioRef.current.currentTime || 0) + seconds, dur))
    audioRef.current.currentTime = target
    setCurrentTime(target)
  }

  const handleSpeedChange = () => {
    const rates = [1, 1.25, 1.5, 1.75, 2]
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length
    const nextRate = rates[nextIdx]
    setPlaybackRate(nextRate)
    if (audioRef.current) audioRef.current.playbackRate = nextRate
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds) || !isFinite(seconds)) return '0:00'
    const totalSecs = Math.floor(seconds)
    const mins = Math.floor(totalSecs / 60)
    const secs = totalSecs % 60
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  const progressPercent = duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)',
        border: '1.5px solid #3b82f6',
        borderRadius: '12px',
        padding: '0.85rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.45)',
        userSelect: 'none',
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onDurationChange={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false)
          setCurrentTime(0)
        }}
      />

      {/* Obere Leiste: Titel & Zeitangaben */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span>🎙️</span> {title || 'Аудио-файл (audio.mp3)'}
        </span>
        <span style={{ fontSize: '0.78rem', color: '#93c5fd', fontFamily: 'monospace', fontWeight: 600 }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
      </div>

      {/* Scrubbing Timeline / Drag & Drop Fortschrittsbalken */}
      <div
        ref={progressTrackRef}
        onMouseDown={handleStartSeek}
        onTouchStart={handleStartSeek}
        style={{
          width: '100%',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          cursor: 'pointer',
          position: 'relative',
        }}
        title="Перемотка аудио (кликните или перетащите ползунок мышкой)"
      >
        <div
          style={{
            width: '100%',
            height: '8px',
            background: '#1f2937',
            borderRadius: '999px',
            position: 'relative',
            overflow: 'visible',
            border: '1px solid #374151',
          }}
        >
          {/* Gespielter Fortschritt */}
          <div
            style={{
              width: `${progressPercent}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
              borderRadius: '999px',
              transition: isSeeking ? 'none' : 'width 0.1s linear',
            }}
          />

          {/* Griffiger Regler / Thumb */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: `${progressPercent}%`,
              transform: 'translate(-50%, -50%)',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: '#ffffff',
              border: '3px solid #2563eb',
              boxShadow: '0 0 10px rgba(59, 130, 246, 0.8)',
              pointerEvents: 'none',
              transition: isSeeking ? 'none' : 'left 0.1s linear',
            }}
          />
        </div>
      </div>

      {/* Steuerelemente: Buttons für Play/Pause, -10s, +10s, Speed, Lautstärke */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {/* 10 Sekunden zurück */}
          <button
            type="button"
            onClick={() => skipSeconds(-10)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
              borderRadius: '6px',
              padding: '0.3rem 0.6rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
            title="Перемотать назад на 10 секунд"
          >
            ⏪ -10с
          </button>

          {/* Play / Pause Haupttaste */}
          <button
            type="button"
            onClick={togglePlay}
            style={{
              background: isPlaying ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
              border: 'none',
              color: '#ffffff',
              borderRadius: '8px',
              padding: '0.38rem 0.95rem',
              fontSize: '0.86rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              boxShadow: isPlaying ? '0 2px 10px rgba(239, 68, 68, 0.4)' : '0 2px 10px rgba(59, 130, 246, 0.4)',
            }}
          >
            {isPlaying ? '⏸️ Пауза' : '▶️ Слушать'}
          </button>

          {/* 10 Sekunden vor */}
          <button
            type="button"
            onClick={() => skipSeconds(10)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#e2e8f0',
              borderRadius: '6px',
              padding: '0.3rem 0.6rem',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.2rem',
            }}
            title="Перемотать вперед на 10 секунд"
          >
            +10с ⏩
          </button>
        </div>

        {/* Rechte Seite: Geschwindigkeit & Lautstärke */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <button
            type="button"
            onClick={handleSpeedChange}
            style={{
              background: '#0f172a',
              border: '1px solid #3b82f6',
              color: '#38bdf8',
              borderRadius: '6px',
              padding: '0.25rem 0.55rem',
              fontSize: '0.74rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
            title="Изменить скорость воспроизведения"
          >
            ⚡ {playbackRate}x
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                setVolume(val)
                if (audioRef.current) audioRef.current.volume = val
              }}
              style={{
                width: '65px',
                accentColor: '#3b82f6',
                cursor: 'pointer',
                height: '4px',
              }}
              title={`Громкость: ${Math.round(volume * 100)}%`}
            />
          </div>
        </div>
      </div>

      {/* Standard-Browser-Audioplayer (100% kompatibel mit allen Browsern und System-Treibern) */}
      <div style={{ marginTop: '0.35rem', paddingTop: '0.45rem', borderTop: '1px solid #1e293b' }}>
        <audio
          controls
          src={src}
          style={{ width: '100%', height: '36px', borderRadius: '6px' }}
        >
          Ваш браузер не поддерживает элемент audio.
        </audio>
      </div>
    </div>
  )
}
