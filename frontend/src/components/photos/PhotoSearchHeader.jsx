export default function PhotoSearchHeader({
  searchQuery,
  setSearchQuery,
  onSearch,
  searching,
  isLoading,
  currentEngine,
}) {
  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    onSearch('all');
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        margin: '0.75rem 1.25rem 0',
        padding: '0.65rem 0.9rem',
        background: '#0f172a',
        borderRadius: '8px',
        border: '1px solid #1e293b',
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap' }}>
        🔍 Поиск фото:
      </label>
      <input
        type="text"
        value={searchQuery}
        onChange={e => setSearchQuery(e.target.value)}
        placeholder="Ключевые слова для поиска..."
        style={{
          flex: 1,
          minWidth: '200px',
          background: '#020617',
          border: '1px solid #334155',
          color: '#f8fafc',
          padding: '0.42rem 0.75rem',
          borderRadius: '6px',
          fontSize: '0.85rem',
        }}
      />

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onSearch('article')}
          disabled={isLoading}
          style={{
            background: currentEngine === 'article' ? '#059669' : '#047857',
            border: '1px solid #34d399',
            color: '#fff',
            fontWeight: 700,
            padding: '0.42rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            cursor: isLoading ? 'default' : 'pointer',
          }}
          title="Искать фото из всех СМИ и новостных агентств по этой теме новости"
        >
          {searching && currentEngine === 'article' ? '⏳...' : '📰 СМИ по теме'}
        </button>

        <button
          type="submit"
          disabled={isLoading}
          className="copy-btn"
          style={{
            background: currentEngine === 'all' ? '#2563eb' : '#1e293b',
            border: '1px solid #475569',
            color: '#f8fafc',
            fontWeight: 700,
            padding: '0.42rem 0.75rem',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
          }}
          title="Поиск по всем источникам (СМИ, Bing, Yandex, Pinterest)"
        >
          {searching && currentEngine === 'all' ? '⏳...' : '🔎 Все'}
        </button>

        <button
          type="button"
          onClick={() => onSearch('bing')}
          disabled={isLoading}
          style={{
            background: currentEngine === 'bing' ? '#0284c7' : '#0369a1',
            border: '1px solid #38bdf8',
            color: '#fff',
            fontWeight: 700,
            padding: '0.42rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            cursor: isLoading ? 'default' : 'pointer',
          }}
          title="Искать фото ТОЛЬКО в Bing"
        >
          {searching && currentEngine === 'bing' ? '⏳...' : '🔵 Bing'}
        </button>

        <button
          type="button"
          onClick={() => onSearch('pinterest')}
          disabled={isLoading}
          style={{
            background: currentEngine === 'pinterest' ? '#be123c' : '#e11d48',
            border: '1px solid #fb7185',
            color: '#fff',
            fontWeight: 700,
            padding: '0.42rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            cursor: isLoading ? 'default' : 'pointer',
          }}
          title="Искать фото ТОЛЬКО в Pinterest"
        >
          {searching && currentEngine === 'pinterest' ? '⏳...' : '📌 Pinterest'}
        </button>

        <button
          type="button"
          onClick={() => onSearch('yandex')}
          disabled={isLoading}
          style={{
            background: currentEngine === 'yandex' ? '#b91c1c' : '#dc2626',
            border: '1px solid #f87171',
            color: '#fff',
            fontWeight: 700,
            padding: '0.42rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            whiteSpace: 'nowrap',
            cursor: isLoading ? 'default' : 'pointer',
          }}
          title="Искать фото ТОЛЬКО в Yandex"
        >
          {searching && currentEngine === 'yandex' ? '⏳...' : '🔴 Yandex'}
        </button>
      </div>
    </form>
  );
}
