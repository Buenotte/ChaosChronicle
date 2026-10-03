import { useState } from 'react'
import { toast } from 'sonner'
import YouTubeFactsModal from '../YouTubeFactsModal'
import { YOUTUBE_TOPIC_STYLES, FEUILLETON_STYLES, FACT_CONCEPT_TYPES, getConceptConfig } from '../../lib/utils'

export default function PackageScriptSection({
  pkg,
  selectedScriptStyle,
  setSelectedScriptStyle,
  isYouTube,
  hasTxt,
  onOpenScriptText,
  onOpenTitleVariants,
  onRefresh,
}) {
  const [selectedConcept, setSelectedConcept] = useState(pkg?.customWord ? 'custom' : (pkg?.conceptType || 'theses'))
  const [customConceptWord, setCustomConceptWord] = useState(pkg?.customWord || '')
  const [scriptFormat, setScriptFormat] = useState(pkg?.scriptFormat || 'feuilleton') // 'feuilleton' (цельный текст) vs 'facts' (по пунктам со счетом)
  const [generating, setGenerating] = useState(false)
  const [factsLoading, setFactsLoading] = useState(false)
  const [facts, setFacts] = useState([])
  const [showFactsModal, setShowFactsModal] = useState(false)
  const [factsGenerating, setFactsGenerating] = useState(false)
  const [factsCount, setFactsCount] = useState(10)
  const [showPromptEdit, setShowPromptEdit] = useState(true)
  const [packagePrompt, setPackagePrompt] = useState(pkg?.customPrompt || '')

  const currentConcept = getConceptConfig(selectedConcept, customConceptWord)

  // 1. Генерация сценария (1 клик: фельетон или по пунктам)
  const handleGenerateFromOriginal = async () => {
    const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling', 'short_sarcasm'].includes(selectedScriptStyle) || pkg.isYouTube || (pkg.source || '').includes('YouTube') || (pkg.url || '').includes('youtube.com') || (pkg.url || '').includes('youtu.be')
    const formatLabel = scriptFormat === 'feuilleton' ? '🎭 цельный фельетон' : `🔢 по 10 ${currentConcept.labelPlural} со счетом`
    const toastId = toast.loading(`✨ ИИ создает ${formatLabel}...`)
    try {
      setGenerating(true)
      const endpoint = isYt ? '/api/youtube/regenerate-script' : '/api/generate-feuilleton'
      const payload = isYt
        ? { folderName: pkg.folderName, bundleDir: pkg.bundleDir, style: selectedScriptStyle, originalNews: pkg.original_news || pkg.summary || '', summary: pkg.summary || pkg.original_news || '', selectedFacts: null, conceptType: selectedConcept, customWord: customConceptWord, scriptFormat, customPrompt: packagePrompt.trim() }
        : { folderName: pkg.folderName, bundleDir: pkg.bundleDir, title: pkg.title || pkg.original_title, original_news: pkg.original_news || pkg.summary || '', summary: pkg.summary || pkg.original_news || '', url: pkg.url || '', style: selectedScriptStyle, conceptType: selectedConcept, customWord: customConceptWord, scriptFormat, customPrompt: packagePrompt.trim(), saveToPackage: true }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      toast.dismiss(toastId)
      if (data.success && (data.text || data.feuilleton)) {
        pkg.hasScriptTxt = true
        pkg.hasScriptMd = true
        pkg.scriptTxt = data.text || data.feuilleton.text
        pkg.selectedFacts = data.facts || pkg.selectedFacts || null
        pkg.conceptType = selectedConcept
        if (customConceptWord) pkg.customWord = customConceptWord
        pkg.scriptFormat = scriptFormat
        if (packagePrompt) pkg.customPrompt = packagePrompt
        if (data.originalNews) {
          pkg.original_news = data.originalNews
          pkg.summary = data.originalNews
        }
        if (data.feuilleton?.title) pkg.title = data.feuilleton.title
        if (data.titleVariants?.length) pkg.title_variants = data.titleVariants
        toast.success(`✨ Текст (${scriptFormat === 'feuilleton' ? 'цельный фельетон' : `по ${currentConcept.labelPlural} со счетом`}) готов!`)
        if (onRefresh) onRefresh()
      } else {
        toast.error('❌ Ошибка: ' + (data.error || 'Не удалось сгенерировать'))
      }
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('❌ Ошибка: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  // 2. Открытие модального окна пунктов (от 5 до 15, или 20)
  const handleOpenFactsModal = async (targetCount = factsCount, conceptToUse = selectedConcept, customWordToUse = customConceptWord) => {
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
          folderName: pkg.folderName,
          bundleDir: pkg.bundleDir,
          text: pkg.original_news || pkg.summary || '',
          title: pkg.original_title || pkg.title || '',
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

  // 3. Генерация сценария по выбранным пунктам
  const handleGenerateByFacts = async (chosenFacts) => {
    setFactsGenerating(true)
    const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling', 'short_sarcasm'].includes(selectedScriptStyle)
    const formatLabel = scriptFormat === 'feuilleton' ? 'цельного фельетона' : `сценария по ${chosenFacts.length} ${currentConcept.labelPlural}`
    const toastId = toast.loading(`✨ Создание ${formatLabel}...`, {
      description: 'Gemini 3.8 Flash пишет захватывающий текст...',
    })
    try {
      const endpoint = isYt ? '/api/youtube/regenerate-script' : '/api/generate-feuilleton'
      const payload = isYt
        ? { folderName: pkg.folderName, bundleDir: pkg.bundleDir, style: selectedScriptStyle, selectedFacts: chosenFacts, conceptType: selectedConcept, customWord: customConceptWord, scriptFormat, customPrompt: pkg.customPrompt || '' }
        : { folderName: pkg.folderName, bundleDir: pkg.bundleDir, title: pkg.title || pkg.original_title, summary: chosenFacts.map(f => `${f.title}: ${f.text}`).join('\n\n'), url: pkg.url || '', style: selectedScriptStyle, conceptType: selectedConcept, customWord: customConceptWord, scriptFormat, customPrompt: pkg.customPrompt || '', saveToPackage: true }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      toast.dismiss(toastId)
      if (data.success && (data.text || data.feuilleton)) {
        pkg.hasScriptTxt = true
        pkg.hasScriptMd = true
        pkg.scriptTxt = data.text || data.feuilleton.text
        pkg.selectedFacts = chosenFacts || data.facts || null
        pkg.conceptType = selectedConcept
        if (customConceptWord) pkg.customWord = customConceptWord
        pkg.scriptFormat = scriptFormat
        if (data.originalNews) {
          pkg.original_news = data.originalNews
          pkg.summary = data.originalNews
        }
        if (data.feuilleton?.title) pkg.title = data.feuilleton.title
        if (data.titleVariants?.length) pkg.title_variants = data.titleVariants
        setShowFactsModal(false)
        toast.success(`🎉 Текст (${scriptFormat === 'feuilleton' ? 'цельный фельетон' : `по ${chosenFacts.length} ${currentConcept.labelPlural}`}) готов!`)
        if (onRefresh) onRefresh()
      } else {
        toast.error('❌ Ошибка: ' + (data.error || 'Не удалось создать'))
      }
    } catch (err) {
      toast.dismiss(toastId)
      toast.error('Ошибка генерации: ' + err.message)
    } finally {
      setFactsGenerating(false)
    }
  }

  const wordCount = pkg.scriptTxt?.split(/\s+/).filter(Boolean).length || pkg.word_count || 0
  const activeFactsCount = pkg.selectedFacts?.length || 0

  return (
    <div style={{ marginBottom: '1.25rem', background: '#090d16', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: '0.95rem', color: '#9ca3af', margin: 0 }}>
            1. Сценарий: {hasTxt ? <span style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600 }}>({wordCount} слов ✅)</span> : <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>(текст не создан)</span>}
          </h3>
          {activeFactsCount > 0 && (
            <span style={{ background: '#7c3aed', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '6px' }}>
              📌 {activeFactsCount} {currentConcept.labelPlural}
            </span>
          )}
          {pkg.scriptFormat && (
            <span style={{ background: pkg.scriptFormat === 'feuilleton' ? '#065f46' : '#92400e', color: '#fff', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '6px' }}>
              {pkg.scriptFormat === 'feuilleton' ? '🎭 Фельетон' : '🔢 Со счетом'}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            value={selectedScriptStyle}
            onChange={e => setSelectedScriptStyle(e.target.value)}
            style={{ background: '#1e293b', color: '#f8fafc', border: '1px solid #334155', borderRadius: '6px', fontSize: '0.8rem', padding: '0.35rem 0.5rem', cursor: 'pointer' }}
          >
            <optgroup label="🎬 YouTube стили">{YOUTUBE_TOPIC_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
            <optgroup label="🎭 Авторские (Сатира)">{FEUILLETON_STYLES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</optgroup>
          </select>

          {/* Выбор понятия: Факты / Тезисы / Детали / Сигналы / Выводы / Пункты / Причины / Своё слово */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#94a3b8' }}>📌 Тематика:</span>
            <select
              value={selectedConcept}
              onChange={e => {
                const nextVal = e.target.value
                setSelectedConcept(nextVal)
                setFacts([])
              }}
              style={{ background: '#1e293b', color: '#fcd34d', border: '1px solid #d97706', borderRadius: '6px', fontSize: '0.8rem', padding: '0.35rem 0.5rem', cursor: 'pointer', fontWeight: 600 }}
              title="Формат пунктов (Факты, Тезисы, Детали, Причины, Ошибки, Секреты или своё слово)"
            >
              {FACT_CONCEPT_TYPES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>

            {selectedConcept === 'custom' && (
              <input
                type="text"
                placeholder="Своё слово (причин, ошибок...)"
                value={customConceptWord}
                onChange={e => {
                  setCustomConceptWord(e.target.value)
                  setFacts([])
                }}
                disabled={generating || factsLoading}
                style={{
                  background: '#090d16',
                  color: '#fcd34d',
                  border: '1px solid #d97706',
                  borderRadius: '6px',
                  padding: '0.28rem 0.45rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  width: '180px',
                }}
                title="Введите ваше понятие в родительном падеже (например: причин, секретов, ударов, шагов)"
              />
            )}
          </div>

          {/* Переключатель: Цельный фельетон vs По пунктам со счетом */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#020617', borderRadius: '6px', padding: '2px', border: '1px solid #d97706' }}>
            <button
              type="button"
              onClick={() => setScriptFormat('feuilleton')}
              style={{
                background: scriptFormat === 'feuilleton' ? 'linear-gradient(135deg, #7c3aed, #6d28d9)' : 'transparent',
                color: scriptFormat === 'feuilleton' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '4px',
                padding: '0.22rem 0.5rem',
                fontSize: '0.74rem',
                fontWeight: scriptFormat === 'feuilleton' ? 700 : 500,
                cursor: 'pointer',
              }}
              title="Цельный фельетон / связный рассказ без счета вслух"
            >
              🎭 Фельетон
            </button>
            <button
              type="button"
              onClick={() => setScriptFormat('facts')}
              style={{
                background: scriptFormat === 'facts' ? 'linear-gradient(135deg, #d97706, #b45309)' : 'transparent',
                color: scriptFormat === 'facts' ? '#ffffff' : '#94a3b8',
                border: 'none',
                borderRadius: '4px',
                padding: '0.22rem 0.5rem',
                fontSize: '0.74rem',
                fontWeight: scriptFormat === 'facts' ? 700 : 500,
                cursor: 'pointer',
              }}
              title="Сценарий с четким счетом каждого пункта вслух"
            >
              🔢 По пунктам
            </button>
          </div>

          {/* Вариант 1: Извлечь от 5 до 15 пунктов (Selectbox) */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#1c192e', borderRadius: '6px', border: '1px solid #d97706', padding: '2px 4px', gap: '4px' }}>
            <span style={{ fontSize: '0.74rem', color: '#fcd34d', fontWeight: 700, paddingLeft: '2px' }}>🔢</span>
            <select
              value={factsCount}
              onChange={e => {
                const nextCnt = Number(e.target.value)
                setFactsCount(nextCnt)
                handleOpenFactsModal(nextCnt, selectedConcept, customConceptWord)
              }}
              disabled={factsLoading || factsGenerating}
              style={{
                background: '#090d16',
                color: '#fcd34d',
                border: '1px solid #d97706',
                borderRadius: '4px',
                fontSize: '0.78rem',
                padding: '0.24rem 0.4rem',
                cursor: (factsLoading || factsGenerating) ? 'not-allowed' : 'pointer',
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
              onClick={() => handleOpenFactsModal(factsCount, selectedConcept, customConceptWord)}
              disabled={factsLoading || factsGenerating}
              style={{
                fontSize: '0.76rem',
                padding: '0.26rem 0.55rem',
                background: '#d97706',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                fontWeight: 700,
                cursor: (factsLoading || factsGenerating) ? 'not-allowed' : 'pointer',
                whiteSpace: 'nowrap',
              }}
              title={`Извлечь ${factsCount} ${currentConcept.labelPlural} из текста`}
            >
              {factsLoading ? '⏳...' : `🔍 Извлечь`}
            </button>
          </div>

          {/* Вариант 2: Сгенерировать дикторский текст */}
          <button
            type="button"
            className="generate-btn"
            onClick={handleGenerateFromOriginal}
            disabled={generating}
            style={{
              padding: '0.35rem 0.75rem',
              fontSize: '0.8rem',
              fontWeight: 700,
              background: scriptFormat === 'feuilleton' ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : 'linear-gradient(135deg, #d97706, #ea580c)',
              color: '#fff',
              boxShadow: scriptFormat === 'feuilleton' ? '0 2px 8px rgba(124, 58, 237, 0.4)' : '0 2px 8px rgba(217, 119, 6, 0.4)',
            }}
            title={scriptFormat === 'feuilleton' ? "Сгенерировать цельный фельетон без счета вслух" : "Сгенерировать сценарий с голосовым счетом пунктов"}
          >
            {generating ? '⏳ Генерация...' : (scriptFormat === 'feuilleton' ? '✨ Фельетон' : '✨ По пунктам')}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button className="copy-btn" style={{ background: '#3b82f6' }} onClick={() => onOpenScriptText(pkg)}>📜 Открыть и редактировать текст</button>
        <button className="copy-btn" style={{ background: '#ec4899', fontWeight: 600 }} onClick={onOpenTitleVariants}>⚡ 10 вариантов заголовков</button>
        <button
          type="button"
          className="copy-btn"
          style={{ background: packagePrompt ? '#4338ca' : '#1e1b4b', border: '1px solid #6366f1', color: '#e0e7ff', fontWeight: 600 }}
          onClick={() => setShowPromptEdit(prev => !prev)}
          title="Задать индивидуальный промпт / пожелания к тексту"
        >
          🎯 {packagePrompt ? 'Промпт задан ✏️' : '+ Добавить промпт'}
        </button>
      </div>

      {showPromptEdit && (
        <div style={{ background: '#0f172a', border: '1px solid #6366f1', borderRadius: '8px', padding: '0.65rem 0.85rem', marginTop: '0.2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e0e7ff', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span>🎯</span> Индивидуальный промпт для ИИ к этому пакету:
            </span>
            <span style={{ fontSize: '0.7rem', color: '#a5b4fc' }}>Учитывается кнопками «✨ Фельетон / ✨ По пунктам»</span>
          </div>
          <textarea
            value={packagePrompt}
            onChange={e => setPackagePrompt(e.target.value)}
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
          videoTitle={pkg.title || pkg.original_title || 'Оригинальный текст'}
          currentStyle={selectedScriptStyle}
          conceptType={selectedConcept}
          customWord={customConceptWord}
          onConfirm={(chosenFacts, chosenStyle) => {
            if (chosenStyle && setSelectedScriptStyle) setSelectedScriptStyle(chosenStyle)
            handleGenerateByFacts(chosenFacts)
          }}
          loading={factsGenerating}
        />
      )}
    </div>
  )
}

