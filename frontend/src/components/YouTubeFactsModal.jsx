import { useState, useMemo, useEffect } from 'react'
import ModalHeader from './common/ModalHeader'

export default function YouTubeFactsModal({
  isOpen, onClose, facts = [], videoTitle = '', onConfirm, loading = false,
}) {
  const [selectedIds, setSelectedIds] = useState(new Set([1, 2, 3]))
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set([1, 2, 3]))
      setSearchQuery('')
    }
  }, [isOpen])

  const filteredFacts = useMemo(() => {
    if (!searchQuery.trim()) return facts
    const q = searchQuery.toLowerCase()
    return facts.filter(f => f.title?.toLowerCase().includes(q) || f.text?.toLowerCase().includes(q))
  }, [facts, searchQuery])

  if (!isOpen) return null

  const toggleFact = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const selectTopN = (n) => setSelectedIds(new Set(facts.slice(0, n).map(f => f.id)))
  const selectAll = () => setSelectedIds(new Set(facts.map(f => f.id)))
  const clearAll = () => setSelectedIds(new Set())

  const handleGenerate = () => {
    const chosen = facts.filter(f => selectedIds.has(f.id))
    if (chosen.length > 0) onConfirm(chosen)
  }

  const selectedCount = selectedIds.size

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.86)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem',
      }}
    >
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '860px', width: '95vw', maxHeight: '90vh',
          display: 'flex', flexDirection: 'column', background: '#120f24',
          border: '1px solid #7c3aed', boxShadow: '0 25px 65px rgba(0,0,0,0.9), 0 0 35px rgba(124, 58, 237, 0.3)',
          borderRadius: '16px', color: '#f3f4f6', overflow: 'hidden',
        }}
      >
        {/* Header */}
        <ModalHeader
          icon="🔍"
          title="20 ключевых фактов & тем из видео"
          subtitle={videoTitle ? `«${videoTitle.slice(0, 80)}»` : 'Выберите факты для сценария'}
          onClose={onClose}
          style={{ flexShrink: 0, padding: '1.1rem 1.5rem', borderBottom: '1px solid #2d2248', background: '#18142b' }}
        />

        {/* Toolbar */}
        <div style={{ flexShrink: 0, padding: '0.75rem 1.5rem', background: '#161226', borderBottom: '1px solid #281e3d', display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.76rem', color: '#9ca3af', marginRight: '0.2rem' }}>Пресеты:</span>
            {[{ label: '⚡ Топ-3', count: 3 }, { label: '🌟 Топ-5', count: 5 }].map(p => (
              <button
                key={p.count} type="button" onClick={() => selectTopN(p.count)}
                style={{
                  background: selectedCount === p.count ? '#6d28d9' : '#241a45', color: '#e0e7ff',
                  border: '1px solid #6d28d9', borderRadius: '6px', padding: '0.35rem 0.65rem',
                  fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
            <button type="button" onClick={selectAll} style={{ background: '#241a45', color: '#c4b5fd', border: '1px solid #4c1d95', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', cursor: 'pointer' }}>
              Все ({facts.length})
            </button>
            <button type="button" onClick={clearAll} style={{ background: '#1f1a30', color: '#9ca3af', border: '1px solid #3730a3', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.78rem', cursor: 'pointer' }}>
              Снять
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="text" placeholder="Поиск по фактам..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{ background: '#1f1b36', border: '1px solid #4c1d95', borderRadius: '6px', padding: '0.35rem 0.75rem', color: '#ffffff', fontSize: '0.8rem', outline: 'none', width: '180px' }}
            />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: selectedCount > 0 ? '#4ade80' : '#f87171', background: '#181427', padding: '0.35rem 0.65rem', borderRadius: '6px', border: '1px solid #33274f' }}>
              Выбрано: {selectedCount} из {facts.length}
            </span>
          </div>
        </div>

        {/* Fact list body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredFacts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
              Ничего не найдено по запросу «{searchQuery}»
            </div>
          ) : (
            filteredFacts.map(fact => {
              const isSelected = selectedIds.has(fact.id)
              return (
                <div
                  key={fact.id} onClick={() => toggleFact(fact.id)}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: '0.85rem', padding: '0.85rem 1rem',
                    borderRadius: '10px', background: isSelected ? 'linear-gradient(135deg, #241647, #1c1438)' : '#17132a',
                    border: isSelected ? '1.5px solid #8b5cf6' : '1px solid #2d2447',
                    boxShadow: isSelected ? '0 0 16px rgba(139, 92, 246, 0.2)' : 'none',
                    cursor: 'pointer', transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox" checked={isSelected} onChange={() => toggleFact(fact.id)}
                    onClick={e => e.stopPropagation()}
                    style={{ marginTop: '0.2rem', width: '17px', height: '17px', cursor: 'pointer', accentColor: '#8b5cf6' }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, padding: '0.15rem 0.45rem', borderRadius: '4px', background: isSelected ? '#7c3aed' : '#2b2347', color: isSelected ? '#ffffff' : '#a78bfa' }}>
                        #{fact.id}
                      </span>
                      <strong style={{ fontSize: '0.92rem', color: isSelected ? '#ffffff' : '#e2e8f0' }}>
                        {fact.title}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                      {fact.text}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ flexShrink: 0, padding: '1rem 1.5rem', borderTop: '1px solid #2d2248', background: '#18142b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            type="button" onClick={onClose} disabled={loading}
            style={{ background: '#27272a', color: '#d4d4d8', border: 'none', borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '0.86rem', cursor: 'pointer' }}
          >
            Отмена
          </button>
          <button
            type="button" onClick={handleGenerate} disabled={selectedCount === 0 || loading}
            style={{
              background: selectedCount > 0 && !loading ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : '#4b5563',
              color: '#ffffff', border: 'none', borderRadius: '8px', padding: '0.65rem 1.4rem',
              fontSize: '0.88rem', fontWeight: 700, cursor: selectedCount > 0 && !loading ? 'pointer' : 'not-allowed',
              boxShadow: selectedCount > 0 ? '0 4px 14px rgba(139, 92, 246, 0.4)' : 'none',
            }}
          >
            {loading ? '⏳ Генерация сценария...' : `✨ Создать сценарий по выбранным (${selectedCount})`}
          </button>
        </div>
      </div>
    </div>
  )
}
