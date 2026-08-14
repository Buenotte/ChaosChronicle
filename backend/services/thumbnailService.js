import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { generateGolubuzkiTitle } from '../routes/feuilleton.js';
import { generate4CornerAiPrompt, generateGeminiImage } from './aiImageService.js';
import { overlayRussianHeadlineOnThumbnail } from './thumbnailOverlayService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

export async function processSetThumbnail({
  photoUrl,
  bundleDir: inputBundleDir,
  folderName,
  mode = 'direct',
  headlineConfig = {},
}) {
  let targetFolder = inputBundleDir;
  if (!targetFolder && folderName) {
    targetFolder = path.join(newsDir, folderName);
  }
  if (!targetFolder || !fs.existsSync(targetFolder)) {
    throw new Error('Paketordner nicht gefunden');
  }

  const thumbnailDir = path.join(targetFolder, 'thumbnail');
  if (!fs.existsSync(thumbnailDir)) {
    fs.mkdirSync(thumbnailDir, { recursive: true });
  }

  const destSub = path.join(thumbnailDir, 'thumbnail.jpg');
  const destRoot = path.join(targetFolder, 'thumbnail.jpg');
  const rawBackgroundPath = path.join(thumbnailDir, 'raw_background.jpg');
  const tempRaw = path.join(thumbnailDir, 'raw_temp.png');

  let fullNewsTitle = '';
  const jsonPath = path.join(targetFolder, 'project.json');
  if (fs.existsSync(jsonPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      fullNewsTitle = manifest.title || '';
    } catch {}
  }
  if (!fullNewsTitle) {
    const mdPath = path.join(targetFolder, 'script.md');
    if (fs.existsSync(mdPath)) {
      try {
        const firstLine = fs.readFileSync(mdPath, 'utf-8').split('\n')[0];
        fullNewsTitle = firstLine.replace(/^[#\s🎭\s*]+/, '').trim();
      } catch {}
    }
  }
  if (!fullNewsTitle) {
    fullNewsTitle = path.basename(targetFolder).replace(/^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}_/, '').replace(/_/g, ' ');
  }

  let titleToRender = headlineConfig?.text;
  if (!titleToRender) {
    const wordCount = fullNewsTitle.split(/\s+/).filter(Boolean).length;
    if (wordCount > 6) {
      titleToRender = await generateGolubuzkiTitle(fullNewsTitle);
    } else {
      titleToRender = fullNewsTitle;
    }
  }

  // A) Nur Headline neu formatieren
  if (mode === 'apply_headline') {
    if (fs.existsSync(rawBackgroundPath)) {
      fs.copyFileSync(rawBackgroundPath, destSub);
    } else if (fs.existsSync(destSub)) {
      fs.copyFileSync(destSub, rawBackgroundPath);
    }
    overlayRussianHeadlineOnThumbnail(destSub, titleToRender, headlineConfig);
    fs.copyFileSync(destSub, destRoot);

    return {
      success: true,
      thumbnailUrl: `/news-static/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg?t=${Date.now()}`,
      folderName: path.basename(targetFolder),
    };
  }

  // B) Neue KI-Bildgenerierung (Gemini 16:9)
  if (mode === 'generate_ai' || mode === 'auto') {
    const photosDir = path.join(targetFolder, 'photos');
    let availablePhotos = [];
    if (fs.existsSync(photosDir)) {
      availablePhotos = fs.readdirSync(photosDir)
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .map(f => path.join(photosDir, f));
    }

    let scriptText = '';
    const txtPath = path.join(targetFolder, 'script.txt');
    const mdPath = path.join(targetFolder, 'script.md');
    if (fs.existsSync(txtPath)) {
      try { scriptText = fs.readFileSync(txtPath, 'utf-8'); } catch {}
    } else if (fs.existsSync(mdPath)) {
      try { scriptText = fs.readFileSync(mdPath, 'utf-8'); } catch {}
    }

    const promptEn = await generate4CornerAiPrompt(
      fullNewsTitle,
      scriptText,
      availablePhotos.map(p => path.basename(p))
    );

    let aiSuccess = false;
    const geminiBuffer = await generateGeminiImage(promptEn);
    if (geminiBuffer && geminiBuffer.length > 5000) {
      fs.writeFileSync(tempRaw, geminiBuffer);
      try {
        execSync(`ffmpeg -y -i "${tempRaw}" -vf "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720" -q:v 2 "${destSub}"`, { timeout: 10000 });
        try { fs.unlinkSync(tempRaw); } catch {}
      } catch {
        fs.writeFileSync(destSub, geminiBuffer);
      }
      aiSuccess = true;
    }

    if (!aiSuccess && availablePhotos.length > 0) {
      const singlePhoto = availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
      const ffmpegCmd = `ffmpeg -y -i "${singlePhoto}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720,gblur=sigma=40,eq=brightness=-0.05:contrast=1.15[bg];[0:v]scale=1280:720:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2" -q:v 2 "${destSub}"`;
      try {
        execSync(ffmpegCmd, { timeout: 15000 });
      } catch {
        fs.copyFileSync(singlePhoto, destSub);
      }
    }

    fs.copyFileSync(destSub, rawBackgroundPath);
    overlayRussianHeadlineOnThumbnail(destSub, titleToRender, headlineConfig);
    fs.copyFileSync(destSub, destRoot);
  } else {
    let sourceFile = null;
    if (photoUrl && photoUrl.startsWith('/news-static/')) {
      const subPath = photoUrl.replace('/news-static/', '');
      sourceFile = path.join(newsDir, decodeURIComponent(subPath));
    }

    if (sourceFile && fs.existsSync(sourceFile)) {
      fs.copyFileSync(sourceFile, destSub);
    } else if (photoUrl && photoUrl.startsWith('http')) {
      const imgRes = await fetch(photoUrl, { signal: AbortSignal.timeout(6000) });
      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(destSub, buffer);
      }
    }

    fs.copyFileSync(destSub, rawBackgroundPath);
    overlayRussianHeadlineOnThumbnail(destSub, titleToRender, headlineConfig);
    fs.copyFileSync(destSub, destRoot);
  }

  if (fs.existsSync(jsonPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
      manifest.thumbnail = 'thumbnail/thumbnail.jpg';
      fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
    } catch {}
  }

  return {
    success: true,
    thumbnailUrl: `/news-static/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg?t=${Date.now()}`,
    folderName: path.basename(targetFolder),
  };
}
