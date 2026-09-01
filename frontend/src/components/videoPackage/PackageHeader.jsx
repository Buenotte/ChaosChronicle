import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function PackageHeader({
  pkg,
  hasTxt,
  actualPhotoCount,
  audioState,
  videoState,
  shortState,
  currentThumbnail,
  isMaximized,
  setIsMaximized,
  onOpenTitleVariants,
  onOpenScript,
  onOpenPhotos,
  onOpenShorts,
  onDeletePackage,
  onTitleSaved,
  onClose,
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleText, setEditTitleText] = useState(pkg?.title || '')
  const [savingTitle, setSavingTitle] = useState(false)

  useEffect(() => {
    setEditTitleText(pkg?.title || '')
  }, [pkg?.title])

  const handleSaveTitle = async () => {
    const trimmed = editTitleText.trim()
    if (!trimmed) return
    try {
      setSavingTitle(true)
      const res = await fetch('/api/update-package-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          newTitle: trimmed,
          updateThumbnail: true,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`🎉 Заголовок обновлен: "${data.newTitle}"`)
        pkg.title = data.newTitle
        setIsEditingTitle(false)
        if (onTitleSaved) onTitleSaved(data.newTitle, data.thumbnailUrl)
      } else {
        toast.error('Ошибка сохранения: ' + (data.error || 'Неизвестная ошибка'))
      }
    } catch (err) {
      toast.error('Ошибка сохранения: ' + err.message)
    } finally {
      setSavingTitle(false)
    }
  }

  const hasTitle = Boolean(
    (pkg?.title_variants && pkg.title_variants.length > 0) ||
    pkg?.title_updated_at ||
    (pkg?.title && pkg.title !== 'Ohne Titel' && pkg.title !== (pkg?.original_title || ''))
  )

  return (
    <div className="modal-header">
      <div style={{ flex: 1, minWidth: 0 }}>
        <span className="modal-badge saved-badge">
          📂 Видео-пакет в news/{pkg.folderName || ''}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
          {isEditingTitle ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', width: '100%', maxWidth: '640px' }}>
              <input
                type="text"
                value={editTitleText}
                onChange={e => setEditTitleText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') { setIsEditingTitle(false); setEditTitleText(pkg?.title || ''); }
                }}
                autoFocus
                style={{
                  flex: 1,
                  background: '#09090b',
                  color: '#fff',
                  border: '2px solid #3b82f6',
                  borderRadius: '6px',
                  padding: '0.4rem 0.65rem',
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  outline: 'none',
                }}
                placeholder="Введите новый заголовок пакета..."
              />
              <button
                type="button"
                className="copy-btn"
                disabled={savingTitle || !editTitleText.trim()}
                onClick={handleSaveTitle}
                style={{ background: '#10b981', padding: '0.4rem 0.75rem', fontWeight: 700, fontSize: '0.85rem' }}
                title="Сохранить заголовок (Enter)"
              >
                {savingTitle ? '⏳' : '💾 Сохранить'}
              </button>
              <button
                type="button"
                className="copy-btn"
                onClick={() => { setIsEditingTitle(false); setEditTitleText(pkg?.title || ''); }}
                style={{ background: '#3f3f46', padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                title="Отмена (Esc)"
              >
                ✕
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 className="modal-title" style={{ margin: 0 }}>{pkg.title}</h2>
              <button
                type="button"
                onClick={() => { setEditTitleText(pkg?.title || ''); setIsEditingTitle(true); }}
                className="copy-btn"
                style={{
                  background: 'rgba(59, 130, 246, 0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
                title="Редактировать заголовок вручную"
              >
                ✏️ Изменить
              </button>
            </div>
          )}
          {(pkg?.url || pkg?.original_url) && (
            <a
              href={pkg.url || pkg.original_url}
              target="_blank"
              rel="noopener noreferrer"
              className="copy-btn"
              style={{
                fontSize: '0.75rem',
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                textDecoration: 'none',
                padding: '0.2rem 0.55rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.3rem',
              }}
              title="Открыть оригинальную статью в новой вкладке"
            >
              🌐 Оригинал новости ↗
            </a>
          )}
        </div>
        <div className="modal-stats" style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={`saved-status-badge ${hasTitle ? 'active' : 'inactive'} clickable`}
            onClick={onOpenTitleVariants}
            title="Нажмите, чтобы открыть генератор 10 заголовков"
          >
            ⚡ title {hasTitle ? '✅' : '❌'}
          </button>

          <button
            type="button"
            className={`saved-status-badge ${hasTxt ? 'active' : 'inactive'} ${onOpenScript ? 'clickable' : ''}`}
            onClick={onOpenScript}
            title="Сценарий монолога (script.txt)"
          >
            📜 script.txt {hasTxt ? '✅' : '❌'}
          </button>

          <button
            type="button"
            className={`saved-status-badge ${actualPhotoCount > 0 ? 'active' : 'inactive'} ${onOpenPhotos ? 'clickable' : ''}`}
            onClick={onOpenPhotos}
            title="Фотографии к новости (photos/)"
          >
            📸 photos/ ({actualPhotoCount}) {actualPhotoCount > 0 ? '✅' : '❌'}
          </button>

          <span
            className={`saved-status-badge ${audioState.hasAudio ? 'active' : 'inactive'}`}
            title="Аудио-озвучка (audio.mp3)"
          >
            🎙️ audio.mp3 {audioState.hasAudio ? '✅' : '❌'}
          </span>

          <span
            className={`saved-status-badge ${videoState.hasVideo ? 'active' : 'inactive'}`}
            title="1080p Видео-ролик (video.mp4)"
          >
            🎬 video.mp4 {videoState.hasVideo ? '✅' : '❌'}
          </span>

          <span
            className={`saved-status-badge ${currentThumbnail ? 'active' : 'inactive'}`}
            title="16:9 YouTube Обложка (thumbnail.jpg)"
          >
            ✨ thumbnail.jpg {currentThumbnail ? '✅' : '❌'}
          </span>

          <button
            type="button"
            className={`saved-status-badge ${shortState?.hasShort ? 'active' : 'inactive'} ${onOpenShorts ? 'clickable' : ''}`}
            onClick={onOpenShorts}
            title="9:16 YouTube Shorts (short.mp4) — нажмите, чтобы открыть студию Shorts"
          >
            ⚡ short.mp4 {shortState?.hasShort ? '✅' : '❌'}
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
        {onDeletePackage && (
          <button
            type="button"
            className="modal-close"
            onClick={onDeletePackage}
            title="Удалить весь этот пакет с диска"
            style={{ color: '#ef4444', borderColor: '#ef4444' }}
          >
            🗑️
          </button>
        )}
        <button
          className="modal-close"
          onClick={() => setIsMaximized(!isMaximized)}
          title={isMaximized ? "Свернуть окно" : "Развернуть во весь экран"}
        >
          {isMaximized ? '🗗' : '🗖'}
        </button>
        <button className="modal-close" onClick={onClose} title="Закрыть окно">✕</button>
      </div>
    </div>
  )
}
