import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { exec, spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// SSE Job Store für Video-Fortschritt
const videoJobs = new Map();

// GET /api/video-progress/:jobId
router.get('/api/video-progress/:jobId', (req, res) => {
  const { jobId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const sendEvent = (data) => res.write(`data: ${JSON.stringify(data)}\n\n`);

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

// POST /api/generate-video
router.post('/api/generate-video', async (req, res) => {
  try {
    const { bundleDir: inputBundleDir, folderName, transition = 'concat', jobId } = req.body;

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

    const probeCmd = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioPath}"`;

    exec(probeCmd, async (probeErr, stdout) => {
      let audioDuration = parseFloat(stdout.trim());
      if (isNaN(audioDuration) || audioDuration <= 0) {
        audioDuration = 180;
      }

      broadcastProgress(10, 'building', 'Подготовка фотографий для монтажа...');

      const FADE_DURATION = 0.8;
      let ffmpegArgs = [];
      const blurFilter = 'split[bg][fg];[bg]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080,gblur=sigma=35[blurred];[fg]scale=1920:1080:force_original_aspect_ratio=decrease[sharp];[blurred][sharp]overlay=(W-w)/2:(H-h)/2,setsar=1,format=yuv420p';

      if (transition === 'xfade' && photoFiles.length > 1) {
        const photoDuration = audioDuration / photoFiles.length;
        const effectiveDuration = photoDuration - FADE_DURATION;

        for (const f of photoFiles) {
          const fp = path.join(photosDir, f);
          ffmpegArgs.push('-loop', '1', '-t', String(photoDuration.toFixed(3)), '-i', fp);
        }
        ffmpegArgs.push('-i', audioPath);

        let filterParts = [];
        for (let i = 0; i < photoFiles.length; i++) {
          filterParts.push(`[${i}:v]${blurFilter}[v${i}]`);
        }

        let xfadeChain = '';
        let prevLabel = 'v0';
        for (let i = 1; i < photoFiles.length; i++) {
          const offset = (effectiveDuration * i).toFixed(3);
          const outLabel = i < photoFiles.length - 1 ? `xf${i}` : 'vout';
          xfadeChain += `[${prevLabel}][v${i}]xfade=transition=fade:duration=${FADE_DURATION}:offset=${offset}[${outLabel}];`;
          prevLabel = outLabel;
        }
        xfadeChain = xfadeChain.replace(/;$/, '');

        const fullFilter = filterParts.join(';') + ';' + xfadeChain;
        const audioInputIndex = photoFiles.length;

        ffmpegArgs = [
          ...ffmpegArgs,
          '-filter_complex', fullFilter,
          '-map', '[vout]',
          '-map', `${audioInputIndex}:a`,
          '-c:v', 'libx264', '-preset', 'ultrafast',
          '-c:a', 'copy',
          '-shortest',
          '-y', videoPath,
        ];
      } else {
        const photoDuration = audioDuration / photoFiles.length;
        const concatPath = path.join(bundleDir, 'concat.txt');
        let concatContent = '';
        for (const f of photoFiles) {
          const fp = path.join(photosDir, f).replace(/\\/g, '/');
          concatContent += `file '${fp}'\nduration ${photoDuration.toFixed(3)}\n`;
        }
        const lastPhoto = path.join(photosDir, photoFiles[photoFiles.length - 1]).replace(/\\/g, '/');
        concatContent += `file '${lastPhoto}'\n`;
        fs.writeFileSync(concatPath, concatContent, 'utf-8');

        ffmpegArgs = [
          '-y',
          '-f', 'concat', '-safe', '0', '-i', concatPath,
          '-i', audioPath,
          '-filter_complex', blurFilter,
          '-c:v', 'libx264', '-preset', 'ultrafast',
          '-c:a', 'copy',
          '-shortest',
          videoPath,
        ];
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
        console.log(`🎬 video.mp4 erfolgreich generiert: news/${resFolderName}/video/${videoFileName} (${transition})`);

        res.json({
          success: true,
          videoPath,
          videoFileName: `video/${videoFileName}`,
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
});

export default router;
