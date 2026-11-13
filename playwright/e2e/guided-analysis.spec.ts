import { expect, test } from '../fixtures';

const openAnalysis = async (page: import('@playwright/test').Page, view: 'risk' | 'processes') => {
  await page.goto('/');
  await page.getByTestId('nav-analysis').click();
  await page.getByTestId(`dashboard-view-${view}`).click();
};

test.describe('Parcours guidés d’analyse', () => {
  test('propose une première action de risque avant la grille des domaines, puis permet de filtrer', async ({ page }) => {
    await openAnalysis(page, 'risk');
    const guidance = page.getByTestId('risk-guidance');
    await expect(guidance).toBeVisible();
    await expect(page.getByTestId('risk-worklist')).toBeVisible();
    await expect(page.getByTestId('risk-domain-exploration')).not.toHaveAttribute('open', '');
    await expect(guidance).toContainText('POUR COMMENCER');

    const shortcuts = page.getByTestId('risk-quick-filters');
    await page.getByRole('searchbox', { name: 'Rechercher une application' }).fill('aucun-résultat');
    await shortcuts.getByRole('button', { name: /Applications à qualifier/ }).click();
    await expect(page.getByRole('searchbox', { name: 'Rechercher une application' })).toHaveValue('');
    await expect(page.getByLabel('Afficher les risques')).toHaveValue('unknown');
    await expect(shortcuts.getByRole('button', { name: /Applications à qualifier/ })).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Tout afficher' }).click();
    await expect(page.getByLabel('Afficher les risques')).toHaveValue('all');

    await page.getByTestId('risk-next-action').click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('1. Évaluer le risque')).toBeVisible();
    await expect(dialog.getByText('2. Décider et suivre')).toBeVisible();
    await expect(dialog.getByLabel('Probabilité (1 à 5)')).toBeVisible();
    await dialog.getByRole('button', { name: 'Annuler' }).click();
    await expect(dialog).not.toBeVisible();

    await page.getByTestId('risk-domain-exploration').locator('summary').click();
    await expect(page.locator('.risk-domain-grid .risk-domain').first()).toBeVisible();
  });

  test('guide la création puis le rattachement d’un processus et conserve les filtres', async ({ page }) => {
    await openAnalysis(page, 'processes');
    const guidance = page.getByTestId('process-guidance');
    await expect(guidance).toContainText('Décrivez votre premier processus métier');
    await expect(page.getByTestId('process-next-action')).toHaveText('Ajouter un processus');

    await page.getByRole('button', { name: 'Ajouter un processus', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByText('1. Décrire le processus')).toBeVisible();
    await expect(dialog.getByText('2. Relier les capacités mobilisées')).toBeVisible();
    await dialog.getByLabel(/^Nom du processus/).fill('Traiter une demande citoyen');
    await dialog.getByRole('button', { name: 'Enregistrer le processus' }).click();

    await expect(guidance).toContainText('Relier « Traiter une demande citoyen »');
    await page.getByRole('searchbox', { name: 'Rechercher un processus' }).fill('aucun-résultat');
    await page.getByTestId('process-quick-filters').getByRole('button', { name: /À relier aux capacités/ }).click();
    await expect(page.getByRole('searchbox', { name: 'Rechercher un processus' })).toHaveValue('');
    await expect(page.getByLabel('Afficher les processus')).toHaveValue('unlinked');
    await expect(page.getByTestId('business-processes').locator('.process-entry')).toHaveCount(1);

    await page.getByTestId('process-next-action').click();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('checkbox', { name: 'Gestion des Prospects & Leads', exact: true }).check();
    await dialog.getByRole('button', { name: 'Enregistrer le processus' }).click();
    await expect(page.getByTestId('business-processes').locator('.process-entry')).toHaveCount(0);
    await page.getByTestId('process-quick-filters').getByRole('button', { name: /Tous les processus/ }).click();
    await expect(page.getByTestId('business-processes').locator('.process-entry')).toContainText(['Traiter une demande citoyen']);
    await expect(guidance).toContainText('Vos processus sont reliés');
  });

  test('sur mobile, le guide et les actions restent accessibles sans débordement horizontal', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAnalysis(page, 'risk');
    await expect(page.getByTestId('risk-next-action')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.getByTestId('dashboard-view-processes').click();
    await expect(page.getByTestId('process-guidance')).toBeVisible();
    const processOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(processOverflow).toBeLessThanOrEqual(1);
  });
});
