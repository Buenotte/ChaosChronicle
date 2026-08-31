import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFileSync, execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

export function getAudioDurationSeconds(audioPath) {
  try {
    const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, { timeout: 8000 }).toString().trim();
    const d = parseFloat(out);
    return isNaN(d) || d <= 0 ? 16 : d;
  } catch {
    return 16;
  }
}

export function wrapShortsText(rawText, maxChars = 12) {
  const inputLines = String(rawText || '').split('\n');
  const wrappedLines = [];
  for (const line of inputLines) {
    const words = line.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) continue;
    let cur = '';
    for (const w of words) {
      if (!cur) {
        cur = w;
      } else if ((cur + ' ' + w).length <= maxChars) {
        cur += ' ' + w;
      } else {
        wrappedLines.push(cur);
        cur = w;
      }
    }
    if (cur) wrappedLines.push(cur);
  }
  return wrappedLines.join('\n');
}

export async function processRenderShort({
  bundleDir: inputBundleDir,
  folderName,
  duration = 16,
  hookTitle = '',
  font: reqFont = 'impact',
  fontSize = 90,
  fontColor = 'yellow',
  posY = 240,
  strokeWidth = 7,
  shadowStyle = 'hard',
  boxEnabled = true,
  boxColor = 'black',
  boxOpacity = 75,
}) {
  let targetFolder = inputBundleDir;
  if (!targetFolder && folderName) targetFolder = path.join(newsDir, folderName);
  if (!targetFolder || !fs.existsSync(targetFolder)) {
    if (fs.existsSync(newsDir)) {
      const searchTarget = folderName || (inputBundleDir ? path.basename(inputBundleDir) : '');
      const prefix = searchTarget.slice(0, 16);
      const entries = fs.readdirSync(newsDir, { withFileTypes: true });
      const matched = entries.find(e => e.isDirectory() && (e.name === searchTarget || (prefix && e.name.startsWith(prefix))));
      if (matched) targetFolder = path.join(newsDir, matched.name);
    }
  }
  if (!targetFolder || !fs.existsSync(targetFolder)) {
    throw new Error('Папка пакета не найдена');
  }

  const audioPath = path.join(targetFolder, 'audio.mp3');
  const photosDir = path.join(targetFolder, 'photos');
  const outShortPath = path.join(targetFolder, 'short.mp4');

  if (!fs.existsSync(audioPath)) {
    throw new Error('Файл audio.mp3 не найден. Сначала создайте аудио-озвучку в разделе 3!');
  }

  const totalAudioDur = getAudioDurationSeconds(audioPath);
  const targetDur = Math.min(Math.max(Number(duration) || 16, 10), Math.min(totalAudioDur, 60));

  let availablePhotos = [];
  if (fs.existsSync(photosDir)) {
    availablePhotos = fs.readdirSync(photosDir)
      .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
      .map(f => path.join(photosDir, f));
  }

  if (availablePhotos.length === 0) {
    const thumbPath = path.join(targetFolder, 'thumbnail', 'thumbnail.jpg');
    if (fs.existsSync(thumbPath)) availablePhotos.push(thumbPath);
  }

  if (availablePhotos.length === 0) {
    throw new Error('В пакете нет фотографий для монтажа Shorts');
  }

  // Берем первые 4–5 фото
  const selectedPhotos = availablePhotos.slice(0, 5);
  const photoCount = selectedPhotos.length;
  const perPhotoDur = targetDur / photoCount;

  // Извлекаем заголовок для верхнего бейджа
  let headerText = hookTitle;
  if (!headerText) {
    const jsonPath = path.join(targetFolder, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        headerText = manifest.title || '';
      } catch {}
    }
  }
  if (!headerText) {
    headerText = path.basename(targetFolder).replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, '').replace(/_/g, ' ');
  }
  const effectiveSize = Math.max(30, Math.min(Number(fontSize) || 90, 240));
  const maxChars = Math.max(4, Math.floor(920 / (effectiveSize * 0.58)));
  const wrappedText = wrapShortsText(headerText, maxChars);

  let formattedText = String(wrappedText).replace(/["'«»`]/g, '').trim().slice(0, 200);
  formattedText = formattedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const safeDrawText = formattedText.replace(/'/g, "'\\''").replace(/:/g, '\\:');

  // Определение шрифта для drawtext
  const customFontsDir = path.resolve(__dirname, '../custom_fonts');
  let fontPath = 'C\\:/Windows/Fonts/impact.ttf';
  if (reqFont === 'arial_black') {
    fontPath = 'C\\:/Windows/Fonts/ariblk.ttf';
  } else if (reqFont && reqFont.endsWith('.ttf')) {
    const customPath = path.join(customFontsDir, reqFont);
    if (fs.existsSync(customPath)) {
      fontPath = customPath.replace(/\\/g, '/').replace(/:/g, '\\:');
    }
  }

  const hexColorMap = {
    yellow: '#FFE600',
    white: '#FFFFFF',
    red: '#FF2A2A',
    cyan: '#00F0FF',
    green: '#00FF66',
    orange: '#FF8C00',
    black: '#000000',
    blue: '#1D4ED8',
    purple: '#7C3AED',
  };
  const effectiveColor = hexColorMap[fontColor] || fontColor || '#FFE600';
  const effectivePosY = Math.max(20, Math.min(Number(posY) || 240, 1800));
  const effectiveStroke = Math.max(0, Math.min(Number(strokeWidth) || 7, 28));
  const effectiveBoxOp = Math.max(0, Math.min(Number(boxOpacity) ?? 75, 100)) / 100;
  const isBoxOn = boxEnabled !== false && boxEnabled !== 'false' && effectiveBoxOp > 0;
  const effectiveBoxColor = hexColorMap[boxColor] || boxColor || '#000000';
  const boxFilterPart = isBoxOn ? `box=1:boxcolor=${effectiveBoxColor}@${effectiveBoxOp}:boxborderw=20:` : 'box=0:';

  let shadowParams = 'shadowcolor=black@0.9:shadowx=5:shadowy=5:';
  if (shadowStyle === 'soft') {
    shadowParams = 'shadowcolor=black@0.55:shadowx=3:shadowy=3:';
  } else if (shadowStyle === 'glow_red') {
    shadowParams = 'shadowcolor=0xFF0033@0.95:shadowx=0:shadowy=0:';
  } else if (shadowStyle === 'glow_yellow') {
    shadowParams = 'shadowcolor=0xFFE600@0.95:shadowx=0:shadowy=0:';
  } else if (shadowStyle === 'glow_cyan') {
    shadowParams = 'shadowcolor=0x00F0FF@0.95:shadowx=0:shadowy=0:';
  } else if (shadowStyle === 'none') {
    shadowParams = 'shadowcolor=black@0:shadowx=0:shadowy=0:';
  }

  // Сборка 9:16 видео через единый сверхбыстрый проход FFmpeg (Concat Demuxer)
  const concatListFile = path.join(targetFolder, `temp_short_photos_${Date.now()}.txt`);
  try {
    let concatContent = '';
    for (let i = 0; i < selectedPhotos.length; i++) {
      const picPath = selectedPhotos[i].replace(/\\/g, '/');
      concatContent += `file '${picPath}'\nduration ${perPhotoDur.toFixed(3)}\n`;
    }
    // В concat demuxer последнее фото дублируется для соблюдения тайминга
    concatContent += `file '${selectedPhotos[selectedPhotos.length - 1].replace(/\\/g, '/')}'\n`;
    fs.writeFileSync(concatListFile, concatContent, 'utf-8');

    // Фильтры: масштабирование 1080x1920 + заголовок
    const drawtext = `drawtext=fontfile='${fontPath}':text='${safeDrawText}':fontsize=${effectiveSize}:line_spacing=18:fontcolor=${effectiveColor}:bordercolor=black:borderw=${effectiveStroke}:${shadowParams}${boxFilterPart}x=(w-text_w)/2:y=${effectivePosY}`;
    const vf = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,${drawtext}`;

    const fadeOutStart = Math.max(0, targetDur - 0.4);
    const af = `atrim=0:${targetDur},asetpts=PTS-STARTPTS,afade=t=out:st=${fadeOutStart}:d=0.4`;

    execFileSync('ffmpeg', [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListFile,
      '-i', audioPath,
      '-vf', vf,
      '-af', af,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '22',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      '-shortest',
      outShortPath
    ], { timeout: 120000 });
  } finally {
    try { if (fs.existsSync(concatListFile)) fs.unlinkSync(concatListFile); } catch {}
  }

  const shortsConfig = {
    hookTitle,
    font: reqFont,
    fontSize: effectiveSize,
    fontColor,
    posY: effectivePosY,
    strokeWidth: effectiveStroke,
    shadowStyle,
    boxEnabled,
    boxColor,
    boxOpacity,
  };

  // Обновляем project.json
  const jsonPath = path.join(targetFolder, 'project.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      manifest.hasShort = true;
      manifest.short = 'short.mp4';
      manifest.short_duration = targetDur;
      manifest.short_updated_at = new Date().toISOString();
      manifest.shortsConfig = shortsConfig;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {}
  }

  const resFolder = path.basename(targetFolder);
  return {
    success: true,
    shortUrl: `/news-static/${resFolder}/short.mp4?t=${Date.now()}`,
    folderName: resFolder,
    duration: targetDur,
    shortsConfig,
  };
}
