import { useState, useEffect } from 'react'
import { CATEGORIES, CATEGORY_COLOR, timeAgo } from '../lib/utils'

export default function NewsCard({ article, index, onGenerate, onOpenPhotos, isGenerating, isSavedPkg, savedPkg, onViewSavedPackage }) {
  const [imgError, setImgError] = useState(false)
  const catColor = CATEGORY_COLOR[article.category] || '#6b7280'

  const hasAnyArtifact = isSavedPkg && (
    savedPkg?.hasAnyArtifact ||
    savedPkg?.hasScriptTxt ||
    savedPkg?.hasScriptMd ||
    savedPkg?.hasAudio ||
    savedPkg?.hasVideo ||
    savedPkg?.hasThumbnail ||
    (savedPkg?.photosCount > 0)
  )

  // Wenn ein benutzerdefiniertes Thumbnail im Paket existiert, nimm DAS Thumbnail mit Priorität
  const displayImage = (hasAnyArtifact && savedPkg?.thumbnailUrl)
    ? savedPkg.thumbnailUrl
    : (article.imageUrl || null)

  useEffect(() => {
    setImgError(false)
  }, [displayImage])

  const cleanTitleForSearch = (article.original_title || article.title || savedPkg?.title || '').replace(/^[0-9T_-]+/, '').replace(/_/g, ' ')
  const targetUrl = article.url || article.link || savedPkg?.url || savedPkg?.original_url || savedPkg?.link || `https://www.google.com/search?q=${encodeURIComponent(cleanTitleForSearch + ' ' + (article.source || ''))}`

  return (
    <article
      className={`news-card ${hasAnyArtifact ? 'saved-news-card' : ''}`}
      style={{ '--cat-color': catColor, animationDelay: `${index * 30}ms` }}
    >
      {displayImage && !imgError && (
        <div className="card-image" style={{ position: 'relative' }}>
          <img
            src={displayImage}
            alt={article.title}
            onError={() => setImgError(true)}
            loading="lazy"
          />
          {hasAnyArtifact && (
            <span
              style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: 'rgba(16, 185, 129, 0.92)',
                color: '#fff',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '0.2rem 0.55rem',
                borderRadius: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.45)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              ✅ СОХРАНЕНО
            </span>
          )}
        </div>
      )}
      <div className="card-body">
        <div className="card-meta">
          <span className="card-badge" style={{ background: catColor }}>
            {CATEGORIES.find(c => c.key === article.category)?.label || article.category}
          </span>
          {targetUrl ? (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Открыть оригинальную статью в новой вкладке"
              style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
            >
              🔗 {article.source || 'Источник'} ↗
            </a>
          ) : (
            <span className="card-source">{article.source}</span>
          )}
          <span className="card-time">{timeAgo(article.pubDate)}</span>
          {hasAnyArtifact && (
            <span className="saved-status-badge">
              🟢 📦 В news/
            </span>
          )}
        </div>

        <h2 className="card-title">
          {targetUrl ? (
            <a href={targetUrl} target="_blank" rel="noopener noreferrer" title="Открыть оригинальную статью">
              {article.title}
            </a>
          ) : (
            <span>{article.title}</span>
          )}
        </h2>
        {article.summary && (
          <p className="card-summary">{article.summary}</p>
        )}

        {/* 📦 СПИСОК ГОТОВЫХ АРТЕФАКТОВ В ПАКЕТЕ */}
        {hasAnyArtifact && (
          <div className="artifact-badges-row">
            {(savedPkg.hasScriptTxt || savedPkg.hasScriptMd) && (
              <span className="artifact-pill script" title="Сценарий готов (script.txt / script.md)">
                📜 Скрипт ✅
              </span>
            )}
            {savedPkg.photosCount > 0 && (
              <span className="artifact-pill photos" title={`${savedPkg.photosCount} фото скачано в news/photos/`}>
                📸 {savedPkg.photosCount} фото ✅
              </span>
            )}
            {savedPkg.hasThumbnail && (
              <span className="artifact-pill thumbnail" title="16:9 YouTube Обложка создана (thumbnail.jpg)">
                ✨ 16:9 Обложка ✅
              </span>
            )}
            {savedPkg.hasAudio && (
              <span className="artifact-pill audio" title="Аудио озвучка сгенерирована (audio.mp3)">
                🎙️ Аудио ✅
              </span>
            )}
            {savedPkg.hasVideo && (
              <span className="artifact-pill video" title="Финальное видео срендерено (video.mp4)">
                🎬 Видео ✅
              </span>
            )}
            {savedPkg.hasShort && (
              <span className="artifact-pill shorts" title="9:16 Shorts видео срендерено (short.mp4)">
                ⚡ Shorts ✅
              </span>
            )}
          </div>
        )}

        <div className="card-actions-grid">
          <button
            className="generate-btn"
            onClick={() => onGenerate(article)}
            disabled={isGenerating}
          >
            {isGenerating ? '⏳ Создание...' : '✍️ Фельетон (3 мин)'}
          </button>
          <button
            className="photos-btn"
            onClick={() => onOpenPhotos(article)}
            title="Посмотреть фото к этой новости"
          >
            🖼️ Фото {hasAnyArtifact && savedPkg?.photosCount ? `(${savedPkg.photosCount})` : ''}
          </button>
          {targetUrl && (
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="copy-btn"
              style={{
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.4rem 0.5rem',
              }}
              title="Открыть оригинальную статью в новой вкладке"
            >
              🌐 Оригинал ↗
            </a>
          )}

          <button
            className={`view-saved-btn ${hasAnyArtifact ? 'has-artifacts' : ''}`}
            onClick={() => {
              const pkgToView = savedPkg || {
                title: article.title,
                folderName: '(Пакет еще не сохранен в news/)',
                source: article.source,
                model: 'gemini',
                date: article.pubDate,
                photosCount: article.images ? article.images.length : (article.imageUrl ? 1 : 0),
                photoUrls: article.images || (article.imageUrl ? [article.imageUrl] : []),
                hasAudio: false,
                scriptTxt: 'Нажмите «✍️ Фельетон» и «📦 Сохранить», чтобы создать script.txt',
              }
              onViewSavedPackage(pkgToView)
            }}
            title="Открыть готовый видео-пакет (Аудио, Фото, Сценарий)"
          >
            {hasAnyArtifact ? '📂 Видео-пакет ✅' : '📂 Видео-пакет'}
          </button>
        </div>
      </div>
    </article>
  )
}
