import { useState } from 'react'
import { toast } from 'sonner'
import YouTubeFactsModal from '../YouTubeFactsModal'
import { AI_MODELS, FEUILLETON_STYLES, YOUTUBE_TOPIC_STYLES, FACT_CONCEPT_TYPES, getConceptConfig } from '../../lib/utils'

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
  const [selectedConcept, setSelectedConcept] = useState(pkg?.conceptType || 'theses')
  const [facts, setFacts] = useState([])
  const [factsLoading, setFactsLoading] = useState(false)
  const [showFactsModal, setShowFactsModal] = useState(false)
  const [factsCount, setFactsCount] = useState(10)

  const currentConcept = getConceptConfig(selectedConcept)

  const handleOpenFacts = async (targetCount = factsCount, conceptToUse = selectedConcept) => {
    const conceptCfg = getConceptConfig(conceptToUse)
    if (facts.length > 0 && facts.length >= targetCount && pkg?.conceptType === conceptToUse) {
      setShowFactsModal(true)
      return
    }
    setFactsLoading(true)
    const toastId = toast.loading(`🔍 Извлечение ${targetCount} ${conceptCfg.labelPlural} из оригинального текста...`)
    try {
      const res = await fetch('/api/youtube/extract-facts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderName: pkg?.folderName,
          bundleDir: pkg?.bundleDir,
          text: originalNews || pkg?.original_news || pkg?.summary || '',
          title: pkg?.original_title || pkg?.title || 'Новость',
          count: targetCount,
          conceptType: conceptToUse,
        }),
      })
      const data = await res.json()
      toast.dismiss(toastId)
      if (data.success && data.facts?.length > 0) {
        setFacts(data.facts)
        setShowFactsModal(true)
        toast.success(`🎉 Найдено ${data.facts.length} ${conceptCfg.labelPlural}!`)
      } else {
        toast.error(data.error || `Не удалось извлечь ${conceptCfg.labelPlural} из текста`)
      }
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('Ошибка анализа: ' + err.message)
    } finally {
      setFactsLoading(false)
    }
  }

  const handleConfirmFacts = (chosenFacts) => {
    setShowFactsModal(false)
    onRegenerate(selectedStyle, selectedModel, selectedTone, chosenFacts, selectedConcept)
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

        {/* Выбор понятия: Факты / Тезисы / Детали / Сигналы / Выводы / Пункты */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>📌 Формат:</span>
          <select
            value={selectedConcept}
            onChange={e => {
              const nextVal = e.target.value
              setSelectedConcept(nextVal)
              setFacts([]) // сброс кэша для повторного извлечения в новом формате
            }}
            disabled={regenerating}
            style={{ background: '#020617', color: '#fcd34d', border: '1px solid #d97706', borderRadius: '6px', padding: '0.3rem 0.55rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            title="Выберите понятие для ключевых пунктов сценария (Факты, Тезисы, Детали, Сигналы, Выводы, Пункты)"
          >
            {FACT_CONCEPT_TYPES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '6px', padding: '2px', border: '1px solid #334155' }}>
          <button type="button" onClick={() => setSelectedTone('grotesque')} style={{ background: selectedTone === 'grotesque' ? '#dc2626' : 'transparent', color: selectedTone === 'grotesque' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.22rem 0.45rem', fontSize: '0.75rem', fontWeight: selectedTone === 'grotesque' ? 700 : 500, cursor: 'pointer' }}>💥 Сатира</button>
          <button type="button" onClick={() => setSelectedTone('analytics')} style={{ background: selectedTone === 'analytics' ? '#2563eb' : 'transparent', color: selectedTone === 'analytics' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.22rem 0.45rem', fontSize: '0.75rem', fontWeight: selectedTone === 'analytics' ? 700 : 500, cursor: 'pointer' }}>🧠 Аналитика</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Главная кнопка: Сгенерировать дикторский текст */}
        <button
          type="button"
          className="refresh-btn"
          onClick={() => onRegenerate(selectedStyle, selectedModel, selectedTone, null, selectedConcept)}
          disabled={regenerating}
          style={{
            fontSize: '0.82rem',
            padding: '0.42rem 0.9rem',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            border: '1px solid #8b5cf6',
            color: '#ffffff',
            fontWeight: 700,
            borderRadius: '6px',
            cursor: regenerating ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: '0 2px 10px rgba(124, 58, 237, 0.45)',
          }}
          title="Сгенерировать 3-минутный дикторский текст для озвучки с помощью ИИ"
        >
          {regenerating ? '⏳ Генерация текста...' : '✨ Сгенерировать текст'}
        </button>

        {/* Дополнительная опция: Выбор и извлечение 5 / 10 / 20 пунктов */}
        <div style={{ display: 'inline-flex', alignItems: 'center', background: '#1c192e', borderRadius: '6px', border: '1px solid #d97706', padding: '2px', gap: '2px' }}>
          {[5, 10, 20].map(cnt => (
            <button
              key={cnt}
              type="button"
              onClick={() => { setFactsCount(cnt); handleOpenFacts(cnt, selectedConcept) }}
              disabled={regenerating || factsLoading}
              style={{
                fontSize: '0.76rem',
                padding: '0.28rem 0.5rem',
                background: factsCount === cnt ? '#d97706' : 'transparent',
                color: factsCount === cnt ? '#ffffff' : '#fcd34d',
                border: 'none',
                borderRadius: '4px',
                fontWeight: factsCount === cnt ? 700 : 500,
                cursor: (regenerating || factsLoading) ? 'not-allowed' : 'pointer',
              }}
              title={`Извлечь ${cnt} ${currentConcept.labelPlural} из текста`}
            >
              {cnt === 10 ? `🌟 10 ${currentConcept.labelPlural}` : cnt === 5 ? `⚡ 5` : `💎 20`}
            </button>
          ))}
        </div>
      </div>

      {showFactsModal && (
        <YouTubeFactsModal
          isOpen={showFactsModal}
          onClose={() => setShowFactsModal(false)}
          facts={facts}
          videoTitle={pkg?.title || pkg?.original_title || 'Оригинальный текст'}
          conceptType={selectedConcept}
          onConfirm={handleConfirmFacts}
          loading={regenerating}
        />
      )}
    </div>
  )
}

