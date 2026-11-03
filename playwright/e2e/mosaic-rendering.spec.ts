import { expect, test } from '../fixtures';

test.describe('Rendu mosaïque', () => {
  test('affiche les domaines dans une grille bidimensionnelle et conserve le mode choisi', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const mosaic = page.getByTestId('mosaic-map');
    await expect(mosaic).toBeVisible();
    await expect(mosaic.locator('.mosaic-column-heading')).toHaveCount(3);
    await expect(mosaic.locator('.mosaic-row-heading')).toHaveCount(3);
    await expect(mosaic.locator('.mosaic-domain')).not.toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('mosaic-map')).toBeVisible();
  });

  test('permet de revenir au rendu matrice', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();
    await page.getByTestId('matrix-view').click();
    await expect(page.locator('.map-matrix')).toBeVisible();
    await expect(page.getByTestId('mosaic-map')).toHaveCount(0);
  });
});
