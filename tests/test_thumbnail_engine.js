import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { overlayRussianHeadlineOnThumbnail } from '../backend/services/thumbnailOverlayService.js';

console.log('🧪 [TEST 3/5] Running Typography & Thumbnail Engine Tests...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runThumbnailTests() {
  const newsDir = path.resolve(__dirname, '../news');
  const tempTestFolder = `temp_test_thumb_${Date.now()}`;
  const testPkgDir = path.join(newsDir, tempTestFolder);
  const testThumbDir = path.join(testPkgDir, 'thumbnail');
  fs.mkdirSync(testThumbDir, { recursive: true });

  const testImg = path.join(testThumbDir, 'thumbnail.jpg');
  const testRaw = path.join(testThumbDir, 'raw_background.jpg');

  // Erstelle ein temporäres Test-Hintergrundbild mit FFmpeg
  execSync(`ffmpeg -y -f lavfi -i color=c=0x1e293b:s=1280x720:d=1 -frames:v 1 "${testRaw}"`, { timeout: 10000 });
  fs.copyFileSync(testRaw, testImg);

  // Erstelle minimale project.json
  fs.writeFileSync(path.join(testPkgDir, 'project.json'), JSON.stringify({
    title: 'ТЕСТОВАЯ НОВОСТЬ ДЛЯ ПРОВЕРКИ',
    original_title: 'Тестовая новость',
  }, null, 2), 'utf-8');

  try {
    // 1. Test FFmpeg Headline Overlay with custom settings
    console.log('  🎨 Testing FFmpeg overlay with Impact font, 10px contour and 5px shadow...');
    overlayRussianHeadlineOnThumbnail(testImg, 'САМОЛИКВИДАЦИЯ: ПО ПЛАНУ', {
      font: 'impact',
      fontSize: 84,
      fontColor: 'yellow',
      borderColor: 'black',
      borderWidth: 10,
      shadowDistance: 5,
      position: 'center',
      tiltAngle: -4,
    });

    assert.ok(fs.existsSync(testImg), 'Rendered image must exist');
    const stat = fs.statSync(testImg);
    assert.ok(stat.size > 1000, 'Rendered thumbnail file size must be > 1KB');
    console.log(`  ✅ FFmpeg Overlay completed successfully (${Math.round(stat.size / 1024)} KB)`);

    // 2. Test Apply Headline API & style.json generation
    const applyRes = await fetch('http://localhost:3001/api/set-thumbnail', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: 'apply_headline',
        folderName: tempTestFolder,
        headlineConfig: {
          text: 'ТЕСТОВЫЙ ЗАГОЛОВОК: ПО ПЛАНУ',
          font: 'impact',
          fontSize: 80,
          fontColor: 'yellow',
          borderColor: 'black',
          borderWidth: 9,
          shadowDistance: 4,
          position: 'center',
          tiltAngle: -4,
        }
      }),
    });

    assert.strictEqual(applyRes.status, 200, 'apply_headline API must return 200');
    const applyData = await applyRes.json();
    assert.ok(applyData.success, 'apply_headline must return success');

    // 3. Test GET /api/thumbnail-style
    const styleRes = await fetch(`http://localhost:3001/api/thumbnail-style?folderName=${tempTestFolder}`);
    assert.strictEqual(styleRes.status, 200, 'thumbnail-style API must return 200');
    const styleData = await styleRes.json();
    assert.ok(styleData.success && styleData.style, 'Must return saved style');
    assert.strictEqual(styleData.style.text, 'ТЕСТОВЫЙ ЗАГОЛОВОК: ПО ПЛАНУ');
    console.log('  ✅ style.json generation & retrieval verified');
  } finally {
    // Test-Ordner sauber aufräumen
    if (fs.existsSync(testPkgDir)) {
      fs.rmSync(testPkgDir, { recursive: true, force: true });
      console.log('  🧹 Cleaned up temporary test package');
    }
  }
}

runThumbnailTests()
  .then(() => console.log('🎉 Thumbnail Engine Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ Thumbnail Engine Tests FAILED:', err.message);
    process.exit(1);
  });
