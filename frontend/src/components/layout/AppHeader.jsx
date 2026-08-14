import { CATEGORIES, AI_MODELS } from '../../lib/utils'

export default function AppHeader({
  selectedModel,
  setSelectedModel,
  search,
  setSearch,
  category,
  setCategory,
  onRefresh,
  loading,
}) {
  return (
    <header className="app-header">
      <div className="header-inner">
        <div className="brand-wrap">
          <h1 className="brand-title">ChaosChronicle</h1>
          <p className="brand-sub">Политическая сатира & Фельетоны · Генератор контента</p>
        </div>

        <div className="header-actions">
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
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`tab-btn ${category === cat.key ? 'active' : ''}`}
            style={{ '--tab-color': cat.color }}
            onClick={() => setCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </nav>
    </header>
  )
}
