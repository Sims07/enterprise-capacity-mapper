import { expect, test } from '../fixtures';

test('déplace une N1 par glisser-déposer vers un autre N0 sans perdre ses liens', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const storageKey = 'enterprise-capacity-mapper:model:v3';
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), storageKey)).not.toBeNull();
  await page.evaluate(key => {
    const model = JSON.parse(localStorage.getItem(key)!);
    model.businessProcesses = [{ id: 'process-n1-move', name: 'Gérer les prospects', capabilityIds: ['l1-1'] }];
    model.capabilities.find((capability: { id: string }) => capability.id === 'l1-1').assessment = {
      functionalCoverage: 'partial', currentMaturity: 2, targetMaturity: 4,
    };
    localStorage.setItem(key, JSON.stringify(model));
  }, storageKey);
  await page.reload();

  const map = page.getByTestId('capability-map');
  const source = map.locator('.domain-card[data-entity-id="l0-1"]');
  const target = map.locator('.domain-card[data-entity-id="l0-2"]');
  const capability = source.locator('.cap[data-entity-id="l1-1"]');

  await expect(capability).toBeVisible();
  await capability.locator('.cap-head').dragTo(target.locator('.domain-banner'));
  await expect(target.locator('.cap[data-entity-id="l1-1"]')).toBeVisible();
  await expect(source.locator('.cap[data-entity-id="l1-1"]')).toHaveCount(0);

  const readModel = () => page.evaluate(key => {
    const model = JSON.parse(localStorage.getItem(key)!);
    return {
      domainId: model.capabilities.find((item: { id: string }) => item.id === 'l1-1')?.domainId,
      assessment: model.capabilities.find((item: { id: string }) => item.id === 'l1-1')?.assessment,
      appIds: model.applications.find((item: { id: string }) => item.id === 'app-1')?.capabilityIds,
      processIds: model.businessProcesses.find((item: { id: string }) => item.id === 'process-n1-move')?.capabilityIds,
    };
  }, storageKey);
  await expect.poll(readModel).toMatchObject({
    domainId: 'l0-2',
    assessment: { functionalCoverage: 'partial', currentMaturity: 2, targetMaturity: 4 },
    appIds: expect.arrayContaining(['l1-1']),
    processIds: ['l1-1'],
  });

  await page.getByTestId('undo-button').click();
  await expect(source.locator('.cap[data-entity-id="l1-1"]')).toBeVisible();
  await page.getByTestId('redo-button').click();
  await expect(target.locator('.cap[data-entity-id="l1-1"]')).toBeVisible();
  await page.reload();
  await expect(target.locator('.cap[data-entity-id="l1-1"]')).toBeVisible();
  await expect.poll(readModel).toMatchObject({ domainId: 'l0-2', processIds: ['l1-1'] });
});

test('la fiche N1 permet le même rattachement au clavier et au tactile', async ({ page }) => {
  await page.goto('/');
  const map = page.getByTestId('capability-map');
  const source = map.locator('.domain-card[data-entity-id="l0-1"]');
  const destination = map.locator('.domain-card[data-entity-id="l0-2"]');

  await source.locator('.cap[data-entity-id="l1-1"]').getByTestId('capability-open-sheet').click();
  const sheet = page.getByRole('dialog', { name: 'Fiche de capacité N1' });
  await sheet.getByTestId('capability-domain-select').selectOption('l0-2');
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(destination.locator('.cap[data-entity-id="l1-1"]')).toBeVisible();
  await expect(source.locator('.cap[data-entity-id="l1-1"]')).toHaveCount(0);
});
