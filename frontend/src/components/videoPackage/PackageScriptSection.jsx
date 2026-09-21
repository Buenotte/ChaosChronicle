import { useState } from 'react'
import { toast } from 'sonner'
import YouTubeFactsModal from '../YouTubeFactsModal'
import { YOUTUBE_TOPIC_STYLES, FEUILLETON_STYLES } from '../../lib/utils'

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
  const [generating, setGenerating] = useState(false)
  const [factsLoading, setFactsLoading] = useState(false)
  const [facts, setFacts] = useState([])
  const [showFactsModal, setShowFactsModal] = useState(false)
  const [factsGenerating, setFactsGenerating] = useState(false)

  // 1. Генерация сценария НАПРЯМУЮ из всего оригинального текста (без фактов)
  const handleGenerateFromOriginal = async () => {
    const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(selectedScriptStyle)
    const toastId = toast.loading(isYt ? '✍️ ИИ пишет сценарий из оригинала...' : '✍️ ИИ пишет фельетон из оригинала...')
    try {
      setGenerating(true)
      const endpoint = isYt ? '/api/youtube/regenerate-script' : '/api/generate-feuilleton'
      const payload = isYt
        ? { folderName: pkg.folderName, bundleDir: pkg.bundleDir, style: selectedScriptStyle, selectedFacts: null }
        : { folderName: pkg.folderName, bundleDir: pkg.bundleDir, title: pkg.title || pkg.original_title, summary: pkg.summary || pkg.original_news || '', url: pkg.url || '', style: selectedScriptStyle, saveToPackage: true }

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
        pkg.selectedFacts = null
        if (data.feuilleton?.title) pkg.title = data.feuilleton.title
        if (data.titleVariants?.length) pkg.title_variants = data.titleVariants
        toast.success('✍️ Сценарий успешно сгенерирован из полного текста!')
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

  // 2. Открытие модального окна 20 фактов
  const handleOpenFactsModal = async () => {
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
          folderName: pkg.folderName,
          bundleDir: pkg.bundleDir,
          text: pkg.original_news || pkg.summary || '',
          title: pkg.original_title || pkg.title || '',
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

  // 3. Генерация сценария по выбранным фактам
  const handleGenerateByFacts = async (chosenFacts) => {
    setFactsGenerating(true)
    const isYt = ['scipop', 'mystery', 'tech_future', 'psychology', 'storytelling'].includes(selectedScriptStyle)
    const toastId = toast.loading(`✨ Создание сценария по ${chosenFacts.length} фактам...`, {
      description: 'Gemini 3.8 Flash пишет связный 3-минутный монолог...',
    })
    try {
      const endpoint = isYt ? '/api/youtube/regenerate-script' : '/api/generate-feuilleton'
      const payload = isYt
        ? { folderName: pkg.folderName, bundleDir: pkg.bundleDir, style: selectedScriptStyle, selectedFacts: chosenFacts }
        : { folderName: pkg.folderName, bundleDir: pkg.bundleDir, title: pkg.title || pkg.original_title, summary: chosenFacts.map(f => `${f.title}: ${f.text}`).join('\n\n'), url: pkg.url || '', style: selectedScriptStyle, saveToPackage: true }

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
        pkg.selectedFacts = chosenFacts
        if (data.feuilleton?.title) pkg.title = data.feuilleton.title
        if (data.titleVariants?.length) pkg.title_variants = data.titleVariants
        setShowFactsModal(false)
        toast.success(`🎉 Сценарий готов по ${chosenFacts.length} ключевым фактам!`)
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
              📌 По {activeFactsCount} фактам
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

          {/* Вариант 1: Извлечь 20 фактов и выбрать */}
          <button
            type="button"
            className="generate-btn"
            onClick={handleOpenFactsModal}
            disabled={factsLoading}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, background: '#d97706', color: '#fff' }}
            title="Извлечь 20 главных фактов из оригинального текста и сгенерировать по выбранным"
          >
            {factsLoading ? '⏳ Анализ...' : '🔍 Выбрать из 20 фактов'}
          </button>

          {/* Вариант 2: Сгенерировать напрямую из оригинальной новости целиком */}
          <button
            type="button"
            className="generate-btn"
            onClick={handleGenerateFromOriginal}
            disabled={generating}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', fontWeight: 700, background: '#7c3aed' }}
            title="Сгенерировать сценарий из всего исходного текста на диске"
          >
            {generating ? '⏳ ИИ пишет...' : hasTxt ? '🔄 Из оригинала целиком' : '✍️ Создать из оригинала'}
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
          onConfirm={handleGenerateByFacts}
          loading={factsGenerating}
        />
      )}
    </div>
  )
}
