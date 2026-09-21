export const ALL_VOICES = [
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

export default function VoiceSelector({
  selectedVoice,
  onVoiceChange,
  voices = ALL_VOICES,
  label = 'Голос:',
  disabled = false,
  style = {},
  selectStyle = {},
}) {
  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', ...style }}>
      {label && <label style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>{label}</label>}
      <select
        value={selectedVoice}
        onChange={e => onVoiceChange && onVoiceChange(e.target.value)}
        disabled={disabled}
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
          outline: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          ...selectStyle,
        }}
      >
        {voices.map(v => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </select>
    </div>
  )
}
