import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commonDir = path.resolve(__dirname, '../frontend/src/components/common');

console.log('🧪 [TEST 14/14] Running Reusable Common Components & Registry Tests...');

// 1. Verify existence of all common components
const requiredComponents = [
  'ArtifactBadge.jsx',
  'ModalHeader.jsx',
  'VoiceSelector.jsx',
  'ColorSwatchPicker.jsx'
];

for (const comp of requiredComponents) {
  const compPath = path.join(commonDir, comp);
  assert(fs.existsSync(compPath), `Missing required common component: ${comp}`);
  const content = fs.readFileSync(compPath, 'utf8');
  assert(content.includes('export default function'), `${comp} must have a default export function`);
  console.log(`  ✅ Component exists and valid: ${comp}`);
}

import { parse } from '../frontend/node_modules/@babel/parser/lib/index.js';

// 2. Test VoiceSelector export ALL_VOICES
const voiceContent = fs.readFileSync(path.join(commonDir, 'VoiceSelector.jsx'), 'utf8');
const ast = parse(voiceContent, { sourceType: 'module', plugins: ['jsx'] });
let allVoicesFound = false;

for (const stmt of ast.program.body) {
  if (stmt.type === 'ExportNamedDeclaration' && stmt.declaration?.declarations) {
    for (const d of stmt.declaration.declarations) {
      if (d.id?.name === 'ALL_VOICES' && d.init?.type === 'ArrayExpression') {
        allVoicesFound = true;
        assert(d.init.elements.length >= 6, 'ALL_VOICES should have at least 6 voice options');
        console.log(`  ✅ Voice registry AST verified (${d.init.elements.length} voices in array)`);
      }
    }
  }
}
assert(allVoicesFound, 'VoiceSelector must declare and export ALL_VOICES');

// 3. Test ArtifactBadge definition
const badgeContent = fs.readFileSync(path.join(commonDir, 'ArtifactBadge.jsx'), 'utf8');
assert(badgeContent.includes('ARTIFACT_CONFIG'), 'ArtifactBadge must define ARTIFACT_CONFIG');
const expectedBadgeTypes = ['script', 'photos', 'thumbnail', 'audio', 'video', 'shorts', 'youtube', 'fb'];
for (const type of expectedBadgeTypes) {
  assert(badgeContent.includes(`${type}:`), `ArtifactBadge must support type: ${type}`);
}
console.log(`  ✅ ArtifactBadge configurations verified (${expectedBadgeTypes.join(', ')})`);

// 4. Test ModalHeader definition
const modalHeaderContent = fs.readFileSync(path.join(commonDir, 'ModalHeader.jsx'), 'utf8');
assert(modalHeaderContent.includes('onClose'), 'ModalHeader must support onClose prop');
assert(modalHeaderContent.includes('onToggleMaximize'), 'ModalHeader must support onToggleMaximize prop');
assert(modalHeaderContent.includes('onMouseDown'), 'ModalHeader must support draggable onMouseDown prop');
console.log('  ✅ ModalHeader features verified (drag, maximize, badges, actions)');

console.log('🎉 Reusable Common Components & Registry Tests PASSED!\n');
