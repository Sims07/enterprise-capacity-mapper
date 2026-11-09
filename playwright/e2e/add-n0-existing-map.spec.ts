import { expect, test, type Page } from '../fixtures';

const createN0 = async (page: Page, name: string, code: string) => {
  await page.getByTestId('map-add-domain').click();
  const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
  await dialog.getByLabel('Nom').fill(name);
  await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill(code);
  await dialog.getByRole('button', { name: 'Créer' }).click();
  await expect(dialog).toHaveCount(0);
};

test('ajoute un N0 à une cartographie existante même quand la grille est complète', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tools-menu-toggle').click();
  await page.getByTestId('new-map-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('wizard-name').fill('Carte existante complète');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByTestId('wizard-backup').uncheck();
  await page.getByRole('button', { name: 'Créer la cartographie' }).click();

  await createN0(page, 'Premier domaine', 'DOM-01');
  await expect(page.getByTestId('capability-map').locator('.mosaic-domain')).toHaveCount(1);
  await expect(page.getByTestId('capability-map').locator('.mosaic-row-heading')).toHaveCount(1);

  await page.getByTestId('tools-menu-toggle').click();
  await page.getByTestId('save-local-map').click();
  await page.getByTestId('local-map-name').fill('Carte existante complète');
  await page.getByRole('dialog', { name: 'Enregistrer dans Mes cartographies' })
    .getByRole('button', { name: 'Enregistrer' }).click();
  await page.reload();

  const addDomain = page.getByTestId('map-add-domain');
  await expect(addDomain).toBeEnabled();
  await addDomain.click();
  const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
  await expect(dialog.getByTestId('domain-auto-expand-hint')).toBeVisible();
  await expect(dialog.getByLabel('Ligne (layer)')).toHaveValue((await dialog.getByLabel('Ligne (layer)').locator('option').last().getAttribute('value'))!);
  await dialog.getByRole('button', { name: 'Annuler' }).click();

  await expect(page.getByTestId('capability-map').locator('.mosaic-row-heading')).toHaveCount(1);
  await expect(page.getByTestId('capability-map').locator('.mosaic-domain')).toHaveCount(1);

  await createN0(page, 'Second domaine', 'DOM-02');
  await expect(page.getByTestId('capability-map').locator('.mosaic-row-heading')).toHaveCount(2);
  await expect(page.getByTestId('capability-map').locator('.mosaic-domain')).toHaveCount(2);
  await expect(page.getByTestId('capability-map')).toContainText('Premier domaine');
  await expect(page.getByTestId('capability-map')).toContainText('Second domaine');

  await page.reload();
  await expect(page.getByTestId('capability-map').locator('.mosaic-row-heading')).toHaveCount(2);
  await expect(page.getByTestId('capability-map').locator('.mosaic-domain')).toHaveCount(2);
  await expect(page.getByTestId('capability-map')).toContainText('Second domaine');
});

test('insère un N0 avant un domaine existant sans perdre ses capacités et relations', async ({ page }) => {
  await page.goto('/');
  const mosaic = page.getByTestId('capability-map');
  const existing = mosaic.locator('.mosaic-domain').filter({ hasText: 'Relation & Engagement Client' });
  await expect(existing).toContainText('Salesforce CRM');
  await page.getByTestId('map-add-domain').click();
  const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
  await dialog.getByTestId('domain-insertion-target')
    .selectOption({ label: 'Insérer avant « Relation & Engagement Client »' });
  await expect(dialog.getByTestId('domain-insertion-hint')).toBeVisible();
  await dialog.getByLabel('Nom').fill('Domaine inséré');
  await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('DOM-INS');
  await dialog.getByRole('button', { name: 'Créer' }).click();

  await expect(mosaic.locator('.mosaic-domain')).toHaveCount(5);
  await expect(mosaic).toContainText('Domaine inséré');
  await expect(existing).toContainText('Salesforce CRM');
  await page.reload();
  await expect(mosaic.locator('.mosaic-domain')).toHaveCount(5);
  await expect(mosaic).toContainText('Domaine inséré');
  await expect(mosaic.locator('.mosaic-domain').filter({ hasText: 'Relation & Engagement Client' })).toContainText('Salesforce CRM');
});

test('déplace un N0 de Support à Cœur métier occupé et le garde visible après rechargement', async ({ page }) => {
  await page.goto('/');
  const mosaic = page.getByTestId('capability-map');
  const existing = mosaic.locator('.mosaic-domain').filter({ hasText: 'Relation & Engagement Client' });
  const moved = mosaic.locator('.mosaic-domain').filter({ hasText: 'Finance, Gestion & Comptabilité' });
  await moved.getByRole('button', { name: 'Actions pour Finance, Gestion & Comptabilité' }).click();
  await page.getByRole('button', { name: 'Modifier', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Modifier le domaine N0' });
  await dialog.getByTestId('domain-column-select').selectOption({ label: 'Client' });
  await dialog.getByLabel('Ligne (layer)').selectOption({ label: 'Core / Value' });
  await dialog.getByLabel('Étendue sur les colonnes').selectOption('3');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(dialog).toHaveCount(0);

  const before = await existing.boundingBox();
  const after = await moved.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(after!.y).toBeGreaterThanOrEqual(before!.y + before!.height - 2);
  expect(after!.x).toBe(before!.x);
  await expect(moved).toHaveAttribute('data-stack-tier', '1');
  await expect(mosaic.locator('.mosaic-row-heading')).toHaveCount(3);

  await page.reload();
  const restored = page.getByTestId('capability-map');
  const restoredMoved = restored.locator('.mosaic-domain').filter({ hasText: 'Finance, Gestion & Comptabilité' });
  const restoredExisting = restored.locator('.mosaic-domain').filter({ hasText: 'Relation & Engagement Client' });
  await expect(restoredMoved).toHaveAttribute('data-stack-tier', '1');
  const restoredAbove = await restoredExisting.boundingBox();
  const restoredBelow = await restoredMoved.boundingBox();
  expect(restoredBelow!.y).toBeGreaterThanOrEqual(restoredAbove!.y + restoredAbove!.height - 2);
  await expect(restored.locator('.mosaic-row-heading')).toHaveCount(3);

  await page.goto('/?view=presentation');
  const presentation = page.getByTestId('capability-map');
  const presentedMoved = presentation.locator('.mosaic-domain').filter({ hasText: 'Finance, Gestion & Comptabilité' });
  const presentedExisting = presentation.locator('.mosaic-domain').filter({ hasText: 'Relation & Engagement Client' });
  await expect(presentedMoved).toBeVisible();
  await expect(presentedExisting).toBeVisible();
  const presentedAbove = await presentedExisting.boundingBox();
  const presentedBelow = await presentedMoved.boundingBox();
  expect(presentedBelow!.y).toBeGreaterThanOrEqual(presentedAbove!.y + presentedAbove!.height - 2);
});
