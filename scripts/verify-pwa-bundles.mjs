import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

/** Fail CI if HTML points to an absent hashed module or if the SW would precache absent files. */
const outputDirectory = process.argv[2] ?? 'dist';
const root = path.resolve(outputDirectory);
const html = await readFile(path.join(root, 'index.html'), 'utf8');
const manifest = JSON.parse(await readFile(path.join(root, 'pwa-assets.json'), 'utf8'));

assert.ok(Array.isArray(manifest.assets) && manifest.assets.length > 0, 'PWA asset manifest is missing bundled assets');
assert.ok(manifest.assets.some(file => file.endsWith('.js')), 'PWA manifest contains no JS bundle');

const referenced = [...html.matchAll(/(?:src|href)=["'](\.\/assets\/[^"']+\.(?:js|css))["']/g)].map(match => match[1]);
const allAssets = [...new Set([...manifest.assets, ...referenced])];
for (const url of allAssets) {
  assert.match(url, /^\.\/assets\/[a-zA-Z0-9_./-]+\.(?:js|css)$/, 'Invalid asset URL in release');
  const filename = path.resolve(root, url.slice(2));
  assert.ok(filename.startsWith(root + path.sep), 'Asset outside build directory');
  assert.ok((await stat(filename)).isFile(), `Missing built asset ${url}`);
}
assert.ok((await stat(path.join(root, 'sw.js'))).isFile(), 'Missing service worker');
console.log(`Verified ${allAssets.length} JS/CSS bundles in ${outputDirectory}, including PWA precache manifest.`);
