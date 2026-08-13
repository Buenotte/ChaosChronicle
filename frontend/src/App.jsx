import { useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'sonner'

const CATEGORIES = [
  { key: 'vse',       label: '🌐 Все новости',        color: '#6b7280' },
  { key: 'kultura',   label: '🎭 Культура',            color: '#8b5cf6' },
  { key: 'politika',  label: '🏛️ Политика',           color: '#ef4444' },
  { key: 'tekh',      label: '🤖 Технологии',          color: '#06b6d4' },
  { key: 'ekonomika', label: '📈 Экономика',           color: '#10b981' },
  { key: 'mir',       label: '🌍 Мир',                 color: '#f59e0b' },
  { key: 'sport',     label: '⚽ Спорт',               color: '#22c55e' },
  { key: 'ukraina',   label: '🇺🇦 Война в Украине',   color: '#facc15' },
]

const AI_MODELS = [
  { id: 'gemini',   name: '✨ Gemini 3.6 Flash',         icon: '⚡' },
  { id: 'deepseek', name: '🧠 DeepSeek V3 / R1',         icon: '🌊' },
  { id: 'qwen',     name: '🦁 Qwen 2.5 72B',             icon: '👑' },
  { id: 'free',     name: '🎁 OpenRouter Free Router',   icon: '🆓' },
]

const CATEGORY_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.key, c.color]))

function timeAgo(pubDate) {
  if (!pubDate) return ''
  const now = new Date()
  const date = new Date(pubDate)
  if (isNaN(date)) return ''
  const diffMs = now - date
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Только что'
  if (mins < 60) return `${mins} мин. назад`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ч. назад`
  const days = Math.floor(hrs / 24)
  return `${days} дн. назад`
}

// Modal zum Betrachten eines bereits gespeicherten Pakets (Text, Fotos, Audio)
function SavedPackageModal({ pkg, onClose }) {
  if (!pkg) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content saved-package-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge saved-badge">📂 Сохраненный видео-пакет в news/</span>
            <h2 className="modal-title">{pkg.title}</h2>
            <div className="modal-stats">
              <span>📁 Папка: news/{pkg.folderName}</span>
              <span>📸 Фото: {pkg.photosCount} шт.</span>
              <span>🎙️ Озвучка Nikolay: {pkg.hasAudio ? '✅ Готово' : '❌ Не создана'}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Audio Player */}
          {pkg.hasAudio && (
            <div className="audio-player-box">
              <div className="audio-player-title">🎙️ Озвучка диктора Nikolay (ru-RU-DmitryNeural, 0%, -10%):</div>
              <audio controls src={pkg.audioUrl} className="audio-element">
                Ваш браузер не поддерживает элемент audio.
              </audio>
            </div>
          )}

          {/* Fotos aus dem Ordner */}
          {pkg.photoUrls && pkg.photoUrls.length > 0 && (
            <div className="saved-photos-section">
              <h3 className="section-title">🖼️ Скачанные фото из пакета ({pkg.photoUrls.length}):</h3>
              <div className="multi-source-photos-grid">
                {pkg.photoUrls.map((url, idx) => (
                  <div key={idx} className="photo-card-item">
                    <img src={url} alt={`Фото ${idx + 1}`} className="photo-thumb" />
                    <div className="photo-info">
                      <span className="photo-source">Файл: photo_{String(idx + 1).padStart(2, '0')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Skript-Текст */}
          <div className="saved-script-section">
            <h3 className="section-title">📜 Текст фельетона (script.txt / script.md):</h3>
            <pre className="script-text-preview">{pkg.scriptTxt || pkg.scriptMd}</pre>
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(pkg.scriptTxt || pkg.scriptMd)
              toast.success('Текст скопирован в буфер обмена!')
            }}
          >
            📋 Скопировать текст
          </button>
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

function NewsCard({ article, index, onGenerate, onOpenPhotos, isGenerating, isSavedPkg, savedPkg, onViewSavedPackage }) {
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

          {isSavedPkg && savedPkg && (
            <button
              className="view-saved-btn"
              onClick={() => onViewSavedPackage(savedPkg)}
              title="Открыть готовый пакет из папки news/"
            >
              📂 Просмотр пакета
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function FeuilletonModal({ feuilleton, onOpenPhotos, onClose }) {
  if (!feuilleton) return null

  const [saving, setSaving] = useState(false)
  const [savedInfo, setSavedInfo] = useState(null)
  const [generatingAudio, setGeneratingAudio] = useState(false)
  const [audioInfo, setAudioInfo] = useState(null)

  const handleSavePackage = async () => {
    setSaving(true)
    const toastId = toast.loading('Сохранение видео-пакета в news/...', {
      description: 'Скачивание 20 фото, файла script.txt и project.json...',
    })

    try {
      const res = await fetch('/api/save-news-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: feuilleton.title,
          text: feuilleton.text,
          model: feuilleton.modelName,
          source: feuilleton.source,
          imageUrl: feuilleton.imageUrl,
          images: feuilleton.images || [],
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения')

      setSavedInfo(data)
      toast.success('📦 Видео-пакет успешно сохранен в news/', {
        id: toastId,
        description: `Папка: news/${data.folderName} (${data.savedPhotosCount} фото скачано). Теперь можно создать аудио!`,
        duration: 10000,
      })
    } catch (err) {
      toast.error('Ошибка сохранения пакета', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleGenerateAudio = async () => {
    if (!savedInfo || !savedInfo.bundleDir) return
    setGeneratingAudio(true)

    let seconds = 0
    const toastId = toast.loading('🎙️ Генерация аудио-файла через edge-tts... [0 сек.]', {
      description: 'Голос: Nikolay (ru-RU-DmitryNeural) | Скорость: 0% | Голос: -10%',
    })

    const timer = setInterval(() => {
      seconds++
      toast.loading(`🎙️ Генерация аудио-файла через edge-tts... [${seconds} сек.]`, {
        id: toastId,
        description: 'Идет обработка текста и синтез речи (Nikolay, 0%, -10%)...',
      })
    }, 1000)

    try {
      const startTime = Date.now()
      const res = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: savedInfo.bundleDir,
          text: feuilleton.text,
        }),
      })

      const data = await res.json()
      clearInterval(timer)

      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка озвучки')

      const totalTimeSec = Math.round((Date.now() - startTime) / 1000)
      setAudioInfo(data)

      toast.success(`🎙️ Аудио-файл audio.mp3 успешно создан за ${totalTimeSec} сек.!`, {
        id: toastId,
        description: `Сохранено в: news/${savedInfo.folderName}/audio.mp3 (Nikolay, 0%, -10%)`,
        duration: 12000,
      })
    } catch (err) {
      clearInterval(timer)
      toast.error('Ошибка создания аудио', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setGeneratingAudio(false)
    }
  }

  const articleImages = feuilleton.images && feuilleton.images.length > 0
    ? feuilleton.images
    : (feuilleton.imageUrl ? [feuilleton.imageUrl] : [])

  let brollImageCounter = 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge">🎭 3-Минутный Сатирический Фельетон</span>
            <h2 className="modal-title">{feuilleton.title}</h2>
            <div className="modal-stats">
              <span>⏱️ Хронометраж: ~{feuilleton.minutes} мин.</span>
              <span>📝 Слов: {feuilleton.words}</span>
              <span>🤖 Модель: {feuilleton.modelName}</span>
            </div>
            {savedInfo && (
              <div className="saved-file-notice">
                📦 Видео-пакет сохранен в: <code>news/{savedInfo.folderName}</code> ({savedInfo.savedPhotosCount} фото скачано)
                {audioInfo && <span> · 🎙️ <code>audio.mp3</code> (Nikolay) создан</span>}
              </div>
            )}
          </div>
          <div className="modal-header-actions">
            <button
              className="photos-header-btn"
              onClick={() => onOpenPhotos({ title: feuilleton.title, images: feuilleton.images, id: feuilleton.id, url: feuilleton.url })}
            >
              🖼️ Фото к новости
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Audio Player im Haupt-Feuilleton-Dialog */}
        {savedInfo && (audioInfo || savedInfo.hasAudio) && (
          <div style={{ padding: '0 1.5rem', marginTop: '1rem' }}>
            <div className="audio-player-box" style={{ marginBottom: 0 }}>
              <div className="audio-player-title">🎙️ Прослушать озвучку Nikolay (audio.mp3, 0%, -10%):</div>
              <audio controls src={`/news-static/${savedInfo.folderName}/audio.mp3`} className="audio-element" autoPlay>
                Ваш браузер не поддерживает элемент audio.
              </audio>
            </div>
          </div>
        )}

        <div className="modal-body">
          {feuilleton.text.split('\n\n').map((paragraph, idx) => {
            const isBRoll = paragraph.startsWith('[B-Roll:')
            if (isBRoll) {
              const currentPhoto = articleImages[brollImageCounter % (articleImages.length || 1)]
              brollImageCounter++

              return (
                <div key={idx} className="broll-inline-card">
                  {currentPhoto && (
                    <div className="broll-photo-wrap">
                      <img
                        src={currentPhoto}
                        alt={`Кадр к новости - ${feuilleton.title}`}
                        className="broll-inline-photo"
                        onError={e => e.target.parentNode.style.display = 'none'}
                      />
                      <div className="broll-photo-badge">
                        📸 Оригинальное фото к этой новости #{((brollImageCounter - 1) % (articleImages.length || 1)) + 1}
                      </div>
                    </div>
                  )}
                  <div className="broll-tag">
                    <span className="broll-icon">🖼️ Visual B-Roll / Кадр:</span> {paragraph.replace('[B-Roll:', '').replace(']', '').trim()}
                  </div>
                </div>
              )
            }

            return (
              <p key={idx} className="feuilleton-p">
                {paragraph}
              </p>
            )
          })}
        </div>

        <div className="modal-footer">
          <button
            className="save-bundle-btn"
            onClick={handleSavePackage}
            disabled={saving || !!savedInfo}
          >
            {saving ? '⏳ Сохранение...' : (savedInfo ? '✅ Пакет сохранен в news/' : '📦 Сохранить видео-пакет в news/')}
          </button>
          
          {savedInfo && (
            <button
              className="audio-gen-btn"
              onClick={handleGenerateAudio}
              disabled={generatingAudio || !!audioInfo}
            >
              {generatingAudio ? '⏳ Озвучка Nikolay...' : (audioInfo ? '🎙️ audio.mp3 создан' : '🎙️ Создать audio.mp3 (Nikolay)')}
            </button>
          )}

          <button
            className="copy-btn"
            onClick={() => {
              navigator.clipboard.writeText(feuilleton.text)
              toast.success('Текст фельетона скопирован в буфер обмена!')
            }}
          >
            📋 Скопировать текст
          </button>
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}

function NewsPhotosModal({ newsTopic, photos, loading, onClose }) {
  if (!newsTopic) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <span className="modal-badge">📸 Оригинальные фото к этой новости (100% Точность)</span>
            <h2 className="modal-title">{newsTopic.title}</h2>
            <div className="modal-stats">
              <span>📰 Все изображения из статьи и прямых репортажей</span>
              {photos.length > 0 && <span>🖼️ Найдено фото: {photos.length}</span>}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {loading && (
            <div className="empty-state">
              <p>⟳ Поиск фотографий из разных источников по теме новости...</p>
            </div>
          )}

          {!loading && photos.length === 0 && (
            <div className="empty-state">
              <p>📷 К этой новости найдены только оригинальные изображения в RSS-ленте.</p>
            </div>
          )}

          {!loading && photos.length > 0 && (
            <div className="multi-source-photos-grid">
              {photos.map((photo, i) => (
                <div key={i} className="photo-card-item">
                  <div className="photo-card-img-wrap">
                    <img
                      src={photo.url}
                      alt={photo.articleTitle}
                      onError={e => e.target.parentNode.style.display = 'none'}
                    />
                    <span className="photo-source-badge">📍 {photo.source}</span>
                  </div>
                  <p className="photo-card-title">{photo.articleTitle}</p>
                </div>
              ))}
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

export default function App() {
  const [articles, setArticles] = useState([])
  const [category, setCategory] = useState('vse')
  const [selectedModel, setSelectedModel] = useState('gemini')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [lastRefresh, setLastRefresh] = useState('')
  const [search, setSearch] = useState('')

  // Feuilleton Generation State
  const [generatingId, setGeneratingId] = useState(null)
  const [currentFeuilleton, setCurrentFeuilleton] = useState(null)

  // News Photos Modal State
  const [photoTopic, setPhotoTopic] = useState(null)
  const [newsPhotos, setNewsPhotos] = useState([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  const handleFetchNewsPhotos = async (article) => {
    setPhotoTopic(article)
    setLoadingPhotos(true)
    setNewsPhotos([])
    try {
      const res = await fetch(`/api/news-photos?title=${encodeURIComponent(article.title)}&articleId=${encodeURIComponent(article.id || '')}&url=${encodeURIComponent(article.url || '')}&category=${encodeURIComponent(article.category || 'alle')}`)
      const data = await res.json()
      if (data.success) {
        setNewsPhotos(data.photos || [])
      }
    } catch (err) {
      toast.error('Ошибка поиска фото', { description: err.message })
    } finally {
      setLoadingPhotos(false)
    }
  }

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/status')
      if (res.ok) setBackendStatus('online')
      else setBackendStatus('offline')
    } catch {
      setBackendStatus('offline')
    }
  }, [])

  const fetchNews = useCallback(async (cat) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/news?category=${cat === 'vse' ? 'alle' : cat}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setArticles(data.articles || [])
      setLastRefresh(new Date().toLocaleTimeString('ru-RU'))
    } catch (err) {
      setError(`Ошибка загрузки новостей: ${err.message}`)
      toast.error('Ошибка загрузки новостей', { description: err.message })
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [])

  // Saved Packages State
  const [savedPackages, setSavedPackages] = useState([])
  const [activeSavedPackage, setActiveSavedPackage] = useState(null)

  const fetchSavedPackages = useCallback(async () => {
    try {
      const res = await fetch('/api/saved-packages')
      const data = await res.json()
      if (data.success) {
        setSavedPackages(data.packages || [])
      }
    } catch (err) {
      console.error('Fetch saved packages error:', err.message)
    }
  }, [])

  useEffect(() => {
    checkStatus()
    fetchNews(category)
    fetchSavedPackages()
  }, [category, fetchNews, checkStatus, fetchSavedPackages])

  const handleGenerate = async (article) => {
    setGeneratingId(article.id)
    const toastId = toast.loading('ИИ пишет 3-минутный фельетон...', {
      description: `Тема: ${article.title.slice(0, 45)}...`,
    })

    try {
      const res = await fetch('/api/generate-feuilleton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          summary: article.summary,
          model: selectedModel,
          source: article.source,
          imageUrl: article.imageUrl,
          images: article.images || (article.imageUrl ? [article.imageUrl] : []),
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка генерации')

      const modelObj = AI_MODELS.find(m => m.id === selectedModel)
      setCurrentFeuilleton({
        title: article.title,
        text: data.text,
        words: data.words,
        minutes: data.minutes,
        modelName: modelObj ? modelObj.name : data.model,
        savedFile: data.savedFile,
        fileName: data.fileName,
        savedPhotosCount: data.savedPhotosCount,
        imageUrl: article.imageUrl,
        images: article.images || (article.imageUrl ? [article.imageUrl] : []),
      })

      toast.success('Фельетон и видео-пакет созданы!', {
        id: toastId,
        description: `Сохранено в news/${data.fileName || ''}`,
        action: {
          label: '🖼️ Фото к новости',
          onClick: () => handleFetchNewsPhotos(article),
        },
        duration: 12000,
      })
    } catch (err) {
      toast.error('Ошибка генерации фельетона', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setGeneratingId(null)
    }
  }

  const filtered = search.trim()
    ? articles.filter(a =>
        a.title?.toLowerCase().includes(search.toLowerCase()) ||
        a.summary?.toLowerCase().includes(search.toLowerCase())
      )
    : articles

  return (
    <div className="app">
      {/* Sonner Toast Container */}
      <Toaster position="top-right" theme="dark" richColors closeButton />

      {/* Header */}
      <header className="app-header">
        <div className="header-inner">
          <div className="header-brand">
            <h1 className="brand-title">ChaosChronicle</h1>
            <p className="brand-sub">Новости · Сатирический Фельетон (3 мин)</p>
          </div>

          <div className="header-actions">
            {/* KI Modell Selectbox */}
            <div className="model-select-wrap">
              <label htmlFor="ai-model-select" className="model-label">🤖 ИИ Модель:</label>
              <select
                id="ai-model-select"
                className="model-select"
                value={selectedModel}
                onChange={e => {
                  setSelectedModel(e.target.value)
                  const m = AI_MODELS.find(x => x.id === e.target.value)
                  if (m) toast.info(`Модель изменена: ${m.name}`)
                }}
              >
                {AI_MODELS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="search-wrap">
              <input
                id="news-search"
                type="text"
                className="search-input"
                placeholder="Поиск новостей..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="search-clear" onClick={() => setSearch('')}>✕</button>
              )}
            </div>

            <button
              id="refresh-btn"
              className="refresh-btn"
              onClick={() => {
                fetchNews(category)
                toast.info('Обновление новостных лент...')
              }}
              disabled={loading}
              title="Обновить"
            >
              <span className={loading ? 'spin' : ''}>↻</span>
            </button>
          </div>
        </div>

        {/* Kategorie-Tabs */}
        <nav className="category-tabs" role="tablist" aria-label="Категории новостей">
          {CATEGORIES.map(cat => (
            <button
              key={cat.key}
              id={`tab-${cat.key}`}
              role="tab"
              aria-selected={category === cat.key}
              className={`tab-btn ${category === cat.key ? 'active' : ''}`}
              style={{ '--tab-color': cat.color }}
              onClick={() => setCategory(cat.key)}
            >
              {cat.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-indicator">
          <span className={`status-dot ${backendStatus === 'online' ? 'online' : 'offline'}`} />
          <span className="status-text">
            Сервер {backendStatus === 'online' ? 'онлайн' : 'недоступен'}
          </span>
        </div>
        {filtered.length > 0 && (
          <span className="status-count">{filtered.length} статей загружено</span>
        )}
        <span className="status-active-model">
          Выбрана модель: <strong>{AI_MODELS.find(m => m.id === selectedModel)?.name}</strong>
        </span>
        {lastRefresh && (
          <span className="status-refresh">
            Обновлено: {lastRefresh}
          </span>
        )}
        {loading && <span className="status-loading">⟳ Загрузка...</span>}
      </div>

      {/* Hauptinhalt */}
      <main className="app-main">
        {error && (
          <div className="error-banner">
            <span>⚠️ {error}</span>
            <button onClick={() => fetchNews(category)}>Попробовать снова</button>
          </div>
        )}

        {loading && articles.length === 0 && (
          <div className="loading-grid">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton-card">
                <div className="skeleton-img" />
                <div className="skeleton-body">
                  <div className="skeleton-line short" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line medium" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="empty-state">
            <p>📰 Статьи не найдены{search ? ` по запросу «${search}»` : ''}.</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="news-grid">
            {filtered.map((article, i) => {
              const matchingSavedPkg = savedPackages.find(p => p.title && article.title && (p.title.includes(article.title.slice(0, 30)) || article.title.includes(p.title.slice(0, 30))))
              return (
                <NewsCard
                  key={article.id || i}
                  article={article}
                  index={i}
                  onGenerate={handleGenerate}
                  onOpenPhotos={handleFetchNewsPhotos}
                  isGenerating={generatingId === article.id}
                  isSavedPkg={!!matchingSavedPkg}
                  savedPkg={matchingSavedPkg}
                  onViewSavedPackage={pkg => setActiveSavedPackage(pkg)}
                />
              )
            })}
          </div>
        )}
      </main>

      {/* Feuilleton Modal */}
      <FeuilletonModal
        feuilleton={currentFeuilleton}
        onOpenPhotos={handleFetchNewsPhotos}
        onClose={() => {
          setCurrentFeuilleton(null)
          fetchSavedPackages()
        }}
      />

      {/* Saved Package Viewer Modal */}
      <SavedPackageModal
        pkg={activeSavedPackage}
        onClose={() => setActiveSavedPackage(null)}
      />

      {/* Multi-Source News Photos Modal */}
      <NewsPhotosModal
        newsTopic={photoTopic}
        photos={newsPhotos}
        loading={loadingPhotos}
        onClose={() => setPhotoTopic(null)}
      />

      <footer className="app-footer">
        <p>ChaosChronicle PoC · Новости из открытых RSS-лент · ИИ: Gemini 3.6 Flash, DeepSeek R1, Qwen</p>
      </footer>
    </div>
  )
}
