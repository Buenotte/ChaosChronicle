export default function ColorSwatchPicker({
  colors = [],
  selectedColor,
  onSelectColor,
  label = 'Цвет:',
  size = 28,
  shape = 'circle', // 'circle' or 'square'
  className = '',
  style = {},
}) {
  if (!colors || colors.length === 0) return null

  return (
    <div className={`color-swatch-picker ${className}`.trim()} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', ...style }}>
      {label && (
        <label style={{ fontSize: '0.8rem', color: '#9ca3af', fontWeight: 600 }}>
          {label}
        </label>
      )}
      <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {colors.map((c) => {
          const colorHex = c.hex || c.color || c.id || '#ffffff'
          const colorId = c.id || c.hex
          const isSelected = selectedColor === colorId || selectedColor === colorHex

          return (
            <button
              key={colorId}
              type="button"
              onClick={() => onSelectColor && onSelectColor(colorId)}
              title={c.name || colorHex}
              style={{
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: shape === 'circle' ? '50%' : '6px',
                background: colorHex,
                border: isSelected ? '3px solid #ffffff' : '2px solid rgba(0,0,0,0.5)',
                cursor: 'pointer',
                boxShadow: isSelected ? `0 0 10px ${colorHex}` : '0 1px 4px rgba(0,0,0,0.4)',
                transform: isSelected ? 'scale(1.18)' : 'scale(1)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                padding: 0,
                outline: 'none',
                flexShrink: 0,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}
