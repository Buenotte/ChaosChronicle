import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { timeAgo } from '../lib/utils'

export default function OriginalTextModal({ article, isOpen, onClose, onGenerate }) {
  const [copied, setCopied] = useState(false)
  const initialText = article?.summary || article?.original_news || article?.originalNews || article?.sourceText || article?.matchingPkg?.summary || article?.matchingPkg?.original_news || ''
  const [liveText, setLiveText] = useState(initialText)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!isOpen || !article) return
    const text = article.summary || article.original_news || article.originalNews || article.sourceText || article.matchingPkg?.summary || article.matchingPkg?.original_news || ''
    setLiveText(text)

    const folderName = article.folderName || article.matchingPkg?.folderName || ''
    const bundleDir = article.bundleDir || article.matchingPkg?.bundleDir || ''
    const rawUrl = article.url || article.link || article.matchingPkg?.url || article.matchingPkg?.original_url || ''

    if (folderName || bundleDir) {
      setIsLoading(true)
      const params = new URLSearchParams({ folderName, bundleDir })
      fetch(`/api/package-script-text?${params}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && (data.originalNews || data.summary)) {
            setLiveText(data.originalNews || data.summary)
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false))
    } else if (rawUrl && /^https?:\/\//i.test(rawUrl) && (!text || text.length < 150)) {
      setIsLoading(true)
      fetch(`/api/scrape-article?url=${encodeURIComponent(rawUrl)}`)
        .then(r => r.json())
        .then(data => {
          if (data.success && data.text && data.text.length > (text?.length || 0)) {
            setLiveText(data.text)
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false))
    }
  }, [article, isOpen])

  if (!isOpen || !article) return null

  const title = article.original_title || article.title || 'Исходная новость'
  const source = article.source || (article.isCustom ? 'Telegram / Своя новость' : 'Источник')
  const originalText = liveText || initialText
  
  const rawUrl = article.url || article.link || article.matchingPkg?.url || article.matchingPkg?.original_url || ''
  const hasWebUrl = typeof rawUrl === 'string' && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))

  const wordCount = originalText ? originalText.trim().split(/\s+/).filter(Boolean).length : 0
  const charCount = originalText ? originalText.length : 0

  const handleCopy = async () => {
    try {
      const fullTextToCopy = `${title}\n\n${originalText}`.trim()
      await navigator.clipboard.writeText(fullTextToCopy)
      setCopied(true)
      toast.success('Текст скопирован в буфер обмена!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Не удалось скопировать текст')
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: '780px', width: '92%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
              <span className="modal-badge" style={{ background: '#7c3aed', color: '#fff' }}>
                📰 Исходное сообщение
              </span>
              <span className="modal-badge" style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155' }}>
                📱 {source}
              </span>
              {article.pubDate && (
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  🕒 {timeAgo(article.pubDate)}
                </span>
              )}
              {isLoading && (
                <span style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>
                  ⏳ Загрузка полного текста...
                </span>
              )}
            </div>
            <h2 className="modal-title" style={{ fontSize: '1.2rem', lineHeight: 1.35, margin: 0 }}>
              {title}
            </h2>
          </div>
          <button className="modal-close" onClick={onClose} title="Закрыть (Esc)">✕</button>
        </div>

        <div className="modal-body" style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {originalText ? (
            <div
              style={{
                background: '#090d16',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '1.2rem 1.4rem',
                color: '#e2e8f0',
                fontSize: '0.98rem',
                lineHeight: '1.65',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.4)',
                maxHeight: '480px',
                overflowY: 'auto',
              }}
            >
              {originalText}
            </div>
          ) : isLoading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#fbbf24' }}>
              ⏳ Загрузка полного текста статьи из источника...
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>
              Текст исходного сообщения не найден или пуст.
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.8rem', color: '#64748b' }}>
            <span>📝 Слов: <strong style={{ color: '#94a3b8' }}>{wordCount}</strong></span>
            <span>·</span>
            <span>Символов: <strong style={{ color: '#94a3b8' }}>{charCount}</strong></span>
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid #1e293b', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="copy-btn"
              onClick={handleCopy}
              style={{ background: copied ? '#10b981' : '#334155', color: '#fff', fontWeight: 600, padding: '0.5rem 0.9rem' }}
            >
              {copied ? '✅ Скопировано' : '📋 Скопировать текст'}
            </button>
            {hasWebUrl && (
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="copy-btn"
                style={{ background: '#1e293b', color: '#38bdf8', border: '1px solid #334155', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.5rem 0.9rem' }}
              >
                🌐 Перейти на сайт источника ↗
              </a>
            )}
          </div>

          {onGenerate && (
            <button
              type="button"
              className="generate-btn"
              onClick={() => {
                onClose()
                onGenerate(article)
              }}
              style={{ padding: '0.5rem 1.2rem', fontWeight: 700 }}
            >
              ✍️ Создать фельетон (3 мин)
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

