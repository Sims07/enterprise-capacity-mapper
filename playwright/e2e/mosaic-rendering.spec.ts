import { expect, test } from '../fixtures';

test.describe('Rendu mosaïque', () => {
  test('affiche les domaines dans une grille bidimensionnelle et conserve le mode choisi', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const mosaic = page.getByTestId('mosaic-map');
    await expect(mosaic).toBeVisible();
    await expect(mosaic.locator('.mosaic-column-heading')).toHaveCount(4);
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

  test('permet de masquer indépendamment les intitulés des axes dans Structure', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Structure/ }).click();
    const options = page.getByTestId('axis-heading-options');
    await options.getByLabel('Afficher les titres des colonnes').uncheck();
    await options.getByLabel('Afficher les titres des lignes').uncheck();
    await page.getByRole('button', { name: 'Enregistrer' }).last().click();

    await page.getByTestId('mosaic-view').click();
    const mosaic = page.getByTestId('mosaic-map');
    await expect(mosaic.locator('.mosaic-column-heading')).toHaveCount(0);
    await expect(mosaic.locator('.mosaic-row-heading')).toHaveCount(0);

    await page.getByTestId('matrix-view').click();
    await expect(page.locator('[data-testid="matrix-map"] .map-head .col-head')).toHaveCount(0);
    await expect(page.locator('.map-matrix .axis-label')).toHaveCount(0);
  });

  test('utilise toute la largeur en mosaïque sans inventaire applicatif latéral', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();
    await expect(page.locator('.workspace.mosaic-workspace > aside')).toBeHidden();
    const workspace = await page.locator('.workspace').boundingBox();
    const mosaic = await page.getByTestId('mosaic-map').boundingBox();
    expect(workspace).not.toBeNull();
    expect(mosaic).not.toBeNull();
    expect(mosaic!.width).toBeGreaterThan(workspace!.width * 0.85);
  });

});
