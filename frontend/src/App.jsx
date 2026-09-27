import { useState, useEffect, useCallback, useMemo } from 'react'
import { Toaster, toast } from 'sonner'
import ErrorBoundary from './components/ErrorBoundary'
import NewsCard from './components/NewsCard'
import NewsModalsContainer from './components/layout/NewsModalsContainer'
import AppHeader from './components/layout/AppHeader'
import AppStatusBar from './components/layout/AppStatusBar'
import { cleanMatchTitle, matchesSearch, isSportsArticle } from './lib/utils'

export default function App() {
  const [articles, setArticles] = useState([])
  const [category, setCategory] = useState('vse')
  const [selectedModel, setSelectedModel] = useState('gemini')
  const [selectedStyle, setSelectedStyle] = useState('golubuzki')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [backendStatus, setBackendStatus] = useState('checking')
  const [lastRefresh, setLastRefresh] = useState('')
  const [search, setSearch] = useState(''), [visibleCount, setVisibleCount] = useState(30)
  const [mediaFilter, setMediaFilter] = useState('all') // 'all' | 'youtube' | 'feed'
  useEffect(() => { setVisibleCount(30); setMediaFilter('all') }, [category, search])

  // Feuilleton Generation State
  const [generatingId, setGeneratingId] = useState(null)
  const [currentFeuilleton, setCurrentFeuilleton] = useState(null)

  // News Photos Modal State
  const [photoTopic, setPhotoTopic] = useState(null)
  const [newsPhotos, setNewsPhotos] = useState([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  const [savedPackages, setSavedPackages] = useState([]), [activeSavedPackage, setActiveSavedPackage] = useState(null), [savingPackageId, setSavingPackageId] = useState(null)
  const [scriptTextPackage, setScriptTextPackage] = useState(null), [audioPackage, setAudioPackage] = useState(null), [videoPackage, setVideoPackage] = useState(null)
  const [showCustomNewsModal, setShowCustomNewsModal] = useState(false), [showYouTubeModal, setShowYouTubeModal] = useState(false), [originalTextArticle, setOriginalTextArticle] = useState(null)

  const handleCustomNewsCreated = (newArticle, autoOpenFeuilleton = false) => {
    setArticles(prev => [newArticle, ...prev])
    if (autoOpenFeuilleton) handleGenerate(newArticle)
  }

  const handleFetchNewsPhotos = async (article, forceLive = false) => {
    if (!article) return
    setPhotoTopic(article); setLoadingPhotos(true); setNewsPhotos([])
    const toastId = forceLive ? toast.loading('🔎 Поиск 30 фото в мировых агентствах...', { description: article.title }) : toast.loading('📸 Поиск фото...', { description: article.title })
    try {
      const folderName = article.matchingPkg?.folderName || article.folderName || '', bundleDir = article.matchingPkg?.bundleDir || article.bundleDir || ''
      const params = new URLSearchParams({ title: article.title || '', articleId: article.id || '', url: article.url || '', folderName, bundleDir, forceLive: forceLive ? 'true' : 'false' })
      const res = await fetch(`/api/news-photos?${params}`), data = await res.json()
      if (data.success) { setNewsPhotos(data.photos || []); toast.success(`Найдено ${data.count} фото!`, { id: toastId }) }
      else { toast.error('Не удалось загрузить фото', { id: toastId, description: data.error }) }
    } catch (err) {
      if (err.name === 'AbortError') toast.info('Поиск фото отменен', { id: toastId })
      else toast.error('Ошибка поиска фото', { description: err.message })
    } finally { setLoadingPhotos(false) }
  }

  const checkStatus = useCallback(async () => {
    try { const res = await fetch('/api/status'); setBackendStatus(res.ok ? 'online' : 'offline') } catch { setBackendStatus('offline') }
  }, [])

  useEffect(() => {
    const loadFonts = async () => {
      try {
        const res = await fetch('/api/custom-fonts'), data = await res.json()
        if (data.success && Array.isArray(data.fonts)) {
          data.fonts.forEach(async (f) => {
            try {
              const aliases = [f.name, f.name.replace(/_/g, ' '), f.name.replace(/[-_]?(Regular|Bold)/gi, '').replace(/_/g, ' ').trim()]
              for (const alias of [...new Set(aliases.filter(Boolean))]) {
                const fontFace = new FontFace(alias, `url(${f.url})`); await fontFace.load(); document.fonts.add(fontFace)
              }
            } catch {}
          })
        }
      } catch {}
    }
    loadFonts()
  }, [])

  const fetchSavedPackages = useCallback(async () => {
    try {
      const res = await fetch('/api/saved-packages?force=true')
      const data = await res.json()
      if (data.success) {
        const pkgs = data.packages || []
        setSavedPackages(pkgs)
        const params = new URLSearchParams(window.location.search)
        const pkgParam = params.get('pkg')
        setActiveSavedPackage(current => {
          const targetFolder = current?.folderName || pkgParam
          if (!targetFolder) return current
          const found = pkgs.find(p => p.folderName === targetFolder)
          return found ? { ...(current || {}), ...found } : current
        })
        return pkgs
      }
    } catch (err) {
      console.error('Fetch saved packages error:', err.message)
    }
    return []
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
    if (!pkg) return
    const folder = pkg.folderName || pkg.matchingPkg?.folderName || (typeof pkg.id === 'string' && pkg.id.startsWith('pkg-') ? pkg.id.replace('pkg-', '') : null)
    const cleanT = cleanMatchTitle(pkg.title)
    const found = (savedPackages || []).find(p => (folder && p.folderName === folder) || (folder && p.folderName?.includes(folder)) || (cleanT && cleanMatchTitle(p.title) === cleanT))
    const targetPkg = found ? { ...pkg, ...found } : pkg
    setActiveSavedPackage(targetPkg)
    const effectiveFolder = folder || targetPkg.folderName
    if (effectiveFolder) updateUrlState(effectiveFolder)
  }

  const handleCloseSavedPackage = () => { setActiveSavedPackage(null); updateUrlState(null); }

  useEffect(() => {
    checkStatus(); fetchNews(category); fetchSavedPackages();
  }, [category, fetchNews, checkStatus, fetchSavedPackages])

  const handleSaveArticleToPackage = async (article) => {
    const artKey = article.id || article.title
    setSavingPackageId(artKey)
    const toastId = toast.loading('💾 Скачивание статьи и создание пакета в news/...')
    try {
      const res = await fetch('/api/save-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: article.title,
          folderName: article.folderName || article.matchingPkg?.folderName,
          url: article.url || article.link || '',
          source: article.source || 'RSS / Telegram',
          summary: article.summary || article.original_news || '',
          photos: article.images || (article.imageUrl ? [article.imageUrl] : []),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('📦 Пакет успешно сохранен на диск!', { id: toastId })
        const freshPackages = await fetchSavedPackages()
        const found = (freshPackages || []).find(p => p.folderName === data.folderName)
        const targetPkg = found || {
          folderName: data.folderName,
          bundleDir: data.bundleDir,
          title: article.title,
          url: article.url || article.link,
          summary: article.summary || article.original_news || '',
          photosCount: data.savedPhotosCount || 0,
        }
        handleOpenSavedPackage(targetPkg)
      } else {
        toast.error('❌ Ошибка сохранения: ' + (data.error || 'Не удалось сохранить'), { id: toastId })
      }
    } catch (err) {
      toast.error('❌ Ошибка: ' + err.message, { id: toastId })
    } finally {
      setSavingPackageId(null)
    }
  }

  const handleGenerate = (article, customStyle = null) => {
    const pkg = article.matchingPkg
    setCurrentFeuilleton({
      id: article.id, title: pkg?.title || article.title, originalTitle: pkg?.original_title || article.title,
      summary: pkg?.summary || pkg?.original_news || article.original_news || article.summary || article.sourceText || '',
      source: pkg?.source || article.source,
      url: article.url || article.link || pkg?.url || '',
      imageUrl: article.imageUrl || pkg?.coverUrl || pkg?.thumbnailUrl,
      images: article.images || pkg?.photoUrls || (article.imageUrl ? [article.imageUrl] : []),
      text: pkg?.scriptTxt || '', style: customStyle || pkg?.style || selectedStyle,
      modelName: pkg?.model || selectedModel, tone: pkg?.tone || 'grotesque',
      isDraft: !pkg, matchingPkg: pkg, bundleDir: pkg?.bundleDir, folderName: pkg?.folderName,
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
      return savedItems.filter(a => matchesSearch(a, q))
    }

    const prePkgs = (savedPackages || []).map(p => ({
      pkg: p,
      t: cleanMatchTitle(p?.title).slice(0, 14),
      o: cleanMatchTitle(p?.original_title).slice(0, 14),
      f: cleanMatchTitle(p?.folderName?.replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, '')).slice(0, 14),
    }))
    const regularWithPkg = articles
      .filter(a => !isSportsArticle(a))
      .filter(a => category === 'vse' ? (a.category !== 'tekh' && a.category !== 'tech') : true)
      .map(a => {
        const artClean = cleanMatchTitle(a?.title)
        if (!artClean) return a
        const m = prePkgs.find(cp => (cp.o && (artClean.includes(cp.o) || cp.o.includes(artClean.slice(0, 14)))) ||
          (cp.t && (artClean.includes(cp.t) || cp.t.includes(artClean.slice(0, 14)))) ||
          (cp.f && (artClean.includes(cp.f) || cp.f.includes(artClean.slice(0, 14)))))
        if (m) {
          const effectiveUrl = a.url || a.link || m.pkg.url || m.pkg.original_url || null
          return { ...a, url: effectiveUrl, matchingPkg: { ...m.pkg, url: effectiveUrl } }
        }
        return a
      })

    let list = regularWithPkg
    if (mediaFilter === 'youtube') {
      list = list.filter(a => a.isYouTube || (a.url || '').includes('youtube.com') || (a.url || '').includes('youtu.be'))
    } else if (mediaFilter === 'feed') {
      list = list.filter(a => !a.isYouTube && !(a.url || '').includes('youtube.com') && !(a.url || '').includes('youtu.be'))
    }

    return q ? list.filter(a => matchesSearch(a, q)) : list
  }, [articles, savedPackages, search, category, mediaFilter])

  const ytCount = useMemo(() => {
    return articles.filter(a => a.isYouTube || (a.url || '').includes('youtube.com') || (a.url || '').includes('youtu.be')).length
  }, [articles])

  const feedCount = useMemo(() => {
    return articles.filter(a => !a.isYouTube && !(a.url || '').includes('youtube.com') && !(a.url || '').includes('youtu.be')).length
  }, [articles])

  return (
    <div className="app-layout">
      {/* 🔔 Всплывающие уведомления Sonner */}
      <Toaster richColors position="top-right" theme="dark" closeButton duration={3500} />

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
        onOpenCustomNews={() => setShowCustomNewsModal(true)}
        onOpenYouTubeImport={() => setShowYouTubeModal(true)}
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

        {/* Панель выбора: Все / YouTube Видео / RSS Новости */}
        {category !== 'saved' && (ytCount > 0 || feedCount > 0) && (
          <div
            className="media-filter-bar"
            style={{
              display: 'flex',
              gap: '0.6rem',
              alignItems: 'center',
              marginBottom: '1.25rem',
              background: 'rgba(24, 24, 27, 0.75)',
              padding: '0.55rem 0.9rem',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(8px)',
              flexWrap: 'wrap',
            }}
          >
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#a1a1aa', marginRight: '0.25rem' }}>
              🎯 Источник:
            </span>
            <button
              type="button"
              onClick={() => setMediaFilter('all')}
              style={{
                background: mediaFilter === 'all' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : '#27272a',
                color: '#ffffff',
                border: mediaFilter === 'all' ? '1px solid #60a5fa' : '1px solid #3f3f46',
                borderRadius: '8px',
                padding: '0.38rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: mediaFilter === 'all' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: mediaFilter === 'all' ? '0 2px 8px rgba(59, 130, 246, 0.4)' : 'none',
              }}
            >
              <span>🌟 Все материалы</span>
              <span style={{ opacity: 0.85, fontSize: '0.74rem', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>
                {articles.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMediaFilter('youtube')}
              style={{
                background: mediaFilter === 'youtube' ? 'linear-gradient(135deg, #dc2626, #b91c1c)' : '#27272a',
                color: '#ffffff',
                border: mediaFilter === 'youtube' ? '1px solid #f87171' : '1px solid #3f3f46',
                borderRadius: '8px',
                padding: '0.38rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: mediaFilter === 'youtube' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: mediaFilter === 'youtube' ? '0 2px 8px rgba(220, 38, 38, 0.4)' : 'none',
              }}
            >
              <span>🎬 YouTube Видео</span>
              <span style={{ opacity: 0.85, fontSize: '0.74rem', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>
                {ytCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMediaFilter('feed')}
              style={{
                background: mediaFilter === 'feed' ? 'linear-gradient(135deg, #10b981, #059669)' : '#27272a',
                color: '#ffffff',
                border: mediaFilter === 'feed' ? '1px solid #34d399' : '1px solid #3f3f46',
                borderRadius: '8px',
                padding: '0.38rem 0.85rem',
                fontSize: '0.82rem',
                fontWeight: mediaFilter === 'feed' ? 700 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: mediaFilter === 'feed' ? '0 2px 8px rgba(16, 185, 129, 0.4)' : 'none',
              }}
            >
              <span>📰 RSS Новости</span>
              <span style={{ opacity: 0.85, fontSize: '0.74rem', background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '6px' }}>
                {feedCount}
              </span>
            </button>
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
          <>
            <div className="news-grid">
              {filtered.slice(0, visibleCount).map((article, i) => {
                const matchingSavedPkg = article.matchingPkg
                return (
                  <NewsCard
                    key={article.id || i}
                    article={article}
                    index={i}
                    onGenerate={handleGenerate}
                    onSavePackage={handleSaveArticleToPackage}
                    onOpenPhotos={handleFetchNewsPhotos}
                    isGenerating={generatingId === article.id}
                    isSaving={savingPackageId === (article.id || article.title)}
                    isSavedPkg={!!matchingSavedPkg}
                    savedPkg={matchingSavedPkg}
                    onViewSavedPackage={pkg => handleOpenSavedPackage(pkg)}
                    onOpenOriginal={art => setOriginalTextArticle(art)}
                  />
                )
              })}
            </div>
            {filtered.length > visibleCount && (
              <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
                <button
                  onClick={() => setVisibleCount(v => v + 30)}
                  style={{
                    padding: '0.75rem 2rem', borderRadius: '10px', background: 'var(--accent, #3b82f6)',
                    color: '#fff', fontWeight: 700, fontSize: '0.95rem', border: 'none', cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.5rem'
                  }}
                >
                  📰 Показать ещё (+{Math.min(30, filtered.length - visibleCount)}) — показано {Math.min(visibleCount, filtered.length)} из {filtered.length}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Модальные окна с защитой ErrorBoundary */}
      <ErrorBoundary>
        <NewsModalsContainer
          currentFeuilleton={currentFeuilleton} setCurrentFeuilleton={setCurrentFeuilleton}
          activeSavedPackage={activeSavedPackage} handleCloseSavedPackage={handleCloseSavedPackage}
          scriptTextPackage={scriptTextPackage} setScriptTextPackage={setScriptTextPackage}
          audioPackage={audioPackage} setAudioPackage={setAudioPackage} setVideoPackage={setVideoPackage}
          photoTopic={photoTopic} setPhotoTopic={setPhotoTopic} newsPhotos={newsPhotos}
          loadingPhotos={loadingPhotos} handleFetchNewsPhotos={handleFetchNewsPhotos}
          fetchSavedPackages={fetchSavedPackages} showCustomNewsModal={showCustomNewsModal}
          setShowCustomNewsModal={setShowCustomNewsModal} showYouTubeModal={showYouTubeModal}
          setShowYouTubeModal={setShowYouTubeModal} onCustomNewsCreated={handleCustomNewsCreated}
          onOpenPackage={handleOpenSavedPackage} originalTextArticle={originalTextArticle}
          setOriginalTextArticle={setOriginalTextArticle} onGenerateFeuilleton={handleGenerate}
        />
      </ErrorBoundary>

      <footer className="app-footer">
        <p>ChaosChronicle PoC · Новости из открытых RSS-лент · ИИ: Gemini 3.7 Flash, DeepSeek R1, Qwen</p>
      </footer>
    </div>
  )
}
