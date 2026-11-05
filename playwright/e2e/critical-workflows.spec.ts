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

    const capability = page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads' });
    await expect(capability).toHaveCount(1);
    await capability.getByRole('button', { name: 'Ouvrir la fiche de Gestion des Prospects & Leads' }).click();
      await page.locator('.modal .field input').fill('Qualification des prospects');
    await page.locator('.modal').getByRole('button', { name: 'Enregistrer' }).click();

    const renamed = page.locator('.cap:visible').filter({ hasText: 'Qualification des prospects' });
    await expect(renamed).toContainText('Salesforce CRM');

    await page.reload();
    await expect(page.locator('.cap:visible').filter({ hasText: 'Qualification des prospects' })).toContainText('Salesforce CRM');
    await expect(page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads' })).toHaveCount(0);
  });

  test('modifie les propriétés d’une application depuis son crayon discret', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('map-inventory-toggle').click();
    const application = page.locator('.app-item').filter({ hasText: 'Salesforce CRM' });
    await expect(application).toHaveCount(1);
    await application.getByRole('button', { name: 'Modifier Salesforce CRM' }).click();

    const dialog = page.getByRole('dialog', { name: 'Modifier l’application' });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel('Nom').fill('Salesforce CRM — renommé');
    await dialog.getByLabel('Code').fill('CRM-SF');
    await dialog.getByLabel('Éditeur / fournisseur').fill('Salesforce');
    await dialog.getByLabel('Statut').selectOption('Cible');
    await dialog.getByLabel('Type').selectOption('ERP');
    await dialog.getByLabel('Description').fill('Application mise à jour depuis la gestion des applications.');
    await dialog.getByRole('button', { name: 'Enregistrer' }).click();

    const updated = page.locator('.app-item').filter({ hasText: 'Salesforce CRM — renommé' });
    await expect(updated).toContainText('CRM-SF');
    await expect(updated).toContainText('Salesforce');
    await expect(updated).toContainText('Cible');
    await expect(page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads' })).toContainText('Salesforce CRM — renommé');

    await page.reload();
    await expect(page.locator('.app-item').filter({ hasText: 'Salesforce CRM — renommé' })).toContainText('Salesforce');
    await expect(page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads' })).toContainText('Salesforce CRM — renommé');
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

test('qualifie la couverture et la maturité d’une capacité puis conserve la saisie après rechargement', async ({ page }) => {
  await page.goto('/');
  const capability = page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads' });
  await capability.getByRole('button', { name: 'Ouvrir la fiche de Gestion des Prospects & Leads' }).click();
  const dialog = page.getByRole('dialog', { name: 'Fiche de capacité N1' });
  await dialog.getByTestId('capability-functional-coverage').selectOption('partial');
  await dialog.getByTestId('capability-current-maturity').selectOption('2');
  await dialog.getByTestId('capability-target-maturity').selectOption('4');
  await dialog.getByTestId('capability-assessment-rationale').fill('Couverture partielle confirmée par les métiers');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await page.reload();
  const updated = page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads' });
  await updated.getByRole('button', { name: 'Ouvrir la fiche de Gestion des Prospects & Leads' }).click();
  const restored = page.getByRole('dialog', { name: 'Fiche de capacité N1' });
  await expect(restored.getByTestId('capability-functional-coverage')).toHaveValue('partial');
  await expect(restored.getByTestId('capability-current-maturity')).toHaveValue('2');
  await expect(restored.getByTestId('capability-target-maturity')).toHaveValue('4');
  await expect(restored.getByTestId('capability-assessment-rationale')).toHaveValue('Couverture partielle confirmée par les métiers');
});

test.describe('Parcours de lecture métier depuis la cartographie', () => {
  test('la fiche N1 est accessible directement sans passer par Renommer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('capability-reading-toolbar')).toBeVisible();
    const capability = page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads' });
    await expect(capability.getByTestId('capability-qualification')).toContainText('À évaluer');
    await capability.getByRole('button', { name: 'Ouvrir la fiche de Gestion des Prospects & Leads' }).click();
    const sheet = page.getByRole('dialog', { name: 'Fiche de capacité N1' });
    await expect(sheet.getByTestId('capability-sheet-context')).toContainText('Code : CRM-01');
    await sheet.getByTestId('capability-functional-coverage').selectOption('partial');
    await sheet.getByTestId('capability-current-maturity').selectOption('2');
    await sheet.getByTestId('capability-target-maturity').selectOption('4');
    await sheet.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(capability.getByTestId('capability-qualification')).toContainText('Partielle');
    await page.getByTestId('map-reading-maturity').click();
    const maturity = capability.getByTestId('capability-reading-detail');
    await expect(maturity).toContainText('Actuelle : 2/5');
    await expect(maturity).toContainText('Cible : 4/5');
    await expect(maturity).toContainText('+2 niveau(x) à atteindre');
    await page.getByTestId('map-reading-gaps').click();
    await expect(capability.getByTestId('capability-reading-detail')).toContainText('Écart de maturité');
    await page.getByTestId('map-reading-coverage').click();
    await expect(capability.getByTestId('capability-reading-detail')).toContainText('Couverture métier : Partielle');
    await page.getByTestId('map-reading-applications').click();
    await expect(capability).toContainText('Salesforce CRM');
  });

  test('la lecture métier est réversible et ne modifie ni les relations ni la sélection impact', async ({ page }) => {
    await page.goto('/');
    const capability = page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads' });
    const selectedButton = capability.getByTestId('map-cap-select');
    await selectedButton.click();
    await expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('map-reading-gaps').click();
    await expect(selectedButton).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('map-reading-applications').click();
    await expect(capability).toContainText('Salesforce CRM');
    await page.reload();
    await expect(page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads' })).toContainText('Salesforce CRM');
  });

  test('une cartographie N0 sans N1 ne présente pas de lecture de maturité fictive', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('tools-menu-toggle').click();
    await page.getByTestId('new-map-button').click();
    await page.getByTestId('template-blank').click();
    await page.getByTestId('depth-1').click();
    await page.getByTestId('wizard-name').fill('Carte N0');
    await page.getByRole('button', { name: 'Suivant' }).click();
    // Skip the remaining wizard steps with their existing defaults.
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Créer la cartographie' }).click();
    await expect(page.getByTestId('capability-reading-toolbar')).toHaveCount(0);
  });
});

test('du constat sur la carte à la fiche puis au même constat dans le diagnostic', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('capability-reading-summary')).toContainText('à qualifier');
  await page.getByTestId('capability-diagnostic-shortcut').click();
  await expect(page.getByTestId('capability-diagnostic')).toBeVisible();

  const finding = page.getByTestId('capability-diagnostic-item').first();
  const capabilityName = (await finding.locator('.capability-diagnostic-facts strong').innerText()).trim();
  await finding.getByTestId('capability-diagnostic-edit').click();
  const sheet = page.getByRole('dialog', { name: 'Fiche de capacité N1' });
  await expect(sheet).toBeVisible();
  await sheet.getByTestId('capability-functional-coverage').selectOption('partial');
  await sheet.getByTestId('capability-current-maturity').selectOption('2');
  await sheet.getByTestId('capability-target-maturity').selectOption('4');
  await sheet.getByTestId('capability-assessment-rationale').fill('Vérification métier demandée.');
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();

  const reviewed = page.getByTestId('capability-diagnostic-item').filter({ hasText: capabilityName });
  await expect(reviewed).toContainText('Couverture fonctionnelle déclarée partielle');
  await expect(reviewed).toContainText('Écart de maturité');
  await reviewed.getByTestId('capability-diagnostic-map').click();
  await expect(page.getByTestId('nav-cartography')).toHaveAttribute('aria-current', 'page');
  await expect(page.getByTestId('map-reading-gaps')).toHaveAttribute('aria-pressed', 'true');
  const capability = page.locator('.cap:visible').filter({ hasText: capabilityName });
  await expect(capability.getByTestId('capability-qualification')).toContainText('Partielle');
  await expect(capability.getByTestId('capability-reading-detail')).toContainText('Écart de maturité');
});
