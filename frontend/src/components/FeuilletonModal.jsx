import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { FEUILLETON_STYLES, YOUTUBE_TOPIC_STYLES, AI_MODELS } from '../lib/utils'
import ScriptHookGenerator from './script/ScriptHookGenerator'

const ALL_STYLES = [...YOUTUBE_TOPIC_STYLES, ...FEUILLETON_STYLES]

export default function FeuilletonModal({ feuilleton, onOpenPhotos, onOpenPackage, onClose, onRefreshPackages }) {
  if (!feuilleton) return null

  const [currentText, setCurrentText] = useState(feuilleton.text || feuilleton.scriptTxt || '')
  const [currentTitle, setCurrentTitle] = useState(feuilleton.title || '')
  const [originalNews, setOriginalNews] = useState(feuilleton.original_news || feuilleton.summary || feuilleton.originalNews || feuilleton.sourceText || '')
  const [isEditingOriginal, setIsEditingOriginal] = useState(false)
  const [showOriginal, setShowOriginal] = useState(true)
  const [scrapingUrl, setScrapingUrl] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState(feuilleton.style || feuilleton.scriptStyle || 'kasjanov')
  const [selectedModel, setSelectedModel] = useState(feuilleton.modelName || feuilleton.model || 'gemini')
  const [selectedTone, setSelectedTone] = useState(feuilleton.tone || 'grotesque')
  const [scriptFormat, setScriptFormat] = useState(feuilleton.scriptFormat || 'feuilleton') // 'feuilleton' (цельный текст) vs 'facts' (по пунктам со счетом)
  const [customPrompt, setCustomPrompt] = useState(feuilleton.customPrompt || '')
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedInfo, setSavedInfo] = useState(feuilleton.bundleDir || feuilleton.matchingPkg ? (feuilleton.matchingPkg || feuilleton) : null)

  useEffect(() => {
    if (feuilleton) {
      setCurrentText(feuilleton.text || feuilleton.scriptTxt || '')
      setCurrentTitle(feuilleton.title || '')
      const initOrig = feuilleton.original_news || feuilleton.summary || feuilleton.originalNews || feuilleton.sourceText || ''
      setOriginalNews(initOrig)
      setSelectedStyle(feuilleton.style || feuilleton.scriptStyle || 'kasjanov')
      setSelectedModel(feuilleton.modelName || feuilleton.model || 'gemini')
      setSelectedTone(feuilleton.tone || 'grotesque')
      setScriptFormat(feuilleton.scriptFormat || 'feuilleton')
      setCustomPrompt(feuilleton.customPrompt || '')
      setSavedInfo(feuilleton.bundleDir || feuilleton.matchingPkg ? (feuilleton.matchingPkg || feuilleton) : null)

      const fName = feuilleton.folderName || feuilleton.matchingPkg?.folderName || ''
      const bDir = feuilleton.bundleDir || feuilleton.matchingPkg?.bundleDir || ''
      if (fName || bDir) {
        const params = new URLSearchParams({ folderName: fName, bundleDir: bDir })
        fetch(`/api/package-script-text?${params}`)
          .then(r => r.json())
          .then(data => {
            if (data.success) {
              if (typeof data.text === 'string' && !feuilleton.text) setCurrentText(data.text)
              if (data.originalNews || data.summary) setOriginalNews(data.originalNews || data.summary)
            }
          })
          .catch(() => {})
      }
    }
  }, [feuilleton])

  const handleOpenSaved = () => {
    const info = savedInfo || feuilleton.matchingPkg || feuilleton
    if (onOpenPackage) {
      onOpenPackage({
        ...feuilleton,
        ...(feuilleton.matchingPkg || {}),
        ...(info || {}),
        title: currentTitle || feuilleton.title,
        folderName: info?.folderName || feuilleton.folderName || feuilleton.matchingPkg?.folderName,
        bundleDir: info?.bundleDir || feuilleton.bundleDir || feuilleton.matchingPkg?.bundleDir,
        scriptTxt: currentText,
        original_news: originalNews,
        summary: originalNews,
        scriptFormat,
      })
    }
  }

  const handleScrapeArticle = async () => {
    const targetUrl = feuilleton.url || feuilleton.link || feuilleton.matchingPkg?.url || ''
    if (!targetUrl) return toast.error('URL статьи не найден в новости')
    setScrapingUrl(true)
    const toastId = toast.loading('🌐 Загрузка полного текста статьи по ссылке...', { description: targetUrl })
    try {
      const res = await fetch('/api/scrape-article-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: targetUrl,
          bundleDir: feuilleton.bundleDir || savedInfo?.bundleDir || feuilleton.matchingPkg?.bundleDir,
          folderName: feuilleton.folderName || savedInfo?.folderName || feuilleton.matchingPkg?.folderName,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось загрузить статью')

      setOriginalNews(data.text)
      feuilleton.original_news = data.text
      feuilleton.summary = data.text
      setShowOriginal(true)
      if (onRefreshPackages) onRefreshPackages()
      toast.success(`🎉 Полная статья загружена (${data.wordCount || data.text.split(/\s+/).filter(Boolean).length} слов)!`, { id: toastId })
    } catch (err) {
      toast.error('Ошибка загрузки статьи', { id: toastId, description: err.message })
    } finally {
      setScrapingUrl(false)
    }
  }

  const words = currentText.split(/\s+/).filter(Boolean).length
  const minutes = Math.round((words / 140) * 10) / 10

  const handleRegenerateStyle = async (newStyle = selectedStyle, newModel = selectedModel, newTone = selectedTone, newFormat = scriptFormat) => {
    setSelectedStyle(newStyle); setSelectedModel(newModel); setSelectedTone(newTone); setScriptFormat(newFormat); setRegenerating(true)
    const styleName = ALL_STYLES.find(s => s.id === newStyle)?.name || newStyle
    const modelName = AI_MODELS.find(m => m.id === newModel)?.name || newModel
    const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(newStyle)
    const formatTag = newFormat === 'feuilleton' ? '🎭 Фельетон' : '🔢 По пунктам'
    const toastLabel = isYt ? `🎬 Генерация сценария (${styleName.split(' (')[0]}, ${formatTag})` : `🔄 Генерация текста (${newTone === 'analytics' ? '🧠 Аналитика' : '💥 Сатира'}, ${formatTag})`
    const toastId = toast.loading(toastLabel + '...', { description: `${modelName} | ${styleName}` })

    try {
      const effectiveOrig = originalNews || feuilleton.original_news || feuilleton.summary || feuilleton.sourceText || ''
      const res = await fetch('/api/generate-feuilleton', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: feuilleton.originalTitle || feuilleton.title,
          summary: effectiveOrig,
          original_news: effectiveOrig,
          model: newModel,
          style: newStyle,
          tone: newTone,
          scriptFormat: newFormat,
          customPrompt: customPrompt.trim(),
          source: feuilleton.source,
          imageUrl: feuilleton.imageUrl,
          images: feuilleton.images || [],
          folderName: feuilleton.folderName || feuilleton.matchingPkg?.folderName || savedInfo?.folderName,
          bundleDir: feuilleton.bundleDir || feuilleton.matchingPkg?.bundleDir || savedInfo?.bundleDir,
          url: feuilleton.url || feuilleton.link || feuilleton.matchingPkg?.url || '',
          saveToPackage: Boolean(feuilleton.folderName || feuilleton.matchingPkg?.folderName || savedInfo?.folderName),
          clearCachedFacts: true,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка генерации')
      const fData = data.feuilleton || data
      setCurrentText(fData.text || ''); setCurrentTitle(fData.title || currentTitle); setSelectedStyle(newStyle); setSelectedModel(newModel); setScriptFormat(newFormat)
      if (fData.original_news || fData.summary) {
        setOriginalNews(fData.original_news || fData.summary)
        feuilleton.original_news = fData.original_news || fData.summary
        feuilleton.summary = fData.original_news || fData.summary
      }
      if (feuilleton.matchingPkg) {
        feuilleton.matchingPkg.scriptTxt = fData.text || ''
        feuilleton.matchingPkg.scriptFormat = newFormat
        if (fData.title) feuilleton.matchingPkg.title = fData.title
        if (fData.original_news) feuilleton.matchingPkg.original_news = fData.original_news
      }
      if (onRefreshPackages) onRefreshPackages()
      toast.success(`✨ Сценарий (${formatTag}) готов!`, { id: toastId })
    } catch (err) { toast.error('Ошибка перегенерации', { id: toastId, description: err.message }) }
    finally { setRegenerating(false) }
  }

  const handleSavePackage = async () => {
    setSaving(true)
    const toastId = toast.loading('💾 Сохранение видео-пакета в news/...', { description: 'Создание папки, сохранение фото, script.txt и project.json...' })
    try {
      const effectiveOrig = originalNews || feuilleton.original_news || feuilleton.summary || feuilleton.sourceText || ''
      const res = await fetch('/api/save-news-package', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle, original_title: feuilleton.originalTitle || feuilleton.title || currentTitle,
          url: feuilleton.url || feuilleton.link || feuilleton.matchingPkg?.url || '', text: currentText, model: selectedModel,
          style: selectedStyle, source: feuilleton.source, imageUrl: feuilleton.imageUrl,
          images: feuilleton.images || [], folderName: savedInfo?.folderName || feuilleton.folderName || feuilleton.matchingPkg?.folderName,
          summary: effectiveOrig,
          original_news: effectiveOrig,
          customPrompt: customPrompt ? customPrompt.trim() : '',
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения')
      const newSaved = {
        ...feuilleton,
        ...(feuilleton.matchingPkg || {}),
        ...data,
        title: currentTitle,
        scriptTxt: currentText,
        style: selectedStyle,
        model: selectedModel,
        tone: selectedTone,
        customPrompt: customPrompt ? customPrompt.trim() : '',
        original_news: effectiveOrig,
        summary: effectiveOrig,
      }
      feuilleton.original_news = effectiveOrig
      feuilleton.summary = effectiveOrig
      setSavedInfo(newSaved)
      if (onRefreshPackages) onRefreshPackages()
      toast.success('📦 Видео-пакет успешно сохранен!', {
        id: toastId, description: `Папка: news/${data.folderName} | Фото: ${data.savedPhotosCount || 0} шт.`, duration: 6000,
        action: onOpenPackage ? { label: '📂 Открыть пакет', onClick: () => onOpenPackage(newSaved) } : undefined
      })
    } catch (err) { toast.error('Ошибка сохранения пакета', { id: toastId, description: err.message }) }
    finally { setSaving(false) }
  }

  const isCurrentStyleYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(selectedStyle)
  const articleUrl = feuilleton.url || feuilleton.link || feuilleton.matchingPkg?.url || feuilleton.original_url || ''

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '860px', width: '94%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span className="modal-badge" style={{ background: isCurrentStyleYt ? '#059669' : '#7c3aed', color: '#fff' }}>
                {isCurrentStyleYt ? '🎬 3-Мин. YouTube Сценарий' : '🎭 3-Минутный Фельетон / Аналитика'}
              </span>
              {savedInfo ? (
                <button
                  type="button" onClick={handleOpenSaved} title="Кликните, чтобы открыть видео-пакет"
                  style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.4)', padding: '0.2rem 0.55rem', borderRadius: '4px', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  🟢 📦 Пакет news/{savedInfo.folderName ? savedInfo.folderName.slice(0, 24) + '...' : ''} (Открыть ↗)
                </button>
              ) : (!currentText ? (
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  ⚙️ Настройка параметров генерации
                </span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  ⚠️ Черновик (нажмите «Сохранить видео-пакет»)
                </span>
              ))}
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.2rem', marginTop: '0.4rem' }}>
              {currentTitle}
            </h2>
            {currentText ? (
              <div className="modal-stats" style={{ marginTop: '0.3rem' }}>
                <span>⏱️ ~{minutes} мин.</span>
                <span>📝 Слов: {words}</span>
                <span>🤖 Модель: {AI_MODELS.find(m => m.id === selectedModel)?.name || selectedModel}</span>
              </div>
            ) : (
              <div className="modal-stats" style={{ marginTop: '0.3rem', color: '#94a3b8' }}>
                <span>📰 Источник: {feuilleton.source || 'ChaosChronicle'}</span>
              </div>
            )}
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {!currentText ? (
          /* Экран выбора Модели и Стиля перед написанием */
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            {/* Исходный текст Telegram / Новости / Статьи (Экран настройки) */}
            <div style={{ background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '8px', padding: '0.75rem 0.95rem', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📰</span> ИСХОДНАЯ НОВОСТЬ ({feuilleton.source || 'Telegram / Источник'}):
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                    ({originalNews ? originalNews.split(/\s+/).filter(Boolean).length : 0} слов)
                  </span>
                </span>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {articleUrl && (
                    <button
                      type="button"
                      onClick={handleScrapeArticle}
                      disabled={scrapingUrl}
                      style={{ background: '#0369a1', border: '1px solid #0284c7', color: '#fff', borderRadius: '4px', padding: '0.18rem 0.5rem', fontSize: '0.72rem', cursor: scrapingUrl ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      title="Загрузить полный текст статьи с оригинального сайта по ссылке"
                    >
                      {scrapingUrl ? '⏳ Загрузка...' : '🌐 Загрузить по ссылке'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingOriginal(!isEditingOriginal)}
                    style={{ background: isEditingOriginal ? '#16a34a' : '#1e293b', border: '1px solid #334155', color: isEditingOriginal ? '#fff' : '#38bdf8', borderRadius: '4px', padding: '0.18rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                    title="Редактировать или вставить полный оригинальный текст новости"
                  >
                    {isEditingOriginal ? '💾 Готово' : '✏️ Редактировать'}
                  </button>
                  {originalNews && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(originalNews)
                        toast.success('Оригинальный текст скопирован!')
                      }}
                      style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: '4px', padding: '0.18rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      📋 Копировать
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowOriginal(!showOriginal)}
                    style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', padding: '0.18rem 0.45rem', fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    {showOriginal ? 'Свернуть ▲' : 'Развернуть ▼'}
                  </button>
                </div>
              </div>

              {showOriginal && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
                  {isEditingOriginal ? (
                    <textarea
                      value={originalNews}
                      onChange={e => {
                        setOriginalNews(e.target.value)
                        feuilleton.summary = e.target.value
                        feuilleton.original_news = e.target.value
                      }}
                      placeholder="Вставьте или отредактируйте полный оригинальный текст новости здесь..."
                      style={{
                        width: '100%', minHeight: '130px', background: '#030712', color: '#f8fafc',
                        border: '1px solid #38bdf8', borderRadius: '6px', padding: '0.5rem 0.65rem',
                        fontSize: '0.86rem', lineHeight: '1.5', fontFamily: 'inherit', resize: 'vertical',
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '0.86rem', color: '#f1f5f9', lineHeight: '1.55', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap', background: '#030712', padding: '0.5rem 0.65rem', borderRadius: '6px' }}>
                      {originalNews || <span style={{ color: '#64748b', fontStyle: 'italic' }}>Оригинальный текст пуст. Нажмите «✏️ Редактировать» чтобы вставить текст{articleUrl ? ' или «🌐 Загрузить по ссылке»' : ''}.</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Дополнительный промпт / пожелания автора к ИИ */}
            <div style={{ background: '#1e1b4b', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #6366f1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e0e7ff', margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>🎯</span> Индивидуальный промпт / Пожелания к сценарию (опционально):
                </label>
                <span style={{ fontSize: '0.72rem', color: '#a5b4fc' }}>ИИ обязательно учтет при генерации</span>
              </div>
              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Например: Сделай особый акцент на военных аспектах, начни с вопроса к зрителю, раскрой мотивы Кремля и заверши мощным выводом..."
                rows={2}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #4338ca', borderRadius: '6px', color: '#fff', padding: '0.55rem 0.75rem', fontSize: '0.84rem', resize: 'vertical', minHeight: '60px', lineHeight: 1.45, fontFamily: 'inherit' }}
              />
            </div>

            {/* 1. Выбор ИИ Модели */}
            <div style={{ background: '#181c27', padding: '1rem', borderRadius: '10px', border: '1px solid #232936' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6', display: 'block', marginBottom: '0.55rem' }}>🤖 1. Выберите модель ИИ:</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                {AI_MODELS.map(m => {
                  const isSel = selectedModel === m.id
                  return (
                    <button key={m.id} type="button" onClick={() => setSelectedModel(m.id)} disabled={regenerating} style={{ background: isSel ? '#1d4ed8' : '#0f172a', border: isSel ? '2px solid #60a5fa' : '1px solid #334155', color: isSel ? '#fff' : '#94a3b8', borderRadius: '8px', padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: isSel ? 700 : 500, fontSize: '0.85rem', textAlign: 'left' }}>
                      <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                      <div><div>{m.name}</div><div style={{ fontSize: '0.7rem', color: isSel ? '#dbeafe' : '#64748b' }}>{m.badge || 'Нейросеть'}</div></div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Тональность и формат подачи */}
            <div style={{ background: '#181c27', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #232936' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6', display: 'block', marginBottom: '0.5rem' }}>🎯 2. Выберите формат и тональность подачи:</label>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.55rem', marginBottom: '0.75rem' }}>
                <button type="button" onClick={() => setScriptFormat('feuilleton')} disabled={regenerating} style={{ background: scriptFormat === 'feuilleton' ? '#5b21b6' : '#0f172a', border: scriptFormat === 'feuilleton' ? '2px solid #a78bfa' : '1px solid #334155', color: scriptFormat === 'feuilleton' ? '#fff' : '#94a3b8', borderRadius: '8px', padding: '0.55rem 0.75rem', cursor: 'pointer', textAlign: 'left', fontWeight: scriptFormat === 'feuilleton' ? 700 : 500, fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🎭</span>
                    <div><div>Цельный фельетон</div><div style={{ fontSize: '0.7rem', color: scriptFormat === 'feuilleton' ? '#ddd6fe' : '#64748b' }}>Связный монолог без счета вслух</div></div>
                  </div>
                </button>
                <button type="button" onClick={() => setScriptFormat('facts')} disabled={regenerating} style={{ background: scriptFormat === 'facts' ? '#9a3412' : '#0f172a', border: scriptFormat === 'facts' ? '2px solid #fb923c' : '1px solid #334155', color: scriptFormat === 'facts' ? '#fff' : '#94a3b8', borderRadius: '8px', padding: '0.55rem 0.75rem', cursor: 'pointer', textAlign: 'left', fontWeight: scriptFormat === 'facts' ? 700 : 500, fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🔢</span>
                    <div><div>По пунктам (со счетом)</div><div style={{ fontSize: '0.7rem', color: scriptFormat === 'facts' ? '#fed7aa' : '#64748b' }}>Счет каждого пункта («Факт 1», «Факт 2»)</div></div>
                  </div>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.55rem' }}>
                <button type="button" onClick={() => setSelectedTone('grotesque')} disabled={regenerating} style={{ background: selectedTone === 'grotesque' ? '#7c2d12' : '#0f172a', border: selectedTone === 'grotesque' ? '2px solid #f97316' : '1px solid #334155', color: selectedTone === 'grotesque' ? '#fff' : '#94a3b8', borderRadius: '8px', padding: '0.55rem 0.75rem', cursor: 'pointer', textAlign: 'left', fontWeight: selectedTone === 'grotesque' ? 700 : 500, fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>💥</span>
                    <div><div>Сатира & Гротеск</div><div style={{ fontSize: '0.7rem', color: selectedTone === 'grotesque' ? '#fdba74' : '#64748b' }}>Едкая ирония, метафоры и сатирический памфлет</div></div>
                  </div>
                </button>
                <button type="button" onClick={() => setSelectedTone('analytics')} disabled={regenerating} style={{ background: selectedTone === 'analytics' ? '#1e3a8a' : '#0f172a', border: selectedTone === 'analytics' ? '2px solid #3b82f6' : '1px solid #334155', color: selectedTone === 'analytics' ? '#fff' : '#94a3b8', borderRadius: '8px', padding: '0.55rem 0.75rem', cursor: 'pointer', textAlign: 'left', fontWeight: selectedTone === 'analytics' ? 700 : 500, fontSize: '0.84rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>🧠</span>
                    <div><div>Увлекательная Аналитика</div><div style={{ fontSize: '0.7rem', color: selectedTone === 'analytics' ? '#93c5fd' : '#64748b' }}>Факты, причины, ТТХ и скрытые мотивы</div></div>
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Выбор Стиля: YouTube Тематика & Авторские */}
            <div style={{ background: '#181c27', padding: '1rem', borderRadius: '10px', border: '1px solid #232936' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6', display: 'block', marginBottom: '0.55rem' }}>🎭 3. Выберите стиль сценария:</label>
              
              <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 700, marginBottom: '0.4rem' }}>🎬 ТЕМАТИЧЕСКИЕ СТИЛИ YOUTUBE:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem', marginBottom: '0.9rem' }}>
                {YOUTUBE_TOPIC_STYLES.map(s => {
                  const isSel = selectedStyle === s.id
                  return (
                    <button key={s.id} type="button" onClick={() => setSelectedStyle(s.id)} disabled={regenerating} style={{ background: isSel ? '#065f46' : '#0f172a', border: isSel ? '2px solid #34d399' : '1px solid #334155', color: isSel ? '#fff' : '#94a3b8', borderRadius: '8px', padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: isSel ? 700 : 500, fontSize: '0.85rem', textAlign: 'left' }}>
                      <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                      <div><div>{s.name.split(' (')[0]}</div><div style={{ fontSize: '0.7rem', color: isSel ? '#d1fae5' : '#64748b' }}>{s.description || 'Наука, факты, технологии'}</div></div>
                    </button>
                  )
                })}
              </div>

              <div style={{ fontSize: '0.78rem', color: '#c084fc', fontWeight: 700, marginBottom: '0.4rem' }}>🎭 АВТОРСКИЕ СТИЛИ (САТИРА):</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                {FEUILLETON_STYLES.map(s => {
                  const isSel = selectedStyle === s.id
                  return (
                    <button key={s.id} type="button" onClick={() => setSelectedStyle(s.id)} disabled={regenerating} style={{ background: isSel ? '#5b21b6' : '#0f172a', border: isSel ? '2px solid #a78bfa' : '1px solid #334155', color: isSel ? '#fff' : '#94a3b8', borderRadius: '8px', padding: '0.6rem 0.8rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontWeight: isSel ? 700 : 500, fontSize: '0.85rem', textAlign: 'left' }}>
                      <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                      <div><div>{s.name.split(' (')[0]}</div><div style={{ fontSize: '0.7rem', color: isSel ? '#ede9fe' : '#64748b' }}>{s.description || 'Специфический юмор и подача'}</div></div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Экран просмотра и редактирования готового фельетона */
          <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: '#131b2e', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#93c5fd' }}>🤖 Модель:</span>
                  <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={regenerating} style={{ background: '#1e293b', color: '#fff', border: '1px solid #3b82f6', borderRadius: '6px', padding: '0.4rem 0.65rem', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}>
                    {AI_MODELS.map(m => (<option key={m.id} value={m.id}>{m.icon} {m.name}</option>))}
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#93c5fd' }}>🎨 Стиль:</span>
                  <select value={selectedStyle} onChange={e => setSelectedStyle(e.target.value)} disabled={regenerating} style={{ background: '#1e293b', color: '#fff', border: '1px solid #3b82f6', borderRadius: '6px', padding: '0.4rem 0.65rem', fontSize: '0.84rem', fontWeight: 600, cursor: 'pointer' }}>
                    <optgroup label="🎬 YouTube стили">
                      {YOUTUBE_TOPIC_STYLES.map(s => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </optgroup>
                    <optgroup label="🎭 Авторские (Сатира)">
                      {FEUILLETON_STYLES.map(s => (<option key={s.id} value={s.id}>{s.icon} {s.name}</option>))}
                    </optgroup>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: '#020617', borderRadius: '6px', padding: '2px', border: '1px solid #d97706' }}>
                  <button type="button" onClick={() => { setScriptFormat('feuilleton'); handleRegenerateStyle(selectedStyle, selectedModel, selectedTone, 'feuilleton') }} style={{ background: scriptFormat === 'feuilleton' ? '#7c3aed' : 'transparent', color: scriptFormat === 'feuilleton' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.24rem 0.5rem', fontSize: '0.76rem', fontWeight: scriptFormat === 'feuilleton' ? 700 : 500, cursor: 'pointer' }}>🎭 Фельетон</button>
                  <button type="button" onClick={() => { setScriptFormat('facts'); handleRegenerateStyle(selectedStyle, selectedModel, selectedTone, 'facts') }} style={{ background: scriptFormat === 'facts' ? '#d97706' : 'transparent', color: scriptFormat === 'facts' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.24rem 0.5rem', fontSize: '0.76rem', fontWeight: scriptFormat === 'facts' ? 700 : 500, cursor: 'pointer' }}>🔢 По пунктам</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '6px', padding: '2px', border: '1px solid #334155' }}>
                  <button type="button" onClick={() => { setSelectedTone('grotesque'); handleRegenerateStyle(selectedStyle, selectedModel, 'grotesque', scriptFormat) }} style={{ background: selectedTone === 'grotesque' ? '#dc2626' : 'transparent', color: selectedTone === 'grotesque' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.28rem 0.55rem', fontSize: '0.78rem', fontWeight: selectedTone === 'grotesque' ? 700 : 500, cursor: 'pointer' }}>💥 Сатира</button>
                  <button type="button" onClick={() => { setSelectedTone('analytics'); handleRegenerateStyle(selectedStyle, selectedModel, 'analytics', scriptFormat) }} style={{ background: selectedTone === 'analytics' ? '#2563eb' : 'transparent', color: selectedTone === 'analytics' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.28rem 0.55rem', fontSize: '0.78rem', fontWeight: selectedTone === 'analytics' ? 700 : 500, cursor: 'pointer' }}>🧠 Аналитика</button>
                </div>
              </div>
              <button type="button" className="refresh-btn" onClick={() => handleRegenerateStyle(selectedStyle, selectedModel, selectedTone, scriptFormat)} disabled={regenerating} style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
                🔄 {regenerating ? '⏳ Генерация...' : 'Сгенерировать заново'}
              </button>
            </div>

            {/* Исходный текст Telegram / Новости / Статьи (Экран редактирования сценария) */}
            <div style={{ background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '8px', padding: '0.65rem 0.85rem', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📰</span> ИСХОДНАЯ НОВОСТЬ ({feuilleton.source || 'Telegram / Источник'}):
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                    ({originalNews ? originalNews.split(/\s+/).filter(Boolean).length : 0} слов)
                  </span>
                </span>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  {articleUrl && (
                    <button
                      type="button"
                      onClick={handleScrapeArticle}
                      disabled={scrapingUrl}
                      style={{ background: '#0369a1', border: '1px solid #0284c7', color: '#fff', borderRadius: '4px', padding: '0.18rem 0.5rem', fontSize: '0.72rem', cursor: scrapingUrl ? 'not-allowed' : 'pointer', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                      title="Загрузить полный текст статьи с оригинального сайта по ссылке"
                    >
                      {scrapingUrl ? '⏳ Загрузка...' : '🌐 Загрузить по ссылке'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsEditingOriginal(!isEditingOriginal)}
                    style={{ background: isEditingOriginal ? '#16a34a' : '#1e293b', border: '1px solid #334155', color: isEditingOriginal ? '#fff' : '#38bdf8', borderRadius: '4px', padding: '0.18rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                    title="Редактировать или вставить полный оригинальный текст новости"
                  >
                    {isEditingOriginal ? '💾 Готово' : '✏️ Редактировать'}
                  </button>
                  {originalNews && (
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(originalNews)
                        toast.success('Оригинальный текст скопирован!')
                      }}
                      style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: '4px', padding: '0.18rem 0.5rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                    >
                      📋 Копировать
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowOriginal(!showOriginal)}
                    style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', padding: '0.18rem 0.45rem', fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    {showOriginal ? 'Свернуть ▲' : 'Развернуть ▼'}
                  </button>
                </div>
              </div>

              {showOriginal && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
                  {isEditingOriginal ? (
                    <textarea
                      value={originalNews}
                      onChange={e => {
                        setOriginalNews(e.target.value)
                        feuilleton.summary = e.target.value
                        feuilleton.original_news = e.target.value
                      }}
                      placeholder="Вставьте или отредактируйте полный оригинальный текст новости здесь..."
                      style={{
                        width: '100%', minHeight: '130px', background: '#030712', color: '#f8fafc',
                        border: '1px solid #38bdf8', borderRadius: '6px', padding: '0.5rem 0.65rem',
                        fontSize: '0.86rem', lineHeight: '1.5', fontFamily: 'inherit', resize: 'vertical',
                      }}
                    />
                  ) : (
                    <div style={{ fontSize: '0.86rem', color: '#f1f5f9', lineHeight: '1.55', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap', background: '#030712', padding: '0.5rem 0.65rem', borderRadius: '6px' }}>
                      {originalNews || <span style={{ color: '#64748b', fontStyle: 'italic' }}>Оригинальный текст пуст. Нажмите «✏️ Редактировать» чтобы вставить текст{articleUrl ? ' или «🌐 Загрузить по ссылке»' : ''}.</span>}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Дополнительный промпт / пожелания автора к ИИ (при перегенерации) */}
            <div style={{ background: '#1e1b4b', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #4338ca' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span>🎯</span> Индивидуальный промпт / Пожелания к перегенерации (опционально):
                </span>
                <span style={{ fontSize: '0.7rem', color: '#a5b4fc' }}>Учитывается кнопкой «🔄 Сгенерировать заново»</span>
              </div>
              <textarea
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                placeholder="Например: Сделай особый акцент на военных аспектах, начни с вопроса к зрителю, раскрой мотивы Кремля и заверши мощным выводом..."
                rows={1}
                style={{ width: '100%', background: '#0f172a', border: '1px solid #6366f1', borderRadius: '6px', color: '#fff', padding: '0.45rem 0.65rem', fontSize: '0.82rem', resize: 'vertical', minHeight: '44px', lineHeight: 1.4, fontFamily: 'inherit' }}
              />
            </div>

            {/* ⚡ 3-секундные вирусные хуки для YouTube */}
            <ScriptHookGenerator
              title={feuilleton.originalTitle || feuilleton.title || currentTitle}
              summary={feuilleton.summary || ''}
              currentText={currentText}
              style={selectedStyle}
              tone={selectedTone}
              onApplyHook={(newText) => { setCurrentText(newText); setSavedInfo(null); }}
            />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#9ca3af' }}>📜 Текст монолога диктора (для голосовой озвучки ElevenLabs / EdgeTTS):</label>
              <textarea value={currentText} onChange={e => { setCurrentText(e.target.value); setSavedInfo(null); }} rows={12} style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', color: '#f3f4f6', padding: '0.85rem 1rem', fontSize: '0.92rem', lineHeight: '1.6', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>
        )}

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {!currentText ? (
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <button
                type="button" onClick={() => handleRegenerateStyle(selectedStyle, selectedModel, selectedTone)} disabled={regenerating}
                style={{
                  background: isCurrentStyleYt ? 'linear-gradient(135deg, #059669 0%, #0284c7 100%)' : (selectedTone === 'analytics' ? 'linear-gradient(135deg, #1d4ed8 0%, #0284c7 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)'),
                  color: '#fff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.4rem', fontSize: '0.95rem', fontWeight: 700,
                  cursor: regenerating ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 3px 12px rgba(124, 58, 237, 0.4)'
                }}
              >
                {regenerating ? '⏳ ИИ пишет текст...' : (isCurrentStyleYt ? '🚀 Создать YouTube сценарий (3 мин)' : (selectedTone === 'analytics' ? '🚀 Создать аналитику (3 мин)' : '🚀 Создать фельетон (3 мин)'))}
              </button>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {savedInfo && onOpenPackage && (
                  <button type="button" className="copy-btn" onClick={handleOpenSaved} style={{ background: '#10b981', fontWeight: 700, padding: '0.65rem 1.1rem' }}>
                    📂 Открыть видео-пакет
                  </button>
                )}
                <button type="button" className="close-btn" onClick={onClose}>Закрыть</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {savedInfo ? (
                  <>
                    <button type="button" className="save-bundle-btn" onClick={handleOpenSaved} style={{ background: 'linear-gradient(135deg, #059669 0%, #047857 100%)', fontWeight: 700, padding: '0.65rem 1.25rem', fontSize: '0.92rem' }} title="Открыть видео-пакет (Аудио, Фото, Сценарий, Обложка)">
                      📂 Открыть видео-пакет ✅
                    </button>
                    <button type="button" className="copy-btn" onClick={handleSavePackage} disabled={saving} style={{ background: '#374151', padding: '0.65rem 0.85rem', fontSize: '0.82rem' }} title="Пересохранить текст сценария на диск">
                      {saving ? '⏳...' : '💾 Обновить'}
                    </button>
                  </>
                ) : (
                  <button type="button" className="save-bundle-btn" onClick={handleSavePackage} disabled={saving} style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', fontWeight: 700, padding: '0.65rem 1.25rem', fontSize: '0.92rem' }}>
                    {saving ? '⏳ Сохранение...' : '💾 Сохранить видео-пакет в news/'}
                  </button>
                )}
                {onOpenPhotos && (
                  <button
                    type="button"
                    className="photos-header-btn"
                    onClick={() => onOpenPhotos({
                      title: currentTitle,
                      images: feuilleton.images,
                      id: feuilleton.id,
                      url: feuilleton.url || feuilleton.sourceUrl,
                      folderName: savedInfo?.folderName || feuilleton.folderName || feuilleton.matchingPkg?.folderName,
                      bundleDir: savedInfo?.bundleDir || feuilleton.bundleDir || feuilleton.matchingPkg?.bundleDir,
                      matchingPkg: feuilleton.matchingPkg,
                    })}
                    style={{ padding: '0.65rem 1rem', fontSize: '0.88rem' }}
                  >
                    🖼️ Фото к новости
                  </button>
                )}
              </div>
              <button type="button" className="close-btn" onClick={onClose}>Закрыть</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
