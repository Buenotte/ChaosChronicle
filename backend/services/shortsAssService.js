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
  if (f.includes('buran')) fontScale = 0.82;
  else if (f.includes('russo')) fontScale = 0.95;
  else if (f.includes('unbounded') || f.includes('arial')) fontScale = 1.05;
  else if (f.includes('rubik') || f.includes('delagothic') || f.includes('seymour')) fontScale = 1.15;

  if ('I1!|:;.,\'"il'.includes(ch)) return sz * 0.25 * fontScale;
  if (ch === ' ') return sz * 0.28 * fontScale;
  if ('Jtfjr-()[]'.includes(ch)) return sz * 0.36 * fontScale;
  if ('ГТLEFZ7'.includes(ch)) return sz * 0.48 * fontScale;
  if ('ЖМФШЩЫЮMW@#%&—'.includes(ch)) return sz * 0.82 * fontScale;
  return sz * 0.58 * fontScale;
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

export function formatAssTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = Math.floor(s % 60);
  const cs = Math.floor((s % 1) * 100);
  return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/**
 * Build structured word event data for the Python PIL subtitle renderer.
 * Returns an array of { chunk_words, word_timings } objects.
 */
export function buildSpeechWordEvents({ speechText = '', duration = 20, totalAudioDuration = 0, speechPacing = 'wave', whisperWords = null } = {}) {
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
  if (Array.isArray(whisperWords) && whisperWords.length > 0) {
    timedWords = whisperWords
      .filter(tw => tw && tw.word && typeof tw.start === 'number' && tw.start < targetDur)
      .map(tw => ({ word: String(tw.word).trim(), start: Math.max(0, tw.start), end: Math.min(targetDur, Math.max(tw.start + 0.1, tw.end)) }));
  } else {
    const calcWeight = w => { let wt = w.length * 0.65 + 2.5; if (/[.!?]$/.test(w)) wt += 4.5; else if (/[,;—]$/.test(w)) wt += 2.2; return wt; };
    const allWeights = allWords.map(calcWeight);
    const totalWeight = allWeights.reduce((a, b) => a + b, 0) || 1;
    let cur = 0;
    for (let i = 0; i < allWords.length; i++) {
      const wDur = (allWeights[i] / totalWeight) * totalAudioDur;
      const wStart = cur, wEnd = cur + wDur;
      cur = wEnd;
      if (wStart < targetDur) timedWords.push({ word: allWords[i], start: wStart, end: Math.min(targetDur, wEnd) });
    }
  }
  if (timedWords.length === 0) return [];
  for (let i = 0; i < timedWords.length; i++) {
    if (i > 0 && timedWords[i].start < timedWords[i-1].end) timedWords[i].start = timedWords[i-1].end;
    if (timedWords[i].end <= timedWords[i].start) timedWords[i].end = timedWords[i].start + 0.18;
  }

  const isSingle   = speechPacing === 'single';
  const isTwoWords = speechPacing === 'blitz' || speechPacing === 'two';
  const maxWords   = isSingle ? 1 : (isTwoWords ? 2 : 4);
  const maxLen     = isSingle ? 14 : (isTwoWords ? 24 : 38);

  const waveChunks = [];
  let cur2 = [], curLen = 0;
  for (let i = 0; i < timedWords.length; i++) {
    const tw = timedWords[i];
    cur2.push(tw); curLen += tw.word.length;
    if (/[.!?]$/.test(tw.word) || cur2.length >= maxWords || curLen >= maxLen || i === timedWords.length - 1) {
      waveChunks.push(cur2); cur2 = []; curLen = 0;
    }
  }
  if (cur2.length > 0) waveChunks.push(cur2);

  return waveChunks.map((chunk, chunkIdx) => {
    const nextChunk = waveChunks[chunkIdx + 1];
    const chunkStart = Math.max(0, chunk[0].start);
    const lastEnd = chunk[chunk.length - 1].end;
    const maxEnd = nextChunk ? nextChunk[0].start : targetDur;
    const chunkEnd = Math.min(maxEnd, Math.max(chunkStart + 0.3, lastEnd + 0.15));

    return {
      chunk_words: chunk.map(tw => tw.word),
      word_timings: chunk.map((tw, wi) => {
        const nextTw = chunk[wi + 1];
        const activeStart = (wi === 0) ? chunkStart : tw.start;
        const activeEnd = nextTw ? nextTw.start : chunkEnd;
        return { word: tw.word, active_start: activeStart, active_end: Math.max(activeStart + 0.05, activeEnd) };
      }),
    };
  });
}

export function generateSpeechDialogueEvents(opts = {}) {

  const {
    speechText = '', duration = 20, totalAudioDuration = 0,
    speechFontSize = 115, speechColor = 'yellow', speechInactiveColor = 'white', speechPosY = 980,
    speechStrokeWidth = 12, speechStrokeColor = 'black',
    speechShadowDistance = 6, speechShadowColor = 'black',
    speechBoxMode = 'pill', speechBoxColor = 'black', speechBoxOpacity = 88,
    speechPacing = 'wave', speechFont = 'Russo One',
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
      .map(tw => ({
        word: String(tw.word).trim(),
        start: Math.max(0, tw.start),
        end: Math.min(targetDur, Math.max(tw.start + 0.1, tw.end)),
      }));
  } else {
    const calcWordWeight = (w) => {
      let weight = w.length * 0.65 + 2.5;
      if (/[.!?]$/.test(w)) weight += 4.5;
      else if (/[,;—]$/.test(w)) weight += 2.2;
      return weight;
    };

    const allWeights = allWords.map(calcWordWeight);
    const totalWeight = allWeights.reduce((a, b) => a + b, 0) || 1;

    let curTimeline = 0.0;
    for (let i = 0; i < allWords.length; i++) {
      const w = allWords[i];
      const wDur = (allWeights[i] / totalWeight) * totalAudioDur;
      const wStart = curTimeline;
      const wEnd = curTimeline + wDur;
      curTimeline = wEnd;

      if (wStart < targetDur) {
        timedWords.push({
          word: w,
          start: wStart,
          end: Math.min(targetDur, wEnd),
        });
      }
    }
  }

  if (timedWords.length === 0) return [];

  // Strictly enforce non-overlapping monotonic timeline
  for (let i = 0; i < timedWords.length; i++) {
    if (i > 0 && timedWords[i].start < timedWords[i - 1].start) {
      timedWords[i].start = timedWords[i - 1].end;
    }
    if (timedWords[i].end <= timedWords[i].start) {
      timedWords[i].end = timedWords[i].start + 0.18;
    }
  }

  const isSingle = speechPacing === 'single';
  const isTwoWords = speechPacing === 'blitz' || speechPacing === 'two';
  const maxWordsPerWave = isSingle ? 1 : (isTwoWords ? 2 : 4);
  const maxLenPerWave = isSingle ? 14 : (isTwoWords ? 24 : 38);

  const waveChunks = [];
  let curChunk = [];
  let curLen = 0;

  for (let i = 0; i < timedWords.length; i++) {
    const tw = timedWords[i];
    curChunk.push(tw);
    curLen += tw.word.length;
    const endsSentence = /[.!?]$/.test(tw.word);
    if (endsSentence || curChunk.length >= maxWordsPerWave || curLen >= maxLenPerWave || i === timedWords.length - 1) {
      waveChunks.push(curChunk);
      curChunk = [];
      curLen = 0;
    }
  }
  if (curChunk.length > 0) waveChunks.push(curChunk);
  if (waveChunks.length === 0) return [];

  const bW = Number(speechStrokeWidth) >= 0 ? Number(speechStrokeWidth) : 12;
  const sD = Number(speechShadowDistance) >= 0 ? Number(speechShadowDistance) : 6;
  const strokeTag = toShortsAssTagColor(speechStrokeColor || 'black');
  const shadowTag = toShortsAssTagColor(speechShadowColor || 'black');
  const highlightTag = toShortsAssTagColor(speechColor || 'yellow');
  const inactiveTag = toShortsAssTagColor(speechInactiveColor || 'white');

  const dialogues = [];

  waveChunks.forEach((chunk, chunkIdx) => {
    const nextChunk = waveChunks[chunkIdx + 1];
    const chunkStart = Math.max(0, chunk[0].start);
    const lastWordEnd = chunk[chunk.length - 1].end;
    const maxEnd = nextChunk ? nextChunk[0].start : targetDur;
    const chunkEnd = Math.min(maxEnd, Math.max(chunkStart + 0.3, lastWordEnd + 0.2));
    const chunkStartTime = formatAssTime(chunkStart);
    const chunkEndTime = formatAssTime(chunkEnd);

    let baseFontSize = Number(speechFontSize) || 115;
    let chunkTextW = 0;
    chunk.forEach((tw, idx) => {
      for (const c of tw.word) chunkTextW += estimateCharWidth(c, speechFont, baseFontSize);
      if (idx > 0) chunkTextW += baseFontSize * 0.30;
    });

    if (chunkTextW > 920) {
      baseFontSize = Math.max(68, Math.floor(baseFontSize * (920 / chunkTextW)));
      chunkTextW = 0;
      chunk.forEach((tw, idx) => {
        for (const c of tw.word) chunkTextW += estimateCharWidth(c, speechFont, baseFontSize);
        if (idx > 0) chunkTextW += baseFontSize * 0.30;
      });
    }

    if (speechBoxMode !== 'none') {
      const boxW = Math.min(1020, Math.max(180, Math.round(chunkTextW + 90)));
      const boxH = Math.round(baseFontSize * 0.92) + 32;
      const badgeX = Math.max(20, Math.round(540 - boxW / 2));
      const badgeY = Math.round(speechPosY - boxH / 2);
      const r = speechBoxMode === 'solid' ? 6 : 20;
      const poly = `m ${r} 0 l ${boxW - r} 0 l ${boxW} ${r} l ${boxW} ${boxH - r} l ${boxW - r} ${boxH} l ${r} ${boxH} l 0 ${boxH - r} l 0 ${r}`;
      
      const op = Math.max(0, Math.min(100, Number(speechBoxOpacity) || 88));
      const assAlphaNum = Math.round(255 * (1 - op / 100));
      const boxAlpha = assAlphaNum.toString(16).padStart(2, '0').toUpperCase();
      const rawHex = (speechBoxColor && BOX_COLORS.find(c => c.id === speechBoxColor)?.hex) || (typeof speechBoxColor === 'string' && speechBoxColor.startsWith('#') ? speechBoxColor : '#000000');
      const hex = rawHex.replace('#', '');
      const rHex = hex.slice(0, 2) || '00', gHex = hex.slice(2, 4) || '00', bHex = hex.slice(4, 6) || '00';
      const assBoxCol = `&H00${bHex}${gHex}${rHex}&`;
      const borderTag = speechBoxMode === 'glow' ? `\\bord5\\3c${highlightTag}` : '\\bord0';

      dialogues.push(`Dialogue: 1,${chunkStartTime},${chunkEndTime},Badge,,0,0,0,,{\\an7\\pos(${badgeX},${badgeY})\\fad(30,30)\\c${assBoxCol}\\1a&H${boxAlpha}&${borderTag}\\shad8\\blur4\\4c&H000000&\\4a&H${boxAlpha}&\\p1}${poly}{\\p0}`);
    }

    chunk.forEach((activeTw, activeIdx) => {
      const nextTw = chunk[activeIdx + 1];
      const wStartSec = (activeIdx === 0) ? chunkStart : activeTw.start;
      const wEndSec = nextTw ? nextTw.start : chunkEnd;
      const wStart = formatAssTime(wStartSec);
      const wEnd = formatAssTime(Math.max(wStartSec + 0.1, wEndSec));

      // Animate-in: scale from 100→115 over first 80ms, animate-out: 115→100 last 80ms
      const animMs = 80;
      const totalMs = Math.round((Math.max(wStartSec + 0.1, wEndSec) - wStartSec) * 1000);
      const animOut = Math.max(animMs, totalMs - animMs);

      const styledWords = chunk.map((tw, wIdx) => {
        const isCurrent = (wIdx === activeIdx);
        const colTag = isCurrent ? highlightTag : inactiveTag;
        const curBw = isCurrent ? bW + 2 : bW;
        const curSd = isCurrent ? sD + 2 : sD;

        if (isCurrent) {
          // Pop-in with smooth scale animation: start at 100, animate to 115 in 80ms, back to 100 at end
          const popTag = `\\fscx100\\fscy100\\t(0,${animMs},\\fscx115\\fscy115)\\t(${animOut},${totalMs},\\fscx108\\fscy108)`;
          return `{\\c${colTag}${popTag}\\fs${baseFontSize}\\bord${curBw}\\3c${strokeTag}\\shad${curSd}\\4c${shadowTag}}${tw.word.toUpperCase()}`;
        } else {
          return `{\\c${colTag}\\fscx100\\fscy100\\fs${baseFontSize}\\bord${bW}\\3c${strokeTag}\\shad${sD}\\4c${shadowTag}}${tw.word.toUpperCase()}`;
        }
      }).join(' ');

      dialogues.push(`Dialogue: 2,${wStart},${wEnd},Speech,,0,0,0,,{\\an5\\pos(540,${speechPosY})}${styledWords}`);
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
    speechPacing = 'wave', speechStrokeWidth = 12, speechShadowDistance = 6,
  } = options;

  const fontNameMap = {
    impact: 'Russo One',
    arial_black: 'Russo One',
    'Saxonia_Antiqua_Bold.ttf': 'Saxonia Antiqua Bold',
    'Saxonia_Antiqua.ttf': 'Saxonia Antiqua',
    'SeymourOne-Regular.ttf': 'Seymour One',
    'StalinistOne-Regular.ttf': 'Stalinist One',
    'Unbounded-Black.ttf': 'Unbounded',
    'Buran_USSR.ttf': 'Buran USSR',
    'RussoOne-Regular.ttf': 'Russo One',
    'DelaGothicOne-Regular.ttf': 'Dela Gothic One',
    'RubikMonoOne-Regular.ttf': 'Rubik Mono One',
    'PROPAGAN.ttf': 'Propaganda',
    'YesevaOne-Regular.ttf': 'Yeseva One',
  };
  const assFontName = fontNameMap[reqFont] || (reqFont ? String(reqFont).replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim() : 'Russo One');
  const assSpeechFontName = fontNameMap[speechFont] || fontNameMap[reqFont] || 'Russo One';
  const assOutlineCol = toShortsAssStyleColor(strokeColor || 'black', '00');
  const assShadowCol = toShortsAssStyleColor(shadowColor || 'black', '80');
  const bWidth = Number(strokeWidth) >= 0 ? Number(strokeWidth) : 8;
  const sDist = Number(shadowDistance) >= 0 ? Number(shadowDistance) : 4;
  const effectiveSize = Math.max(30, Math.min(Number(fontSize) || 110, 240));

  const lines = (showHookTitle !== false) ? String(wrappedText || '').split('\n').map(l => l.trim().toUpperCase()).filter(Boolean) : [];
  const bCfg = lineBadges || {};
  const isBadgesOn = bCfg.enabled || (boxEnabled && bCfg.enabled !== false);
  const dialogues = [];
  let wordIdx = 0;

  if (lines.length > 0) {
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
          const wSz = (wordFontSizes && wordFontSizes[curWIdx] && Number(wordFontSizes[curWIdx]) > 0) ? Number(wordFontSizes[curWIdx]) : effectiveSize;
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
          const wSz = (wordFontSizes && wordFontSizes[curIdx] && Number(wordFontSizes[curIdx]) > 0) ? Number(wordFontSizes[curIdx]) : effectiveSize;
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
          const wSz = (wordFontSizes && wordFontSizes[curIdx] && Number(wordFontSizes[curIdx]) > 0) ? Number(wordFontSizes[curIdx]) : effectiveSize;
          return `{\\c${toShortsAssTagColor(wCol)}\\fs${wSz}\\bord${bWidth}\\3c${toShortsAssTagColor(strokeColor || 'black')}\\shad${sDist}\\4c${toShortsAssTagColor(shadowColor || 'black')}}${w}`;
        }).join(' ');
      });
      dialogues.push(`Dialogue: 1,0:00:00.00,0:01:00.00,Title,,0,0,0,,{\\an8\\pos(540,${posY})}${assLines.join('\\N')}`);
    }
  }

  if (speechSubtitlesEnabled !== false && speechText) {
    const speechEvents = generateSpeechDialogueEvents({
      speechText, duration, totalAudioDuration, speechFontSize, speechColor, speechInactiveColor,
      speechPosY, speechStrokeWidth, speechStrokeColor: 'black',
      speechShadowDistance, speechShadowColor: 'black', speechBoxMode,
      speechBoxColor, speechBoxOpacity,
      speechPacing, speechFont: assSpeechFontName, whisperWords: options.whisperWords,
    });
    dialogues.push(...speechEvents);
  }

  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Title,${assFontName},${effectiveSize},&H0000E6FF,&H000000FF,${assOutlineCol},${assShadowCol},-1,0,0,0,100,100,0,0,1,${bWidth},${sDist},8,10,10,10,1\nStyle: Speech,${assSpeechFontName},${speechFontSize},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,${speechStrokeWidth},${speechShadowDistance},5,20,20,20,1\nStyle: Badge,Arial,20,&H00000000,&H00000000,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,0,0,7,0,0,0,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${dialogues.join('\n')}\n`;
}
