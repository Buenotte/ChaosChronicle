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
  'encodeURI', 'decodeURI', 'Set', 'Map', 'WeakSet', 'WeakMap', 'Intl', 'React', 'ReactDOM', 'process',
  'alert', 'confirm', 'prompt', 'requestAnimationFrame', 'cancelAnimationFrame', 'location',
  'history', 'screen', 'performance', 'crypto', 'sessionStorage', 'customElements', 'undefined', 'null', 'this', 'globalThis', 'FontFace'
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
      if (node.type === 'ImportDeclaration') {
        node.specifiers?.forEach(s => s.local?.name && declaredInFile.add(s.local.name));
      } else if (node.type === 'ExportNamedDeclaration' && node.declaration) {
        collectBindings(node.declaration);
      } else if (node.type === 'ExportDefaultDeclaration' && node.declaration?.id) {
        declaredInFile.add(node.declaration.id.name);
      } else if (node.type === 'VariableDeclaration') {
        node.declarations?.forEach(d => {
          if (d.id.type === 'Identifier') declaredInFile.add(d.id.name);
          else if (d.id.type === 'ObjectPattern') d.properties?.forEach(p => declaredInFile.add(p.value?.name || p.key?.name));
          else if (d.id.type === 'ArrayPattern') d.elements?.forEach(el => el?.name && declaredInFile.add(el.name));
        });
      } else if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) {
        declaredInFile.add(node.id.name);
      }
    }

    const addPatternToScope = (p, targetScope) => {
      if (!p) return;
      if (p.type === 'Identifier') targetScope.add(p.name);
      else if (p.type === 'AssignmentPattern') addPatternToScope(p.left, targetScope);
      else if (p.type === 'ObjectPattern') p.properties?.forEach(prop => addPatternToScope(prop.value || prop.key, targetScope));
      else if (p.type === 'ArrayPattern') p.elements?.forEach(el => addPatternToScope(el, targetScope));
      else if (p.type === 'RestElement') addPatternToScope(p.argument, targetScope);
    };

    // AST durchlaufen
    function walk(node, parent = null, scope = new Set()) {
      if (!node || typeof node !== 'object') return;
      const currentScope = new Set([...scope, ...declaredInFile]);

      // Parameter zu Scope hinzufügen
      if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression' || node.type === 'ClassMethod' || node.type === 'ObjectMethod') {
        node.params?.forEach(p => addPatternToScope(p, currentScope));
      }

      // Catch parameter
      if (node.type === 'CatchClause' && node.param) {
        addPatternToScope(node.param, currentScope);
      }

      // For-of / For-in / For loop variable
      if ((node.type === 'ForOfStatement' || node.type === 'ForInStatement') && node.left?.type === 'VariableDeclaration') {
        node.left.declarations?.forEach(d => addPatternToScope(d.id, currentScope));
      }
      if (node.type === 'ForStatement' && node.init?.type === 'VariableDeclaration') {
        node.init.declarations?.forEach(d => addPatternToScope(d.id, currentScope));
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

      // Prüfe alle Bezeichner (Identifiers), die als Werte/Variablen genutzt werden
      if (node.type === 'Identifier') {
        const isPropKey = (parent?.type === 'ObjectProperty' || parent?.type === 'ObjectMethod' || parent?.type === 'ClassMethod' || parent?.type === 'ClassProperty') && parent.key === node && !parent.computed && !parent.shorthand;
        const isMemberProp = (parent?.type === 'MemberExpression' || parent?.type === 'OptionalMemberExpression') && parent.property === node && !parent.computed;
        const isDeclaration = (parent?.type === 'VariableDeclarator' && parent.id === node) ||
                              (parent?.type === 'FunctionDeclaration' && parent.id === node) ||
                              (parent?.type === 'FunctionExpression' && parent.id === node) ||
                              (parent?.type === 'ImportSpecifier') ||
                              (parent?.type === 'ImportDefaultSpecifier') ||
                              (parent?.type === 'ImportNamespaceSpecifier') ||
                              (parent?.type === 'ExportSpecifier') ||
                              (parent?.type === 'ClassDeclaration' && parent.id === node) ||
                              (parent?.type === 'CatchClause' && parent.param === node) ||
                              (parent?.type === 'JSXAttribute') ||
                              (parent?.type === 'JSXIdentifier');

        if (!isPropKey && !isMemberProp && !isDeclaration) {
          const idName = node.name;
          if (!currentScope.has(idName) && !GLOBAL_WHITELIST.has(idName) && !idName.startsWith('__')) {
            errorsFound.push({ file: relPath, line: node.loc?.start?.line, variable: idName });
          }
        }
      }

      // Rekursiv Kinder prüfen
      for (const key of Object.keys(node)) {
        if (key !== 'loc' && key !== 'range') {
          const child = node[key];
          if (Array.isArray(child)) {
            child.forEach(c => walk(c, node, currentScope));
          } else if (child && typeof child === 'object') {
            walk(child, node, currentScope);
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
