import assert from 'assert';

console.log('🧪 [TEST] Running Custom Fonts Service Tests...');

async function runFontsTests() {
  try {
    // 1. Get Custom Fonts List
  const listRes = await fetch('http://localhost:3001/api/custom-fonts');
  assert.strictEqual(listRes.status, 200, 'Custom fonts list API must return 200');
  const listData = await listRes.json();
  assert.ok(listData.success, 'Custom fonts list must return success');
  assert.ok(Array.isArray(listData.fonts), 'Fonts must be an array');
  console.log(`  ✅ GET /api/custom-fonts passed (${listData.fonts.length} custom fonts registered)`);

  // 2. Upload Dummy Font (Verification of Base64 upload route)
  const dummyFontBase64 = Buffer.from('TEST_FONT_DATA').toString('base64');
  const uploadRes = await fetch('http://localhost:3001/api/upload-font', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: 'test_font.ttf',
      fontName: 'TestFont',
      base64Data: dummyFontBase64,
    }),
  });
  assert.strictEqual(uploadRes.status, 200, 'Upload font API must return 200');
  const uploadData = await uploadRes.json();
  assert.ok(uploadData.success, 'Upload font must return success');
  assert.strictEqual(uploadData.font.name, 'TestFont');
    // 3. Clean up uploaded dummy test font
    const delRes = await fetch('http://localhost:3001/api/delete-font', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'test_font.ttf' }),
    });
    console.log('  ✅ Cleaned up temporary test font');
  } finally {
    // Fallback direct cleanup if needed
    try {
      const fs = await import('fs');
      const path = await import('path');
      const testFile = path.resolve('backend/custom_fonts/test_font.ttf');
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
    } catch {}
  }
}

runFontsTests()
  .then(() => console.log('🎉 Custom Fonts Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ Custom Fonts Tests FAILED:', err.message);
    process.exit(1);
  });
