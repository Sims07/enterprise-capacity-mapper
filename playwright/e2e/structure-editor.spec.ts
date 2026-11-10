import { expect, test, type Page } from '../fixtures';

async function openStructure(page: Page) {
  await page.getByTestId('map-more-actions').locator('summary').click();
  await page.getByRole('button', { name: 'Structure', exact: true }).click();
  return page.getByRole('dialog', { name: 'Personnaliser la structure' });
}

test('présente colonnes et lignes côte à côte, avec actions visibles et zones repliées', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const dialog = await openStructure(page);

  const [modal, columns, rows] = await Promise.all([
    dialog.boundingBox(),
    dialog.getByTestId('structure-axis-columns').boundingBox(),
    dialog.getByTestId('structure-axis-layers').boundingBox(),
  ]);
  expect(modal).not.toBeNull();
  expect(columns).not.toBeNull();
  expect(rows).not.toBeNull();
  expect(modal!.width).toBeGreaterThan(850);
  expect(rows!.x).toBeGreaterThan(columns!.x + columns!.width - 1);
  expect(rows!.y).toBeCloseTo(columns!.y, 0);
  await expect(dialog.getByTestId('structure-zones')).not.toHaveAttribute('open', '');
  await expect(dialog.locator('.zone-row').first()).toBeHidden();
  await expect(dialog.getByRole('button', { name: 'Enregistrer' })).toBeInViewport();

  // La suppression d'un axe qui contient un domaine reste désactivée.
  await expect(dialog.getByRole('button', { name: 'Supprimer colonne 1' })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Annuler' }).click();
});

test('conserve édition, insertion et zones avancées sans modifier les règles de grille', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const dialog = await openStructure(page);
  const columns = dialog.getByTestId('structure-axis-columns');

  await columns.getByRole('textbox', { name: 'Colonne 1' }).fill('Usager / Patient');
  await dialog.getByTestId('structure-insert-columns').selectOption('end');
  await columns.getByRole('button', { name: 'Ajouter une colonne' }).click();
  await expect(columns.locator('.structure-row')).toHaveCount(5);

  await dialog.getByTestId('structure-zones').locator('summary').click();
  const firstZone = dialog.locator('.zone-row').first().locator('input');
  await firstZone.fill('Zone personnalisée');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();

  const reopened = await openStructure(page);
  await expect(reopened.getByTestId('structure-axis-columns').locator('.structure-row')).toHaveCount(5);
  await expect(reopened.getByTestId('structure-axis-columns').getByRole('textbox', { name: 'Colonne 1' }))
    .toHaveValue('Usager / Patient');
  await reopened.getByTestId('structure-zones').locator('summary').click();
  await expect(reopened.locator('.zone-row').first().locator('input')).toHaveValue('Zone personnalisée');
});

test('garde en mobile le pied de fenêtre visible pendant le défilement des axes', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const dialog = await openStructure(page);

  const [bounds, footer] = await Promise.all([
    dialog.boundingBox(),
    dialog.locator('.structure-footer').boundingBox(),
  ]);
  expect(bounds).not.toBeNull();
  expect(footer).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  expect(footer!.y + footer!.height).toBeLessThanOrEqual(844);

  await expect(dialog.getByTestId('structure-axis-columns')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Enregistrer' })).toBeInViewport();
  await dialog.getByTestId('structure-editor-content').evaluate(element => {
    element.scrollTop = element.scrollHeight;
  });
  await expect(dialog.getByRole('button', { name: 'Enregistrer' })).toBeInViewport();
  const overflow = await dialog.evaluate(element => element.scrollWidth - element.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
