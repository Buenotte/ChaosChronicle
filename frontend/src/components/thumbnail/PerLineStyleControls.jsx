import { COLORS } from './TypographyStyleControls'

export default function PerLineStyleControls({
  previewLines = [],
  lineColors = null,
  setLineColors,
  fontColor = 'yellow',
  lineFontSizes = null,
  setLineFontSizes,
  customSizeNum = 82,
  fontSize = 'auto',
}) {
  if (!previewLines || previewLines.length <= 1) return null

  const hasCustomLineSizes = Array.isArray(lineFontSizes) && lineFontSizes.some(s => s && Number(s) > 0)
  const hasCustomLineColors = Array.isArray(lineColors) && lineColors.some(c => c)

  return (
    <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
      {/* 📏 1. Построчный размер шрифта */}
      {setLineFontSizes && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>
              📏 Размер для каждой строки:
            </label>
            {hasCustomLineSizes && (
              <button
                type="button"
                onClick={() => setLineFontSizes(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Сбросить размеры
              </button>
            )}
          </div>

          {previewLines.map((lineText, idx) => {
            const curLineSize = (lineFontSizes && lineFontSizes[idx] && Number(lineFontSizes[idx]) > 0)
              ? Number(lineFontSizes[idx])
              : (fontSize !== 'auto' ? Number(customSizeNum) : 82)
            const isCustom = lineFontSizes && lineFontSizes[idx] && Number(lineFontSizes[idx]) > 0

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  background: '#09090b',
                  padding: '0.35rem 0.6rem',
                  borderRadius: '6px',
                  border: isCustom ? '1px solid #0284c7' : '1px solid #27272a',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: isCustom ? '#38bdf8' : '#e4e4e7',
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    width: '95px',
                    flexShrink: 0,
                  }}
                  title={lineText}
                >
                  {idx + 1}. {lineText}
                </span>

                <input
                  type="range"
                  min="40"
                  max="160"
                  value={curLineSize}
                  onChange={e => {
                    const val = Number(e.target.value)
                    const baseArray = lineFontSizes
                      ? [...lineFontSizes]
                      : previewLines.map(() => (fontSize !== 'auto' ? Number(customSizeNum) : 82))
                    baseArray[idx] = val
                    setLineFontSizes(baseArray)
                  }}
                  style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer', height: '4px' }}
                />

                <span style={{ fontSize: '0.75rem', color: isCustom ? '#38bdf8' : '#a1a1aa', minWidth: '42px', textAlign: 'right', fontWeight: 700 }}>
                  {curLineSize}px
                </span>
              </div>
            )
          })}
        </div>
      )}

      {/* 🌈 2. Построчные цвета */}
      {setLineColors && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: '#f472b6', fontWeight: 700 }}>
              🌈 Цвет для каждой строки:
            </label>
            {hasCustomLineColors && (
              <button
                type="button"
                onClick={() => setLineColors(null)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Сбросить цвета
              </button>
            )}
          </div>

          {previewLines.map((lineText, idx) => {
            const curLineVal = (lineColors && lineColors[idx]) ? lineColors[idx] : fontColor
            const curHex = curLineVal?.startsWith('#') ? curLineVal : (COLORS.find(c => c.id === curLineVal)?.hex || '#FFE600')

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  background: '#09090b',
                  padding: '0.3rem 0.5rem',
                  borderRadius: '6px',
                }}
              >
                <span
                  style={{
                    fontSize: '0.75rem',
                    color: '#e4e4e7',
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '90px',
                  }}
                  title={lineText}
                >
                  {idx + 1}. {lineText}
                </span>

                <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                  {COLORS.map(c => {
                    const isCur = curLineVal === c.id || curLineVal === c.hex
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          const newArr = [...(lineColors || previewLines.map(() => fontColor))]
                          newArr[idx] = c.id
                          setLineColors(newArr)
                        }}
                        title={`Строка ${idx + 1}: ${c.label}`}
                        style={{
                          width: '16px',
                          height: '16px',
                          borderRadius: '50%',
                          background: c.hex,
                          border: isCur ? '2px solid #fff' : '1px solid #000',
                          cursor: 'pointer',
                          transform: isCur ? 'scale(1.2)' : 'scale(1)',
                          padding: 0,
                        }}
                      />
                    )
                  })}

                  <input
                    type="color"
                    value={curHex}
                    onChange={e => {
                      const newArr = [...(lineColors || previewLines.map(() => fontColor))]
                      newArr[idx] = e.target.value
                      setLineColors(newArr)
                    }}
                    style={{ width: '18px', height: '18px', padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }}
                    title="Свой цвет для этой строки"
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
