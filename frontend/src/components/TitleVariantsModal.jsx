import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { FEUILLETON_STYLES } from '../lib/utils'

export default function TitleVariantsModal({ pkg, onClose, onTitleSaved }) {
  if (!pkg) return null

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState(pkg.title_variants_style || 'golubuzki')
  const [variants, setVariants] = useState(pkg.title_variants || [])
  const [selectedTitle, setSelectedTitle] = useState(pkg.title || '')
  const [originalNewsTitle, setOriginalNewsTitle] = useState(pkg.original_title || pkg.title || '')

  const fetchVariants = async (force = false, overrideStyle = null) => {
    const styleToUse = overrideStyle || selectedStyle
    try {
      setLoading(true)
      const res = await fetch('/api/generate-title-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pkg.original_title || pkg.title || '',
          summary: pkg.summary || '',
          text: pkg.scriptTxt || pkg.text || '',
          bundleDir: pkg.bundleDir,
          folderName: pkg.folderName,
          style: styleToUse,
          forceRegenerate: force,
        }),
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.variants) && data.variants.length > 0) {
        setVariants(data.variants)
        if (data.resolvedTitle) setOriginalNewsTitle(data.resolvedTitle)
        if (!selectedTitle || selectedTitle === pkg.title) {
          setSelectedTitle(data.variants[0])
        }
        if (force) {
          toast.success('✨ 10 новых вариантов заголовков сгенерировано!')
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
    if (pkg.title_variants && pkg.title_variants.length > 0) {
      setVariants(pkg.title_variants)
    } else {
      fetchVariants(false)
    }
  }, [pkg?.folderName])

  const handleStyleChange = (e) => {
    const newStyle = e.target.value
    setSelectedStyle(newStyle)
    fetchVariants(true, newStyle)
  }

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
        if (onTitleSaved) onTitleSaved(data.newTitle, data.thumbnailUrl)
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
        style={{ maxWidth: '750px', width: '95vw', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.2rem' }}>
              ⚡ 10 вариантов заголовков
            </h2>
            <p style={{ fontSize: '0.8rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
              Хлесткие, вирусные заголовки 4–5 слов для YouTube и превью
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

          {/* Панель выбора авторского стиля */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', background: '#131b2e', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid #1e3a8a' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: '#93c5fd', whiteSpace: 'nowrap' }}>
                🎭 Стиль автора:
              </label>
              <select
                value={selectedStyle}
                onChange={handleStyleChange}
                disabled={loading}
                style={{
                  background: '#0a101f',
                  border: '1px solid #2563eb',
                  color: '#fff',
                  padding: '0.35rem 0.65rem',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {FEUILLETON_STYLES.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <button
              type="button"
              className="copy-btn"
              disabled={loading}
              onClick={() => fetchVariants(true)}
              style={{ background: '#2563eb', fontSize: '0.8rem', padding: '0.35rem 0.75rem', fontWeight: 700 }}
            >
              {loading ? '⏳ Генерация...' : '🔄 Сгенерировать новые 10 вариантов'}
            </button>
          </div>

          {/* Список 10 вариантов */}
          <div>
            <label style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600, display: 'block', marginBottom: '0.4rem' }}>
              🎯 Выберите лучший заголовок (кликните):
            </label>

            {loading && variants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#a1a1aa' }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>🤖</div>
                ИИ генерирует 10 заголовков в выбранном стиле...
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
                        <span style={{ color: '#3b82f6', fontWeight: 800, fontSize: '0.85rem' }}>
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
            <button className="copy-btn" style={{ background: '#3f3f46', padding: '0.75rem 1.2rem' }} onClick={onClose}>
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
