import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { FEUILLETON_STYLES, AI_MODELS } from '../lib/utils'

export default function FeuilletonModal({ feuilleton, onOpenPhotos, onClose, onRefreshPackages }) {
  if (!feuilleton) return null

  const [currentText, setCurrentText] = useState(feuilleton.text || '')
  const [currentTitle, setCurrentTitle] = useState(feuilleton.title || '')
  const [selectedStyle, setSelectedStyle] = useState(feuilleton.style || feuilleton.scriptStyle || 'clickbait')
  const [selectedModel, setSelectedModel] = useState(feuilleton.modelName || feuilleton.model || 'gemini')
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedInfo, setSavedInfo] = useState(feuilleton.bundleDir ? feuilleton : null)

  useEffect(() => {
    if (feuilleton) {
      setCurrentText(feuilleton.text || '')
      setCurrentTitle(feuilleton.title || '')
      setSelectedStyle(feuilleton.style || feuilleton.scriptStyle || 'clickbait')
      setSelectedModel(feuilleton.modelName || feuilleton.model || 'gemini')
      setSavedInfo(feuilleton.bundleDir ? feuilleton : null)
    }
  }, [feuilleton])

  const words = currentText.split(/\s+/).filter(Boolean).length
  const minutes = Math.round((words / 140) * 10) / 10

  const handleRegenerateStyle = async (newStyle = selectedStyle, newModel = selectedModel) => {
    setSelectedStyle(newStyle)
    setSelectedModel(newModel)
    setRegenerating(true)
    const styleName = FEUILLETON_STYLES.find(s => s.id === newStyle)?.name || newStyle
    const modelName = AI_MODELS.find(m => m.id === newModel)?.name || newModel
    const toastId = toast.loading('🔄 Переписывание фельетона...', {
      description: `${modelName} | ${styleName}`,
    })

    try {
      const res = await fetch('/api/generate-feuilleton', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: feuilleton.originalTitle || feuilleton.title,
          summary: feuilleton.summary,
          model: newModel,
          style: newStyle,
          source: feuilleton.source,
          imageUrl: feuilleton.imageUrl,
          images: feuilleton.images || [],
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка генерации')

      const fData = data.feuilleton || data
      setCurrentText(fData.text || '')
      setCurrentTitle(fData.title || currentTitle)
      setSelectedStyle(newStyle)
      setSelectedModel(newModel)
      setSavedInfo(null)
      toast.success('✨ Новый вариант фельетона готов!', { id: toastId })
    } catch (err) {
      toast.error('Ошибка перегенерации', { id: toastId, description: err.message })
    } finally {
      setRegenerating(false)
    }
  }

  const handleSavePackage = async () => {
    setSaving(true)
    const toastId = toast.loading('💾 Сохранение видео-пакета в news/...', {
      description: 'Создание папки, сохранение фото, script.txt и project.json...',
    })

    try {
      const res = await fetch('/api/save-news-package', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentTitle,
          original_title: feuilleton.originalTitle || feuilleton.title || currentTitle,
          url: feuilleton.url || feuilleton.link || '',
          text: currentText,
          model: selectedModel,
          style: selectedStyle,
          source: feuilleton.source,
          imageUrl: feuilleton.imageUrl,
          images: feuilleton.images || [],
          folderName: savedInfo?.folderName,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения')

      setSavedInfo({ ...data, style: selectedStyle, model: selectedModel })
      if (onRefreshPackages) onRefreshPackages()
      toast.success('📦 Видео-пакет успешно сохранен!', {
        id: toastId,
        description: `Папка: news/${data.folderName} | Фото: ${data.savedPhotosCount || 0} шт.`,
        duration: 8000,
      })
    } catch (err) {
      toast.error('Ошибка сохранения пакета', { id: toastId, description: err.message })
    } finally {
      setSaving(false)
    }
  }

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
              <span className="modal-badge" style={{ background: '#7c3aed', color: '#fff' }}>
                🎭 3-Минутный Сатирический Фельетон
              </span>
              {!currentText ? (
                <span style={{ fontSize: '0.78rem', color: '#38bdf8', background: 'rgba(56, 189, 248, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                  ⚙️ Настройка параметров генерации
                </span>
              ) : (!savedInfo && (
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
            {feuilleton.summary && (
              <div style={{ background: '#111827', padding: '0.85rem 1.1rem', borderRadius: '8px', borderLeft: '4px solid #7c3aed' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Суть новости:
                </span>
                <p style={{ fontSize: '0.9rem', color: '#e5e7eb', marginTop: '0.25rem', lineHeight: '1.5' }}>
                  {feuilleton.summary}
                </p>
              </div>
            )}

            {/* 1. Выбор ИИ Модели */}
            <div style={{ background: '#181c27', padding: '1rem', borderRadius: '10px', border: '1px solid #232936' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6', display: 'block', marginBottom: '0.55rem' }}>
                🤖 1. Выберите модель ИИ:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                {AI_MODELS.map(m => {
                  const isSel = selectedModel === m.id
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSelectedModel(m.id)}
                      disabled={regenerating}
                      style={{
                        background: isSel ? '#1d4ed8' : '#0f172a',
                        border: isSel ? '2px solid #60a5fa' : '1px solid #334155',
                        color: isSel ? '#fff' : '#94a3b8',
                        borderRadius: '8px',
                        padding: '0.6rem 0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: isSel ? 700 : 500,
                        fontSize: '0.85rem',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{m.icon}</span>
                      <div>
                        <div>{m.name}</div>
                        <div style={{ fontSize: '0.7rem', color: isSel ? '#dbeafe' : '#64748b' }}>{m.badge || 'Нейросеть'}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 2. Выбор Авторского Стиля */}
            <div style={{ background: '#181c27', padding: '1rem', borderRadius: '10px', border: '1px solid #232936' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6', display: 'block', marginBottom: '0.55rem' }}>
                🎭 2. Выберите авторский сатирический стиль:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.5rem' }}>
                {FEUILLETON_STYLES.map(s => {
                  const isSel = selectedStyle === s.id
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedStyle(s.id)}
                      disabled={regenerating}
                      style={{
                        background: isSel ? '#5b21b6' : '#0f172a',
                        border: isSel ? '2px solid #a78bfa' : '1px solid #334155',
                        color: isSel ? '#fff' : '#94a3b8',
                        borderRadius: '8px',
                        padding: '0.6rem 0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        cursor: 'pointer',
                        fontWeight: isSel ? 700 : 500,
                        fontSize: '0.85rem',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{s.icon}</span>
                      <div>
                        <div>{s.name.split(' (')[0]}</div>
                        <div style={{ fontSize: '0.7rem', color: isSel ? '#ede9fe' : '#64748b' }}>
                          {s.description || 'Специфический юмор и подача'}
                        </div>
                      </div>
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
                    {FEUILLETON_STYLES.map(s => (<option key={s.id} value={s.id}>{s.icon} {s.name}</option>))}
                  </select>
                </div>
              </div>
              <button type="button" className="refresh-btn" onClick={() => handleRegenerateStyle(selectedStyle, selectedModel)} disabled={regenerating} style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}>
                🔄 {regenerating ? '⏳ Генерация...' : 'Сгенерировать заново'}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#9ca3af' }}>📜 Текст монолога диктора (для голосовой озвучки ElevenLabs / EdgeTTS):</label>
              <textarea value={currentText} onChange={e => { setCurrentText(e.target.value); setSavedInfo(null); }} rows={12} style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: '8px', color: '#f3f4f6', padding: '0.85rem 1rem', fontSize: '0.92rem', lineHeight: '1.6', resize: 'vertical', fontFamily: 'inherit' }} />
            </div>
          </div>
        )}

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          {!currentText ? (
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', width: '100%', justifyContent: 'space-between' }}>
              <button
                type="button"
                onClick={() => handleRegenerateStyle(selectedStyle, selectedModel)}
                disabled={regenerating}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: regenerating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 3px 12px rgba(124, 58, 237, 0.4)',
                }}
              >
                {regenerating ? '⏳ ИИ пишет фельетон...' : '🚀 Создать фельетон (3 мин)'}
              </button>
              <button type="button" className="close-btn" onClick={onClose}>Закрыть</button>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                <button type="button" className="save-bundle-btn" onClick={handleSavePackage} disabled={saving} style={{ background: savedInfo ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)', fontWeight: 700, padding: '0.65rem 1.25rem', fontSize: '0.92rem' }}>
                  {saving ? '⏳ Сохранение...' : (savedInfo ? '✅ Видео-пакет сохранен в news/' : '💾 Сохранить видео-пакет в news/')}
                </button>
                {onOpenPhotos && (
                  <button type="button" className="photos-header-btn" onClick={() => onOpenPhotos({ title: currentTitle, images: feuilleton.images, id: feuilleton.id })} style={{ padding: '0.65rem 1rem', fontSize: '0.88rem' }}>
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
