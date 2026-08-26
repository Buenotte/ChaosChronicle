import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from '../frontend/node_modules/@babel/parser/lib/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../frontend/src');

console.log('🧪 [TEST 9/9] Running Frontend React AST & Modal Smoke Tests...');

// Globale Standard-Objekte im Browser / React
const GLOBAL_WHITELIST = new Set([
  'window', 'document', 'navigator', 'console', 'fetch', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'localStorage', 'sessionStorage', 'URL', 'URLSearchParams',
  'EventSource', 'AbortController', 'AbortSignal', 'Blob', 'File', 'FileReader', 'FormData',
  'Image', 'Audio', 'Date', 'Math', 'JSON', 'Object', 'Array', 'String', 'Number', 'Boolean',
  'RegExp', 'Promise', 'Error', 'SyntaxError', 'TypeError', 'ReferenceError', 'RangeError',
  'isNaN', 'isFinite', 'parseInt', 'parseFloat', 'encodeURIComponent', 'decodeURIComponent',
  'encodeURI', 'decodeURI', 'Set', 'Map', 'WeakSet', 'WeakMap', 'Intl', 'React', 'process',
  'alert', 'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame', 'location',
  'history', 'screen', 'performance', 'crypto', 'sessionStorage', 'customElements'
]);

function getAllFiles(dir, exts = ['.jsx', '.js']) {
  let files = [];
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) {
      if (item !== 'node_modules' && item !== 'dist') {
        files = files.concat(getAllFiles(full, exts));
      }
    } else if (exts.includes(path.extname(item))) {
      files.push(full);
    }
  }
  return files;
}

let totalFilesChecked = 0;
let errorsFound = [];

const files = getAllFiles(srcDir);

for (const filePath of files) {
  const relPath = path.relative(path.resolve(__dirname, '..'), filePath);
  const code = fs.readFileSync(filePath, 'utf-8');

  try {
    const ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx'],
    });

    totalFilesChecked++;

    // Scope-Analyse: Definierte Variablen sammeln
    const declaredInFile = new Set();

    function collectBindings(node) {
      if (!node) return;
      if (node.type === 'ImportSpecifier' || node.type === 'ImportDefaultSpecifier' || node.type === 'ImportNamespaceSpecifier') {
        declaredInFile.add(node.local.name);
      } else if (node.type === 'VariableDeclarator') {
        if (node.id.type === 'Identifier') declaredInFile.add(node.id.name);
        else if (node.id.type === 'ObjectPattern') {
          node.id.properties?.forEach(p => {
            if (p.value?.type === 'Identifier') declaredInFile.add(p.value.name);
            else if (p.key?.type === 'Identifier') declaredInFile.add(p.key.name);
          });
        } else if (node.id.type === 'ArrayPattern') {
          node.id.elements?.forEach(el => { if (el?.type === 'Identifier') declaredInFile.add(el.name); });
        }
      } else if (node.type === 'FunctionDeclaration' && node.id) {
        declaredInFile.add(node.id.name);
      }
    }

    // AST durchlaufen
    function walk(node, scope = new Set()) {
      if (!node || typeof node !== 'object') return;
      const currentScope = new Set([...scope, ...declaredInFile]);

      // Parameter zu Scope hinzufügen
      if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
        node.params?.forEach(param => {
          if (param.type === 'Identifier') currentScope.add(param.name);
          else if (param.type === 'AssignmentPattern' && param.left?.type === 'Identifier') currentScope.add(param.left.name);
          else if (param.type === 'ObjectPattern') {
            param.properties?.forEach(p => {
              if (p.value?.type === 'Identifier') currentScope.add(p.value.name);
              else if (p.key?.type === 'Identifier') currentScope.add(p.key.name);
            });
          }
        });
      }

      // BlockScoped Deklarationen
      if (node.body && Array.isArray(node.body)) {
        node.body.forEach(stmt => {
          if (stmt.type === 'VariableDeclaration') {
            stmt.declarations?.forEach(d => {
              if (d.id.type === 'Identifier') currentScope.add(d.id.name);
              else if (d.id.type === 'ObjectPattern') {
                d.id.properties?.forEach(p => {
                  if (p.value?.type === 'Identifier') currentScope.add(p.value.name);
                  else if (p.key?.type === 'Identifier') currentScope.add(p.key.name);
                });
              } else if (d.id.type === 'ArrayPattern') {
                d.id.elements?.forEach(el => { if (el?.type === 'Identifier') currentScope.add(el.name); });
              }
            });
          } else if (stmt.type === 'FunctionDeclaration' && stmt.id) {
            currentScope.add(stmt.id.name);
          }
        });
      }

      // JSX Attribute Expressions prüfen (z.B. togglePlay={togglePlay})
      if (node.type === 'JSXExpressionContainer' && node.expression?.type === 'Identifier') {
        const idName = node.expression.name;
        if (!currentScope.has(idName) && !GLOBAL_WHITELIST.has(idName)) {
          errorsFound.push({ file: relPath, line: node.loc?.start?.line, variable: idName });
        }
      }

      // Rekursiv Kinder prüfen
      for (const key of Object.keys(node)) {
        if (key !== 'loc' && key !== 'range') {
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(c => walk(c, currentScope));
          } else if (child && typeof child === 'object') {
            walk(child, currentScope);
          }
        }
      }
    }

    ast.program.body.forEach(collectBindings);
    walk(ast.program);

  } catch (err) {
    errorsFound.push({ file: relPath, line: err.loc?.line || 1, variable: `Syntax Error: ${err.message}` });
  }
}

if (errorsFound.length > 0) {
  console.error(`❌ Found ${errorsFound.length} undefined reference(s) / syntax error(s):`);
  errorsFound.forEach(e => console.error(`  - ${e.file}:${e.line} -> Undefined variable: "${e.variable}"`));
  process.exit(1);
} else {
  console.log(`  ✅ All ${totalFilesChecked} React components & Modals passed AST variable reference check!`);
  console.log('🎉 Frontend React AST Smoke Tests PASSED!\n');
}
