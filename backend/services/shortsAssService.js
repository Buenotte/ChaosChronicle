export const FFMPEG_SHORTS_COLOR_MAP = {
  yellow: '#FFE600', white: '#FFFFFF', red: '#FF2A2A', cyan: '#00F0FF',
  green: '#00FF66', orange: '#FF8C00', black: '#000000', blue: '#1D4ED8', purple: '#7C3AED',
};

export const toShortsHex = (c) => (c && FFMPEG_SHORTS_COLOR_MAP[c]) ? FFMPEG_SHORTS_COLOR_MAP[c] : (c || '#FFE600');

export const toShortsAssColor = (col) => {
  const hex = toShortsHex(col).replace('#', '').trim();
  return hex.length === 6 ? `&H00${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}&` : '&H0000E6FF&';
};

export function buildAssShortsSubtitle(wrappedText, options) {
  const {
    font: reqFont, fontSize = 90, fontColor = 'yellow', strokeWidth = 8, strokeColor = 'black',
    shadowDistance = 4, shadowColor = 'black', posY = 200, wordColors, wordFontSizes,
  } = options;

  const fontNameMap = { impact: 'Impact', arial_black: 'Arial Black' };
  let assFontName = fontNameMap[reqFont] || (reqFont ? String(reqFont).replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim() : 'Impact');
  const assOutlineCol = toShortsAssColor(strokeColor || 'black');
  const assShadowCol = toShortsAssColor(shadowColor || 'black');
  const bWidth = Number(strokeWidth) >= 0 ? Number(strokeWidth) : 8;
  const sDist = Number(shadowDistance) >= 0 ? Number(shadowDistance) : 4;
  const baseSize = Math.max(30, Math.min(Number(fontSize) || 90, 240));

  const lines = wrappedText.split('\n').filter(Boolean);
  let wordIdx = 0;
  const assLines = lines.map((line) => {
    const words = line.split(/\s+/).filter(Boolean);
    return words.map(w => {
      const curIdx = wordIdx++;
      const wCol = (wordColors && wordColors[curIdx]) ? wordColors[curIdx] : fontColor;
      const wSz = (wordFontSizes && wordFontSizes[curIdx] && Number(wordFontSizes[curIdx]) > 0)
        ? Number(wordFontSizes[curIdx])
        : baseSize;
      return `{\\c${toShortsAssColor(wCol)}\\fs${wSz}}${w}`;
    }).join(' ');
  });

  const assDialogue = `{\\an8\\pos(540,${posY})}${assLines.join('\\N')}`;
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Title,${assFontName},${baseSize},&H0000E6FF,&H000000FF,${assOutlineCol},${assShadowCol},-1,0,0,0,100,100,0,0,1,${bWidth},${sDist},8,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\nDialogue: 0,0:00:00.00,0:01:00.00,Title,,0,0,0,,${assDialogue}\n`;
}
