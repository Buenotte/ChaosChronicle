export const FFMPEG_SHORTS_COLOR_MAP = {
  yellow: '#FFE600', white: '#FFFFFF', red: '#FF2A2A', cyan: '#00F0FF',
  green: '#00FF66', orange: '#FF8C00', black: '#000000', blue: '#1D4ED8', purple: '#7C3AED',
};

export const toShortsHex = (c) => (c && FFMPEG_SHORTS_COLOR_MAP[c]) ? FFMPEG_SHORTS_COLOR_MAP[c] : (c || '#FFE600');

export const toShortsAssTagColor = (col) => {
  const hex = toShortsHex(col).replace('#', '').trim();
  return hex.length === 6 ? `&H00${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}&` : '&H0000E6FF&';
};

export const toShortsAssStyleColor = (col, alpha = '00') => {
  const hex = toShortsHex(col).replace('#', '').trim();
  return hex.length === 6 ? `&H${alpha}${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}` : `&H${alpha}00E6FF`;
};

export function getBadgeVector(style, w, h, seed = 0) {
  if (style === 'slanted') {
    const skew = Math.min(28, Math.max(14, Math.round(h * 0.25)));
    return `m ${skew} 0 l ${w} 0 l ${w - skew} ${h} l 0 ${h}`;
  }
  if (style === 'torn') {
    const s = 14; const pts = ['m 0 6'];
    const topY = [0, 8, 1, 10, 2, 9, 0, 11, 3, 8, 1, 10, 2, 7];
    for (let i = 1; i <= s; i++) pts.push(`l ${Math.round((w * i) / s)} ${topY[(i + seed) % topY.length]}`);
    pts.push(`l ${w - 18} ${Math.round(h * 0.24)} l ${w - 3} ${Math.round(h * 0.48)} l ${w - 22} ${Math.round(h * 0.72)} l ${w} ${h}`);
    const botY = [0, 9, 2, 10, 1, 8, 3, 11, 0, 9, 2, 8, 1, 7];
    for (let i = s - 1; i >= 0; i--) pts.push(`l ${Math.round((w * i) / s)} ${h - botY[(i + seed + 2) % botY.length]}`);
    pts.push(`l 18 ${Math.round(h * 0.75)} l 3 ${Math.round(h * 0.5)} l 22 ${Math.round(h * 0.25)} l 0 6`);
    return pts.join(' ');
  }
  if (style === 'tape') return `m 0 6 l 8 0 l ${w - 8} 0 l ${w} 6 l ${w - 4} ${h} l 4 ${h}`;
  const r = 8;
  return `m ${r} 0 l ${w - r} 0 l ${w} ${r} l ${w} ${h - r} l ${w - r} ${h} l ${r} ${h} l 0 ${h - r} l 0 ${r}`;
}

export function buildAssShortsSubtitle(wrappedText, options = {}) {
  const {
    font: reqFont, fontSize = 110, fontColor = 'yellow', strokeWidth = 8, strokeColor = 'black',
    shadowDistance = 4, shadowColor = 'black', posY = 200, wordColors, wordFontSizes,
    lineBadges, boxEnabled, boxColor, boxOpacity,
  } = options;

  const fontNameMap = {
    impact: 'Impact',
    arial_black: 'Arial Black',
    'Saxonia_Antiqua_Bold.ttf': 'Saxonia Antiqua',
    'SeymourOne-Regular.ttf': 'Seymour One',
    'StalinistOne-Regular.ttf': 'Stalinist One',
    'Unbounded-Black.ttf': 'Unbounded',
    'Buran_USSR.ttf': 'Buran USSR',
    'RussoOne-Regular.ttf': 'Russo One',
    'DelaGothicOne-Regular.ttf': 'Dela Gothic One',
    'RubikMonoOne-Regular.ttf': 'Rubik Mono One',
  };
  const assFontName = fontNameMap[reqFont] || (reqFont ? String(reqFont).replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim() : 'Impact');
  const assOutlineCol = toShortsAssStyleColor(strokeColor || 'black', '00');
  const assShadowCol = toShortsAssStyleColor(shadowColor || 'black', '80');
  const bWidth = Number(strokeWidth) >= 0 ? Number(strokeWidth) : 8;
  const sDist = Number(shadowDistance) >= 0 ? Number(shadowDistance) : 4;
  const rawSize = Math.max(30, Math.min(Number(fontSize) || 110, 240));
  const baseSize = Math.round(rawSize * 1.33);

  const lines = wrappedText.split('\n').filter(Boolean);
  const bCfg = lineBadges || {};
  const isBadgesOn = bCfg.enabled || (boxEnabled && bCfg.enabled !== false);
  const dialogues = [];
  let wordIdx = 0;

  if (isBadgesOn) {
    const globalStyle = bCfg.style || 'solid';
    const globalShadow = bCfg.shadow || 'soft';
    const rawGlobalOp = bCfg.opacity !== undefined ? Number(bCfg.opacity) : (boxOpacity !== undefined ? Number(boxOpacity) : 75);
    const globalOp = (!isNaN(rawGlobalOp) && rawGlobalOp >= 5 && rawGlobalOp <= 100) ? rawGlobalOp : 75;
    const globalCol = bCfg.color || boxColor || '#000000';

    lines.forEach((line, idx) => {
      const isLineOn = Array.isArray(bCfg.linesEnabled) ? bCfg.linesEnabled[idx] !== false : true;
      const bStyle = (Array.isArray(bCfg.lineStyles) && bCfg.lineStyles[idx]) ? bCfg.lineStyles[idx] : globalStyle;
      const bShadow = (Array.isArray(bCfg.lineShadows) && bCfg.lineShadows[idx]) ? bCfg.lineShadows[idx] : globalShadow;
      const rawBadgeOp = Number((Array.isArray(bCfg.lineOpacities) && bCfg.lineOpacities[idx] !== undefined) ? bCfg.lineOpacities[idx] : globalOp);
      const badgeOp = (!isNaN(rawBadgeOp) && rawBadgeOp >= 5 && rawBadgeOp <= 100) ? rawBadgeOp : 75;
      const alphaHex = Math.max(0, Math.min(255, Math.round((1 - badgeOp / 100) * 255))).toString(16).padStart(2, '0').toUpperCase();
      const shadW = bShadow === 'hard' ? 8 : (bShadow === 'glow' ? 6 : (bShadow === 'none' ? 0 : 4));
      const shadCol = bShadow === 'glow' ? '&H0B9EF5&' : '&H000000&';
      const shadAlpha = bShadow === 'none' ? 'FF' : alphaHex;
      const borderTag = bStyle === 'dashed' ? '\\bord3\\3c&HFFFFFF&' : '\\bord0';

      const words = line.split(/\s+/).filter(Boolean);
      const lineH = Math.round(baseSize * 1.25);
      const approxW = Math.min(1020, Math.round(line.length * baseSize * 0.62) + Math.round(baseSize * 0.8) + (bStyle === 'slanted' ? Math.round(lineH * 0.3) : 0));
      const badgeX = Math.max(20, Math.round(540 - approxW / 2));
      const curLineY = posY + idx * Math.round(baseSize * 1.28);
      const pivotX = 540;
      const pivotY = Math.round(curLineY + lineH / 2);
      const zAngles = [-2.0, 1.8, -1.6, 2.0];
      const tiltOffset = (Array.isArray(bCfg.lineTilts) && bCfg.lineTilts[idx] !== undefined && Number(bCfg.lineTilts[idx]) !== 0)
        ? Number(bCfg.lineTilts[idx])
        : (bCfg.tiltMode === 'zigzag' ? zAngles[idx % 4] : (bCfg.tiltMode === 'custom' && Array.isArray(bCfg.lineTilts) && bCfg.lineTilts[idx] !== undefined ? Number(bCfg.lineTilts[idx]) : 0));
      const lAngle = -tiltOffset;
      const bCol = (Array.isArray(bCfg.lineColors) && bCfg.lineColors[idx]) ? bCfg.lineColors[idx] : globalCol;

      if (isLineOn) {
        const poly = getBadgeVector(bStyle, approxW, lineH, idx);
        dialogues.push(`Dialogue: 0,0:00:00.00,0:01:00.00,Badge,,0,0,0,,{\\an7\\pos(${badgeX},${curLineY})\\org(${pivotX},${pivotY})${lAngle !== 0 ? `\\frz${lAngle}` : ''}\\c${toShortsAssTagColor(bCol)}\\1a&H${alphaHex}&${borderTag}\\shad${shadW}\\4c${shadCol}\\4a&H${shadAlpha}&\\p1}${poly}{\\p0}`);
      }

      const wordFrags = words.map(w => {
        const curIdx = wordIdx++;
        const wCol = (wordColors && wordColors[curIdx]) ? wordColors[curIdx] : fontColor;
        const wSz = (wordFontSizes && wordFontSizes[curIdx] && Number(wordFontSizes[curIdx]) > 0)
          ? Math.round(Number(wordFontSizes[curIdx]) * 1.33)
          : baseSize;
        return `{\\c${toShortsAssTagColor(wCol)}\\fs${wSz}\\bord${bWidth}\\3c${toShortsAssTagColor(strokeColor || 'black')}\\shad${sDist}\\4c${toShortsAssTagColor(shadowColor || 'black')}}${w}`;
      }).join(' ');

      const textY = Math.round(curLineY + (lineH - baseSize) / 2);
      dialogues.push(`Dialogue: 1,0:00:00.00,0:01:00.00,Title,,0,0,0,,{\\an8\\pos(540,${textY})\\org(${pivotX},${pivotY})${lAngle !== 0 ? `\\frz${lAngle}` : ''}}${wordFrags}`);
    });
  } else {
    const assLines = lines.map((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      return words.map(w => {
        const curIdx = wordIdx++;
        const wCol = (wordColors && wordColors[curIdx]) ? wordColors[curIdx] : fontColor;
        const wSz = (wordFontSizes && wordFontSizes[curIdx] && Number(wordFontSizes[curIdx]) > 0)
          ? Math.round(Number(wordFontSizes[curIdx]) * 1.33)
          : baseSize;
        return `{\\c${toShortsAssTagColor(wCol)}\\fs${wSz}\\bord${bWidth}\\3c${toShortsAssTagColor(strokeColor || 'black')}\\shad${sDist}\\4c${toShortsAssTagColor(shadowColor || 'black')}}${w}`;
      }).join(' ');
    });
    dialogues.push(`Dialogue: 1,0:00:00.00,0:01:00.00,Title,,0,0,0,,{\\an8\\pos(540,${posY})}${assLines.join('\\N')}`);
  }

  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Title,${assFontName},${baseSize},&H0000E6FF,&H000000FF,${assOutlineCol},${assShadowCol},-1,0,0,0,100,100,0,0,1,${bWidth},${sDist},8,10,10,10,1\nStyle: Badge,Arial,20,&H00000000,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${dialogues.join('\n')}\n`;
}
