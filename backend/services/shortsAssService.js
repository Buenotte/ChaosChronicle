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
  if (f.includes('impact')) fontScale = 0.90;
  else if (f.includes('buran')) fontScale = 0.85;
  else if (f.includes('russo')) fontScale = 1.08;
  else if (f.includes('unbounded') || f.includes('arial')) fontScale = 1.05;
  else if (f.includes('rubik') || f.includes('delagothic') || f.includes('seymour')) fontScale = 1.25;

  if ('I1!|:;.,\'"il·'.includes(ch)) return sz * 0.28 * fontScale;
  if (ch === ' ') return sz * 0.30 * fontScale;
  if ('Jtfjr-()[]'.includes(ch)) return sz * 0.38 * fontScale;
  if ('ГТLEFZ7'.includes(ch)) return sz * 0.52 * fontScale;
  if ('ЖМФШЩЫЮMW@#%&—'.includes(ch)) return sz * 0.88 * fontScale;
  return sz * 0.65 * fontScale;
}

export function getBadgeVector(style, w, h, seed = 0) {
  if (style === 'slanted') {
    const skew = Math.min(45, Math.max(20, Math.round(h * 0.25)));
    return `m ${skew} 0 l ${w} 0 l ${w - skew} ${h} l 0 ${h}`;
  }
  if (style === 'torn') {
    const s = 14, pts = ['m 0 10'], topY = [0, 8, 2, 9, 3, 8, 0, 10, 4, 8, 2, 9, 3, 7];
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

export function formatAssTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const hrs = Math.floor(s / 3600), mins = Math.floor((s % 3600) / 60), secs = Math.floor(s % 60), cs = Math.floor((s % 1) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function generateSpeechDialogueEvents(opts = {}) {
  const {
    speechText = '', duration = 20, totalAudioDuration = 0,
    speechFontSize = 115, speechColor = 'yellow', speechInactiveColor = 'white', speechPosY = 980,
    speechStrokeWidth = 12, speechStrokeColor = 'black', speechShadowDistance = 6, speechShadowColor = 'black',
    speechBoxMode = 'pill', speechBoxColor = 'black', speechBoxOpacity = 88, speechPacing = 'wave', speechFont = 'Russo One',
    resX = 1080, resY = 1920, isLandscape = false,
  } = opts;

  if (!speechText || typeof speechText !== 'string') return [];
  let text = speechText;
  if (text.includes('##') && /##\s*🎬?\s*Сценарий/i.test(text)) {
    const parts = text.split(/##\s*🎬?\s*Сценарий/i);
    if (parts[1]) text = parts[1];
  }
  const cleanRaw = text.replace(/\[B-Roll:[^\]]*\]/gi, ' ').replace(/#+\s*[^\r\n]+/g, ' ').replace(/---+/g, ' ').replace(/[*_`«»"']/g, ' ').replace(/[\r\n\t]+/g, ' ').trim();
  const allWords = cleanRaw.split(/\s+/).filter(Boolean);
  if (allWords.length === 0) return [];

  const targetDur = Math.max(5, Number(duration) || 20);
  const totalAudioDur = (Number(totalAudioDuration) > 0) ? Number(totalAudioDuration) : Math.max(targetDur, allWords.length / 2.75);

  let timedWords = [];
  if (Array.isArray(opts.whisperWords) && opts.whisperWords.length > 0) {
    timedWords = opts.whisperWords
      .filter(tw => tw && tw.word && typeof tw.start === 'number' && tw.start < targetDur)
      .map(tw => ({ word: String(tw.word).trim(), start: Math.max(0, tw.start), end: Math.min(targetDur, Math.max(tw.start + 0.1, tw.end)) }));
  } else {
    const calcWeight = w => { let wt = w.length * 0.65 + 2.5; if (/[.!?]$/.test(w)) wt += 4.5; else if (/[,;—]$/.test(w)) wt += 2.2; return wt; };
    const allWeights = allWords.map(calcWeight), totalWeight = allWeights.reduce((a, b) => a + b, 0) || 1;
    let cur = 0.0;
    for (let i = 0; i < allWords.length; i++) {
      const wDur = (allWeights[i] / totalWeight) * totalAudioDur, wStart = cur, wEnd = cur + wDur;
      cur = wEnd;
      if (wStart < targetDur) timedWords.push({ word: allWords[i], start: wStart, end: Math.min(targetDur, wEnd) });
    }
  }

  if (timedWords.length === 0) return [];
  for (let i = 0; i < timedWords.length; i++) {
    if (i > 0 && timedWords[i].start < timedWords[i - 1].start) timedWords[i].start = timedWords[i - 1].end;
    if (timedWords[i].end <= timedWords[i].start) timedWords[i].end = timedWords[i].start + 0.18;
  }

  const isSingle = speechPacing === 'single', isTwoWords = speechPacing === 'blitz' || speechPacing === 'two';
  const customMaxWords = Number(opts.speechMaxWords) > 0 ? Number(opts.speechMaxWords) : 0;
  const customMaxChars = Number(opts.speechMaxChars) > 0 ? Number(opts.speechMaxChars) : 0;
  const maxWordsPerWave = customMaxWords || (isSingle ? 1 : (isTwoWords ? 2 : (isLandscape ? 8 : 4)));
  const maxLenPerWave = customMaxChars || (isSingle ? 14 : (isTwoWords ? 24 : (isLandscape ? 70 : 36)));
  const lineMode = opts.speechLineMode || 'auto'; // 'auto' | 'single' | 'double'

  const waveChunks = [];
  let curChunk = [], curLen = 0;
  for (let i = 0; i < timedWords.length; i++) {
    const tw = timedWords[i];
    curChunk.push(tw); curLen += tw.word.length;
    const isPunctEnd = /[.!?]$/.test(tw.word);
    const reachedWordLimit = curChunk.length >= maxWordsPerWave;
    const reachedLenLimit = curLen >= maxLenPerWave;
    const isLastWord = i === timedWords.length - 1;

    if (isSingle || isTwoWords) {
      if (curChunk.length >= maxWordsPerWave || isLastWord) {
        waveChunks.push(curChunk); curChunk = []; curLen = 0;
      }
    } else if (reachedWordLimit || reachedLenLimit || isLastWord || (isPunctEnd && curChunk.length >= Math.max(2, Math.floor(maxWordsPerWave * 0.4)))) {
      waveChunks.push(curChunk); curChunk = []; curLen = 0;
    }
  }
  if (curChunk.length > 0) waveChunks.push(curChunk);
  if (waveChunks.length === 0) return [];

  const bW = Number(speechStrokeWidth) >= 0 ? Number(speechStrokeWidth) : (isLandscape ? 4 : 8);
  const sD = Number(speechShadowDistance) >= 0 ? Number(speechShadowDistance) : (isLandscape ? 2 : 4);
  const strokeTag = toShortsAssTagColor(speechStrokeColor || 'black'), shadowTag = toShortsAssTagColor(speechShadowColor || 'black');
  const highlightTag = toShortsAssTagColor(speechColor || 'yellow'), inactiveTag = toShortsAssTagColor(speechInactiveColor || 'white');
  const dialogues = [];
  const centerX = Math.round(resX / 2);
  const maxSafeW = Math.round(resX * (isLandscape ? 0.90 : 0.80));
  const rawWordGap = Number(opts.speechWordSpacing);
  const wordGap = (!isNaN(rawWordGap) && rawWordGap >= 0) ? rawWordGap : (isLandscape ? 10 : 14);

  const calcLineW = (words, sz) => {
    let w = 0;
    words.forEach((tw, idx) => {
      for (const c of tw.word) w += estimateCharWidth(c, speechFont, sz);
      if (idx > 0) w += wordGap + (sz * 0.16);
    });
    return Math.round(w);
  };

  // Ermittle eine einheitliche globale Schriftgröße für alle Untertitel-Zeilen im gesamten Video,
  // damit die Schriftgröße nicht von Abschnitt zu Abschnitt unruhig hin- und herspringt.
  let uniformFontSize = Number(speechFontSize) || (isLandscape ? 44 : 115);
  waveChunks.forEach((chunk) => {
    let isMulti = (lineMode === 'double') ? (chunk.length >= 2) : ((lineMode === 'single') ? false : (isLandscape ? (chunk.length >= 8) : (chunk.length > 2)));
    let sIdx = isMulti ? Math.ceil(chunk.length / 2) : chunk.length;
    let l1 = chunk.slice(0, sIdx), l2 = isMulti ? chunk.slice(sIdx) : [];
    let w1 = calcLineW(l1, uniformFontSize), w2 = isMulti ? calcLineW(l2, uniformFontSize) : 0;
    let maxW = Math.max(w1, w2);
    if (maxW > maxSafeW) {
      if (lineMode === 'auto' && !isMulti && chunk.length >= 4) {
        isMulti = true;
        sIdx = Math.ceil(chunk.length / 2);
        l1 = chunk.slice(0, sIdx);
        l2 = chunk.slice(sIdx);
        w1 = calcLineW(l1, uniformFontSize);
        w2 = calcLineW(l2, uniformFontSize);
        maxW = Math.max(w1, w2);
      }
      if (maxW > maxSafeW) {
        const fittedSize = Math.max(isLandscape ? 22 : 75, Math.floor(uniformFontSize * (maxSafeW / maxW)));
        if (fittedSize < uniformFontSize) uniformFontSize = fittedSize;
      }
    }
  });

  waveChunks.forEach((chunk, chunkIdx) => {
    const nextChunk = waveChunks[chunkIdx + 1];
    const chunkStart = Math.max(0, chunk[0].start), lastWordEnd = chunk[chunk.length - 1].end;
    const maxEnd = nextChunk ? nextChunk[0].start : targetDur;
    const chunkEnd = Math.min(maxEnd, Math.max(chunkStart + 0.3, lastWordEnd + 0.2));
    const chunkStartTime = formatAssTime(chunkStart), chunkEndTime = formatAssTime(chunkEnd);

    // Einheitliche Schriftgröße für alle Untertitel-Zeilen
    let baseFontSize = uniformFontSize;
    
    let isMultiLine = false;
    if (lineMode === 'double') {
      isMultiLine = chunk.length >= 2;
    } else if (lineMode === 'single') {
      isMultiLine = false;
    } else {
      // 'auto' mode
      isMultiLine = isLandscape ? (chunk.length >= 8) : (chunk.length > 2);
    }

    let splitIdx = isMultiLine ? Math.ceil(chunk.length / 2) : chunk.length;
    let line1Words = chunk.slice(0, splitIdx), line2Words = isMultiLine ? chunk.slice(splitIdx) : [];

    let w1 = calcLineW(line1Words, baseFontSize), w2 = isMultiLine ? calcLineW(line2Words, baseFontSize) : 0;
    let maxLineW = Math.max(w1, w2);

    if (maxLineW > maxSafeW) {
      if (lineMode === 'auto' && !isMultiLine && chunk.length >= 4) {
        isMultiLine = true;
        splitIdx = Math.ceil(chunk.length / 2);
        line1Words = chunk.slice(0, splitIdx);
        line2Words = chunk.slice(splitIdx);
        w1 = calcLineW(line1Words, baseFontSize);
        w2 = calcLineW(line2Words, baseFontSize);
        maxLineW = Math.max(w1, w2);
      }
      if (maxLineW > maxSafeW) {
        baseFontSize = Math.max(isLandscape ? 22 : 75, Math.floor(baseFontSize * (maxSafeW / maxLineW)));
        w1 = calcLineW(line1Words, baseFontSize);
        w2 = isMultiLine ? calcLineW(line2Words, baseFontSize) : 0;
        maxLineW = Math.max(w1, w2);
      }
    }

    const effectiveFontSize = baseFontSize;
    const rawSpeechLineGap = Number(opts.speechLineSpacing ?? opts.subtitleLineSpacing);
    const speechLineGap = (!isNaN(rawSpeechLineGap) && rawSpeechLineGap >= 0) ? rawSpeechLineGap : 10;

    // Wirksamer, visuell spürbarer Zeilenabstand (line spacing)
    const lineStep = Math.round(effectiveFontSize * 1.10 + speechLineGap * 1.5);
    const halfStep = Math.round(lineStep / 2);

    const padX = isLandscape ? Math.max(90, Math.round(baseFontSize * 2.2)) : 130;
    const boxW = Math.min(Math.round(resX * 0.96), Math.max(220, Math.round(maxLineW + padX)));

    if (speechBoxMode !== 'none') {
      const padY = isLandscape ? Math.max(16, Math.round(baseFontSize * 0.35)) : 26;
      const boxH = isMultiLine ? Math.round(lineStep + baseFontSize + padY * 2) : Math.round(baseFontSize * 1.15 + padY * 2);
      const badgeX = Math.max(20, Math.round(centerX - boxW / 2)), badgeY = Math.round(speechPosY - boxH / 2);
      const r = speechBoxMode === 'solid' ? 6 : (isLandscape ? 14 : 24);
      const poly = `m ${r} 0 l ${boxW - r} 0 l ${boxW} ${r} l ${boxW} ${boxH - r} l ${boxW - r} ${boxH} l ${r} ${boxH} l 0 ${boxH - r} l 0 ${r}`;
      const op = Math.max(0, Math.min(100, Number(speechBoxOpacity) ?? 82)), assAlphaNum = Math.round(255 * (1 - op / 100));
      const boxAlpha = assAlphaNum.toString(16).padStart(2, '0').toUpperCase();
      const assBoxCol = toShortsAssTagColor(speechBoxColor || 'black');
      const borderTag = speechBoxMode === 'glow' ? `\\bord4\\3c${highlightTag}` : '\\bord0';
      dialogues.push(`Dialogue: 1,${chunkStartTime},${chunkEndTime},Badge,,0,0,0,,{\\an7\\pos(${badgeX},${badgeY})\\c${assBoxCol}\\1a&H${boxAlpha}&${borderTag}\\shad2\\4c&H000000&\\4a&H${boxAlpha}&\\p1}${poly}{\\p0}`);
    }

    chunk.forEach((activeTw, activeIdx) => {
      const nextTw = chunk[activeIdx + 1];
      const wStartSec = (activeIdx === 0) ? chunkStart : activeTw.start, wEndSec = nextTw ? nextTw.start : chunkEnd;
      const wStart = formatAssTime(wStartSec), wEnd = formatAssTime(Math.max(wStartSec + 0.1, wEndSec));
      
      const formatWords = (wList, offset) => {
        const parts = [];
        wList.forEach((tw, subIdx) => {
          const globalWIdx = offset + subIdx, isCurrent = (globalWIdx === activeIdx);
          let colTag = isCurrent ? highlightTag : inactiveTag;
          if (Array.isArray(opts.speechWordColors) && opts.speechWordColors[globalWIdx]) {
            colTag = toShortsAssTagColor(opts.speechWordColors[globalWIdx]);
          }
          // Alle Wörter in den Untertiteln haben eine einheitliche, saubere Schriftgröße
          const wSz = baseFontSize;
          const activeBorder = isCurrent && speechBoxMode === 'none' ? Math.min(bW + 2, 16) : bW;
          if (subIdx > 0) {
            parts.push(`{\\fsp${wordGap}} {\\fsp0}`);
          }
          parts.push(`{\\c${colTag}\\fs${wSz}\\bord${activeBorder}\\3c${strokeTag}\\shad${sD}\\4c${shadowTag}}${tw.word.toUpperCase()}`);
        });
        return parts.join('');
      };

      if (isMultiLine) {
        const line1Y = speechPosY - halfStep;
        const line2Y = speechPosY + halfStep;
        dialogues.push(`Dialogue: 2,${wStart},${wEnd},Speech,,0,0,0,,{\\an5\\pos(${centerX},${line1Y})}${formatWords(line1Words, 0)}`);
        dialogues.push(`Dialogue: 2,${wStart},${wEnd},Speech,,0,0,0,,{\\an5\\pos(${centerX},${line2Y})}${formatWords(line2Words, splitIdx)}`);
      } else {
        dialogues.push(`Dialogue: 2,${wStart},${wEnd},Speech,,0,0,0,,{\\an5\\pos(${centerX},${speechPosY})}${formatWords(line1Words, 0)}`);
      }
    });
  });

  return dialogues;
}

export function buildAssShortsSubtitle(wrappedText, options = {}) {
  const {
    font: reqFont, fontSize = 110, fontColor = 'yellow', strokeWidth = 8, strokeColor = 'black',
    shadowDistance = 4, shadowColor = 'black', posY = 200, wordColors, wordFontSizes,
    lineBadges, boxEnabled, boxColor, boxOpacity, showHookTitle = true,
    speechSubtitlesEnabled = true, speechText = '', duration = 20, totalAudioDuration = 0,
    speechFontSize = 115, speechColor = 'yellow', speechInactiveColor = 'white', speechPosY = 980, speechFont = 'impact',
    speechBoxMode = 'pill', speechBoxColor = 'black', speechBoxOpacity = 88,
    speechPacing = 'wave', speechStrokeWidth = 8, speechShadowDistance = 4,
    speechLineSpacing = 10, speechWordSpacing = 14,
  } = options;

  const fontNameMap = {
    impact: 'Impact', arial_black: 'Arial Black', 'Saxonia_Antiqua_Bold.ttf': 'Saxonia Antiqua Bold',
    'Saxonia_Antiqua.ttf': 'Saxonia Antiqua', 'SeymourOne-Regular.ttf': 'Seymour One', 'StalinistOne-Regular.ttf': 'Stalinist One',
    'Unbounded-Black.ttf': 'Unbounded', 'Buran_USSR.ttf': 'Buran USSR', 'RussoOne-Regular.ttf': 'Russo One',
    'DelaGothicOne-Regular.ttf': 'Dela Gothic One', 'RubikMonoOne-Regular.ttf': 'Rubik Mono One', 'PROPAGAN.ttf': 'Propaganda', 'YesevaOne-Regular.ttf': 'Yeseva One',
  };
  const assFontName = fontNameMap[reqFont] || (reqFont ? String(reqFont).replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim() : 'Impact');
  const assSpeechFontName = fontNameMap[speechFont] || fontNameMap[reqFont] || 'Impact';
  const assOutlineCol = toShortsAssStyleColor(strokeColor || 'black', '00'), assShadowCol = toShortsAssStyleColor(shadowColor || 'black', '80');
  const bWidth = Number(strokeWidth) >= 0 ? Number(strokeWidth) : 8, sDist = Number(shadowDistance) >= 0 ? Number(shadowDistance) : 4;
  const effectiveSize = Math.max(30, Math.min(Number(fontSize) || 110, 240));
  const lines = (showHookTitle !== false) ? String(wrappedText || '').split('\n').map(l => l.trim().toUpperCase()).filter(Boolean) : [];
  const bCfg = lineBadges || {}, isBadgesOn = bCfg.enabled || (boxEnabled && bCfg.enabled !== false);
  const dialogues = [];
  let wordIdx = 0;

  if (lines.length > 0) {
    if (isBadgesOn) {
      const globalStyle = bCfg.style || 'solid', globalShadow = bCfg.shadow || 'soft';
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
        const shadCol = '&H000000&', shadAlpha = bShadow === 'none' ? 'FF' : alphaHex;
        const borderTag = bStyle === 'dashed' ? '\\bord4\\3c&HFFFFFF&' : (bShadow === 'glow' ? '\\bord4\\3c&H0B9EF5&' : '\\bord0');

        const words = line.split(/\s+/).filter(Boolean);
        let lineTextW = 0;
        words.forEach((w, wSubIdx) => {
          const curWIdx = wordIdx + wSubIdx;
          const wSz = (wordFontSizes && wordFontSizes[curWIdx] && Number(wordFontSizes[curWIdx]) > 0) ? Number(wordFontSizes[curWIdx]) : effectiveSize;
          for (const c of w) lineTextW += estimateCharWidth(c, reqFont, wSz);
          if (wSubIdx > 0) lineTextW += wSz * 0.28;
        });

        const defPadX = bStyle === 'slanted' ? 56 : (bStyle === 'torn' ? 56 : (bStyle === 'tape' ? 48 : 40)), defPadY = bStyle === 'torn' ? 14 : 10;
        const rawPadX = (Array.isArray(bCfg.linePadX) && bCfg.linePadX[idx] !== undefined) ? Number(bCfg.linePadX[idx]) : (bCfg.padX !== undefined ? Number(bCfg.padX) : defPadX);
        const rawPadY = (Array.isArray(bCfg.linePadY) && bCfg.linePadY[idx] !== undefined) ? Number(bCfg.linePadY[idx]) : (bCfg.padY !== undefined ? Number(bCfg.padY) : defPadY);
        const padX = Math.max(10, Math.min(140, !isNaN(rawPadX) ? rawPadX : defPadX)), padY = Math.max(2, Math.min(60, !isNaN(rawPadY) ? rawPadY : defPadY));
        const rawLineGap = Number(options.lineSpacing);
        const lineGap = (!isNaN(rawLineGap)) ? rawLineGap : 20;
        const lineH = Math.round(effectiveSize * 0.74) + padY * 2, lineStep = lineH + lineGap;
        const approxW = Math.min(1000, Math.max(120, Math.round(lineTextW + padX * 2))), badgeX = Math.max(20, Math.round(540 - approxW / 2));
        const curLineY = posY + idx * lineStep, pivotX = 540, pivotY = Math.round(curLineY + lineH / 2);
        const zAngles = [-2.0, 1.8, -1.6, 2.0];
        const tiltOffset = (Array.isArray(bCfg.lineTilts) && bCfg.lineTilts[idx] !== undefined && Number(bCfg.lineTilts[idx]) !== 0)
          ? Number(bCfg.lineTilts[idx])
          : (bCfg.tiltMode === 'zigzag' ? zAngles[idx % 4] : (bCfg.tiltMode === 'custom' && Array.isArray(bCfg.lineTilts) && bCfg.lineTilts[idx] !== undefined ? Number(bCfg.lineTilts[idx]) : 0));
        const lAngle = -tiltOffset, bCol = (Array.isArray(bCfg.lineColors) && bCfg.lineColors[idx]) ? bCfg.lineColors[idx] : globalCol;

        if (isLineOn) {
          const poly = getBadgeVector(bStyle, approxW, lineH, idx);
          dialogues.push(`Dialogue: 0,0:00:00.00,0:01:00.00,Badge,,0,0,0,,{\\an7\\pos(${badgeX},${curLineY})\\org(${pivotX},${pivotY})${lAngle !== 0 ? `\\frz${lAngle}` : ''}\\c${toShortsAssTagColor(bCol)}\\1a&H${alphaHex}&${borderTag}\\shad${shadW}\\blur${bShadow === 'soft' ? 3 : 0}\\4c${shadCol}\\4a&H${shadAlpha}&\\p1}${poly}{\\p0}`);
        }

        const wordFrags = words.map(w => {
          const curIdx = wordIdx++, wCol = (wordColors && wordColors[curIdx]) ? wordColors[curIdx] : fontColor;
          const wSz = (wordFontSizes && wordFontSizes[curIdx] && Number(wordFontSizes[curIdx]) > 0) ? Number(wordFontSizes[curIdx]) : effectiveSize;
          return `{\\c${toShortsAssTagColor(wCol)}\\fs${wSz}\\bord${bWidth}\\3c${toShortsAssTagColor(strokeColor || 'black')}\\shad${sDist}\\4c${toShortsAssTagColor(shadowColor || 'black')}}${w}`;
        }).join(' ');

        dialogues.push(`Dialogue: 1,0:00:00.00,0:01:00.00,Title,,0,0,0,,{\\an5\\pos(540,${pivotY})\\org(${pivotX},${pivotY})${lAngle !== 0 ? `\\frz${lAngle}` : ''}}${wordFrags}`);
      });
    } else {
      const rawLineGap = Number(options.lineSpacing);
      const lineGap = (!isNaN(rawLineGap)) ? rawLineGap : 20;
      const lineH = Math.round(effectiveSize * 0.74);
      const lineStep = lineH + lineGap;

      lines.forEach((line, idx) => {
        const words = line.split(/\s+/).filter(Boolean);
        const curLineY = posY + idx * lineStep;
        const wordFrags = words.map(w => {
          const curIdx = wordIdx++, wCol = (wordColors && wordColors[curIdx]) ? wordColors[curIdx] : fontColor;
          const wSz = (wordFontSizes && wordFontSizes[curIdx] && Number(wordFontSizes[curIdx]) > 0) ? Number(wordFontSizes[curIdx]) : effectiveSize;
          return `{\\c${toShortsAssTagColor(wCol)}\\fs${wSz}\\bord${bWidth}\\3c${toShortsAssTagColor(strokeColor || 'black')}\\shad${sDist}\\4c${toShortsAssTagColor(shadowColor || 'black')}}${w}`;
        }).join(' ');
        dialogues.push(`Dialogue: 1,0:00:00.00,0:01:00.00,Title,,0,0,0,,{\\an8\\pos(540,${curLineY})}${wordFrags}`);
      });
    }
  }

  if (speechSubtitlesEnabled !== false && speechText) {
    const speechEvents = generateSpeechDialogueEvents({
      speechText, duration, totalAudioDuration, speechFontSize, speechColor, speechInactiveColor,
      speechPosY, speechStrokeWidth, speechStrokeColor: 'black', speechShadowDistance, speechShadowColor: 'black',
      speechBoxMode, speechBoxColor, speechBoxOpacity, speechPacing, speechFont: assSpeechFontName, whisperWords: options.whisperWords,
      speechLineSpacing: options.speechLineSpacing ?? options.subtitleLineSpacing ?? speechLineSpacing,
      speechWordSpacing: options.speechWordSpacing ?? options.subtitleWordSpacing ?? speechWordSpacing,
    });
    dialogues.push(...speechEvents);
  }

  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Title,${assFontName},${effectiveSize},&H0000E6FF,&H000000FF,${assOutlineCol},${assShadowCol},-1,0,0,0,100,100,0,0,1,${bWidth},${sDist},8,10,10,10,1\nStyle: Speech,${assSpeechFontName},${speechFontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,${speechStrokeWidth},${speechShadowDistance},5,20,20,20,1\nStyle: Badge,Arial,20,&H00000000,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${dialogues.join('\n')}\n`;
}

export function buildAssVideoSubtitle(speechText, options = {}) {
  const {
    duration = 60, totalAudioDuration = 0, speechFontSize = 44, speechColor = 'yellow',
    speechInactiveColor = 'white', speechPosY = 960, speechFont = 'RussoOne-Regular.ttf',
    speechBoxMode = 'pill', speechBoxColor = 'black', speechBoxOpacity = 82,
    speechPacing = 'wave', speechStrokeWidth = 4, speechShadowDistance = 2,
    speechWordSpacing = 10, speechLineSpacing = 10,
    whisperWords = null, resX = 1920, resY = 1080,
  } = options;

  const fontNameMap = {
    impact: 'Impact', arial_black: 'Arial Black', 'Saxonia_Antiqua_Bold.ttf': 'Saxonia Antiqua Bold',
    'Saxonia_Antiqua.ttf': 'Saxonia Antiqua', 'SeymourOne-Regular.ttf': 'Seymour One', 'StalinistOne-Regular.ttf': 'Stalinist One',
    'Unbounded-Black.ttf': 'Unbounded', 'Buran_USSR.ttf': 'Buran USSR', 'RussoOne-Regular.ttf': 'Russo One',
    'DelaGothicOne-Regular.ttf': 'Dela Gothic One', 'RubikMonoOne-Regular.ttf': 'Rubik Mono One', 'PROPAGAN.ttf': 'Propaganda', 'YesevaOne-Regular.ttf': 'Yeseva One',
  };
  const assSpeechFontName = fontNameMap[speechFont] || (speechFont ? String(speechFont).replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim() : 'Russo One');

  const dialogues = generateSpeechDialogueEvents({
    speechText,
    duration,
    totalAudioDuration: totalAudioDuration || duration,
    speechFontSize,
    speechColor,
    speechInactiveColor,
    speechPosY,
    speechStrokeWidth,
    speechStrokeColor: 'black',
    speechShadowDistance,
    speechShadowColor: 'black',
    speechBoxMode,
    speechBoxColor,
    speechBoxOpacity,
    speechPacing,
    speechLineMode: options.speechLineMode || 'auto',
    speechMaxWords: options.speechMaxWords || 0,
    speechMaxChars: options.speechMaxChars || 0,
    speechWordSpacing: options.speechWordSpacing ?? options.subtitleWordSpacing ?? speechWordSpacing,
    speechLineSpacing: options.speechLineSpacing ?? options.subtitleLineSpacing ?? speechLineSpacing,
    speechFont: assSpeechFontName,
    wordColors: options.wordColors,
    whisperWords,
    resX,
    resY,
    isLandscape: true,
  });

  return `[Script Info]\nScriptType: v4.00+\nPlayResX: ${resX}\nPlayResY: ${resY}\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Speech,${assSpeechFontName},${speechFontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,${speechStrokeWidth},${speechShadowDistance},5,20,20,20,1\nStyle: Badge,Arial,20,&H00000000,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${dialogues.join('\n')}\n`;
}
