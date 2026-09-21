import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import VoiceSelector, { ALL_VOICES } from './common/VoiceSelector'
import ModalHeader from './common/ModalHeader'

export default function NewsAudioModal({ pkg, onClose, onRefresh }) {
  if (!pkg) return null

  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [selectedVoice, setSelectedVoice] = useState('el_adam')
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
    if (e.target.closest('.modal-close') || e.target.closest('button') || e.target.closest('audio') || e.target.closest('select')) return
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
    const txt = (pkg.scriptTxt || pkg.scriptMd || '').trim()
    if (!txt && !pkg.hasScriptTxt) {
      toast.error('❌ Текст сценария отсутствует. Пожалуйста, сначала создайте сценарий новости!')
      return
    }
    setGeneratingAudio(true)
    const voiceObj = ALL_VOICES.find(v => v.id === selectedVoice) || ALL_VOICES[0]
    const toastId = toast.loading(`🎙️ Синтез речи (${voiceObj.name})...`, {
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

      if (!res.ok) {
        let errMsg = `Ошибка сервера (${res.status})`
        try {
          const errData = await res.json()
          if (errData?.error) errMsg = errData.error
        } catch {
          const textErr = await res.text().catch(() => '')
          if (textErr) errMsg = textErr.slice(0, 100)
        }
        throw new Error(errMsg)
      }

      const data = await res.json()
      if (!data?.success) throw new Error(data?.error || 'Не удалось создать аудио')

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
        duration: 8000,
      })
    } catch (err) {
      toast.error('❌ Ошибка генерации аудио', {
        id: toastId,
        description: err.message || 'Сервер бэкенда недоступен (порт 3001)',
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
        <ModalHeader
          title={pkg.title}
          badge="🎙️ Аудио-сопровождение (🖐️ Перетащите окно)"
          onClose={onClose}
          onMouseDown={handleMouseDown}
          isDragging={isDragging}
        />

        <div className="modal-body">
          <VoiceSelector
            selectedVoice={selectedVoice}
            onChange={setSelectedVoice}
            label="🗣️ Выберите голос озвучки:"
            disabled={generatingAudio}
          />

          {hasAudioFile && computedAudioUrl ? (
            <div className="audio-player-box" style={{ padding: '1.2rem' }}>
              <div className="audio-player-title" style={{ fontSize: '0.92rem', marginBottom: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>
                🎙️ Текущий аудио-файл (audio.mp3):
              </div>
              <audio controls src={computedAudioUrl} className="audio-element">
                Ваш браузер не поддерживает элемент audio.
              </audio>
              <div style={{ marginTop: '0.85rem', textAlign: 'right' }}>
                <button
                  className="audio-gen-btn"
                  onClick={handleGenerateAudioInModal}
                  disabled={generatingAudio}
                  style={{ background: selectedVoice.startsWith('el_') ? '#8b5cf6' : '#f59e0b', fontSize: '0.85rem', padding: '0.45rem 0.9rem', fontWeight: 700 }}
                >
                  {generatingAudio ? '⏳ Синтез речи...' : `🔄 Озвучить через ${selectedVoice.startsWith('el_') ? 'ElevenLabs AI' : 'Edge-TTS'}`}
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
                  style={{ background: selectedVoice.startsWith('el_') ? '#8b5cf6' : '#f59e0b', whiteSpace: 'nowrap', fontWeight: 700 }}
                >
                  {generatingAudio ? '⏳ Создание audio.mp3...' : `🎙️ Создать (${selectedVoice.startsWith('el_') ? 'ElevenLabs' : 'Edge-TTS'})`}
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
