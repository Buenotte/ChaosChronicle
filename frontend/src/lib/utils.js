// Shared constants and utility functions used across all components

export const CATEGORIES = [
  { key: 'vse',       label: '🌐 Все новости',        color: '#6b7280' },
  { key: 'saved',     label: '💾 Сохранённые',       color: '#10b981' },
  { key: 'absurd',    label: '🤡 Абсурд & Скрепы',    color: '#ec4899' },
  { key: 'ukraina',   label: '🇺🇦 Украина',           color: '#facc15' },
  { key: 'rossija',   label: '🇷🇺 Россия',            color: '#f43f5e' },
  { key: 'politika',  label: '🏛️ Политика',           color: '#ef4444' },
  { key: 'ekonomika', label: '📈 Экономика',           color: '#3b82f6' },
  { key: 'kultura',   label: '🎭 Культура',            color: '#8b5cf6' },
  { key: 'tekh',      label: '🤖 Технологии',          color: '#06b6d4' },
  { key: 'mir',       label: '🌍 Мир',                 color: '#f59e0b' },
]

export const AI_MODELS = [
  { id: 'gemini',   name: '✨ Gemini 3.7 Flash (Рекомендуется)', icon: '⚡' },
  { id: 'deepseek', name: '🧠 DeepSeek Chat / V3',               icon: '🌊' },
]

export const FEUILLETON_STYLES = [
  { id: 'analytics', name: '🧠 Увлекательная Аналитика (Без гротеска)', icon: '🧠', desc: 'Умный, понятный и глубокий разбор: факты, скрытые мотивы, расстановка сил и последствия' },
  { id: 'clickbait', name: '🔥 Кликбейт & YouTube Топ (CTR 20%+)', icon: '🔥', desc: 'Максимальная кликабельность, интрига, шок-фактор, эмоциональный триггер' },
  { id: 'golubuzki', name: '🎭 Алексей Голобуцкий (Сатира & Сарказм)', icon: '🎭', desc: 'Едкая ирония, смех как оружие, деконструкция официальной лжи' },
  { id: 'kasjanov',  name: '🪖 Юрий Касьянов (Военный реализм)',       icon: '🪖', desc: 'Рубленый синтаксис, ТТХ, дроны, логистика, точный расчет' },
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

const LAT_TO_CYR = {
  shch: 'щ', sch: 'щ', ch: 'ч', sh: 'ш', zh: 'ж',
  yu: 'ю', ju: 'ю', ya: 'я', ja: 'я', yo: 'ё', jo: 'ё',
  ts: 'ц', tc: 'ц',
  a: 'а', b: 'б', v: 'в', w: 'в', g: 'г', d: 'д',
  e: 'е', z: 'з', i: 'и', j: 'й', y: 'ы', k: 'к',
  l: 'л', m: 'м', n: 'н', o: 'о', p: 'п', r: 'р',
  s: 'с', t: 'т', u: 'у', f: 'ф', h: 'х', c: 'к'
}

const CYR_TO_LAT = {
  'щ': 'shch', 'ч': 'ch', 'ш': 'sh', 'ж': 'zh', 'ю': 'yu', 'я': 'ya', 'ё': 'yo', 'ц': 'ts',
  'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'з': 'z', 'и': 'i', 'й': 'j',
  'ы': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's',
  'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'э': 'e', 'ъ': '', 'ь': ''
}

const QWERTY_TO_RU = {
  'q':'й','w':'ц','e':'у','r':'к','t':'е','y':'н','u':'г','i':'ш','o':'щ','p':'з','[':'х',']':'ъ',
  'a':'ф','s':'ы','d':'в','f':'а','g':'п','h':'р','j':'о','k':'л','l':'д',';':'ж','\'':'э',
  'z':'я','x':'ч','c':'с','v':'м','b':'и','n':'т','m':'ь',',':'б','.':'ю'
}

export function matchesSearch(item, searchStr) {
  if (!searchStr || !searchStr.trim()) return true
  const rawQ = searchStr.trim().toLowerCase()
  let cyrQ = rawQ
  for (const [lat, cyr] of Object.entries(LAT_TO_CYR)) {
    cyrQ = cyrQ.replaceAll(lat, cyr)
  }
  const latQ = rawQ.split('').map(c => CYR_TO_LAT[c] !== undefined ? CYR_TO_LAT[c] : c).join('')
  const qwertyQ = rawQ.split('').map(c => QWERTY_TO_RU[c] || c).join('')

  const queryVariants = [rawQ, cyrQ, latQ, qwertyQ].filter(Boolean)
  const targets = [item.title, item.summary, item.source, item.url, item.original_title]
    .filter(Boolean)
    .map(t => t.toLowerCase())

  return queryVariants.some(qVar => targets.some(target => target.includes(qVar)))
}
