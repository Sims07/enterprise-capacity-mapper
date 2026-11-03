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

  test('redimensionne un domaine et conserve son étendue après rechargement', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const firstDomain = page.locator('.mosaic-domain').first();
    const increaseWidth = firstDomain.getByRole('button', { name: /Augmenter la largeur/ });
    await expect(increaseWidth).toBeEnabled();
    await increaseWidth.click();
    await expect(firstDomain).toHaveCSS('grid-column', /span 2/);

    await page.reload();
    await page.getByTestId('mosaic-view').click();
    const persistedDomain = page.locator('.mosaic-domain').first();
    await expect(persistedDomain).toHaveCSS('grid-column', /span 2/);
    await persistedDomain.getByRole('button', { name: /Réduire la largeur/ }).click();
    await expect(persistedDomain).toHaveCSS('grid-column', /span 1/);
  });

});
