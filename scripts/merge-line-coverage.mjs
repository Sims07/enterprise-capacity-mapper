import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const inputs = [
  { name: 'Vitest', file: 'coverage-unit/coverage-final.json' },
  { name: 'Playwright', file: 'coverage-e2e/coverage-final.json' },
];

function normalizePath(value) {
  let candidate = String(value);
  if (candidate.startsWith('file://')) {
    try { candidate = fileURLToPath(candidate); } catch { /* retain original */ }
  }
  candidate = candidate.split(String.fromCharCode(92)).join('/');
  const marker = '/src/';
  const sourceIndex = candidate.lastIndexOf(marker);
  if (sourceIndex >= 0) return path.posix.normalize(candidate.slice(sourceIndex + 1));
  if (candidate.startsWith('src/')) return path.posix.normalize(candidate);
  return path.posix.normalize(candidate.replace(/^\.\//, ''));
}

function readReport({ name, file }) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}; cannot calculate combined coverage.`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const normalized = new Map();
  for (const [filename, data] of Object.entries(raw)) {
    const key = normalizePath(filename);
    if (key.startsWith('src/')) normalized.set(key, data);
  }
  if (normalized.size === 0) throw new Error(`${name} report contains no src/ files.`);
  console.log(`${name}: ${normalized.size} source files in ${file}`);
  return normalized;
}

function lineHits(fileMap) {
  const result = new Map();
  if (!fileMap?.statementMap || !fileMap?.s) return result;
  for (const [id, statement] of Object.entries(fileMap.statementMap)) {
    const line = statement.start?.line;
    if (!Number.isInteger(line)) continue;
    result.set(line, Math.max(result.get(line) ?? 0, fileMap.s[id] > 0 ? 1 : 0));
  }
  return result;
}

const [unit, e2e] = inputs.map(readReport);
const files = {};
let totalLines = 0;
let unitCovered = 0;
let e2eCovered = 0;
let combinedCovered = 0;

for (const filename of [...e2e.keys()].sort()) {
  const unitLines = lineHits(unit.get(filename));
  const e2eLines = lineHits(e2e.get(filename));
  // Use the instrumented E2E source lines as the denominator, matching the
  // historical Cypress badge scope. Unit coverage contributes only when it
  // maps to the same executable source line in a file reached by Playwright.
  const executableLines = new Set(e2eLines.keys());
  if (executableLines.size === 0) continue;
  let unitCoveredFile = 0;
  let e2eCoveredFile = 0;
  let combinedCoveredFile = 0;
  for (const line of executableLines) {
    const unitHit = unitLines.get(line) ?? 0;
    const e2eHit = e2eLines.get(line) ?? 0;
    if (unitHit) unitCoveredFile += 1;
    if (e2eHit) e2eCoveredFile += 1;
    if (unitHit || e2eHit) combinedCoveredFile += 1;
  }
  const total = executableLines.size;
  files[filename] = {
    lines: { total, covered: combinedCoveredFile, pct: Number((combinedCoveredFile / total * 100).toFixed(2)) },
    vitest: { total, covered: unitCoveredFile, pct: Number((unitCoveredFile / total * 100).toFixed(2)) },
    playwright: { total, covered: e2eCoveredFile, pct: Number((e2eCoveredFile / total * 100).toFixed(2)) },
  };
  totalLines += total;
  unitCovered += unitCoveredFile;
  e2eCovered += e2eCoveredFile;
  combinedCovered += combinedCoveredFile;
}
if (totalLines === 0) throw new Error('No executable source lines found in the Vitest or Playwright reports.');

const pct = value => Number((value / totalLines * 100).toFixed(2));
const summary = {
  total: { lines: { total: totalLines, covered: combinedCovered, skipped: 0, pct: pct(combinedCovered) } },
  suites: {
    vitest: { lines: { total: totalLines, covered: unitCovered, pct: pct(unitCovered) } },
    playwright: { lines: { total: totalLines, covered: e2eCovered, pct: pct(e2eCovered) } },
  },
  methodology: 'The denominator is the executable source lines in the Playwright Istanbul report, matching the historical Cypress E2E coverage scope. A line is covered when either Playwright or Vitest executes a statement mapped to that line in a Playwright-instrumented source file. Unit-only source files are excluded from the badge denominator; unit coverage remains available in the Vitest report. Suite percentages overlap and must not be added.',
  files,
};
fs.mkdirSync('coverage-combined', { recursive: true });
fs.writeFileSync('coverage-combined/coverage-summary.json', JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync('coverage-combined/coverage-summary.txt', [
  'Combined source line coverage (Vitest ∪ Playwright; Playwright denominator)',
  `Vitest: ${unitCovered}/${totalLines} (${pct(unitCovered)}%)`,
  `Playwright: ${e2eCovered}/${totalLines} (${pct(e2eCovered)}%)`,
  `Combined union: ${combinedCovered}/${totalLines} (${pct(combinedCovered)}%)`,
  'Note: percentages overlap and must not be added.',
].join('\n') + '\n');
console.log(fs.readFileSync('coverage-combined/coverage-summary.txt', 'utf8'));
