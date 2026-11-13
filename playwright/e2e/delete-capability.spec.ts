import { expect, test } from '../fixtures';

test('supprime une capacité N1 après confirmation sans supprimer ses applications ni ses processus', async ({ page }) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();
  await page.evaluate(() => {
    const storageKey = 'enterprise-capacity-mapper:model:v3';
    const raw = localStorage.getItem(storageKey);
    if (!raw) throw new Error('Modèle de démonstration absent');
    const model = JSON.parse(raw);
    model.businessProcesses = [{
      id: 'process-leads',
      name: 'Traiter les prospects',
      capabilityIds: ['l1-1', 'l1-2'],
    }];
    localStorage.setItem(storageKey, JSON.stringify(model));
  });
  await page.reload();

  const capability = page.getByTestId('capability-map').locator('.cap[data-entity-id="l1-1"]');
  await expect(capability).toBeVisible();
  await capability.getByRole('button', { name: 'Actions pour Gestion des Prospects & Leads' }).click();
  await page.locator('.context-menu').getByRole('button', { name: 'Supprimer la capacité' }).click();

  const confirmation = page.getByRole('dialog', { name: 'Supprimer la capacité N1' });
  await expect(confirmation).toContainText('Gestion des Prospects & Leads');
  await expect(confirmation).toContainText('1 application(s) et 1 processus métier');
  await confirmation.getByRole('button', { name: 'Annuler' }).click();
  await expect(capability).toBeVisible();

  await capability.getByTestId('capability-open-sheet').click();
  const sheet = page.getByRole('dialog', { name: 'Fiche de capacité N1' });
  await sheet.getByRole('button', { name: 'Supprimer la capacité' }).click();
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Confirmer la suppression' }).click();
  await expect(capability).toHaveCount(0);
  await expect(sheet).toHaveCount(0);

  await expect.poll(async () => page.evaluate(() => {
    const raw = localStorage.getItem('enterprise-capacity-mapper:model:v3');
    if (!raw) return null;
    const model = JSON.parse(raw);
    return {
      capabilityGone: !model.capabilities.some((item: { id: string }) => item.id === 'l1-1'),
      otherCapabilityRetained: model.capabilities.some((item: { id: string }) => item.id === 'l1-2'),
      domainRetained: model.domains.some((item: { id: string }) => item.id === 'l0-1'),
      applicationLinks: model.applications.find((item: { id: string }) => item.id === 'app-1')?.capabilityIds,
      processLinks: model.businessProcesses.find((item: { id: string }) => item.id === 'process-leads')?.capabilityIds,
    };
  })).toEqual({
    capabilityGone: true,
    otherCapabilityRetained: true,
    domainRetained: true,
    applicationLinks: [],
    processLinks: ['l1-2'],
  });
});
