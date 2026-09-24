import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { FEUILLETON_STYLES, YOUTUBE_TOPIC_STYLES, AI_MODELS } from '../lib/utils'
import ScriptHookGenerator from './script/ScriptHookGenerator'
import ScriptToolbar from './script/ScriptToolbar'
import ModalHeader from './common/ModalHeader'

export default function NewsScriptModal({ pkg, onClose, onSaved }) {
  if (!pkg) return null

  const [text, setText] = useState(pkg.scriptTxt || pkg.scriptMd || '')
  const [originalNews, setOriginalNews] = useState(pkg.original_news || pkg.summary || pkg.originalNews || '')
  const [showOriginal, setShowOriginal] = useState(true)
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

  const handleRegenerateScript = async (styleToUse = selectedStyle, modelToUse = selectedModel, toneToUse = selectedTone, chosenFacts = null) => {
    setRegenerating(true)
    const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(styleToUse) || pkg.isYouTube
    const allStyles = [...FEUILLETON_STYLES, ...YOUTUBE_TOPIC_STYLES]
    const styleName = allStyles.find(s => s.id === styleToUse)?.name || styleToUse
    const modelName = AI_MODELS.find(m => m.id === modelToUse)?.name || modelToUse
    const toneLabel = toneToUse === 'analytics' ? '🧠 Аналитика' : '💥 Сатира'
    const toastId = toast.loading(chosenFacts?.length ? `✨ Сценарий по ${chosenFacts.length} фактам...` : `🔄 Перегенерация текста (${toneLabel})...`, {
      description: `${modelName} | ${styleName}`,
    })

    try {
      const endpoint = isYt ? '/api/youtube/regenerate-script' : '/api/generate-feuilleton'
      const payload = isYt
        ? { folderName: pkg.folderName, bundleDir: pkg.bundleDir, style: styleToUse, selectedFacts: chosenFacts }
        : {
            folderName: pkg.folderName, bundleDir: pkg.bundleDir, url: pkg.url || pkg.link || '',
            title: pkg.original_title || pkg.title,
            summary: chosenFacts?.length ? chosenFacts.map(f => `${f.title}: ${f.text}`).join('\n\n') : (originalNews || pkg.original_news || pkg.summary || (text ? text.slice(0, 350) : '') || ''),
            style: styleToUse, tone: toneToUse, source: pkg.source || '', model: modelToUse,
            saveToPackage: Boolean(pkg.folderName || pkg.bundleDir),
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
        pkg.selectedFacts = chosenFacts || null
        if (fData.title) pkg.title = fData.title
        if (onSaved) onSaved()
        toast.success(chosenFacts?.length ? `🎉 Сценарий создан по ${chosenFacts.length} ключевым фактам!` : '✨ Новый вариант текста готов и сохранен!', { id: toastId })
      } else {
        toast.warning('Ответ ИИ не содержит нового текста', { id: toastId })
      }
    } catch (err) {
      toast.error('Ошибка перегенерации', { id: toastId, description: err.message })
    } finally {
      setRegenerating(false)
    }
  }

  const handleSaveText = async () => {
    if (!text.trim() && !originalNews.trim()) return
    setSavingText(true)
    const toastId = toast.loading('Сохранение script.txt и оригинала...', { description: 'Обновление файлов на диске...' })

    try {
      const res = await fetch('/api/save-script-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bundleDir: pkg.bundleDir, folderName: pkg.folderName, text, originalNews }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения текста')

      pkg.scriptTxt = text
      pkg.original_news = originalNews
      pkg.summary = originalNews
      if (onSaved) onSaved()

      toast.success('💾 Сценарий и оригинальная новость успешно сохранены!', {
        id: toastId,
        description: `Сохранено в news/${data.folderName}/script.txt и source.txt`,
        duration: 6000,
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
                    onChange={e => setOriginalNews(e.target.value)}
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
    </div>
  )
}
