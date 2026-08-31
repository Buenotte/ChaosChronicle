import React, { useState } from 'react'

export const STROKE_COLORS = [
  { id: 'black', hex: '#000000', label: 'Черный' },
  { id: 'white', hex: '#FFFFFF', label: 'Белый' },
  { id: 'red', hex: '#FF2A2A', label: 'Красный' },
  { id: 'yellow', hex: '#FFE600', label: 'Желтый' },
  { id: 'blue', hex: '#1D4ED8', label: 'Синий' },
]

export const SHADOW_COLORS = [
  { id: 'black', hex: '#000000', label: 'Черная' },
  { id: 'red', hex: '#FF0033', label: 'Красная' },
  { id: 'yellow', hex: '#FFE600', label: 'Желтая' },
  { id: 'cyan', hex: '#00F0FF', label: 'Голубая' },
  { id: 'white', hex: '#FFFFFF', label: 'Белая' },
]

export const WORD_COLORS = [
  { id: 'yellow', hex: '#FFE600', label: 'Желтый' },
  { id: 'white', hex: '#FFFFFF', label: 'Белый' },
  { id: 'red', hex: '#FF2A2A', label: 'Красный' },
  { id: 'cyan', hex: '#00F0FF', label: 'Голубой' },
  { id: 'green', hex: '#00FF66', label: 'Зеленый' },
  { id: 'orange', hex: '#FF8C00', label: 'Оранжевый' },
]

export default function ShortsTypographyControls({
  strokeWidth, setStrokeWidth,
  strokeColor, setStrokeColor,
  shadowDistance, setShadowDistance,
  shadowColor, setShadowColor,
  words = [],
  wordColors = null, setWordColors,
  wordFontSizes = null, setWordFontSizes,
  fontColor = 'yellow',
  fontSize = 110,
  onDirty,
}) {
  const [tab, setTab] = useState('words') // 'general' | 'words'

  const hasCustomWordStyles = (
    (Array.isArray(wordColors) && wordColors.some(Boolean)) ||
    (Array.isArray(wordFontSizes) && wordFontSizes.some(s => s && Number(s) > 0))
  )

  const handleWordColorSelect = (idx, colId) => {
    const base = wordColors ? [...wordColors] : words.map(() => fontColor || 'yellow')
    base[idx] = colId
    setWordColors(base)
    if (onDirty) onDirty()
  }

  const handleWordSizeChange = (idx, size) => {
    const base = wordFontSizes ? [...wordFontSizes] : words.map(() => Number(fontSize) || 110)
    base[idx] = Number(size)
    setWordFontSizes(base)
    if (onDirty) onDirty()
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
    if (onDirty) onDirty()
  }

  const handleResetAllWords = () => {
    setWordColors(null)
    setWordFontSizes(null)
    if (onDirty) onDirty()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {/* Переключатель вкладок Общий / Каждое слово */}
      <div style={{ display: 'flex', gap: '0.4rem', background: '#090d16', padding: '3px', borderRadius: '6px', border: '1px solid #1f2937' }}>
        <button
          type="button"
          onClick={() => setTab('words')}
          style={{
            flex: 1, padding: '0.35rem', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700,
            background: tab === 'words' ? '#f43f5e' : 'transparent', color: '#fff', border: 'none',
          }}
        >
          🔤 Каждое слово ({words.length}) {hasCustomWordStyles ? '✨' : ''}
        </button>
        <button
          type="button"
          onClick={() => setTab('general')}
          style={{
            flex: 1, padding: '0.35rem', borderRadius: '4px', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700,
            background: tab === 'general' ? '#f43f5e' : 'transparent', color: '#fff', border: 'none',
          }}
        >
          🎨 Контур и Тень
        </button>
      </div>

      {tab === 'words' ? (
        /* Настройка каждого слова */
        <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', maxHeight: '240px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f43f5e' }}>
              Размер и цвет отдельных слов:
            </span>
            {hasCustomWordStyles && (
              <button
                type="button"
                onClick={handleResetAllWords}
                style={{ background: 'none', border: 'none', color: '#f43f5e', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Сброс всех
              </button>
            )}
          </div>

          {words.map((w, idx) => {
            const curCol = (wordColors && wordColors[idx]) ? wordColors[idx] : fontColor
            const curSz = (wordFontSizes && wordFontSizes[idx] && Number(wordFontSizes[idx]) > 0) ? Number(wordFontSizes[idx]) : (Number(fontSize) || 110)
            const isCustom = (wordColors && Boolean(wordColors[idx])) || (wordFontSizes && Number(wordFontSizes[idx]) > 0)

            return (
              <div key={idx} style={{ background: '#090d16', border: isCustom ? '1px solid #f43f5e' : '1px solid #1e293b', borderRadius: '6px', padding: '0.45rem 0.6rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: WORD_COLORS.find(c => c.id === curCol)?.hex || '#fff' }}>
                    «{w}»
                  </span>
                  <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                    {WORD_COLORS.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleWordColorSelect(idx, c.id)}
                        style={{
                          width: '16px', height: '16px', borderRadius: '50%', background: c.hex,
                          border: curCol === c.id ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)',
                          cursor: 'pointer', boxShadow: curCol === c.id ? '0 0 5px #fff' : 'none'
                        }}
                        title={c.label}
                      />
                    ))}
                    {isCustom && (
                      <button
                        type="button"
                        onClick={() => handleResetWord(idx)}
                        style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.7rem', cursor: 'pointer', marginLeft: '4px' }}
                        title="Сбросить"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.72rem', color: '#9ca3af', minWidth: '42px' }}>{curSz}px</span>
                  <input
                    type="range" min="40" max="220" value={curSz}
                    onChange={e => handleWordSizeChange(idx, e.target.value)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        /* Настройка контура и тени */
        <>
          {/* Контур / Обводка */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f3f4f6' }}>
                ✏️ Контур/Обводка букв ({strokeWidth}px):
              </span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {STROKE_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setStrokeColor(c.id); if (onDirty) onDirty(); }}
                    style={{
                      width: '18px', height: '18px', borderRadius: '50%', background: c.hex,
                      border: strokeColor === c.id ? '2px solid #f43f5e' : '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer', boxShadow: strokeColor === c.id ? '0 0 6px #f43f5e' : 'none',
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <input
              type="range" min="0" max="24" value={strokeWidth}
              onChange={e => { setStrokeWidth(Number(e.target.value)); if (onDirty) onDirty(); }}
              style={{ width: '100%' }}
            />
          </div>

          {/* Тень и Свечение */}
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: '8px', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f3f4f6' }}>
                🌑 Тень букв (Дистанция: {shadowDistance}px):
              </span>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                {SHADOW_COLORS.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => { setShadowColor(c.id); if (onDirty) onDirty(); }}
                    style={{
                      width: '18px', height: '18px', borderRadius: '50%', background: c.hex,
                      border: shadowColor === c.id ? '2px solid #f43f5e' : '1px solid rgba(255,255,255,0.2)',
                      cursor: 'pointer', boxShadow: shadowColor === c.id ? '0 0 6px #f43f5e' : 'none',
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <input
              type="range" min="0" max="20" value={shadowDistance}
              onChange={e => { setShadowDistance(Number(e.target.value)); if (onDirty) onDirty(); }}
              style={{ width: '100%' }}
            />
          </div>
        </>
      )}
    </div>
  )
}
