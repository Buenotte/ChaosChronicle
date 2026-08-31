import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { processRenderShort, wrapShortsText, getAudioDurationSeconds } from '../backend/services/shortsVideoService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../news');

console.log('🧪 [TEST 10/10] Running YouTube Shorts 9:16 Engine Tests...');

// 1. Тест алгоритма авто-переноса строк (wrapShortsText)
console.log('  🔤 Testing wrapShortsText auto-wrapping logic...');
const text1 = 'КРЕМЛЬ БОИТСЯ НОВОГО ПАПЫ';
const wrapped220 = wrapShortsText(text1, 7);
assert(wrapped220.includes('\n'), 'Text at 220px should wrap into multiple lines');
const lines = wrapped220.split('\n');
assert(lines.length >= 3, `Expected at least 3 lines for 220px, got ${lines.length}`);
console.log('  ✅ wrapShortsText wraps lines correctly at large font sizes');

// 2. Тест блокировки при отсутствии audio.mp3
console.log('  🛡️ Testing audio prerequisite validation...');
const dummyFolder = path.join(newsDir, `temp_test_shorts_dummy_${Date.now()}`);
fs.mkdirSync(dummyFolder, { recursive: true });
fs.writeFileSync(path.join(dummyFolder, 'project.json'), JSON.stringify({ title: 'Test' }));
const dummyPhotos = path.join(dummyFolder, 'photos');
fs.mkdirSync(dummyPhotos, { recursive: true });
// create a small dummy image
execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=1080x1920:d=1 -frames:v 1 "${path.join(dummyPhotos, '01.jpg')}"`, { stdio: 'ignore' });

let threwExpected = false;
try {
  await processRenderShort({ bundleDir: dummyFolder, duration: 16 });
} catch (e) {
  if (e.message.includes('audio.mp3')) {
    threwExpected = true;
  }
}
assert(threwExpected, 'processRenderShort must throw when audio.mp3 is missing');
console.log('  ✅ Audio prerequisite check correctly blocks generation without audio.mp3');

// 3. Создаем тестовое аудио и тестируем полный монтаж 9:16 Shorts
console.log('  🎬 Testing full 9:16 Shorts FFmpeg rendering pipeline...');
const audioPath = path.join(dummyFolder, 'audio.mp3');
execSync(`ffmpeg -y -f lavfi -i "sine=frequency=440:duration=4" -c:a mp3 "${audioPath}"`, { stdio: 'ignore' });

const renderRes = await processRenderShort({
  bundleDir: dummyFolder,
  duration: 4,
  hookTitle: 'СЕНСАЦИЯ В КРЕМЛЕ',
  font: 'impact',
  fontSize: 120,
  fontColor: 'yellow',
  shadowStyle: 'glow_red',
  boxEnabled: true,
  boxColor: 'black',
  boxOpacity: 80,
  posY: 200,
});

assert(renderRes.success === true, 'processRenderShort should return success: true');
assert(renderRes.shortsConfig.hookTitle === 'СЕНСАЦИЯ В КРЕМЛЕ', 'shortsConfig should match parameters');

// Проверяем сгенерированный файл через ffprobe
const outMp4 = path.join(dummyFolder, 'short.mp4');
assert(fs.existsSync(outMp4), 'short.mp4 must be created on disk');

const probeRes = execSync(
  `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0:s=x "${outMp4}"`
).toString().trim();

assert.strictEqual(probeRes, '1080x1920', `Expected resolution 1080x1920, got ${probeRes}`);
console.log('  ✅ Generated short.mp4 verified as 1080x1920 vertical video (9:16)');

// 4. Проверяем обновление manifest project.json
const updatedManifest = JSON.parse(fs.readFileSync(path.join(dummyFolder, 'project.json'), 'utf-8'));
assert(updatedManifest.hasShort === true, 'manifest.hasShort should be true');
assert.strictEqual(updatedManifest.short, 'short.mp4');
assert(updatedManifest.shortsConfig, 'manifest.shortsConfig should be saved');
console.log('  ✅ project.json manifest correctly updated with hasShort and shortsConfig');

// Очистка
try {
  fs.rmSync(dummyFolder, { recursive: true, force: true });
} catch {}

console.log('🎉 YouTube Shorts 9:16 Engine Tests PASSED!\n');
