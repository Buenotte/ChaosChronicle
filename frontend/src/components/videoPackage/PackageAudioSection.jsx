import VoiceSelector, { ALL_VOICES as VOICES } from '../common/VoiceSelector'
import CustomAudioPlayer from '../common/CustomAudioPlayer'

export { VOICES }

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
          <VoiceSelector
            selectedVoice={selectedVoice}
            onVoiceChange={setSelectedVoice}
            style={{ flex: 1, minWidth: '260px' }}
          />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <CustomAudioPlayer src={audioState.audioUrl} title="Готовый дикторский голос (audio.mp3)" />
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button
                className="copy-btn"
                style={{ background: '#3f3f46', fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                onClick={onOpenAudioModal}
              >
                🎙️ Открыть студию озвучки
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
