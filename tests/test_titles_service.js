import assert from 'assert';

console.log('🧪 [TEST 2/5] Running Golobutsky Title Generator Tests...');

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

async function runTitleTests() {
  const sampleNews = 'В Белгороде после атаки дронов загорелся военный склад';

  // 1. Generate Single Punchy Title
  const punchyRes = await fetchWithRetry('http://localhost:3001/api/generate-punchy-title', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: sampleNews,
      summary: 'Ночью беспилотники атаковали склад боеприпасов.'
    }),
  });
  assert.strictEqual(punchyRes.status, 200, 'Punchy title API must return 200');
  const punchyData = await punchyRes.json();
  assert.ok(punchyData.success, 'Punchy title must succeed');
  assert.ok(punchyData.title && punchyData.title.length > 5, 'Punchy title must not be empty');
  console.log(`  ✅ Single Punchy Title: "${punchyData.title}"`);

  // 2. Generate 10 Title Variants
  const variantsRes = await fetchWithRetry('http://localhost:3001/api/generate-title-variants', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: sampleNews,
      summary: 'Атака БПЛА в Белгороде'
    }),
  });
  assert.strictEqual(variantsRes.status, 200, 'Title variants API must return 200');
  const variantsData = await variantsRes.json();
  assert.ok(variantsData.success, 'Title variants must succeed');
  assert.ok(Array.isArray(variantsData.variants), 'Variants must be an array');
  assert.ok(variantsData.variants.length >= 3, 'Must return at least 3-10 variants');
  console.log(`  ✅ 10 Variants generated (${variantsData.variants.length} options):`);
  variantsData.variants.slice(0, 3).forEach((v, i) => console.log(`     ${i + 1}. ${v}`));
}

runTitleTests()
  .then(() => console.log('🎉 Title Generator Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ Title Generator Tests FAILED:', err.message);
    process.exit(1);
  });
