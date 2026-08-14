export const VOICES = [
  { id: 'el_adam', name: '⭐ Adam (ElevenLabs - Авторитетный)', provider: 'elevenlabs' },
  { id: 'el_antoni', name: '⭐ Antoni (ElevenLabs - Журналист)', provider: 'elevenlabs' },
  { id: 'el_arnold', name: '⭐ Arnold (ElevenLabs - Сатирический)', provider: 'elevenlabs' },
  { id: 'el_george', name: '⭐ George (ElevenLabs - Рассказчик)', provider: 'elevenlabs' },
  { id: 'el_rachel', name: '⭐ Rachel (ElevenLabs - Женский)', provider: 'elevenlabs' },
  { id: 'el_bella', name: '⭐ Bella (ElevenLabs - Эмоциональный)', provider: 'elevenlabs' },
  { id: 'nikolay', name: 'Николай (Edge TTS - Бесплатно)', lang: 'ru-RU', provider: 'edge' },
  { id: 'dmitry', name: 'Дмитрий (Edge TTS - Глубокий)', lang: 'ru-RU', provider: 'edge' },
  { id: 'svetlana', name: 'Светлана (Edge TTS - Женский)', lang: 'ru-RU', provider: 'edge' },
  { id: 'ostap', name: 'Остап (Edge TTS - Украинский)', lang: 'uk-UA', provider: 'edge' },
  { id: 'polina', name: 'Полина (Edge TTS - Украинский)', lang: 'uk-UA', provider: 'edge' },
]

export default function PackageAudioSection({
  hasTxt,
  audioState,
  selectedVoice,
  setSelectedVoice,
  generatingAudio,
  onGenerateAudio,
  onOpenAudioModal,
}) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ fontSize: '0.95rem', color: '#9ca3af', marginBottom: '0.5rem' }}>
        3. Аудио-озвучка (ElevenLabs AI / Edge TTS):
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {/* Выбор диктора / голоса (ВСЕГДА ВИДЕН) */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>Голос:</label>
          <select
            value={selectedVoice}
            onChange={e => setSelectedVoice(e.target.value)}
            style={{
              background: '#181c27',
              border: '1px solid #3b82f6',
              borderRadius: '8px',
              color: '#e8eaf0',
              padding: '0.5rem 0.65rem',
              fontSize: '0.84rem',
              fontWeight: 600,
              minWidth: '260px',
              flex: 1,
            }}
          >
            {VOICES.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <button
            className="copy-btn"
            style={{ background: selectedVoice?.startsWith('el_') ? '#8b5cf6' : '#f59e0b', fontWeight: 700, padding: '0.5rem 0.85rem' }}
            onClick={onGenerateAudio}
            disabled={generatingAudio || !hasTxt}
          >
            {generatingAudio ? '⏳ Озвучивание...' : (audioState.hasAudio ? '🔄 Озвучить заново' : '🎙️ Сгенерировать audio.mp3')}
          </button>
        </div>

        {/* Плеер при наличии готового аудио */}
        {audioState.hasAudio && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: '#18181b', padding: '0.65rem', borderRadius: '8px', border: '1px solid #27272a' }}>
            <audio controls src={audioState.audioUrl} style={{ width: '100%', height: '36px' }} />
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                className="copy-btn"
                style={{ background: '#3f3f46', fontSize: '0.8rem', padding: '0.3rem 0.65rem' }}
                onClick={onOpenAudioModal}
              >
                🎙️ Открыть плеер озвучки
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
