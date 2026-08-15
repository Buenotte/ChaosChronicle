import { useRef } from 'react'

export const BUILTIN_FONTS = [
  { id: 'arialbd', name: 'Arial Bold', family: 'Arial, sans-serif', desc: 'Стандартный жирный, универсальный' },
  { id: 'impact', name: 'Impact', family: 'Impact, "Arial Black", sans-serif', desc: 'Классический YouTube / вирусный стиль' },
  { id: 'segoeuib', name: 'Segoe UI Bold', family: '"Segoe UI", sans-serif', desc: 'Современный четкий премиум' },
  { id: 'tahomabd', name: 'Tahoma Bold', family: 'Tahoma, sans-serif', desc: 'Широкий массивный' },
  { id: 'trebucbd', name: 'Trebuchet Bold', family: '"Trebuchet MS", sans-serif', desc: 'Динамичный журнальный' },
  { id: 'verdanab', name: 'Verdana Bold', family: 'Verdana, sans-serif', desc: 'Максимальная читаемость' },
  { id: 'georgiab', name: 'Georgia Bold', family: 'Georgia, serif', desc: 'С засечками / редакционный' },
]

export default function FontPicker({
  font,
  customFonts,
  uploadingFont,
  onSelectFont,
  onFontFileUpload,
  onDeleteFont,
}) {
  const fileInputRef = useRef(null)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <label style={{ fontSize: '0.85rem', color: '#9ca3af', fontWeight: 600 }}>
          🔤 Шрифт:
        </label>
        <button
          type="button"
          className="copy-btn"
          disabled={uploadingFont}
          onClick={() => fileInputRef.current?.click()}
          style={{ background: '#3b82f6', fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          title="Загрузить шрифт .ttf или .otf с вашего компьютера"
        >
          {uploadingFont ? '⏳ Загрузка...' : '📂 Выбрать шрифт с диска (.ttf/.otf)'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept=".ttf,.otf,.woff,.woff2"
          style={{ display: 'none' }}
          onChange={onFontFileUpload}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '180px', overflowY: 'auto' }}>
        {/* Загруженные пользователем шрифты */}
        {customFonts.map(cf => {
          const isSelected = font === cf.id
          return (
            <div
              key={cf.id}
              onClick={() => onSelectFont(cf.id, `"${cf.name}", sans-serif`)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.45rem 0.65rem',
                background: isSelected ? 'rgba(59, 130, 246, 0.2)' : '#18181b',
                border: isSelected ? '2px solid #3b82f6' : '1px solid #27272a',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, overflow: 'hidden' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: `"${cf.name}", sans-serif`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  ⭐ {cf.name}
                </span>
                {isSelected && <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓</span>}
              </div>

              {onDeleteFont && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteFont(cf.id, cf.name)
                  }}
                  title={`Удалить шрифт "${cf.name}"`}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#ef4444',
                    cursor: 'pointer',
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    opacity: 0.75,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '0.75'}
                >
                  🗑️
                </button>
              )}
            </div>
          )
        })}

        {/* Встроенные стандартные шрифты */}
        {BUILTIN_FONTS.map(f => {
          const isSelected = font === f.id
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => onSelectFont(f.id, f.family)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.5rem 0.75rem',
                background: isSelected ? 'rgba(59, 130, 246, 0.2)' : '#18181b',
                border: isSelected ? '2px solid #3b82f6' : '1px solid #27272a',
                borderRadius: '6px',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', fontFamily: f.family }}>{f.name}</div>
                <div style={{ fontSize: '0.72rem', color: '#71717a' }}>{f.desc}</div>
              </div>
              {isSelected && <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}
