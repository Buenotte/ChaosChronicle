export const FFMPEG_SHORTS_COLOR_MAP = {
  yellow: '#FFE600', white: '#FFFFFF', red: '#FF2A2A', cyan: '#00F0FF',
  green: '#00FF66', orange: '#FF8C00', black: '#000000', blue: '#1D4ED8', purple: '#7C3AED',
};

export const toShortsHex = (c) => {
  if (!c) return '#FFE600';
  if (FFMPEG_SHORTS_COLOR_MAP[c]) return FFMPEG_SHORTS_COLOR_MAP[c];
  if (c.startsWith('#')) return c;
  return '#FFE600';
};

export const toShortsAssTagColor = (col) => {
  let hex = toShortsHex(col).replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return hex.length === 6 ? `&H${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}&` : '&H00E6FF&';
};

export const toShortsAssStyleColor = (col, alpha = '00') => {
  let hex = toShortsHex(col).replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return hex.length === 6 ? `&H${alpha}${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}` : `&H${alpha}00E6FF`;
};

export function estimateCharWidth(ch, font, sz) {
  const f = (font || '').toLowerCase();
  let fontScale = 1.0;
  if (f.includes('impact')) fontScale = 0.72;
  else if (f.includes('buran')) fontScale = 0.80;
  else if (f.includes('russo')) fontScale = 0.92;
  else if (f.includes('unbounded') || f.includes('arial')) fontScale = 1.05;
  else if (f.includes('rubik') || f.includes('delagothic') || f.includes('seymour')) fontScale = 1.15;

  if ('I1!|:;.,\'"il'.includes(ch)) return sz * 0.22 * fontScale;
  if (ch === ' ') return sz * 0.26 * fontScale;
  if ('Jtfjr-()[]'.includes(ch)) return sz * 0.34 * fontScale;
  if ('ГТLEFZ7'.includes(ch)) return sz * 0.44 * fontScale;
  if ('ЖМФШЩЫЮMW@#%&—'.includes(ch)) return sz * 0.72 * fontScale;
  return sz * 0.52 * fontScale;
}

export function getBadgeVector(style, w, h, seed = 0) {
  if (style === 'slanted') {
    const skew = Math.min(45, Math.max(20, Math.round(h * 0.25)));
    return `m ${skew} 0 l ${w} 0 l ${w - skew} ${h} l 0 ${h}`;
  }
  if (style === 'torn') {
    const s = 14; const pts = ['m 0 10'];
    const topY = [0, 8, 2, 9, 3, 8, 0, 10, 4, 8, 2, 9, 3, 7];
    for (let i = 1; i <= s; i++) pts.push(`l ${Math.round((w * i) / s)} ${topY[(i + seed) % topY.length]}`);
    pts.push(`l ${w - 16} ${Math.round(h * 0.24)} l ${w - 3} ${Math.round(h * 0.48)} l ${w - 18} ${Math.round(h * 0.72)} l ${w} ${h}`);
    const botY = [0, 8, 3, 9, 2, 7, 4, 10, 0, 8, 3, 7, 2, 6];
    for (let i = s - 1; i >= 0; i--) pts.push(`l ${Math.round((w * i) / s)} ${h - botY[(i + seed + 2) % botY.length]}`);
    pts.push(`l 16 ${Math.round(h * 0.75)} l 3 ${Math.round(h * 0.5)} l 18 ${Math.round(h * 0.25)} l 0 10`);
    return pts.join(' ');
  }
  if (style === 'tape') return `m 0 6 l 8 0 l ${w - 8} 0 l ${w} 6 l ${w - 3} ${h} l 3 ${h}`;
  const r = 16;
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
  const effectiveSize = Math.max(30, Math.min(Number(fontSize) || 110, 240));

  const lines = String(wrappedText || '').split('\n').map(l => l.trim().toUpperCase()).filter(Boolean);
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
      const shadW = bShadow === 'hard' ? 7 : (bShadow === 'glow' ? 0 : (bShadow === 'none' ? 0 : 5));
      const shadCol = '&H000000&';
      const shadAlpha = bShadow === 'none' ? 'FF' : alphaHex;
      const borderTag = bStyle === 'dashed' ? '\\bord4\\3c&HFFFFFF&' : (bShadow === 'glow' ? '\\bord4\\3c&H0B9EF5&' : '\\bord0');

      const words = line.split(/\s+/).filter(Boolean);
      let lineTextW = 0;
      words.forEach((w, wSubIdx) => {
        const curWIdx = wordIdx + wSubIdx;
        const wSz = (wordFontSizes && wordFontSizes[curWIdx] && Number(wordFontSizes[curWIdx]) > 0)
          ? Number(wordFontSizes[curWIdx])
          : effectiveSize;
        for (const c of w) lineTextW += estimateCharWidth(c, reqFont, wSz);
        if (wSubIdx > 0) lineTextW += wSz * 0.28;
      });

      const defPadX = bStyle === 'slanted' ? 56 : (bStyle === 'torn' ? 56 : (bStyle === 'tape' ? 48 : 40));
      const defPadY = bStyle === 'torn' ? 14 : 10;
      const rawPadX = (Array.isArray(bCfg.linePadX) && bCfg.linePadX[idx] !== undefined) ? Number(bCfg.linePadX[idx]) : (bCfg.padX !== undefined ? Number(bCfg.padX) : defPadX);
      const rawPadY = (Array.isArray(bCfg.linePadY) && bCfg.linePadY[idx] !== undefined) ? Number(bCfg.linePadY[idx]) : (bCfg.padY !== undefined ? Number(bCfg.padY) : defPadY);
      const padX = Math.max(10, Math.min(140, !isNaN(rawPadX) ? rawPadX : defPadX));
      const padY = Math.max(2, Math.min(60, !isNaN(rawPadY) ? rawPadY : defPadY));
      const lineH = Math.round(effectiveSize * 0.74) + padY * 2;
      const lineStep = lineH + 20;
      const approxW = Math.min(1000, Math.max(120, Math.round(lineTextW + padX * 2)));
      const badgeX = Math.max(20, Math.round(540 - approxW / 2));
      const curLineY = posY + idx * lineStep;
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
        dialogues.push(`Dialogue: 0,0:00:00.00,0:01:00.00,Badge,,0,0,0,,{\\an7\\pos(${badgeX},${curLineY})\\org(${pivotX},${pivotY})${lAngle !== 0 ? `\\frz${lAngle}` : ''}\\c${toShortsAssTagColor(bCol)}\\1a&H${alphaHex}&${borderTag}\\shad${shadW}\\blur${bShadow === 'soft' ? 3 : 0}\\4c${shadCol}\\4a&H${shadAlpha}&\\p1}${poly}{\\p0}`);
      }

      const wordFrags = words.map(w => {
        const curIdx = wordIdx++;
        const wCol = (wordColors && wordColors[curIdx]) ? wordColors[curIdx] : fontColor;
        const wSz = (wordFontSizes && wordFontSizes[curIdx] && Number(wordFontSizes[curIdx]) > 0)
          ? Number(wordFontSizes[curIdx])
          : effectiveSize;
        return `{\\c${toShortsAssTagColor(wCol)}\\fs${wSz}\\bord${bWidth}\\3c${toShortsAssTagColor(strokeColor || 'black')}\\shad${sDist}\\4c${toShortsAssTagColor(shadowColor || 'black')}}${w}`;
      }).join(' ');

      dialogues.push(`Dialogue: 1,0:00:00.00,0:01:00.00,Title,,0,0,0,,{\\an5\\pos(540,${pivotY})\\org(${pivotX},${pivotY})${lAngle !== 0 ? `\\frz${lAngle}` : ''}}${wordFrags}`);
    });
  } else {
    const assLines = lines.map((line) => {
      const words = line.split(/\s+/).filter(Boolean);
      return words.map(w => {
        const curIdx = wordIdx++;
        const wCol = (wordColors && wordColors[curIdx]) ? wordColors[curIdx] : fontColor;
        const wSz = (wordFontSizes && wordFontSizes[curIdx] && Number(wordFontSizes[curIdx]) > 0)
          ? Number(wordFontSizes[curIdx])
          : effectiveSize;
        return `{\\c${toShortsAssTagColor(wCol)}\\fs${wSz}\\bord${bWidth}\\3c${toShortsAssTagColor(strokeColor || 'black')}\\shad${sDist}\\4c${toShortsAssTagColor(shadowColor || 'black')}}${w}`;
      }).join(' ');
    });
    dialogues.push(`Dialogue: 1,0:00:00.00,0:01:00.00,Title,,0,0,0,,{\\an8\\pos(540,${posY})}${assLines.join('\\N')}`);
  }

  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Title,${assFontName},${effectiveSize},&H0000E6FF,&H000000FF,${assOutlineCol},${assShadowCol},-1,0,0,0,100,100,0,0,1,${bWidth},${sDist},8,10,10,10,1\nStyle: Badge,Arial,20,&H00000000,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${dialogues.join('\n')}\n`;
}
