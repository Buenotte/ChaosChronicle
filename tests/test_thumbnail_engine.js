import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { overlayRussianHeadlineOnThumbnail } from '../backend/services/thumbnailOverlayService.js';

console.log('🧪 [TEST 3/5] Running Typography & Thumbnail Engine Tests...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runThumbnailTests() {
  const newsDir = path.resolve(__dirname, '../news');
  const testPkgDir = path.join(newsDir, '2026-08-13T12-35_В_Башкортостане_после_атаки_БПЛА_горят_Н');
  const testImg = path.join(testPkgDir, 'thumbnail', 'thumbnail.jpg');

  assert.ok(fs.existsSync(testImg), 'Test image thumbnail.jpg must exist');

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
  });

  assert.ok(fs.existsSync(testImg), 'Rendered image must exist');
  const stat = fs.statSync(testImg);
  assert.ok(stat.size > 10000, 'Rendered thumbnail file size must be > 10KB');
  console.log(`  ✅ FFmpeg Overlay completed successfully (${Math.round(stat.size / 1024)} KB)`);

  // 2. Test Apply Headline API
  const applyRes = await fetch('http://localhost:3001/api/set-thumbnail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mode: 'apply_headline',
      folderName: '2026-08-13T12-35_В_Башкортостане_после_атаки_БПЛА_горят_Н',
      headlineConfig: {
        text: 'БУНКЕРНЫЙ ДЕД: ОПЯТЬ НЕУДАЧА',
        font: 'impact',
        fontSize: 80,
        fontColor: 'yellow',
        borderWidth: 9,
        shadowDistance: 4,
        position: 'center'
      }
    }),
  });

  assert.strictEqual(applyRes.status, 200, 'apply_headline API must return 200');
  const applyData = await applyRes.json();
  assert.ok(applyData.success, 'apply_headline must return success');
  console.log('  ✅ POST /api/set-thumbnail (apply_headline) passed');
}

runThumbnailTests()
  .then(() => console.log('🎉 Thumbnail Engine Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ Thumbnail Engine Tests FAILED:', err.message);
    process.exit(1);
  });
