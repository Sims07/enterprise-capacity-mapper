import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = path.join(repositoryRoot, 'src');
const sourceExtensions = new Set(['.js', '.jsx', '.ts', '.tsx']);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async entry => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(fullPath);
    return sourceExtensions.has(path.extname(entry.name)) ? [fullPath] : [];
  }));
  return nested.flat();
}

function importedSpecifiers(source) {
  const specifiers = [];
  const expression = /(?:\bfrom\s*|\bimport\s*\()\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]/g;
  for (const match of source.matchAll(expression)) specifiers.push(match[1] ?? match[2]);
  return specifiers;
}

function isUiBoundary(relative) {
  return relative === 'App.tsx' || relative.startsWith('main.') || relative.startsWith('components/') || relative.startsWith('adapters/react/');
}

test('domain stays independent from application, UI, adapters and browser infrastructure', async () => {
  const domainRoot = path.join(sourceRoot, 'domain');
  const files = await collectSourceFiles(domainRoot);
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    if (/\b(?:window|document|localStorage|sessionStorage)\b/.test(source)) {
      violations.push(`${path.relative(repositoryRoot, file)} -> direct browser global access`);
    }
    for (const specifier of importedSpecifiers(source)) {
      if (/^(?:\.\.\/)*(?:application|adapters|components|services\/ai)(?:\/|$)/.test(specifier)
        || /^(?:react|react-dom)(?:\/|$)/.test(specifier)) {
        violations.push(`${path.relative(repositoryRoot, file)} -> ${specifier}`);
      }
    }
  }

  assert.deepEqual(violations, [], `Forbidden domain dependencies:\n${violations.join('\n')}`);
});

test('application orchestrates through domain and ports, never through concrete adapters or UI', async () => {
  const applicationRoot = path.join(sourceRoot, 'application');
  const files = await collectSourceFiles(applicationRoot);
  const violations = [];

  for (const file of files) {
    const source = await readFile(file, 'utf8');
    for (const specifier of importedSpecifiers(source)) {
      if (/^(?:\.\.\/)*(?:adapters|components)(?:\/|$)/.test(specifier)
        || /^(?:react|react-dom)(?:\/|$)/.test(specifier)
        || /(?:^|\/)(?:localStorageRepository|browserViewport|browserInteractions|navigationAdapter)(?:\.[^/]*)?$/.test(specifier)) {
        violations.push(`${path.relative(repositoryRoot, file)} -> ${specifier}`);
      }
    }
    if (/\b(?:window\.localStorage|window\.sessionStorage|\blocalStorage\.|\bsessionStorage\.)/.test(source)) {
      violations.push(`${path.relative(repositoryRoot, file)} -> direct browser storage access`);
    }
  }

  assert.deepEqual(violations, [], `Forbidden application dependencies:\n${violations.join('\n')}`);
});

test('ports stay technology-neutral and do not depend on concrete adapters or UI', async () => {
  const portsRoot = path.join(sourceRoot, 'ports');
  const files = await collectSourceFiles(portsRoot);
  const violations = [];

  for (const file of files) {
    if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
    const source = await readFile(file, 'utf8');
    const relative = path.relative(repositoryRoot, file);
    if (/\b(?:window|document|localStorage|sessionStorage)\b/.test(source)) {
      violations.push(`${relative} -> direct browser global access`);
    }
    for (const specifier of importedSpecifiers(source)) {
      if (/^(?:\.\.\/)*(?:adapters|components|services\/ai)(?:\/|$)/.test(specifier)
        || /^(?:react|react-dom)(?:\/|$)/.test(specifier)) {
        violations.push(`${relative} -> ${specifier}`);
      }
    }
  }

  assert.deepEqual(violations, [], `Forbidden port dependencies:\n${violations.join('\n')}`);
});

test('concrete adapters remain outside domain, application and ports', async () => {
  const files = await collectSourceFiles(sourceRoot);
  const violations = [];

  for (const file of files) {
    const relative = path.relative(sourceRoot, file).split(path.sep).join('/');
    if (relative.startsWith('adapters/') || relative.endsWith('.test.ts') || isUiBoundary(relative)) continue;
    const source = await readFile(file, 'utf8');
    for (const specifier of importedSpecifiers(source)) {
      if (/^(?:\.\.\/)*(?:adapters|services\/ai)(?:\/|$)/.test(specifier)) {
        violations.push(`${relative} -> ${specifier}`);
      }
    }
  }

  assert.deepEqual(violations, [], `Concrete adapter imports outside composition/UI boundary:\n${violations.join('\n')}`);
});

test('domain and application do not import UI or browser-only packages by bare specifier', async () => {
  const roots = ['domain', 'application'];
  const violations = [];

  for (const root of roots) {
    const files = await collectSourceFiles(path.join(sourceRoot, root));
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      for (const specifier of importedSpecifiers(source)) {
        if (/^(?:react|react-dom|cypress|vitest|playwright)(?:\/|$)/.test(specifier)
          || /^(?:node:|fs|path|url|crypto|process)(?:\/|$)/.test(specifier)) {
          violations.push(`${path.relative(repositoryRoot, file)} -> ${specifier}`);
        }
      }
    }
  }

  assert.deepEqual(violations, [], `Forbidden runtime/tooling dependencies in inner layers:\n${violations.join('\n')}`);
});
