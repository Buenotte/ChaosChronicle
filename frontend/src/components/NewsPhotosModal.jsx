import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import ImageLightboxModal from './ImageLightboxModal'
import PhotoCardItem from './photos/PhotoCardItem'
import PhotoSearchHeader from './photos/PhotoSearchHeader'

export default function NewsPhotosModal({ newsTopic, photos, loading: initialLoading, onClose, onSaved, onReload }) {
  if (!newsTopic) return null

  const [items, setItems] = useState([])
  const [searchQuery, setSearchQuery] = useState(newsTopic.title || '')
  const [currentEngine, setCurrentEngine] = useState('all')
  const [searchPage, setSearchPage] = useState(1)
  const [searching, setSearching] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
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

  const handleCustomSearch = async (engine = 'all') => {
    if (!searchQuery.trim()) {
      toast.error('Введите ключевые слова для поиска фото')
      return
    }

    setSearching(true)
    setCurrentEngine(engine)
    setSearchPage(1)
    const engineLabels = { all: 'по всем источникам', article: 'из оригинальной статьи', bing: 'в Bing', pinterest: 'в Pinterest', yandex: 'в Yandex' }
    const toastId = toast.loading(`🔎 Поиск фото ${engineLabels[engine] || ''}...`, {
      description: searchQuery.slice(0, 50),
    })

    try {
      const params = new URLSearchParams({
        title: newsTopic.title || '',
        articleId: newsTopic.id || '',
        url: newsTopic.url || '',
        query: searchQuery.trim(),
        forceLive: 'true',
        page: '1',
        engine,
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

  const handleLoadMorePhotos = async () => {
    const nextPage = searchPage + 1
    setLoadingMore(true)
    const toastId = toast.loading(`🔎 Поиск следующих фото (страница ${nextPage})...`)

    try {
      const params = new URLSearchParams({
        title: newsTopic.title || '',
        query: searchQuery.trim(),
        forceLive: 'true',
        page: String(nextPage),
        engine: currentEngine,
      })
      const res = await fetch(`/api/news-photos?${params}`)
      const data = await res.json()

      if (data.success && data.photos?.length > 0) {
        const existingUrls = new Set(items.map(p => (typeof p === 'string' ? p : p.url)))
        const newUnique = data.photos.filter(p => !existingUrls.has(p.url))
        if (newUnique.length > 0) {
          setItems(prev => [...prev, ...newUnique])
          setSearchPage(nextPage)
          toast.success(`📸 Добавлено +${newUnique.length} новых фото! Всего: ${items.length + newUnique.length}`, { id: toastId })
        } else {
          toast.info('Новых дополнительных фото не найдено', { id: toastId })
        }
      } else {
        toast.info('Больше фото не найдено', { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка поиска: ' + err.message, { id: toastId })
    } finally {
      setLoadingMore(false)
    }
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

        {/* Панель поиска с выбором движка */}
        <PhotoSearchHeader
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={handleCustomSearch}
          searching={searching}
          isLoading={isLoading}
          currentEngine={currentEngine}
        />

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
            <>
              <div className="multi-source-photos-grid">
                {items.map((photo, i) => (
                  <PhotoCardItem
                    key={i}
                    photo={photo}
                    index={i}
                    isSingleSaving={savingSingleIndex === i}
                    onLightbox={setLightboxUrl}
                    onRemove={handleRemovePhoto}
                    onSaveSingle={handleSaveSinglePhoto}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleLoadMorePhotos}
                  disabled={loadingMore}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#f8fafc',
                    fontWeight: 700,
                    padding: '0.65rem 1.6rem',
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    cursor: loadingMore ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { if (!loadingMore) { e.currentTarget.style.background = '#334155'; e.currentTarget.style.borderColor = '#64748b' } }}
                  onMouseLeave={e => { if (!loadingMore) { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.borderColor = '#475569' } }}
                >
                  {loadingMore ? '⏳ Поиск следующих фото...' : `🔍 Искать ещё фото (страница ${searchPage + 1})`}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="modal-footer">
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
