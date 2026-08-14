import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function TitleVariantsModal({ pkg, onClose, onTitleSaved }) {
  if (!pkg) return null

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [variants, setVariants] = useState([])
  const [selectedTitle, setSelectedTitle] = useState(pkg.title || '')
  const [originalNewsTitle, setOriginalNewsTitle] = useState(pkg.original_title || pkg.title || '')

  const fetchVariants = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/generate-title-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pkg.original_title || pkg.title || '',
          summary: pkg.summary || '',
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
        }),
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.variants) && data.variants.length > 0) {
        setVariants(data.variants)
        if (data.resolvedTitle) {
          setOriginalNewsTitle(data.resolvedTitle)
        }
        if (!selectedTitle || selectedTitle === pkg.title) {
          setSelectedTitle(data.variants[0])
        }
      } else {
        toast.error('Не удалось получить варианты: ' + (data.error || 'Ошибка ИИ'))
      }
    } catch (err) {
      toast.error('Ошибка загрузки вариантов: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setOriginalNewsTitle(pkg.original_title || pkg.title || '')
    fetchVariants()
  }, [pkg])

  const handleSave = async () => {
    if (!selectedTitle.trim()) {
      toast.error('Пожалуйста, выберите или введите заголовок')
      return
    }

    try {
      setSaving(true)
      const res = await fetch('/api/update-package-title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          newTitle: selectedTitle.trim(),
          updateThumbnail: true,
        }),
      })

      const data = await res.json()
      if (data.success) {
        toast.success(`🎉 Заголовок сохранен в пакет: "${data.newTitle}"`)
        if (onTitleSaved) {
          onTitleSaved(data.newTitle, data.thumbnailUrl)
        }
        onClose()
      } else {
        toast.error('Ошибка сохранения: ' + (data.error || 'Неизвестная ошибка'))
      }
    } catch (err) {
      toast.error('Ошибка сохранения заголовка: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 99999 }}>
      <div
        className="modal-content"
        style={{ maxWidth: '720px', width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
              ⚡ 10 вариантов заголовков (Стиль Голобуцкого)
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
              Сатирическая деконструкция, 4–5 слов, максимальный вирусный охват для YouTube
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Исходная тема */}
          <div style={{ background: '#18181b', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #27272a' }}>
            <span style={{ fontSize: '0.75rem', color: '#a1a1aa', display: 'block', fontWeight: 600 }}>
              📰 ИСХОДНАЯ НОВОСТЬ:
            </span>
            <span style={{ fontSize: '0.9rem', color: '#e4e4e7', fontWeight: 600 }}>
              {originalNewsTitle || pkg.original_title || pkg.title}
            </span>
          </div>

          {/* Список 10 вариантов */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
                🎯 Выберите лучший заголовок (кликните):
              </label>
              <button
                type="button"
                className="copy-btn"
                disabled={loading}
                onClick={fetchVariants}
                style={{ background: '#3b82f6', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
              >
                {loading ? '⏳ Генерация...' : '🔄 Сгенерировать еще 10'}
              </button>
            </div>

            {loading && variants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#a1a1aa' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🤖</div>
                ИИ создает 10 сатирических заголовков в стиле Голобуцкого...
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {variants.map((variant, idx) => {
                  const isSelected = selectedTitle === variant
                  return (
                    <div
                      key={idx}
                      onClick={() => setSelectedTitle(variant)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        background: isSelected ? 'rgba(59, 130, 246, 0.18)' : '#18181b',
                        border: isSelected ? '2px solid #3b82f6' : '1px solid #27272a',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.75rem',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isSelected ? '#3b82f6' : '#27272a',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: isSelected ? '#60a5fa' : '#f4f4f5', flex: 1, letterSpacing: '0.3px' }}>
                        {variant}
                      </span>
                      {isSelected && (
                        <span style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.9rem' }}>
                          ✓ ВЫБРАН
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Редактирование выбранного варианта */}
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.35rem', fontWeight: 600 }}>
              ✏️ Редактировать выбранный заголовок:
            </label>
            <input
              type="text"
              value={selectedTitle}
              onChange={e => setSelectedTitle(e.target.value)}
              style={{
                width: '100%',
                background: '#18181b',
                color: '#fff',
                border: '1px solid #3b82f6',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                fontSize: '1rem',
                fontWeight: 700,
              }}
              placeholder="Выбранный заголовок..."
            />
          </div>

          {/* Кнопки действий */}
          <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', borderTop: '1px solid #27272a', paddingTop: '1rem' }}>
            <button
              className="copy-btn"
              disabled={saving || !selectedTitle.trim()}
              style={{
                background: '#10b981',
                flex: 1,
                padding: '0.75rem',
                fontSize: '1rem',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
              }}
              onClick={handleSave}
            >
              {saving ? '⏳ Сохранение...' : '💾 Сохранить заголовок в пакет и обложку'}
            </button>

            <button
              className="copy-btn"
              style={{ background: '#3f3f46', padding: '0.75rem 1.2rem' }}
              onClick={onClose}
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
