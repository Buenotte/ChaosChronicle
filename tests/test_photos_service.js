import assert from 'assert';

console.log('🧪 [TEST] Running Photos Search & Storage Tests...');

async function runPhotosTests() {
  const query = 'Украина дроны атака';

  // 1. Photo Search API
  const searchRes = await fetch(`http://localhost:3001/api/news-photos?title=${encodeURIComponent(query)}&forceLive=true`);
  assert.strictEqual(searchRes.status, 200, 'Photos search API must return 200');
  const searchData = await searchRes.json();
  assert.ok(searchData.success, 'Photos search must return success');
  assert.ok(Array.isArray(searchData.photos), 'Photos must be an array');
  assert.ok(searchData.photos.length > 0, 'Must find at least 1 photo');
  console.log(`  ✅ Live Photo Search passed (${searchData.photos.length} photos found)`);

  // 2. Save Photos to Disk Test
  const sampleFolder = '2026-08-13T12-35_В_Башкортостане_после_атаки_БПЛА_горят_Н';
  const saveRes = await fetch('http://localhost:3001/api/save-news-photos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folderName: sampleFolder,
      photos: searchData.photos.slice(0, 2).map(p => p.url),
    }),
  });
  assert.strictEqual(saveRes.status, 200, 'Save photos API must return 200');
  const saveData = await saveRes.json();
  assert.ok(saveData.success, 'Save photos must succeed');
  console.log(`  ✅ Save Photos passed (${saveData.savedPhotosCount} photos saved)`);
}

runPhotosTests()
  .then(() => console.log('🎉 Photos Service Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ Photos Service Tests FAILED:', err.message);
    process.exit(1);
  });
