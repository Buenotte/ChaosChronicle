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

export function formatTitleLines(russianTitle, inputLines = null) {
  if (Array.isArray(inputLines) && inputLines.length > 0) {
    return inputLines
      .map(l => String(l).replace(/[\r\n\t]/g, ' ').trim().toUpperCase())
      .filter(Boolean);
  }
  if (typeof russianTitle === 'string' && russianTitle.includes('\n')) {
    return russianTitle
      .split('\n')
      .map(l => String(l).replace(/\r/g, '').trim().toUpperCase())
      .filter(Boolean);
  }

  const clean = String(russianTitle || '')
    .replace(/\r/g, '')
    .replace(/[\n\t]/g, ' ')
    .replace(/["'«»`]/g, '')
    .replace(/[^\p{L}\p{N}\s:!?-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return [];

  const words = clean.split(' ');
  let lines = [];
  let curLine = '';
  const targetCharsPerLine = 22;

  for (const w of words) {
    if ((curLine + ' ' + w).trim().length <= targetCharsPerLine) {
      curLine = (curLine + ' ' + w).trim();
    } else {
      if (curLine) lines.push(curLine);
      curLine = w;
      if (lines.length >= 3) break;
    }
  }
  if (curLine && lines.length < 3) lines.push(curLine);
  return lines.map(l => l.trim().toUpperCase()).filter(Boolean);
}

export function overlayRussianHeadlineOnThumbnail(imagePath, russianTitle, options = {}) {
  if (!imagePath || !fs.existsSync(imagePath) || !russianTitle) return;

  try {
    const {
      font = 'arialbd',
      fontSize = 'auto',
      fontColor = 'yellow',
      borderColor = 'black',
      borderWidth = 9,
      shadowColor = 'black@0.92',
      shadowDistance = 4,
      position = 'center',
      hasBox = false,
      isItalic = false,
      tiltAngle = 0,
      customLines: inputLines = null,
    } = options;

    const cleanLines = formatTitleLines(russianTitle, inputLines);
    if (cleanLines.length === 0) return;

    // Font size computation (allowing up to 160px)
    let finalFontSize = 78;
    if (fontSize && fontSize !== 'auto' && !isNaN(Number(fontSize))) {
      finalFontSize = Math.min(Math.max(Number(fontSize), 32), 160);
    } else {
      const longestLineLen = Math.max(...cleanLines.map(l => l.length), 10);
      finalFontSize = Math.floor(1200 / (longestLineLen * 0.62));
      if (finalFontSize > 92) finalFontSize = 92;
      if (finalFontSize < 50) finalFontSize = 50;
    }

    // Resolving font path (considering italic mapping)
    let resolvedFontKey = font;
    if (isItalic && ITALIC_FONT_MAP[font]) {
      resolvedFontKey = ITALIC_FONT_MAP[font];
    }

    let safeFontPath = AVAILABLE_FONTS[resolvedFontKey] || AVAILABLE_FONTS[font];
    if (!safeFontPath && font) {
      const customPath = path.join(customFontsDir, font);
      if (fs.existsSync(customPath)) {
        safeFontPath = customPath.replace(/\\/g, '/').replace(/:/g, '\\:');
      }
    }
    if (!safeFontPath) safeFontPath = AVAILABLE_FONTS['arialbd'];

    const lineHeight = Math.round(finalFontSize * 1.16);
    const totalTextHeight = cleanLines.length * lineHeight;

    let startY = 40;
    if (position === 'center') {
      startY = Math.max(Math.round((720 - totalTextHeight) / 2), 20);
    } else if (position === 'bottom') {
      startY = Math.max(720 - totalTextHeight - 35, 20);
    } else if (position === 'top') {
      startY = 40;
    }

    const colorVal = fontColor || 'yellow';
    const bColor = borderColor || 'black';
    const bWidth = Number(borderWidth) >= 0 ? Number(borderWidth) : 9;
    const sDist = Number(shadowDistance) >= 0 ? Number(shadowDistance) : 4;
    const sColor = shadowColor || 'black@0.92';
    const boxParam = hasBox ? ':box=1:boxcolor=black@0.72:boxborderw=20' : ':box=0';
    const numAngle = Number(tiltAngle) || 0;

    const drawtextFilters = cleanLines.map((line, idx) => {
      const safeText = line
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "'\\''")
        .replace(/:/g, '\\:')
        .replace(/%/g, '\\%');
      const yPos = startY + (idx * lineHeight);
      return `drawtext=fontfile='${safeFontPath}':text='${safeText}':fontsize=${finalFontSize}:fontcolor=${colorVal}:bordercolor=${bColor}:borderw=${bWidth}:shadowcolor=${sColor}:shadowx=${sDist}:shadowy=${sDist}${boxParam}:x=(w-text_w)/2:y=${yPos}`;
    });

    const tempOut = path.join(path.dirname(imagePath), 'temp_rendered_thumb.jpg');

    if (numAngle !== 0) {
      // Rotated text overlay pipeline
      const rad = (numAngle * Math.PI / 180).toFixed(6);
      const textFiltersStr = drawtextFilters.join(',');
      const filterComplex = `[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[base];color=c=black@0.0:s=1280x720:d=1,format=rgba,${textFiltersStr},rotate=${rad}:c=none:ow='rotw(${rad})':oh='roth(${rad})'[txt];[base][txt]overlay=(W-w)/2:(H-h)/2`;

      execFileSync('ffmpeg', ['-y', '-i', imagePath, '-filter_complex', filterComplex, '-frames:v', '1', '-q:v', '2', tempOut]);
    } else {
      // Direct text overlay pipeline
      const fullFilter = `scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,${drawtextFilters.join(',')}`;
      execFileSync('ffmpeg', ['-y', '-i', imagePath, '-vf', fullFilter, '-q:v', '2', tempOut]);
    }

    if (fs.existsSync(tempOut) && fs.statSync(tempOut).size > 5000) {
      fs.copyFileSync(tempOut, imagePath);
      try { fs.unlinkSync(tempOut); } catch {}
    }

    console.log(`🏷️ Headline (${font}, ${finalFontSize}px, italic: ${isItalic}, angle: ${numAngle}°, border: ${bWidth}px ${bColor}, shadow: ${sDist}px, pos: ${position}) gerendert:\n${cleanLines.join('\n')}`);
  } catch (err) {
    console.warn('Fehler beim Rendern der russischen Headline auf Thumbnail:', err.message);
  }
}
