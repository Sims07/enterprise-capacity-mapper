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
