import { execSync, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

export function isValidYouTubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const ytRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)[\w\-]{11}/i;
  return ytRegex.test(url.trim());
}

export function extractYouTubeVideoId(url) {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/)|youtu\.be\/)([\w\-]{11})/i);
  return match ? match[1] : null;
}

export async function fetchYouTubeMetadata(url) {
  if (!isValidYouTubeUrl(url)) {
    throw new Error('Некорректная ссылка на YouTube видео');
  }

  const cleanUrl = url.trim();
  const args = [
    '--dump-single-json',
    '--no-warnings',
    '--no-playlist',
    '--no-update',
    '--js-runtimes', `node:${process.execPath}`,
    '--extractor-args', 'youtube:player_client=android,web',
    cleanUrl,
  ];

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn('yt-dlp', args, { windowsHide: true, encoding: 'utf-8' });

    proc.stdout.on('data', data => { stdout += data; });
    proc.stderr.on('data', data => { stderr += data; });

    proc.on('close', code => {
      if (code !== 0) {
        return reject(new Error(stderr || `yt-dlp завершился с кодом ${code}`));
      }
      try {
        const info = JSON.parse(stdout);
        resolve({
          id: info.id || extractYouTubeVideoId(cleanUrl),
          title: info.title || 'YouTube Video',
          description: (info.description || '').slice(0, 3000),
          channel: info.uploader || info.channel || 'YouTube',
          duration: info.duration || 0,
          thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`,
          viewCount: info.view_count || 0,
          url: cleanUrl,
        });
      } catch (err) {
        reject(new Error(`Ошибка парсинга метаданных YouTube: ${err.message}`));
      }
    });

    proc.on('error', err => {
      reject(new Error(`Не удалось запустить yt-dlp: ${err.message}`));
    });
  });
}

export async function downloadYouTubeAudio(url, outputDir, baseName = 'audio') {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const cleanUrl = url.trim();
  const template = path.join(outputDir, `${baseName}.%(ext)s`);

  return new Promise((resolve, reject) => {
    const args = [
      '-f', 'bestaudio/best',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '4',
      '--no-playlist',
      '--no-update',
      '--js-runtimes', `node:${process.execPath}`,
      '--extractor-args', 'youtube:player_client=android,web',
      '-o', template,
      cleanUrl,
    ];

    const proc = spawn('yt-dlp', args, { windowsHide: true });
    let stderr = '';

    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      const finalMp3 = path.join(outputDir, `${baseName}.mp3`);
      if (fs.existsSync(finalMp3)) {
        return resolve(finalMp3);
      }

      // Check if another format audio file was created
      const files = fs.readdirSync(outputDir);
      const match = files.find(f => f.startsWith(baseName) && /\.(mp3|m4a|wav|opus|webm|ogg)$/i.test(f));
      if (match) {
        const foundPath = path.join(outputDir, match);
        // If not mp3, convert with ffmpeg to mp3
        if (!match.endsWith('.mp3')) {
          try {
            execSync(`ffmpeg -y -i "${foundPath}" -vn -c:a libmp3lame -q:a 4 "${finalMp3}"`, { stdio: 'ignore', windowsHide: true });
            if (fs.existsSync(finalMp3)) return resolve(finalMp3);
          } catch {}
        }
        return resolve(foundPath);
      }

      if (code !== 0) {
        reject(new Error(`yt-dlp скачивание аудио не удалось: ${stderr || code}`));
      } else {
        reject(new Error('Аудиофайл не найден после загрузки yt-dlp'));
      }
    });

    proc.on('error', err => {
      reject(new Error(`Ошибка запуска yt-dlp для аудио: ${err.message}`));
    });
  });
}

export async function downloadSubtitlesIfAvailable(url, outputDir) {
  const cleanUrl = url.trim();
  const template = path.join(outputDir, 'subtitles.%(ext)s');
  try {
    execSync(`yt-dlp --skip-download --write-auto-sub --write-sub --sub-lang "ru,uk,de,en" --sub-format vtt/srt --no-playlist --no-update --js-runtimes "node:${process.execPath}" --extractor-args "youtube:player_client=android,web" -o "${template}" "${cleanUrl}"`, {
      timeout: 35000,
      stdio: 'ignore',
      windowsHide: true,
    });
  } catch (err) {
    console.warn('Subtitles fetch info:', err.message);
  }

  try {
    const files = fs.readdirSync(outputDir);
    const subFile = files.find(f => f.startsWith('subtitles') && (f.endsWith('.vtt') || f.endsWith('.srt')));
    if (subFile) {
      const rawSub = fs.readFileSync(path.join(outputDir, subFile), 'utf-8');
      const cleanLines = rawSub
        .replace(/^WEBVTT.*/g, '')
        .replace(/\d+:\d+:\d+[.,]\d+\s*-->\s*\d+:\d+:\d+[.,]\d+.*/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&gt;&gt;|>>/g, ' ')
        .replace(/\[(музыка|смех|аплодисменты|music|applause)\]/gi, '')
        .replace(/^\d+\s*$/gm, '')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.includes('-->') && !l.startsWith('Kind:') && !l.startsWith('Language:'));

      const dedup = [];
      for (const line of cleanLines) {
        if (dedup.length === 0 || dedup[dedup.length - 1] !== line) dedup.push(line);
      }
      const fullText = dedup.join(' ').trim();
      if (fullText.length > 50) return fullText;
    }
  } catch {}
  return null;
}

export async function transcribeAudioFile(audioPath, modelSize = 'base') {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Файл аудио не найден: ${audioPath}`);
  }

  const scriptPath = path.join(rootDir, 'backend', 'scripts', 'transcribe_audio.py');
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Скрипт транскрипции не найден: ${scriptPath}`);
  }

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    const proc = spawn('python', [scriptPath, audioPath, modelSize], {
      windowsHide: true,
      cwd: rootDir,
    });

    proc.stdout.on('data', d => { stdout += d.toString(); });
    proc.stderr.on('data', d => { stderr += d.toString(); });

    proc.on('close', code => {
      try {
        const trimmed = stdout.trim();
        const jsonMatch = trimmed.match(/\{[\s\S]*\}$/);
        if (jsonMatch) {
          const res = JSON.parse(jsonMatch[0]);
          if (res.success) resolve(res);
          else reject(new Error(res.error || 'Ошибка транскрипции Whisper'));
        } else {
          reject(new Error(stderr || stdout || `Whisper завершился с кодом ${code}`));
        }
      } catch (err) {
        reject(new Error(`Ошибка парсинга ответа Whisper: ${err.message}. Raw: ${stdout.slice(0, 300)}`));
      }
    });

    proc.on('error', err => {
      reject(new Error(`Не удалось запустить Python для Whisper: ${err.message}`));
    });
  });
}

export async function downloadThumbnail(imageUrl, destPath) {
  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const dir = path.dirname(destPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(destPath, buffer);
    return true;
  } catch (err) {
    console.warn(`Не удалось скачать thumbnail ${imageUrl}: ${err.message}`);
    return false;
  }
}
