export const SHORTS_FONTS = [
  { id: 'impact', name: 'Impact (Классика)', family: 'Impact, sans-serif' },
  { id: 'arial_black', name: 'Arial Black (Жирный)', family: '"Arial Black", sans-serif' },
  { id: 'Saxonia_Antiqua_Bold.ttf', name: 'Saxonia Antiqua Bold', family: '"Saxonia_Antiqua_Bold", "Saxonia Antiqua Bold", "Saxonia Antiqua", serif' },
  { id: 'SeymourOne-Regular.ttf', name: 'Seymour One (Акцентный)', family: '"Seymour One", "SeymourOne-Regular", sans-serif' },
  { id: 'StalinistOne-Regular.ttf', name: 'Stalinist One (Брутализм)', family: '"Stalinist One", "StalinistOne-Regular", sans-serif' },
  { id: 'Unbounded-Black.ttf', name: 'Unbounded Black (Киберпанк)', family: '"Unbounded Black", "Unbounded-Black", sans-serif' },
  { id: 'Buran_USSR.ttf', name: 'Buran USSR (Плакат)', family: '"Buran USSR", "Buran_USSR", Impact, sans-serif' },
  { id: 'RussoOne-Regular.ttf', name: 'Russo One (Современный)', family: '"Russo One", "RussoOne-Regular", sans-serif' },
  { id: 'DelaGothicOne-Regular.ttf', name: 'Dela Gothic (Монолит)', family: '"Dela Gothic One", "DelaGothicOne-Regular", sans-serif' },
  { id: 'RubikMonoOne-Regular.ttf', name: 'Rubik Mono (Плотный)', family: '"Rubik Mono One", "RubikMonoOne-Regular", sans-serif' },
]

export const TEXT_COLORS = [
  { id: 'yellow', hex: '#FFE600', label: 'Желтый' },
  { id: 'white', hex: '#FFFFFF', label: 'Белый' },
  { id: 'red', hex: '#FF2A2A', label: 'Красный' },
  { id: 'cyan', hex: '#00F0FF', label: 'Голубой' },
  { id: 'green', hex: '#00FF66', label: 'Зеленый' },
  { id: 'orange', hex: '#FF8C00', label: 'Оранжевый' },
]

export const BOX_COLORS = [
  { id: 'black', hex: '#000000', label: 'Черный' },
  { id: 'red', hex: '#FF2A2A', label: 'Красный' },
  { id: 'blue', hex: '#1D4ED8', label: 'Синий' },
  { id: 'yellow', hex: '#FFE600', label: 'Желтый' },
  { id: 'purple', hex: '#7C3AED', label: 'Фиолетовый' },
]

export function wrapShortsText(rawText, maxChars = 12) {
  if (typeof rawText === 'string' && rawText.includes('\n')) {
    const userLines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
    if (userLines.length > 0) return userLines.join('\n')
  }
  const words = String(rawText || '').replace(/[\r\n\t]/g, ' ').replace(/["'«»`]/g, '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  const wrappedLines = []
  let cur = ''
  for (let i = 0; i < words.length; i++) {
    const w = words[i]
    if (!cur) cur = w
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w
    else { wrappedLines.push(cur); cur = w }
  }
  if (cur) wrappedLines.push(cur)
  return wrappedLines.join('\n')
}
