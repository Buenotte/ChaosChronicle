import { useState, useEffect } from 'react'
import { CATEGORIES, CATEGORY_COLOR, timeAgo } from '../lib/utils'

export default function NewsCard({
  article,
  index,
  onGenerate,
  onSavePackage,
  onOpenPhotos,
  isGenerating,
  isSavedPkg,
  savedPkg,
  onViewSavedPackage,
  onOpenOriginal,
}) {
  const [imgError, setImgError] = useState(false)
  const catColor = CATEGORY_COLOR[article.category] || '#6b7280'

  const isSaved = Boolean(isSavedPkg || article.isSaved || savedPkg?.folderName || savedPkg?.bundleDir)

  const hasAnyArtifact = isSaved && (
    savedPkg?.hasAnyArtifact ||
    savedPkg?.hasScriptTxt ||
    savedPkg?.hasScriptMd ||
    savedPkg?.hasAudio ||
    savedPkg?.hasVideo ||
    savedPkg?.hasThumbnail ||
    (savedPkg?.photosCount > 0)
  )

  // Wenn ein benutzerdefiniertes Thumbnail im Paket existiert, nimm DAS Thumbnail mit Priorität
  const displayImage = (savedPkg?.thumbnailUrl)
    ? savedPkg.thumbnailUrl
    : (article.imageUrl || null)

  useEffect(() => {
    setImgError(false)
  }, [displayImage])

  const rawUrl = article.url || article.link || savedPkg?.url || savedPkg?.original_url || savedPkg?.link || ''
  const hasWebUrl = typeof rawUrl === 'string' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
  const originalText = article.summary || article.original_news || article.originalNews || article.sourceText || savedPkg?.summary || savedPkg?.original_news || savedPkg?.originalNews || ''

  return (
    <article
      className={`news-card ${isSaved ? 'saved-news-card' : ''}`}
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
          {isSaved && (
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
          {hasWebUrl ? (
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Открыть оригинальную статью в новой вкладке"
              style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
            >
              🔗 {article.source || 'Источник'} ↗
            </a>
          ) : (
            <span className="card-source">{article.source || 'Telegram'}</span>
          )}
          {article.isCustom && (
            <span style={{ background: '#7c3aed', color: '#fff', fontSize: '0.68rem', fontWeight: 700, padding: '0.12rem 0.45rem', borderRadius: '4px' }}>
              ✍️ Своя
            </span>
          )}
          <span className="card-time">{timeAgo(article.pubDate)}</span>
          {isSaved && (
            <span className="saved-status-badge">
              🟢 📦 В news/
            </span>
          )}
        </div>

        <h2 className="card-title">
          {hasWebUrl ? (
            <a href={rawUrl} target="_blank" rel="noopener noreferrer" title="Открыть оригинальную статью">
              {article.title}
            </a>
          ) : (
            <span
              onClick={() => onOpenOriginal ? onOpenOriginal(article) : (onGenerate && onGenerate(article))}
              style={{ cursor: onOpenOriginal ? 'pointer' : 'default' }}
              title={onOpenOriginal ? 'Нажмите, чтобы прочитать исходное сообщение' : undefined}
            >
              {article.title}
            </span>
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
            {savedPkg.hasYouTubeMetadata && (
              <span className="artifact-pill youtube" title="YouTube метаданные готовы">
                📺 YouTube ✅
              </span>
            )}
            {savedPkg.hasFacebookPost && (
              <span className="artifact-pill fb" title="Facebook пост готов">
                📱 FB ✅
              </span>
            )}
          </div>
        )}

        <div className="card-actions-grid">
          {isSaved ? (
            <button
              type="button"
              className="view-saved-btn has-artifacts"
              onClick={() => onViewSavedPackage(savedPkg || article)}
              title="Открыть готовый видео-пакет (Аудио, Фото, Сценарий)"
            >
              📂 Видео-пакет ✅
            </button>
          ) : (
            <button
              type="button"
              className="generate-btn"
              onClick={() => onSavePackage ? onSavePackage(article) : onGenerate(article)}
              style={{ background: '#059669', borderColor: '#10b981', color: '#fff', fontWeight: 700 }}
              title="Скачать оригинальную новость и фото из интернета и сохранить пакет в news/"
            >
              💾 Сохранить в пакет
            </button>
          )}

          <button
            className="photos-btn"
            onClick={() => onOpenPhotos(article)}
            title="Посмотреть фото к этой новости"
          >
            🖼️ Фото {hasAnyArtifact && savedPkg?.photosCount ? `(${savedPkg.photosCount})` : ''}
          </button>
          {onOpenOriginal ? (
            <button
              type="button"
              className="copy-btn"
              onClick={() => onOpenOriginal({ ...article, matchingPkg: savedPkg || article.matchingPkg })}
              style={{
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #334155',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.78rem',
                fontWeight: 600,
                padding: '0.4rem 0.5rem',
              }}
              title="Посмотреть оригинальный текст сообщения (Telegram / Источник)"
            >
              📰 Исходник
            </button>
          ) : hasWebUrl ? (
            <a
              href={rawUrl}
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
          ) : null}
        </div>
      </div>
    </article>
  )
}
