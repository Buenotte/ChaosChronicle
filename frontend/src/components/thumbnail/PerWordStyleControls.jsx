import { COLORS } from './TypographyStyleControls'

export default function PerWordStyleControls({
  words = [],
  wordColors = null,
  setWordColors,
  wordFontSizes = null,
  setWordFontSizes,
  fontColor = 'yellow',
  customSizeNum = 82,
  fontSize = 'auto',
}) {
  if (!words || words.length === 0) return null

  const hasCustomWordSizes = Array.isArray(wordFontSizes) && wordFontSizes.some(s => s && Number(s) > 0)
  const hasCustomWordColors = Array.isArray(wordColors) && wordColors.some(c => c)

  const handleWordColorSelect = (idx, colId) => {
    const base = wordColors ? [...wordColors] : words.map(() => fontColor || 'yellow')
    base[idx] = colId
    setWordColors(base)
  }

  const handleWordSizeChange = (idx, size) => {
    const defaultSz = fontSize !== 'auto' ? Number(customSizeNum) : 82
    const base = wordFontSizes ? [...wordFontSizes] : words.map(() => defaultSz)
    base[idx] = Number(size)
    setWordFontSizes(base)
  }

  const handleResetWord = (idx) => {
    if (wordColors) {
      const nextCols = [...wordColors]
      nextCols[idx] = null
      setWordColors(nextCols.some(Boolean) ? nextCols : null)
    }
    if (wordFontSizes) {
      const nextSizes = [...wordFontSizes]
      nextSizes[idx] = null
      setWordFontSizes(nextSizes.some(s => s && Number(s) > 0) ? nextSizes : null)
    }
  }

  const handleResetAll = () => {
    setWordColors(null)
    setWordFontSizes(null)
  }

  return (
    <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <label style={{ fontSize: '0.85rem', color: '#f43f5e', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          🔤 Настройка каждого слова (размер и цвет):
        </label>
        {(hasCustomWordSizes || hasCustomWordColors) && (
          <button
            type="button"
            onClick={handleResetAll}
            style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Сбросить все слова
          </button>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {words.map((word, idx) => {
          const curWordColor = (wordColors && wordColors[idx]) ? wordColors[idx] : (fontColor || 'yellow')
          const isCustomColor = wordColors && Boolean(wordColors[idx])
          const curWordSize = (wordFontSizes && wordFontSizes[idx] && Number(wordFontSizes[idx]) > 0)
            ? Number(wordFontSizes[idx])
            : (fontSize !== 'auto' ? Number(customSizeNum) : 82)
          const isCustomSize = wordFontSizes && wordFontSizes[idx] && Number(wordFontSizes[idx]) > 0

          return (
            <div
              key={idx}
              style={{
                background: '#09090b',
                padding: '0.55rem 0.65rem',
                borderRadius: '6px',
                border: (isCustomColor || isCustomSize) ? '1px solid #f43f5e' : '1px solid #27272a',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.7rem', background: '#27272a', color: '#a1a1aa', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                    #{idx + 1}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: curWordColor.startsWith('#') ? curWordColor : (COLORS.find(c => c.id === curWordColor)?.hex || '#FFE600') }}>
                    {word.toUpperCase()}
                  </span>
                </div>
                {(isCustomColor || isCustomSize) && (
                  <button
                    type="button"
                    onClick={() => handleResetWord(idx)}
                    style={{ background: 'none', border: 'none', color: '#71717a', fontSize: '0.7rem', cursor: 'pointer' }}
                    title="Сбросить настройки для этого слова"
                  >
                    ✕ сбросить
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', minWidth: '45px' }}>Размер:</span>
                <input
                  type="range"
                  min="40"
                  max="160"
                  value={curWordSize}
                  onChange={e => handleWordSizeChange(idx, e.target.value)}
                  style={{ flex: 1, accentColor: '#f43f5e', cursor: 'pointer', height: '4px' }}
                />
                <span style={{ fontSize: '0.75rem', color: isCustomSize ? '#f43f5e' : '#a1a1aa', minWidth: '40px', textAlign: 'right', fontWeight: 700 }}>
                  {curWordSize}px
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.7rem', color: '#9ca3af', minWidth: '45px' }}>Цвет:</span>
                {COLORS.map(c => {
                  const isSelected = curWordColor === c.id || curWordColor === c.hex
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleWordColorSelect(idx, c.id)}
                      title={`${c.label} (${c.hex})`}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        background: c.hex,
                        border: isSelected ? '2px solid #ffffff' : '1px solid rgba(0,0,0,0.5)',
                        cursor: 'pointer',
                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: isSelected ? '0 0 6px rgba(255,255,255,0.7)' : 'none',
                        padding: 0,
                      }}
                    />
                  )
                })}
                <input
                  type="color"
                  value={curWordColor?.startsWith('#') ? curWordColor : (COLORS.find(c => c.id === curWordColor)?.hex || '#FFE600')}
                  onChange={e => handleWordColorSelect(idx, e.target.value)}
                  title="Выбрать точный цвет HEX"
                  style={{ width: '22px', height: '22px', border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
