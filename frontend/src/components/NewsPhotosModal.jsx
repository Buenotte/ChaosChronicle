import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import ImageLightboxModal from './ImageLightboxModal'
import PhotoCardItem from './photos/PhotoCardItem'
import PhotoSearchHeader from './photos/PhotoSearchHeader'

export default function NewsPhotosModal({ newsTopic, photos, loading: initialLoading, onClose, onSaved, onReload }) {
  if (!newsTopic) return null

  const modalBodyRef = useRef(null)
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
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    setItems(photos || [])
    if (newsTopic?.title) {
      setSearchQuery(newsTopic.title)
    }
  }, [photos, newsTopic?.title])

  const handleCustomSearch = async (engine = 'all') => {
    if (!searchQuery.trim()) { toast.error('Введите ключевые слова для поиска фото'); return }
    setSearching(true); setCurrentEngine(engine); setSearchPage(1)
    const engineLabels = { all: 'по всем источникам', article: 'из оригинальной статьи', bing: 'в Bing', pinterest: 'в Pinterest', yandex: 'в Yandex' }
    const toastId = toast.loading(`🔎 Поиск фото ${engineLabels[engine] || ''}...`, { description: searchQuery.slice(0, 50) })
    try {
      const params = new URLSearchParams({ title: newsTopic.title || '', articleId: newsTopic.id || '', url: newsTopic.url || '', query: searchQuery.trim(), forceLive: 'true', page: '1', engine })
      const res = await fetch(`/api/news-photos?${params}`)
      const data = await res.json()
      if (data.success) {
        const incoming = data.photos || []
        setItems(prev => {
          const localSaved = prev.filter(p => p?.isSavedLocal || (typeof p === 'string' && p.startsWith('/news-static/')) || (p?.url && p.url.startsWith('/news-static/')))
          if (localSaved.length === 0) return incoming
          const localUrls = new Set(localSaved.map(p => typeof p === 'string' ? p : p?.url))
          const fresh = incoming.filter(p => !localUrls.has(typeof p === 'string' ? p : p?.url))
          return [...localSaved, ...fresh]
        })
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
    if (e?.stopPropagation) e.stopPropagation()
    const photoToRemove = items[indexToRemove]
    const imgSrc = typeof photoToRemove === 'string' ? photoToRemove : (photoToRemove?.url || '')
    if (imgSrc && imgSrc.startsWith('/news-static/')) {
      try {
        const res = await fetch('/api/delete-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl: imgSrc, bundleDir: newsTopic?.bundleDir, folderName: newsTopic?.folderName }),
        })
        const data = await res.json()
        if (data.success && data.deleted) toast.success('🗑️ Фото удалено с диска!')
      } catch (err) { console.error('Fehler beim Löschen des Fotos:', err) }
    } else {
      toast.info('Фото удалено из списка')
    }
    setItems(prev => prev.filter((_, idx) => idx !== indexToRemove))
    if (onSaved) onSaved()
  }

  const [draggedIndex, setDraggedIndex] = useState(null)
  const [dragOverIndex, setDragOverIndex] = useState(null)

  const handleMovePhoto = (fromIndex, delta) => {
    const toIndex = fromIndex + delta
    if (toIndex < 0 || toIndex >= items.length) return
    const newItems = [...items]
    const [moved] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, moved)
    setItems(newItems)
  }

  const handleDragStart = (e, index) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
  }

  const handleDragOver = (e, index) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverIndex !== index) setDragOverIndex(index)
  }

  const handleContainerDragOver = (e) => {
    e.preventDefault()
    if (!modalBodyRef.current || draggedIndex === null) return
    const rect = modalBodyRef.current.getBoundingClientRect()
    const topZone = e.clientY - rect.top
    const bottomZone = rect.bottom - e.clientY

    if (topZone < 80 && topZone > 0) {
      const scrollSpeed = Math.max(10, Math.round((80 - topZone) * 0.8))
      modalBodyRef.current.scrollTop -= scrollSpeed
    } else if (bottomZone < 80 && bottomZone > 0) {
      const scrollSpeed = Math.max(10, Math.round((80 - bottomZone) * 0.8))
      modalBodyRef.current.scrollTop += scrollSpeed
    }
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleDrop = (e, targetIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null); setDragOverIndex(null); return
    }
    const newItems = [...items]
    const [moved] = newItems.splice(draggedIndex, 1)
    newItems.splice(targetIndex, 0, moved)
    setItems(newItems)
    setDraggedIndex(null)
    setDragOverIndex(null)
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
      setItems(prev => prev.map((p, idx) => idx === index ? { ...(typeof p === 'object' ? p : {}), url: data.localUrl, source: 'На диске', isSavedLocal: true } : p))
      setSavedCount(data.totalPhotos)
      if (onSaved) onSaved()
      toast.success(`📸 Фото сохранено: ${data.filename}!`, { id: toastId, description: `Папка: news/${data.folderName}/photos/` })
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
      if (data.photos && data.folderName) {
        setItems(data.photos.map((relPath, idx) => ({
          url: `/news-static/${data.folderName}/${relPath}`,
          source: 'На диске',
          isSavedLocal: true,
          articleTitle: items[idx]?.articleTitle || `Фото #${idx + 1}`,
        })))
      }
      if (onSaved) onSaved()
      toast.success(`📸 ${data.savedPhotosCount} фото успешно сохранены на диске!`, { id: toastId, description: `Папка: news/${data.folderName}/photos/` })
    } catch (err) {
      toast.error('Ошибка сохранения фото: ' + err.message, { id: toastId })
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
        style={isFullscreen ? { maxWidth: '100vw', width: '100vw', height: '100vh', maxHeight: '100vh', borderRadius: 0, margin: 0, display: 'flex', flexDirection: 'column' } : { maxWidth: '1020px', width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
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
          <div className="modal-header-actions" style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
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
            <button
              type="button"
              onClick={() => setIsFullscreen(prev => !prev)}
              style={{ background: isFullscreen ? '#2563eb' : '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
              title={isFullscreen ? 'Свернуть в окно' : 'Развернуть на весь экран'}
            >
              {isFullscreen ? '🗗 В окно' : '⛶ Во весь экран'}
            </button>
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

        <div ref={modalBodyRef} onDragOver={handleContainerDragOver} className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '0.45rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.78rem', color: '#93c5fd' }}>
                <span>💡 <b>Drag & Drop:</b> Перетаскивайте фото на любую позицию (или используйте ⬅️ / ➡️).</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Всего: {items.length} кадров</span>
              </div>

              {draggedIndex !== null && draggedIndex > 0 && (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOverIndex(-1) }}
                  onDrop={(e) => handleDrop(e, 0)}
                  style={{
                    border: dragOverIndex === -1 ? '2px dashed #38bdf8' : '2px dashed rgba(56, 189, 248, 0.4)',
                    background: dragOverIndex === -1 ? 'rgba(56, 189, 248, 0.25)' : 'rgba(15, 23, 42, 0.65)',
                    borderRadius: '8px',
                    padding: '0.65rem',
                    textAlign: 'center',
                    marginBottom: '0.75rem',
                    color: dragOverIndex === -1 ? '#38bdf8' : '#cbd5e1',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    transition: 'all 0.15s ease-out',
                  }}
                >
                  ⭐ Бросьте сюда, чтобы сделать #1 (Самым первым в видео)
                </div>
              )}
              <div className={`multi-source-photos-grid ${isFullscreen ? 'fullscreen-grid' : ''}`}>
                {items.map((photo, i) => (
                  <PhotoCardItem
                    key={i}
                    photo={photo}
                    index={i}
                    totalCount={items.length}
                    isSingleSaving={savingSingleIndex === i}
                    isDragged={draggedIndex === i}
                    isDragOver={dragOverIndex === i}
                    onLightbox={setLightboxUrl}
                    onRemove={handleRemovePhoto}
                    onSaveSingle={handleSaveSinglePhoto}
                    onMove={handleMovePhoto}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDrop={handleDrop}
                  />
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                <button
                  type="button"
                  onClick={handleLoadMorePhotos}
                  disabled={loadingMore}
                  style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', fontWeight: 700, padding: '0.65rem 1.6rem', fontSize: '0.85rem', borderRadius: '8px', cursor: loadingMore ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  {loadingMore ? '⏳ Поиск следующих фото...' : `🔍 Искать ещё фото (страница ${searchPage + 1})`}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer"><button className="close-btn" onClick={onClose}>Закрыть</button></div>
      </div>
    </div>
  )
}
