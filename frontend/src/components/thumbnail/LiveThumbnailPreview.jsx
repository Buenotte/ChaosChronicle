import { useState, useRef } from 'react'
import { COLORS } from './TypographyStyleControls'

const COLOR_MAP = Object.fromEntries(COLORS.map(c => [c.id, c.hex]))

export default function LiveThumbnailPreview({
  previewSrc,
  position,
  offsetY = 50,
  offsetX = 50,
  textAlign = 'center',
  onOffsetYChange,
  onOffsetXChange,
  fontFamilyName,
  calcLiveFontSize,
  lineSpacing = 1.15,
  wordSpacing = 0,
  lineColors = null,
  lineFontSizes = null,
  wordColors = null,
  wordFontSizes = null,
  activeColorHex,
  borderWidth,
  activeStrokeHex,
  shadowDistance,
  hasBox,
  boxStyle = 'none',
  boxOpacity = 75,
  lineBadges = null,
  isItalic,
  tiltAngle,
  previewLines,
  previewMode = 'css',
  setPreviewMode,
  realThumbnailUrl = null,
  onTriggerRealRender = null,
  renderingPreview = false,
}) {
  const angle = Number(tiltAngle) || 0
  const yPct = (offsetY !== undefined && offsetY !== null && !isNaN(Number(offsetY)))
    ? Math.max(5, Math.min(95, Number(offsetY)))
    : (position === 'top' ? 12 : position === 'bottom' ? 85 : 50)
  const xPct = (offsetX !== undefined && offsetX !== null && !isNaN(Number(offsetX)))
    ? Math.max(5, Math.min(95, Number(offsetX)))
    : 50

  const previewRef = useRef(null)
  const [isDraggingTitle, setIsDraggingTitle] = useState(false)

  const updatePosFromEvent = (e) => {
    if (!previewRef.current) return
    const rect = previewRef.current.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const newX = Math.round(Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100)))
    const newY = Math.round(Math.max(5, Math.min(95, ((clientY - rect.top) / rect.height) * 100)))
    if (onOffsetXChange) onOffsetXChange(newX)
    if (onOffsetYChange) onOffsetYChange(newY)
  }

  const handlePointerDown = (e) => {
    if (previewMode === 'real') return
    setIsDraggingTitle(true)
    updatePosFromEvent(e)
    const handleMove = (ev) => {
      ev.preventDefault()
      updatePosFromEvent(ev)
    }
    const handleUp = () => {
      setIsDraggingTitle(false)
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseup', handleUp)
      window.removeEventListener('touchmove', handleMove)
      window.removeEventListener('touchend', handleUp)
    }
    window.addEventListener('mousemove', handleMove)
    window.addEventListener('mouseup', handleUp)
    window.addEventListener('touchmove', handleMove, { passive: false })
    window.addEventListener('touchend', handleUp)
  }

  let runningWordIndex = 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem', flexWrap: 'wrap', gap: '0.4rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.85rem', color: '#ec4899', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            👁️ ПРЕДПРОСМОТР (16:9):
          </label>
          <div style={{ display: 'flex', background: '#18181b', borderRadius: '6px', padding: '2px', border: '1px solid #334155' }}>
            <button
              type="button"
              onClick={() => setPreviewMode && setPreviewMode('css')}
              style={{
                background: previewMode === 'css' ? '#ec4899' : 'transparent',
                color: previewMode === 'css' ? '#fff' : '#94a3b8',
                border: 'none', borderRadius: '4px', padding: '0.2rem 0.55rem',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              👁️ Живой CSS
            </button>
            <button
              type="button"
              onClick={() => {
                if (setPreviewMode) setPreviewMode('real');
                if (onTriggerRealRender) onTriggerRealRender();
              }}
              style={{
                background: previewMode === 'real' ? '#3b82f6' : 'transparent',
                color: previewMode === 'real' ? '#fff' : '#94a3b8',
                border: 'none', borderRadius: '4px', padding: '0.2rem 0.55rem',
                fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer'
              }}
            >
              ⚡ FFmpeg рендер
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          {onTriggerRealRender && (
            <button
              type="button"
              disabled={renderingPreview}
              onClick={onTriggerRealRender}
              className="copy-btn"
              style={{ background: '#3b82f6', fontSize: '0.72rem', padding: '0.2rem 0.6rem', fontWeight: 700 }}
              title="Мгновенно выполнить реальный рендер через FFmpeg (0.05 сек)"
            >
              {renderingPreview ? '⏳ Рендер...' : '⚡ Обновить FFmpeg'}
            </button>
          )}
          <span style={{ fontSize: '0.74rem', color: '#9ca3af' }}>
            {isItalic ? '✍️ Курсив ' : ''}{angle !== 0 ? `📐 ${angle}° ` : ''}• 📍 {xPct}%, {yPct}%
          </span>
        </div>
      </div>

      <div style={{ maxWidth: '640px', margin: '0 auto', width: '100%' }}>
        <div
          ref={previewRef}
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16/9',
            borderRadius: '10px',
            overflow: 'hidden',
            background: '#09090b',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            border: isDraggingTitle ? '2px solid #ec4899' : '2px solid #3f3f46',
            containerType: 'inline-size',
            cursor: previewMode === 'css' ? (isDraggingTitle ? 'grabbing' : 'grab') : 'default',
          }}
          title={previewMode === 'css' ? '🖐️ Зажмите левой кнопкой мыши и перемещайте текст в любое место кадра (2D)' : ''}
        >
        {previewMode === 'real' && realThumbnailUrl ? (
          <img
            src={realThumbnailUrl}
            alt="Real Rendered Thumbnail"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        ) : (
          <>
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
                userSelect: 'none',
                pointerEvents: 'none',
              }}
              onError={(e) => {
                if (e.target.src.includes('raw_background.jpg')) {
                  e.target.src = previewSrc.replace('raw_background.jpg', 'thumbnail.jpg');
                }
              }}
            />

        {/* Накладываемый живой текст с точной имитацией FFmpeg (позиция X/Y, наклон, курсив, обводка, тень) */}
        {(() => {
          const alpha = ((Number(boxOpacity) >= 10 ? Number(boxOpacity) : 75) / 100).toFixed(2)
          runningWordIndex = 0
          const bCfg = lineBadges || {}
          const isPerLine = boxStyle === 'per_line' || !!bCfg.enabled

          const getLineBadgeStyle = (idx) => {
            if (!isPerLine) return { outerStyle: {}, innerStyle: {} }
            const sType = bCfg.style || 'solid', shType = bCfg.shadow || 'soft'
            const op = ((Number(bCfg.opacity !== undefined ? bCfg.opacity : boxOpacity || 90)) / 100).toFixed(2)
            let rawCol = bCfg.color || '#000000'
            if (bCfg.perLineColorsEnabled && Array.isArray(bCfg.lineColors) && bCfg.lineColors[idx]) {
              rawCol = bCfg.lineColors[idx]
            }
            const hex = COLOR_MAP[rawCol] || (rawCol.startsWith('#') ? rawCol : '#000000')
            const r = parseInt(hex.slice(1, 3) || '0', 16) || 0, g = parseInt(hex.slice(3, 5) || '0', 16) || 0, b = parseInt(hex.slice(5, 7) || '0', 16) || 0
            const bg = `rgba(${r}, ${g}, ${b}, ${op})`

            let lineAngle = 0
            if (bCfg.tiltMode === 'zigzag') {
              const zAngles = [-2.0, 1.8, -1.6, 2.0]
              lineAngle = zAngles[idx % zAngles.length]
            } else if (bCfg.tiltMode === 'custom' && Array.isArray(bCfg.lineTilts) && bCfg.lineTilts[idx] !== undefined) {
              lineAngle = Number(bCfg.lineTilts[idx]) || 0
            }

            let bShadowFilter = 'none'
            if (shType === 'soft') bShadowFilter = 'drop-shadow(0 6px 14px rgba(0,0,0,0.85))'
            else if (shType === 'hard') bShadowFilter = 'drop-shadow(5px 5px 0px rgba(0,0,0,0.95))'
            else if (shType === 'glow') bShadowFilter = 'drop-shadow(0 0 14px rgba(245,158,11,0.85))'

            const outerStyle = {
              display: 'block', width: 'max-content', margin: '3px 0',
              transform: lineAngle !== 0 ? `rotate(${lineAngle}deg)` : undefined,
              transformOrigin: 'center center',
              filter: bShadowFilter !== 'none' ? bShadowFilter : undefined,
            }
            const innerStyle = {
              background: bg, padding: '4px 18px', display: 'inline-block',
              width: 'max-content', transition: 'all 0.15s ease',
            }

            if (sType === 'solid') innerStyle.borderRadius = '6px'
            else if (sType === 'slanted') { innerStyle.clipPath = 'polygon(18px 0%, 100% 0%, calc(100% - 18px) 100%, 0% 100%)'; innerStyle.padding = '4px 24px'; }
            else if (sType === 'dashed') { innerStyle.borderRadius = '6px'; innerStyle.border = '2.5px dashed rgba(255,255,255,0.75)'; }
            else if (sType === 'tape') { innerStyle.borderRadius = '2px'; innerStyle.padding = '4px 22px'; innerStyle.borderLeft = '4px solid rgba(255,255,255,0.4)'; innerStyle.borderRight = '4px solid rgba(255,255,255,0.4)'; }
            else if (sType === 'torn') {
              innerStyle.padding = '6px 20px'
              innerStyle.clipPath = (idx % 2 === 0)
                ? 'polygon(0% 3px, 5% 0px, 12% 4px, 20% 1px, 28% 4px, 38% 0px, 50% 3px, 62% 1px, 72% 4px, 85% 0px, 95% 3px, 100% 1px, 99% 100%, 92% calc(100% - 3px), 80% 100%, 68% calc(100% - 4px), 52% 100%, 36% calc(100% - 3px), 22% 100%, 10% calc(100% - 4px), 0% 100%)'
                : 'polygon(0% 1px, 8% 4px, 18% 0px, 30% 3px, 44% 1px, 58% 4px, 70% 0px, 82% 3px, 92% 1px, 100% 4px, 99% calc(100% - 1px), 90% 100%, 78% calc(100% - 4px), 64% 100%, 48% calc(100% - 3px), 32% 100%, 16% calc(100% - 4px), 0% calc(100% - 2px))'
            }
            return { outerStyle, innerStyle }
          }

          return (
            <div
              style={{
                position: 'absolute',
                left: `${xPct}%`,
                top: `${yPct}%`,
                zIndex: 2,
                textAlign: textAlign || 'center',
                fontFamily: fontFamilyName,
                fontStyle: isItalic ? 'italic' : 'normal',
                fontSize: calcLiveFontSize(),
                fontWeight: 900,
                lineHeight: Number(lineSpacing) || 1.15,
                color: activeColorHex,
                letterSpacing: '0.5px',
                transform: `translate(-50%, -50%) rotate(${angle}deg) ${isItalic && !fontFamilyName.includes('Georgia') ? 'skewX(-8deg)' : ''}`,
                transformOrigin: 'center center',
                transition: isDraggingTitle ? 'none' : 'transform 0.15s ease, top 0.15s ease, left 0.15s ease',
                WebkitTextStroke: `${((borderWidth / 1280) * 100).toFixed(3)}cqw ${activeStrokeHex}`,
                textShadow: `${((shadowDistance / 1280) * 100).toFixed(3)}cqw ${((shadowDistance / 1280) * 100).toFixed(3)}cqw ${((shadowDistance / 1280) * 100).toFixed(3)}cqw rgba(0,0,0,0.92)`,
                background: isPerLine ? 'transparent' : (boxStyle === 'dark_solid' ? `rgba(0,0,0,${alpha})` : (boxStyle === 'dark_soft' || (hasBox && boxStyle === 'none') ? `rgba(0,0,0,${alpha})` : (boxStyle === 'red_accent' ? `rgba(220,38,38,${alpha})` : (boxStyle === 'yellow_highlight' ? `rgba(245,158,11,${alpha})` : (boxStyle === 'blue_cyber' ? `rgba(15,23,42,${alpha})` : (boxStyle === 'purple_glass' ? `rgba(59,7,100,${alpha})` : 'transparent')))))),
                border: isPerLine ? 'none' : (boxStyle === 'blue_cyber' ? '2px solid #0284c7' : (boxStyle === 'purple_glass' ? '1px solid #c084fc' : (boxStyle === 'dark_solid' ? '1px solid #27272a' : (isDraggingTitle ? '1px dashed #ec4899' : 'none')))),
                padding: !isPerLine && (boxStyle !== 'none' || hasBox) ? '8px 18px' : '0',
                borderRadius: !isPerLine && (boxStyle !== 'none' || hasBox) ? '8px' : '0',
                userSelect: 'none',
                pointerEvents: 'none',
                width: 'max-content',
                maxWidth: '96%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: textAlign === 'left' ? 'flex-start' : (textAlign === 'right' ? 'flex-end' : 'center'),
              }}
            >
              {previewLines.map((line, idx) => {
                const lineCol = (lineColors && lineColors[idx]) ? lineColors[idx] : null
                const lineHex = lineCol ? (COLOR_MAP[lineCol] || (lineCol.startsWith('#') ? lineCol : activeColorHex)) : activeColorHex
                const lineSize = (lineFontSizes && lineFontSizes[idx] && Number(lineFontSizes[idx]) > 0)
                  ? calcLiveFontSize(lineFontSizes[idx])
                  : calcLiveFontSize()

                const lineWords = line.split(/\s+/).filter(Boolean)
                const startIdx = runningWordIndex
                runningWordIndex += lineWords.length
                const { outerStyle, innerStyle } = getLineBadgeStyle(idx)

                return (
                  <div
                    key={idx}
                    style={{
                      whiteSpace: 'nowrap',
                      textAlign: textAlign || 'center',
                      color: lineHex,
                      fontSize: lineSize,
                      display: 'block',
                      width: 'max-content',
                      ...outerStyle,
                    }}
                  >
                    <div style={{ display: 'inline-block', width: 'max-content', ...innerStyle }}>
                      {lineWords.map((word, wIdx) => {
                        const curWordIdx = startIdx + wIdx
                        const wordCol = (wordColors && wordColors[curWordIdx]) ? wordColors[curWordIdx] : null
                        const wordHex = wordCol ? (COLOR_MAP[wordCol] || (wordCol.startsWith('#') ? wordCol : lineHex)) : lineHex
                        const wordSz = (wordFontSizes && wordFontSizes[curWordIdx] && Number(wordFontSizes[curWordIdx]) > 0)
                          ? calcLiveFontSize(wordFontSizes[curWordIdx])
                          : lineSize
                        return (
                          <span
                            key={wIdx}
                            style={{
                              color: wordHex,
                              fontSize: wordSz,
                              display: 'inline-block',
                              margin: `0 ${0.14 + (Math.max(0, Number(wordSpacing || 0)) * 0.025)}em`,
                            }}
                          >
                            {word}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}
          </>
        )}
        </div>
      </div>
    </div>
  )
}
