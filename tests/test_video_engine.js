import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

console.log('🧪 [TEST 8/8] Running Video Engine & Subscribe Banner Tests...');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runVideoEngineTests() {
  const rootDir = path.resolve(__dirname, '..');
  const bannerDir = path.join(rootDir, 'assets', 'banner');
  const modernDarkBanner = path.join(bannerDir, 'banner_modern_dark.webm');
  const ytStudioBanner = path.join(bannerDir, 'banner_youtube_studio.webm');

  // 1. Verify Banner Assets exist and are non-empty
  console.log('  🎬 Verifying subscribe banner assets...');
  assert.ok(fs.existsSync(modernDarkBanner), 'banner_modern_dark.webm must exist');
  assert.ok(fs.statSync(modernDarkBanner).size > 50000, 'banner_modern_dark.webm must be > 50KB');

  assert.ok(fs.existsSync(ytStudioBanner), 'banner_youtube_studio.webm must exist');
  assert.ok(fs.statSync(ytStudioBanner).size > 50000, 'banner_youtube_studio.webm must be > 50KB');
  console.log('  ✅ Both modern_dark and youtube_studio banners verified');

  // 2. Test FFmpeg overlay pipeline with transparent WebM banner
  const tempTestDir = path.join(rootDir, 'news', `temp_test_video_${Date.now()}`);
  fs.mkdirSync(tempTestDir, { recursive: true });
  const testBgImg = path.join(tempTestDir, 'bg.jpg');
  const testOutVid = path.join(tempTestDir, 'test_output.mp4');

  try {
    console.log('  ⚡ Testing FFmpeg video generation with dynamic subscribe banner overlay...');
    execSync(`ffmpeg -y -f lavfi -i color=c=0x0f172a:s=1280x720:d=3 -frames:v 1 "${testBgImg}"`, { timeout: 10000 });

    const testCmd = `ffmpeg -y -loop 1 -t 3 -i "${testBgImg}" -itsoffset 1 -i "${modernDarkBanner}" -filter_complex "[1:v]scale=1280:-1[ovl];[0:v][ovl]overlay=(W-w)/2:H-h-20:enable='gte(t,1)'[v]" -map "[v]" -c:v libx264 -pix_fmt yuv420p -t 3 "${testOutVid}"`;
    execSync(testCmd, { timeout: 25000 });

    assert.ok(fs.existsSync(testOutVid), 'Rendered test video must exist');
    const vStat = fs.statSync(testOutVid);
    assert.ok(vStat.size > 5000, 'Rendered video size must be > 5KB');
    console.log(`  ✅ Video banner overlay pipeline rendered successfully (${Math.round(vStat.size / 1024)} KB)`);
  } finally {
    if (fs.existsSync(tempTestDir)) {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
      console.log('  🧹 Cleaned up temporary test video package');
    }
  }
}

runVideoEngineTests()
  .then(() => console.log('🎉 Video Engine & Subscribe Banner Tests PASSED!\n'))
  .catch(err => {
    console.error('❌ Video Engine Tests FAILED:', err.message);
    process.exit(1);
  });
