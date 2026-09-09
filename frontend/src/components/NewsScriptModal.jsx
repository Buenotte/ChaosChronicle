import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { FEUILLETON_STYLES, AI_MODELS } from '../lib/utils'
import ScriptHookGenerator from './script/ScriptHookGenerator'

export default function NewsScriptModal({ pkg, onClose, onSaved }) {
  if (!pkg) return null

  const [text, setText] = useState(pkg.scriptTxt || pkg.scriptMd || '')
  const [originalNews, setOriginalNews] = useState(pkg.original_news || pkg.summary || pkg.originalNews || '')
  const [showOriginal, setShowOriginal] = useState(true)
  const [selectedStyle, setSelectedStyle] = useState('golubuzki')
  const [selectedModel, setSelectedModel] = useState(pkg.model || 'gemini')
  const [selectedTone, setSelectedTone] = useState(pkg.tone || 'grotesque')
  const [savingText, setSavingText] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Drag & Drop State für Verschiebbarkeit
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, initialX: 0, initialY: 0 })

  useEffect(() => {
    setText(pkg.scriptTxt || pkg.scriptMd || '')
    setOriginalNews(pkg.original_news || pkg.summary || pkg.originalNews || '')
    setPos({ x: 0, y: 0 })

    // Live-Abruf der Datei direkt von der Festplatte
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

  // Drag Event Handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.modal-close') || e.target.closest('button') || e.target.closest('textarea') || e.target.closest('.draggable-title-chip')) return
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: pos.x,
      initialY: pos.y,
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return
      const dx = e.clientX - dragRef.current.startX
      const dy = e.clientY - dragRef.current.startY
      setPos({
        x: dragRef.current.initialX + dx,
        y: dragRef.current.initialY + dy,
      })
    }

    const handleMouseUp = () => {
      if (isDragging) setIsDragging(false)
    }

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  const handleRegenerateScript = async (styleToUse = selectedStyle, modelToUse = selectedModel, toneToUse = selectedTone) => {
    setRegenerating(true)
    const styleName = FEUILLETON_STYLES.find(s => s.id === styleToUse)?.name || styleToUse
    const modelName = AI_MODELS.find(m => m.id === modelToUse)?.name || modelToUse
    const toneLabel = toneToUse === 'analytics' ? '🧠 Аналитика' : '💥 Сатира'
    const toastId = toast.loading(`🔄 Перегенерация текста (${toneLabel})...`, {
      description: `${modelName} | ${styleName}`,
    })

    try {
      const res = await fetch('/api/generate-feuilleton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pkg.original_title || pkg.title,
          summary: originalNews || pkg.original_news || pkg.summary || (text ? text.slice(0, 350) : '') || '',
          style: styleToUse,
          tone: toneToUse,
          source: pkg.source || '',
          model: modelToUse,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка генерации текста')

      const fData = data.feuilleton || data
      const newText = fData.text || data.text || ''
      if (newText) {
        setText(newText)
        toast.success('✨ Новый вариант текста готов! Нажмите «Сохранить изменения»', { id: toastId })
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
    if (!text.trim()) return
    setSavingText(true)
    const toastId = toast.loading('Сохранение script.txt в папку news/...', {
      description: 'Обновление файла дикторского текста...',
    })

    try {
      const res = await fetch('/api/save-script-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          text,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения текста')

      if (onSaved) onSaved()

      toast.success('📜 Текст script.txt успешно обновлен!', {
        id: toastId,
        description: `Сохранено в news/${data.folderName}/script.txt`,
        duration: 10000,
      })
    } catch (err) {
      toast.error('Ошибка сохранения текста', {
        id: toastId,
        description: err.message,
      })
    } finally {
      setSavingText(false)
    }
  }

  const [isMaximized, setIsMaximized] = useState(false)

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
        <div
          className="modal-header draggable-header"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab', userSelect: 'none' }}
          title="Зажмите мышью, чтобы перетащить окно"
        >
          <div>
            <span className="modal-badge saved-badge">
              📜 Текст диктора (🖐️ Перетащите окно)
            </span>
            <h2 className="modal-title">{pkg.title}</h2>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            <button
              className="modal-close"
              onClick={() => setIsMaximized(!isMaximized)}
              title={isMaximized ? "Свернуть окно" : "Развернуть во весь экран"}
            >
              {isMaximized ? '🗗' : '🗖'}
            </button>
            <button className="modal-close" onClick={onClose} title="Закрыть окно">✕</button>
          </div>
        </div>

        <div className="modal-body">

          {/* Панель выбора стиля, модели ИИ и перегенерации текста */}
          <div style={{ background: '#0f172a', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8' }}>🤖 Модель:</span>
                <select value={selectedModel} onChange={e => { setSelectedModel(e.target.value); handleRegenerateScript(selectedStyle, e.target.value) }} disabled={regenerating} style={{ background: '#020617', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                  {AI_MODELS.map(m => (<option key={m.id} value={m.id}>{m.icon} {m.name}</option>))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8' }}>🎨 Стиль:</span>
                <select value={selectedStyle} onChange={e => { setSelectedStyle(e.target.value); handleRegenerateScript(e.target.value, selectedModel) }} disabled={regenerating} style={{ background: '#020617', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>
                  {FEUILLETON_STYLES.map(s => (<option key={s.id} value={s.id}>{s.icon} {s.name}</option>))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '6px', padding: '2px', border: '1px solid #334155' }}>
                <button type="button" onClick={() => setSelectedTone('grotesque')} style={{ background: selectedTone === 'grotesque' ? '#dc2626' : 'transparent', color: selectedTone === 'grotesque' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.24rem 0.5rem', fontSize: '0.75rem', fontWeight: selectedTone === 'grotesque' ? 700 : 500, cursor: 'pointer' }}>💥 Сатира</button>
                <button type="button" onClick={() => setSelectedTone('analytics')} style={{ background: selectedTone === 'analytics' ? '#2563eb' : 'transparent', color: selectedTone === 'analytics' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.24rem 0.5rem', fontSize: '0.75rem', fontWeight: selectedTone === 'analytics' ? 700 : 500, cursor: 'pointer' }}>🧠 Аналитика</button>
              </div>
            </div>
            <button type="button" className="refresh-btn" onClick={() => handleRegenerateScript(selectedStyle, selectedModel, selectedTone)} disabled={regenerating} style={{ fontSize: '0.8rem', padding: '0.38rem 0.85rem', background: '#1e293b', border: '1px solid #475569', color: '#f8fafc', fontWeight: 700, borderRadius: '6px', cursor: 'pointer' }}>
              🔄 {regenerating ? '⏳ Генерация...' : 'Сгенерировать (AI)'}
            </button>
          </div>

          {/* Исходный текст Telegram / Новости */}
          {originalNews && (
            <div style={{ background: '#0b1120', border: '1px solid #38bdf8', borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: '0.75rem', boxShadow: '0 2px 8px rgba(0,0,0,0.35)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span>📰</span> ИСХОДНАЯ НОВОСТЬ ({pkg.source || 'Telegram / Источник'}):
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                    ({originalNews.split(/\s+/).filter(Boolean).length} слов)
                  </span>
                </span>
                <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(originalNews);
                      toast.success('Оригинальный текст скопирован!');
                    }}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#38bdf8', borderRadius: '4px', padding: '0.15rem 0.45rem', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    📋 Копировать
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowOriginal(!showOriginal)}
                    style={{ background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', padding: '0.15rem 0.45rem', fontSize: '0.72rem', cursor: 'pointer' }}
                  >
                    {showOriginal ? 'Свернуть ▲' : 'Развернуть ▼'}
                  </button>
                </div>
              </div>
              {showOriginal && (
                <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #1e293b', fontSize: '0.86rem', color: '#f1f5f9', lineHeight: '1.55', maxHeight: '180px', overflowY: 'auto', whiteSpace: 'pre-wrap', background: '#030712', padding: '0.5rem 0.65rem', borderRadius: '6px' }}>
                  {originalNews}
                </div>
              )}
            </div>
          )}

          {/* ⚡ 3-секундные вирусные хуки для YouTube */}
          <ScriptHookGenerator
            title={pkg.original_title || pkg.title}
            summary={originalNews || pkg.summary || ''}
            currentText={text}
            style={selectedStyle}
            tone={selectedTone}
            onApplyHook={(newText) => setText(newText)}
          />

          {/* Text Editor */}
          <div className="script-editor-wrap">
            {/* Draggable Title Chip & Fast Insert */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div
                className="draggable-title-chip"
                draggable="true"
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', pkg.title || '')
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                style={{
                  cursor: 'grab',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '1px dashed #6366f1',
                  padding: '0.28rem 0.65rem',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#e2e8f0',
                  userSelect: 'none',
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
              onDrop={() => {
                toast.success('🎯 Элемент успешно перетащен в текст!')
              }}
              placeholder="Введите текст (можно перетаскивать мышкой заголовок и хуки прямо сюда)..."
              rows={12}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button
            className="save-bundle-btn"
            onClick={handleSaveText}
            disabled={savingText}
          >
            {savingText ? '⏳ Сохранение...' : '💾 Сохранить изменения в script.txt'}
          </button>
          <button className="close-btn" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </div>
  )
}
