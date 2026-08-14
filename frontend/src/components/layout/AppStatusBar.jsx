import { AI_MODELS } from '../../lib/utils'

export default function AppStatusBar({
  backendStatus,
  filteredCount,
  selectedModel,
  lastRefresh,
  loading,
}) {
  return (
    <div className="status-bar">
      <div className="status-indicator">
        <span className={`status-dot ${backendStatus === 'online' ? 'online' : ''}`} />
        <span className="status-text">
          {backendStatus === 'online' ? 'Сервер активен' : 'Сервер недоступен'}
        </span>
      </div>
      {filteredCount > 0 && (
        <span className="status-count">{filteredCount} статей загружено</span>
      )}
      <span className="status-active-model">
        Выбрана модель: <strong>{AI_MODELS.find(m => m.id === selectedModel)?.name}</strong>
      </span>
      {lastRefresh && (
        <span className="status-refresh">
          Обновлено: {lastRefresh}
        </span>
      )}
      {loading && <span className="status-loading">⟳ Загрузка...</span>}
    </div>
  )
}
