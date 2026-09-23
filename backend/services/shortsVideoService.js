import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execFile, execSync } from 'child_process';
import { promisify } from 'util';
import { buildAssShortsSubtitle, buildSpeechWordEvents, FFMPEG_SHORTS_COLOR_MAP } from './shortsAssService.js';

const execFileAsync = promisify(execFile);

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
    const cleanSubPath = clean.replace('/news-static/', '');
    const cand = path.join(newsDir, decodeURIComponent(cleanSubPath));
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
  return text
    .replace(/\[B-Roll:[^\]]*\]/gi, ' ')
    .replace(/#+\s*[^\r\n]+/g, ' ')
    .replace(/---+/g, ' ')
    .replace(/[*_`«»"']/g, ' ')
    .replace(/[\r\n\t]+/g, ' ')
    .trim();
}

function getSpeechText(targetFolder, customText) {
  if (customText && typeof customText === 'string') return extractCleanSpeechText(customText);
  const txtPath = path.join(targetFolder, 'script.txt');
  if (fs.existsSync(txtPath)) {
    try {
      const c = fs.readFileSync(txtPath, 'utf-8');
      if (c && c.trim()) return extractCleanSpeechText(c);
    } catch {}
  }
  const mdPath = path.join(targetFolder, 'script.md');
  if (fs.existsSync(mdPath)) {
    try {
      const c = fs.readFileSync(mdPath, 'utf-8');
      if (c && c.trim()) return extractCleanSpeechText(c);
    } catch {}
  }
  return '';
}

export async function getWhisperTimedWords(audioPath, targetDur, targetFolder) {
  if (!audioPath || !fs.existsSync(audioPath)) return null;
  const cachePath = path.join(targetFolder, `whisper_words_${Math.round(targetDur)}.json`);
  if (fs.existsSync(cachePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      if (Array.isArray(data) && data.length > 0) return data;
    } catch {}
  }
  // Sofortiges schnelles Timing statt 30s Whisper Timeout
  return null;
}

export async function processRenderShort({
  bundleDir: inputBundleDir, folderName, duration = 16, hookTitle = '', showHookTitle = true, font: reqFont = 'impact',
  fontSize = 90, fontColor = 'yellow', strokeWidth = 8, strokeColor = 'black', shadowDistance = 4,
  shadowColor = 'black', wordColors = null, wordFontSizes = null, posY = 200, shadowStyle = 'hard',
  boxEnabled = true, boxColor = 'black', boxOpacity = 75, lineBadges = null, selectedPhoto = null,
  speechSubtitlesEnabled = true, speechColor = 'yellow', speechFontSize = 115, speechPosY = 980,
  speechFont = 'impact', speechBoxMode = 'pill', speechPacing = 'wave', speechStrokeWidth = 12,
  speechShadowDistance = 6, speechText: inputSpeech = null,
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

  const audioPath = path.join(targetFolder, 'audio.mp3');
  const photosDir = path.join(targetFolder, 'photos');
  const outShortPath = path.join(targetFolder, 'short.mp4');
  if (!fs.existsSync(audioPath)) throw new Error('Файл audio.mp3 не найден. Сначала создайте аудио-озвучку!');

  const totalAudioDur = getAudioDurationSeconds(audioPath);
  const targetDur = Math.min(Math.max(Number(duration) || 20, 10), Math.min(totalAudioDur, 60));

  let availablePhotos = [];
  if (fs.existsSync(photosDir)) {
    availablePhotos = fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).map(f => path.join(photosDir, f));
  }
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
    if (customPath && fs.existsSync(customPath)) {
      selectedPhotos = [customPath, ...availablePhotos.filter(p => path.resolve(p) !== path.resolve(customPath))];
    }
  }
  const photoCountLimit = Math.max(3, Math.min(availablePhotos.length, Math.round(targetDur / 3)));
  selectedPhotos = selectedPhotos.slice(0, photoCountLimit);
  const photoCount = selectedPhotos.length;
  const perPhotoDur = targetDur / photoCount;

  let headerText = hookTitle;
  if (!headerText) {
    const jsonPath = path.join(targetFolder, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try { headerText = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')).title || ''; } catch {}
    }
  }
  if (!headerText) headerText = path.basename(targetFolder).replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, '').replace(/_/g, ' ');

  const effectiveSize = Math.max(30, Math.min(Number(fontSize) || 90, 240));
  const maxChars = Math.max(4, Math.floor(920 / (effectiveSize * 0.58)));
  const wrappedText = wrapShortsText(headerText, maxChars);
  const customFontsDir = path.resolve(__dirname, '../custom_fonts');
  const effectivePosY = Math.max(20, Math.min(Number(posY) || 200, 1800));
  const effectiveStroke = Math.max(0, Math.min(Number(strokeWidth) ?? 8, 28));
  const hexColorMap = FFMPEG_SHORTS_COLOR_MAP;
  const effectiveStrokeColor = hexColorMap[strokeColor] || strokeColor || '#000000';
  const effectiveShadowDist = Math.max(0, Math.min(Number(shadowDistance) ?? 4, 30));

  const speechText = getSpeechText(targetFolder, inputSpeech);
  const whisperWords = await getWhisperTimedWords(audioPath, targetDur, targetFolder);

  const concatListFile = path.join(targetFolder, `temp_short_photos_${Date.now()}.txt`);
  const tempFiles = [concatListFile];
  try {
    // ── 1) Pre-normalize selected photos to uniform 1080x1920 ───────────
    const normFramesDir = path.join(targetFolder, `temp_norm_frames_${Date.now()}`);
    if (!fs.existsSync(normFramesDir)) fs.mkdirSync(normFramesDir, { recursive: true });
    tempFiles.push(normFramesDir);

    const normPhotoPaths = [];
    const blurShortFilter = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,format=yuv420p';
    for (let i = 0; i < selectedPhotos.length; i++) {
      const srcFile = selectedPhotos[i];
      const outNorm = path.join(normFramesDir, `photo_${String(i).padStart(3, '0')}.jpg`);
      await execFileAsync('ffmpeg', ['-y', '-v', 'error', '-threads', '2', '-i', srcFile, '-vf', blurShortFilter, '-q:v', '2', outNorm]);
      normPhotoPaths.push(outNorm.replace(/\\/g, '/'));
    }

    const activePhotos = normPhotoPaths.length > 0 ? normPhotoPaths : selectedPhotos.map(p => p.replace(/\\/g, '/'));
    const photoDuration = targetDur / activePhotos.length;

    let concatContent = '';
    for (let i = 0; i < activePhotos.length; i++) {
      concatContent += `file '${activePhotos[i]}'\nduration ${photoDuration.toFixed(3)}\n`;
    }
    concatContent += `file '${activePhotos[activePhotos.length - 1]}'\n`;
    fs.writeFileSync(concatListFile, concatContent, 'utf-8');

    const fadeOutStart = Math.max(0, targetDur - 0.4);
    const af = `atrim=0:${targetDur},asetpts=PTS-STARTPTS,afade=t=out:st=${fadeOutStart}:d=0.4`;

    // ── Determine font file path for Python renderer ──────────────────────
    const fontFileMap = {
      impact: 'RussoOne-Regular.ttf',
      arial_black: 'RussoOne-Regular.ttf',
      'Saxonia_Antiqua_Bold.ttf': 'Saxonia_Antiqua_Bold.ttf',
      'Saxonia_Antiqua.ttf': 'Saxonia_Antiqua.ttf',
      'SeymourOne-Regular.ttf': 'SeymourOne-Regular.ttf',
      'StalinistOne-Regular.ttf': 'StalinistOne-Regular.ttf',
      'Unbounded-Black.ttf': 'Unbounded-Black.ttf',
      'Buran_USSR.ttf': 'Buran_USSR.ttf',
      'RussoOne-Regular.ttf': 'RussoOne-Regular.ttf',
      'DelaGothicOne-Regular.ttf': 'DelaGothicOne-Regular.ttf',
      'RubikMonoOne-Regular.ttf': 'RubikMonoOne-Regular.ttf',
      'PROPAGAN.ttf': 'PROPAGAN.ttf',
      'YesevaOne-Regular.ttf': 'YesevaOne-Regular.ttf',
    };
    const speechFontFile = fontFileMap[speechFont] || fontFileMap[reqFont] || 'RussoOne-Regular.ttf';
    const speechFontPath = path.join(customFontsDir, speechFontFile);

    // ── Try Python subtitle renderer for speech subtitles ─────────────────
    let usePythonSubtitles = false;
    let subtitleConcatPath = null;
    const subtitleTempDir = path.join(targetFolder, `sub_frames_${Date.now()}`);

    if (speechSubtitlesEnabled !== false && speechText) {
      try {
        const wordEvents = buildSpeechWordEvents({
          speechText, duration: targetDur, totalAudioDuration: totalAudioDur,
          speechPacing: speechPacing || 'wave', whisperWords,
        });

        if (wordEvents && wordEvents.length > 0) {
          const pyConfig = {
            canvas_w: 1080, canvas_h: 1920,
            pos_y: Number(speechPosY) || 980,
            font_path: fs.existsSync(speechFontPath) ? speechFontPath.replace(/\\/g, '/') : null,
            font_size: Math.round((Number(speechFontSize) || 115) * 0.812),
            active_color: speechColor || 'yellow',
            inactive_color: 'white',
            stroke_color: 'black',
            stroke_width: 8,
            shadow_dist: 6,
            box_mode: speechBoxMode || 'pill',
            box_opacity: 0.88,
            out_dir: subtitleTempDir.replace(/\\/g, '/'),
            word_events: wordEvents,
          };
          const pyConfigPath = path.join(targetFolder, `temp_subconfig_${Date.now()}.json`);
          tempFiles.push(pyConfigPath);
          fs.writeFileSync(pyConfigPath, JSON.stringify(pyConfig), 'utf-8');

          const pyScriptPath = path.resolve(__dirname, 'subtitle_frame_renderer.py');
          const pyResult = await execFileAsync('python', [pyScriptPath, pyConfigPath], { timeout: 60000 });
          const parsed = JSON.parse(pyResult.stdout.trim());

          if (parsed.success && parsed.concat_path) {
            subtitleConcatPath = parsed.concat_path;
            usePythonSubtitles = true;
          }
        }
      } catch (pyErr) {
        console.warn('[Shorts] Python subtitle renderer failed, falling back to ASS:', pyErr.message);
      }
    }

    // ── Build hook-title ASS (speech disabled when Python handles subtitles) ─
    const assContent = buildAssShortsSubtitle(wrappedText, {
      font: reqFont, fontSize: effectiveSize, fontColor, strokeWidth: effectiveStroke,
      strokeColor: effectiveStrokeColor, shadowDistance: effectiveShadowDist, shadowColor,
      posY: effectivePosY, wordColors, wordFontSizes, lineBadges, boxEnabled, boxColor, boxOpacity,
      showHookTitle: showHookTitle !== false,
      speechSubtitlesEnabled: !usePythonSubtitles && speechSubtitlesEnabled !== false,
      speechText, duration: targetDur, totalAudioDuration: totalAudioDur,
      speechFontSize: Number(speechFontSize) || 115, speechColor: speechColor || 'yellow',
      speechPosY: Number(speechPosY) || 980, speechFont: speechFont || reqFont || 'impact',
      speechBoxMode: speechBoxMode || 'pill', speechPacing: speechPacing || 'wave',
      speechStrokeWidth: Number(speechStrokeWidth) || 12,
      speechShadowDistance: Number(speechShadowDistance) || 6, whisperWords,
    });
    const assFile = path.join(targetFolder, `temp_short_ass_${Date.now()}.ass`);
    tempFiles.push(assFile);
    fs.writeFileSync(assFile, assContent, 'utf-8');
    const safeAssPath = assFile.replace(/\\/g, '/').replace(/:/g, '\\:');
    const safeCustomFontsDir = customFontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');

    if (usePythonSubtitles && subtitleConcatPath) {
      // ── NEW: Python overlay pipeline ───────────────────────────────────
      const overlayVideoPath = path.join(subtitleTempDir, 'subtitle_overlay.mkv');
      tempFiles.push(subtitleTempDir);

      await execFileAsync('ffmpeg', [
        '-y', '-f', 'concat', '-safe', '0', '-i', subtitleConcatPath,
        '-vf', `fps=30,format=rgba`,
        '-c:v', 'png', overlayVideoPath,
      ], { timeout: 60000 });

      const vfBase = `fps=30,setsar=1,subtitles=filename='${safeAssPath}':fontsdir='${safeCustomFontsDir}'`;
      const filterComplex = `[0:v]${vfBase}[titled]; [titled][1:v]overlay=0:0:eof_action=pass[v]`;

      await execFileAsync('ffmpeg', [
        '-y',
        '-f', 'concat', '-safe', '0', '-i', concatListFile,
        '-i', overlayVideoPath,
        '-i', audioPath,
        '-filter_complex', filterComplex,
        '-map', '[v]', '-map', '2:a',
        '-af', af,
        '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'fastdecode',
        '-threads', '0', '-crf', '22', '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
        '-pix_fmt', 'yuv420p', '-r', '30', '-shortest', outShortPath,
      ], { timeout: 180000 });

    } else {
      // ── FALLBACK: Pure ASS pipeline ────────────────────────────────────
      const vf = `fps=30,setsar=1,subtitles=filename='${safeAssPath}':fontsdir='${safeCustomFontsDir}'`;

      await execFileAsync('ffmpeg', [
        '-y', '-f', 'concat', '-safe', '0', '-i', concatListFile, '-i', audioPath,
        '-vf', vf, '-af', af, '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'fastdecode',
        '-threads', '0', '-crf', '22', '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
        '-pix_fmt', 'yuv420p', '-r', '30', '-shortest', outShortPath,
      ], { timeout: 120000 });
    }

  } finally {
    for (const f of tempFiles) {
      try {
        if (!f) continue;
        if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
          fs.rmSync(f, { recursive: true, force: true });
        } else if (fs.existsSync(f)) {
          fs.unlinkSync(f);
        }
      } catch {}
    }
  }

  const shortsConfig = {
    duration: targetDur, hookTitle, showHookTitle: showHookTitle !== false, font: reqFont, fontSize: effectiveSize,
    fontColor, posY: effectivePosY, strokeWidth: effectiveStroke, strokeColor: effectiveStrokeColor,
    shadowDistance: effectiveShadowDist, shadowColor, wordColors, wordFontSizes, shadowStyle, boxEnabled,
    boxColor, boxOpacity, lineBadges: lineBadges || null, selectedPhoto,
    speechSubtitlesEnabled: speechSubtitlesEnabled !== false,
    speechFont: speechFont || reqFont || 'impact',
    speechColor: speechColor || 'yellow',
    speechFontSize: Number(speechFontSize) || 115,
    speechPosY: Number(speechPosY) || 980,
    speechBoxMode: speechBoxMode || 'pill',
    speechPacing: speechPacing || 'wave',
    speechStrokeWidth: Number(speechStrokeWidth) || 12,
    speechShadowDistance: Number(speechShadowDistance) || 6,
  };

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

export async function processPreviewShortFrame(options) {
  const {
    bundleDir: inputBundleDir, folderName, selectedPhoto, hookTitle = '', showHookTitle = true, font: reqFont = 'impact',
    fontSize = 90, fontColor = 'yellow', strokeWidth = 8, strokeColor = 'black', shadowDistance = 4,
    shadowColor = 'black', wordColors = null, wordFontSizes = null, posY = 200, shadowStyle = 'hard',
    boxEnabled = true, boxColor = 'black', boxOpacity = 75, lineBadges = null,
    speechSubtitlesEnabled = true, speechColor = 'yellow', speechFontSize = 115, speechPosY = 980,
    speechFont = 'impact', speechBoxMode = 'pill', speechPacing = 'wave', speechStrokeWidth = 12,
    speechShadowDistance = 6, speechText: inputSpeech = null,
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
  const maxChars = Math.max(4, Math.floor(920 / (effectiveSize * 0.58)));
  const wrappedText = wrapShortsText(hookTitle || path.basename(targetFolder).replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, '').replace(/_/g, ' '), maxChars);

  const customFontsDir = path.resolve(__dirname, '../custom_fonts');
  const effectivePosY = Math.max(20, Math.min(Number(posY) || 200, 1800));
  const effectiveStroke = Math.max(0, Math.min(Number(strokeWidth) ?? 8, 28));
  const hexColorMap = FFMPEG_SHORTS_COLOR_MAP;
  const effectiveStrokeColor = hexColorMap[strokeColor] || strokeColor || '#000000';
  const effectiveShadowDist = Math.max(0, Math.min(Number(shadowDistance) ?? 4, 30));

  const speechText = getSpeechText(targetFolder, inputSpeech);
  const audioPath = path.join(targetFolder, 'audio.mp3');
  const totalAudioDur = getAudioDurationSeconds(audioPath) || 20;
  const previewOut = path.join(targetFolder, 'preview_short_frame.jpg');

  // Check if Python subtitle overlay is possible for preview
  const fontFileMap = {
    impact: 'RussoOne-Regular.ttf', arial_black: 'RussoOne-Regular.ttf',
    'Saxonia_Antiqua_Bold.ttf': 'Saxonia_Antiqua_Bold.ttf', 'Saxonia_Antiqua.ttf': 'Saxonia_Antiqua.ttf',
    'SeymourOne-Regular.ttf': 'SeymourOne-Regular.ttf', 'StalinistOne-Regular.ttf': 'StalinistOne-Regular.ttf',
    'Unbounded-Black.ttf': 'Unbounded-Black.ttf', 'Buran_USSR.ttf': 'Buran_USSR.ttf',
    'RussoOne-Regular.ttf': 'RussoOne-Regular.ttf', 'DelaGothicOne-Regular.ttf': 'DelaGothicOne-Regular.ttf',
    'RubikMonoOne-Regular.ttf': 'RubikMonoOne-Regular.ttf', 'PROPAGAN.ttf': 'PROPAGAN.ttf',
    'YesevaOne-Regular.ttf': 'YesevaOne-Regular.ttf',
  };
  const speechFontFile = fontFileMap[speechFont] || fontFileMap[reqFont] || 'RussoOne-Regular.ttf';
  const speechFontPath = path.join(customFontsDir, speechFontFile);

  let usePythonSubtitles = false;
  let subtitleConcatPath = null;
  const subtitleTempDir = path.join(targetFolder, `sub_frames_prev_${Date.now()}`);
  const tempFiles = [];

  if (speechSubtitlesEnabled !== false && speechText) {
    try {
      const wordEvents = buildSpeechWordEvents({
        speechText, duration: 20, totalAudioDuration: totalAudioDur,
        speechPacing: speechPacing || 'wave', whisperWords: null,
      });

      if (wordEvents && wordEvents.length > 0) {
        const pyConfig = {
          canvas_w: 1080, canvas_h: 1920,
          pos_y: Number(speechPosY) || 980,
          font_path: fs.existsSync(speechFontPath) ? speechFontPath.replace(/\\/g, '/') : null,
          font_size: Math.round((Number(speechFontSize) || 115) * 0.812),
          active_color: speechColor || 'yellow',
          inactive_color: 'white',
          stroke_color: 'black',
          stroke_width: 8,
          shadow_dist: 6,
          box_mode: speechBoxMode || 'pill',
          box_opacity: 0.88,
          out_dir: subtitleTempDir.replace(/\\/g, '/'),
          word_events: wordEvents.slice(0, 1), // Only need first chunk for preview frame
        };
        const pyConfigPath = path.join(targetFolder, `temp_subconfig_prev_${Date.now()}.json`);
        tempFiles.push(pyConfigPath);
        fs.writeFileSync(pyConfigPath, JSON.stringify(pyConfig), 'utf-8');

        const pyScriptPath = path.resolve(__dirname, 'subtitle_frame_renderer.py');
        const pyResult = await execFileAsync('python', [pyScriptPath, pyConfigPath], { timeout: 20000 });
        const parsed = JSON.parse(pyResult.stdout.trim());

        if (parsed.success && parsed.concat_path) {
          subtitleConcatPath = parsed.concat_path;
          usePythonSubtitles = true;
        }
      }
    } catch (e) {}
  }

  let assFile = null;
  try {
    const assContent = buildAssShortsSubtitle(wrappedText, {
      font: reqFont, fontSize: effectiveSize, fontColor, strokeWidth: effectiveStroke, strokeColor: effectiveStrokeColor,
      shadowDistance: effectiveShadowDist, shadowColor, posY: effectivePosY, wordColors, wordFontSizes,
      lineBadges, boxEnabled, boxColor, boxOpacity, showHookTitle: showHookTitle !== false,
      speechSubtitlesEnabled: !usePythonSubtitles && speechSubtitlesEnabled !== false,
      speechText, duration: 20, totalAudioDuration: 20,
      speechFontSize: Number(speechFontSize) || 115, speechColor: speechColor || 'yellow',
      speechPosY: Number(speechPosY) || 980, speechFont: speechFont || reqFont || 'impact',
      speechBoxMode: speechBoxMode || 'pill', speechPacing: speechPacing || 'wave',
      speechStrokeWidth: Number(speechStrokeWidth) || 12,
      speechShadowDistance: Number(speechShadowDistance) || 6, whisperWords: null,
    });
    assFile = path.join(targetFolder, `temp_preview_short_ass_${Date.now()}.ass`);
    tempFiles.push(assFile);
    fs.writeFileSync(assFile, assContent, 'utf-8');
    const safeAssPath = assFile.replace(/\\/g, '/').replace(/:/g, '\\:');
    const safeCustomFontsDir = customFontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');

    if (usePythonSubtitles) {
      const firstFramePng = path.join(subtitleTempDir, 'frame_0000.png').replace(/\\/g, '/');
      tempFiles.push(subtitleTempDir);
      const vfBase = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,subtitles=filename='${safeAssPath}':fontsdir='${safeCustomFontsDir}'`;
      const filterComplex = `[0:v]${vfBase}[titled]; [titled][1:v]overlay=0:0[v]`;
      await execFileAsync('ffmpeg', [
        '-y', '-i', basePhoto, '-i', firstFramePng,
        '-filter_complex', filterComplex, '-map', '[v]',
        '-frames:v', '1', '-q:v', '2', previewOut,
      ]);
    } else {
      const vf = `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,setsar=1,subtitles=filename='${safeAssPath}':fontsdir='${safeCustomFontsDir}'`;
      await execFileAsync('ffmpeg', ['-y', '-i', basePhoto, '-vf', vf, '-frames:v', '1', '-q:v', '2', previewOut]);
    }
  } finally {
    for (const f of tempFiles) {
      try {
        if (!f) continue;
        if (fs.existsSync(f) && fs.statSync(f).isDirectory()) {
          fs.rmSync(f, { recursive: true, force: true });
        } else if (fs.existsSync(f)) {
          fs.unlinkSync(f);
        }
      } catch {}
    }
  }
  const resFolder = path.basename(targetFolder);
  return { success: true, frameUrl: `/news-static/${resFolder}/preview_short_frame.jpg?t=${Date.now()}` };
}
