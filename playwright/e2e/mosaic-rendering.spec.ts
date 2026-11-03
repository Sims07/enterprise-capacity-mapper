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

  test('présente la mosaïque sans repères de grille et avec les panneaux colorés', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();
    await page.getByTestId('presentation-switch-input').check();
    const mosaic = page.getByTestId('mosaic-map');
    await expect(mosaic.locator('.mosaic-zone')).toHaveCount(0);
    await expect(mosaic.locator('.mosaic-column-heading, .mosaic-row-heading, .mosaic-corner')).toHaveCount(0);
    const firstDomain = mosaic.locator('.mosaic-domain').first();
    await expect(firstDomain.locator('.domain')).toHaveCSS('background-color', /rgb/);
    await expect(firstDomain.locator('.mosaic-resize-controls')).toHaveCount(0);
  });
  test('met en valeur le titre d’un domaine sans N1 dans un panneau dédié', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cell-add').first().click();
    const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
    await dialog.getByLabel('Nom').fill('Domaine sans capacité');
    await dialog.getByLabel('Code').fill('DOM-EMPTY');
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await page.getByTestId('mosaic-view').click();
    await page.getByTestId('presentation-switch-input').check();
    const emptyDomain = page.getByTestId('mosaic-map').locator('.mosaic-presentation-empty').filter({ hasText: 'Domaine sans capacité' });
    await expect(emptyDomain).toBeVisible();
    await expect(emptyDomain.locator('.domain-banner')).toHaveCSS('justify-content', 'center');
    await expect(emptyDomain.locator('.domain-banner h3')).toHaveCSS('font-size', /px/);
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
