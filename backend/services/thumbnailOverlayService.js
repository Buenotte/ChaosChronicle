import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const customFontsDir = path.resolve(__dirname, '../custom_fonts');
if (!fs.existsSync(customFontsDir)) {
  fs.mkdirSync(customFontsDir, { recursive: true });
}

export const AVAILABLE_FONTS = {
  'arialbd': 'C\\:/Windows/Fonts/arialbd.ttf',
  'arialbi': 'C\\:/Windows/Fonts/arialbi.ttf',
  'impact': 'C\\:/Windows/Fonts/impact.ttf',
  'segoeuib': 'C\\:/Windows/Fonts/segoeuib.ttf',
  'segoeuiib': 'C\\:/Windows/Fonts/segoeuiz.ttf',
  'tahomabd': 'C\\:/Windows/Fonts/tahomabd.ttf',
  'trebucbd': 'C\\:/Windows/Fonts/trebucbd.ttf',
  'trebucbi': 'C\\:/Windows/Fonts/trebucbi.ttf',
  'verdanab': 'C\\:/Windows/Fonts/verdanab.ttf',
  'verdanabi': 'C\\:/Windows/Fonts/verdanaz.ttf',
  'georgiab': 'C\\:/Windows/Fonts/georgiab.ttf',
  'georgiaz': 'C\\:/Windows/Fonts/georgiaz.ttf',
};

const ITALIC_FONT_MAP = {
  'arialbd': 'arialbi',
  'segoeuib': 'segoeuiib',
  'trebucbd': 'trebucbi',
  'verdanab': 'verdanabi',
  'georgiab': 'georgiaz',
};

export function getTtfFamilyName(fontName) {
  try {
    const fullPath = path.join(customFontsDir, fontName);
    if (!fs.existsSync(fullPath)) return null;
    const buf = fs.readFileSync(fullPath);
    const numTables = buf.readUInt16BE(4);
    let nameTableOffset = 0;
    for (let i = 0; i < numTables; i++) {
      if (buf.toString('ascii', 12 + i * 16, 12 + i * 16 + 4) === 'name') {
        nameTableOffset = buf.readUInt32BE(12 + i * 16 + 8);
        break;
      }
    }
    if (!nameTableOffset) return null;
    const count = buf.readUInt16BE(nameTableOffset + 2);
    const stringOffset = nameTableOffset + buf.readUInt16BE(nameTableOffset + 4);
    for (let i = 0; i < count; i++) {
      const rec = nameTableOffset + 6 + i * 12;
      const pid = buf.readUInt16BE(rec);
      const nid = buf.readUInt16BE(rec + 6);
      if (nid === 1) {
        const len = buf.readUInt16BE(rec + 8);
        const off = buf.readUInt16BE(rec + 10);
        let raw = '';
        if (pid === 3 || pid === 0) {
          const sl = Buffer.from(buf.subarray(stringOffset + off, stringOffset + off + len));
          sl.swap16();
          raw = sl.toString('utf16le').replace(/\0/g, '').trim();
        } else if (pid === 1) {
          raw = buf.toString('latin1', stringOffset + off, stringOffset + off + len).replace(/\0/g, '').trim();
        }
        if (raw) return raw.replace(/\s+(Bold|Regular|Italic|Medium|Light|SemiBold|Black|ExtraBold)$/i, '').trim();
      }
    }
  } catch {}
  return null;
}

export function formatTitleLines(russianTitle, inputLines = null) {
  if (Array.isArray(inputLines) && inputLines.length > 0) {
    return inputLines.map(l => String(l).replace(/[\r\n\t]/g, ' ').trim().toUpperCase()).filter(Boolean);
  }
  const str = String(russianTitle || '');
  if (str.includes('\n') || str.includes('\r')) {
    const manualLines = str.split(/\r?\n|\r/).map(l => String(l).replace(/["'«»`]/g, '').trim().toUpperCase()).filter(Boolean);
    if (manualLines.length > 0) return manualLines;
  }
  const clean = str.replace(/\r/g, '').replace(/[\n\t]/g, ' ').replace(/["'«»`]/g, '').replace(/[^\p{L}\p{N}\s:!?-]/gu, '').replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  const words = clean.split(' ');
  let lines = [], curLine = '';
  for (const w of words) {
    if ((curLine + ' ' + w).trim().length <= 16) { curLine = (curLine + ' ' + w).trim(); }
    else { if (curLine) lines.push(curLine); curLine = w; if (lines.length >= 4) break; }
  }
  if (curLine && lines.length < 4) lines.push(curLine);
  return lines.map(l => l.trim().toUpperCase()).filter(Boolean);
}

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
    const skew = Math.min(28, Math.max(14, Math.round(h * 0.25)));
    return `m ${skew} 0 l ${w} 0 l ${w - skew} ${h} l 0 ${h}`;
  }
  if (style === 'torn') {
    const s = 14; let pts = [`m 0 6`];
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

export const FFMPEG_COLOR_MAP = {
  yellow: '#FFE600', gold: '#F59E0B', white: '#FFFFFF', red: '#FF2A2A',
  coral: '#FF5722', orange: '#FF8C00', lime: '#A6FF00', green: '#00FF66',
  emerald: '#10B981', cyan: '#00F0FF', sky: '#38BDF8', blue: '#2563EB',
  fuchsia: '#FF007F', pink: '#EC4899', purple: '#A855F7', violet: '#8B5CF6',
  silver: '#E2E8F0', darkgray: '#64748B', black: '#000000', darkred: '#5B0606',
  darkblue: '#0A1931', darkgreen: '#064E3B', darkpurple: '#3B0764',
};

const toFfmpegColor = (col) => (col && FFMPEG_COLOR_MAP[col]) ? FFMPEG_COLOR_MAP[col] : (col || '#FFE600');
const toAssColor = (col) => { const hex = toFfmpegColor(col).replace('#', '').trim(); return hex.length === 6 ? `&H00${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}&` : '&H0000E6FF&'; };
const toAssColor6 = (col) => { const hex = toFfmpegColor(col).replace('#', '').trim(); return hex.length === 6 ? `&H${hex.slice(4, 6)}${hex.slice(2, 4)}${hex.slice(0, 2)}&` : '&H000000&'; };

export function overlayRussianHeadlineOnThumbnail(imagePath, russianTitle, options = {}) {
  if (!imagePath || !fs.existsSync(imagePath) || !russianTitle) return;

  try {
    const {
      font = 'impact', fontSize = 'auto', lineSpacing = 1.15, wordSpacing = 0,
      fontColor = 'yellow', borderColor = 'black', borderWidth = 9,
      shadowDistance = 4, position = 'center', hasBox = false,
      isItalic = false, tiltAngle = 0, customLines = null,
    } = options;

    const cleanLines = formatTitleLines(russianTitle, customLines || options.customLines);
    if (cleanLines.length === 0) return;

    const longestLineLen = Math.max(...cleanLines.map(l => l.length), 8);
    const maxFitSize = Math.floor(1160 / (longestLineLen * 0.65));
    const finalFontSize = (fontSize && fontSize !== 'auto' && !isNaN(Number(fontSize)))
      ? Math.min(Math.max(Number(fontSize), 32), 160)
      : Math.min(Math.max(maxFitSize, 48), 92);

    let assFontName = { impact: 'Impact', arialbd: 'Arial', segoeuib: 'Segoe UI', tahomabd: 'Tahoma', trebucbd: 'Trebuchet MS', verdanab: 'Verdana', georgiab: 'Georgia' }[font];
    if (!assFontName && font) assFontName = getTtfFamilyName(font);
    if (!assFontName && options.fontFamilyName) assFontName = String(options.fontFamilyName).replace(/["']/g, '').split(',')[0].replace(/_/g, ' ').trim();
    if (!assFontName && font) assFontName = String(font).replace(/\.[^.]+$/, '').replace(/_/g, ' ').trim();
    if (!assFontName) assFontName = 'Impact';

    const spacingMult = Number(lineSpacing || options.lineHeight || 1.15);
    const lineSizesList = Array.isArray(options.lineFontSizes) ? options.lineFontSizes : [];
    const lineHeights = cleanLines.map((_, idx) => {
      const sz = (lineSizesList[idx] && Number(lineSizesList[idx]) > 0) ? Math.min(Math.max(Number(lineSizesList[idx]), 32), 160) : finalFontSize;
      return Math.round(sz * (spacingMult > 0 ? spacingMult : 1.15));
    });
    const totalTextHeight = lineHeights.reduce((sum, h) => sum + h, 0);

    const defaultYPct = position === 'top' ? 12 : (position === 'bottom' ? 85 : 50);
    const rawYPct = (options.offsetY !== undefined && options.offsetY !== null && !isNaN(Number(options.offsetY))) ? Number(options.offsetY) : defaultYPct;
    const centerY = Math.round((Math.max(5, Math.min(95, rawYPct)) / 100) * 720);
    const posX = (options.offsetX !== undefined && options.offsetX !== null && !isNaN(Number(options.offsetX))) ? Math.max(5, Math.min(95, Number(options.offsetX))) : 50;
    const centerX = Math.round((posX / 100) * 1280);
    const startY = Math.max(10, Math.min(Math.round(centerY - totalTextHeight / 2), 710 - totalTextHeight));

    const colorVal = toFfmpegColor(fontColor || 'yellow'), lineColorsList = Array.isArray(options.lineColors) ? options.lineColors : [];
    const bColor = toFfmpegColor(borderColor || 'black'), bWidth = Number(borderWidth) >= 0 ? Number(borderWidth) : 9;
    const sDist = Number(shadowDistance) >= 0 ? Number(shadowDistance) : 4;
    const rawOp = Number(options.boxOpacity), op = (!isNaN(rawOp) && rawOp >= 10 && rawOp <= 100) ? (rawOp / 100).toFixed(2) : '0.75';
    const chosenBox = options.boxStyle || (hasBox ? 'dark_soft' : 'none');
    const numAngle = Number(tiltAngle) || 0;
    const bCfg = options.lineBadges || {};
    const isPerLineBadges = (chosenBox === 'per_line') || !!bCfg.enabled;
    const tempOut = path.join(path.dirname(imagePath), 'temp_rendered_thumb.jpg');

    const assOutlineCol = toAssColor(bColor);
    let wordCounter = 0, dialogues = [];

    if (isPerLineBadges) {
      const globalStyle = bCfg.style || 'solid', globalShadow = bCfg.shadow || 'soft';
      const globalOp = Number(bCfg.opacity !== undefined ? bCfg.opacity : options.boxOpacity);

      cleanLines.forEach((line, idx) => {
        const isLineOn = Array.isArray(bCfg.linesEnabled) ? bCfg.linesEnabled[idx] !== false : true;
        const bStyle = (Array.isArray(bCfg.lineStyles) && bCfg.lineStyles[idx]) ? bCfg.lineStyles[idx] : globalStyle;
        const bShadow = (Array.isArray(bCfg.lineShadows) && bCfg.lineShadows[idx]) ? bCfg.lineShadows[idx] : globalShadow;
        const rawBadgeOp = Number((Array.isArray(bCfg.lineOpacities) && bCfg.lineOpacities[idx] !== undefined) ? bCfg.lineOpacities[idx] : globalOp);
        const badgeOp = (!isNaN(rawBadgeOp) && rawBadgeOp >= 5 && rawBadgeOp <= 100) ? rawBadgeOp : 85;
        const alphaHex = Math.max(0, Math.min(255, Math.round((1 - badgeOp / 100) * 255))).toString(16).padStart(2, '0').toUpperCase();
        const shadW = bShadow === 'hard' ? 8 : (bShadow === 'glow' ? 6 : (bShadow === 'none' ? 0 : 4));
        const shadCol = bShadow === 'glow' ? '&H0B9EF5&' : '&H000000&', shadAlpha = bShadow === 'none' ? 'FF' : alphaHex;
        const borderTag = bStyle === 'dashed' ? '\\bord3\\3c&HFFFFFF&' : '\\bord0';

        const words = line.split(/\s+/).filter(Boolean);
        const lineSz = (lineSizesList[idx] && Number(lineSizesList[idx]) > 0) ? Number(lineSizesList[idx]) : finalFontSize;
        const curLineTop = startY + lineHeights.slice(0, idx).reduce((s, h) => s + h, 0);
        const lineCenterY = Math.round(curLineTop + lineHeights[idx] / 2);
        const pivotX = centerX, pivotY = lineCenterY;

        const defPadX = bStyle === 'slanted' ? 56 : (bStyle === 'torn' ? 56 : (bStyle === 'tape' ? 48 : 40));
        const defPadY = bStyle === 'torn' ? 14 : 10;
        const rawPadX = (Array.isArray(bCfg.linePadX) && bCfg.linePadX[idx] !== undefined) ? Number(bCfg.linePadX[idx]) : (bCfg.padX !== undefined ? Number(bCfg.padX) : defPadX);
        const rawPadY = (Array.isArray(bCfg.linePadY) && bCfg.linePadY[idx] !== undefined) ? Number(bCfg.linePadY[idx]) : (bCfg.padY !== undefined ? Number(bCfg.padY) : defPadY);
        const padX = Math.max(8, Math.min(160, !isNaN(rawPadX) ? rawPadX : defPadX));
        const padY = Math.max(2, Math.min(60, !isNaN(rawPadY) ? rawPadY : defPadY));
        const lineH = Math.round(lineSz * 0.74) + padY * 2;

        let lineTextW = 0;
        words.forEach((w, wIdx) => {
          for (const c of w) lineTextW += estimateCharWidth(c, font, lineSz);
          if (wIdx > 0) lineTextW += lineSz * 0.28;
        });
        const extraSp = Math.max(0, Math.floor(Number(wordSpacing || options.wordSpacing || 0) / 10));
        if (extraSp > 0) lineTextW += extraSp * lineSz * 0.3 * Math.max(0, words.length - 1);

        const approxW = Math.min(1240, Math.max(100, Math.round(lineTextW + padX * 2)));
        const badgeX = Math.round(pivotX - approxW / 2);
        const badgeY = Math.round(pivotY - lineH / 2);

        const zAngles = [-2.0, 1.8, -1.6, 2.0];
        const tiltOffset = (Array.isArray(bCfg.lineTilts) && bCfg.lineTilts[idx] !== undefined && Number(bCfg.lineTilts[idx]) !== 0)
          ? Number(bCfg.lineTilts[idx])
          : (bCfg.tiltMode === 'zigzag' ? zAngles[idx % 4] : (bCfg.tiltMode === 'custom' && Array.isArray(bCfg.lineTilts) && bCfg.lineTilts[idx] !== undefined ? Number(bCfg.lineTilts[idx]) : 0));
        const lAngle = -(numAngle + tiltOffset);
        const bCol = (Array.isArray(bCfg.lineColors) && bCfg.lineColors[idx]) ? bCfg.lineColors[idx] : (bCfg.color || '#000000');

        if (isLineOn) {
          const poly = getBadgeVector(bStyle, approxW, lineH, idx);
          dialogues.push(`Dialogue: 0,0:00:00.00,0:00:05.00,Badge,,0,0,0,,{\\an7\\pos(${badgeX},${badgeY})\\org(${pivotX},${pivotY})${lAngle !== 0 ? `\\frz${lAngle}` : ''}\\c${toAssColor6(bCol)}\\1a&H${alphaHex}&${borderTag}\\shad${shadW}\\4c${shadCol}\\4a&H${shadAlpha}&\\p1}${poly}{\\p0}`);
        }

        const lineCol = lineColorsList[idx] || colorVal;
        const wordFrags = words.map(w => {
          const curIdx = wordCounter++;
          const wCol = (options.wordColors && options.wordColors[curIdx]) ? options.wordColors[curIdx] : lineCol;
          const wSz = (options.wordFontSizes && options.wordFontSizes[curIdx] && Number(options.wordFontSizes[curIdx]) > 0) ? Number(options.wordFontSizes[curIdx]) : lineSz;
          return `{\\c${toAssColor(wCol)}\\fs${wSz}}${w}`;
        }).join(' '.repeat(1 + extraSp));
        dialogues.push(`Dialogue: 1,0:00:00.00,0:00:05.00,Title,,0,0,0,,{\\an5\\pos(${pivotX},${pivotY})\\org(${pivotX},${pivotY})${lAngle !== 0 ? `\\frz${lAngle}` : ''}\\fs${lineSz}}${wordFrags}`);
      });
    } else {
      cleanLines.forEach((line, idx) => {
        const words = line.split(/\s+/).filter(Boolean);
        const lineSz = (lineSizesList[idx] && Number(lineSizesList[idx]) > 0) ? Number(lineSizesList[idx]) : finalFontSize;
        const lineCol = lineColorsList[idx] || colorVal;
        const curLineTop = startY + lineHeights.slice(0, idx).reduce((s, h) => s + h, 0);
        const lineCenterY = Math.round(curLineTop + lineHeights[idx] / 2);
        const extraSp = Math.max(0, Math.floor(Number(wordSpacing || options.wordSpacing || 0) / 10));

        const wordFrags = words.map(w => {
          const curIdx = wordCounter++;
          const wCol = (options.wordColors && options.wordColors[curIdx]) ? options.wordColors[curIdx] : lineCol;
          const wSz = (options.wordFontSizes && options.wordFontSizes[curIdx] && Number(options.wordFontSizes[curIdx]) > 0) ? Number(options.wordFontSizes[curIdx]) : lineSz;
          return `{\\c${toAssColor(wCol)}\\fs${wSz}}${w}`;
        }).join(' '.repeat(1 + extraSp));
        dialogues.push(`Dialogue: 0,0:00:00.00,0:00:05.00,Title,,0,0,0,,{\\an5\\pos(${centerX},${lineCenterY})\\org(${centerX},${lineCenterY})${numAngle !== 0 ? `\\frz${-numAngle}` : ''}\\fs${lineSz}}${wordFrags}`);
      });
    }

    const BOX_COLOR_HEX_MAP = { dark_soft: 'black', dark_solid: 'black', red_accent: '#dc2626', yellow_highlight: '#f59e0b', blue_cyber: '#0f172a', purple_glass: '#3b0764' };
    const boxColor = BOX_COLOR_HEX_MAP[chosenBox] || 'black';
    const drawBoxFilter = (!isPerLineBadges && (chosenBox !== 'none' || hasBox)) ? `,drawbox=x=${Math.max(10, centerX - 560)}:y=${Math.max(10, startY - 20)}:w=1120:h=${totalTextHeight + 40}:color=${boxColor}@${op}:t=fill` : '';
    const assContent = `[Script Info]\nScriptType: v4.00+\nPlayResX: 1280\nPlayResY: 720\nWrapStyle: 2\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Badge,Impact,50,&H00000000,&H00000000,&H00000000,&H00000000,-1,0,0,0,100,100,0,0,1,0,5,7,10,10,10,1\nStyle: Title,${assFontName},${finalFontSize},&H0000E6FF,&H000000FF,${assOutlineCol},&H90000000,-1,${isItalic ? -1 : 0},0,0,100,100,0,0,1,${bWidth},${sDist},5,10,10,10,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${dialogues.join('\n')}\n`;

    const assTempFile = path.join(path.dirname(imagePath), `temp_thumb_${Date.now()}.ass`);
    fs.writeFileSync(assTempFile, assContent, 'utf-8');
    try {
      const safeAssPath = assTempFile.replace(/\\/g, '/').replace(/:/g, '\\:');
      const safeCustomFontsDir = customFontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');
      const vf = `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720${drawBoxFilter},subtitles=filename='${safeAssPath}':fontsdir='${safeCustomFontsDir}'`;
      execFileSync('ffmpeg', ['-y', '-i', imagePath, '-vf', vf, '-frames:v', '1', '-q:v', '2', tempOut]);
    } finally {
      try { fs.unlinkSync(assTempFile); } catch {}
    }

    if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 5000) {
      fs.copyFileSync(tempOut, imagePath);
      try { fs.unlinkSync(tempOut); } catch {}
    }
  } catch (err) {
    console.warn('Fehler beim Rendern der russischen Headline auf Thumbnail:', err.message);
  }
}
