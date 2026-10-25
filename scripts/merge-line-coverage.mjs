import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const inputs = [
  { name: 'unit', file: 'coverage-unit/coverage-final.json' },
  { name: 'cypress', file: 'coverage/coverage-final.json' },
];

const normalizePath = (value) => {
  let candidate = value;
  if (candidate.startsWith('file://')) {
    try { candidate = fileURLToPath(candidate); } catch { /* keep original */ }
  }
  candidate = path.normalize(candidate);
  const relative = path.isAbsolute(candidate)
    ? path.relative(process.cwd(), candidate)
    : candidate;
  return relative.split(path.sep).join('/');
};

const readCoverage = ({ name, file }) => {
  if (!fs.existsSync(file)) throw new Error(`Missing ${file}; cannot calculate consolidated coverage.`);
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const normalized = new Map();
  for (const [filename, data] of Object.entries(raw)) {
    const key = normalizePath(filename);
    if (!key || key.startsWith('../') || path.isAbsolute(key)) continue;
    normalized.set(key, data);
  }
  console.log(`${name}: loaded ${normalized.size} files from ${file}`);
  return normalized;
};

const unit = readCoverage(inputs[0]);
const cypress = readCoverage(inputs[1]);
const allFiles = new Set([...unit.keys(), ...cypress.keys()]);
const files = {};
let totalLines = 0;
let coveredLines = 0;

const lineHits = (coverage) => {
  const hits = new Map();
  if (!coverage?.statementMap || !coverage?.s) return hits;
  for (const [id, range] of Object.entries(coverage.statementMap)) {
    const start = range.start?.line;
    const end = range.end?.line;
    if (!Number.isInteger(start) || !Number.isInteger(end)) continue;
    for (let line = start; line <= end; line += 1) {
      hits.set(line, Math.max(hits.get(line) ?? 0, coverage.s[id] > 0 ? 1 : 0));
    }
  }
  return hits;
};

for (const filename of [...allFiles].sort()) {
  const unitHits = lineHits(unit.get(filename));
  const cypressHits = lineHits(cypress.get(filename));
  const lines = new Set([...unitHits.keys(), ...cypressHits.keys()]);
  let fileCovered = 0;
  for (const line of lines) {
    if ((unitHits.get(line) ?? 0) > 0 || (cypressHits.get(line) ?? 0) > 0) fileCovered += 1;
  }
  if (lines.size === 0) continue;
  files[filename] = {
    lines: { total: lines.size, covered: fileCovered, pct: Number((fileCovered / lines.size * 100).toFixed(2)) },
    unit: { total: unitHits.size, covered: [...unitHits.values()].filter(Boolean).length },
    cypress: { total: cypressHits.size, covered: [...cypressHits.values()].filter(Boolean).length },
  };
  totalLines += lines.size;
  coveredLines += fileCovered;
}

if (totalLines === 0) throw new Error('No executable source lines found in the two coverage reports.');
const summary = {
  total: { lines: { total: totalLines, covered: coveredLines, skipped: 0, pct: Number((coveredLines / totalLines * 100).toFixed(2)) } },
  files,
  methodology: 'Line-level union: a source line is covered when either unit tests or Cypress executes a statement mapped to that line. Percentages are not added.',
};
fs.mkdirSync('coverage-combined', { recursive: true });
fs.writeFileSync('coverage-combined/coverage-summary.json', JSON.stringify(summary, null, 2) + '\n');
const pct = summary.total.lines.pct;
console.log('\nConsolidated line coverage (unit tests ∪ Cypress)');
console.log(`Lines: ${coveredLines}/${totalLines} (${pct}%)`);
console.log(`Unit-only report: coverage-unit/coverage-summary.json`);
console.log(`Cypress-only report: coverage/coverage-summary.json`);
console.log(`Consolidated detail: coverage-combined/coverage-summary.json`);
