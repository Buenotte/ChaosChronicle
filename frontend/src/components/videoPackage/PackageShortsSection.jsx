import { toast } from 'sonner'

export default function PackageShortsSection({
  shortState,
  generatingShort,
  audioState,
  actualPhotoCount,
  onOpenShortsEditor,
  onGenerateQuickShort,
}) {
  return (
    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #27272a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <h3 style={{ fontSize: '0.95rem', color: '#f43f5e', margin: 0, display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          📱 Вертикальный YouTube Short (9:16, 16 сек):
        </h3>
        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="copy-btn"
            disabled={!audioState?.hasAudio || actualPhotoCount === 0}
            onClick={onOpenShortsEditor}
            style={{
              background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '0.4rem 0.85rem',
              boxShadow: '0 2px 10px rgba(124, 58, 237, 0.25)',
            }}
          >
            🎨 Открыть Студию Shorts (Drag & Drop)
          </button>
          <button
            type="button"
            className="copy-btn"
            disabled={generatingShort || !audioState?.hasAudio || actualPhotoCount === 0}
            onClick={onGenerateQuickShort}
            style={{
              background: 'linear-gradient(135deg, #f43f5e, #ec4899)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.82rem',
              padding: '0.4rem 0.85rem',
              boxShadow: '0 2px 10px rgba(244, 63, 94, 0.25)',
            }}
          >
            {generatingShort ? '⏳ Монтаж Shorts (10 сек)...' : (shortState?.hasShort ? '🔄 Быстро пересоздать' : '⚡ Создать Short (9:16)')}
          </button>
        </div>
      </div>

      {/* Готовое видео Shorts (если уже смонтировано) */}
      {shortState?.hasShort ? (
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap', background: '#111827', padding: '0.85rem', borderRadius: '10px', border: '1px solid #1f2937' }}>
          <div style={{ width: '150px', height: '266px', borderRadius: '8px', overflow: 'hidden', background: '#000', border: '2px solid #f43f5e', flexShrink: 0, boxShadow: '0 4px 16px rgba(244, 63, 94, 0.2)' }}>
            <video
              key={shortState.shortUrl}
              src={shortState.shortUrl}
              controls
              playsInline
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#f3f4f6', fontWeight: 600 }}>
              ✨ Готовый 9:16 ролик для YouTube Shorts / TikTok / Reels (1080×1920)
            </div>
            <div style={{ fontSize: '0.78rem', color: '#9ca3af', lineHeight: 1.4 }}>
              📌 Включает взрывной 3-секундный хук, смену первых фото и заголовок с вашим шрифтом, позицией и фоном.
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: 'auto', flexWrap: 'wrap' }}>
              <a
                href={shortState.shortUrl}
                download="short.mp4"
                onClick={() => toast.success('💾 Видео short.mp4 сохранено в папку новости!')}
                className="copy-btn"
                style={{ background: '#10b981', color: '#fff', textDecoration: 'none', fontSize: '0.78rem', padding: '0.4rem 0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
              >
                💾 Сохранить short.mp4
              </a>
              <button
                type="button"
                className="copy-btn"
                onClick={onOpenShortsEditor}
                style={{ background: '#374151', color: '#fff', fontSize: '0.78rem', padding: '0.4rem 0.75rem' }}
              >
                ✏️ Изменить в Студии
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ padding: '0.75rem 0.9rem', background: !audioState?.hasAudio ? 'rgba(239, 68, 68, 0.08)' : 'rgba(255,255,255,0.02)', borderRadius: '8px', border: !audioState?.hasAudio ? '1px dashed #ef4444' : '1px dashed #3f3f46', fontSize: '0.82rem', color: !audioState?.hasAudio ? '#fca5a5' : '#9ca3af' }}>
          {!audioState?.hasAudio ? (
            <span>⚠️ <strong>Аудио-озвучка (audio.mp3) ещё не создана!</strong> Сначала сгенерируйте голос в разделе <strong>«3. Голосовая озвучка»</strong> выше, чтобы смонтировать Shorts.</span>
          ) : (
            <span>ℹ️ Нажмите <strong>«🎨 Открыть Студию Shorts»</strong> для настройки текста, шрифтов и фона, или <strong>«⚡ Создать Short»</strong> для быстрой сборки.</span>
          )}
        </div>
      )}
    </div>
  )
}
