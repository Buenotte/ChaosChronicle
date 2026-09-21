import assert from 'assert';

console.log('🧪 [TEST 16] Running Backend API Edge Cases & Error Handling Tests...');

const BASE_URL = 'http://localhost:3001';

async function runEdgeCases() {
  // 1. Missing package in /api/package-script-text
  const res1 = await fetch(`${BASE_URL}/api/package-script-text?folderName=non_existent_folder_99999`);
  const data1 = await res1.json();
  assert.strictEqual(data1.success, false, 'Should return success=false for non-existent package');
  console.log('  ✅ /api/package-script-text non-existent package handled');

  // 2. Empty payload in /api/generate-audio
  const res2 = await fetch(`${BASE_URL}/api/generate-audio`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(res2.status >= 400 || !(await res2.json()).success, 'Should reject empty audio generation request');
  console.log('  ✅ /api/generate-audio empty payload handled');

  // 3. YouTube metadata with missing title and folder
  const res3 = await fetch(`${BASE_URL}/api/youtube-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderName: '', title: '' }),
  });
  const data3 = await res3.json();
  assert(data3.error || data3.notGenerated || !data3.success, 'Should handle empty youtube metadata params');
  console.log('  ✅ /api/youtube-metadata empty title/folder handled');

  // 4. Custom font check with invalid font name
  const res4 = await fetch(`${BASE_URL}/api/custom-fonts`);
  const data4 = await res4.json();
  assert(Array.isArray(data4.fonts), '/api/custom-fonts should return fonts array');
  console.log(`  ✅ /api/custom-fonts returns valid font list (${data4.fonts.length} fonts)`);

  // 5. Status endpoint health
  const res5 = await fetch(`${BASE_URL}/api/status`);
  assert(res5.ok, 'Status endpoint should be 200 OK');
  const data5 = await res5.json();
  assert(data5.status === 'online' || data5.status === 'ok', 'Status should be online/ok');
  console.log('  ✅ /api/status health verified');

  console.log('🎉 Backend Edge Cases & Error Handling Tests PASSED!\n');
}

runEdgeCases().catch(err => {
  console.error('❌ Edge Cases Test Failed:', err);
  process.exit(1);
});
