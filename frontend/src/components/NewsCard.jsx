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

  return (
    <article
      className={`news-card ${hasAnyArtifact ? 'saved-news-card' : ''}`}
      style={{ '--cat-color': catColor, animationDelay: `${index * 30}ms` }}
    >
      {displayImage && !imgError && (
        <div className="card-image">
          <img
            src={displayImage}
            alt={article.title}
            onError={() => setImgError(true)}
            loading="lazy"
          />
        </div>
      )}
      <div className="card-body">
        <div className="card-meta">
          <span className="card-badge" style={{ background: catColor }}>
            {CATEGORIES.find(c => c.key === article.category)?.label || article.category}
          </span>
          <span className="card-source">{article.source}</span>
          <span className="card-time">{timeAgo(article.pubDate)}</span>
          {hasAnyArtifact && (
            <span className="saved-status-badge">
              🟢 📦 В news/
            </span>
          )}
        </div>

        <h2 className="card-title">
          <a href={article.url} target="_blank" rel="noopener noreferrer">
            {article.title}
          </a>
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
