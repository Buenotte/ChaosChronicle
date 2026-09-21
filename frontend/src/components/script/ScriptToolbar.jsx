import { useState } from 'react'
import { toast } from 'sonner'
import YouTubeFactsModal from '../YouTubeFactsModal'
import { AI_MODELS, FEUILLETON_STYLES, YOUTUBE_TOPIC_STYLES } from '../../lib/utils'

export default function ScriptToolbar({
  pkg,
  originalNews,
  selectedModel,
  setSelectedModel,
  selectedStyle,
  setSelectedStyle,
  selectedTone,
  setSelectedTone,
  regenerating,
  onRegenerate,
}) {
  const [facts, setFacts] = useState([])
  const [factsLoading, setFactsLoading] = useState(false)
  const [showFactsModal, setShowFactsModal] = useState(false)

  const handleOpenFacts = async () => {
    if (facts.length > 0) {
      setShowFactsModal(true)
      return
    }
    setFactsLoading(true)
    const toastId = toast.loading('🔍 Извлечение 20 фактов из оригинального текста...')
    try {
      const res = await fetch('/api/youtube/extract-facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: pkg?.folderName,
          bundleDir: pkg?.bundleDir,
          text: originalNews || pkg?.original_news || pkg?.summary || '',
          title: pkg?.original_title || pkg?.title || 'Новость',
        }),
      })
      const data = await res.json()
      toast.dismiss(toastId)
      if (data.success && data.facts?.length > 0) {
        setFacts(data.facts)
        setShowFactsModal(true)
        toast.success(`🎉 Найдено ${data.facts.length} ключевых фактов!`)
      } else {
        toast.error(data.error || 'Не удалось извлечь факты из текста')
      }
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('Ошибка анализа фактов: ' + err.message)
    } finally {
      setFactsLoading(false)
    }
  }

  const handleConfirmFacts = (chosenFacts) => {
    setShowFactsModal(false)
    onRegenerate(selectedStyle, selectedModel, selectedTone, chosenFacts)
  }

  return (
    <div style={{ background: '#0f172a', padding: '0.65rem 0.9rem', borderRadius: '8px', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>🤖 Модель:</span>
          <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)} disabled={regenerating} style={{ background: '#020617', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '0.3rem 0.55rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            {AI_MODELS.map(m => (<option key={m.id} value={m.id}>{m.icon} {m.name}</option>))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>🎨 Стиль:</span>
          <select value={selectedStyle} onChange={e => setSelectedStyle(e.target.value)} disabled={regenerating} style={{ background: '#020617', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', padding: '0.3rem 0.55rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>
            <optgroup label="🎬 YouTube стили">{YOUTUBE_TOPIC_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
            <optgroup label="🎭 Авторские (Сатира)">{FEUILLETON_STYLES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</optgroup>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '6px', padding: '2px', border: '1px solid #334155' }}>
          <button type="button" onClick={() => setSelectedTone('grotesque')} style={{ background: selectedTone === 'grotesque' ? '#dc2626' : 'transparent', color: selectedTone === 'grotesque' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.22rem 0.45rem', fontSize: '0.75rem', fontWeight: selectedTone === 'grotesque' ? 700 : 500, cursor: 'pointer' }}>💥 Сатира</button>
          <button type="button" onClick={() => setSelectedTone('analytics')} style={{ background: selectedTone === 'analytics' ? '#2563eb' : 'transparent', color: selectedTone === 'analytics' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.22rem 0.45rem', fontSize: '0.75rem', fontWeight: selectedTone === 'analytics' ? 700 : 500, cursor: 'pointer' }}>🧠 Аналитика</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Опция 1: Извлечь 20 фактов и выбрать */}
        <button
          type="button"
          onClick={handleOpenFacts}
          disabled={regenerating || factsLoading}
          style={{
            fontSize: '0.8rem', padding: '0.36rem 0.75rem', background: '#d97706', border: 'none',
            color: '#fff', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          }}
          title="Извлечь 20 фактов из оригинального текста и сгенерировать по выбранным"
        >
          {factsLoading ? '⏳ Анализ...' : '🔍 Выбрать из 20 фактов'}
        </button>

        {/* Опция 2: Сгенерировать напрямую из оригинальной новости целиком */}
        <button
          type="button"
          className="refresh-btn"
          onClick={() => onRegenerate(selectedStyle, selectedModel, selectedTone, null)}
          disabled={regenerating}
          style={{
            fontSize: '0.8rem', padding: '0.36rem 0.75rem', background: '#7c3aed', border: 'none',
            color: '#f8fafc', fontWeight: 700, borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          }}
          title="Сгенерировать текст из оригинальной новости целиком"
        >
          {regenerating ? '⏳ Генерация...' : '🔄 Из оригинала целиком'}
        </button>
      </div>

      {showFactsModal && (
        <YouTubeFactsModal
          isOpen={showFactsModal}
          onClose={() => setShowFactsModal(false)}
          facts={facts}
          videoTitle={pkg?.title || pkg?.original_title || 'Оригинальный текст'}
          onConfirm={handleConfirmFacts}
          loading={regenerating}
        />
      )}
    </div>
  )
}
