export default function BackgroundPhotoSelector({
  photoList = [],
  folderName,
  selectedBgPhoto,
  onSelectPhoto,
  onResetToDefault,
}) {
  if (!photoList || photoList.length === 0) return null

  return (
    <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <label style={{ fontSize: '0.82rem', color: '#60a5fa', fontWeight: 700 }}>
          🖼️ Выберите фото из пакета в качестве фона обложки ({photoList.length} фото):
        </label>
        {selectedBgPhoto && (
          <button
            type="button"
            onClick={onResetToDefault}
            style={{ background: 'none', border: 'none', color: '#f472b6', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Вернуть текущий фон обложки
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.35rem' }}>
        {photoList.map((p, idx) => {
          const pUrl = p.startsWith('/news-static/') ? p : `/news-static/${folderName}/${p}`
          const isSelected = selectedBgPhoto === p || selectedBgPhoto === pUrl
          return (
            <div
              key={idx}
              onClick={() => onSelectPhoto(p)}
              style={{
                position: 'relative',
                flexShrink: 0,
                width: '88px',
                height: '52px',
                borderRadius: '6px',
                overflow: 'hidden',
                cursor: 'pointer',
                border: isSelected ? '2px solid #ec4899' : '1px solid #3f3f46',
                transform: isSelected ? 'scale(1.04)' : 'none',
                transition: 'transform 0.15s ease',
              }}
            >
              <img src={pUrl} alt={`Photo ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              {isSelected && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(236,72,153,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.75rem', fontWeight: 800 }}>
                  ✓ ВЫБРАНО
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
