import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
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
  const rawBackgroundPath = path.join(thumbnailDir, 'raw_background.jpg');
  const tempRaw = path.join(thumbnailDir, 'raw_temp.png');
  const styleJsonPath = path.join(thumbnailDir, 'style.json');

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

  // Funktion zum Speichern von style.json und project.json
  const saveStyleAndManifest = () => {
    const styleData = {
      text: titleToRender,
      font: headlineConfig.font || 'impact',
      fontFamilyName: headlineConfig.fontFamilyName || 'Impact, sans-serif',
      fontSize: headlineConfig.fontSize || 'auto',
      customSizeNum: headlineConfig.fontSize !== 'auto' && headlineConfig.fontSize ? Number(headlineConfig.fontSize) : 82,
      fontColor: headlineConfig.fontColor || 'yellow',
      borderColor: headlineConfig.borderColor || 'black',
      borderWidth: headlineConfig.borderWidth !== undefined ? Number(headlineConfig.borderWidth) : 9,
      shadowDistance: headlineConfig.shadowDistance !== undefined ? Number(headlineConfig.shadowDistance) : 4,
      isItalic: !!headlineConfig.isItalic,
      tiltAngle: Number(headlineConfig.tiltAngle) || 0,
      position: headlineConfig.position || 'center',
      hasBox: !!headlineConfig.hasBox,
      photoUrl: photoUrl || null,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(styleJsonPath, JSON.stringify(styleData, null, 2), 'utf-8');

    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        manifest.thumbnail = 'thumbnail/thumbnail.jpg';
        manifest.title = titleToRender;
        manifest.headlineConfig = styleData;
        manifest.thumbnail_updated_at = styleData.updatedAt;
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch {}
    }
    return styleData;
  };

  // A) Nur Headline neu formatieren oder gewähltes Foto als Hintergrund verwenden
  if (mode === 'apply_headline') {
    let sourceFile = null;
    if (photoUrl && photoUrl.startsWith('/news-static/')) {
      const subPath = photoUrl.replace('/news-static/', '');
      sourceFile = path.join(newsDir, decodeURIComponent(subPath));
    }

    if (sourceFile && fs.existsSync(sourceFile)) {
      const scaleCmd = `ffmpeg -y -i "${sourceFile}" -filter_complex "[0:v]scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720[v]" -map "[v]" -q:v 2 "${destSub}"`;
      try {
        execSync(scaleCmd, { timeout: 10000 });
      } catch {
        fs.copyFileSync(sourceFile, destSub);
      }
      fs.copyFileSync(destSub, rawBackgroundPath);
    } else if (fs.existsSync(rawBackgroundPath)) {
      fs.copyFileSync(rawBackgroundPath, destSub);
    } else if (fs.existsSync(destSub)) {
      fs.copyFileSync(destSub, rawBackgroundPath);
    }
    overlayRussianHeadlineOnThumbnail(destSub, titleToRender, headlineConfig);

    const savedStyle = saveStyleAndManifest();

    return {
      success: true,
      thumbnailUrl: `/news-static/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg?t=${Date.now()}`,
      folderName: path.basename(targetFolder),
      style: savedStyle,
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
  }

  const savedStyle = saveStyleAndManifest();

  return {
    success: true,
    thumbnailUrl: `/news-static/${path.basename(targetFolder)}/thumbnail/thumbnail.jpg?t=${Date.now()}`,
    folderName: path.basename(targetFolder),
    style: savedStyle,
  };
}
