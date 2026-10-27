import { expect, test, type Page } from '../fixtures';

const openToolsMenu = async (page: Page) => {
  const menu = page.locator('[data-testid="tools-menu"]');
  if (!(await menu.getAttribute('class'))?.includes('is-open')) {
    await page.getByTestId('tools-menu-toggle').click();
  }
};

test.describe('Playwright POC — critical browser workflows', () => {
  test('renomme une capacité N1 et conserve ses applications après rechargement', async ({ page }) => {
    await page.goto('/');

    const capability = page.locator('.cap').filter({ hasText: 'Gestion des Prospects & Leads' });
    await expect(capability).toHaveCount(1);
    await capability.getByRole('button', { name: 'Renommer Gestion des Prospects & Leads' }).click();
    await page.locator('.context-menu').getByRole('button', { name: 'Renommer' }).click();
    await page.locator('.modal .field input').fill('Qualification des prospects');
    await page.locator('.modal').getByRole('button', { name: 'Enregistrer' }).click();

    const renamed = page.locator('.cap').filter({ hasText: 'Qualification des prospects' });
    await expect(renamed).toContainText('Salesforce CRM');

    await page.reload();
    await expect(page.locator('.cap').filter({ hasText: 'Qualification des prospects' })).toContainText('Salesforce CRM');
    await expect(page.locator('.cap').filter({ hasText: 'Gestion des Prospects & Leads' })).toHaveCount(0);
  });

  test('ouvre le menu Outils et crée une cartographie vierge avec l’assistant', async ({ page }) => {
    await page.goto('/');
    await openToolsMenu(page);
    await page.getByTestId('new-map-button').click();
    await expect(page.getByTestId('wizard-step-1')).toBeVisible();

    await page.getByTestId('template-blank').click();
    await page.getByTestId('wizard-name').fill('POC Playwright');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByTestId('wizard-step-2')).toBeVisible();

    await page.getByTestId('structure-columns-input').first().fill('Métier');
    await page.getByTestId('structure-add-columns').click();
    await page.getByTestId('structure-columns-input').nth(1).fill('Support');
    await page.getByTestId('structure-layers-input').first().fill('Stratégique');
    await page.getByTestId('structure-add-layers').click();
    await page.getByTestId('structure-layers-input').nth(1).fill('Opérationnel');
    await expect(page.getByTestId('wizard-preview')).toContainText('Métier');
    await expect(page.getByTestId('wizard-preview')).toContainText('Opérationnel');
  });

  test('restaure une cartographie locale après rechargement', async ({ page }) => {
    await page.goto('/');
    await openToolsMenu(page);
    await page.getByTestId('save-local-map').click();
    await page.getByTestId('local-map-name').fill('POC Playwright local');
    await page.locator('.modal').getByRole('button', { name: 'Enregistrer' }).click();

    await page.reload();
    await page.getByTestId('primary-library').click();
    await expect(page.getByTestId('saved-maps-list')).toContainText('POC Playwright local');
  });
});
