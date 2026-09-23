import assert from 'assert';

console.log('🧪 [TEST 4/5] Running Saved Packages & Artifacts Tests...');

async function runPackagesTests() {
  // 1. Get Saved Packages
  const res = await fetch('http://localhost:3001/api/saved-packages');
  assert.strictEqual(res.status, 200, 'Saved packages API must return 200');
  const data = await res.json();
  assert.ok(data.success, 'Saved packages must return success');
  assert.ok(Array.isArray(data.packages), 'Packages must be an array');
  assert.ok(data.packages.length > 0, 'Must have at least 1 saved package');
  console.log(`  ✅ GET /api/saved-packages passed (${data.packages.length} packages found)`);

  const samplePkg = data.packages[0];
  assert.ok(samplePkg.folderName, 'Package must have folderName');
  assert.ok(samplePkg.title, 'Package must have title');
  assert.ok(samplePkg.original_title, 'Package must have original_title');
  console.log(`  ✅ Package schema verified (Title: "${samplePkg.title.slice(0, 35)}...")`);

  // 2. Update Package Title
  const updateRes = await fetch('http://localhost:3001/api/update-package-title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folderName: samplePkg.folderName,
      newTitle: samplePkg.title,
      updateThumbnail: false,
    }),
  });
  assert.strictEqual(updateRes.status, 200, 'Update package title API must return 200');
  const updateData = await updateRes.json();
  assert.ok(updateData.success, 'Update title must return success');
  console.log('  ✅ POST /api/update-package-title passed');

  // 3. Save and Load YouTube Metadata
  const testMetaPayload = {
    folderName: samplePkg.folderName,
    title: 'ТЕСТОВЫЙ ЗАГОЛОВОК ДЛЯ YOUTUBE',
    description: 'Тестовое описание ролика с деталями и фактами.',
    tags: 'тест, новости, youtube',
    hashtags: '#тест #новости',
    facebookPost: 'Тестовый пост для Facebook',
    style: 'scipop',
    tone: 'analytics',
  };
  const saveMetaRes = await fetch('http://localhost:3001/api/save-youtube-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testMetaPayload),
  });
  const saveMetaData = await saveMetaRes.json();
  assert.ok(saveMetaData.success, 'Save YouTube metadata must return success');
  console.log('  ✅ POST /api/save-youtube-metadata passed (persisted to project.json & youtube_metadata.json)');

  // Verify loading saved metadata from cache/disk
  const loadMetaRes = await fetch('http://localhost:3001/api/youtube-metadata', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      folderName: samplePkg.folderName,
      force: false,
      style: 'scipop',
      section: 'all',
    }),
  });
  const loadMetaData = await loadMetaRes.json();
  assert.ok(loadMetaData.success, 'Load metadata must return success');
  assert.strictEqual(loadMetaData.title, testMetaPayload.title, 'Loaded title must match saved title');
  assert.strictEqual(loadMetaData.description, testMetaPayload.description, 'Loaded description must match saved description');
  console.log('  ✅ POST /api/youtube-metadata verified loading saved data from cache & disk');
}

runPackagesTests()
  .then(() => console.log('🎉 Saved Packages Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ Saved Packages Tests FAILED:', err.message);
    process.exit(1);
  });
