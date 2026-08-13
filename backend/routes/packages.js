import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// POST /api/save-news-package
router.post('/api/save-news-package', async (req, res) => {
  try {
    const { title = '', text = '', model = 'gemini', source = '', images = [], imageUrl = '' } = req.body;

    const newsDir = path.resolve(__dirname, '../../news');
    if (!fs.existsSync(newsDir)) {
      fs.mkdirSync(newsDir, { recursive: true });
    }

    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const safeTitle = (title || 'Feuilleton')
      .replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_')
      .slice(0, 40);

    const bundleDir = path.join(newsDir, `${dateStr}_${safeTitle}`);
    const photosDir = path.join(bundleDir, 'photos');
    fs.mkdirSync(photosDir, { recursive: true });

    const words = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.round((words / 140) * 10) / 10;

    let imagesList = Array.isArray(images) && images.length > 0
      ? [...images]
      : (imageUrl ? [imageUrl] : []);

    let imageIdx = 0;
    const textWithEmbeddedImages = text.split('\n\n').map(p => {
      if (p.startsWith('[B-Roll:')) {
        const currentImg = imagesList[imageIdx % (imagesList.length || 1)];
        imageIdx++;
        return `${p}\n${currentImg ? `![Иллюстрация к новости](${currentImg})` : ''}`;
      }
      return p;
    }).join('\n\n');

    const mdContent = `# 🎭 ${title}\n\n- **Дата**: ${now.toLocaleString('ru-RU')}\n- **Модель ИИ**: ${model}\n- **Хронометраж**: ~${minutes} мин.\n- **Количество слов**: ${words}\n- **Источник**: ${source || 'RSS Feed'}\n\n---\n\n${textWithEmbeddedImages}\n`;
    fs.writeFileSync(path.join(bundleDir, 'script.md'), mdContent, 'utf-8');

    const cleanSpeechText = text
      .split('\n\n')
      .filter(p => !p.startsWith('[B-Roll:'))
      .join('\n\n');
    fs.writeFileSync(path.join(bundleDir, 'script.txt'), cleanSpeechText, 'utf-8');

    const savedPhotos = [];
    for (let i = 0; i < Math.min(imagesList.length, 30); i++) {
      const imgUrl = typeof imagesList[i] === 'string' ? imagesList[i] : imagesList[i]?.url;
      if (!imgUrl) continue;

      try {
        const imgRes = await fetch(imgUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(6000),
        });

        if (imgRes.ok) {
          const buffer = Buffer.from(await imgRes.arrayBuffer());
          const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
          const imgFileName = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
          fs.writeFileSync(path.join(photosDir, imgFileName), buffer);
          savedPhotos.push(`photos/${imgFileName}`);
        }
      } catch (err) {
        console.error(`Fehler beim Laden von ${imgUrl}:`, err.message);
      }
    }

    const projectManifest = {
      title,
      source,
      model,
      date: now.toISOString(),
      duration_target_seconds: Math.round(minutes * 60),
      word_count: words,
      speech_text_file: 'script.txt',
      markdown_file: 'script.md',
      photos: savedPhotos,
    };
    fs.writeFileSync(path.join(bundleDir, 'project.json'), JSON.stringify(projectManifest, null, 2), 'utf-8');

    console.log(`💾 Пакет сохранен в news/: ${bundleDir}`);

    res.json({
      success: true,
      bundleDir,
      folderName: path.basename(bundleDir),
      savedPhotosCount: savedPhotos.length,
    });
  } catch (err) {
    console.error('Save package error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/saved-packages
router.get('/api/saved-packages', async (req, res) => {
  try {
    const newsDir = path.resolve(__dirname, '../../news');
    if (!fs.existsSync(newsDir)) {
      return res.json({ success: true, packages: [] });
    }

    const entries = fs.readdirSync(newsDir, { withFileTypes: true });
    const packages = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const bundleDir = path.join(newsDir, entry.name);
        const jsonPath = path.join(bundleDir, 'project.json');
        const audioPath = path.join(bundleDir, 'audio.mp3');
        const txtPath = path.join(bundleDir, 'script.txt');
        const mdPath = path.join(bundleDir, 'script.md');
        const photosDir = path.join(bundleDir, 'photos');

        let manifest = {};
        if (fs.existsSync(jsonPath)) {
          try {
            manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          } catch {}
        }

        let photoFiles = [];
        if (fs.existsSync(photosDir)) {
          photoFiles = fs.readdirSync(photosDir).map(f => `/news-static/${entry.name}/photos/${f}`);
        }

        const videoDir = path.join(bundleDir, 'video');
        let latestVideoFile = null;
        if (fs.existsSync(videoDir)) {
          const videoFiles = fs.readdirSync(videoDir)
            .filter(f => f.endsWith('.mp4'))
            .map(f => ({ name: f, time: fs.statSync(path.join(videoDir, f)).mtimeMs }))
            .sort((a, b) => b.time - a.time);
          if (videoFiles.length > 0) {
            latestVideoFile = videoFiles[0].name;
          }
        }
        const hasVideo = !!latestVideoFile;
        const videoUrl = latestVideoFile ? `/news-static/${entry.name}/video/${latestVideoFile}` : null;

        packages.push({
          folderName: entry.name,
          bundleDir,
          title: manifest.title || entry.name.replace(/^[0-9T-]{16}_/, '').replace(/_/g, ' '),
          date: manifest.date || null,
          model: manifest.model || 'gemini',
          source: manifest.source || '',
          hasAudio: fs.existsSync(audioPath),
          hasVideo,
          hasScriptTxt: fs.existsSync(txtPath),
          hasScriptMd: fs.existsSync(mdPath),
          photosCount: photoFiles.length,
          photoUrls: photoFiles,
          audioUrl: fs.existsSync(audioPath) ? `/news-static/${entry.name}/audio.mp3` : null,
          videoUrl,
          scriptTxt: fs.existsSync(txtPath) ? fs.readFileSync(txtPath, 'utf-8') : '',
          scriptMd: fs.existsSync(mdPath) ? fs.readFileSync(mdPath, 'utf-8') : '',
        });
      }
    }

    res.json({ success: true, packages });
  } catch (err) {
    console.error('List packages error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/save-script-text
router.post('/api/save-script-text', async (req, res) => {
  try {
    const { bundleDir: inputBundleDir, folderName, text = '' } = req.body;

    const newsDir = path.resolve(__dirname, '../../news');
    let bundleDir = inputBundleDir;

    if (!bundleDir && folderName) {
      bundleDir = path.join(newsDir, folderName);
    }

    if (!bundleDir || !fs.existsSync(bundleDir)) {
      return res.status(404).json({ success: false, error: 'Ordner existiert nicht' });
    }

    const txtPath = path.join(bundleDir, 'script.txt');
    fs.writeFileSync(txtPath, text, 'utf-8');

    const jsonPath = path.join(bundleDir, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const words = text.split(/\s+/).filter(Boolean).length;
        manifest.word_count = words;
        manifest.text_updated_at = new Date().toISOString();
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch {}
    }

    console.log(`📜 script.txt in ${bundleDir} erfolgreich aktualisiert.`);

    res.json({
      success: true,
      bundleDir,
      folderName: path.basename(bundleDir),
      text,
    });
  } catch (err) {
    console.error('Save script error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
