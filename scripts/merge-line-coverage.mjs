import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const inputs = [
  { name: 'unit', file: 'coverage-unit/coverage-final.json' },
  { name: 'cypress', file: 'coverage/coverage-final.json' },
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
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}; cannot calculate consolidated coverage.`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const normalized = new Map();
  for (const [filename, data] of Object.entries(raw)) {
    const key = normalizePath(filename);
    if (!key.startsWith('src/')) continue;
    if (!normalized.has(key)) normalized.set(key, data);
  }
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

const unit = readReport(inputs[0]);
const cypress = readReport(inputs[1]);
const files = {};
let totalLines = 0;
let cypressCovered = 0;
let unitCoveredOnComparableScope = 0;
let consolidatedCovered = 0;

for (const filename of [...cypress.keys()].sort()) {
  const cypressLines = lineHits(cypress.get(filename));
  const unitLines = lineHits(unit.get(filename));
  // Keep the Cypress-instrumented executable lines as the denominator. This makes
  // the consolidated figure comparable with the historical Cypress-only baseline.
  let total = 0;
  let cypressCoveredFile = 0;
  let unitCoveredFile = 0;
  let combinedCoveredFile = 0;
  for (const [line, cypressHit] of cypressLines) {
    total += 1;
    const unitHit = unitLines.get(line) ?? 0;
    if (cypressHit) cypressCoveredFile += 1;
    if (unitHit) unitCoveredFile += 1;
    if (cypressHit || unitHit) combinedCoveredFile += 1;
  }
  if (!total) continue;
  files[filename] = {
    lines: { total, covered: combinedCoveredFile, pct: Number((combinedCoveredFile / total * 100).toFixed(2)) },
    cypress: { total, covered: cypressCoveredFile, pct: Number((cypressCoveredFile / total * 100).toFixed(2)) },
    unitOnComparableScope: { total, covered: unitCoveredFile, pct: Number((unitCoveredFile / total * 100).toFixed(2)) },
  };
  totalLines += total;
  cypressCovered += cypressCoveredFile;
  unitCoveredOnComparableScope += unitCoveredFile;
  consolidatedCovered += combinedCoveredFile;
}

if (!totalLines) throw new Error('No executable Cypress source lines found for comparable coverage.');
const pct = Number((consolidatedCovered / totalLines * 100).toFixed(2));
const cypressPct = Number((cypressCovered / totalLines * 100).toFixed(2));
const unitPct = Number((unitCoveredOnComparableScope / totalLines * 100).toFixed(2));
const summary = {
  total: { lines: { total: totalLines, covered: consolidatedCovered, skipped: 0, pct } },
  suites: {
    cypress: { lines: { total: totalLines, covered: cypressCovered, pct: cypressPct } },
    unitOnComparableScope: { lines: { total: totalLines, covered: unitCoveredOnComparableScope, pct: unitPct } },
  },
  comparison: {
    mainCypressLinesPct: 82.24,
    currentCypressLinesPct: cypressPct,
    consolidatedLinesPct: pct,
    consolidatedVsMainPercentagePoints: Number((pct - 82.24).toFixed(2)),
    note: 'The denominator is the current Cypress-instrumented executable source lines, matching the historical main Cypress-only scope as closely as possible.',
  },
  methodology: 'A source line is covered when either Cypress or a unit test executes a statement mapped to the same source file and line. The denominator is restricted to executable lines in the Cypress Istanbul report, so the consolidated percentage can be compared with the historical Cypress-only baseline. Unit-only coverage outside this scope is reported separately by c8.',
  files,
};
fs.mkdirSync('coverage-combined', { recursive: true });
fs.writeFileSync('coverage-combined/coverage-summary.json', JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync('coverage-combined/coverage-summary.txt', [
  'Comparable source line coverage (same Cypress-instrumented denominator)',
  `Cypress only: ${cypressCovered}/${totalLines} (${cypressPct}%)`,
  `Unit tests on the same source lines: ${unitCoveredOnComparableScope}/${totalLines} (${unitPct}%)`,
  `Consolidated union: ${consolidatedCovered}/${totalLines} (${pct}%)`,
  'Historical main Cypress-only baseline: 82.24%',
  `Difference vs main baseline: ${summary.comparison.consolidatedVsMainPercentagePoints} percentage points`,
  'Note: coverage percentages overlap and must not be added.',
].join('\n') + '\n');
console.log(fs.readFileSync('coverage-combined/coverage-summary.txt', 'utf8'));
