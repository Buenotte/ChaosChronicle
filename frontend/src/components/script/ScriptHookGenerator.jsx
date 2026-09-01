import { useState } from 'react'
import { toast } from 'sonner'

export default function ScriptHookGenerator({ title, summary, currentText, onApplyHook }) {
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [hooks, setHooks] = useState([])

  const fetchHooks = async () => {
    setLoading(true)
    const toastId = toast.loading('⚡ Создание 5 вирусных 3-секундных хуков для YouTube...')
    try {
      const res = await fetch('/api/generate-hooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || '',
          summary: summary || '',
          text: currentText ? currentText.slice(0, 1000) : '',
        }),
      })
      const data = await res.json()
      toast.dismiss(toastId)
      if (data.success && Array.isArray(data.hooks) && data.hooks.length > 0) {
        setHooks(data.hooks)
        setIsOpen(true)
        toast.success('🎯 5 вирусных 3-секундных хуков созданы!')
      } else {
        toast.error('Не удалось сгенерировать хуки: ' + (data.error || 'Ошибка ИИ'))
      }
    } catch (e) {
      toast.dismiss(toastId)
      toast.error('Ошибка запроса: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = (hookText, mode = 'replace_first') => {
    if (!hookText) return
    let updated = currentText || ''
    if (mode === 'replace_first') {
      const match = updated.match(/^([^\n.!?]+[.!?]\s*)/)
      if (match) {
        updated = hookText.trim() + '\n\n' + updated.slice(match[0].length).trim()
      } else {
        updated = hookText.trim() + '\n\n' + updated.trim()
      }
    } else {
      updated = hookText.trim() + '\n\n' + updated.trim()
    }
    if (onApplyHook) onApplyHook(updated)
    toast.success('✅ Хук успешно вставлен в начало текста диктора!')
  }

  const handleCopy = (hookText) => {
    navigator.clipboard.writeText(hookText)
    toast.success('📋 Хук скопирован в буфер обмена')
  }

  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <button
          type="button"
          className="copy-btn"
          disabled={loading}
          onClick={hooks.length > 0 ? () => setIsOpen(!isOpen) : fetchHooks}
          style={{
            background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.82rem',
            padding: '0.42rem 0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 10px rgba(245, 158, 11, 0.25)',
          }}
          title="Сгенерировать 5 вариантов взрывных первых фраз (0-3 сек) для удержания на YouTube"
        >
          <span>⚡ {loading ? '⏳ Генерация хуков...' : '3-сек. YouTube Хуки'}</span>
          <span style={{ background: 'rgba(0,0,0,0.3)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.72rem' }}>
            {hooks.length > 0 ? (isOpen ? '▲ Скрыть' : `▼ 5 вариантов`) : '✨ 5 вариантов'}
          </span>
        </button>

        {hooks.length > 0 && isOpen && (
          <button
            type="button"
            className="copy-btn"
            disabled={loading}
            onClick={fetchHooks}
            style={{ background: '#1e293b', fontSize: '0.75rem', padding: '0.3rem 0.6rem', border: '1px solid #334155' }}
          >
            🔄 Обновить варианты
          </button>
        )}
      </div>

      {isOpen && hooks.length > 0 && (
        <div style={{ marginTop: '0.65rem', background: '#0b1120', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
            🎯 Выберите лучший хук для первых 3 секунд видео (нажмите для вставки в текст):
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '240px', overflowY: 'auto' }}>
            {hooks.map((h, idx) => (
              <div
                key={idx}
                draggable="true"
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', h.hook)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
                style={{
                  background: '#131d33',
                  border: '1px solid #1e293b',
                  borderRadius: '6px',
                  padding: '0.55rem 0.75rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '0.6rem',
                  cursor: 'grab',
                }}
                title="🖐️ Зажмите мышкой и перетащите этот хук в поле текста диктора"
              >
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.68rem', fontWeight: 700, padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', marginBottom: '0.25rem' }}>
                    <span>{h.type}</span>
                    <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>🖐️ drag</span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#f1f5f9', fontWeight: 600, lineHeight: 1.35 }}>
                    «{h.hook}»
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleApply(h.hook, 'replace_first')}
                    style={{ background: '#10b981', fontSize: '0.75rem', padding: '0.35rem 0.65rem', fontWeight: 700 }}
                    title="Заменить первое предложение текста на этот хук"
                  >
                    ➕ Вставить
                  </button>
                  <button
                    type="button"
                    className="copy-btn"
                    onClick={() => handleCopy(h.hook)}
                    style={{ background: '#334155', fontSize: '0.75rem', padding: '0.35rem 0.5rem' }}
                    title="Скопировать хук"
                  >
                    📋
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
