import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import NewsCard from './components/NewsCard'
import NewsModalsContainer from './components/layout/NewsModalsContainer'
import AppHeader from './components/layout/AppHeader'
import AppStatusBar from './components/layout/AppStatusBar'
import { cleanMatchTitle } from './lib/utils'

export default function App() {
  const [articles, setArticles] = useState([])
  const [category, setCategory] = useState('vse')
  const [selectedModel, setSelectedModel] = useState('gemini')
  const [selectedStyle, setSelectedStyle] = useState('golubuzki')
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
      : toast.loading('📸 Поиск фото...', { description: article.title })

    try {
      const folderName = article.matchingPkg?.folderName || article.folderName || ''
      const bundleDir = article.matchingPkg?.bundleDir || article.bundleDir || ''
      const params = new URLSearchParams({
        title: article.title || '',
        articleId: article.id || '',
        url: article.url || '',
        folderName,
        bundleDir,
        forceLive: forceLive ? 'true' : 'false',
      })
      const res = await fetch(`/api/news-photos?${params}`)
      const data = await res.json()
      if (data.success) {
        setNewsPhotos(data.photos || [])
        toast.success(`Найдено ${data.count} фото!`, { id: toastId })
      } else {
        toast.error('Не удалось загрузить фото', { id: toastId, description: data.error })
      }
    } catch (err) {
      if (err.name === 'AbortError') toast.info('Поиск фото отменен', { id: toastId })
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

  const fetchSavedPackages = useCallback(async () => {
    try {
      const res = await fetch('/api/saved-packages')
      const data = await res.json()
      if (data.success) {
        const pkgs = data.packages || []
        setSavedPackages(pkgs)

        const params = new URLSearchParams(window.location.search)
        const pkgParam = params.get('pkg')

        setActiveSavedPackage(current => {
          const targetFolder = current?.folderName || pkgParam
          if (!targetFolder) return null
          const found = pkgs.find(p => p.folderName === targetFolder)
          return found ? { ...(current || {}), ...found } : current
        })
      }
    } catch (err) {
      console.error('Fetch saved packages error:', err.message)
    }
  }, [])

  const fetchNews = useCallback(async (cat, force = false) => {
    if (cat === 'saved') {
      fetchSavedPackages()
      setLastRefresh(new Date().toLocaleTimeString('ru-RU'))
      return
    }
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
  }, [fetchSavedPackages])

  const updateUrlState = (pkgFolder, modalName) => {
    try {
      const url = new URL(window.location.href)
      if (pkgFolder) {
        url.searchParams.set('pkg', pkgFolder)
        if (modalName) {
          url.searchParams.set('modal', modalName)
        } else {
          url.searchParams.delete('modal')
        }
      } else {
        url.searchParams.delete('pkg')
        url.searchParams.delete('modal')
      }
      window.history.replaceState({}, '', url.toString())
    } catch {}
  }

  const handleOpenSavedPackage = (pkg) => {
    setActiveSavedPackage(pkg)
    if (pkg?.folderName) {
      updateUrlState(pkg.folderName)
    }
  }

  const handleCloseSavedPackage = () => {
    setActiveSavedPackage(null)
    updateUrlState(null)
  }

  useEffect(() => {
    checkStatus()
    fetchNews(category)
    fetchSavedPackages()
  }, [category, fetchNews, checkStatus, fetchSavedPackages])

  const handleGenerate = (article, customStyle = null) => {
    setCurrentFeuilleton({
      id: article.id,
      title: article.title,
      originalTitle: article.title,
      summary: article.summary,
      source: article.source,
      url: article.url || article.link || '',
      imageUrl: article.imageUrl,
      images: article.images || (article.imageUrl ? [article.imageUrl] : []),
      text: '',
      style: customStyle || selectedStyle,
      modelName: selectedModel,
      isDraft: true,
    })
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (category === 'saved') {
      const savedItems = (savedPackages || []).map(p => ({
        id: `pkg-${p.folderName}`,
        title: p.title || p.original_title || p.folderName,
        url: p.url || p.original_url || p.link || null,
        summary: p.summary || p.scriptTxt?.slice(0, 200) || 'Готовый сохраненный видео-пакет в news/',
        source: p.source || 'ChaosChronicle',
        pubDate: p.date || p.created_at,
        imageUrl: p.coverUrl || p.thumbnailUrl || (p.photoUrls && p.photoUrls[0]) || null,
        images: p.photoUrls || [],
        matchingPkg: p,
      }))
      if (!q) return savedItems
      return savedItems.filter(
        a =>
          a.title?.toLowerCase().includes(q) ||
          a.summary?.toLowerCase().includes(q) ||
          a.source?.toLowerCase().includes(q)
      )
    }

    const regularWithPkg = articles.map(a => {
      const artClean = cleanMatchTitle(a?.title)
      const matchingPkg = (savedPackages || []).find(p => {
        if (!artClean) return false
        const pkgTitleClean = cleanMatchTitle(p?.title)
        const pkgOrigClean = cleanMatchTitle(p?.original_title)
        const pkgFolderClean = cleanMatchTitle(p?.folderName?.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, ''))

        if (pkgOrigClean && (artClean.includes(pkgOrigClean.slice(0, 14)) || pkgOrigClean.includes(artClean.slice(0, 14)))) return true
        if (pkgTitleClean && (artClean.includes(pkgTitleClean.slice(0, 14)) || pkgTitleClean.includes(artClean.slice(0, 14)))) return true
        if (pkgFolderClean && (artClean.includes(pkgFolderClean.slice(0, 14)) || pkgFolderClean.includes(artClean.slice(0, 14)))) return true
        return false
      })

      if (matchingPkg) {
        const effectiveUrl = a.url || a.link || matchingPkg.url || matchingPkg.original_url || null
        return { ...a, url: effectiveUrl, matchingPkg: { ...matchingPkg, url: effectiveUrl } }
      }
      return a
    })

    if (!q) return regularWithPkg
    return regularWithPkg.filter(
      a =>
        a.title?.toLowerCase().includes(q) ||
        a.summary?.toLowerCase().includes(q) ||
        a.source?.toLowerCase().includes(q)
    )
  }, [articles, savedPackages, search, category])

  return (
    <div className="app-layout">
      {/* Верхняя панель */}
      <AppHeader
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        selectedStyle={selectedStyle}
        setSelectedStyle={setSelectedStyle}
        search={search}
        setSearch={setSearch}
        category={category}
        setCategory={setCategory}
        onRefresh={() => (category === 'saved' ? fetchSavedPackages() : fetchNews(category, true))}
        loading={loading}
        savedCount={savedPackages?.length || 0}
      />

      {/* Информационная строка статуса */}
      <AppStatusBar
        backendStatus={backendStatus}
        filteredCount={filtered.length}
        selectedModel={selectedModel}
        lastRefresh={lastRefresh}
        loading={loading}
      />

      {/* Основной контент */}
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
              const matchingSavedPkg = article.matchingPkg
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
                  onViewSavedPackage={pkg => handleOpenSavedPackage(pkg)}
                />
              )
            })}
          </div>
        )}
      </main>

      {/* Модальные окна */}
      <NewsModalsContainer
        currentFeuilleton={currentFeuilleton}
        setCurrentFeuilleton={setCurrentFeuilleton}
        activeSavedPackage={activeSavedPackage}
        handleCloseSavedPackage={handleCloseSavedPackage}
        scriptTextPackage={scriptTextPackage}
        setScriptTextPackage={setScriptTextPackage}
        audioPackage={audioPackage}
        setAudioPackage={setAudioPackage}
        setVideoPackage={setVideoPackage}
        photoTopic={photoTopic}
        setPhotoTopic={setPhotoTopic}
        newsPhotos={newsPhotos}
        loadingPhotos={loadingPhotos}
        handleFetchNewsPhotos={handleFetchNewsPhotos}
        fetchSavedPackages={fetchSavedPackages}
      />

      <footer className="app-footer">
        <p>ChaosChronicle PoC · Новости из открытых RSS-лент · ИИ: Gemini 3.7 Flash, DeepSeek R1, Qwen</p>
      </footer>
    </div>
  )
}
