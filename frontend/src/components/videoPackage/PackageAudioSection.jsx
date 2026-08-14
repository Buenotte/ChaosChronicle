export const VOICES = [
  { id: 'nikolay', name: 'Николай (Строгий, новостной / Рекомендуется)', lang: 'ru-RU' },
  { id: 'dmitry', name: 'Дмитрий (Глубокий мужской)', lang: 'ru-RU' },
  { id: 'svetlana', name: 'Светлана (Женский, четкий)', lang: 'ru-RU' },
  { id: 'ostap', name: 'Остап (Украинский мужской)', lang: 'uk-UA' },
  { id: 'polina', name: 'Полина (Украинский женский)', lang: 'uk-UA' },
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
        3. Аудио-озвучка (Edge TTS):
      </h3>

      {audioState.hasAudio ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <audio controls src={audioState.audioUrl} style={{ width: '100%', height: '40px' }} />
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="copy-btn"
              style={{ background: '#f59e0b' }}
              onClick={onOpenAudioModal}
            >
              🎙️ Открыть плеер озвучки
            </button>
            <button
              className="copy-btn"
              style={{ background: '#3f3f46' }}
              onClick={onGenerateAudio}
              disabled={generatingAudio}
            >
              {generatingAudio ? '⏳ Перегенерация...' : '🔄 Сгенерировать заново'}
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedVoice}
            onChange={e => setSelectedVoice(e.target.value)}
            style={{
              background: '#181c27',
              border: '1px solid #1e2436',
              borderRadius: '8px',
              color: '#e8eaf0',
              padding: '0.55rem',
              fontSize: '0.82rem',
            }}
          >
            {VOICES.map(v => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          <button
            className="copy-btn"
            style={{ background: '#f59e0b' }}
            onClick={onGenerateAudio}
            disabled={generatingAudio || !hasTxt}
          >
            {generatingAudio ? '⏳ Озвучивание текста...' : '🎙️ Сгенерировать audio.mp3'}
          </button>
        </div>
      )}
    </div>
  )
}
