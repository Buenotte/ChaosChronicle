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
  const [selectedConcept, setSelectedConcept] = useState(pkg?.customWord ? 'custom' : (pkg?.conceptType || 'theses'))
  const [customConceptWord, setCustomConceptWord] = useState(pkg?.customWord || '')
  const [scriptFormat, setScriptFormat] = useState(pkg?.scriptFormat || 'feuilleton') // 'feuilleton' (цельный текст без счета) vs 'facts' (счет пунктов вслух)
  const [facts, setFacts] = useState([])
  const [factsLoading, setFactsLoading] = useState(false)
  const [showFactsModal, setShowFactsModal] = useState(false)
  const [factsCount, setFactsCount] = useState(10)
  const [customPrompt, setCustomPrompt] = useState(pkg?.customPrompt || '')
  const [showPrompt, setShowPrompt] = useState(Boolean(pkg?.customPrompt))

  const currentConcept = getConceptConfig(selectedConcept, customConceptWord)
  const isYouTubeTopicStyle = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(selectedStyle)

  const handleOpenFacts = async (targetCount = factsCount, conceptToUse = selectedConcept, customWordToUse = customConceptWord) => {
    const conceptCfg = getConceptConfig(conceptToUse, customWordToUse)
    if (facts.length > 0 && facts.length === targetCount && pkg?.conceptType === conceptToUse && (!customWordToUse || pkg?.customWord === customWordToUse)) {
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
          customWord: customWordToUse,
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
    onRegenerate(selectedStyle, selectedModel, selectedTone, chosenFacts, selectedConcept, scriptFormat, customConceptWord, customPrompt)
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

        {/* Выбор понятия: Факты / Тезисы / Детали / Сигналы / Выводы / Пункты / Причины / Своё слово */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#94a3b8' }}>📌 Тематика:</span>
          <select
            value={selectedConcept}
            onChange={e => {
              const nextVal = e.target.value
              setSelectedConcept(nextVal)
              setFacts([]) // сброс кэша для повторного извлечения в новом формате
            }}
            disabled={regenerating}
            style={{ background: '#020617', color: '#fcd34d', border: '1px solid #d97706', borderRadius: '6px', padding: '0.3rem 0.55rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}
            title="Выберите понятие для ключевых пунктов сценария (Факты, Тезисы, Детали, Причины, Ошибки, Секреты или своё слово)"
          >
            {FACT_CONCEPT_TYPES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {selectedConcept === 'custom' && (
            <input
              type="text"
              placeholder="Своё слово (причин, ошибок, секретов...)"
              value={customConceptWord}
              onChange={e => {
                setCustomConceptWord(e.target.value)
                setFacts([])
              }}
              disabled={regenerating}
              style={{
                background: '#020617',
                color: '#fcd34d',
                border: '1px solid #d97706',
                borderRadius: '6px',
                padding: '0.28rem 0.5rem',
                fontSize: '0.8rem',
                fontWeight: 600,
                width: '190px',
              }}
              title="Введите ваше понятие в родительном падеже (например: причин, секретов, ударов, шагов, парадоксов)"
            />
          )}
        </div>

        {/* Переключатель: Цельный текст / рассказ vs По пунктам со счетом */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#020617', borderRadius: '6px', padding: '2px', border: '1px solid #d97706' }}>
          <button
            type="button"
            onClick={() => setScriptFormat('feuilleton')}
            style={{
              background: scriptFormat === 'feuilleton' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'transparent',
              color: scriptFormat === 'feuilleton' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '4px',
              padding: '0.22rem 0.55rem',
              fontSize: '0.76rem',
              fontWeight: scriptFormat === 'feuilleton' ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title={isYouTubeTopicStyle ? "Цельный связный монолог/рассказ диктора без счета и номеров пунктов вслух" : "Цельный фельетон / связный монолог диктора без счета и номеров пунктов вслух"}
          >
            {isYouTubeTopicStyle ? '🎙️ Цельный рассказ' : '🎭 Фельетон'}
          </button>
          <button
            type="button"
            onClick={() => setScriptFormat('facts')}
            style={{
              background: scriptFormat === 'facts' ? 'linear-gradient(135deg, #d97706, #b45309)' : 'transparent',
              color: scriptFormat === 'facts' ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '4px',
              padding: '0.22rem 0.55rem',
              fontSize: '0.76rem',
              fontWeight: scriptFormat === 'facts' ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            title="Сценарий с четким голосовым счетом пунктов («Факт первый: ...», «Факт второй: ...»)"
          >
            🔢 По пунктам
          </button>
        </div>

        {!isYouTubeTopicStyle && (
          <div style={{ display: 'flex', alignItems: 'center', background: '#0f172a', borderRadius: '6px', padding: '2px', border: '1px solid #334155' }}>
            <button type="button" onClick={() => setSelectedTone('grotesque')} style={{ background: selectedTone === 'grotesque' ? '#dc2626' : 'transparent', color: selectedTone === 'grotesque' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.22rem 0.45rem', fontSize: '0.75rem', fontWeight: selectedTone === 'grotesque' ? 700 : 500, cursor: 'pointer' }}>💥 Сатира</button>
            <button type="button" onClick={() => setSelectedTone('analytics')} style={{ background: selectedTone === 'analytics' ? '#2563eb' : 'transparent', color: selectedTone === 'analytics' ? '#fff' : '#94a3b8', border: 'none', borderRadius: '4px', padding: '0.22rem 0.45rem', fontSize: '0.75rem', fontWeight: selectedTone === 'analytics' ? 700 : 500, cursor: 'pointer' }}>🧠 Аналитика</button>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Главная кнопка: Сгенерировать дикторский текст */}
        <button
          type="button"
          className="refresh-btn"
          onClick={() => onRegenerate(selectedStyle, selectedModel, selectedTone, null, selectedConcept, scriptFormat, customConceptWord, customPrompt)}
          disabled={regenerating}
          style={{
            fontSize: '0.82rem',
            padding: '0.42rem 0.9rem',
            background: scriptFormat === 'feuilleton' ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #d97706, #ea580c)',
            border: scriptFormat === 'feuilleton' ? '1px solid #8b5cf6' : '1px solid #f59e0b',
            color: '#ffffff',
            fontWeight: 700,
            borderRadius: '6px',
            cursor: regenerating ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            boxShadow: scriptFormat === 'feuilleton' ? '0 2px 10px rgba(124, 58, 237, 0.45)' : '0 2px 10px rgba(217, 119, 6, 0.45)',
          }}
          title={scriptFormat === 'feuilleton' ? (isYouTubeTopicStyle ? "Сгенерировать цельный связный рассказ без счета вслух" : "Сгенерировать цельный фельетон без счета вслух") : "Сгенерировать сценарий с голосовым счетом всех пунктов"}
        >
          {regenerating ? '⏳ Генерация...' : (scriptFormat === 'feuilleton' ? (isYouTubeTopicStyle ? '✨ Цельный рассказ' : '✨ Фельетон (цельный)') : '✨ По пунктам (со счетом)')}
        </button>

        {/* Дополнительная опция: Выбор и извлечение пунктов (Selectbox от 5 до 15) */}
        <div style={{ display: 'inline-flex', alignItems: 'center', background: '#1c192e', borderRadius: '6px', border: '1px solid #d97706', padding: '2px 4px', gap: '4px' }}>
          <span style={{ fontSize: '0.74rem', color: '#fcd34d', fontWeight: 700, paddingLeft: '2px' }}>🔢</span>
          <select
            value={factsCount}
            onChange={e => {
              const nextCnt = Number(e.target.value)
              setFactsCount(nextCnt)
              handleOpenFacts(nextCnt, selectedConcept, customConceptWord)
            }}
            disabled={regenerating || factsLoading}
            style={{
              background: '#090d16',
              color: '#fcd34d',
              border: '1px solid #d97706',
              borderRadius: '4px',
              fontSize: '0.78rem',
              padding: '0.24rem 0.4rem',
              cursor: (regenerating || factsLoading) ? 'not-allowed' : 'pointer',
              fontWeight: 700,
            }}
            title={`Выберите количество ${currentConcept.labelPlural} (от 5 до 15)`}
          >
            {[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 20].map(cnt => (
              <option key={cnt} value={cnt}>
                {cnt === 10 ? `🌟 ${cnt} ${currentConcept.labelPlural}` : `${cnt} ${currentConcept.labelPlural}`}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => handleOpenFacts(factsCount, selectedConcept, customConceptWord)}
            disabled={regenerating || factsLoading}
            style={{
              fontSize: '0.76rem',
              padding: '0.26rem 0.55rem',
              background: '#d97706',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 700,
              cursor: (regenerating || factsLoading) ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
            title={`Извлечь ${factsCount} ${currentConcept.labelPlural} из текста`}
          >
            {factsLoading ? '⏳...' : `🔍 Извлечь`}
          </button>
        </div>

        {/* Кнопка открытия промпта */}
        <button
          type="button"
          onClick={() => setShowPrompt(prev => !prev)}
          style={{
            fontSize: '0.76rem',
            padding: '0.35rem 0.65rem',
            background: customPrompt ? '#4338ca' : '#1e1b4b',
            border: '1px solid #6366f1',
            color: '#e0e7ff',
            borderRadius: '6px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
          title="Задать индивидуальный промпт / пожелания к тексту"
        >
          <span>🎯</span>
          <span>{customPrompt ? 'Промпт задан ✏️' : '+ Добавить промпт'}</span>
        </button>
      </div>

      {/* Блок ввода индивидуального промпта */}
      {showPrompt && (
        <div style={{ width: '100%', background: '#0f172a', border: '1px solid #6366f1', borderRadius: '8px', padding: '0.6rem 0.85rem', marginTop: '0.4rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>🎯</span> Индивидуальный промпт / Пожелания к тексту:
            </span>
            <span style={{ fontSize: '0.7rem', color: '#a5b4fc' }}>
              {isYouTubeTopicStyle ? 'Учитывается кнопками «✨ Цельный рассказ / ✨ По пунктам»' : 'Учитывается кнопками «✨ Фельетон / ✨ По пунктам»'}
            </span>
          </div>
          <textarea
            value={customPrompt}
            onChange={e => setCustomPrompt(e.target.value)}
            placeholder="Например: Сделай особый акцент на военных аспектах, начни с вопроса к зрителю, раскрой мотивы Кремля и заверши мощным выводом..."
            rows={2}
            style={{ width: '100%', background: '#020617', border: '1px solid #4338ca', borderRadius: '6px', color: '#fff', padding: '0.45rem 0.65rem', fontSize: '0.82rem', resize: 'vertical', minHeight: '50px', lineHeight: 1.4, fontFamily: 'inherit' }}
          />
        </div>
      )}

      {showFactsModal && (
        <YouTubeFactsModal
          isOpen={showFactsModal}
          onClose={() => setShowFactsModal(false)}
          facts={facts}
          videoTitle={pkg?.title || pkg?.original_title || 'Оригинальный текст'}
          conceptType={selectedConcept}
          customWord={customConceptWord}
          onConfirm={handleConfirmFacts}
          loading={regenerating}
        />
      )}
    </div>
  )
}

