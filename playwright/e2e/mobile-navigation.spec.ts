import { expect, test } from '@playwright/test';

test('préserve la navigation mobile étroite sans débordement horizontal', async ({ page }) => {
  await page.goto('/');

  const navigation = page.locator('.primary-navigation');
  await expect(navigation).toBeVisible();
  await expect(page.getByTestId('tools-menu-toggle')).toContainText('Outils');

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);

  const toolsBox = await page.getByTestId('tools-menu-toggle').boundingBox();
  const headerBox = await navigation.boundingBox();
  expect(toolsBox).not.toBeNull();
  expect(headerBox).not.toBeNull();
  expect(toolsBox!.x).toBeGreaterThanOrEqual(headerBox!.x);
  expect(toolsBox!.x + toolsBox!.width).toBeLessThanOrEqual(headerBox!.x + headerBox!.width + 1);
});
