import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec, execSync, execFile, spawn } from 'child_process';
import { processRenderShort, processPreviewShortFrame } from '../services/shortsVideoService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// SSE Job Store für Video-Fortschritt
const videoJobs = new Map();

// GET /api/video-progress/:jobId
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
    videoJobs.set(jobId, { clients: new Set(), progress: 0, status: 'waiting', log: '' });
  }
  const job = videoJobs.get(jobId);
  job.clients.add(sendEvent);

  sendEvent({ progress: job.progress, status: job.status, log: job.log });

  req.on('close', () => {
    job.clients.delete(sendEvent);
    if (job.clients.size === 0 && job.status === 'done') {
      videoJobs.delete(jobId);
    }
  });
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

    const broadcastProgress = (progress, status, log = '') => {
      if (!jobId) return;
      if (!videoJobs.has(jobId)) {
        videoJobs.set(jobId, { clients: new Set(), progress: 0, status: 'waiting', log: '' });
      }
      const job = videoJobs.get(jobId);
      job.progress = progress;
      job.status = status;
      job.log = log;
      for (const client of job.clients) {
        try { client({ progress, status, log }); } catch {}
      }
    };

    broadcastProgress(5, 'probing', 'Определение длительности аудио...');

    execFile('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath], async (probeErr, stdout) => {
      let audioDuration = parseFloat((stdout || '').trim());
      if (isNaN(audioDuration) || audioDuration <= 0) {
        audioDuration = 180;
      }

      const blurFilter = 'split[bg][fg];[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=35[blurred];[fg]scale=1920:1080:force_original_aspect_ratio=decrease[sharp];[blurred][sharp]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p';
      let ffmpegArgs = [];

      const tempFramesDir = path.join(bundleDir, 'temp_frames');
      if (!fs.existsSync(tempFramesDir)) fs.mkdirSync(tempFramesDir, { recursive: true });

      broadcastProgress(10, 'building', 'Параллельное масштабирование фото 1080p...');

      const framePromises = photoFiles.map((pf, i) => new Promise((resolve) => {
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
      }));

      const resolvedFrames = await Promise.all(framePromises);
      const normalizedFrames = resolvedFrames.filter(Boolean);

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

      const isXfade = (transition === 'crossfade' || transition === 'fadeblack') && activeFrames.length > 1;
      const xfadeType = transition === 'fadeblack' ? 'fadeblack' : 'fade';

      if (isXfade) {
        const N = activeFrames.length;
        const D = Math.min(0.8, (audioDuration / N) * 0.4);
        const Tbase = (audioDuration + (N - 1) * D) / N;
        const step = Tbase - D;

        ffmpegArgs.push('-y');
        for (let i = 0; i < N; i++) {
          ffmpegArgs.push('-loop', '1', '-t', Tbase.toFixed(3), '-i', activeFrames[i]);
        }
        const audioIdx = N;
        ffmpegArgs.push('-i', audioPath);

        const bannerIdx = N + 1;
        if (hasBanner) ffmpegArgs.push('-i', bannerPath);

        const filterParts = [];
        for (let i = 0; i < N; i++) {
          filterParts.push(`[${i}:v]fps=30,settb=AVTB,setpts=PTS-STARTPTS[f${i}]`);
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
          filterParts.push(`[v_slides][sub_b]overlay=(W-w)/2:H-h-50:enable='between(t,${bannerSec},${bannerSec + 6})':eof_action=pass[v]`);
          ffmpegArgs.push('-filter_complex', filterParts.join(';'), '-map', '[v]', '-map', `${audioIdx}:a`);
        } else {
          ffmpegArgs.push('-filter_complex', filterParts.join(';'), '-map', '[v_slides]', '-map', `${audioIdx}:a`);
        }

        ffmpegArgs.push('-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'stillimage', '-threads', '0', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-shortest', videoPath);
      } else {
        if (hasBanner) {
          ffmpegArgs = [
            '-y',
            '-f', 'concat', '-safe', '0', '-i', concatPath,
            '-i', audioPath,
            '-i', bannerPath,
            '-filter_complex', `[0:v]fps=30[bg];[2:v]setpts=PTS-STARTPTS+${bannerSec}/TB[sub_b];[bg][sub_b]overlay=(W-w)/2:H-h-50:enable='between(t,${bannerSec},${bannerSec + 6})':eof_action=pass[v]`,
            '-map', '[v]',
            '-map', '1:a',
            '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'stillimage', '-threads', '0', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '192k',
            '-shortest',
            videoPath,
          ];
        } else {
          ffmpegArgs = [
            '-y',
            '-f', 'concat', '-safe', '0', '-i', concatPath,
            '-i', audioPath,
            '-c:v', 'libx264', '-preset', 'ultrafast', '-tune', 'stillimage', '-threads', '0', '-pix_fmt', 'yuv420p',
            '-c:a', 'aac', '-b:a', '192k',
            '-shortest',
            videoPath,
          ];
        }
      }

      broadcastProgress(15, 'encoding', 'Начало кодирования видео FFmpeg...');

      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
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
        if (code !== 0) {
          broadcastProgress(0, 'error', `FFmpeg завершился с ошибкой (код ${code})`);
          console.error('FFmpeg error:', ffmpegStderr.slice(-800));
          return res.status(500).json({ success: false, error: `Ошибка создания видео: FFmpeg код ${code}` });
        }

        broadcastProgress(100, 'done', 'Видео успешно смонтировано!');

        const jsonPath = path.join(bundleDir, 'project.json');
        if (fs.existsSync(jsonPath)) {
          try {
            const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
            manifest.hasVideo = true;
            manifest.video_generated_at = new Date().toISOString();
            manifest.transition = transition;
            fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
          } catch {}
        }

        const resFolderName = path.basename(bundleDir);
        try {
          fs.copyFileSync(videoPath, path.join(bundleDir, 'video.mp4'));
        } catch {}

        console.log(`🎬 video.mp4 erfolgreich generiert: news/${resFolderName}/video.mp4 (${transition})`);

        res.json({
          success: true,
          videoPath,
          videoFileName: `video/${videoFileName}`,
          videoUrl: `/news-static/${resFolderName}/video.mp4?t=${Date.now()}`,
          folderName: resFolderName,
          duration: audioDuration,
          photosCount: photoFiles.length,
          transition,
        });
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
    res.json(result);
  } catch (err) {
    console.error('Render short error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
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

export default router;
