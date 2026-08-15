import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import ImageLightboxModal from './ImageLightboxModal'

export default function NewsPhotosModal({ newsTopic, photos, loading: initialLoading, onClose, onSaved, onReload }) {
  if (!newsTopic) return null

  const [items, setItems] = useState([])
  const [searchQuery, setSearchQuery] = useState(newsTopic.title || '')
  const [searching, setSearching] = useState(false)
  const [savingPhotos, setSavingPhotos] = useState(false)
  const [savedCount, setSavedCount] = useState(null)
  const [lightboxUrl, setLightboxUrl] = useState(null)

  useEffect(() => {
    setItems(photos || [])
    if (newsTopic?.title) {
      setSearchQuery(newsTopic.title)
    }
  }, [photos, newsTopic?.title])

  const handleCustomSearch = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!searchQuery.trim()) {
      toast.error('Введите ключевые слова для поиска фото')
      return
    }

    setSearching(true)
    const toastId = toast.loading('🔎 Поиск фото по ключевым словам...', {
      description: searchQuery.slice(0, 50),
    })

    try {
      const params = new URLSearchParams({
        title: newsTopic.title || '',
        query: searchQuery.trim(),
        forceLive: 'true',
      })
      const res = await fetch(`/api/news-photos?${params}`)
      const data = await res.json()

      if (data.success) {
        setItems(data.photos || [])
        toast.success(`Найдено ${data.photos?.length || 0} фото!`, { id: toastId })
      } else {
        toast.error('Ошибка поиска фото: ' + (data.error || 'Ничего не найдено'), { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка запроса: ' + err.message, { id: toastId })
    } finally {
      setSearching(false)
    }
  }

  const handleRemovePhoto = async (e, indexToRemove) => {
    if (e && e.stopPropagation) e.stopPropagation()
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
            folderName: newsTopic?.folderName,
          }),
        })
        const data = await res.json()
        if (data.success && data.deleted) {
          toast.success('🗑️ Фото удалено с диска!')
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
          folderName: newsTopic.folderName || newsTopic.matchingPkg?.folderName,
          bundleDir: newsTopic.bundleDir || newsTopic.matchingPkg?.bundleDir,
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
        duration: 10000,
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

  const isLoading = initialLoading || searching

  return (
    <div className="modal-overlay" onClick={onClose}>
      <ImageLightboxModal
        imageUrl={lightboxUrl}
        title={newsTopic.title}
        onClose={() => setLightboxUrl(null)}
      />
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '960px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div>
            <span className="modal-badge" style={{ background: '#3b82f6', color: '#fff' }}>
              📸 Поиск и управление фотографиями к новости
            </span>
            <h2 className="modal-title" style={{ fontSize: '1.2rem', marginTop: '0.3rem' }}>
              {newsTopic.title}
            </h2>
            <div className="modal-stats" style={{ marginTop: '0.3rem' }}>
              {items.length > 0 && <span>🖼️ Всего в списке: {items.length} фото</span>}
              {savedCount !== null && <span className="saved-status-badge">🟢 {savedCount} сохранено в news/photos/</span>}
            </div>
          </div>
          <div className="modal-header-actions" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {items.length > 0 && (
              <button
                className="save-bundle-btn"
                onClick={handleSavePhotosToFolder}
                disabled={savingPhotos}
                style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 700 }}
              >
                {savingPhotos ? '⏳ Скачивание...' : `💾 Сохранить ${items.length} фото в news/`}
              </button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Панель настройки поисковых слов для точного поиска */}
        <form
          onSubmit={handleCustomSearch}
          style={{
            margin: '0.75rem 1.25rem 0',
            padding: '0.75rem 1rem',
            background: '#131b2e',
            borderRadius: '8px',
            border: '1px solid #1e3a8a',
            display: 'flex',
            gap: '0.6rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ fontSize: '0.84rem', fontWeight: 700, color: '#93c5fd', whiteSpace: 'nowrap' }}>
            🔍 Поисковые слова для фото:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Введите ключевые слова (например: Трамп Ормузский пролив корабль нефть)..."
            style={{
              flex: 1,
              minWidth: '220px',
              background: '#0a101f',
              border: '1px solid #2563eb',
              color: '#fff',
              padding: '0.45rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.88rem',
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="copy-btn"
            style={{ background: '#2563eb', fontWeight: 700, padding: '0.45rem 0.9rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            {searching ? '⏳ Поиск...' : '🔎 Найти точные фото'}
          </button>
        </form>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {isLoading && (
            <div className="empty-state">
              <p>⟳ Поиск репортажных фотографий по запросу «{searchQuery}»...</p>
            </div>
          )}

          {!isLoading && items.length === 0 && (
            <div className="empty-state">
              <p>📷 Фотографий не найдено. Попробуйте изменить ключевые слова в строке выше и нажать «Найти точные фото».</p>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="multi-source-photos-grid">
              {items.map((photo, i) => {
                const imgSrc = typeof photo === 'string' ? photo : (photo?.url || '')
                const titleText = photo?.articleTitle || photo?.source || `Фото #${i + 1}`
                const sourceText = photo?.source || (imgSrc.startsWith('/news-static/') ? 'Сохранено на диске' : 'Мировые СМИ')

                return (
                  <div key={i} className="photo-card-item">
                    <div
                      className="photo-card-img-wrap"
                      onClick={() => setLightboxUrl(imgSrc)}
                      style={{ cursor: 'zoom-in' }}
                      title="🔍 Нажмите, чтобы открыть фото во весь экран"
                    >
                      <img src={imgSrc} alt={titleText} loading="lazy" />
                      <span className="photo-source-badge" style={{ background: '#2563eb' }}>
                        📍 {sourceText}
                      </span>
                      <button
                        className="remove-photo-btn"
                        onClick={(e) => handleRemovePhoto(e, i)}
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
