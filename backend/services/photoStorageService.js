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

  const existingInDir = fs.readdirSync(photosDir);
  existingInDir.forEach(f => {
    try { fs.unlinkSync(path.join(photosDir, f)); } catch {}
  });

  const savedPhotos = [];
  for (let i = 0; i < photos.length; i++) {
    const imgUrl = typeof photos[i] === 'string' ? photos[i] : photos[i]?.url;
    if (!imgUrl) continue;

    if (imgUrl.startsWith('/news-static/')) {
      const relativePath = imgUrl.replace(/^\/news-static\//, '');
      const fullLocalPath = path.resolve(newsDir, relativePath);
      if (fs.existsSync(fullLocalPath)) {
        const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
        const imgFileName = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
        const targetPath = path.join(photosDir, imgFileName);
        if (fullLocalPath !== targetPath && fs.existsSync(fullLocalPath)) {
          fs.copyFileSync(fullLocalPath, targetPath);
        }
        savedPhotos.push(`photos/${imgFileName}`);
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
        const ext = imgUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
        const imgFileName = `photo_${String(i + 1).padStart(2, '0')}.${ext}`;
        const imgPath = path.join(photosDir, imgFileName);
        fs.writeFileSync(imgPath, buffer);
        savedPhotos.push(`photos/${imgFileName}`);
      }
    } catch (err) {
      console.error(`Fehler beim Download von Bild ${imgUrl}:`, err.message);
    }
  }

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

export function deleteNewsPhoto({ photoUrl, bundleDir }) {
  let targetFile = null;

  if (photoUrl && photoUrl.startsWith('/news-static/')) {
    const subPath = photoUrl.replace('/news-static/', '');
    targetFile = path.join(newsDir, decodeURIComponent(subPath));
  } else if (bundleDir && photoUrl) {
    const fileName = path.basename(photoUrl);
    targetFile = path.join(bundleDir, 'photos', fileName);
  }

  if (targetFile && fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
    const photoDir = path.dirname(targetFile);
    const pkgDir = path.dirname(photoDir);
    const jsonPath = path.join(pkgDir, 'project.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        const relName = `photos/${path.basename(targetFile)}`;
        manifest.photos = (manifest.photos || []).filter(p => p !== relName);
        fs.writeFileSync(jsonPath, JSON.stringify(manifest, null, 2), 'utf-8');
      } catch {}
    }
    return { success: true, deleted: true, targetFile };
  }

  return { success: true, deleted: false, message: 'Datei war nicht auf Festplatte' };
}
