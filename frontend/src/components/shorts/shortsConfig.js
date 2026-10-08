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

export function extractCleanSpeechText(raw) {
  if (!raw || typeof raw !== 'string') return ''
  let text = raw
  if (text.includes('##') && /##\s*🎬?\s*Сценарий/i.test(text)) {
    const parts = text.split(/##\s*🎬?\s*Сценарий/i)
    if (parts[1]) text = parts[1]
  }
  return text
    .replace(/\[B-Roll:[^\]]*\]/gi, ' ')
    .replace(/#+\s*[^\r\n]+/g, ' ')
    .replace(/---+/g, ' ')
    .replace(/[*_`«»"']/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .trim()
}

// Schätzung der Zeichenbreite (Charakter-Breite für exakte FFmpeg-Synchronisation)
export function estimateCharWidth(ch, font = 'impact', sz = 110) {
  const f = (font || '').toLowerCase()
  let fontScale = 1.0
  if (f.includes('impact')) fontScale = 0.90
  else if (f.includes('buran')) fontScale = 0.85
  else if (f.includes('russo')) fontScale = 1.08
  else if (f.includes('unbounded') || f.includes('arial')) fontScale = 1.05
  else if (f.includes('rubik') || f.includes('delagothic') || f.includes('seymour')) fontScale = 1.25
  else if (f.includes('saxonia')) fontScale = 0.88

  if ('I1!|:;.,\'"il·'.includes(ch)) return sz * 0.28 * fontScale
  if (ch === ' ') return sz * 0.30 * fontScale
  if ('Jtfjr-()[]'.includes(ch)) return sz * 0.38 * fontScale
  if ('ГТLEFZ7'.includes(ch)) return sz * 0.52 * fontScale
  if ('ЖМФШЩЫЮMW@#%&—'.includes(ch)) return sz * 0.88 * fontScale
  return sz * 0.65 * fontScale
}

// Berechnung der wirksamen Schriftgröße (Auto-Shrink bei Überbreite für 1:1 Übereinstimmung mit FFmpeg)
export function calculateEffectiveSpeechFontSize({ words1 = [], words2 = [], font = 'impact', fontSize = 115, wordGap = 14, maxSafeW = 864 }) {
  let baseFontSize = Number(fontSize) || 115
  const calcLineW = (words, sz) => {
    let w = 0
    words.forEach((tw, idx) => {
      const text = typeof tw === 'string' ? tw : (tw?.word || '')
      for (const c of text) w += estimateCharWidth(c, font, sz)
      if (idx > 0) w += wordGap + (sz * 0.16)
    })
    return Math.round(w)
  }
  const w1 = calcLineW(words1, baseFontSize)
  const w2 = words2.length > 0 ? calcLineW(words2, baseFontSize) : 0
  const maxLineW = Math.max(w1, w2)
  if (maxLineW > maxSafeW) {
    baseFontSize = Math.max(75, Math.floor(baseFontSize * (maxSafeW / maxLineW)))
  }
  return baseFontSize
}

// Berechnung einer einheitlichen globalen Schriftgröße für alle Zeilen im gesamten Video (verhindert Größensprünge)
export function calculateUniformSpeechFontSize({ allWords = [], font = 'impact', fontSize = 115, wordGap = 14, pacing = 'wave', maxSafeW = 864 }) {
  let uniformSize = Number(fontSize) || 115
  if (!allWords || allWords.length === 0) return uniformSize
  const isSingle = pacing === 'single', isTwo = pacing === 'blitz' || pacing === 'two'
  const waveSize = isSingle ? 1 : (isTwo ? 2 : 4)
  const calcLineW = (words, sz) => {
    let w = 0
    words.forEach((tw, idx) => {
      const text = typeof tw === 'string' ? tw : (tw?.word || '')
      for (const c of text) w += estimateCharWidth(c, font, sz)
      if (idx > 0) w += wordGap + (sz * 0.16)
    })
    return Math.round(w)
  }

  for (let i = 0; i < allWords.length; i += waveSize) {
    const chunk = allWords.slice(i, i + waveSize)
    const isMulti = chunk.length > 2
    const splitIdx = isMulti ? Math.ceil(chunk.length / 2) : chunk.length
    const line1 = chunk.slice(0, splitIdx)
    const line2 = isMulti ? chunk.slice(splitIdx) : []
    const w1 = calcLineW(line1, uniformSize)
    const w2 = isMulti ? calcLineW(line2, uniformSize) : 0
    const maxW = Math.max(w1, w2)
    if (maxW > maxSafeW) {
      const fitted = Math.max(75, Math.floor(uniformSize * (maxSafeW / maxW)))
      if (fitted < uniformSize) uniformSize = fitted
    }
  }
  return uniformSize
}

