import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../../news');

export async function saveNewsPhotos({ title = 'News', bundleDir: inputBundleDir, folderName, photos = [] }) {
  let bundleDir = inputBundleDir;
  if (!bundleDir && folderName) {
    bundleDir = path.join(newsDir, folderName);
  }
  if (!bundleDir && title) {
    const safeTitlePart = title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_').slice(0, 20);
    if (safeTitlePart.length >= 6 && fs.existsSync(newsDir)) {
      const dirs = fs.readdirSync(newsDir, { withFileTypes: true });
      for (const d of dirs) {
        if (d.isDirectory() && d.name.includes(safeTitlePart)) {
          bundleDir = path.join(newsDir, d.name);
          break;
        }
      }
    }
  }
  if (!bundleDir) {
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').slice(0, 16);
    const safeTitle = title.replace(/[^a-zA-Z0-9а-яА-ЯёЁ]/g, '_').replace(/_+/g, '_').slice(0, 80);
    bundleDir = path.join(newsDir, `${dateStr}_${safeTitle}`);
  }

  const photosDir = path.join(bundleDir, 'photos');
  if (!fs.existsSync(photosDir)) {
    fs.mkdirSync(photosDir, { recursive: true });
  }

  const activeFilenames = new Set();
  const savedPhotos = [];

  for (let i = 0; i < photos.length; i++) {
    const imgUrl = typeof photos[i] === 'string' ? photos[i] : photos[i]?.url;
    if (!imgUrl) continue;

    const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
    const targetFilename = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
    const targetPath = path.join(photosDir, targetFilename);

    if (imgUrl.startsWith('/news-static/')) {
      const relativePath = decodeURIComponent(imgUrl.replace(/^\/news-static\//, ''));
      const fullLocalPath = path.resolve(newsDir, relativePath);
      if (fs.existsSync(fullLocalPath)) {
        if (fullLocalPath !== targetPath) {
          const buf = fs.readFileSync(fullLocalPath);
          fs.writeFileSync(targetPath, buf);
        }
        activeFilenames.add(targetFilename);
        savedPhotos.push(`photos/${targetFilename}`);
        continue;
      }
    }

    try {
      const imgRes = await fetch(imgUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        signal: AbortSignal.timeout(6000),
      });

      if (imgRes.ok) {
        const buffer = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(targetPath, buffer);
        activeFilenames.add(targetFilename);
        savedPhotos.push(`photos/${targetFilename}`);
      }
    } catch (err) {
      console.error(`Fehler beim Download von Bild ${imgUrl}:`, err.message);
    }
  }

  // Lösche nur Dateien, die nicht mehr in der Auswahl sind
  try {
    const allFiles = fs.readdirSync(photosDir);
    for (const file of allFiles) {
      if (!activeFilenames.has(file)) {
        try { fs.unlinkSync(path.join(photosDir, file)); } catch {}
      }
    }
  } catch {}

  const jsonPath = path.join(bundleDir, 'project.json');
  let manifest = {};
  if (fs.existsSync(jsonPath)) {
    try { manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8')); } catch {}
  }
  if (title && !manifest.title) {
    manifest.title = title;
    manifest.original_title = title;
  }
  manifest.photos = savedPhotos;
  manifest.photos_saved_at = new Date().toISOString();
  fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(`📸 ${savedPhotos.length} Fotos erfolgreich in ${photosDir} gespeichert.`);

  return {
    success: true,
    bundleDir,
    folderName: path.basename(bundleDir),
    savedPhotosCount: savedPhotos.length,
    photos: savedPhotos,
  };
}

export function deleteNewsPhoto({ photoUrl, bundleDir, folderName }) {
  let targetFile = null;

  if (photoUrl && photoUrl.startsWith('/news-static/')) {
    const subPath = photoUrl.replace('/news-static/', '');
    targetFile = path.join(newsDir, decodeURIComponent(subPath));
  } else if ((bundleDir || folderName) && photoUrl) {
    const dir = bundleDir || path.join(newsDir, folderName);
    const fileName = path.basename(photoUrl);
    targetFile = path.join(dir, 'photos', fileName);
  }

  if (targetFile && fs.existsSync(targetFile)) {
    try {
      fs.unlinkSync(targetFile);
      const photoDir = path.dirname(targetFile);
      const pkgDir = path.dirname(photoDir);
      const jsonPath = path.join(pkgDir, 'project.json');
      if (fs.existsSync(jsonPath)) {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const relName = `photos/${path.basename(targetFile)}`;
        manifest.photos = (manifest.photos || []).filter(p => p !== relName && p !== path.basename(targetFile));
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      }
      return { success: true, deleted: true, targetFile };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  return { success: true, deleted: false, message: 'Datei war nicht auf Festplatte' };
}
