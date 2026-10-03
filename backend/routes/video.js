import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { exec, execSync, execFile, spawn } from 'child_process';
import { processRenderShort, processPreviewShortFrame, processPreviewVideoFrame, cancelShortRender, extractCleanSpeechText, getWhisperTimedWords } from '../services/shortsVideoService.js';
import { buildAssVideoSubtitle } from '../services/shortsAssService.js';
import { invalidatePackagesCache } from './packages.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// SSE Job Store für Video-Fortschritt (verknüpft nach jobId und folderName)
const videoJobs = new Map();
const activeFolderJobs = new Map(); // folderName -> jobId

let cachedHwEncoder = null;
const getHwEncoderArgs = () => new Promise((resolve) => {
  if (cachedHwEncoder) return resolve(cachedHwEncoder);
  execFile('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'color=c=black:s=64x64:d=0.05', '-c:v', 'h264_qsv', '-f', 'null', '-'], (err) => {
    cachedHwEncoder = (!err) ? ['-c:v', 'h264_qsv', '-preset', 'veryfast'] : ['-c:v', 'libx264', '-preset', 'ultrafast', '-threads', '0', '-pix_fmt', 'yuv420p'];
    resolve(cachedHwEncoder);
  });
});

// GET /api/video-progress/:jobId (SSE Stream)
router.get('/api/video-progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const sendEvent = (data) => {
    try {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
      if (typeof res.flush === 'function') res.flush();
    } catch {}
  };

  if (!videoJobs.has(jobId)) {
    videoJobs.set(jobId, { clients: new Set(), progress: 0, status: 'waiting', log: '', jobId });
  }
  const job = videoJobs.get(jobId);
  job.clients.add(sendEvent);

  sendEvent({ progress: job.progress, status: job.status, log: job.log, jobId, videoUrl: job.videoUrl });

  req.on('close', () => {
    job.clients.delete(sendEvent);
  });
});

// GET /api/video-progress-poll/:jobId (JSON Polling Fallback)
router.get('/api/video-progress-poll/:jobId', (req, res) => {
  const { jobId } = req.params;
  if (!videoJobs.has(jobId)) {
    return res.json({ progress: 0, status: 'waiting', log: '' });
  }
  const job = videoJobs.get(jobId);
  res.json({ progress: job.progress, status: job.status, log: job.log, videoUrl: job.videoUrl, jobId });
});

// GET /api/video-status (Prüfen, ob für ein Paket aktuell gerendert wird)
router.get('/api/video-status', (req, res) => {
  const folderName = (req.query.folderName || '').trim();
  const bundleDir = (req.query.bundleDir || '').trim();
  const normFolder = folderName || (bundleDir ? path.basename(bundleDir) : '');

  let foundJob = null;
  if (normFolder && activeFolderJobs.has(normFolder)) {
    const jId = activeFolderJobs.get(normFolder);
    foundJob = videoJobs.get(jId);
  } else if (req.query.jobId && videoJobs.has(req.query.jobId)) {
    foundJob = videoJobs.get(req.query.jobId);
  } else if (normFolder) {
    for (const job of videoJobs.values()) {
      if (job.folderName === normFolder) {
        foundJob = job;
        break;
      }
    }
  }

  if (foundJob) {
    const isRunning = foundJob.status !== 'done' && foundJob.status !== 'error' && foundJob.status !== 'canceled';
    return res.json({
      success: true,
      isRendering: isRunning,
      jobId: foundJob.jobId,
      folderName: foundJob.folderName,
      progress: foundJob.progress,
      status: foundJob.status,
      log: foundJob.log,
      videoUrl: foundJob.videoUrl || null,
      startTime: foundJob.startTime,
    });
  }

  res.json({ success: true, isRendering: false, progress: 0, status: 'idle', log: '' });
});

// POST /api/cancel-video (Rendervorgang sicher abbrechen)
router.post('/api/cancel-video', (req, res) => {
  const { folderName, bundleDir, jobId } = req.body || {};
  const normFolder = (folderName || (bundleDir ? path.basename(bundleDir) : '')).trim();

  let foundJob = null;
  if (jobId && videoJobs.has(jobId)) {
    foundJob = videoJobs.get(jobId);
  } else if (normFolder && activeFolderJobs.has(normFolder)) {
    const jId = activeFolderJobs.get(normFolder);
    foundJob = videoJobs.get(jId);
  } else if (normFolder) {
    for (const job of videoJobs.values()) {
      if (job.folderName === normFolder) {
        foundJob = job;
        break;
      }
    }
  }

  if (foundJob) {
    foundJob.canceled = true;
    foundJob.status = 'canceled';
    foundJob.log = 'Монтаж видео отменен пользователем';
    if (foundJob.ffmpegProcess && !foundJob.ffmpegProcess.killed) {
      try { foundJob.ffmpegProcess.kill('SIGTERM'); } catch {}
      try { foundJob.ffmpegProcess.kill('SIGKILL'); } catch {}
    }
    if (activeFolderJobs.get(foundJob.folderName) === foundJob.jobId) {
      activeFolderJobs.delete(foundJob.folderName);
    }
    for (const client of foundJob.clients) {
      try { client({ progress: 0, status: 'canceled', log: 'Монтаж видео отменен' }); } catch {}
    }
    return res.json({ success: true, canceled: true, jobId: foundJob.jobId });
  }

  res.json({ success: true, canceled: false });
});

// POST /api/generate-video & /api/render-video
const handleGenerateVideo = async (req, res) => {
  try {
    const {
      bundleDir: inputBundleDir,
      folderName,
      transition = 'concat',
      jobId,
      includeSubBanner = true,
      subBannerTime = 30,
      bannerStyle = 'modern_dark',
      includeKaraokeSubtitles = true,
      subtitleColor = 'yellow',
      subtitleInactiveColor = 'white',
      subtitleFontSize = 44,
      subtitleFont = 'RussoOne-Regular.ttf',
      subtitlePosY = 960,
      subtitleBoxMode = 'pill',
      subtitleBoxColor = 'black',
      subtitleBoxOpacity = 82,
      subtitlePacing = 'wave',
      subtitleStrokeWidth = 4,
      subtitleShadowDistance = 2,
      subtitleLineMode = 'auto',
      subtitleMaxWords = 0,
      subtitleMaxChars = 0,
      subtitleWordSpacing = 10,
      subtitleLineSpacing = 10,
      wordColors = null,
      wordFontSizes = null,
    } = req.body;

    const newsDir = path.resolve(__dirname, '../../news');
    let bundleDir = inputBundleDir;
    if (!bundleDir && folderName) {
      bundleDir = path.join(newsDir, folderName);
    }

    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(400).json({ success: false, error: 'Папка проекта не найдена' });
    }

    const audioPath = path.join(bundleDir, 'audio.mp3');
    const photosDir = path.join(bundleDir, 'photos');
    const videoDir = path.join(bundleDir, 'video');
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }
    const timeStr = new Date().toISOString().replace(/T/, '_').replace(/:/g, '-').slice(0, 19);
    const videoFileName = `video_${timeStr}.mp4`;
    const videoPath = path.join(videoDir, videoFileName);

    if (!fs.existsSync(audioPath)) {
      return res.status(400).json({ success: false, error: 'Файл audio.mp3 не найден. Сначала создайте аудио!' });
    }

    if (!fs.existsSync(photosDir)) {
      return res.status(400).json({ success: false, error: 'Папка photos/ не найдена. Сначала скачайте фото!' });
    }

    const photoFiles = fs.readdirSync(photosDir).filter(f => /\.(jpg|jpeg|png|webp)/i.test(f));
    if (photoFiles.length === 0) {
      return res.status(400).json({ success: false, error: 'В папке photos/ нет фотографий!' });
    }

    const normFolder = (folderName || (bundleDir ? path.basename(bundleDir) : '')).trim();
    const effectiveJobId = (jobId && typeof jobId === 'string' && jobId.trim()) ? jobId.trim() : `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    if (!videoJobs.has(effectiveJobId)) {
      videoJobs.set(effectiveJobId, {
        jobId: effectiveJobId,
        folderName: normFolder,
        bundleDir,
        clients: new Set(),
        progress: 5,
        status: 'probing',
        log: 'Определение длительности аудио...',
        startTime: Date.now(),
        ffmpegProcess: null,
        canceled: false,
        videoUrl: null,
      });
    } else {
      const existing = videoJobs.get(effectiveJobId);
      existing.folderName = normFolder;
      existing.bundleDir = bundleDir;
      existing.status = 'probing';
      existing.progress = 5;
    }
    if (normFolder) activeFolderJobs.set(normFolder, effectiveJobId);

    const broadcastProgress = (progress, status, log = '') => {
      const job = videoJobs.get(effectiveJobId);
      if (job) {
        job.progress = progress;
        job.status = status;
        job.log = log;
        for (const client of job.clients) {
          try { client({ progress, status, log, jobId: effectiveJobId, folderName: normFolder, videoUrl: job.videoUrl }); } catch {}
        }
      }
    };

    broadcastProgress(5, 'probing', 'Определение длительности аудио...');

    execFile('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath], async (probeErr, stdout) => {
      let audioDuration = parseFloat((stdout || '').trim());
      if (isNaN(audioDuration) || audioDuration <= 0) {
        audioDuration = 180;
      }

      const blurFilter = 'split[bg][fg];[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,boxblur=10:1[blurred];[fg]scale=1920:1080:force_original_aspect_ratio=decrease[sharp];[blurred][sharp]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p';
      let ffmpegArgs = [];

      const tempFramesDir = path.join(bundleDir, 'temp_frames');
      if (!fs.existsSync(tempFramesDir)) fs.mkdirSync(tempFramesDir, { recursive: true });

      broadcastProgress(10, 'building', 'Параллельное масштабирование фото 1080p...');

      const normalizedFrames = [];
      const batchSize = 2;
      for (let b = 0; b < photoFiles.length; b += batchSize) {
        const chunk = photoFiles.slice(b, b + batchSize);
        const chunkResults = await Promise.all(chunk.map((pf, idx) => new Promise((resolve) => {
          const i = b + idx;
          const srcFile = path.join(photosDir, pf);
          const outFrame = path.join(tempFramesDir, `frame_${String(i).padStart(3, '0')}.jpg`);
          try {
            if (fs.existsSync(outFrame) && fs.statSync(outFrame).mtimeMs >= fs.statSync(srcFile).mtimeMs) {
              return resolve(outFrame.replace(/\\/g, '/'));
            }
          } catch {}
          execFile('ffmpeg', ['-y', '-v', 'error', '-threads', '2', '-i', srcFile, '-vf', blurFilter, '-q:v', '2', outFrame], (err) => {
            if (!err && fs.existsSync(outFrame)) resolve(outFrame.replace(/\\/g, '/'));
            else resolve(null);
          });
        })));
        normalizedFrames.push(...chunkResults.filter(Boolean));
      }

      const activeFrames = normalizedFrames.length > 0 ? normalizedFrames : photoFiles.map(f => path.join(photosDir, f).replace(/\\/g, '/'));
      const photoDuration = audioDuration / activeFrames.length;
      const concatPath = path.join(bundleDir, 'concat.txt');
      let concatContent = '';
      for (const fp of activeFrames) {
        concatContent += `file '${fp}'\nduration ${photoDuration.toFixed(3)}\n`;
      }
      concatContent += `file '${activeFrames[activeFrames.length - 1]}'\n`;
      fs.writeFileSync(concatPath, concatContent, 'utf-8');

      const bannerMap = {
        youtube_studio: 'banner_youtube_studio.webm',
        modern_dark: 'banner_modern_dark.webm',
      };
      const styleFileName = bannerMap[bannerStyle] || 'banner_modern_dark.webm';
      const specificBanner = path.resolve(__dirname, `../../assets/banner/${styleFileName}`);
      const fallbackWebm = path.resolve(__dirname, '../../assets/banner/sub_animation_transparent.webm');
      const bannerPath = fs.existsSync(specificBanner) ? specificBanner : fallbackWebm;
      const hasBanner = includeSubBanner && fs.existsSync(bannerPath);
      const bannerSec = Math.max(0, Number(subBannerTime) || 30);

      // Karaoke / Speech Subtitles (16:9 Landscape)
      let assTempFile = null;
      let hasSubtitles = false;
      let safeAssPath = '';
      const customFontsDir = path.resolve(__dirname, '../custom_fonts');
      const safeFontsDir = customFontsDir.replace(/\\/g, '/').replace(/:/g, '\\:');

      if (includeKaraokeSubtitles !== false) {
        let rawSpeech = '';
        const txtPath = path.join(bundleDir, 'script.txt');
        const mdPath = path.join(bundleDir, 'script.md');
        if (fs.existsSync(txtPath)) { try { rawSpeech = fs.readFileSync(txtPath, 'utf-8'); } catch {} }
        if (!rawSpeech && fs.existsSync(mdPath)) { try { rawSpeech = fs.readFileSync(mdPath, 'utf-8'); } catch {} }

        const cleanSpeech = extractCleanSpeechText(rawSpeech);
        if (cleanSpeech) {
          try {
            const whisperWords = await getWhisperTimedWords(audioPath, audioDuration, bundleDir);
            const assContent = buildAssVideoSubtitle(cleanSpeech, {
              duration: audioDuration,
              totalAudioDuration: audioDuration,
              speechFontSize: Math.max(16, Math.min(Number(subtitleFontSize) || 44, 160)),
              speechColor: subtitleColor || 'yellow',
              speechInactiveColor: subtitleInactiveColor || 'white',
              speechFont: subtitleFont || 'RussoOne-Regular.ttf',
              speechPosY: Math.max(20, Math.min(Number(subtitlePosY) || 960, 1060)),
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
              whisperWords,
              resX: 1920,
              resY: 1080,
            });
            assTempFile = path.join(os.tmpdir(), `video_sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.ass`);
            fs.writeFileSync(assTempFile, assContent, 'utf-8');
            safeAssPath = assTempFile.replace(/\\/g, '/').replace(/:/g, '\\:');
            hasSubtitles = true;
          } catch (subErr) {
            console.warn('⚠️ Не удалось сгенерировать субтитры для видео:', subErr.message);
          }
        }
      }

      const subFilter = hasSubtitles ? `,subtitles=filename='${safeAssPath}':fontsdir='${safeFontsDir}'` : '';

      const isXfade = (transition === 'crossfade' || transition === 'fadeblack') && activeFrames.length > 1;
      const xfadeType = transition === 'fadeblack' ? 'fadeblack' : 'fade';

      const hwEnc = await getHwEncoderArgs();

      if (isXfade) {
        const N = activeFrames.length;
        const D = Math.min(0.4, (audioDuration / N) * 0.25);
        const Tbase = (audioDuration + (N - 1) * D) / N;
        const step = Tbase - D;

        ffmpegArgs.push('-y', '-filter_complex_threads', '0', '-threads', '0');
        for (let i = 0; i < N; i++) {
          ffmpegArgs.push('-loop', '1', '-t', Tbase.toFixed(3), '-i', activeFrames[i]);
        }
        const audioIdx = N;
        ffmpegArgs.push('-i', audioPath);

        const bannerIdx = N + 1;
        if (hasBanner) ffmpegArgs.push('-i', bannerPath);

        const filterParts = [];
        for (let i = 0; i < N; i++) {
          filterParts.push(`[${i}:v]fps=24,settb=AVTB,setpts=PTS-STARTPTS[f${i}]`);
        }

        let lastV = 'f0';
        for (let k = 1; k < N; k++) {
          const offset = (k * step).toFixed(3);
          const nextV = k === N - 1 ? 'v_slides' : `v_xf${k}`;
          filterParts.push(`[${lastV}][f${k}]xfade=transition=${xfadeType}:duration=${D.toFixed(3)}:offset=${offset}[${nextV}]`);
          lastV = nextV;
        }

        if (hasBanner) {
          filterParts.push(`[${bannerIdx}:v]setpts=PTS-STARTPTS+${bannerSec}/TB[sub_b]`);
          filterParts.push(`[v_slides][sub_b]overlay=(W-w)/2:H-h-50:enable='between(t,${bannerSec},${bannerSec + 6})':eof_action=pass${subFilter}[v]`);
          ffmpegArgs.push('-filter_complex', filterParts.join(';'), '-map', '[v]', '-map', `${audioIdx}:a`);
        } else {
          filterParts.push(`[v_slides]fps=24${subFilter}[v]`);
          ffmpegArgs.push('-filter_complex', filterParts.join(';'), '-map', '[v]', '-map', `${audioIdx}:a`);
        }

        ffmpegArgs.push(...hwEnc, '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-shortest', videoPath);
      } else {
        if (hasBanner) {
          ffmpegArgs = [
            '-y',
            '-f', 'concat', '-safe', '0', '-i', concatPath,
            '-i', audioPath,
            '-i', bannerPath,
            '-filter_complex', `[0:v]fps=30[bg];[2:v]setpts=PTS-STARTPTS+${bannerSec}/TB[sub_b];[bg][sub_b]overlay=(W-w)/2:H-h-50:enable='between(t,${bannerSec},${bannerSec + 6})':eof_action=pass${subFilter}[v]`,
            '-map', '[v]',
            '-map', '1:a',
            ...hwEnc,
            '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
            '-shortest',
            videoPath,
          ];
        } else {
          ffmpegArgs = [
            '-y',
            '-f', 'concat', '-safe', '0', '-i', concatPath,
            '-i', audioPath,
            '-filter_complex', `[0:v]fps=30${subFilter}[v]`,
            '-map', '[v]',
            '-map', '1:a',
            ...hwEnc,
            '-c:a', 'aac', '-b:a', '192k', '-ac', '2',
            '-shortest',
            videoPath,
          ];
        }
      }

      broadcastProgress(15, 'encoding', 'Начало кодирования видео FFmpeg...');

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
      const curJob = videoJobs.get(effectiveJobId);
      if (curJob) curJob.ffmpegProcess = ffmpegProcess;
      let ffmpegStderr = '';

      ffmpegProcess.stderr.on('data', (data) => {
        const chunk = data.toString();
        ffmpegStderr += chunk;

        const timeMatch = chunk.match(/time=(\d+):(\d+):([\d.]+)/);
        if (timeMatch) {
          const h = parseInt(timeMatch[1]);
          const m = parseInt(timeMatch[2]);
          const s = parseFloat(timeMatch[3]);
          const encodedSecs = h * 3600 + m * 60 + s;
          const pct = Math.min(95, 15 + Math.round((encodedSecs / audioDuration) * 80));
          broadcastProgress(pct, 'encoding', `Кодирование: ${timeMatch[0].replace('time=', '')} / ${Math.floor(audioDuration)}s`);
        }
      });

      ffmpegProcess.on('close', (code) => {
        if (assTempFile && fs.existsSync(assTempFile)) {
          try { fs.unlinkSync(assTempFile); } catch {}
        }

        const activeJob = videoJobs.get(effectiveJobId);

        if (code !== 0) {
          if (activeJob) {
            activeJob.status = activeJob.canceled ? 'canceled' : 'error';
            activeJob.log = activeJob.canceled ? 'Монтаж видео отменен' : `FFmpeg код ${code}`;
            activeJob.ffmpegProcess = null;
          }
          if (activeFolderJobs.get(normFolder) === effectiveJobId) {
            activeFolderJobs.delete(normFolder);
          }
          broadcastProgress(0, activeJob?.canceled ? 'canceled' : 'error', activeJob?.log || `FFmpeg код ${code}`);
          console.error('FFmpeg error:', ffmpegStderr.slice(-800));
          return res.status(500).json({ success: false, error: activeJob?.canceled ? 'Монтаж отменен' : `Ошибка создания видео: FFmpeg код ${code}` });
        }

        const resFolderName = path.basename(bundleDir);
        const finalVideoUrl = `/news-static/${resFolderName}/video.mp4?t=${Date.now()}`;

        if (activeJob) {
          activeJob.status = 'done';
          activeJob.progress = 100;
          activeJob.log = 'Видео успешно смонтировано!';
          activeJob.videoUrl = finalVideoUrl;
          activeJob.ffmpegProcess = null;
        }

        broadcastProgress(100, 'done', 'Видео успешно смонтировано!');

        const videoConfig = {
          includeKaraokeSubtitles: includeKaraokeSubtitles !== false,
          subtitleColor: subtitleColor || 'yellow',
          subtitleInactiveColor: subtitleInactiveColor || 'white',
          subtitleFontSize: Number(subtitleFontSize) || 44,
          subtitleFont: subtitleFont || 'RussoOne-Regular.ttf',
          subtitlePosY: Number(subtitlePosY) || 960,
          subtitleBoxMode: subtitleBoxMode || 'pill',
          subtitleBoxColor: subtitleBoxColor || 'black',
          subtitleBoxOpacity: Number(subtitleBoxOpacity) ?? 82,
          subtitlePacing: subtitlePacing || 'wave',
          subtitleStrokeWidth: Number(subtitleStrokeWidth) ?? 4,
          subtitleShadowDistance: Number(subtitleShadowDistance) ?? 2,
          subtitleLineMode: subtitleLineMode || 'auto',
          subtitleMaxWords: Number(subtitleMaxWords) || 0,
          subtitleMaxChars: Number(subtitleMaxChars) || 0,
          subtitleWordSpacing: Number(subtitleWordSpacing) || 10,
          subtitleLineSpacing: Number(subtitleLineSpacing) || 10,
          wordColors: wordColors || null,
          wordFontSizes: wordFontSizes || null,
          transition: transition || 'concat',
          includeSubBanner: includeSubBanner !== false,
          subBannerTime: Number(subBannerTime) || 30,
          bannerStyle: bannerStyle || 'modern_dark',
          savedAt: new Date().toISOString(),
        };

        const jsonPath = path.join(bundleDir, 'project.json');
        if (fs.existsSync(jsonPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            manifest.hasVideo = true;
            manifest.video_generated_at = new Date().toISOString();
            manifest.transition = transition;
            manifest.hasSubtitles = hasSubtitles;
            manifest.subtitlesEnabled = hasSubtitles;
            manifest.videoConfig = videoConfig;
            fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
          } catch {}
        }

        const videoConfigPath = path.join(bundleDir, 'video_config.json');
        try {
          fs.writeFileSync(videoConfigPath, JSON.stringify(videoConfig, null, 2), 'utf-8');
        } catch {}

        try {
          fs.copyFileSync(videoPath, path.join(bundleDir, 'video.mp4'));
        } catch {}

        console.log(`🎬 video.mp4 erfolgreich generiert: news/${resFolderName}/video.mp4 (${transition})`);
        invalidatePackagesCache();
        res.json({
          success: true,
          videoPath,
          videoFileName: `video/${videoFileName}`,
          videoUrl: finalVideoUrl,
          folderName: resFolderName,
          duration: audioDuration,
          photosCount: photoFiles.length,
          transition,
          jobId: effectiveJobId,
        });

        setTimeout(() => {
          if (activeFolderJobs.get(normFolder) === effectiveJobId) {
            activeFolderJobs.delete(normFolder);
          }
          setTimeout(() => {
            videoJobs.delete(effectiveJobId);
          }, 60000);
        }, 120000);
      });
    });
  } catch (err) {
    console.error('Generate video error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
};

router.post('/api/generate-video', handleGenerateVideo);
router.post('/api/render-video', handleGenerateVideo);

// POST /api/render-short
router.post('/api/render-short', async (req, res) => {
  try {
    const result = await processRenderShort(req.body);
    invalidatePackagesCache();
    res.json(result);
  } catch (err) {
    console.error('Render short error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/cancel-short
router.post('/api/cancel-short', (req, res) => {
  const { bundleDir, folderName } = req.body || {};
  const canceled = cancelShortRender(bundleDir || folderName);
  res.json({ success: true, canceled });
});

// POST /api/preview-short-frame
router.post('/api/preview-short-frame', async (req, res) => {
  try {
    const result = await processPreviewShortFrame(req.body);
    res.json(result);
  } catch (err) {
    console.error('Preview short frame error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/package-shorts-config
router.get('/api/package-shorts-config', (req, res) => {
  try {
    const { folderName, bundleDir: inputBundleDir } = req.query;
    const newsDir = path.resolve(__dirname, '../../news');
    let bundleDir = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);
    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(404).json({ success: false, error: 'Папка не найдена' });
    }

    const jsonPath = path.join(bundleDir, 'project.json');
    const shortsJsonPath = path.join(bundleDir, 'shorts_config.json');
    let manifest = {};
    if (fs.existsSync(jsonPath)) {
      try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
    }
    let shortsConfig = manifest.shortsConfig || (fs.existsSync(shortsJsonPath) ? JSON.parse(fs.readFileSync(shortsJsonPath, 'utf-8')) : null);

    res.json({ success: true, shortsConfig: shortsConfig || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-shorts-config
router.post('/api/save-shorts-config', (req, res) => {
  try {
    const {
      bundleDir: inputBundleDir, folderName, duration, hookTitle, showHookTitle, font, fontSize, fontColor, strokeWidth, strokeColor, shadowDistance, shadowColor, shadowStyle,
      wordColors, wordFontSizes, boxEnabled, boxColor, boxOpacity, posY, lineSpacing, lineBadges, selectedPhoto, speechSubtitlesEnabled, speechFont, speechColor, speechInactiveColor,
      speechFontSize, speechPosY, speechBoxMode, speechBoxColor, speechBoxOpacity, speechPacing, speechStrokeWidth, speechShadowDistance, speechLineSpacing, speechWordSpacing,
    } = req.body;

    const newsDir = path.resolve(__dirname, '../../news');
    let bundleDir = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);
    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(400).json({ success: false, error: 'Папка проекта не найдена' });
    }

    const jsonPath = path.join(bundleDir, 'project.json');
    let manifest = {};
    if (fs.existsSync(jsonPath)) {
      try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
    }

    const shortsConfig = {
      duration: Number(duration) || 25,
      hookTitle: (hookTitle || '').trim(),
      showHookTitle: showHookTitle !== false,
      font: font || 'impact',
      fontSize: Number(fontSize) || 110,
      fontColor: fontColor || 'yellow',
      strokeWidth: Number(strokeWidth) ?? 8,
      strokeColor: strokeColor || 'black',
      shadowDistance: Number(shadowDistance) ?? 4,
      shadowColor: shadowColor || 'black',
      shadowStyle: shadowStyle || 'hard',
      wordColors: wordColors || null,
      wordFontSizes: wordFontSizes || null,
      boxEnabled: Boolean(boxEnabled),
      boxColor: boxColor || 'black',
      boxOpacity: boxEnabled ? (Number(boxOpacity) ?? 75) : 0,
      posY: Number(posY) || 200,
      lineSpacing: Number(lineSpacing ?? 20),
      lineBadges: lineBadges || null,
      selectedPhoto: selectedPhoto || null,
      speechSubtitlesEnabled: speechSubtitlesEnabled !== false,
      speechFont: speechFont || 'impact',
      speechColor: speechColor || 'yellow',
      speechInactiveColor: speechInactiveColor || 'white',
      speechFontSize: Number(speechFontSize) || 115,
      speechPosY: Number(speechPosY) || 980,
      speechBoxMode: speechBoxMode || 'pill',
      speechBoxColor: speechBoxColor || 'black',
      speechBoxOpacity: Number(speechBoxOpacity) ?? 88,
      speechPacing: speechPacing || 'wave',
      speechStrokeWidth: Number(speechStrokeWidth) ?? 12,
      speechShadowDistance: Number(speechShadowDistance) ?? 6,
      speechLineSpacing: Number(speechLineSpacing ?? 10),
      speechWordSpacing: Number(speechWordSpacing ?? 14),
      savedAt: new Date().toISOString(),
    };

    manifest.shortsConfig = shortsConfig;
    if (duration) manifest.short_duration = Number(duration);
    fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

    // Also persist directly to shorts_config.json for maximum resilience
    const shortsConfigPath = path.join(bundleDir, 'shorts_config.json');
    try {
      fs.writeFileSync(shortsConfigPath, JSON.stringify(shortsConfig, null, 2), 'utf-8');
    } catch {}

    invalidatePackagesCache();
    res.json({ success: true, shortsConfig, folderName: path.basename(bundleDir) });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/preview-video-frame
router.post('/api/preview-video-frame', async (req, res) => {
  try {
    const result = await processPreviewVideoFrame(req.body);
    res.json(result);
  } catch (err) {
    console.error('Preview video frame error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const defaultVideoSubtitlesPath = path.resolve(__dirname, '../default_video_subtitles_config.json');

// GET /api/default-video-subtitles-config
router.get('/api/default-video-subtitles-config', (req, res) => {
  try {
    if (fs.existsSync(defaultVideoSubtitlesPath)) {
      const data = JSON.parse(fs.readFileSync(defaultVideoSubtitlesPath, 'utf-8'));
      return res.json({ success: true, config: data });
    }
    return res.json({ success: true, config: null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/default-video-subtitles-config
router.post('/api/default-video-subtitles-config', (req, res) => {
  try {
    const config = req.body;
    fs.writeFileSync(defaultVideoSubtitlesPath, JSON.stringify(config, null, 2), 'utf-8');
    res.json({ success: true, message: 'Шаблон субтитров по умолчанию сохранен', config });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/package-video-config
router.get('/api/package-video-config', (req, res) => {
  try {
    const { folderName, bundleDir: inputBundleDir } = req.query;
    const newsDir = path.resolve(__dirname, '../../news');
    let bundleDir = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);
    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(404).json({ success: false, error: 'Папка не найдена' });
    }

    const jsonPath = path.join(bundleDir, 'project.json');
    const videoJsonPath = path.join(bundleDir, 'video_config.json');
    let manifest = {};
    if (fs.existsSync(jsonPath)) {
      try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
    }
    let videoConfig = manifest.videoConfig || (fs.existsSync(videoJsonPath) ? JSON.parse(fs.readFileSync(videoJsonPath, 'utf-8')) : null);

    if (!videoConfig && fs.existsSync(defaultVideoSubtitlesPath)) {
      try {
        videoConfig = JSON.parse(fs.readFileSync(defaultVideoSubtitlesPath, 'utf-8'));
      } catch {}
    }

    res.json({ success: true, videoConfig: videoConfig || null });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-video-config
router.post('/api/save-video-config', (req, res) => {
  try {
    const {
      bundleDir: inputBundleDir, folderName,
      includeKaraokeSubtitles, subtitleColor, subtitleInactiveColor, subtitleFontSize, subtitleFont,
      subtitlePosY, subtitleBoxMode, subtitleBoxColor, subtitleBoxOpacity, subtitlePacing,
      subtitleStrokeWidth, subtitleShadowDistance, subtitleLineMode, subtitleMaxWords, subtitleMaxChars,
      subtitleWordSpacing, subtitleLineSpacing,
      wordColors, wordFontSizes, selectedPhoto, transition, includeSubBanner, subBannerTime, bannerStyle,
    } = req.body;

    const newsDir = path.resolve(__dirname, '../../news');
    let bundleDir = inputBundleDir || (folderName ? path.join(newsDir, folderName) : null);
    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(400).json({ success: false, error: 'Папка проекта не найдена' });
    }

    const jsonPath = path.join(bundleDir, 'project.json');
    let manifest = {};
    if (fs.existsSync(jsonPath)) {
      try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
    }

    const videoConfig = {
      includeKaraokeSubtitles: includeKaraokeSubtitles !== false,
      subtitleColor: subtitleColor || 'yellow',
      subtitleInactiveColor: subtitleInactiveColor || 'white',
      subtitleFontSize: Number(subtitleFontSize) || 44,
      subtitleFont: subtitleFont || 'RussoOne-Regular.ttf',
      subtitlePosY: Number(subtitlePosY) || 960,
      subtitleBoxMode: subtitleBoxMode || 'pill',
      subtitleBoxColor: subtitleBoxColor || 'black',
      subtitleBoxOpacity: Number(subtitleBoxOpacity) ?? 82,
      subtitlePacing: subtitlePacing || 'wave',
      subtitleStrokeWidth: Number(subtitleStrokeWidth) ?? 4,
      subtitleShadowDistance: Number(subtitleShadowDistance) ?? 2,
      subtitleLineMode: subtitleLineMode || 'auto',
      subtitleMaxWords: Number(subtitleMaxWords) || 0,
      subtitleMaxChars: Number(subtitleMaxChars) || 0,
      subtitleWordSpacing: Number(subtitleWordSpacing) || 10,
      subtitleLineSpacing: Number(subtitleLineSpacing) || 10,
      wordColors: wordColors || null,
      wordFontSizes: wordFontSizes || null,
      selectedPhoto: selectedPhoto || null,
      transition: transition || 'concat',
      includeSubBanner: includeSubBanner !== false,
      subBannerTime: Number(subBannerTime) || 30,
      bannerStyle: bannerStyle || 'modern_dark',
      savedAt: new Date().toISOString(),
    };

    manifest.videoConfig = videoConfig;
    if (transition) manifest.transition = transition;
    if (includeKaraokeSubtitles !== undefined) {
      manifest.hasSubtitles = Boolean(includeKaraokeSubtitles);
      manifest.subtitlesEnabled = Boolean(includeKaraokeSubtitles);
    }
    fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

    const videoConfigPath = path.join(bundleDir, 'video_config.json');
    try {
      fs.writeFileSync(videoConfigPath, JSON.stringify(videoConfig, null, 2), 'utf-8');
    } catch {}

    invalidatePackagesCache();
    res.json({ success: true, videoConfig, folderName: path.basename(bundleDir) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
