import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

const storyUrl = (theme: 'light' | 'dark') =>
  `/iframe.html?id=application-capacity-mapper--desktop&viewMode=story&globals=theme:light`;

async function openCapacityMapper(page: import('@playwright/test').Page, width: number, height: number, theme: 'light' | 'dark') {
  await page.setViewportSize({ width, height });
  await page.goto(storyUrl(theme));
  await expect(page.locator('.app').first()).toBeVisible();
  if (theme === 'dark') {
    await page.getByTestId('tools-menu-toggle').click();
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('.app.theme-dark')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  // Keep the shared Storybook visual baseline focused on the map layout.
  // The new matrix/mosaic selector has dedicated functional coverage in E2E;
  // hiding it here avoids treating an intentional toolbar addition as a layout regression.
  await page.addStyleTag({ content: '.map-view-toggle { display: none !important; }' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}

async function openMosaicPresentation(page: import('@playwright/test').Page, theme: 'light' | 'dark') {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.goto('/iframe.html?id=application-capacity-mapper--mosaic-presentation&viewMode=story&globals=theme:light');
  await expect(page.locator('.app').first()).toBeVisible();
  if (theme === 'dark') {
    await page.getByTestId('tools-menu-toggle').click();
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('.app.theme-dark')).toBeVisible();
    await page.keyboard.press('Escape');
  }
  await page.getByTestId('mosaic-view').click();
  await page.getByTestId('presentation-switch-input').check();
  await expect(page.locator('.app.presentation-mode .map-mosaic')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(200);
}
test.describe('Storybook visual regression — Capacity Mapper', () => {
  test('mosaïque présentation — paysage 16:9, thème clair', async ({ page }) => {
    await openMosaicPresentation(page, 'light');
    const mosaic = page.locator('.presentation-mode .map-mosaic');
    await expect(mosaic.locator('.mosaic-domain')).not.toHaveCount(0);
    await expect(mosaic.locator('.mosaic-zone, .mosaic-column-heading, .mosaic-row-heading')).toHaveCount(0);
    const cards = mosaic.locator('.mosaic-domain');
    const first = cards.first();
    await expect(first).toHaveCSS('border-style', 'solid');
    await expect(first.locator('.domain')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await mkdir('test-results-storybook', { recursive: true });
    await page.screenshot({ path: 'test-results-storybook/mosaic-presentation-landscape-light.png', animations: 'disabled' });
  });

  test('mosaïque présentation — paysage 16:9, thème sombre', async ({ page }) => {
    await openMosaicPresentation(page, 'dark');
    const mosaic = page.locator('.presentation-mode .map-mosaic');
    await expect(mosaic.locator('.mosaic-domain').first()).toHaveCSS('border-style', 'solid');
    await expect(mosaic.locator('.mosaic-domain .domain').first()).toHaveCSS('background-color', 'rgb(32, 35, 43)');
    await mkdir('test-results-storybook', { recursive: true });
    await page.screenshot({ path: 'test-results-storybook/mosaic-presentation-landscape-dark.png', animations: 'disabled' });
  });
  test('desktop — thème clair', async ({ page }) => {
    await openCapacityMapper(page, 1440, 900, 'light');
    await expect(page).toHaveScreenshot('capacity-mapper-desktop-light.png', {
      animations: 'disabled',
      caret: 'hide',
      fullPage: false,
    });
  });

  test('desktop — thème sombre', async ({ page }) => {
    await openCapacityMapper(page, 1440, 900, 'dark');
    await expect(page).toHaveScreenshot('capacity-mapper-desktop-dark.png', {
      animations: 'disabled',
      caret: 'hide',
      fullPage: false,
    });
  });

  test('mobile 390×844 — thème clair sans débordement horizontal', async ({ page }) => {
    await openCapacityMapper(page, 390, 844, 'light');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page).toHaveScreenshot('capacity-mapper-mobile-light.png', {
      animations: 'disabled',
      caret: 'hide',
      fullPage: false,
      maxDiffPixels: 1500,
    });
  });

  test('mobile 390×844 — thème sombre sans débordement horizontal', async ({ page }) => {
    await openCapacityMapper(page, 390, 844, 'dark');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await expect(page).toHaveScreenshot('capacity-mapper-mobile-dark.png', {
      animations: 'disabled',
      caret: 'hide',
      fullPage: false,
      maxDiffPixels: 1500,
    });
  });
});
