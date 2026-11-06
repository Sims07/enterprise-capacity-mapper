import { expect, test } from '../fixtures';

const MAX_LAYOUT_DRIFT_PX = 2;

test.describe('SIGNAL — parcours client sans régression', () => {
  test('conserve la navigation en haut et toute la largeur de la mosaïque en ouvrant l’inventaire', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.app.signal-experience')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();

    const map = page.getByTestId('capability-map');
    const before = await map.boundingBox();
    expect(before).not.toBeNull();
    const inventory = page.locator('#app-inventory');
    await expect(inventory).toBeHidden();

    await page.getByTestId('map-inventory-toggle').click();
    await expect(inventory).toBeVisible();
    await expect(inventory).toHaveCSS('position', 'fixed');
    const after = await map.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(MAX_LAYOUT_DRIFT_PX);
    await expect(map.locator('.mosaic-domain')).toHaveCount(4);

    await page.getByRole('button', { name: 'Fermer l’inventaire SI' }).click();
    await expect(inventory).toBeHidden();
    await page.getByTestId('map-inventory-toggle').click();
    await expect(inventory).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(inventory).toBeHidden();
  });

  test('ajoute une application depuis la mosaïque puis la relie à une N1', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('signal-add-application').click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle application' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await expect(dialog).toContainText('Le nom est obligatoire');

    await dialog.getByLabel('Nom').fill('Outil devis SIGNAL');
    await dialog.getByLabel('Code').fill('APP-SIGNAL-DEVIS');
    await dialog.getByLabel('Éditeur / fournisseur').fill('Éditeur interne');
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await expect(dialog).toBeHidden();

    await page.getByTestId('map-inventory-toggle').click();
    const app = page.locator('#app-inventory .app-item').filter({ hasText: 'Outil devis SIGNAL' });
    await expect(app).toBeVisible();
    await app.getByRole('button', { name: /Relier/ }).click();

    const linkDialog = page.getByRole('dialog', { name: /Relier « Outil devis SIGNAL »/ });
    await linkDialog.getByLabel('Gestion des Offres & Devis').check();
    await linkDialog.getByTestId('link-save').click();
    await expect(linkDialog).toBeHidden();

    await page.getByRole('button', { name: 'Fermer l’inventaire SI' }).click();
    const capability = page.locator('.cap:visible').filter({ hasText: 'Gestion des Offres & Devis' });
    await expect(capability).toContainText('Outil devis SIGNAL');
    await page.reload();
    await expect(page.locator('.cap:visible').filter({ hasText: 'Gestion des Offres & Devis' })).toContainText('Outil devis SIGNAL');
  });

  test('préserve la fenêtre de présentation indépendante et sa grille en lecture seule', async ({ page, context }) => {
    await page.goto('/');
    const popupPromise = context.waitForEvent('page');
    await page.getByTestId('presentation-switch-toolbar').click();
    const presentation = await popupPromise;
    await presentation.waitForLoadState();
    await expect(presentation).toHaveURL(/view=presentation/);
    await expect(presentation.locator('.app.signal-experience.mosaic-presentation-mode')).toBeVisible();
    await expect(presentation.locator('.map-mosaic .mosaic-domain')).toHaveCount(4);
    await expect(presentation.locator('.map-controls-row')).toBeHidden();
    await expect(presentation.getByTestId('signal-add-application')).toHaveCount(0);
    await presentation.close();
  });
});
