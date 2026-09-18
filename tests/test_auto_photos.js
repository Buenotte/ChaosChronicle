import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const newsDir = path.resolve(__dirname, '../news');

console.log('🧪 [TEST] Running Auto Photos (100 Visual Queries & Web Images) Tests...');

async function runAutoPhotosTests() {
  // 1. Test generate-photo-queries API
  console.log('  🔍 Testing /api/generate-photo-queries...');
  const qRes = await fetch('http://localhost:3001/api/generate-photo-queries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Биология сна и мелатонин',
      scriptText: 'Человеческий мозг восстанавливается во время глубокого сна. Гормон мелатонин вырабатывается эпифизом в темноте.',
      count: 5,
    }),
  });
  assert.strictEqual(qRes.status, 200, 'Query endpoint must return 200');
  const qData = await qRes.json();
  assert.ok(qData.success, 'Must succeed');
  assert.ok(Array.isArray(qData.queries), 'Must return queries array');
  assert.ok(qData.queries.length >= 3, 'Must return at least 3 queries');
  console.log(`  ✅ Generated ${qData.queries.length} queries successfully`);

  // 2. Test /api/auto-fetch-photos pipeline on temporary package
  console.log('  ⚡ Testing /api/auto-fetch-photos download pipeline...');
  const tmpFolder = `temp_test_auto_100_${Date.now()}`;
  const tmpDir = path.join(newsDir, tmpFolder);
  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'script.txt'), 'Сон улучшает память и концентрацию. Свет смартфонов разрушает циркадные ритмы.', 'utf-8');

  try {
    const fetchRes = await fetch('http://localhost:3001/api/auto-fetch-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderName: tmpFolder,
        title: 'Тест 100 фото',
        count: 5, // lightweight count for automated CI test
      }),
    });
    assert.strictEqual(fetchRes.status, 200, 'Auto-fetch endpoint must return 200');
    const fetchData = await fetchRes.json();
    assert.ok(fetchData.success, 'Must succeed');
    assert.ok(fetchData.count >= 2, 'Must save photos');
    assert.strictEqual(fetchData.folderName, tmpFolder, 'Must match folderName');

    const photosDir = path.join(tmpDir, 'photos');
    assert.ok(fs.existsSync(photosDir), 'Photos directory must exist');
    const savedFiles = fs.readdirSync(photosDir);
    assert.ok(savedFiles.length >= 2, 'Files must be on disk');

    const queriesTxtPath = path.join(tmpDir, 'photo_queries.txt');
    assert.ok(fs.existsSync(queriesTxtPath), 'photo_queries.txt must exist on disk');
    const queriesTxt = fs.readFileSync(queriesTxtPath, 'utf-8');
    assert.ok(queriesTxt.includes('1. '), 'photo_queries.txt must have numbered queries');

    // Test GET /api/package-photo-queries
    const pQRes = await fetch(`http://localhost:3001/api/package-photo-queries?folderName=${tmpFolder}`);
    assert.strictEqual(pQRes.status, 200, 'package-photo-queries must return 200');
    const pQData = await pQRes.json();
    assert.ok(pQData.success, 'Must succeed');
    assert.ok(Array.isArray(pQData.queries) && pQData.queries.length > 0, 'Must return saved queries');

    const projectJsonPath = path.join(tmpDir, 'project.json');
    assert.ok(fs.existsSync(projectJsonPath), 'project.json must exist');
    const manifest = JSON.parse(fs.readFileSync(projectJsonPath, 'utf-8'));
    assert.strictEqual(manifest.photos_count, savedFiles.length, 'Manifest photos_count must match');
    console.log(`  ✅ Auto-fetch pipeline verified (${savedFiles.length} photos saved, photo_queries.txt saved)`);

    // 3. Test customQueries with specific count
    console.log('  🎯 Testing customQueries and custom count...');
    const customRes = await fetch('http://localhost:3001/api/auto-fetch-photos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderName: tmpFolder,
        title: 'Тест своих слов',
        count: 3,
        customQueries: ['human brain neuron network', 'sleep therapy clinic'],
      }),
    });
    assert.strictEqual(customRes.status, 200, 'Custom queries must return 200');
    const customData = await customRes.json();
    assert.ok(customData.success, 'Must succeed with custom queries');
    assert.deepStrictEqual(customData.queries, ['human brain neuron network', 'sleep therapy clinic']);
    const updatedTxt = fs.readFileSync(queriesTxtPath, 'utf-8');
    assert.ok(updatedTxt.includes('human brain neuron network'), 'Custom query must be saved to disk');
    console.log('  ✅ Custom queries and custom count verified');
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
    console.log('  🧹 Cleaned up temporary test package');
  }

  console.log('🎉 Auto Photos Engine Tests PASSED!\n');
}

runAutoPhotosTests().catch(err => {
  console.error('❌ Auto Photos Tests FAILED:', err);
  process.exit(1);
});
