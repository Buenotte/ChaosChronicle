import { COLORS } from './TypographyStyleControls'

const COLOR_MAP = Object.fromEntries(COLORS.map(c => [c.id, c.hex]))

export default function LiveThumbnailPreview({
  previewSrc,
  position,
  fontFamilyName,
  calcLiveFontSize,
  lineSpacing = 1.15,
  lineColors = null,
  lineFontSizes = null,
  activeColorHex,
  borderWidth,
  activeStrokeHex,
  shadowDistance,
  hasBox,
  boxStyle = 'none',
  boxOpacity = 75,
  isItalic,
  tiltAngle,
  previewLines,
}) {
  const angle = Number(tiltAngle) || 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
        <label style={{ fontSize: '0.85rem', color: '#ec4899', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          👁️ ЖИВОЙ ПРЕДПРОСМОТР ОБЛОЖКИ (16:9):
        </label>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
          {isItalic ? '✍️ Курсив ' : ''}{angle !== 0 ? `📐 Угол: ${angle}° ` : ''}• Обновляется мгновенно
        </span>
      </div>

      <div
        style={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          maxHeight: '360px',
          borderRadius: '10px',
          overflow: 'hidden',
          background: '#09090b',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          border: '2px solid #3f3f46',
          display: 'flex',
          alignItems: position === 'top' ? 'flex-start' : position === 'bottom' ? 'flex-end' : 'center',
          justifyContent: 'center',
          padding: position === 'top' ? '20px 16px' : position === 'bottom' ? '20px 16px' : '0 16px',
        }}
      >
        {/* Фоновое чистое изображение */}
        <img
          src={previewSrc}
          alt="Thumbnail Preview"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            filter: 'brightness(0.85)',
          }}
          onError={(e) => {
            if (e.target.src.includes('raw_background.jpg')) {
              e.target.src = previewSrc.replace('raw_background.jpg', 'thumbnail.jpg');
            }
          }}
        />

        {/* Накладываемый живой текст с точной имитацией FFmpeg (наклон, курсив, обводка, тень) */}
        {(() => {
          const alpha = ((Number(boxOpacity) >= 10 ? Number(boxOpacity) : 75) / 100).toFixed(2)
          return (
            <div
              style={{
                position: 'relative',
                zIndex: 2,
                textAlign: 'center',
                fontFamily: fontFamilyName,
                fontStyle: isItalic ? 'italic' : 'normal',
                fontSize: calcLiveFontSize(),
                fontWeight: 900,
                lineHeight: Number(lineSpacing) || 1.15,
                color: activeColorHex,
                letterSpacing: '0.5px',
                transform: `rotate(${angle}deg) ${isItalic && !fontFamilyName.includes('Georgia') ? 'skewX(-8deg)' : ''}`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease',
                WebkitTextStroke: `${Math.round(borderWidth * 0.45)}px ${activeStrokeHex}`,
                textShadow: `${Math.round(shadowDistance * 0.45)}px ${Math.round(shadowDistance * 0.45)}px ${Math.round(shadowDistance * 0.45)}px rgba(0,0,0,0.92)`,
                background: (boxStyle === 'dark_solid' ? `rgba(0,0,0,${alpha})` : (boxStyle === 'dark_soft' || (hasBox && boxStyle === 'none') ? `rgba(0,0,0,${alpha})` : (boxStyle === 'red_accent' ? `rgba(220,38,38,${alpha})` : (boxStyle === 'yellow_highlight' ? `rgba(245,158,11,${alpha})` : (boxStyle === 'blue_cyber' ? `rgba(15,23,42,${alpha})` : (boxStyle === 'purple_glass' ? `rgba(59,7,100,${alpha})` : 'transparent')))))),
                border: boxStyle === 'blue_cyber' ? '2px solid #0284c7' : (boxStyle === 'purple_glass' ? '1px solid #c084fc' : (boxStyle === 'dark_solid' ? '1px solid #27272a' : 'none')),
                padding: (boxStyle !== 'none' && boxStyle !== 'per_line') || hasBox ? '8px 18px' : '0',
                borderRadius: (boxStyle !== 'none' && boxStyle !== 'per_line') || hasBox ? '8px' : '0',
                userSelect: 'none',
                pointerEvents: 'none',
                maxWidth: '92%',
              }}
            >
              {previewLines.map((line, idx) => {
                const lineCol = (lineColors && lineColors[idx]) ? lineColors[idx] : null
                const lineHex = lineCol ? (COLOR_MAP[lineCol] || (lineCol.startsWith('#') ? lineCol : activeColorHex)) : activeColorHex
                const lineSize = (lineFontSizes && lineFontSizes[idx] && Number(lineFontSizes[idx]) > 0)
                  ? calcLiveFontSize(lineFontSizes[idx])
                  : calcLiveFontSize()
                return (
                  <div
                    key={idx}
                    style={{
                      whiteSpace: 'nowrap',
                      color: lineHex,
                      fontSize: lineSize,
                      background: boxStyle === 'per_line' ? `rgba(0,0,0,${alpha})` : 'transparent',
                      padding: boxStyle === 'per_line' ? '3px 14px' : '0',
                      borderRadius: boxStyle === 'per_line' ? '6px' : '0',
                      margin: boxStyle === 'per_line' ? '3px 0' : '0',
                      display: boxStyle === 'per_line' ? 'inline-block' : 'block',
                    }}
                  >
                    {line}
                  </div>
                )
              })}
            </div>
          )
        })()}
      </div>
    </div>
  )
}
