import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

console.log('🧪 [TEST] Running Audio Generation (Edge TTS) Tests...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await new Promise(r => setTimeout(r, 1500));
    }
  }
  return fetch(url, options);
}

async function runAudioTests() {
  const newsDir = path.resolve(__dirname, '../news');
  const tempTestFolder = `temp_test_audio_${Date.now()}`;
  const testPkgDir = path.join(newsDir, tempTestFolder);
  fs.mkdirSync(testPkgDir, { recursive: true });

  fs.writeFileSync(path.join(testPkgDir, 'project.json'), JSON.stringify({
    title: 'Тест аудио',
  }, null, 2), 'utf-8');

  try {
    const res = await fetchWithRetry('http://localhost:3001/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderName: tempTestFolder,
        text: 'Тестовая озвучка диктора для проверки работы голосового синтезатора Edge TTS.',
        voice: 'nikolay',
      }),
    });

    assert.strictEqual(res.status, 200, 'Audio generation API must return 200');
    const data = await res.json();
    assert.ok(data.success, 'Audio generation must succeed');
    assert.ok(data.audioUrl && data.audioUrl.includes('audio.mp3'), 'Must return valid audioUrl');
    console.log(`  ✅ Audio generated successfully: ${data.audioUrl}`);
  } finally {
    if (fs.existsSync(testPkgDir)) {
      await new Promise(r => setTimeout(r, 600));
      try {
        fs.rmSync(testPkgDir, { recursive: true, force: true });
        console.log('  🧹 Cleaned up temporary test audio package');
      } catch {}
    }
  }
}

runAudioTests()
  .then(() => console.log('🎉 Audio Generation Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ Audio Generation Tests FAILED:', err.message);
    process.exit(1);
  });
