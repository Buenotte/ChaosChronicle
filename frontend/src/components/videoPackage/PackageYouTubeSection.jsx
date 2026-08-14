export default function PackageYouTubeSection({ onOpenYouTubeModal }) {
  return (
    <div style={{ marginTop: '0.75rem', paddingTop: '1rem', borderTop: '1px solid #1e2436' }}>
      <button
        type="button"
        className="copy-btn"
        style={{
          width: '100%',
          background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
          color: '#fff',
          fontWeight: 700,
          fontSize: '0.92rem',
          padding: '0.7rem 1rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          borderRadius: '8px',
          border: 'none',
          cursor: 'pointer',
        }}
        onClick={onOpenYouTubeModal}
      >
        📺 5. YouTube инфо (Заголовок, Описание, Теги & Хэштеги)
      </button>
    </div>
  )
}
