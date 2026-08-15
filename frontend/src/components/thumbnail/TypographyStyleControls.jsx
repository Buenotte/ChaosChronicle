export const COLORS = [
  { id: 'yellow', hex: '#FFE600', label: 'Желтый' },
  { id: 'white', hex: '#FFFFFF', label: 'Белый' },
  { id: 'red', hex: '#FF2A2A', label: 'Красный' },
  { id: 'cyan', hex: '#00F0FF', label: 'Голубой' },
  { id: 'orange', hex: '#FF8C00', label: 'Оранжевый' },
  { id: 'green', hex: '#00FF66', label: 'Зеленый' },
]

export const STROKE_COLORS = [
  { id: 'black', hex: '#000000', label: 'Черный' },
  { id: 'darkred', hex: '#5b0606', label: 'Темно-красный' },
  { id: 'darkblue', hex: '#0a1931', label: 'Темно-синий' },
  { id: 'white', hex: '#ffffff', label: 'Белый' },
]

export default function TypographyStyleControls({
  fontSize,
  setFontSize,
  customSizeNum,
  setCustomSizeNum,
  lineSpacing = 1.15,
  setLineSpacing,
  previewLines = [],
  lineColors = null,
  setLineColors = null,
  isItalic,
  setIsItalic,
  tiltAngle,
  setTiltAngle,
  fontColor,
  setFontColor,
  borderColor,
  setBorderColor,
  borderWidth,
  setBorderWidth,
  shadowDistance,
  setShadowDistance,
  position,
  setPosition,
  hasBox,
  setHasBox,
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
      {/* КОЛОНКА 1: РАЗМЕР, ИНТЕРВАЛ, КУРСИВ, НАКЛОН И ПОЗИЦИЯ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {/* Размер шрифта (до 160px) */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem', fontWeight: 600 }}>
            📏 Размер шрифта: {fontSize === 'auto' ? 'Авто (Адаптивный)' : `${customSizeNum}px`}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setFontSize('auto')}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                background: fontSize === 'auto' ? '#3b82f6' : '#27272a',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              Авто
            </button>
            <input
              type="range"
              min="45"
              max="160"
              value={customSizeNum}
              onChange={e => {
                setCustomSizeNum(Number(e.target.value))
                setFontSize(e.target.value)
              }}
              style={{ flex: 1, accentColor: '#3b82f6', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#fff', minWidth: '45px', textAlign: 'right', fontWeight: 700 }}>
              {fontSize === 'auto' ? 'Auto' : `${customSizeNum}px`}
            </span>
          </div>
        </div>

        {/* ↕️ Межстрочный интервал (Line Height / Abstand zwischen Zeilen) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
              ↕️ Межстрочный интервал: {Number(lineSpacing).toFixed(2)}x
            </label>
            {setLineSpacing && Number(lineSpacing) !== 1.15 && (
              <button
                type="button"
                onClick={() => setLineSpacing(1.15)}
                style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Сброс (1.15x)
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', color: '#71717a' }}>0.7x</span>
            <input
              type="range"
              min="0.70"
              max="1.70"
              step="0.05"
              value={lineSpacing}
              onChange={e => setLineSpacing && setLineSpacing(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#38bdf8', minWidth: '45px', textAlign: 'right', fontWeight: 700 }}>
              {Number(lineSpacing).toFixed(2)}x
            </span>
          </div>
        </div>

        {/* ✍️ КУРСИВ И 📐 НАКЛОН / ДИНАМИКА (BEUGEN) */}
        <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.85rem', color: '#f4f4f5', fontWeight: 700 }}>
              ✍️ Начертание:
            </label>
            <button
              type="button"
              onClick={() => setIsItalic(!isItalic)}
              style={{
                padding: '0.35rem 0.85rem',
                borderRadius: '6px',
                background: isItalic ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : '#27272a',
                color: '#fff',
                border: isItalic ? '1px solid #f472b6' : '1px solid #3f3f46',
                cursor: 'pointer',
                fontSize: '0.85rem',
                fontWeight: 700,
                fontStyle: 'italic',
              }}
            >
              {isItalic ? '✓ Курсив (Italic) ВКЛ' : 'Курсив (Italic)'}
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
              <label style={{ fontSize: '0.82rem', color: '#d4d4d8', fontWeight: 600 }}>
                📐 Угол наклона / динамика: {tiltAngle}°
              </label>
              {tiltAngle !== 0 && (
                <button
                  type="button"
                  onClick={() => setTiltAngle(0)}
                  style={{ background: 'none', border: 'none', color: '#ec4899', fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Сброс (0°)
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#71717a' }}>-15°</span>
              <input
                type="range"
                min="-15"
                max="15"
                step="1"
                value={tiltAngle}
                onChange={e => setTiltAngle(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#ec4899', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.72rem', color: '#71717a' }}>+15°</span>
            </div>
          </div>
        </div>

        {/* Позиция заголовка */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#9ca3af', marginBottom: '0.4rem', fontWeight: 600 }}>
            📍 Расположение по вертикали:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
            {[
              { id: 'top', label: '⬆️ Вверху' },
              { id: 'center', label: '🎯 По центру' },
              { id: 'bottom', label: '⬇️ Внизу' },
            ].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPosition(p.id)}
                style={{
                  padding: '0.45rem',
                  borderRadius: '6px',
                  background: position === p.id ? '#3b82f6' : '#18181b',
                  border: position === p.id ? '1px solid #60a5fa' : '1px solid #27272a',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* КОЛОНКА 2: ЦВЕТА, КОНТУР И ТЕНЬ */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Цвет текста (общий и построчный) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
                🎨 Основной цвет:
              </label>
              {lineColors && setLineColors && (
                <button
                  type="button"
                  onClick={() => setLineColors(null)}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
                >
                  Сбросить цвет всех строк
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.35rem' }}>
              {COLORS.map(c => {
                const isSelected = (!lineColors || lineColors.length === 0) && fontColor === c.id
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setFontColor(c.id)
                      if (setLineColors) setLineColors(null)
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.35rem 0.5rem',
                      borderRadius: '6px',
                      background: isSelected ? 'rgba(255,255,255,0.12)' : '#18181b',
                      border: isSelected ? `2px solid ${c.hex}` : '1px solid #27272a',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.78rem',
                    }}
                  >
                    <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: c.hex, display: 'inline-block', border: '1px solid #000' }} />
                    <span style={{ fontWeight: isSelected ? 700 : 400 }}>{c.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 🌈 Построчные цвета (если строк больше 1) */}
          {previewLines && previewLines.length > 1 && setLineColors && (
            <div style={{ background: '#18181b', padding: '0.65rem', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#f472b6', fontWeight: 700 }}>
                🌈 Цвет для каждой отдельной строки:
              </label>
              {previewLines.map((lineText, idx) => {
                const currentLineColor = (lineColors && lineColors[idx]) ? lineColors[idx] : fontColor
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', background: '#09090b', padding: '0.35rem 0.5rem', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.78rem', color: '#e4e4e7', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '110px' }} title={lineText}>
                      {idx + 1}. {lineText}
                    </span>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {COLORS.map(c => {
                        const isCur = currentLineColor === c.id
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
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              background: c.hex,
                              border: isCur ? '2px solid #ffffff' : '1px solid #000',
                              cursor: 'pointer',
                              transform: isCur ? 'scale(1.25)' : 'scale(1)',
                              boxShadow: isCur ? '0 0 6px rgba(255,255,255,0.8)' : 'none',
                              padding: 0,
                            }}
                          />
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 🔲 КОНТУР / ОБВОДКА (STROKE) */}
        <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#f4f4f5', marginBottom: '0.4rem', fontWeight: 700 }}>
            🔲 Контур (Обводка букв): {borderWidth}px
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
            <input
              type="range"
              min="0"
              max="18"
              value={borderWidth}
              onChange={e => setBorderWidth(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#10b981', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#fff', minWidth: '35px', textAlign: 'right', fontWeight: 700 }}>
              {borderWidth}px
            </span>
          </div>
          <div style={{ display: 'flex', gap: '0.35rem' }}>
            {STROKE_COLORS.map(sc => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setBorderColor(sc.id)}
                style={{
                  flex: 1,
                  padding: '0.3rem',
                  borderRadius: '4px',
                  fontSize: '0.72rem',
                  background: borderColor === sc.id ? '#27272a' : '#09090b',
                  border: borderColor === sc.id ? '2px solid #10b981' : '1px solid #27272a',
                  color: '#fff',
                  cursor: 'pointer',
                }}
              >
                {sc.label}
              </button>
            ))}
          </div>
        </div>

        {/* 👥 ТЕНЬ (SHADOW) */}
        <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#f4f4f5', marginBottom: '0.4rem', fontWeight: 700 }}>
            👥 Тень текста: {shadowDistance}px
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              type="range"
              min="0"
              max="14"
              value={shadowDistance}
              onChange={e => setShadowDistance(Number(e.target.value))}
              style={{ flex: 1, accentColor: '#ec4899', cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.85rem', color: '#fff', minWidth: '35px', textAlign: 'right', fontWeight: 700 }}>
              {shadowDistance}px
            </span>
          </div>
        </div>

        {/* Полупрозрачная подложка */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.85rem', color: '#d4d4d8' }}>
          <input
            type="checkbox"
            checked={hasBox}
            onChange={e => setHasBox(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: '#3b82f6' }}
          />
          ⬛ Темная контрастная плашка под текстом
        </label>
      </div>
    </div>
  )
}
