import { expect, test } from '../fixtures';

test('échange deux N0 par drag-and-drop sans changer leurs N1 et restaure les positions', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const map = page.getByTestId('capability-map');
  const first = map.locator('.mosaic-domain:has(.domain-card[data-entity-id="l0-1"])');
  const second = map.locator('.mosaic-domain:has(.domain-card[data-entity-id="l0-2"])');
  const source = first.locator('.domain-card');
  const destination = second.locator('.domain-card');
  const initialFirstColumn = await first.getAttribute('data-layout-grid-column');
  const initialFirstRow = await first.getAttribute('data-layout-grid-row');
  const initialSecondColumn = await second.getAttribute('data-layout-grid-column');
  const initialSecondRow = await second.getAttribute('data-layout-grid-row');

  await expect(source.locator('.cap[data-entity-id="l1-1"]')).toBeVisible();
  await expect(destination.locator('.cap[data-entity-id="l1-4"]')).toBeVisible();
  await source.locator('.domain-banner').dragTo(destination.locator('.domain-banner'));

  await expect(first).toHaveAttribute('data-layout-grid-column', initialSecondColumn!);
  await expect(first).toHaveAttribute('data-layout-grid-row', initialSecondRow!);
  await expect(second).toHaveAttribute('data-layout-grid-column', initialFirstColumn!);
  await expect(second).toHaveAttribute('data-layout-grid-row', initialFirstRow!);
  await expect(source.locator('.cap[data-entity-id="l1-1"]')).toBeVisible();
  await expect(destination.locator('.cap[data-entity-id="l1-4"]')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Positions des deux domaines N0 échangées');

  const storageKey = 'enterprise-capacity-mapper:model:v3';
  const readSwap = () => page.evaluate(key => {
    const model = JSON.parse(localStorage.getItem(key)!);
    return {
      first: model.domains.find((item: { id: string }) => item.id === 'l0-1')?.layout,
      second: model.domains.find((item: { id: string }) => item.id === 'l0-2')?.layout,
      firstCapabilityDomain: model.capabilities.find((item: { id: string }) => item.id === 'l1-1')?.domainId,
      secondCapabilityDomain: model.capabilities.find((item: { id: string }) => item.id === 'l1-4')?.domainId,
      appLinks: model.applications.find((item: { id: string }) => item.id === 'app-1')?.capabilityIds,
    };
  }, storageKey);
  await expect.poll(readSwap).toMatchObject({
    first: { columnId: 'support', layerId: 'support' },
    second: { columnId: 'customer', layerId: 'core' },
    firstCapabilityDomain: 'l0-1',
    secondCapabilityDomain: 'l0-2',
    appLinks: expect.arrayContaining(['l1-1']),
  });

  await page.getByTestId('undo-button').click();
  await expect(first).toHaveAttribute('data-layout-grid-column', initialFirstColumn!);
  await expect(second).toHaveAttribute('data-layout-grid-column', initialSecondColumn!);
  await page.getByTestId('redo-button').click();
  await expect(first).toHaveAttribute('data-layout-grid-column', initialSecondColumn!);
  await page.reload();
  await expect(map.locator('.mosaic-domain:has(.domain-card[data-entity-id="l0-1"])'))
    .toHaveAttribute('data-layout-grid-column', initialSecondColumn!);
  await expect.poll(readSwap).toMatchObject({
    first: { columnId: 'support', layerId: 'support' },
    second: { columnId: 'customer', layerId: 'core' },
  });
});

test('ne déplace pas un N0 en mode présentation', async ({ page }) => {
  await page.goto('/?view=presentation');
  const map = page.getByTestId('capability-map');
  await expect(map.locator('.domain-card[data-entity-id="l0-1"]')).toHaveAttribute('draggable', 'false');
});
