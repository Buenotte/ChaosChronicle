import { useState } from 'react'
import { CATEGORIES, CATEGORY_COLOR, timeAgo } from '../lib/utils'

export default function NewsCard({ article, index, onGenerate, onOpenPhotos, isGenerating, isSavedPkg, savedPkg, onViewSavedPackage }) {
  const [imgError, setImgError] = useState(false)
  const catColor = CATEGORY_COLOR[article.category] || '#6b7280'

  return (
    <article
      className={`news-card ${isSavedPkg ? 'saved-news-card' : ''}`}
      style={{ '--cat-color': catColor, animationDelay: `${index * 30}ms` }}
    >
      {article.imageUrl && !imgError && (
        <div className="card-image">
          <img
            src={article.imageUrl}
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
          {isSavedPkg && (
            <span className="saved-status-badge">
              🟢 📦 Сохранено в news/
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
            🖼️ Фото
          </button>

          <button
            className="view-saved-btn"
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
            📂 Видео-пакет
          </button>
        </div>
      </div>
    </article>
  )
}
