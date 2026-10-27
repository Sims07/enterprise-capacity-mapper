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
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
}

test.describe('Storybook visual regression — Capacity Mapper', () => {
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
    });
  });
});
