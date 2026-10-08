import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { FEUILLETON_STYLES, YOUTUBE_TOPIC_STYLES, AI_MODELS } from '../lib/utils'
import ScriptHookGenerator from './script/ScriptHookGenerator'
import ScriptToolbar from './script/ScriptToolbar'
import YouTubeFactsModal from './YouTubeFactsModal'
import ModalHeader from './common/ModalHeader'

export default function NewsScriptModal({ pkg, onClose, onSaved }) {
  if (!pkg) return null

  const [text, setText] = useState(pkg.scriptTxt || pkg.scriptMd || '')
  const [originalNews, setOriginalNews] = useState(pkg.original_news || pkg.summary || pkg.originalNews || '')
  const [extractedFacts, setExtractedFacts] = useState(pkg.facts || pkg.selectedFacts || [])
  const [showOriginal, setShowOriginal] = useState(true)
  const [showFactsSection, setShowFactsSection] = useState(Boolean(pkg.facts?.length || pkg.selectedFacts?.length))
  const [showFactsModalFromSection, setShowFactsModalFromSection] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState(pkg.style || (pkg.isYouTube ? 'scipop' : 'golubuzki'))
  const [selectedModel, setSelectedModel] = useState(pkg.model || 'gemini')
  const [selectedTone, setSelectedTone] = useState(pkg.tone || 'grotesque')
  const [savingText, setSavingText] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [isEditingOriginal, setIsEditingOriginal] = useState(false)
  const [scrapingUrl, setScrapingUrl] = useState(false)
  const [isMaximized, setIsMaximized] = useState(false)

  // Drag & Drop State
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 })

  useEffect(() => {
    setText(pkg.scriptTxt || pkg.scriptMd || '')
    setOriginalNews(pkg.original_news || pkg.summary || pkg.originalNews || '')
    if (pkg.facts || pkg.selectedFacts) setExtractedFacts(pkg.facts || pkg.selectedFacts)
    setPos({ x: 0, y: 0 })

    const folderName = pkg.folderName || ''
    const bundleDir = pkg.bundleDir || ''
    if (folderName || bundleDir) {
      const params = new URLSearchParams({ folderName, bundleDir })
      fetch(`/api/package-script-text?${params}`)
        .then(r => r.json())
        .then(data => {
          if (data.success) {
            if (typeof data.text === 'string') setText(data.text)
            if (data.originalNews || data.summary) setOriginalNews(data.originalNews || data.summary)
            if (data.facts && Array.isArray(data.facts)) {
              setExtractedFacts(data.facts)
              pkg.facts = data.facts
              pkg.selectedFacts = data.facts
            }
          }
        })
        .catch(() => {})
    }
  }, [pkg])

  const handleMouseDown = (e) => {
    if (e.target.closest('.modal-close') || e.target.closest('button') || e.target.closest('textarea') || e.target.closest('.draggable-title-chip')) return
    setIsDragging(true)
    dragRef.current = { startX: e.clientX, startY: e.clientY, initialX: pos.x, initialY: pos.y }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      setPos({ x: dragRef.current.initialX + (e.clientX - dragRef.current.startX), y: dragRef.current.initialY + (e.clientY - dragRef.current.startY) })
    }
    const handleMouseUp = () => { if (isDragging) setIsDragging(false) }
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleRegenerateScript = async (styleToUse = selectedStyle, modelToUse = selectedModel, toneToUse = selectedTone, chosenFacts = null, conceptToUse = pkg.conceptType || 'facts', scriptFormat = pkg.scriptFormat || 'feuilleton', customWord = pkg.customWord || '', customPrompt = pkg.customPrompt || '') => {
    setRegenerating(true)
    const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling', 'short_sarcasm'].includes(styleToUse) || pkg.isYouTube
    const allStyles = [...FEUILLETON_STYLES, ...YOUTUBE_TOPIC_STYLES]
    const styleName = allStyles.find(s => s.id === styleToUse)?.name || styleToUse
    const modelName = AI_MODELS.find(m => m.id === modelToUse)?.name || modelToUse
    const isYtNonSatire = isYt && !['short_sarcasm', 'golubuzki'].includes(styleToUse)
    const formatLabel = scriptFormat === 'feuilleton' ? (isYtNonSatire ? '🎙️ Цельный рассказ' : '🎭 Фельетон') : '🔢 По пунктам'
    const hasFacts = Array.isArray(chosenFacts) && chosenFacts.length > 0
    const toastId = toast.loading(hasFacts ? `✨ Сценарий (${formatLabel}, ${chosenFacts.length} пунктов)...` : `🔄 Генерация (${formatLabel}, напрямую из оригинала)...`, {
      description: `${modelName} | ${styleName}`,
    })

    try {
      const endpoint = isYt ? '/api/youtube/regenerate-script' : '/api/generate-feuilleton'
      const effectiveOriginal = (originalNews || pkg.original_news || pkg.summary || '').trim()
      const payload = isYt
        ? {
            folderName: pkg.folderName,
            bundleDir: pkg.bundleDir,
            style: styleToUse,
            originalNews: effectiveOriginal,
            summary: effectiveOriginal,
            selectedFacts: chosenFacts,
            conceptType: conceptToUse,
            customWord,
            scriptFormat,
            customPrompt: customPrompt ? customPrompt.trim() : '',
            clearCachedFacts: !chosenFacts,
          }
        : {
            folderName: pkg.folderName,
            bundleDir: pkg.bundleDir,
            url: pkg.url || pkg.link || '',
            title: pkg.original_title || pkg.title,
            summary: effectiveOriginal || (text ? text.slice(0, 350) : '') || '',
            original_news: effectiveOriginal,
            selectedFacts: chosenFacts,
            style: styleToUse,
            tone: toneToUse,
            source: pkg.source || '',
            model: modelToUse,
            conceptType: conceptToUse,
            customWord,
            scriptFormat,
            customPrompt: customPrompt ? customPrompt.trim() : '',
            saveToPackage: Boolean(pkg.folderName || pkg.bundleDir),
            clearCachedFacts: !chosenFacts,
          }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка генерации текста')

      const fData = data.feuilleton || data
      const newText = fData.text || data.text || ''
      if (newText) {
        setText(newText)
        pkg.scriptTxt = newText
        pkg.hasScriptTxt = true
        pkg.hasScriptMd = true
        pkg.scriptFormat = scriptFormat
        pkg.conceptType = conceptToUse
        if (customWord) pkg.customWord = customWord
        if (hasFacts || (data.facts && Array.isArray(data.facts) && data.facts.length > 0)) {
          const finalFacts = chosenFacts || data.facts
          setExtractedFacts(finalFacts)
          pkg.selectedFacts = finalFacts
          pkg.facts = finalFacts
          setShowFactsSection(true)
        }
        if (fData.title) pkg.title = fData.title
        if (onSaved) onSaved()
        toast.success(hasFacts ? `🎉 Сценарий (${formatLabel}) создан по ${chosenFacts.length} ключевым пунктам!` : `✨ Текст (${formatLabel}) успешно сгенерирован напрямую из оригинальной новости!`, { id: toastId })
      } else {
        toast.warning('Ответ ИИ не содержит нового текста', { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка генерации', { id: toastId, description: err.message })
    } finally {
      setRegenerating(false)
    }
  }

  const handleSaveText = async () => {
    if (!text.trim() && !originalNews.trim()) return
    setSavingText(true)
    const toastId = toast.loading('Сохранение script.txt, оригинала и фактов...', { description: 'Обновление файлов на диске...' })

    try {
      const res = await fetch('/api/save-script-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          text,
          originalNews,
          facts: extractedFacts,
          clearFacts: (!extractedFacts || extractedFacts.length === 0),
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения текста')

      pkg.scriptTxt = text
      pkg.original_news = originalNews
      pkg.summary = originalNews
      pkg.facts = extractedFacts
      pkg.selectedFacts = extractedFacts
      if (onSaved) onSaved()

      toast.success('💾 Сценарий, оригинальная новость и пункты успешно сохранены!', {
        id: toastId,
        description: `Сохранено в news/${data.folderName}/`,
        duration: 5000,
      })
    } catch (err) {
      toast.error('Ошибка сохранения текста', { id: toastId, description: err.message })
    } finally {
      setSavingText(false)
    }
  }

  const handleScrapeArticle = async () => {
    const targetUrl = pkg.url || pkg.link || pkg.original_url
    if (!targetUrl) return toast.error('URL статьи не найден в пакете')
    setScrapingUrl(true)
    const toastId = toast.loading('🌐 Загрузка полного текста статьи по ссылке...', { description: targetUrl })
    try {
      const res = await fetch('/api/scrape-article-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl, bundleDir: pkg.bundleDir, folderName: pkg.folderName }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Не удалось загрузить статью')

      setOriginalNews(data.fullText)
      pkg.original_news = data.fullText
      pkg.summary = data.fullText
      setShowOriginal(true)
      if (onSaved) onSaved()
      toast.success(`🎉 Полная статья загружена (${data.wordCount || data.fullText.split(/\s+/).filter(Boolean).length} слов)!`, { id: toastId })
    } catch (err) {
      toast.error('Ошибка загрузки статьи', { id: toastId, description: err.message })
    } finally {
      setScrapingUrl(false)
    }
  }

  const articleUrl = pkg.url || pkg.link || pkg.original_url

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content script-editor-modal ${isDragging ? 'dragging' : ''}`}
        style={{
          maxWidth: isMaximized ? '96vw' : '780px',
          width: isMaximized ? '96vw' : '100%',
          height: isMaximized ? '94vh' : 'auto',
          maxHeight: isMaximized ? '94vh' : '88vh',
          transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
          transition: isDragging ? 'none' : 'all 0.2s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        <ModalHeader
          title={pkg.title}
          badge="📜 Текст диктора (🖐️ Перетащите окно)"
          isMaximized={isMaximized}
          onToggleMaximize={() => setIsMaximized(!isMaximized)}
          onClose={onClose}
          onMouseDown={handleMouseDown}
          isDragging={isDragging}
        />

        <div className="modal-body">
          <ScriptToolbar
            pkg={pkg}
            originalNews={originalNews}
            selectedModel={selectedModel}
            setSelectedModel={setSelectedModel}
            selectedStyle={selectedStyle}
            setSelectedStyle={setSelectedStyle}
            selectedTone={selectedTone}
            setSelectedTone={setSelectedTone}
            regenerating={regenerating}
            onRegenerate={handleRegenerateScript}
          />

          {/* Исходный текст Telegram / Новости / Статьи */}
          <div style={{ background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span>📰</span> ИСХОДНАЯ НОВОСТЬ ({pkg.source || 'Telegram / Источник'}):
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
                      const val = e.target.value
                      setOriginalNews(val)
                      pkg.original_news = val
                      pkg.summary = val
                      // При редактировании оригинала старые извлеченные факты становятся неактуальными!
                      setExtractedFacts([])
                      pkg.facts = []
                      pkg.selectedFacts = []
                    }}
                    placeholder="Вставьте или отредактируйте полный оригинальный текст новости здесь..."
                    style={{
                      width: '100%', minHeight: '140px', background: '#030712', color: '#f8fafc',
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

          {/* 💡 Отдельный блок извлеченных фактов / тезисов */}
          <div style={{ background: '#090d16', border: '1px solid #d97706', borderRadius: '6px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.76rem', fontWeight: 800, color: '#fcd34d', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                💡 Извлеченные пункты / тезисы ({extractedFacts.length})
                {extractedFacts.length > 0 && (
                  <span style={{ fontSize: '0.7rem', color: '#fbbf24', background: '#451a03', padding: '0.1rem 0.4rem', borderRadius: '4px', border: '1px solid #b45309' }}>
                    Готовы для генерации
                  </span>
                )}
              </span>
              <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center', flexWrap: 'wrap' }}>
                {extractedFacts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleRegenerateScript(selectedStyle, selectedModel, selectedTone, extractedFacts, pkg.conceptType, pkg.scriptFormat, pkg.customWord)}
                    disabled={regenerating}
                    style={{
                      background: 'linear-gradient(135deg, #d97706, #b45309)',
                      border: '1px solid #f59e0b',
                      color: '#ffffff',
                      borderRadius: '4px',
                      padding: '0.2rem 0.6rem',
                      fontSize: '0.74rem',
                      cursor: regenerating ? 'not-allowed' : 'pointer',
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                    title="Сгенерировать дикторский текст на основе этих сохраненных пунктов"
                  >
                    ⚡ Сгенерировать по пунктам
                  </button>
                )}
                {extractedFacts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowFactsModalFromSection(true)}
                    style={{ background: '#1e293b', border: '1px solid #d97706', color: '#fcd34d', borderRadius: '4px', padding: '0.2rem 0.55rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                    title="Открыть детальный диалог выбора и редактирования пунктов"
                  >
                    🔍 Диалог пунктов
                  </button>
                )}
                {extractedFacts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setExtractedFacts([])
                      pkg.facts = []
                      pkg.selectedFacts = []
                      toast.info('Список извлеченных пунктов очищен')
                    }}
                    style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '4px', padding: '0.2rem 0.45rem', fontSize: '0.72rem', cursor: 'pointer' }}
                    title="Очистить список пунктов (оригинальная новость останется нетронутой)"
                  >
                    🗑️ Очистить
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowFactsSection(!showFactsSection)}
                  style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', padding: '0.2rem 0.45rem', fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  {showFactsSection ? 'Свернуть ▲' : 'Развернуть ▼'}
                </button>
              </div>
            </div>

            {showFactsSection && (
              <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #1e293b' }}>
                {extractedFacts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '0.3rem' }}>
                    {extractedFacts.map((fact, idx) => (
                      <div
                        key={fact.id || idx}
                        style={{
                          background: '#040711',
                          border: '1px solid #1e293b',
                          borderRadius: '5px',
                          padding: '0.4rem 0.6rem',
                          fontSize: '0.8rem',
                          color: '#e2e8f0',
                        }}
                      >
                        <div style={{ fontWeight: 700, color: '#fcd34d', marginBottom: '0.15rem' }}>
                          #{idx + 1}. {fact.title || `Пункт ${idx + 1}`}
                        </div>
                        <div style={{ color: '#cbd5e1', fontSize: '0.78rem', lineHeight: '1.4' }}>
                          {fact.text || fact.description || (typeof fact === 'string' ? fact : '')}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic', padding: '0.3rem 0' }}>
                    Пункты еще не извлечены. Нажмите «🔍 Извлечь» в верхней панели, чтобы сгенерировать тезисы/факты отдельно от оригинальной новости, либо генерируйте текст сразу напрямую из оригинала.
                  </div>
                )}
              </div>
            )}
          </div>

          <ScriptHookGenerator
            title={pkg.original_title || pkg.title}
            summary={originalNews || pkg.summary || ''}
            currentText={text}
            style={selectedStyle}
            tone={selectedTone}
            onApplyHook={(newText) => setText(newText)}
          />

          <div className="script-editor-wrap">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div
                className="draggable-title-chip"
                draggable="true"
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', pkg.title || '')
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                style={{
                  cursor: 'grab', background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px dashed #6366f1',
                  padding: '0.28rem 0.65rem', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                  fontSize: '0.78rem', fontWeight: 600, color: '#e2e8f0', userSelect: 'none',
                }}
                title="🖐️ Зажмите мышкой и перетащите заголовок в любое место текста"
              >
                <span style={{ fontSize: '0.8rem' }}>🖐️ Заголовок:</span>
                <span style={{ color: '#38bdf8', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  «{pkg.title}»
                </span>
                <span style={{ fontSize: '0.68rem', background: '#4f46e5', color: '#fff', padding: '0.08rem 0.35rem', borderRadius: '4px' }}>
                  drag ↘
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="copy-btn"
                  onClick={() => {
                    const titleToAdd = pkg.title ? pkg.title.trim() : ''
                    if (titleToAdd) {
                      setText(`${titleToAdd}\n\n${text.trim()}`)
                      toast.success('📌 Заголовок добавлен в начало текста!')
                    }
                  }}
                  style={{ fontSize: '0.74rem', padding: '0.25rem 0.55rem', background: '#334155', border: '1px solid #475569' }}
                  title="Вставить заголовок в самую первую строчку текста"
                >
                  ➕ В начало
                </button>
                <span style={{ fontSize: '0.76rem', color: '#64748b' }}>
                  Слов: {text.split(/\s+/).filter(Boolean).length} | ~{Math.round((text.split(/\s+/).filter(Boolean).length / 140) * 10) / 10} мин.
                </span>
              </div>
            </div>

            <textarea
              className="script-editor-textarea"
              value={text}
              onChange={e => setText(e.target.value)}
              onDrop={() => toast.success('🎯 Элемент успешно перетащен в текст!')}
              placeholder="Введите текст (можно перетаскивать мышкой заголовок и хуки прямо сюда)..."
              rows={12}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="save-bundle-btn" onClick={handleSaveText} disabled={savingText}>
            {savingText ? '⏳ Сохранение...' : '💾 Сохранить изменения в script.txt'}
          </button>
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>

      {showFactsModalFromSection && (
        <YouTubeFactsModal
          isOpen={showFactsModalFromSection}
          onClose={() => setShowFactsModalFromSection(false)}
          facts={extractedFacts}
          videoTitle={pkg.title || pkg.original_title || 'Оригинальный текст'}
          conceptType={pkg.conceptType || 'theses'}
          customWord={pkg.customWord || ''}
          onConfirm={(chosenFacts, style) => {
            setShowFactsModalFromSection(false)
            handleRegenerateScript(style || selectedStyle, selectedModel, selectedTone, chosenFacts, pkg.conceptType, pkg.scriptFormat, pkg.customWord)
          }}
          loading={regenerating}
        />
      )}
    </div>
  )
}
