import { CATEGORIES, AI_MODELS, FEUILLETON_STYLES } from '../../lib/utils'

export default function AppHeader({
  selectedModel,
  setSelectedModel,
  selectedStyle,
  setSelectedStyle,
  search,
  setSearch,
  category,
  setCategory,
  onRefresh,
  loading,
  savedCount = 0,
  onOpenCustomNews,
}) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-wrap">
          <h1 className="brand-title">ChaosChronicle</h1>
          <p className="brand-sub">Политическая сатира & Фельетоны · Генератор контента</p>
        </div>

        <div className="header-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Выбор стиля фельетона */}
          <div className="model-select-wrap">
            <span className="model-label">🎭 Стиль:</span>
            <select
              className="model-select"
              value={selectedStyle}
              onChange={e => setSelectedStyle(e.target.value)}
              title="Выберите авторский стиль фельетона (Голобуцкий, Касьянов, Климовский или Гибридный)"
              style={{ background: '#1c1829', borderColor: '#8b5cf6' }}
            >
              {FEUILLETON_STYLES.map(s => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Выбор модели ИИ */}
          <div className="model-select-wrap">
            <span className="model-label">🤖 Модель:</span>
            <select
              className="model-select"
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              title="Выберите модель искусственного интеллекта для генерации фельетона"
            >
              {AI_MODELS.map(m => (
                <option key={m.id} value={m.id}>
                  {m.icon} {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Поиск */}
          <div className="search-wrap">
            <input
              type="search"
              className="search-input"
              placeholder="Поиск новостей..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="search-clear"
                onClick={() => setSearch('')}
                aria-label="Очистить поиск"
              >
                ✕
              </button>
            )}
          </div>

          {/* Своя новость */}
          <button
            type="button"
            className="custom-news-btn"
            onClick={onOpenCustomNews}
            title="Добавить свою тему или новость вручную (из YouTube, Telegram, Twitter)"
            style={{
              background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
              color: '#ffffff',
              border: '1px solid #a78bfa',
              borderRadius: '8px',
              padding: '0.42rem 0.85rem',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 2px 8px rgba(124, 58, 237, 0.35)',
              whiteSpace: 'nowrap',
            }}
          >
            <span>➕</span>
            <span>Своя новость</span>
          </button>

          {/* Обновить */}
          <button
            className="refresh-btn"
            onClick={onRefresh}
            disabled={loading}
            title="Принудительно обновить RSS-ленты"
          >
            <span className={loading ? 'spin' : ''}>⟳</span>
          </button>
        </div>
      </div>

      {/* Категории */}
      <nav className="category-tabs" aria-label="Категории новостей">
        {CATEGORIES.map(cat => {
          const countBadge = cat.key === 'saved' && savedCount > 0 ? ` (${savedCount})` : ''
          return (
            <button
              key={cat.key}
              className={`tab-btn ${category === cat.key ? 'active' : ''}`}
              style={{ '--tab-color': cat.color }}
              onClick={() => setCategory(cat.key)}
            >
              {cat.label}{countBadge}
            </button>
          )
        })}
      </nav>
    </header>
  )
}
