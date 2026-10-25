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
  candidate = candidate.replace(/\\\\/g, '/');
  const srcMatch = candidate.match(/(?:^|\/)src\/(.*)$/);
  if (srcMatch) return `src/${srcMatch[1]}`;
  candidate = candidate.replace(/^https?:\/\/[^/]+\//, '').replace(/^\.\//, '');
  return path.posix.normalize(candidate);
}

function readReport({ name, file }) {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}; cannot calculate consolidated coverage.`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const normalized = new Map();
  for (const [filename, data] of Object.entries(raw)) {
    const key = normalizePath(filename);
    if (!key.startsWith('src/')) continue;
    const previous = normalized.get(key);
    if (!previous) normalized.set(key, data);
    else {
      const merged = structuredClone(previous);
      for (const [id, hits] of Object.entries(data.s ?? {})) {
        merged.s[id] = Math.max(merged.s?.[id] ?? 0, hits);
      }
      normalized.set(key, merged);
    }
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
    // Istanbul line coverage counts executable statements on their start line,
    // not every line spanned by a multi-line statement.
    result.set(line, Math.max(result.get(line) ?? 0, fileMap.s[id] > 0 ? 1 : 0));
  }
  return result;
}

const unit = readReport(inputs[0]);
const cypress = readReport(inputs[1]);
const filenames = new Set([...unit.keys(), ...cypress.keys()]);
const files = {};
let totalLines = 0;
let coveredLines = 0;
let unitCovered = 0;
let cypressCovered = 0;

for (const filename of [...filenames].sort()) {
  const unitLines = lineHits(unit.get(filename));
  const cypressLines = lineHits(cypress.get(filename));
  const allLines = new Set([...unitLines.keys(), ...cypressLines.keys()]);
  if (!allLines.size) continue;
  let covered = 0;
  let unitCount = 0;
  let cypressCount = 0;
  for (const line of allLines) {
    const u = unitLines.get(line) ?? 0;
    const c = cypressLines.get(line) ?? 0;
    if (u) unitCount += 1;
    if (c) cypressCount += 1;
    if (u || c) covered += 1;
  }
  files[filename] = {
    lines: { total: allLines.size, covered, pct: Number((covered / allLines.size * 100).toFixed(2)) },
    unit: { total: unitLines.size, covered: unitCount },
    cypress: { total: cypressLines.size, covered: cypressCount },
  };
  totalLines += allLines.size;
  coveredLines += covered;
  unitCovered += unitCount;
  cypressCovered += cypressCount;
}

if (!totalLines) throw new Error('No executable source lines found in unit or Cypress coverage reports.');
const pct = Number((coveredLines / totalLines * 100).toFixed(2));
const summary = {
  total: { lines: { total: totalLines, covered: coveredLines, skipped: 0, pct } },
  suites: {
    unit: { coveredLineOccurrences: unitCovered },
    cypress: { coveredLineOccurrences: cypressCovered },
  },
  comparison: {
    mainCypressLinesPct: 82.24,
    prCypressLinesPct: 32.77,
    consolidatedVsMainPercentagePoints: Number((pct - 82.24).toFixed(2)),
    note: 'main baseline is the previously recorded Cypress Istanbul line coverage; consolidated coverage is the union of unit and Cypress line hits.',
  },
  methodology: 'A source line is covered when at least one unit test or Cypress test executes a statement mapped to it. Percentages are not added. Executable lines are the statement start lines, matching Istanbul's line-coverage convention; the denominator is their union.',
  files,
};
fs.mkdirSync('coverage-combined', { recursive: true });
fs.writeFileSync('coverage-combined/coverage-summary.json', JSON.stringify(summary, null, 2) + '\n');
fs.writeFileSync('coverage-combined/coverage-summary.txt', [
  'Consolidated source line coverage (unit tests ∪ Cypress)',
  `Lines: ${coveredLines}/${totalLines} (${pct}%)`,
  'Previously recorded main Cypress baseline: 82.24%',
  `Difference vs main baseline: ${summary.comparison.consolidatedVsMainPercentagePoints} percentage points`,
  `Unit line hits (not additive): ${unitCovered}`,
  `Cypress line hits (not additive): ${cypressCovered}`,
].join('\n') + '\n');
console.log(fs.readFileSync('coverage-combined/coverage-summary.txt', 'utf8'));
