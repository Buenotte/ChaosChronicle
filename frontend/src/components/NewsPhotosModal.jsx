import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import ImageLightboxModal from './ImageLightboxModal'

export default function NewsPhotosModal({ newsTopic, photos, loading, onClose, onSaved, onReload }) {
  if (!newsTopic) return null

  const [items, setItems] = useState([])
  const [savingPhotos, setSavingPhotos] = useState(false)
  const [savedCount, setSavedCount] = useState(null)
  const [activeThumbnailUrl, setActiveThumbnailUrl] = useState(newsTopic?.thumbnailUrl || null)
  const [lightboxUrl, setLightboxUrl] = useState(null)

  useEffect(() => {
    setItems(photos || [])
  }, [photos])

  const handleSetThumbnail = async (imgSrc) => {
    try {
      const res = await fetch('/api/set-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photoUrl: imgSrc,
          bundleDir: newsTopic?.bundleDir,
          folderName: newsTopic?.folderName,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setActiveThumbnailUrl(data.thumbnailUrl)
        toast.success('🖼️ Фото выбрано главной обложкой (thumbnail.jpg)!')
        if (onSaved) onSaved()
      } else {
        toast.error('Ошибка сохранения обложки: ' + (data.error || 'Неизвестная ошибка'))
      }
    } catch (err) {
      toast.error('Ошибка создания обложки', { description: err.message })
    }
  }

  const handleRemovePhoto = async (indexToRemove) => {
    const photoToRemove = items[indexToRemove]
    const imgSrc = typeof photoToRemove === 'string' ? photoToRemove : (photoToRemove?.url || '')

    if (imgSrc && imgSrc.startsWith('/news-static/')) {
      try {
        const res = await fetch('/api/delete-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            photoUrl: imgSrc,
            bundleDir: newsTopic?.bundleDir,
          }),
        })
        const data = await res.json()
        if (data.success && data.deleted) {
          toast.success('🗑️ Фото физически удалено с диска!')
        }
      } catch (err) {
        console.error('Fehler beim Löschen des Fotos:', err)
      }
    } else {
      toast.info('Фото удалено из списка')
    }

    setItems(prev => prev.filter((_, idx) => idx !== indexToRemove))
    if (onSaved) onSaved()
  }

  const handleSavePhotosToFolder = async () => {
    if (items.length === 0) return
    setSavingPhotos(true)
    const toastId = toast.loading(`💾 Скачивание ${items.length} фото в папку news/...`, {
      description: 'Сохранение оригинальных изображений в формате .jpg/.png...',
    })

    try {
      const res = await fetch('/api/save-news-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newsTopic.title,
          bundleDir: newsTopic.bundleDir,
          photos: items.map(p => (typeof p === 'string' ? p : p.url)),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения фото')

      setSavedCount(data.savedPhotosCount)
      if (onSaved) onSaved()

      toast.success(`📸 ${data.savedPhotosCount} фото успешно сохранены!`, {
        id: toastId,
        description: `Папка: news/${data.folderName}/photos/`,
        duration: 12000,
      })
    } catch (err) {
      toast.error('Ошибка сохранения фото', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setSavingPhotos(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <ImageLightboxModal
        imageUrl={lightboxUrl}
        title={newsTopic.title}
        onClose={() => setLightboxUrl(null)}
      />
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge">📸 Оригинальные фото к этой новости (100% Точность)</span>
            <h2 className="modal-title">{newsTopic.title}</h2>
            <div className="modal-stats">
              <span>📰 Все изображения из статьи и прямых репортажей</span>
              {items.length > 0 && <span>🖼️ Отобрано фото: {items.length}</span>}
              {savedCount !== null && <span className="saved-status-badge">🟢 {savedCount} фото в news/photos/</span>}
            </div>
          </div>
          <div className="modal-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {items.length > 0 && (
              <button
                className="save-bundle-btn"
                onClick={handleSavePhotosToFolder}
                disabled={savingPhotos}
              >
                {savingPhotos ? '⏳ Скачивание...' : `💾 Сохранить ${items.length} фото в news/`}
              </button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="empty-state">
              <p>⟳ Поиск фотографий из разных источников по теме новости...</p>
            </div>
          )}

          {!loading && items.length === 0 && (
            <div className="empty-state">
              <p>📷 Фотографий в списке нет.</p>
            </div>
          )}

          {!loading && items.length > 0 && (
            <div className="multi-source-photos-grid">
              {items.map((photo, i) => {
                const imgSrc = typeof photo === 'string' ? photo : (photo?.url || '')
                const titleText = photo?.articleTitle || photo?.source || `Фото #${i + 1}`
                const sourceText = photo?.source || (imgSrc.startsWith('/news-static/') ? 'Сохранено на диске' : 'Мировые СМИ')

                return (
                  <div key={i} className="photo-card-item">
                    <div className="photo-card-img-wrap" onClick={() => setLightboxUrl(imgSrc)} style={{ cursor: 'zoom-in' }} title="🔍 Нажмите, чтобы открыть фото во весь экран">
                      <img
                        src={imgSrc}
                        alt={titleText}
                        loading="lazy"
                      />
                      <span className="photo-source-badge" style={{ background: '#2563eb' }}>
                        📍 {sourceText}
                      </span>
                      <button
                        className="remove-photo-btn"
                        onClick={() => handleRemovePhoto(i)}
                        title="Удалить это фото из списка"
                      >
                        🗑️ Удалить
                      </button>
                    </div>
                    <p className="photo-card-title">{titleText}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
