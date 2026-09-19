export default function PhotoSearchHeader({
  searchQuery,
  setSearchQuery,
  onQueryChange,
  onSearch,
  searching,
  isLoading,
  currentEngine = 'all',
}) {
  const handleQueryChange = (val) => {
    if (typeof onQueryChange === 'function') onQueryChange(val);
    if (typeof setSearchQuery === 'function') setSearchQuery(val);
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    onSearch(currentEngine || 'all');
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
        value={searchQuery || ''}
        onChange={e => handleQueryChange(e.target.value)}
        placeholder="Введите слово для поиска (например: слон, ракета, ученый)..."
        style={{
          flex: 1,
          minWidth: '220px',
          background: '#020617',
          border: '1px solid #334155',
          color: '#f8fafc',
          padding: '0.45rem 0.75rem',
          borderRadius: '6px',
          fontSize: '0.88rem',
        }}
        autoFocus
      />

      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button
          type="submit"
          disabled={isLoading}
          style={{
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            border: '1px solid #3b82f6',
            color: '#ffffff',
            fontWeight: 700,
            padding: '0.45rem 0.9rem',
            borderRadius: '6px',
            fontSize: '0.82rem',
            cursor: isLoading ? 'default' : 'pointer',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
          }}
        >
          {searching ? '⏳ Поиск...' : '🔍 Найти'}
        </button>

        <button
          type="button"
          onClick={() => onSearch('bing')}
          disabled={isLoading}
          style={{
            background: currentEngine === 'bing' ? '#0284c7' : '#0369a1',
            border: '1px solid #38bdf8',
            color: '#fff',
            fontWeight: 600,
            padding: '0.42rem 0.7rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            cursor: isLoading ? 'default' : 'pointer',
          }}
          title="Поиск в Bing"
        >
          🔵 Bing
        </button>

        <button
          type="button"
          onClick={() => onSearch('yandex')}
          disabled={isLoading}
          style={{
            background: currentEngine === 'yandex' ? '#b91c1c' : '#dc2626',
            border: '1px solid #f87171',
            color: '#fff',
            fontWeight: 600,
            padding: '0.42rem 0.7rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            cursor: isLoading ? 'default' : 'pointer',
          }}
          title="Поиск в Yandex"
        >
          🔴 Yandex
        </button>

        <button
          type="button"
          onClick={() => onSearch('pinterest')}
          disabled={isLoading}
          style={{
            background: currentEngine === 'pinterest' ? '#be123c' : '#e11d48',
            border: '1px solid #fb7185',
            color: '#fff',
            fontWeight: 600,
            padding: '0.42rem 0.7rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            cursor: isLoading ? 'default' : 'pointer',
          }}
          title="Поиск в Pinterest"
        >
          📌 Pinterest
        </button>

        <button
          type="button"
          onClick={() => onSearch('article')}
          disabled={isLoading}
          style={{
            background: currentEngine === 'article' ? '#059669' : '#047857',
            border: '1px solid #34d399',
            color: '#fff',
            fontWeight: 600,
            padding: '0.42rem 0.7rem',
            borderRadius: '6px',
            fontSize: '0.8rem',
            cursor: isLoading ? 'default' : 'pointer',
          }}
          title="Поиск в СМИ по теме"
        >
          📰 СМИ
        </button>
      </div>
    </form>
  );
}
