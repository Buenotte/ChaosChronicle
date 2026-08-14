import assert from 'assert';

console.log('🧪 [TEST] Running Audio Generation (Edge TTS) Tests...');

async function runAudioTests() {
  const sampleFolder = '2026-08-13T12-35_В_Башкортостане_после_атаки_БПЛА_горят_Н';

  const res = await fetch('http://localhost:3001/api/generate-audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folderName: sampleFolder,
      voice: 'nikolay',
    }),
  });

  assert.strictEqual(res.status, 200, 'Audio generation API must return 200');
  const data = await res.json();
  assert.ok(data.success, 'Audio generation must succeed');
  assert.ok(data.audioUrl && data.audioUrl.includes('audio.mp3'), 'Must return valid audioUrl');
  console.log(`  ✅ Audio generated successfully: ${data.audioUrl}`);
}

runAudioTests()
  .then(() => console.log('🎉 Audio Generation Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ Audio Generation Tests FAILED:', err.message);
    process.exit(1);
  });
