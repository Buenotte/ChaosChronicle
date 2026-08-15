// Shared constants and utility functions used across all components

export const CATEGORIES = [
  { key: 'vse',       label: '🌐 Все новости',        color: '#6b7280' },
  { key: 'kultura',   label: '🎭 Культура',            color: '#8b5cf6' },
  { key: 'politika',  label: '🏛️ Политика',           color: '#ef4444' },
  { key: 'tekh',      label: '🤖 Технологии',          color: '#06b6d4' },
  { key: 'ekonomika', label: '📈 Экономика',           color: '#10b981' },
  { key: 'mir',       label: '🌍 Мир',                 color: '#f59e0b' },
  { key: 'sport',     label: '⚽ Спорт',               color: '#22c55e' },
  { key: 'ukraina',   label: '🇺🇦 Война в Украине',   color: '#facc15' },
]

export const AI_MODELS = [
  { id: 'gemini',   name: '✨ Gemini 3.6 Flash',         icon: '⚡' },
  { id: 'deepseek', name: '🧠 DeepSeek V3 / R1',         icon: '🌊' },
  { id: 'qwen',     name: '🦁 Qwen 2.5 72B',             icon: '👑' },
  { id: 'free',     name: '🎁 OpenRouter Free Router',   icon: '🆓' },
]

export const FEUILLETON_STYLES = [
  { id: 'golubuzki', name: '🎭 Алексей Голобуцкий (Сатира & Сарказм)', icon: '🎭', desc: 'Едкая ирония, смех как оружие, деконструкция официальной лжи' },
  { id: 'kasjanov',  name: '🪖 Юрий Касьянов (Военный реализм)',       icon: '🪖', desc: 'Рубленый синтаксис, ТТХ, дроны, логистика, без иллюзий' },
  { id: 'klimovski', name: '🔬 Юрий Климовский (Клиническая геополитика)', icon: '🔬', desc: 'Мир как операционный стол, диагнозы, снятие имперских брендов' },
  { id: 'gibrid',    name: '⚡ Гибридный авторский стиль (3 в 1)',      icon: '⚡', desc: 'Синтез сатиры, военного реализма и геополитики' },
]

export const CATEGORY_COLOR = Object.fromEntries(CATEGORIES.map(c => [c.key, c.color]))

export function timeAgo(pubDate) {
  if (!pubDate) return ''
  const now = new Date()
  const date = new Date(pubDate)
  if (isNaN(date)) return ''
  const diffMs = now - date
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'Только что'
  if (mins < 60) return `${mins} мин. назад`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} ч. назад`
  const days = Math.floor(hrs / 24)
  return `${days} дн. назад`
}

export function cleanMatchTitle(str) {
  if (!str) return ''
  return str.toLowerCase().replace(/[^a-z0-9а-яё]/gi, '')
}
