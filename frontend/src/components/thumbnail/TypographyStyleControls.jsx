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
  { id: 'darkred', hex: '#5B0606', label: 'Темно-красный' },
  { id: 'darkblue', hex: '#0A1931', label: 'Темно-синий' },
  { id: 'white', hex: '#FFFFFF', label: 'Белый' },
]

export const BOX_STYLES = [
  { id: 'none', label: '🚫 Без плашки', bg: '#18181b', border: '#3f3f46' },
  { id: 'dark_soft', label: '⬛ Темная (75%)', bg: 'rgba(0,0,0,0.75)', border: '#52525b' },
  { id: 'dark_solid', label: '⬛ Черная (100%)', bg: '#000000', border: '#e4e4e7' },
  { id: 'red_accent', label: '🔴 Красная (Breaking)', bg: '#dc2626', border: '#f87171' },
  { id: 'yellow_highlight', label: '🟡 Золотой маркер', bg: '#f59e0b', border: '#fde047' },
  { id: 'blue_cyber', label: '🔵 Синий индиго', bg: '#0f172a', border: '#38bdf8' },
  { id: 'purple_glass', label: '🟣 Фиолетовый', bg: '#3b0764', border: '#c084fc' },
  { id: 'per_line', label: '📑 Построчные', bg: '#18181b', border: '#10b981' },
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
  boxStyle = 'none',
  setBoxStyle,
  boxOpacity = 75,
  setBoxOpacity,
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
              style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', background: fontSize === 'auto' ? '#3b82f6' : '#27272a', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
            >
              Авто
            </button>
            <input
              type="range"
              min="45"
              max="160"
              value={customSizeNum}
              onChange={e => { setCustomSizeNum(Number(e.target.value)); setFontSize(e.target.value); }}
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
        <div style={{ background: '#18181b', padding: '0.65rem', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.82rem', color: '#f4f4f5', fontWeight: 700 }}>✍️ Начертание:</label>
            <button
              type="button"
              onClick={() => setIsItalic(!isItalic)}
              style={{ padding: '0.3rem 0.75rem', borderRadius: '6px', background: isItalic ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : '#27272a', color: '#fff', border: isItalic ? '1px solid #f472b6' : '1px solid #3f3f46', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, fontStyle: 'italic' }}
            >
              {isItalic ? '✓ Курсив ВКЛ' : 'Курсив (Italic)'}
            </button>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
              <label style={{ fontSize: '0.8rem', color: '#d4d4d8', fontWeight: 600 }}>📐 Угол наклона: {tiltAngle}°</label>
              {tiltAngle !== 0 && (
                <button type="button" onClick={() => setTiltAngle(0)} style={{ background: 'none', border: 'none', color: '#ec4899', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}>Сброс (0°)</button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: '#71717a' }}>-15°</span>
              <input type="range" min="-15" max="15" step="1" value={tiltAngle} onChange={e => setTiltAngle(Number(e.target.value))} style={{ flex: 1, accentColor: '#ec4899', cursor: 'pointer' }} />
              <span style={{ fontSize: '0.7rem', color: '#71717a' }}>+15°</span>
            </div>
          </div>
        </div>

        {/* Позиция заголовка */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', color: '#9ca3af', marginBottom: '0.35rem', fontWeight: 600 }}>📍 Расположение по вертикали:</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
            {[{ id: 'top', label: '⬆️ Вверху' }, { id: 'center', label: '🎯 По центру' }, { id: 'bottom', label: '⬇️ Внизу' }].map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPosition(p.id)}
                style={{ padding: '0.4rem', borderRadius: '6px', background: position === p.id ? '#3b82f6' : '#18181b', border: position === p.id ? '1px solid #60a5fa' : '1px solid #27272a', color: '#fff', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              {COLORS.map(c => {
                const isSelected = (!lineColors || lineColors.length === 0) && (fontColor === c.id || fontColor === c.hex)
                return (
                  <button
                    key={c.id}
                    type="button"
                    title={c.label}
                    onClick={() => { setFontColor(c.id); if (setLineColors) setLineColors(null); }}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: c.hex,
                      border: isSelected ? '3px solid #ffffff' : '2px solid rgba(0,0,0,0.5)',
                      boxShadow: isSelected ? `0 0 12px ${c.hex}` : 'none',
                      transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      padding: 0,
                    }}
                  />
                )
              })}
              {/* Свой цвет */}
              <div title="Выбрать свой цвет" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', background: '#18181b', padding: '0.2rem 0.5rem', borderRadius: '20px', border: '1px solid #3f3f46' }}>
                <input
                  type="color"
                  value={fontColor?.startsWith('#') ? fontColor : (COLORS.find(c => c.id === fontColor)?.hex || '#FFE600')}
                  onChange={e => { setFontColor(e.target.value); if (setLineColors) setLineColors(null); }}
                  style={{ width: '24px', height: '24px', padding: 0, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa', fontWeight: 600 }}>Свой</span>
              </div>
            </div>
          </div>

          {/* 🌈 Построчные цвета (если строк больше 1) */}
          {previewLines && previewLines.length > 1 && setLineColors && (
            <div style={{ background: '#18181b', padding: '0.6rem', borderRadius: '8px', border: '1px solid #27272a', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.78rem', color: '#f472b6', fontWeight: 700 }}>🌈 Цвет для каждой отдельной строки:</label>
              {previewLines.map((lineText, idx) => {
                const curLineVal = (lineColors && lineColors[idx]) ? lineColors[idx] : fontColor
                const curHex = curLineVal?.startsWith('#') ? curLineVal : (COLORS.find(c => c.id === curLineVal)?.hex || '#FFE600')
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.4rem', background: '#09090b', padding: '0.3rem 0.5rem', borderRadius: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#e4e4e7', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90px' }} title={lineText}>
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
                            style={{ width: '16px', height: '16px', borderRadius: '50%', background: c.hex, border: isCur ? '2px solid #fff' : '1px solid #000', cursor: 'pointer', transform: isCur ? 'scale(1.2)' : 'scale(1)', padding: 0 }}
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
                        title="Свой цвет для строки"
                        style={{ width: '18px', height: '18px', padding: 0, border: 'none', borderRadius: '4px', cursor: 'pointer', background: 'transparent' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 🔲 КОНТУР / ОБВОДКА (STROKE) */}
        <div style={{ background: '#18181b', padding: '0.65rem', borderRadius: '8px', border: '1px solid #27272a' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: '#f4f4f5', marginBottom: '0.3rem', fontWeight: 700 }}>
            🔲 Контур (Обводка букв): {borderWidth}px
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.4rem' }}>
            <input type="range" min="0" max="18" value={borderWidth} onChange={e => setBorderWidth(Number(e.target.value))} style={{ flex: 1, accentColor: '#10b981', cursor: 'pointer' }} />
            <span style={{ fontSize: '0.85rem', color: '#fff', minWidth: '35px', textAlign: 'right', fontWeight: 700 }}>{borderWidth}px</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
            {STROKE_COLORS.map(sc => {
              const isSel = borderColor === sc.id || borderColor === sc.hex
              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setBorderColor(sc.id)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem', padding: '0.3rem', borderRadius: '4px', fontSize: '0.72rem', background: isSel ? '#27272a' : '#09090b', border: isSel ? `2px solid ${sc.hex === '#000000' ? '#10b981' : sc.hex}` : '1px solid #27272a', color: '#fff', cursor: 'pointer' }}
                >
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: sc.hex, border: '1px solid rgba(255,255,255,0.4)' }} />
                  <span>{sc.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 👥 ТЕНЬ (SHADOW) */}
        <div style={{ background: '#18181b', padding: '0.65rem', borderRadius: '8px', border: '1px solid #27272a' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: '#f4f4f5', marginBottom: '0.3rem', fontWeight: 700 }}>👥 Тень текста: {shadowDistance}px</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input type="range" min="0" max="14" value={shadowDistance} onChange={e => setShadowDistance(Number(e.target.value))} style={{ flex: 1, accentColor: '#ec4899', cursor: 'pointer' }} />
            <span style={{ fontSize: '0.85rem', color: '#fff', minWidth: '35px', textAlign: 'right', fontWeight: 700 }}>{shadowDistance}px</span>
          </div>
        </div>

        {/* ⬛ КОНТРАСТНАЯ ПЛАШКА ПОД ТЕКСТОМ (BOX STYLES) */}
        <div style={{ background: '#18181b', padding: '0.75rem', borderRadius: '8px', border: '1px solid #27272a' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', color: '#f4f4f5', fontWeight: 700 }}>
              ⬛ Контрастная плашка под текстом:
            </label>
            {boxStyle !== 'none' && setBoxStyle && (
              <button
                type="button"
                onClick={() => { setBoxStyle('none'); if (setHasBox) setHasBox(false); }}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.72rem', cursor: 'pointer', textDecoration: 'underline' }}
              >
                Убрать плашку
              </button>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
            {BOX_STYLES.map(bs => {
              const isCur = (boxStyle === bs.id) || (!boxStyle && bs.id === 'none' && !hasBox) || (hasBox && bs.id === 'dark_soft' && !boxStyle)
              return (
                <button
                  key={bs.id}
                  type="button"
                  onClick={() => {
                    if (setBoxStyle) setBoxStyle(bs.id);
                    if (setHasBox) setHasBox(bs.id !== 'none');
                  }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '0.35rem 0.2rem', borderRadius: '6px', fontSize: '0.68rem',
                    fontWeight: isCur ? 700 : 400,
                    background: isCur ? '#27272a' : '#09090b',
                    border: isCur ? `2px solid ${bs.border || '#3b82f6'}` : '1px solid #27272a',
                    color: isCur ? '#fff' : '#a1a1aa',
                    cursor: 'pointer',
                  }}
                >
                  {bs.label}
                </button>
              )
            })}
          </div>

          {/* Ползунок прозрачности плашки */}
          {boxStyle !== 'none' && setBoxOpacity && (
            <div style={{ marginTop: '0.6rem', paddingTop: '0.5rem', borderTop: '1px solid #27272a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label style={{ fontSize: '0.78rem', color: '#a1a1aa', fontWeight: 600 }}>
                  Прозрачность / Непрозрачность:
                </label>
                <span style={{ fontSize: '0.8rem', color: '#38bdf8', fontWeight: 700 }}>
                  {boxOpacity}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>10%</span>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={boxOpacity}
                  onChange={e => setBoxOpacity(Number(e.target.value))}
                  style={{ flex: 1, accentColor: '#38bdf8', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.7rem', color: '#71717a' }}>100%</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
