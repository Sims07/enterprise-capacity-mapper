import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { expect, test } from '../fixtures';

const A4_LANDSCAPE_POINTS = { width: 841.89, height: 595.28 } as const;
const PDF_DIMENSION_TOLERANCE = 2;

test('generates a readable landscape PDF with four maps and detailed appendices', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.getByTestId('capability-map')).toBeVisible();
  await page.getByTestId('tools-menu-toggle').click();
  await page.getByTestId('export-architecture-report').click();

  const report = page.getByTestId('architecture-report');
  await expect(report).toBeVisible();
  await expect(report.getByText('Synthèse exécutive')).toBeVisible();
  for (const mode of ['identity', 'coverage', 'maturity', 'gaps']) {
    await expect(page.getByTestId('report-map-' + mode).first()).toBeAttached();
  }
  for (const section of ['annex-domains', 'annex-capabilities', 'annex-applications', 'annex-relations', 'risks', 'processes']) {
    await expect(report.locator('[data-report-section="' + section + '"]').first()).toBeAttached();
  }
  await expect(report.getByText('Gestion des Prospects & Leads').first()).toBeAttached();
  await expect(report.getByText('Salesforce CRM').first()).toBeAttached();

  const pdf = await page.pdf({ printBackground: true, preferCSSPageSize: true });
  expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  const raw = pdf.toString('latin1');
  const pageCount = (raw.match(/\/Type\s*\/Page\b/g) ?? []).length;
  const reportPageCount = await report.locator('.architecture-report-page').count();
  expect(pageCount).toBeGreaterThanOrEqual(reportPageCount);
  const mediaBoxes = [...raw.matchAll(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/g)];
  expect(mediaBoxes.length).toBeGreaterThan(0);
  for (const box of mediaBoxes) {
    expect(Math.abs(Number(box[1]) - A4_LANDSCAPE_POINTS.width)).toBeLessThan(PDF_DIMENSION_TOLERANCE);
    expect(Math.abs(Number(box[2]) - A4_LANDSCAPE_POINTS.height)).toBeLessThan(PDF_DIMENSION_TOLERANCE);
  }

  const pdfPath = testInfo.outputPath('architecture-report.pdf');
  writeFileSync(pdfPath, pdf);
  await testInfo.attach('Rapport d’architecture PDF', { path: pdfPath, contentType: 'application/pdf' });
  if (!spawnSync('pdftotext', ['-v']).error) {
    const printed = execFileSync('pdftotext', [pdfPath, '-'], { encoding: 'utf8' })
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').toLowerCase();
    for (const expected of [
      'synthese executive', 'cartographie des capacites', 'couverture fonctionnelle',
      'maturite actuelle et cible', 'ecarts et points a examiner',
      'annexe a', 'annexe b', 'annexe c', 'annexe d',
      'salesforce crm', 'gestion des prospects', 'sap s/4hana finance',
    ]) expect(printed, 'Le PDF final doit contenir ' + expected).toContain(expected);
  }

  await page.getByTestId('report-close').click();
  await expect(page.getByTestId('capability-map')).toBeVisible();
  await expect(page.getByTestId('architecture-report')).toHaveCount(0);
});

test('keeps all capabilities in appendix on a dense map without modifying local data', async ({ page }) => {
  await page.goto('/');
  const initialName = await page.getByTestId('active-map-name').textContent();
  await page.getByTestId('tools-menu-toggle').click();
  await page.getByTestId('export-architecture-report').click();
  const report = page.getByTestId('architecture-report');
  await expect(report.locator('[data-report-section="annex-capabilities"]')).not.toHaveCount(0);
  await expect(report.locator('[data-report-section="annex-relations"]')).not.toHaveCount(0);
  await expect(report.getByText('Congés & Suivi des Temps').first()).toBeAttached();
  await page.getByTestId('report-close').click();
  await expect(page.getByTestId('active-map-name')).toHaveText(initialName ?? '');
});
