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
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="copy-btn"
            style={{ background: '#3b82f6', textDecoration: 'none' }}
          >
            🔍 Открыть оригинал в новой вкладке
          </a>
          <button className="copy-btn" onClick={onClose} style={{ background: '#ef4444' }}>✕ Закрыть окно</button>
        </div>
      </div>
    </div>
  )
}
