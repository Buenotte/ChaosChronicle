export default function LiveThumbnailPreview({
  previewSrc,
  position,
  fontFamilyName,
  calcLiveFontSize,
  activeColorHex,
  borderWidth,
  activeStrokeHex,
  shadowDistance,
  hasBox,
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
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            fontFamily: fontFamilyName,
            fontStyle: isItalic ? 'italic' : 'normal',
            fontSize: calcLiveFontSize(),
            fontWeight: 900,
            lineHeight: 1.16,
            color: activeColorHex,
            letterSpacing: '0.5px',
            transform: `rotate(${angle}deg) ${isItalic && !fontFamilyName.includes('Georgia') ? 'skewX(-8deg)' : ''}`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease',
            WebkitTextStroke: `${Math.round(borderWidth * 0.45)}px ${activeStrokeHex}`,
            textShadow: `${Math.round(shadowDistance * 0.45)}px ${Math.round(shadowDistance * 0.45)}px ${Math.round(shadowDistance * 0.45)}px rgba(0,0,0,0.92)`,
            background: hasBox ? 'rgba(0, 0, 0, 0.72)' : 'transparent',
            padding: hasBox ? '8px 18px' : '0',
            borderRadius: hasBox ? '8px' : '0',
            userSelect: 'none',
            pointerEvents: 'none',
            maxWidth: '92%',
          }}
        >
          {previewLines.map((line, idx) => (
            <div key={idx} style={{ whiteSpace: 'nowrap' }}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
