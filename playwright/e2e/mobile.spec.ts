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
  });

  test('affiche Outils et l’assistant sans sortir du viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('tools-menu-toggle').click();
    await expect(page.getByTestId('tools-menu')).toHaveClass(/is-open/);
    await expect(page.getByTestId('new-map-button')).toBeVisible();
    await page.getByTestId('new-map-button').click();
    const modal = page.locator('.modal.wizard');
    await expect(modal).toBeVisible();
    const box = await modal.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
  });

  test('garde le compagnon utilisable sur petit écran', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByTestId('companion-launcher').click();
    const panel = page.getByTestId('companion-panel');
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await page.getByTestId('companion-mode-conversation').click();
    const input = page.getByTestId('companion-question');
    await expect(input).toHaveCSS('font-size', '16px');
    const inputBox = await input.boundingBox();
    expect(inputBox!.height).toBeGreaterThanOrEqual(44);
    const submitBox = await page.getByTestId('companion-submit').boundingBox();
    expect(submitBox!.width).toBeGreaterThanOrEqual(44);
    expect(submitBox!.height).toBeGreaterThanOrEqual(44);
    await assertNoHorizontalOverflow(page);
  });

  test('réagit au VisualViewport lorsque le clavier mobile réduit la zone visible', async ({ page }) => {
    await page.getByTestId('companion-launcher').click();
    await page.evaluate(() => {
      const viewport = window.visualViewport;
      if (!viewport) throw new Error('VisualViewport API unavailable');
      Object.defineProperty(viewport, 'height', { configurable: true, value: 310 });
      Object.defineProperty(viewport, 'offsetTop', { configurable: true, value: 18 });
      viewport.dispatchEvent(new Event('resize'));
    });
    const panel = page.getByTestId('companion-panel');
    await expect(panel).toHaveCSS('--companion-visual-viewport-height', '310px');
    await expect(panel).toHaveCSS('--companion-visual-viewport-offset-top', '18px');
  });
});
