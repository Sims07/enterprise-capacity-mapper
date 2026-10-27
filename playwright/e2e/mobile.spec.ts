import { expect, test, type Page } from '../fixtures';

const fresh = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
};

const assertNoHorizontalOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
};

test.describe('Playwright mobile regression', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page);
  });

  test('affiche Outils sous forme d’icône et garde le bouton dans le viewport entre 390px et 600px', async ({ page }) => {
    const toggle = page.getByTestId('tools-menu-toggle');

    for (const width of [390, 430, 600]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(toggle).toBeVisible();
      await expect(toggle).toContainText('Outils');

      const metrics = await toggle.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return {
          before: getComputedStyle(element, '::before').content,
          after: getComputedStyle(element, '::after').content,
          left: rect.left,
          right: rect.right,
          labelWidth: element.querySelector('span')?.getBoundingClientRect().width ?? 0,
        };
      });

      expect(metrics.before).toBe('"🔧"');
      expect(metrics.after).toBe('none');
      expect(metrics.left).toBeGreaterThanOrEqual(0);
      expect(metrics.right).toBeLessThanOrEqual(width);
      expect(metrics.labelWidth).toBeLessThanOrEqual(1);
      await assertNoHorizontalOverflow(page);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await toggle.click();
    await expect(page.getByTestId('tools-menu')).toHaveClass(/is-open/);
  });

  test('conserve la navigation texte sur desktop au-delà de 600px', async ({ page }) => {
    await page.setViewportSize({ width: 601, height: 900 });
    const toggle = page.getByTestId('tools-menu-toggle');
    await expect(toggle).toBeVisible();
    const pseudoContent = await toggle.evaluate((element) => getComputedStyle(element, '::before').content);
    expect(pseudoContent).toBe('none');
    await expect(toggle).toContainText('Outils');
  });

  test('répartit la navigation mobile sans chevauchement à 390px et 600px', async ({ page }) => {
    for (const width of [390, 600]) {
      await page.setViewportSize({ width, height: 844 });

      const navigation = page.locator('.primary-navigation');
      const items = [
        page.getByTestId('nav-cartography'),
        page.getByTestId('nav-analysis'),
        page.getByTestId('primary-library'),
        page.getByTestId('tools-menu-toggle'),
      ];

      const metrics = await Promise.all(items.map(async locator => locator.evaluate(element => {
        const rect = element.getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
          scrollWidth: element.scrollWidth,
          clientWidth: element.clientWidth,
        };
      })));

      expect(metrics[0].scrollWidth).toBeLessThanOrEqual(metrics[0].clientWidth + 1);
      expect(metrics[1].scrollWidth).toBeLessThanOrEqual(metrics[1].clientWidth + 1);
      expect(metrics[2].scrollWidth).toBeLessThanOrEqual(metrics[2].clientWidth + 1);
      expect(metrics[3].right).toBeLessThanOrEqual(width);
      expect(metrics[0].right).toBeLessThanOrEqual(metrics[1].left + 1);
      expect(metrics[1].right).toBeLessThanOrEqual(metrics[2].left + 1);
      expect(metrics[2].right).toBeLessThanOrEqual(metrics[3].left + 1);
      await expect(navigation).toHaveCSS('grid-template-columns', /48px/);
      await assertNoHorizontalOverflow(page);
    }
  });

  test('garde la navigation tactile et la cartographie sans débordement à 390×844', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('nav-cartography')).toBeVisible();
    await expect(page.getByTestId('nav-analysis')).toBeVisible();
    await expect(page.getByTestId('primary-library')).toBeVisible();
    for (const locator of [page.getByTestId('nav-cartography'), page.getByTestId('nav-analysis'), page.getByTestId('primary-library')]) {
      await expect(locator).toHaveCSS('min-height', '42px');
    }
    await expect(page.locator('.workspace > aside .search')).toHaveCSS('font-size', '16px');
    await assertNoHorizontalOverflow(page);

    for (const row of await page.locator('.map-row:not(.map-head)').all()) {
      const metrics = await row.evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    }
  });

  test('garde la feuille Structure dans le viewport mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Structure' }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    const rect = await dialog.boundingBox();
    expect(rect).not.toBeNull();
    expect(rect!.x).toBeGreaterThanOrEqual(0);
    expect(rect!.width).toBeLessThanOrEqual(390);
    expect(rect!.x + rect!.width).toBeLessThanOrEqual(390);
    await expect(dialog.locator('input').first()).toHaveCSS('font-size', '16px');
    await assertNoHorizontalOverflow(page);
  });

  test('garde les actions Relations accessibles sans débordement', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('tab-relations').click();
    await expect(page.locator('.coverage-tree')).toBeVisible();
    for (const row of await page.locator('.tree-row').all()) {
      const metrics = await row.evaluate((element) => ({ scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth + 1);
    }
    await assertNoHorizontalOverflow(page);
