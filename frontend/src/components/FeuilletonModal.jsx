import { useState } from 'react'
import { toast } from 'sonner'
import { FEUILLETON_STYLES, AI_MODELS } from '../lib/utils'

export default function FeuilletonModal({ feuilleton, onOpenPhotos, onClose, onRefreshPackages }) {
  if (!feuilleton) return null

  const [currentText, setCurrentText] = useState(feuilleton.text || '')
  const [currentTitle, setCurrentTitle] = useState(feuilleton.title || '')
  const [selectedStyle, setSelectedStyle] = useState(feuilleton.style || 'golubuzki')
  const [selectedModel, setSelectedModel] = useState(feuilleton.modelName || 'gemini')
  const [regenerating, setRegenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedInfo, setSavedInfo] = useState(feuilleton.bundleDir ? feuilleton : null)

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
          model: feuilleton.modelName || 'gemini',
          source: feuilleton.source,
          imageUrl: feuilleton.imageUrl,
          images: feuilleton.images || [],
          folderName: savedInfo?.folderName,
        }),
      })

      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Ошибка сохранения')

      setSavedInfo(data)
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
              {!savedInfo && (
                <span style={{ fontSize: '0.78rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
                  ⚠️ Черновик (нажмите «Сохранить видео-пакет»)
                </span>
              )}
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.2rem', marginTop: '0.4rem' }}>
              {currentTitle}
            </h2>
            <div className="modal-stats" style={{ marginTop: '0.3rem' }}>
              <span>⏱️ ~{minutes} мин.</span>
              <span>📝 Слов: {words}</span>
              <span>🤖 Модель: {feuilleton.modelName || 'Gemini'}</span>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Панель выбора стиля, модели ИИ и перегенерации */}
          <div style={{ background: '#131b2e', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#93c5fd' }}>
                  🤖 Модель:
                </span>
                <select
                  value={selectedModel}
                  onChange={e => {
                    setSelectedModel(e.target.value)
                    handleRegenerateStyle(selectedStyle, e.target.value)
                  }}
                  disabled={regenerating}
                  style={{
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {AI_MODELS.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.icon} {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.86rem', fontWeight: 600, color: '#93c5fd' }}>
                  🎨 Стиль:
                </span>
                <select
                  value={selectedStyle}
                  onChange={e => {
                    setSelectedStyle(e.target.value)
                    handleRegenerateStyle(e.target.value, selectedModel)
                  }}
                  disabled={regenerating}
                  style={{
                    background: '#1e293b',
                    color: '#fff',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    padding: '0.4rem 0.65rem',
                    fontSize: '0.84rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {FEUILLETON_STYLES.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.icon} {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              className="refresh-btn"
              onClick={() => handleRegenerateStyle(selectedStyle, selectedModel)}
              disabled={regenerating}
              style={{ fontSize: '0.82rem', padding: '0.4rem 0.85rem' }}
            >
              🔄 {regenerating ? '⏳ Генерация...' : 'Сгенерировать (AI)'}
            </button>
          </div>

          {/* Редактируемый текст фельетона */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600, color: '#9ca3af' }}>
              📜 Текст монолога диктора (для голосовой озвучки ElevenLabs / EdgeTTS):
            </label>
            <textarea
              value={currentText}
              onChange={e => {
                setCurrentText(e.target.value)
                setSavedInfo(null)
              }}
              rows={12}
              style={{
                width: '100%',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '8px',
                color: '#f3f4f6',
                padding: '0.85rem 1rem',
                fontSize: '0.92rem',
                lineHeight: '1.6',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button
              type="button"
              className="save-bundle-btn"
              onClick={handleSavePackage}
              disabled={saving}
              style={{
                background: savedInfo ? 'linear-gradient(135deg, #059669 0%, #047857 100%)' : 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)',
                fontWeight: 700,
                padding: '0.65rem 1.25rem',
                fontSize: '0.92rem',
              }}
            >
              {saving ? '⏳ Сохранение...' : (savedInfo ? '✅ Видео-пакет сохранен в news/' : '💾 Сохранить видео-пакет в news/')}
            </button>

            {onOpenPhotos && (
              <button
                type="button"
                className="photos-header-btn"
                onClick={() => onOpenPhotos({ title: currentTitle, images: feuilleton.images, id: feuilleton.id })}
                style={{ padding: '0.65rem 1rem', fontSize: '0.88rem' }}
              >
                🖼️ Фото к новости
              </button>
            )}
          </div>

          <button type="button" className="close-btn" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}
