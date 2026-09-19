import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import ImageLightboxModal from './ImageLightboxModal'
import PhotoCardItem from './photos/PhotoCardItem'
import PhotoSearchHeader from './photos/PhotoSearchHeader'
import PhotoQueriesModal from './photos/PhotoQueriesModal'

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
  const [hasOrderChanged, setHasOrderChanged] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState(null), [isFullscreen, setIsFullscreen] = useState(false)
  const [autoFetching, setAutoFetching] = useState(false)
  const [showQueriesModal, setShowQueriesModal] = useState(false)

  useEffect(() => {
    setItems(photos || [])
    if (newsTopic?.title) setSearchQuery(newsTopic.title)
  }, [photos, newsTopic?.title])

  const handleCustomSearch = async (engine = 'all', overrideQuery = null) => {
    const q = (overrideQuery !== null && overrideQuery !== undefined ? overrideQuery : searchQuery).trim()
    if (!q) { toast.error('Введите ключевые слова для поиска фото'); return }
    if (overrideQuery) setSearchQuery(overrideQuery)
    setSearching(true); setCurrentEngine(engine); setSearchPage(1)
    const engineLabels = { all: 'по всем источникам', article: 'из статьи', bing: 'в Bing', pinterest: 'в Pinterest', yandex: 'в Yandex' }
    const toastId = toast.loading(`🔎 Поиск фото ${engineLabels[engine] || ''}...`, { description: q.slice(0, 50) })
    try {
      const folderName = newsTopic.folderName || newsTopic.matchingPkg?.folderName || ''
      const bundleDir = newsTopic.bundleDir || newsTopic.matchingPkg?.bundleDir || ''
      const params = new URLSearchParams({ title: newsTopic.title || '', articleId: newsTopic.id || '', url: newsTopic.url || '', folderName, bundleDir, query: q, forceLive: 'true', page: '1', engine })
      const res = await fetch(`/api/news-photos?${params}`)
      const data = await res.json()
      toast.dismiss(toastId)
      if (data.success) {
        const incoming = data.photos || []
        setItems(prev => {
          const isLoc = p => p?.isSavedLocal || (typeof p === 'string' && p.startsWith('/news-static/')) || p?.url?.startsWith('/news-static/')
          const allLocal = prev.filter(isLoc)
          const seenU = new Set(allLocal.map(p => typeof p === 'string' ? p : p?.url))
          incoming.filter(isLoc).forEach(p => { const u = typeof p === 'string' ? p : p?.url; if (!seenU.has(u)) { seenU.add(u); allLocal.push(p) } })
          return [...allLocal, ...incoming.filter(p => !seenU.has(typeof p === 'string' ? p : p?.url))]
        })
        toast.success(`Найдено ${data.photos?.length || 0} фото!`, { duration: 2500 })
      } else {
        toast.error('Ошибка поиска: ' + (data.error || 'Ничего не найдено'))
      }
    } catch (err) {
      toast.dismiss(toastId); toast.error('Ошибка запроса: ' + err.message)
    } finally { setSearching(false) }
  }

  const handleAutoFetch100 = async (customQueries = null, customCount = 100) => {
    setAutoFetching(true)
    const count = Number(customCount) || 100
    const toastId = toast.loading(`🖼️ ИИ ищет и загружает ${count} фото...`)
    try {
      const folderName = newsTopic.folderName || newsTopic.matchingPkg?.folderName || ''
      const bundleDir = newsTopic.bundleDir || newsTopic.matchingPkg?.bundleDir || ''
      const scriptText = newsTopic.scriptText || newsTopic.scriptTxt || newsTopic.text || ''
      const res = await fetch('/api/auto-fetch-photos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, bundleDir, title: newsTopic.title, scriptText, count, customQueries }),
      })
      const data = await res.json()
      toast.dismiss(toastId)
      if (data.success && data.photos) {
        const bust = Date.now()
        setItems(data.photos.map(p => ({ url: `/news-static/${data.folderName}/${p}?t=${bust}`, source: 'На диске', isSavedLocal: true })))
        setSavedCount(data.count); setHasOrderChanged(false)
        if (onSaved) onSaved()
        toast.success(`🎉 Загружено ${data.count} уникальных фото в пакет!`)
      } else { toast.error('Ошибка: ' + (data.error || 'Не удалось загрузить фото')) }
    } catch (e) { toast.dismiss(toastId); toast.error('Ошибка: ' + e.message) }
    finally { setAutoFetching(false) }
  }

  const handleRemovePhoto = async (e, indexToRemove) => {
    if (e?.stopPropagation) e.stopPropagation()
    const photoToRemove = items[indexToRemove]
    const imgSrc = typeof photoToRemove === 'string' ? photoToRemove : (photoToRemove?.url || '')
    const extractedFolder = imgSrc.match(/\/news-static\/([^/]+)\//)?.[1]
    if (imgSrc.startsWith('/news-static/')) {
      try {
        await fetch('/api/delete-photo', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoUrl: imgSrc, bundleDir: newsTopic?.bundleDir, folderName: newsTopic?.folderName || extractedFolder }),
        })
        toast.success('🗑️ Фото удалено с диска!')
      } catch {}
    } else { toast.info('Фото удалено из списка') }
    setItems(prev => prev.filter((_, idx) => idx !== indexToRemove))
    setHasOrderChanged(true)
    if (onSaved) onSaved()
  }

  const [draggedIndex, setDraggedIndex] = useState(null), [dragOverIndex, setDragOverIndex] = useState(null)
  const handleMovePhoto = (fromIndex, delta) => {
    const toIndex = fromIndex + delta; if (toIndex < 0 || toIndex >= items.length) return
    const newItems = [...items], [moved] = newItems.splice(fromIndex, 1)
    newItems.splice(toIndex, 0, moved); setItems(newItems); setHasOrderChanged(true)
  }
  const handleDragStart = (e, index) => { setDraggedIndex(index); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(index)) }
  const handleDragOver = (e, index) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; if (dragOverIndex !== index) setDragOverIndex(index) }
  const handleContainerDragOver = (e) => {
    e.preventDefault(); if (!modalBodyRef.current || draggedIndex === null) return
    const rect = modalBodyRef.current.getBoundingClientRect(), topZone = e.clientY - rect.top, bottomZone = rect.bottom - e.clientY
    if (topZone < 80 && topZone > 0) modalBodyRef.current.scrollTop -= Math.max(10, Math.round((80 - topZone) * 0.8))
    else if (bottomZone < 80 && bottomZone > 0) modalBodyRef.current.scrollTop += Math.max(10, Math.round((80 - bottomZone) * 0.8))
  }
  const handleDrop = (e, targetIndex) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === targetIndex) { setDraggedIndex(null); setDragOverIndex(null); return }
    const newItems = [...items], [moved] = newItems.splice(draggedIndex, 1)
    newItems.splice(targetIndex, 0, moved); setItems(newItems); setHasOrderChanged(true); setDraggedIndex(null); setDragOverIndex(null)
  }

  const handleLoadMorePhotos = async () => {
    const nextPage = searchPage + 1
    setLoadingMore(true)
    const toastId = toast.loading(`🔎 Поиск фото (страница ${nextPage})...`)
    try {
      const folderName = newsTopic.folderName || newsTopic.matchingPkg?.folderName || ''
      const bundleDir = newsTopic.bundleDir || newsTopic.matchingPkg?.bundleDir || ''
      const params = new URLSearchParams({ title: newsTopic.title || '', articleId: newsTopic.id || '', url: newsTopic.url || '', folderName, bundleDir, query: searchQuery.trim(), forceLive: 'true', page: String(nextPage), engine: currentEngine })
      const res = await fetch(`/api/news-photos?${params}`), data = await res.json()
      toast.dismiss(toastId)
      if (data.success && data.photos?.length > 0) {
        const existU = new Set(items.map(p => (typeof p === 'string' ? p : p.url)))
        const newU = data.photos.filter(p => !existU.has(p.url))
        if (newU.length > 0) {
          setItems(prev => [...prev, ...newU]); setSearchPage(nextPage)
          toast.success(`📸 Добавлено +${newU.length} новых фото! Всего: ${items.length + newU.length}`)
        } else toast.info('Новых фото не найдено')
      } else toast.info('Больше фото не найдено')
    } catch (err) { toast.dismiss(toastId); toast.error('Ошибка: ' + err.message) }
    finally { setLoadingMore(false) }
  }

  const handleSaveSinglePhoto = async (e, index) => {
    if (e?.stopPropagation) e.stopPropagation()
    const photoToSave = items[index]
    const imgSrc = typeof photoToSave === 'string' ? photoToSave : (photoToSave?.url || '')
    if (!imgSrc || imgSrc.startsWith('/news-static/')) return toast.info('Фото уже на диске')
    setSavingSingleIndex(index)
    const toastId = toast.loading('💾 Скачивание фото...')
    try {
      const extracted = items.map(p => (typeof p === 'string' ? p : p?.url || '')).find(u => u.includes('/news-static/'))?.match(/\/news-static\/([^/]+)\//)?.[1]
      const folderName = newsTopic.folderName || newsTopic.matchingPkg?.folderName || extracted
      const res = await fetch('/api/save-single-photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newsTopic.title, folderName, bundleDir: newsTopic.bundleDir, photoUrl: imgSrc }),
      })
      const data = await res.json()
      toast.dismiss(toastId)
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка скачивания')
      setItems(prev => prev.map((p, idx) => idx === index ? { ...(typeof p === 'object' ? p : {}), url: data.localUrl, source: 'На диске', isSavedLocal: true } : p))
      setSavedCount(data.totalPhotos)
      if (onSaved) onSaved()
      toast.success(data.alreadySaved ? 'Фото уже есть на диске (дубликат предотвращён)' : `📸 Сохранено: ${data.filename}!`)
    } catch (err) { toast.dismiss(toastId); toast.error('Ошибка: ' + err.message) }
    finally { setSavingSingleIndex(null) }
  }

  const handleSavePhotosToFolder = async () => {
    if (items.length === 0) return
    setSavingPhotos(true)
    const toastId = toast.loading(`💾 Сохранение ${items.length} фото...`)
    try {
      const extracted = items.map(p => (typeof p === 'string' ? p : p?.url || '')).find(u => u.includes('/news-static/'))?.match(/\/news-static\/([^/]+)\//)?.[1]
      const folderName = newsTopic.folderName || newsTopic.matchingPkg?.folderName || extracted
      const res = await fetch('/api/save-news-photos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newsTopic.title, folderName, bundleDir: newsTopic.bundleDir, photos: items.map(p => (typeof p === 'string' ? p : p.url)) }),
      })
      const data = await res.json()
      toast.dismiss(toastId)
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения')
      setSavedCount(data.savedPhotosCount); setHasOrderChanged(false)
      if (data.photos && data.folderName) {
        const bust = Date.now()
        setItems(data.photos.map(relPath => ({ url: `/news-static/${data.folderName}/${relPath}?t=${bust}`, source: 'На диске', isSavedLocal: true })))
      }
      if (onSaved) onSaved()
      const diff = items.length - data.savedPhotosCount
      const diffMsg = diff > 0 ? ` (удалено ${diff} дубликатов)` : ''
      toast.success(`📸 Сохранено ${data.savedPhotosCount} уникальных фото${diffMsg}!`)
    } catch (err) { toast.dismiss(toastId); toast.error('Ошибка: ' + err.message) }
    finally { setSavingPhotos(false) }
  }

  const handleDeduplicate = async () => {
    const extracted = items.map(p => (typeof p === 'string' ? p : p?.url || '')).find(u => u.includes('/news-static/'))?.match(/\/news-static\/([^/]+)\//)?.[1]
    const folderName = newsTopic.folderName || newsTopic.matchingPkg?.folderName || extracted
    const tId = toast.loading('🧹 Поиск и удаление дубликатов...')
    try {
      const res = await fetch('/api/deduplicate-photos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, bundleDir: newsTopic.bundleDir }),
      })
      const data = await res.json()
      toast.dismiss(tId)
      if (data.success) {
        if (data.removed > 0) {
          toast.success(`🎉 Удалено ${data.removed} дубликатов! Осталось: ${data.total}`)
          if (onSaved) onSaved(); handleCustomSearch('all')
        } else toast.info('Дубликатов не найдено — все фото уникальны!')
      } else toast.error('Ошибка: ' + data.error)
    } catch (e) { toast.dismiss(tId); toast.error('Ошибка: ' + e.message) }
  }

  const isLoading = initialLoading || searching

  return (
    <div className="modal-overlay" onClick={onClose}>
      <ImageLightboxModal imageUrl={lightboxUrl} title={newsTopic.title} onClose={() => setLightboxUrl(null)} />
      <PhotoQueriesModal
        isOpen={showQueriesModal} onClose={() => setShowQueriesModal(false)}
        folderName={newsTopic.folderName || newsTopic.matchingPkg?.folderName || ''}
        bundleDir={newsTopic.bundleDir || newsTopic.matchingPkg?.bundleDir || ''}
        title={newsTopic.title || ''} scriptText={newsTopic.scriptText || newsTopic.text || ''}
        onSelectQuery={(q) => handleCustomSearch('all', q)}
        onAutoFetchWithQueries={(customQueries, count) => handleAutoFetch100(customQueries, count)}
      />
      <div
        className="modal-content" onClick={e => e.stopPropagation()}
        style={isFullscreen ? { maxWidth: '100vw', width: '100vw', height: '100vh', maxHeight: '100vh', borderRadius: 0, margin: 0, display: 'flex', flexDirection: 'column' } : { maxWidth: '1020px', width: '96%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div>
            <span className="modal-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              📸 Поиск и управление фото
            </span>
            <h2 className="modal-title" style={{ fontSize: '1.15rem', marginTop: '0.3rem' }}>{newsTopic.title}</h2>
            <div className="modal-stats" style={{ marginTop: '0.3rem' }}>
              {items.length > 0 && <span>🖼️ В списке: {items.length} фото</span>}
              {savedCount !== null && <span className="saved-status-badge">🟢 {savedCount} сохранено в news/photos/</span>}
            </div>
          </div>
          <div className="modal-header-actions" style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
            {items.length > 1 && (
              <button
                type="button" onClick={handleDeduplicate}
                style={{ background: '#334155', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', padding: '0.4rem 0.65rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                title="Удалить одинаковые фото по содержимому (MD5)"
              >
                🧹 Без дублей
              </button>
            )}
            {items.length > 0 && (
              <button
                className="save-bundle-btn" onClick={handleSavePhotosToFolder} disabled={savingPhotos}
                style={{ background: hasOrderChanged ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' : 'linear-gradient(135deg, #10b981 0%, #059669 100%)', fontWeight: 700 }}
              >
                {savingPhotos ? '⏳ Сохранение...' : hasOrderChanged ? `💾 Сохранить порядок (${items.length})` : `💾 Сохранить ${items.length} фото`}
              </button>
            )}
            <button
              type="button" onClick={() => setIsFullscreen(prev => !prev)}
              style={{ background: isFullscreen ? '#2563eb' : '#1e293b', border: '1px solid #475569', color: '#fff', borderRadius: '6px', padding: '0.4rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
            >
              {isFullscreen ? '🗗 В окно' : '⛶ Во весь экран'}
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <PhotoSearchHeader
          searchQuery={searchQuery} setSearchQuery={setSearchQuery} onQueryChange={setSearchQuery}
          onSearch={handleCustomSearch} currentEngine={currentEngine} searching={searching}
          isLoading={isLoading} autoFetching={autoFetching} onOpenQueries={() => setShowQueriesModal(true)}
          onOpenQueriesModal={() => setShowQueriesModal(true)} onAutoFetch100={() => handleAutoFetch100(null, 100)}
        />

        <div ref={modalBodyRef} onDragOver={handleContainerDragOver} className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>
          {isLoading && <div className="empty-state"><p>⟳ Поиск репортажных фотографий по запросу «{searchQuery}»...</p></div>}
          {!isLoading && items.length === 0 && <div className="empty-state"><p>📷 Фотографий не найдено.</p></div>}
          {!isLoading && items.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.25)', padding: '0.45rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.78rem', color: '#93c5fd' }}>
                <span>💡 <b>Drag & Drop:</b> Перетаскивайте фото на любую позицию (или используйте ⬅️ / ➡️).</span>
                <span style={{ color: '#e2e8f0', fontWeight: 600 }}>Всего: {items.length} кадров</span>
              </div>
              <div className={`multi-source-photos-grid ${isFullscreen ? 'fullscreen-grid' : ''}`}>
                {items.map((photo, i) => (
                  <PhotoCardItem
                    key={i} photo={photo} index={i} totalCount={items.length}
                    isSingleSaving={savingSingleIndex === i} isDragged={draggedIndex === i}
                    isDragOver={dragOverIndex === i} onLightbox={setLightboxUrl}
                    onRemove={handleRemovePhoto} onSaveSingle={handleSaveSinglePhoto}
                    onMove={handleMovePhoto} onDragStart={handleDragStart}
                    onDragOver={handleDragOver} onDrop={handleDrop}
                  />
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem', marginBottom: '0.5rem' }}>
                <button
                  type="button" onClick={handleLoadMorePhotos} disabled={loadingMore}
                  style={{ background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', fontWeight: 700, padding: '0.65rem 1.6rem', fontSize: '0.85rem', borderRadius: '8px', cursor: loadingMore ? 'default' : 'pointer' }}
                >
                  {loadingMore ? '⏳ Поиск следующих фото...' : `🔍 Искать ещё фото (страница ${searchPage + 1})`}
                </button>
              </div>
            </>
          )}
        </div>
        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>{hasOrderChanged && <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 600 }}>⚠️ Новый порядок еще не сохранен на диске</span>}</div>
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
