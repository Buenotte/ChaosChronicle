import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { overlayRussianHeadlineOnThumbnail } from './photos.js';

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
      .replace(/_+/g, '_')
      .slice(0, 80);

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

        let packageTitle = manifest.title || '';
        if (!packageTitle && fs.existsSync(mdPath)) {
          try {
            const firstLine = fs.readFileSync(mdPath, 'utf-8').split('\n')[0];
            packageTitle = firstLine.replace(/^[#\s🎭\s*]+/, '').trim();
          } catch {}
        }
        if (!packageTitle) {
          packageTitle = entry.name.replace(/^[0-9T-]{16}_/, '').replace(/_/g, ' ');
        }

        const thumbSub = path.join(bundleDir, 'thumbnail', 'thumbnail.jpg');
        const thumbRoot = path.join(bundleDir, 'thumbnail.jpg');
        const hasThumbnail = fs.existsSync(thumbSub) || fs.existsSync(thumbRoot);
        const thumbnailUrl = hasThumbnail
          ? `/news-static/${entry.name}/thumbnail/thumbnail.jpg`
          : null;

        const hasScriptTxt = fs.existsSync(txtPath);
        const hasScriptMd = fs.existsSync(mdPath);
        const hasAudio = fs.existsSync(audioPath);
        const photosCount = photoFiles.length;

        const artifactCount = (hasScriptTxt ? 1 : 0) +
          (hasScriptMd ? 1 : 0) +
          (hasAudio ? 1 : 0) +
          (hasVideo ? 1 : 0) +
          (photosCount > 0 ? 1 : 0) +
          (hasThumbnail ? 1 : 0);

        packages.push({
          folderName: entry.name,
          bundleDir,
          title: packageTitle,
          original_title: manifest.original_title || packageTitle,
          date: manifest.date || null,
          model: manifest.model || 'gemini',
          source: manifest.source || '',
          hasAudio,
          hasVideo,
          hasScriptTxt,
          hasScriptMd,
          photosCount,
          photoUrls: photoFiles,
          hasThumbnail,
          thumbnailUrl,
          artifactCount,
          hasAnyArtifact: artifactCount > 0,
          audioUrl: hasAudio ? `/news-static/${entry.name}/audio.mp3` : null,
          videoUrl,
          scriptTxt: hasScriptTxt ? fs.readFileSync(txtPath, 'utf-8') : '',
          scriptMd: hasScriptMd ? fs.readFileSync(mdPath, 'utf-8') : '',
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

// POST /api/generate-title-variants (10 вариантов заголовков в стиле Голобуцкого)
router.post('/api/generate-title-variants', async (req, res) => {
  try {
    const { title = '', summary = '', bundleDir: inputBundleDir, folderName } = req.body;
    const newsDir = path.resolve(__dirname, '../../news');
    let effectiveTitle = title;

    let targetFolder = inputBundleDir;
    if (!targetFolder && folderName) {
      targetFolder = path.join(newsDir, folderName);
    }
    if (targetFolder && fs.existsSync(targetFolder)) {
      const jsonPath = path.join(targetFolder, 'project.json');
      if (fs.existsSync(jsonPath)) {
        try {
          const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
          if (manifest.original_title) effectiveTitle = manifest.original_title;
          else if (manifest.title && manifest.title.length > effectiveTitle.length) effectiveTitle = manifest.title;
        } catch {}
      }
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey || apiKey.includes('HIER')) {
      return res.json({
        success: true,
        resolvedTitle: effectiveTitle,
        variants: [
          effectiveTitle.slice(0, 30),
          `УДАР ПО ${effectiveTitle.slice(0, 20)}`,
          `САМОЛИКВИДАЦИЯ: ${effectiveTitle.slice(0, 15)}`,
        ]
      });
    }

    const systemPrompt = `Ты — мастер убойных, вирусных и сатирических заголовков для YouTube в авторском стиле «Алексей Голобуцкий» (деконструкция российской пропаганды, едкая ирония, короткие хлесткие фразы, смех как оружие).
Твоя задача: на основе новости создать РОВНО 10 РАЗНЫХ убойных вариантов заголовков.
СТРОГИЕ ТРЕБОВАНИЯ:
1. ДЛИНА КАЖДОГО ЗАГОЛОВКА: СТРОГО 4-5 СЛОВ (не больше и не меньше).
2. СТИЛЬ: Едкий сарказм, трибун, высмеивание официальной версии врага, слова-маркеры («по плану», «бункерный дед», «аналоговнет», «отрицательный рост», «скрепы», «высокоточный террор», «хлопок и задымление»).
3. БЕЗ кавычек, БЕЗ нумерации, БЕЗ точек на конце.
4. Выведи ТОЛЬКО 10 строк, по одному заголовку на строку (капсом UPPERCASE). Никаких вводных слов или пояснений.`;

    const userPrompt = `Новость: ${effectiveTitle}\nКонтекст: ${summary?.slice(0, 400) || ''}`;

    const aiRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 350,
        temperature: 0.9,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!aiRes.ok) {
      throw new Error(`AI API error: ${aiRes.status}`);
    }

    const data = await aiRes.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    const rawLines = rawContent
      .split('\n')
      .map(l => l.replace(/^[\d\s.\-•*]+/, '').replace(/["'«»`]/g, '').trim().toUpperCase())
      .filter(l => l.length > 5 && l.split(/\s+/).length >= 3 && l.split(/\s+/).length <= 7);

    // Filter unique up to 10
    const uniqueVariants = Array.from(new Set(rawLines)).slice(0, 10);

    res.json({
      success: true,
      resolvedTitle: effectiveTitle,
      variants: uniqueVariants.length > 0 ? uniqueVariants : [effectiveTitle],
    });
  } catch (err) {
    console.error('Error generating title variants:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/update-package-title (сохранение выбранного заголовка в пакет)
router.post('/api/update-package-title', async (req, res) => {
  try {
    const { bundleDir: inputBundleDir, folderName, newTitle, updateThumbnail = true } = req.body;
    const newsDir = path.resolve(__dirname, '../../news');
    let targetFolder = inputBundleDir;

    if (!targetFolder && folderName) {
      targetFolder = path.join(newsDir, folderName);
    }
    if (!targetFolder || !fs.existsSync(targetFolder)) {
      return res.status(404).json({ success: false, error: 'Папка пакета не найдена' });
    }

    if (!newTitle || !newTitle.trim()) {
      return res.status(400).json({ success: false, error: 'Заголовок не может быть пустым' });
    }

    const cleanTitle = newTitle.trim();

    // 1. Обновляем project.json
    const jsonPath = path.join(targetFolder, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        if (!manifest.original_title) manifest.original_title = manifest.title;
        manifest.title = cleanTitle;
        manifest.title_updated_at = new Date().toISOString();
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch (e) {
        console.warn('project.json update warning:', e.message);
      }
    }

    // 2. Обновляем script.md (первую строку с заголовком)
    const mdPath = path.join(targetFolder, 'script.md');
    if (fs.existsSync(mdPath)) {
      try {
        const mdContent = fs.readFileSync(mdPath, 'utf-8');
        const lines = mdContent.split('\n');
        lines[0] = `# 🎭 ${cleanTitle}`;
        fs.writeFileSync(mdPath, lines.join('\n'), 'utf-8');
      } catch (e) {
        console.warn('script.md update warning:', e.message);
      }
    }

    // 3. Обновляем thumbnail.jpg с новым заголовком
    const thumbnailDir = path.join(targetFolder, 'thumbnail');
    const destSub = path.join(thumbnailDir, 'thumbnail.jpg');
    const destRoot = path.join(targetFolder, 'thumbnail.jpg');
    const rawBackgroundPath = path.join(thumbnailDir, 'raw_background.jpg');

    if (updateThumbnail) {
      if (fs.existsSync(rawBackgroundPath)) {
        fs.copyFileSync(rawBackgroundPath, destSub);
        overlayRussianHeadlineOnThumbnail(destSub, cleanTitle, { position: 'center', fontColor: 'yellow' });
        fs.copyFileSync(destSub, destRoot);
      } else if (fs.existsSync(destSub)) {
        overlayRussianHeadlineOnThumbnail(destSub, cleanTitle, { position: 'center', fontColor: 'yellow' });
        fs.copyFileSync(destSub, destRoot);
      }
    }

    console.log(`✅ Заголовок пакета ${path.basename(targetFolder)} изменен на: "${cleanTitle}"`);

    res.json({
      success: true,
      newTitle: cleanTitle,
      folderName: path.basename(targetFolder),
      thumbnailUrl: `/news-static/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg?t=${Date.now()}`,
    });
  } catch (err) {
    console.error('Update package title error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
