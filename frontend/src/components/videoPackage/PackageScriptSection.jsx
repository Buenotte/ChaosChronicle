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
  const [selectedConcept, setSelectedConcept] = useState(pkg?.conceptType || 'theses')
  const [generating, setGenerating] = useState(false)
  const [factsLoading, setFactsLoading] = useState(false)
  const [facts, setFacts] = useState([])
  const [showFactsModal, setShowFactsModal] = useState(false)
  const [factsGenerating, setFactsGenerating] = useState(false)
  const [factsCount, setFactsCount] = useState(10)

  const currentConcept = getConceptConfig(selectedConcept)

  // 1. Генерация сценария (1 клик: 10 фактов/тезисов, хук, счет и объяснения)
  const handleGenerateFromOriginal = async () => {
    const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(selectedScriptStyle) || pkg.isYouTube || (pkg.source || '').includes('YouTube') || (pkg.url || '').includes('youtube.com') || (pkg.url || '').includes('youtu.be')
    const toastId = toast.loading(isYt ? `✨ ИИ создает 3-мин. сценарий (10 ${currentConcept.labelPlural} + хук + счет)...` : '✍️ ИИ пишет текст из оригинала...')
    try {
      setGenerating(true)
      const endpoint = isYt ? '/api/youtube/regenerate-script' : '/api/generate-feuilleton'
      const payload = isYt
        ? { folderName: pkg.folderName, bundleDir: pkg.bundleDir, style: selectedScriptStyle, selectedFacts: pkg.facts || pkg.selectedFacts || null, conceptType: selectedConcept }
        : { folderName: pkg.folderName, bundleDir: pkg.bundleDir, title: pkg.title || pkg.original_title, summary: pkg.summary || pkg.original_news || '', url: pkg.url || '', style: selectedScriptStyle, conceptType: selectedConcept, saveToPackage: true }

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
        if (data.originalNews) {
          pkg.original_news = data.originalNews
          pkg.summary = data.originalNews
        }
        if (data.feuilleton?.title) pkg.title = data.feuilleton.title
        if (data.titleVariants?.length) pkg.title_variants = data.titleVariants
        toast.success(`✨ 3-минутный сценарий с 10 ${currentConcept.labelPlural} и счетом готов!`)
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

  // 2. Открытие модального окна пунктов (5, 10 или 20)
  const handleOpenFactsModal = async (targetCount = factsCount, conceptToUse = selectedConcept) => {
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
          folderName: pkg.folderName,
          bundleDir: pkg.bundleDir,
          text: pkg.original_news || pkg.summary || '',
          title: pkg.original_title || pkg.title || '',
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

  // 3. Генерация сценария по выбранным пунктам
  const handleGenerateByFacts = async (chosenFacts) => {
    setFactsGenerating(true)
    const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(selectedScriptStyle)
    const toastId = toast.loading(`✨ Создание сценария по ${chosenFacts.length} ${currentConcept.labelPlural}...`, {
      description: 'Gemini 3.8 Flash пишет связный 3-минутный монолог...',
    })
    try {
      const endpoint = isYt ? '/api/youtube/regenerate-script' : '/api/generate-feuilleton'
      const payload = isYt
        ? { folderName: pkg.folderName, bundleDir: pkg.bundleDir, style: selectedScriptStyle, selectedFacts: chosenFacts, conceptType: selectedConcept }
        : { folderName: pkg.folderName, bundleDir: pkg.bundleDir, title: pkg.title || pkg.original_title, summary: chosenFacts.map(f => `${f.title}: ${f.text}`).join('\n\n'), url: pkg.url || '', style: selectedScriptStyle, conceptType: selectedConcept, saveToPackage: true }

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
        if (data.originalNews) {
          pkg.original_news = data.originalNews
          pkg.summary = data.originalNews
        }
        if (data.feuilleton?.title) pkg.title = data.feuilleton.title
        if (data.titleVariants?.length) pkg.title_variants = data.titleVariants
        setShowFactsModal(false)
        toast.success(`🎉 Сценарий готов по ${chosenFacts.length} ${currentConcept.labelPlural}!`)
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
              📌 По {activeFactsCount} {currentConcept.labelPlural}
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

          {/* Выбор понятия: Факты / Тезисы / Детали / Сигналы / Выводы / Пункты */}
          <select
            value={selectedConcept}
            onChange={e => {
              const nextVal = e.target.value
              setSelectedConcept(nextVal)
              setFacts([])
            }}
            style={{ background: '#1e293b', color: '#fcd34d', border: '1px solid #d97706', borderRadius: '6px', fontSize: '0.8rem', padding: '0.35rem 0.5rem', cursor: 'pointer', fontWeight: 600 }}
            title="Формат пунктов (Факты, Тезисы, Детали, Сигналы, Выводы, Пункты)"
          >
            {FACT_CONCEPT_TYPES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Вариант 1: Извлечь 5 / 10 / 20 пунктов и выбрать */}
          <div style={{ display: 'inline-flex', alignItems: 'center', background: '#1c192e', borderRadius: '6px', border: '1px solid #d97706', padding: '2px', gap: '2px' }}>
            {[5, 10, 20].map(cnt => (
              <button
                key={cnt}
                type="button"
                onClick={() => { setFactsCount(cnt); handleOpenFactsModal(cnt, selectedConcept) }}
                disabled={factsLoading || factsGenerating}
                style={{
                  fontSize: '0.76rem',
                  padding: '0.28rem 0.5rem',
                  background: factsCount === cnt ? '#d97706' : 'transparent',
                  color: factsCount === cnt ? '#ffffff' : '#fcd34d',
                  border: 'none',
                  borderRadius: '4px',
                  fontWeight: factsCount === cnt ? 700 : 500,
                  cursor: (factsLoading || factsGenerating) ? 'not-allowed' : 'pointer',
                }}
                title={`Извлечь ${cnt} ${currentConcept.labelPlural} из текста`}
              >
                {cnt === 10 ? `🌟 10 ${currentConcept.labelPlural}` : cnt === 5 ? `⚡ 5` : `💎 20`}
              </button>
            ))}
          </div>

          {/* Вариант 2: Сгенерировать дикторский текст */}
          <button
            type="button"
            className="generate-btn"
            onClick={handleGenerateFromOriginal}
            disabled={generating}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', color: '#fff', boxShadow: '0 2px 8px rgba(124, 58, 237, 0.4)' }}
            title="Сгенерировать 3-минутный сценарий с помощью ИИ"
          >
            {generating ? '⏳ Генерация...' : '✨ Сгенерировать текст'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <button className="copy-btn" style={{ background: '#3b82f6' }} onClick={() => onOpenScriptText(pkg)}>📜 Открыть и редактировать текст</button>
        <button className="copy-btn" style={{ background: '#ec4899', fontWeight: 600 }} onClick={onOpenTitleVariants}>⚡ 10 вариантов заголовков</button>
      </div>

      {showFactsModal && (
        <YouTubeFactsModal
          isOpen={showFactsModal}
          onClose={() => setShowFactsModal(false)}
          facts={facts}
          videoTitle={pkg.title || pkg.original_title || 'Оригинальный текст'}
          currentStyle={selectedScriptStyle}
          conceptType={selectedConcept}
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

