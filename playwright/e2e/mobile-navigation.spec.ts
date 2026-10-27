import { expect, test } from '../fixtures';

test('affiche l’assistant Nouvelle cartographie dans les limites du viewport mobile', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tools-menu-toggle').click();
  await page.getByTestId('new-map-button').click();

  const modal = page.locator('.modal.wizard');
  await expect(modal).toBeVisible();
  await expect(page.getByTestId('wizard-step-1')).toBeVisible();

  const box = await modal.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(390);
});
