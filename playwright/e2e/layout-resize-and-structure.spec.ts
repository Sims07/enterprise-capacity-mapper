import { expect, test } from '../fixtures';

test('réduit un N0 sur trois colonnes jusqu’à une seule, même après un glissement trop long', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');

  // The demo leaves the strategic row free for a three-column domain.
  await page.getByTestId('map-add-domain').click();
  const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
  await dialog.getByLabel('Nom').fill('Gestion messagerie de santé');
  await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('GMS');
  await dialog.getByRole('button', { name: 'Créer' }).click();

  const domain = page.getByTestId('capability-map').locator('.mosaic-domain')
    .filter({ hasText: 'Gestion messagerie de santé' });
  await domain.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(domain).toHaveAttribute('data-layout-grid-column', /span 3$/);

  await domain.focus();
  await page.keyboard.press('ArrowLeft');
  await expect(domain).toHaveAttribute('data-layout-grid-column', /span 2$/);
  await page.keyboard.press('ArrowLeft');
  await expect(domain).toHaveAttribute('data-layout-grid-column', /span 1$/);
  await page.keyboard.press('ArrowLeft');
  await expect(domain).toHaveAttribute('data-layout-grid-column', /span 1$/);

  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  const bounds = await domain.boundingBox();
  const firstCell = page.getByTestId('capability-map').locator('[data-zone-key="customer:strategic"]');
  const cellBounds = await firstCell.boundingBox();
  expect(bounds).not.toBeNull();
  expect(cellBounds).not.toBeNull();

  // Drag beyond the minimum: the preview and the saved width must both be 1.
  await page.mouse.move(bounds!.x + bounds!.width - 2, bounds!.y + bounds!.height / 2);
  await page.mouse.down();
  await page.mouse.move(bounds!.x + bounds!.width - 2 - cellBounds!.width * 4, bounds!.y + bounds!.height / 2, { steps: 8 });
  await page.mouse.up();
  await expect(domain).toHaveAttribute('data-layout-grid-column', /span 1$/);
  await expect(page.getByRole('status')).not.toContainText('Redimensionnement impossible');
  await page.reload();
  await expect(page.getByTestId('capability-map').locator('.mosaic-domain')
    .filter({ hasText: 'Gestion messagerie de santé' })).toHaveAttribute('data-layout-grid-column', /span 1$/);
});

test('insère une colonne au milieu d’un N0 étendu sans perdre ses cellules couvertes', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('map-add-domain').click();
  const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
  await dialog.getByLabel('Nom').fill('Domaine étendu');
  await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('EXT');
  await dialog.getByRole('button', { name: 'Créer' }).click();

  const domain = page.getByTestId('capability-map').locator('.mosaic-domain')
    .filter({ hasText: 'Domaine étendu' });
  await domain.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect(domain).toHaveAttribute('data-layout-grid-column', /span 3$/);

  await page.getByTestId('map-more-actions').locator('summary').click();
  await page.getByRole('button', { name: 'Structure', exact: true }).click();
  const structure = page.getByRole('dialog', { name: 'Personnaliser la structure' });
  await structure.getByTestId('structure-insert-columns').selectOption({ label: 'Avant « Produit »' });
  await structure.getByRole('button', { name: 'Ajouter une colonne' }).click();
  await expect(structure.locator('.structure-section').nth(1).locator('.structure-row')).toHaveCount(5);
  await structure.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(domain).toHaveAttribute('data-layout-grid-column', /span 4$/);
  await expect(page.getByTestId('capability-map').locator('.mosaic-column-heading')).toHaveCount(5);
  await page.reload();
  await expect(page.getByTestId('capability-map').locator('.mosaic-domain').filter({ hasText: 'Domaine étendu' }))
    .toHaveAttribute('data-layout-grid-column', /span 4$/);
});
