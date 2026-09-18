import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export default function PhotoQueriesModal({
  isOpen, onClose, folderName = '', bundleDir = '', title = '',
  scriptText = '', onSelectQuery, onAutoFetchWithQueries,
}) {
  const [queries, setQueries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [newQueryInput, setNewQueryInput] = useState('');
  const [desiredCount, setDesiredCount] = useState(100);
  const [showBatchAdd, setShowBatchAdd] = useState(false);
  const [batchText, setBatchText] = useState('');
  const [copiedIndex, setCopiedIndex] = useState(null);

  useEffect(() => { if (isOpen) loadOrGenerateQueries(); }, [isOpen, folderName, bundleDir]);

  const loadOrGenerateQueries = async (forceRegenerate = false) => {
    setLoading(true);
    try {
      if (!forceRegenerate && (folderName || bundleDir)) {
        const res = await fetch(`/api/package-photo-queries?${new URLSearchParams({ folderName, bundleDir })}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.queries) && data.queries.length > 0) {
          setQueries(data.queries); setLoading(false); return;
        }
      }
      const toastId = toast.loading('🧠 ИИ формирует запросы для поиска фото...');
      const genRes = await fetch('/api/generate-photo-queries', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderName, bundleDir, title, scriptText, count: desiredCount }),
      });
      const genData = await genRes.json();
      toast.dismiss(toastId);
      if (genData.success && Array.isArray(genData.queries)) {
        setQueries(genData.queries);
        toast.success(`✨ Сгенерировано ${genData.queries.length} поисковых запросов!`);
      } else { toast.error('Ошибка генерации: ' + (genData.error || 'Сбой')); }
    } catch (err) { toast.error('Ошибка: ' + err.message); }
    finally { setLoading(false); }
  };

  const handleAddSingle = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const trimmed = newQueryInput.trim();
    if (!trimmed) return;
    if (queries.includes(trimmed)) return toast.info('Этот запрос уже есть в списке');
    setQueries(prev => [trimmed, ...prev]);
    setNewQueryInput('');
    toast.success(`➕ Добавлен запрос: "${trimmed}"`);
  };

  const handleAddBatch = () => {
    const lines = batchText.split(/[\r\n,]+/).map(s => s.trim().replace(/^\d+[\.\)]\s*/, '')).filter(s => s.length > 1);
    if (lines.length === 0) return toast.error('Введите слова или фразы (через запятую или с новой строки)');
    const uniqueNew = lines.filter(item => !queries.includes(item));
    setQueries(prev => [...uniqueNew, ...prev]);
    setBatchText(''); setShowBatchAdd(false);
    toast.success(`➕ Добавлено +${uniqueNew.length} новых запросов!`);
  };

  const handleRemoveQuery = (indexToRemove) => {
    setQueries(prev => prev.filter((_, idx) => idx !== indexToRemove));
    toast.info('Запрос удален из списка');
  };

  const handleCopySingle = (q, idx) => {
    navigator.clipboard.writeText(q); setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 1500);
    toast.success('Скопировано!');
  };

  const handleCopyAll = () => {
    if (!queries.length) return;
    navigator.clipboard.writeText(queries.map((q, i) => `${i + 1}. ${q}`).join('\n'));
    toast.success(`📋 Все ${queries.length} запросов скопированы!`);
  };

  const filteredQueries = queries.filter(q => q.toLowerCase().includes(filterText.toLowerCase().trim()));
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-content"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: '840px', width: '95%', maxHeight: '92vh', display: 'flex', flexDirection: 'column',
          background: '#0b1120', border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.9rem 1.25rem', borderBottom: '1px solid #1e293b' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>📋</span>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc' }}>
                Поисковые слова и запросы ({queries.length})
              </h3>
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#94a3b8' }}>
              Добавляйте свои слова или используйте предложенные ИИ для поиска фото
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Top Controls: Disk Info + Target Count Selector */}
        <div style={{ padding: '0.55rem 1.25rem', background: '#0f172a', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#38bdf8' }}>
            <span>📁</span>
            <span>Файл на диске: <b>news/{folderName || 'пакет'}/photo_queries.txt</b></span>
          </div>

          {/* Photos Count Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ color: '#94a3b8', fontWeight: 600 }}>📸 Сколько фото искать:</span>
            {[10, 30, 50, 100].map(cnt => (
              <button
                key={cnt} type="button" onClick={() => setDesiredCount(cnt)}
                style={{
                  background: desiredCount === cnt ? '#2563eb' : '#1e293b',
                  border: desiredCount === cnt ? '1px solid #60a5fa' : '1px solid #334155',
                  color: '#fff', borderRadius: '4px', padding: '0.2rem 0.5rem',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {cnt}
              </button>
            ))}
            <input
              type="number" min="1" max="200" value={desiredCount}
              onChange={e => setDesiredCount(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
              style={{
                width: '52px', background: '#020617', border: '1px solid #334155',
                borderRadius: '4px', color: '#f8fafc', padding: '0.2rem 0.35rem',
                fontSize: '0.78rem', textAlign: 'center', fontWeight: 700,
              }}
              title="Введите точное количество фото (от 1 до 200)"
            />
          </div>
        </div>

        {/* Add Custom Query Input Bar */}
        <div style={{ padding: '0.65rem 1.25rem 0.4rem', background: '#0a101f', borderBottom: '1px solid #1e293b' }}>
          <form onSubmit={handleAddSingle} style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
            <input
              type="text" value={newQueryInput} onChange={e => setNewQueryInput(e.target.value)}
              placeholder="➕ Введите свое слово или тему для фото (на русском или англ.)..."
              style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '0.45rem 0.75rem', color: '#f8fafc', fontSize: '0.85rem' }}
            />
            <button
              type="submit" disabled={!newQueryInput.trim()}
              style={{
                background: newQueryInput.trim() ? '#2563eb' : '#1e293b',
                border: '1px solid #3b82f6', color: '#fff', borderRadius: '6px',
                padding: '0.45rem 0.85rem', fontSize: '0.82rem', fontWeight: 700,
                cursor: newQueryInput.trim() ? 'pointer' : 'default', whiteSpace: 'nowrap',
              }}
            >
              ➕ Добавить
            </button>
            <button
              type="button" onClick={() => setShowBatchAdd(prev => !prev)}
              style={{
                background: showBatchAdd ? '#7c3aed' : '#1e293b', border: '1px solid #8b5cf6',
                color: '#fff', borderRadius: '6px', padding: '0.45rem 0.75rem',
                fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
              }}
              title="Вставить целый список слов из буфера обмена"
            >
              📝 Список слов
            </button>
          </form>

          {/* Batch Add Area */}
          {showBatchAdd && (
            <div style={{ marginTop: '0.55rem', background: '#020617', padding: '0.65rem', borderRadius: '6px', border: '1px solid #334155' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#94a3b8', marginBottom: '0.35rem' }}>
                Вставьте список своих слов/фраз (каждое с новой строки или через запятую):
              </label>
              <textarea
                rows={3} value={batchText} onChange={e => setBatchText(e.target.value)}
                placeholder="врач невролог&#10;исследование сна&#10;пациент в клинике"
                style={{ width: '100%', background: '#0b1120', border: '1px solid #1e293b', borderRadius: '4px', padding: '0.4rem', color: '#f8fafc', fontSize: '0.82rem', resize: 'vertical' }}
              />
              <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', marginTop: '0.4rem' }}>
                <button type="button" onClick={handleAddBatch} style={{ background: '#059669', border: 'none', color: '#fff', borderRadius: '4px', padding: '0.35rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
                  ➕ Добавить все в список
                </button>
                <button type="button" onClick={() => setShowBatchAdd(false)} style={{ background: '#334155', border: 'none', color: '#cbd5e1', borderRadius: '4px', padding: '0.35rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  Отмена
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Filter Bar & Quick Actions */}
        <div style={{ padding: '0.5rem 1.25rem 0.2rem', display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <input
            type="text" value={filterText} onChange={e => setFilterText(e.target.value)}
            placeholder="🔍 Фильтр по списку..."
            style={{ flex: 1, background: '#020617', border: '1px solid #334155', borderRadius: '6px', padding: '0.38rem 0.7rem', color: '#f8fafc', fontSize: '0.82rem' }}
          />
          {queries.length > 0 && (
            <button
              type="button" onClick={() => setQueries([])}
              style={{ background: 'transparent', border: '1px solid #ef4444', color: '#f87171', borderRadius: '6px', padding: '0.35rem 0.65rem', fontSize: '0.75rem', cursor: 'pointer' }}
              title="Очистить весь список, чтобы ввести только свои слова"
            >
              🗑️ Очистить все
            </button>
          )}
        </div>

        {/* Query List Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0.5rem 1.25rem' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '0.5rem' }}>⏳</div>
              <p>ИИ формирует поисковые термины по тексту...</p>
            </div>
          ) : queries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Список пуст. Введите свои слова выше или нажмите «Сгенерировать запросы ИИ».</p>
            </div>
          ) : filteredQueries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              Ничего не найдено по фильтру «{filterText}»
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {filteredQueries.map((q, idx) => {
                const originalIndex = queries.indexOf(q);
                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#0f172a', border: '1px solid #1e293b', borderRadius: '6px',
                      padding: '0.4rem 0.7rem', gap: '0.6rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', minWidth: '26px' }}>
                        #{originalIndex + 1}
                      </span>
                      <span style={{ fontSize: '0.86rem', color: '#f1f5f9', fontWeight: 500, wordBreak: 'break-word' }}>
                        {q}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexShrink: 0 }}>
                      <button
                        type="button" onClick={() => handleCopySingle(q, idx)}
                        style={{
                          background: copiedIndex === idx ? '#059669' : '#1e293b',
                          border: '1px solid #475569', color: '#fff', borderRadius: '4px',
                          padding: '0.3rem 0.55rem', fontSize: '0.75rem', cursor: 'pointer',
                        }}
                        title="Скопировать"
                      >
                        {copiedIndex === idx ? '✓' : '📋'}
                      </button>

                      {onSelectQuery && (
                        <button
                          type="button" onClick={() => { onSelectQuery(q); onClose(); }}
                          style={{
                            background: '#0284c7', border: '1px solid #38bdf8', color: '#fff',
                            borderRadius: '4px', padding: '0.3rem 0.65rem', fontSize: '0.75rem',
                            fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
                          }}
                          title="Искать фото именно по этой фразе"
                        >
                          🔍 Искать
                        </button>
                      )}

                      <button
                        type="button" onClick={() => handleRemoveQuery(originalIndex)}
                        style={{ background: 'transparent', border: 'none', color: '#ef4444', borderRadius: '4px', padding: '0.3rem 0.45rem', fontSize: '0.85rem', cursor: 'pointer' }}
                        title="Удалить этот запрос из списка"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1.25rem', borderTop: '1px solid #1e293b', background: '#0a0f1d', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center' }}>
            <button
              type="button" onClick={() => loadOrGenerateQueries(true)} disabled={loading}
              style={{ background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', padding: '0.45rem 0.8rem', fontSize: '0.8rem', fontWeight: 600, cursor: loading ? 'default' : 'pointer' }}
            >
              {loading ? '⏳ Генерация...' : '🔄 Сгенерировать запросы ИИ'}
            </button>
            <button
              type="button" onClick={handleCopyAll} disabled={queries.length === 0}
              style={{ background: '#1e293b', border: '1px solid #475569', color: '#cbd5e1', borderRadius: '6px', padding: '0.45rem 0.8rem', fontSize: '0.8rem', cursor: 'pointer' }}
            >
              📋 Скопировать список
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {onAutoFetchWithQueries && queries.length > 0 && (
              <button
                type="button"
                onClick={() => { onAutoFetchWithQueries(queries, desiredCount); onClose(); }}
                disabled={loading}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                  border: '1px solid #34d399', color: '#fff', borderRadius: '6px',
                  padding: '0.48rem 1.1rem', fontSize: '0.85rem', fontWeight: 700,
                  cursor: loading ? 'default' : 'pointer',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
                }}
              >
                🚀 Искать и скачать {desiredCount} фото
              </button>
            )}
            <button className="close-btn" onClick={onClose} style={{ padding: '0.45rem 0.85rem' }}>Закрыть</button>
          </div>
        </div>
      </div>
    </div>
  );
}
