import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import ImageLightboxModal from './ImageLightboxModal'

export default function NewsPhotosModal({ newsTopic, photos, loading: initialLoading, onClose, onSaved, onReload }) {
  if (!newsTopic) return null

  const [items, setItems] = useState([])
  const [searchQuery, setSearchQuery] = useState(newsTopic.title || '')
  const [searching, setSearching] = useState(false)
  const [savingPhotos, setSavingPhotos] = useState(false)
  const [savingSingleIndex, setSavingSingleIndex] = useState(null)
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

  const handleSaveSinglePhoto = async (e, index) => {
    if (e && e.stopPropagation) e.stopPropagation()
    const photoToSave = items[index]
    const imgSrc = typeof photoToSave === 'string' ? photoToSave : (photoToSave?.url || '')
    if (!imgSrc) return

    if (imgSrc.startsWith('/news-static/')) {
      toast.info('Это фото уже сохранено на диске')
      return
    }

    setSavingSingleIndex(index)
    const toastId = toast.loading('💾 Скачивание фото в папку news/...', {
      description: 'Сохранение оригинального файла...',
    })

    try {
      const res = await fetch('/api/save-single-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newsTopic.title,
          folderName: newsTopic.folderName || newsTopic.matchingPkg?.folderName,
          bundleDir: newsTopic.bundleDir || newsTopic.matchingPkg?.bundleDir,
          photoUrl: imgSrc,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка скачивания фото')

      // Обновляем фото в списке как локально сохраненное
      setItems(prev => prev.map((p, idx) => {
        if (idx === index) {
          return {
            ...(typeof p === 'object' ? p : {}),
            url: data.localUrl,
            source: 'Сохранено на диске',
            isSavedLocal: true,
          }
        }
        return p
      }))

      setSavedCount(data.totalPhotos)
      if (onSaved) onSaved()

      toast.success(`📸 Фото сохранено: ${data.filename}!`, {
        id: toastId,
        description: `Папка: news/${data.folderName}/photos/`,
      })
    } catch (err) {
      toast.error('Ошибка сохранения фото: ' + err.message, { id: toastId })
    } finally {
      setSavingSingleIndex(null)
    }
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
            <span className="modal-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              📸 Поиск и управление фото
            </span>
            <h2 className="modal-title" style={{ fontSize: '1.15rem', marginTop: '0.3rem' }}>
              {newsTopic.title}
            </h2>
            <div className="modal-stats" style={{ marginTop: '0.3rem' }}>
              {items.length > 0 && <span>🖼️ В списке: {items.length} фото</span>}
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
                {savingPhotos ? '⏳ Скачивание...' : `💾 Сохранить ${items.length} фото`}
              </button>
            )}
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Панель настройки поисковых слов */}
        <form
          onSubmit={handleCustomSearch}
          style={{
            margin: '0.75rem 1.25rem 0',
            padding: '0.65rem 0.9rem',
            background: '#0f172a',
            borderRadius: '8px',
            border: '1px solid #1e293b',
            display: 'flex',
            gap: '0.6rem',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>
            🔍 Ключевые слова:
          </label>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Ключевые слова для точного поиска..."
            style={{
              flex: 1,
              minWidth: '220px',
              background: '#020617',
              border: '1px solid #334155',
              color: '#f8fafc',
              padding: '0.42rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
            }}
          />
          <button
            type="submit"
            disabled={isLoading}
            className="copy-btn"
            style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', fontWeight: 700, padding: '0.42rem 0.85rem', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
          >
            {searching ? '⏳ Поиск...' : '🔎 Искать фото'}
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
              <p>📷 Фотографий не найдено. Попробуйте изменить ключевые слова выше и нажать «Искать фото».</p>
            </div>
          )}

          {!isLoading && items.length > 0 && (
            <div className="multi-source-photos-grid">
              {items.map((photo, i) => {
                const imgSrc = typeof photo === 'string' ? photo : (photo?.url || '')
                const isLocal = imgSrc.startsWith('/news-static/') || photo?.isSavedLocal
                const titleText = photo?.articleTitle || photo?.source || `Фото #${i + 1}`
                const sourceText = isLocal ? 'На диске' : (photo?.source || 'Веб-поиск')
                const isSingleSaving = savingSingleIndex === i

                return (
                  <div key={i} className="photo-card-item" style={{ display: 'flex', flexDirection: 'column', background: '#0b0f19', borderRadius: '8px', overflow: 'hidden', border: isLocal ? '1px solid #10b981' : '1px solid #1e293b' }}>
                    <div
                      className="photo-card-img-wrap"
                      onClick={() => setLightboxUrl(imgSrc)}
                      style={{ cursor: 'zoom-in', position: 'relative', width: '100%', height: '160px', background: '#020617' }}
                      title="🔍 Открыть во весь экран"
                    >
                      <img
                        src={imgSrc}
                        alt={titleText}
                        loading="lazy"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                      <span
                        style={{
                          position: 'absolute',
                          top: '6px',
                          left: '6px',
                          maxWidth: '140px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          background: isLocal ? 'rgba(5, 150, 105, 0.85)' : 'rgba(15, 23, 42, 0.85)',
                          backdropFilter: 'blur(4px)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#f8fafc',
                          fontSize: '0.68rem',
                          padding: '0.15rem 0.45rem',
                          borderRadius: '4px',
                          fontWeight: 600,
                          pointerEvents: 'none',
                          zIndex: 2,
                        }}
                      >
                        📍 {sourceText}
                      </span>
                      <button
                        className="remove-photo-btn"
                        onClick={(e) => handleRemovePhoto(e, i)}
                        title={isLocal ? 'Удалить с диска' : 'Скрыть'}
                        style={{ zIndex: 3 }}
                      >
                        ✕
                      </button>
                    </div>

                    <div style={{ padding: '0.6rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.45rem', flex: 1, justifyContent: 'space-between' }}>
                      <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8', lineHeight: 1.3, maxHeight: '2.6em', overflow: 'hidden' }}>
                        {titleText}
                      </p>

                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: 'auto' }}>
                        {isLocal ? (
                          <div style={{ fontSize: '0.74rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <span>✓ Сохранено в photos/</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => handleSaveSinglePhoto(e, i)}
                            disabled={isSingleSaving}
                            style={{
                              flex: 1,
                              background: '#10b981',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '0.38rem 0.6rem',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              cursor: isSingleSaving ? 'default' : 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.3rem',
                            }}
                            title="Скачать фото в news/.../photos/"
                          >
                            {isSingleSaving ? '⏳...' : '💾 В папку news/'}
                          </button>
                        )}
                      </div>
                    </div>
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
