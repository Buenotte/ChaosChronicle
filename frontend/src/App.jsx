import { useState, useEffect, useCallback } from 'react'
import { Toaster, toast } from 'sonner'

import { CATEGORIES, AI_MODELS, cleanMatchTitle } from './lib/utils'
import NewsCard from './components/NewsCard'
import FeuilletonModal from './components/FeuilletonModal'
import VideoPackageModal from './components/VideoPackageModal'
import NewsScriptModal from './components/NewsScriptModal'
import NewsAudioModal from './components/NewsAudioModal'
import NewsPhotosModal from './components/NewsPhotosModal'

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

  // Saved Video Packages State
  const [savedPackages, setSavedPackages] = useState([])
  const [activeSavedPackage, setActiveSavedPackage] = useState(null)
  const [scriptTextPackage, setScriptTextPackage] = useState(null)
  const [audioPackage, setAudioPackage] = useState(null)
  const [videoPackage, setVideoPackage] = useState(null)

  const handleFetchNewsPhotos = async (article, forceLive = false) => {
    if (!article) return
    setPhotoTopic(article)
    setLoadingPhotos(true)
    setNewsPhotos([])

    const toastId = forceLive
      ? toast.loading('🔎 Поиск 30 фото в мировых агентствах...', { description: article.title })
      : null

    try {
      const url = `/api/news-photos?title=${encodeURIComponent(article.title)}&articleId=${encodeURIComponent(article.id || '')}&url=${encodeURIComponent(article.url || '')}&category=${encodeURIComponent(article.category || 'alle')}${forceLive ? '&forceLive=true' : ''}`
      const res = await fetch(url)
      const data = await res.json()
      if (data.success) {
        setNewsPhotos(data.photos || [])
        if (toastId) {
          toast.success(`📸 Найдено ${data.count} фото из агентств!`, { id: toastId })
        }
      }
    } catch (err) {
      if (toastId) toast.error('Ошибка поиска фото', { id: toastId, description: err.message })
      else toast.error('Ошибка поиска фото', { description: err.message })
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

  const fetchNews = useCallback(async (cat, force = false) => {
    setLoading(true)
    setError(null)
    try {
      const url = `/api/news?category=${cat === 'vse' ? 'alle' : cat}${force ? '&force=true' : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setArticles(data.articles || [])
      setLastRefresh(new Date().toLocaleTimeString('ru-RU'))

      if (force) {
        toast.success('Ленты новостей успешно обновлены!')
      }
    } catch (err) {
      setError(`Ошибка загрузки новостей: ${err.message}`)
      toast.error('Ошибка загрузки новостей', { description: err.message })
      setArticles([])
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSavedPackages = useCallback(async () => {
    try {
      const res = await fetch('/api/saved-packages')
      const data = await res.json()
      if (data.success) {
        const pkgs = data.packages || []
        setSavedPackages(pkgs)
        setActiveSavedPackage(current => {
          if (!current) return null
          const updated = pkgs.find(p => p.folderName === current.folderName)
          return updated ? { ...current, ...updated } : current
        })
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
      const feuObj = {
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
        id: article.id,
        url: article.url,
        source: article.source,
      }
      setCurrentFeuilleton(feuObj)

      toast.success('🎭 Фельетон успешно создан!', {
        id: toastId,
        description: `📜 Текст: ✅ Готов (${data.words} слов) | 📦 Пакет: ⚠️ Не сохранен в news/ | 🎙️ Аудио: ⚠️ Не создано`,
        action: {
          label: '📂 Открыть и сохранить',
          onClick: () => setCurrentFeuilleton(feuObj),
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
                fetchNews(category, true)
                toast.info('Обновление свежих новостей из RSS...')
              }}
              disabled={loading}
              title="Обновить свежие новости"
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
              const articleClean = cleanMatchTitle(article?.title)
              const matchingSavedPkg = (savedPackages || []).find(p => {
                const pClean = cleanMatchTitle(p?.title || p?.folderName)
                if (!pClean || !articleClean) return false
                const subArt = articleClean.slice(0, 12)
                const subPkg = pClean.slice(0, 12)
                return pClean.includes(subArt) || articleClean.includes(subPkg)
              })

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

      {/* Video Package Viewer Modal */}
      <VideoPackageModal
        pkg={activeSavedPackage}
        onOpenPhotos={handleFetchNewsPhotos}
        onOpenScriptText={pkg => setScriptTextPackage(pkg)}
        onOpenAudio={pkg => setAudioPackage(pkg)}
        onOpenVideo={pkg => setVideoPackage(pkg)}
        onClose={() => setActiveSavedPackage(null)}
        onRefresh={fetchSavedPackages}
      />

      {/* Script Text Editor Modal */}
      <NewsScriptModal
        pkg={scriptTextPackage}
        onClose={() => setScriptTextPackage(null)}
        onSaved={fetchSavedPackages}
      />

      {/* News Audio Player Modal */}
      <NewsAudioModal
        pkg={audioPackage}
        onClose={() => setAudioPackage(null)}
        onRefresh={fetchSavedPackages}
      />

      {/* Multi-Source News Photos Modal */}
      <NewsPhotosModal
        newsTopic={photoTopic}
        photos={newsPhotos}
        loading={loadingPhotos}
        onClose={() => setPhotoTopic(null)}
        onSaved={fetchSavedPackages}
        onReload={() => handleFetchNewsPhotos(photoTopic, true)}
      />

      <footer className="app-footer">
        <p>ChaosChronicle PoC · Новости из открытых RSS-лент · ИИ: Gemini 3.6 Flash, DeepSeek R1, Qwen</p>
      </footer>
    </div>
  )
}
