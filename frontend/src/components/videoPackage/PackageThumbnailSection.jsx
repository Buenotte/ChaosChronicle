export default function PackageThumbnailSection({
  actualPhotoCount,
  currentThumbnail,
  photoUrls = [],
  folderName,
  headlineText = '',
  onGenerateAiThumbnail,
  onSelectBgPhoto,
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
              ✨ Gemini AI 16:9 Обложка
            </button>

            {currentThumbnail && (
              <button
                className="copy-btn"
                style={{ background: '#3b82f6', fontWeight: 600 }}
                onClick={onOpenSettingsModal}
                title="Изменить шрифт, размер, цвет, контур, тень"
              >
                ⚙️ Настроить шрифт и текст
              </button>
            )}
          </div>

          {photoUrls && photoUrls.length > 0 && (
            <div style={{ marginBottom: '0.65rem', background: '#18181b', padding: '0.55rem 0.65rem', borderRadius: '8px', border: '1px solid #27272a' }}>
              <div style={{ fontSize: '0.78rem', color: '#93c5fd', fontWeight: 700, marginBottom: '0.35rem' }}>
                📸 Выберите фото из пакета для обложки ({photoUrls.length}):
              </div>
              <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {photoUrls.map((p, idx) => {
                  const pUrl = p.startsWith('/news-static/') ? p : `/news-static/${folderName}/${p}`
                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectBgPhoto && onSelectBgPhoto(p)}
                      title={`Сделать фото #${idx + 1} фоном обложки`}
                      style={{
                        position: 'relative',
                        flexShrink: 0,
                        width: '80px',
                        height: '48px',
                        borderRadius: '6px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: '1px solid #3f3f46',
                      }}
                    >
                      <img src={pUrl} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {currentThumbnail ? (
            <div style={{ position: 'relative', width: '100%', maxWidth: '640px', borderRadius: '10px', overflow: 'hidden', border: '2px solid #ec4899', background: '#000', boxShadow: '0 4px 16px rgba(236,72,153,0.2)' }}>
              <img
                src={currentThumbnail}
                alt="Current YouTube Thumbnail"
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block', cursor: 'pointer' }}
                onClick={onOpenLightbox}
                title="Нажмите для увеличения"
              />
              <div style={{ padding: '0.45rem 0.75rem', background: '#18181b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', maxWidth: '340px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#f472b6', fontWeight: 700, flexShrink: 0 }}>
                    🏷️ Заголовок:
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#e2e8f0', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={headlineText}>
                    {headlineText || 'Без заголовка'}
                  </span>
                </div>
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
              ℹ️ Нажмите «✨ Gemini AI 16:9 Обложка» или выберите фото выше, чтобы назначить обложку.
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
