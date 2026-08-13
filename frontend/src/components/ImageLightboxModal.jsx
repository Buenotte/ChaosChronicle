export default function ImageLightboxModal({ imageUrl, title, onClose }) {
  if (!imageUrl) return null
  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 10000, background: 'rgba(0, 0, 0, 0.92)' }}>
      <div style={{ position: 'relative', maxWidth: '92vw', maxHeight: '92vh', margin: 'auto', textAlign: 'center' }} onClick={e => e.stopPropagation()}>
        <img
          src={imageUrl}
          alt={title || 'Фото в полном экране'}
          style={{ maxWidth: '90vw', maxHeight: '82vh', borderRadius: '12px', objectFit: 'contain', border: '2px solid rgba(255,255,255,0.2)', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
        />
        <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'center', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: '#e5e7eb', fontSize: '0.9rem', fontWeight: 600 }}>{title}</span>
          <button
            className="copy-btn"
            style={{ background: '#10b981' }}
            onClick={async () => {
              const suggestedName = (title || 'image').replace(/[^a-zA-Z0-9а-яА-ЯёЁ_-]/g, '_') + '.jpg';
              try {
                const res = await fetch(imageUrl);
                const blob = await res.blob();
                if ('showSaveFilePicker' in window) {
                  const handle = await window.showSaveFilePicker({
                    suggestedName,
                    types: [{
                      description: 'JPEG Image (*.jpg)',
                      accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
                    }],
                  });
                  const writable = await handle.createWritable();
                  await writable.write(blob);
                  await writable.close();
                } else {
                  const blobUrl = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = blobUrl;
                  a.download = suggestedName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  window.URL.revokeObjectURL(blobUrl);
                }
              } catch (err) {
                if (err.name !== 'AbortError') {
                  window.open(imageUrl, '_blank');
                }
              }
            }}
          >
            💾 Сохранить как...
          </button>
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="copy-btn"
            style={{ background: '#3b82f6', textDecoration: 'none' }}
          >
            🔍 В новой вкладке
          </a>
          <button className="copy-btn" onClick={onClose} style={{ background: '#ef4444' }}>✕ Закрыть</button>
        </div>
      </div>
    </div>
  )
}
