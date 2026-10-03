import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { execFile, execSync, spawn } from 'child_process';
import { promisify } from 'util';
import { buildAssShortsSubtitle, buildAssVideoSubtitle, FFMPEG_SHORTS_COLOR_MAP } from './shortsAssService.js';

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

const activeShortsJobs = new Map();

export function cancelShortRender(key) {
  if (!key) return false;
  let canceled = false;
  const search = String(key).toLowerCase().replace(/\\/g, '/');
  for (const [k, job] of activeShortsJobs.entries()) {
    const normK = String(k).toLowerCase().replace(/\\/g, '/');
    if (normK === search || normK.includes(search) || search.includes(normK)) {
      job.canceled = true;
      if (job.proc && !job.proc.killed) {
        try { job.proc.kill('SIGTERM'); } catch {}
        try { job.proc.kill('SIGKILL'); } catch {}
      }
      if (Array.isArray(job.tempFiles)) {
        for (const f of job.tempFiles) {
          try {
            if (fs.existsSync(f) && fs.statSync(f).isDirectory()) fs.rmSync(f, { recursive: true, force: true });
            else if (fs.existsSync(f)) fs.unlinkSync(f);
          } catch {}
        }
      }
      activeShortsJobs.delete(k);
      canceled = true;
    }
  }
  return canceled;
}

export function getAudioDurationSeconds(audioPath) {
  try {
    const out = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`, { timeout: 8000 }).toString().trim();
    const d = parseFloat(out);
    return isNaN(d) || d <= 0 ? 16 : d;
  } catch { return 16; }
}

export function wrapShortsText(rawText, maxChars = 12) {
  if (typeof rawText === 'string' && rawText.includes('\n')) {
    const userLines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    if (userLines.length > 0) return userLines.join('\n');
  }
  const words = String(rawText || '').replace(/[\r\n\t]/g, ' ').replace(/["'«»`]/g, '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  const wrappedLines = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (!cur) cur = w;
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
    else { wrappedLines.push(cur); cur = w; }
  }
  if (cur) wrappedLines.push(cur);
  return wrappedLines.join('\n');
}

export function resolveShortsPhoto(photoPath, targetFolder) {
  if (!photoPath) return null;
  const clean = String(photoPath).split('?')[0];
  if (path.isAbsolute(clean) && fs.existsSync(clean)) return clean;
  if (clean.startsWith('/news-static/')) {
    const cand = path.join(newsDir, decodeURIComponent(clean.replace('/news-static/', '')));
    if (fs.existsSync(cand)) return cand;
  }
  if (clean.includes('thumbnail')) {
    const t1 = path.join(targetFolder, 'thumbnail', 'thumbnail.jpg'), t2 = path.join(targetFolder, 'thumbnail', 'raw_background.jpg'), t3 = path.join(targetFolder, 'thumbnail.jpg');
    if (fs.existsSync(t1)) return t1;
    if (fs.existsSync(t2)) return t2;
    if (fs.existsSync(t3)) return t3;
  }
  const photosDir = path.join(targetFolder, 'photos');
  const candPhotos = path.join(photosDir, path.basename(clean));
  if (fs.existsSync(candPhotos)) return candPhotos;
  const candRel = path.join(targetFolder, clean.replace(/^[/\\]+/, ''));
  if (fs.existsSync(candRel)) return candRel;
  return null;
}

export function extractCleanSpeechText(raw) {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw;
  if (text.includes('##') && /##\s*🎬?\s*Сценарий/i.test(text)) {
    const parts = text.split(/##\s*🎬?\s*Сценарий/i);
    if (parts[1]) text = parts[1];
  }
  return text.replace(/\[B-Roll:[^\]]*\]/gi, ' ').replace(/#+\s*[^\r\n]+/g, ' ').replace(/---+/g, ' ').replace(/[*_`«»"']/g, ' ').replace(/[\r\n\t]+/g, ' ').trim();
}

function getSpeechText(targetFolder, customText) {
  if (customText && typeof customText === 'string') return extractCleanSpeechText(customText);
  const txtPath = path.join(targetFolder, 'script.txt'), mdPath = path.join(targetFolder, 'script.md');
  if (fs.existsSync(txtPath)) { try { const c = fs.readFileSync(txtPath, 'utf-8'); if (c?.trim()) return extractCleanSpeechText(c); } catch {} }
  if (fs.existsSync(mdPath)) { try { const c = fs.readFileSync(mdPath, 'utf-8'); if (c?.trim()) return extractCleanSpeechText(c); } catch {} }
  return '';
}

export async function getWhisperTimedWords(audioPath, targetDur, targetFolder) {
  if (!audioPath || !fs.existsSync(audioPath)) return null;
  const cachePath = path.join(targetFolder, `whisper_words_${Math.round(targetDur)}.json`);
  if (fs.existsSync(cachePath)) {
    try { const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8')); if (Array.isArray(data) && data.length > 0) return data; } catch {}
  }
  return null;
}

export async function processRenderShort({
  bundleDir: inputBundleDir, folderName, duration = 16, hookTitle = '', showHookTitle = true, font: reqFont = 'impact',
  fontSize = 90, fontColor = 'yellow', strokeWidth = 8, strokeColor = 'black', shadowDistance = 4, shadowColor = 'black',
  wordColors = null, wordFontSizes = null, posY = 200, lineSpacing = 20, shadowStyle = 'hard', boxEnabled = true, boxColor = 'black', boxOpacity = 75,
  lineBadges = null, selectedPhoto = null, speechSubtitlesEnabled = true, speechColor = 'yellow', speechInactiveColor = 'white',
  speechFontSize = 115, speechPosY = 980, speechFont = 'impact', speechBoxMode = 'pill', speechBoxColor = 'black',
  speechBoxOpacity = 88, speechPacing = 'wave', speechStrokeWidth = 12, speechShadowDistance = 6, speechLineSpacing = 10, speechWordSpacing = 14, speechText: inputSpeech = null,
}) {
  let targetFolder = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);
  if (!targetFolder || !fs.existsSync(targetFolder)) {
    if (fs.existsSync(newsDir)) {
      const searchTarget = folderName || (inputBundleDir ? path.basename(inputBundleDir) : '');
      const prefix = searchTarget.slice(0, 16);
      const entries = fs.readdirSync(newsDir, { withFileTypes: true });
      const matched = entries.find(e => e.isDirectory() && (e.name === searchTarget || (prefix && e.name.startsWith(prefix))));
      if (matched) targetFolder = path.join(newsDir, matched.name);
    }
  }
  if (!targetFolder || !fs.existsSync(targetFolder)) throw new Error('Папка пакета не найдена');

  const audioPath = path.join(targetFolder, 'audio.mp3'), photosDir = path.join(targetFolder, 'photos'), outShortPath = path.join(targetFolder, 'short.mp4');
  if (!fs.existsSync(audioPath)) throw new Error('Файл audio.mp3 не найден. Сначала создайте аудио-озвучку!');

  const totalAudioDur = getAudioDurationSeconds(audioPath);
  const targetDur = Math.min(Math.max(Number(duration) || 20, 10), Math.min(totalAudioDur, 60));

  let availablePhotos = fs.existsSync(photosDir) ? fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).map(f => path.join(photosDir, f)) : [];
  const rawBgPath = path.join(targetFolder, 'thumbnail', 'raw_background.jpg');
  if (fs.existsSync(rawBgPath) && !availablePhotos.includes(rawBgPath)) availablePhotos.unshift(rawBgPath);
  if (availablePhotos.length === 0) {
    const thumbPath = path.join(targetFolder, 'thumbnail', 'thumbnail.jpg');
    if (fs.existsSync(thumbPath)) availablePhotos.push(thumbPath);
  }
  if (availablePhotos.length === 0) throw new Error('В пакете нет фотографий для монтажа Shorts');

  let selectedPhotos = [...availablePhotos];
  if (selectedPhoto) {
    const customPath = resolveShortsPhoto(selectedPhoto, targetFolder);
    if (customPath && fs.existsSync(customPath)) selectedPhotos = [customPath, ...availablePhotos.filter(p => path.resolve(p) !== path.resolve(customPath))];
  }
  const photoCountLimit = Math.max(3, Math.min(availablePhotos.length, Math.round(targetDur / 3)));
  selectedPhotos = selectedPhotos.slice(0, photoCountLimit);
  const perPhotoDur = targetDur / selectedPhotos.length;

  let headerText = hookTitle;
  if (!headerText) {
    const jsonPath = path.join(targetFolder, 'project.json');
    if (fs.existsSync(jsonPath)) { try { headerText = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')).title || ''; } catch {} }
  }
  if (!headerText) headerText = path.basename(targetFolder).replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, '').replace(/_/g, ' ');

  const effectiveSize = Math.max(30, Math.min(Number(fontSize) || 90, 240));
  const wrappedText = wrapShortsText(headerText, Math.max(4, Math.floor(920 / (effectiveSize * 0.58))));
  const customFontsDir = path.resolve(__dirname, '../custom_fonts');
  const effectiveStrokeColor = FFMPEG_SHORTS_COLOR_MAP[strokeColor] || strokeColor || '#000000';

  const speechText = getSpeechText(targetFolder, inputSpeech);
  const whisperWords = await getWhisperTimedWords(audioPath, targetDur, targetFolder);
  const concatListFile = path.join(targetFolder, `temp_short_photos_${Date.now()}.txt`), tempFiles = [concatListFile];

  try {
    const normFramesDir = path.join(targetFolder, `temp_norm_frames_${Date.now()}`);
    if (!fs.existsSync(normFramesDir)) fs.mkdirSync(normFramesDir, { recursive: true });
    tempFiles.push(normFramesDir);

    const normPhotoPaths = [];
    const blurFilter = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuv420p';
    for (let i = 0; i < selectedPhotos.length; i++) {
      const outNorm = path.join(normFramesDir, `photo_${String(i).padStart(3, '0')}.jpg`);
      await execFileAsync('ffmpeg', ['-y', '-v', 'error', '-threads', '2', '-i', selectedPhotos[i], '-vf', blurFilter, '-q:v', '2', outNorm]);
      normPhotoPaths.push(outNorm.replace(/\\/g, '/'));
    }

    const activePhotos = normPhotoPaths.length > 0 ? normPhotoPaths : selectedPhotos.map(p => p.replace(/\\/g, '/'));
    const photoDuration = targetDur / activePhotos.length;
    let concatContent = '';
    for (let i = 0; i < activePhotos.length; i++) concatContent += `file '${activePhotos[i]}'\nduration ${photoDuration.toFixed(3)}\n`;
    concatContent += `file '${activePhotos[activePhotos.length - 1]}'\n`;
    fs.writeFileSync(concatListFile, concatContent, 'utf-8');

    const fadeOutStart = Math.max(0, targetDur - 0.4), af = `atrim=0:${targetDur},asetpts=PTS-STARTPTS,afade=t=out:st=${fadeOutStart}:d=0.4`;

    const assContent = buildAssShortsSubtitle(wrappedText, {
      font: reqFont, fontSize: effectiveSize, fontColor, strokeWidth: Math.max(0, Math.min(Number(strokeWidth) ?? 8, 28)),
      strokeColor: effectiveStrokeColor, shadowDistance: Math.max(0, Math.min(Number(shadowDistance) ?? 4, 30)), shadowColor,
      posY: Math.max(20, Math.min(Number(posY) || 200, 1800)), lineSpacing: Number(lineSpacing ?? 20), wordColors, wordFontSizes, lineBadges, boxEnabled, boxColor, boxOpacity,
      showHookTitle: showHookTitle !== false, speechSubtitlesEnabled: speechSubtitlesEnabled !== false, speechText, duration: targetDur,
      totalAudioDuration: totalAudioDur, speechFontSize: Number(speechFontSize) || 115, speechColor: speechColor || 'yellow',
      speechInactiveColor: speechInactiveColor || 'white', speechPosY: Number(speechPosY) || 980, speechFont: speechFont || reqFont || 'impact',
      speechBoxMode: speechBoxMode || 'pill', speechBoxColor: speechBoxColor || 'black', speechBoxOpacity: Number(speechBoxOpacity) || 88,
      speechPacing: speechPacing || 'wave', speechStrokeWidth: Number(speechStrokeWidth) || 12, speechShadowDistance: Number(speechShadowDistance) || 6,
      speechLineSpacing: Number(speechLineSpacing ?? 10), speechWordSpacing: Number(speechWordSpacing ?? 14), whisperWords,
    });
    const assFile = path.join(os.tmpdir(), `short_ass_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.ass`);
    tempFiles.push(assFile);
    fs.writeFileSync(assFile, assContent, 'utf-8');
    const safeAssPath = assFile.replace(/\\/g, '/').replace(/:/g, '\\:'), safeFontsDir = customFontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');
    const vf = `fps=30,setsar=1,subtitles=filename='${safeAssPath}':fontsdir='${safeFontsDir}'`;

    const jobKey = path.resolve(targetFolder);
    const currentJob = { proc: null, canceled: false, tempFiles };
    activeShortsJobs.set(jobKey, currentJob);

    await new Promise((resolve, reject) => {
      const proc = spawn('ffmpeg', [
        '-y', '-f', 'concat', '-safe', '0', '-i', concatListFile, '-i', audioPath,
        '-vf', vf, '-af', af, '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'fastdecode',
        '-threads', '0', '-crf', '22', '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
        '-pix_fmt', 'yuv420p', '-r', '30', '-shortest', outShortPath,
      ], { cwd: targetFolder });
      currentJob.proc = proc;

      let stderrChunks = '';
      proc.stderr.on('data', (d) => {
        stderrChunks += d.toString();
        if (stderrChunks.length > 60000) stderrChunks = stderrChunks.slice(-30000);
      });

      proc.on('close', (code) => {
        if (currentJob.canceled) return reject(new Error('Монтаж отменен'));
        if (code !== 0) {
          console.error('FFmpeg Shorts render error (code ' + code + '):', stderrChunks);
          return reject(new Error(`Ошибка FFmpeg (${code}): ${stderrChunks.slice(-600) || 'сбой кодирования'}`));
        }
        resolve();
      });

      proc.on('error', (err) => {
        reject(err);
      });
    });
  } finally {
    activeShortsJobs.delete(path.resolve(targetFolder));
    for (const f of tempFiles) {
      try {
        if (!f) continue;
        if (fs.existsSync(f) && fs.statSync(f).isDirectory()) fs.rmSync(f, { recursive: true, force: true });
        else if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {}
    }
  }

  const shortsConfig = {
    duration: targetDur, hookTitle, showHookTitle: showHookTitle !== false, font: reqFont, fontSize: effectiveSize,
    fontColor, posY: Math.max(20, Math.min(Number(posY) || 200, 1800)), lineSpacing: Number(lineSpacing ?? 20),
    strokeWidth: Math.max(0, Math.min(Number(strokeWidth) ?? 8, 28)), strokeColor: effectiveStrokeColor,
    shadowDistance: Math.max(0, Math.min(Number(shadowDistance) ?? 4, 30)), shadowColor, wordColors, wordFontSizes, shadowStyle, boxEnabled,
    boxColor, boxOpacity, lineBadges: lineBadges || null, selectedPhoto, speechSubtitlesEnabled: speechSubtitlesEnabled !== false,
    speechFont: speechFont || reqFont || 'impact', speechColor: speechColor || 'yellow', speechInactiveColor: speechInactiveColor || 'white',
    speechFontSize: Number(speechFontSize) || 115, speechPosY: Number(speechPosY) || 980, speechBoxMode: speechBoxMode || 'pill',
    speechBoxColor: speechBoxColor || 'black', speechBoxOpacity: Number(speechBoxOpacity) || 88, speechPacing: speechPacing || 'wave',
    speechStrokeWidth: Number(speechStrokeWidth) || 12, speechShadowDistance: Number(speechShadowDistance) || 6,
    speechLineSpacing: Number(speechLineSpacing ?? 10), speechWordSpacing: Number(speechWordSpacing ?? 14),
  };

  const jsonPath = path.join(targetFolder, 'project.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      manifest.hasShort = true; manifest.short = 'short.mp4'; manifest.short_duration = targetDur;
      manifest.short_updated_at = new Date().toISOString(); manifest.shortsConfig = shortsConfig;
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {}
  }

  const shortsConfigPath = path.join(targetFolder, 'shorts_config.json');
  try {
    fs.writeFileSync(shortsConfigPath, JSON.stringify(shortsConfig, null, 2), 'utf-8');
  } catch {}

  const resFolder = path.basename(targetFolder);
  return { success: true, shortUrl: `/news-static/${resFolder}/short.mp4?t=${Date.now()}`, folderName: resFolder, duration: targetDur, shortsConfig };
}

export async function processPreviewShortFrame(options) {
  const {
    bundleDir: inputBundleDir, folderName, selectedPhoto, hookTitle = '', showHookTitle = true, font: reqFont = 'impact',
    fontSize = 90, fontColor = 'yellow', strokeWidth = 8, strokeColor = 'black', shadowDistance = 4, shadowColor = 'black',
    wordColors = null, wordFontSizes = null, posY = 200, lineSpacing = 20, shadowStyle = 'hard', boxEnabled = true, boxColor = 'black', boxOpacity = 75,
    lineBadges = null, speechSubtitlesEnabled = true, speechColor = 'yellow', speechInactiveColor = 'white', speechFontSize = 115,
    speechPosY = 980, speechFont = 'impact', speechBoxMode = 'pill', speechBoxColor = 'black', speechBoxOpacity = 88,
    speechPacing = 'wave', speechStrokeWidth = 12, speechShadowDistance = 6, speechLineSpacing = 10, speechWordSpacing = 14, speechText: inputSpeech = null,
  } = options;

  let targetFolder = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);
  if (!targetFolder || !fs.existsSync(targetFolder)) throw new Error('Папка не найдена');
  const photosDir = path.join(targetFolder, 'photos');
  let basePhoto = resolveShortsPhoto(selectedPhoto, targetFolder);
  if (!basePhoto || !fs.existsSync(basePhoto)) {
    const files = fs.existsSync(photosDir) ? fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)) : [];
    basePhoto = files[0] ? path.join(photosDir, files[0]) : path.join(targetFolder, 'thumbnail', 'thumbnail.jpg');
  }
  if (!fs.existsSync(basePhoto)) throw new Error('Фото не найдено');

  const effectiveSize = Math.max(30, Math.min(Number(fontSize) || 90, 240));
  const wrappedText = wrapShortsText(hookTitle || path.basename(targetFolder).replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, '').replace(/_/g, ' '), Math.max(4, Math.floor(920 / (effectiveSize * 0.58))));
  const customFontsDir = path.resolve(__dirname, '../custom_fonts'), previewOut = path.join(targetFolder, 'preview_short_frame.jpg');
  const speechText = getSpeechText(targetFolder, inputSpeech);
  let assFile = null;

  try {
    const assContent = buildAssShortsSubtitle(wrappedText, {
      font: reqFont, fontSize: effectiveSize, fontColor, strokeWidth: Math.max(0, Math.min(Number(strokeWidth) ?? 8, 28)),
      strokeColor: FFMPEG_SHORTS_COLOR_MAP[strokeColor] || strokeColor || '#000000',
      shadowDistance: Math.max(0, Math.min(Number(shadowDistance) ?? 4, 30)), shadowColor, posY: Math.max(20, Math.min(Number(posY) || 200, 1800)),
      lineSpacing: Number(lineSpacing ?? 20),
      wordColors, wordFontSizes, lineBadges, boxEnabled, boxColor, boxOpacity, showHookTitle: showHookTitle !== false,
      speechSubtitlesEnabled: speechSubtitlesEnabled !== false, speechText, duration: 20, totalAudioDuration: 20,
      speechFontSize: Number(speechFontSize) || 115, speechColor: speechColor || 'yellow', speechInactiveColor: speechInactiveColor || 'white',
      speechPosY: Number(speechPosY) || 980, speechFont: speechFont || reqFont || 'impact', speechBoxMode: speechBoxMode || 'pill',
      speechBoxColor: speechBoxColor || 'black', speechBoxOpacity: Number(speechBoxOpacity) || 88, speechPacing: speechPacing || 'wave',
      speechStrokeWidth: Number(speechStrokeWidth) || 12, speechShadowDistance: Number(speechShadowDistance) || 6,
      speechLineSpacing: Number(speechLineSpacing ?? 10), speechWordSpacing: Number(speechWordSpacing ?? 14), whisperWords: null,
    });
    assFile = path.join(os.tmpdir(), `preview_short_ass_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.ass`);
    fs.writeFileSync(assFile, assContent, 'utf-8');
    const safeAssPath = assFile.replace(/\\/g, '/').replace(/:/g, '\\:'), safeFontsDir = customFontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');
    const vf = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,subtitles=filename='${safeAssPath}':fontsdir='${safeFontsDir}'`;
    await execFileAsync('ffmpeg', ['-y', '-i', basePhoto, '-vf', vf, '-frames:v', '1', '-q:v', '2', previewOut]);
  } finally {
    if (assFile && fs.existsSync(assFile)) { try { fs.unlinkSync(assFile); } catch {} }
  }

  const resFolder = path.basename(targetFolder);
  return { success: true, frameUrl: `/news-static/${resFolder}/preview_short_frame.jpg?t=${Date.now()}` };
}

export async function processPreviewVideoFrame(options) {
  const {
    bundleDir: inputBundleDir, folderName, selectedPhoto,
    speechSubtitlesEnabled = true, subtitleColor = 'yellow', subtitleInactiveColor = 'white',
    subtitleFontSize = 44, subtitlePosY = 960, subtitleFont = 'RussoOne-Regular.ttf',
    subtitleBoxMode = 'pill', subtitleBoxColor = 'black', subtitleBoxOpacity = 82,
    subtitlePacing = 'wave', subtitleStrokeWidth = 4, subtitleShadowDistance = 2,
    subtitleLineMode = 'auto', subtitleMaxWords = 0, subtitleMaxChars = 0,
    subtitleWordSpacing = 10, subtitleLineSpacing = 10,
    wordColors = null, wordFontSizes = null,
    speechText: inputSpeech = null,
  } = options;

  let targetFolder = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);
  if (!targetFolder || !fs.existsSync(targetFolder)) {
    if (fs.existsSync(newsDir)) {
      const searchTarget = folderName || (inputBundleDir ? path.basename(inputBundleDir) : '');
      const prefix = searchTarget.slice(0, 16);
      const entries = fs.readdirSync(newsDir, { withFileTypes: true });
      const matched = entries.find(e => e.isDirectory() && (e.name === searchTarget || (prefix && e.name.startsWith(prefix))));
      if (matched) targetFolder = path.join(newsDir, matched.name);
    }
  }
  if (!targetFolder || !fs.existsSync(targetFolder)) throw new Error('Папка не найдена');

  const photosDir = path.join(targetFolder, 'photos');
  let basePhoto = resolveShortsPhoto(selectedPhoto, targetFolder);
  if (!basePhoto || !fs.existsSync(basePhoto)) {
    const files = fs.existsSync(photosDir) ? fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)) : [];
    basePhoto = files[0] ? path.join(photosDir, files[0]) : path.join(targetFolder, 'thumbnail', 'thumbnail.jpg');
  }
  if (!fs.existsSync(basePhoto)) throw new Error('Фото не найдено');

  const customFontsDir = path.resolve(__dirname, '../custom_fonts');
  const previewOut = path.join(targetFolder, 'preview_video_frame.jpg');
  const speechText = getSpeechText(targetFolder, inputSpeech);
  let assFile = null;

  try {
    const assContent = buildAssVideoSubtitle(speechText || 'Пример караоке субтитров на горизонтальном видео 16:9', {
      duration: 20,
      totalAudioDuration: 20,
      speechFontSize: Math.max(16, Math.min(Number(subtitleFontSize) || 44, 160)),
      speechColor: subtitleColor || 'yellow',
      speechInactiveColor: subtitleInactiveColor || 'white',
      speechPosY: Math.max(20, Math.min(Number(subtitlePosY) || 960, 1060)),
      speechFont: subtitleFont || 'RussoOne-Regular.ttf',
      speechBoxMode: subtitleBoxMode || 'pill',
      speechBoxColor: subtitleBoxColor || 'black',
      speechBoxOpacity: Number(subtitleBoxOpacity) ?? 82,
      speechPacing: subtitlePacing || 'wave',
      speechStrokeWidth: Math.max(0, Math.min(Number(subtitleStrokeWidth) ?? 4, 20)),
      speechShadowDistance: Math.max(0, Math.min(Number(subtitleShadowDistance) ?? 2, 20)),
      speechLineMode: subtitleLineMode || 'auto',
      speechMaxWords: Number(subtitleMaxWords) || 0,
      speechMaxChars: Number(subtitleMaxChars) || 0,
      speechWordSpacing: Number(subtitleWordSpacing) || 10,
      speechLineSpacing: Number(subtitleLineSpacing) || 10,
      wordColors,
      wordFontSizes,
      whisperWords: null,
      resX: 1920,
      resY: 1080,
    });
    assFile = path.join(os.tmpdir(), `preview_vid_ass_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.ass`);
    fs.writeFileSync(assFile, assContent, 'utf-8');
    const safeAssPath = assFile.replace(/\\/g, '/').replace(/:/g, '\\:');
    const safeFontsDir = customFontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');
    const blurFilter = 'split[bg][fg];[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=10:1[blurred];[fg]scale=1920:1080:force_original_aspect_ratio=decrease[sharp];[blurred][sharp]overlay=(W-w)/2:(H-h)/2,setsar=1';
    const subFilter = speechSubtitlesEnabled !== false ? `,subtitles=filename='${safeAssPath}':fontsdir='${safeFontsDir}'` : '';
    const vf = `${blurFilter}${subFilter}`;
    await execFileAsync('ffmpeg', ['-y', '-i', basePhoto, '-vf', vf, '-frames:v', '1', '-q:v', '2', previewOut]);
  } finally {
    if (assFile && fs.existsSync(assFile)) { try { fs.unlinkSync(assFile); } catch {} }
  }

  const resFolder = path.basename(targetFolder);
  return { success: true, frameUrl: `/news-static/${resFolder}/preview_video_frame.jpg?t=${Date.now()}` };
}

