export default function PackageThumbnailSection({
  actualPhotoCount,
  currentThumbnail,
  onGenerateAiThumbnail,
  onOpenSettingsModal,
  onOpenLightbox,
  onSaveAsNative,
}) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <h3 style={{ fontSize: '0.95rem', color: '#ec4899', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        🖼️ Обложка видео 16:9 (thumbnail.jpg):
      </h3>

      {actualPhotoCount > 0 ? (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <button
              className="copy-btn"
              style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', fontWeight: 700 }}
              onClick={onGenerateAiThumbnail}
              title="Создать единое кинематографичное 16:9 AI-изображение (Google Gemini)"
            >
              ✨ Создать Gemini AI 16:9 Обложку
            </button>

            {currentThumbnail && (
              <button
                className="copy-btn"
                style={{ background: '#3b82f6', fontWeight: 600 }}
                onClick={onOpenSettingsModal}
                title="Изменить шрифт, размер, цвет, контур, тень или сгенерировать заголовок в стиле Голобуцкого"
              >
                ⚙️ Настроить шрифт и текст
              </button>
            )}
          </div>

          {currentThumbnail ? (
            <div style={{ position: 'relative', width: '100%', maxWidth: '520px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #ec4899', background: '#000', boxShadow: '0 4px 16px rgba(236,72,153,0.2)' }}>
              <img
                src={currentThumbnail}
                alt="Current YouTube Thumbnail"
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                onClick={onOpenLightbox}
                title="Нажмите для увеличения"
              />
              <div style={{ padding: '0.45rem 0.75rem', background: '#18181b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 600 }}>
                  ✨ 16:9 YouTube Widescreen
                </span>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    className="copy-btn"
                    style={{ background: '#27272a', fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                    onClick={onOpenLightbox}
                  >
                    🔍 Увеличить
                  </button>
                  <button
                    className="copy-btn"
                    style={{ background: '#10b981', fontSize: '0.75rem', padding: '0.2rem 0.5rem', fontWeight: 700 }}
                    onClick={onSaveAsNative}
                  >
                    💾 Сохранить как...
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed #3f3f46', fontSize: '0.85rem', color: '#9ca3af' }}>
              ℹ️ Нажмите «✨ Создать Gemini AI 16:9 Обложку» или выберите любое фото ниже, чтобы назначить обложку.
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px dashed #3f3f46', fontSize: '0.85rem', color: '#9ca3af' }}>
          ℹ️ Для создания обложки сначала скачайте фото в секции 2.
        </div>
      )}
    </div>
  )
}
