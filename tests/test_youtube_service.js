import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../news');

console.log('🧪 [TEST] Running YouTube Audio Extraction & 3-Min Script Generator Tests...');

async function runYouTubeTests() {
  // 1. Test URL Validation
  const { isValidYouTubeUrl, extractYouTubeVideoId } = await import('../backend/services/youtubeService.js');
  assert.ok(isValidYouTubeUrl('https://www.youtube.com/watch?v=jNQXAC9IVRw'), 'Watch URL must be valid');
  assert.ok(isValidYouTubeUrl('https://youtu.be/jNQXAC9IVRw'), 'Short URL must be valid');
  assert.ok(isValidYouTubeUrl('https://www.youtube.com/shorts/jNQXAC9IVRw'), 'Shorts URL must be valid');
  assert.strictEqual(isValidYouTubeUrl('https://google.com'), false, 'Non-YouTube URL must be false');
  assert.strictEqual(extractYouTubeVideoId('https://youtu.be/jNQXAC9IVRw'), 'jNQXAC9IVRw', 'Video ID must be extracted');
  console.log('  ✅ YouTube URL validation & videoId extraction passed');

  // 2. Test /api/youtube/info endpoint
  const testUrl = 'https://www.youtube.com/watch?v=jNQXAC9IVRw';
  const infoRes = await fetch('http://localhost:3001/api/youtube/info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: testUrl }),
  });
  assert.strictEqual(infoRes.status, 200, 'Info API must return 200');
  const infoData = await infoRes.json();
  assert.ok(infoData.success, 'Info API must succeed');
  assert.ok(infoData.metadata?.title, 'Metadata must contain title');
  assert.ok(infoData.metadata?.thumbnail, 'Metadata must contain thumbnail URL');
  console.log(`  ✅ /api/youtube/info returned metadata for "${infoData.metadata.title}" (${infoData.metadata.channel})`);

  // 3. Test /api/youtube/import-to-package pipeline
  console.log('  ⚡ Testing full YouTube import pipeline (audio + transcription + 3-min script + package)...');
  const importRes = await fetch('http://localhost:3001/api/youtube/import-to-package', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: testUrl,
      style: 'scipop',
      model: 'gemini',
    }),
  });
  assert.strictEqual(importRes.status, 200, 'Import API must return 200');
  const importData = await importRes.json();
  assert.ok(importData.success, 'Import API must succeed');
  assert.ok(importData.folderName, 'Must return folderName');
  assert.ok(importData.text && importData.text.length > 100, 'Generated script must be non-empty');
  assert.ok(importData.wordCount >= 20, 'Word count must be calculated');

  const pkgDir = path.join(newsDir, importData.folderName);
  assert.ok(fs.existsSync(pkgDir), 'Package folder must exist on disk');
  assert.ok(fs.existsSync(path.join(pkgDir, 'project.json')), 'project.json must exist');
  assert.ok(fs.existsSync(path.join(pkgDir, 'script.txt')), 'script.txt must exist');
  assert.ok(fs.existsSync(path.join(pkgDir, 'source.txt')), 'source.txt must exist');
  assert.ok(fs.existsSync(path.join(pkgDir, 'yt_source_audio.mp3')), 'yt_source_audio.mp3 must exist');

  const manifest = JSON.parse(fs.readFileSync(path.join(pkgDir, 'project.json'), 'utf-8'));
  assert.strictEqual(manifest.hasAudio, false, 'hasAudio must be false until voiced');
  assert.strictEqual(manifest.style, 'scipop', 'Manifest must store scipop style');
  assert.ok(manifest.word_count > 0, 'Manifest must have word count');
  console.log(`  ✅ Package created successfully: ${importData.folderName} (${importData.wordCount} words)`);

  // Cleanup test package
  try {
    fs.rmSync(pkgDir, { recursive: true, force: true });
    console.log('  🧹 Cleaned up temporary test package');
  } catch {}
}

runYouTubeTests()
  .then(() => console.log('🎉 YouTube Service Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ YouTube Service Tests FAILED:', err.message);
    process.exit(1);
  });
