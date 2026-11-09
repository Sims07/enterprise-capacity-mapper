import { expect, test } from '../fixtures';

const map = (page: import('@playwright/test').Page) => page.getByTestId('capability-map');
const domain = (page: import('@playwright/test').Page) =>
  map(page).locator('.mosaic-domain').filter({ has: page.locator('[data-entity-id="l0-1"]') });
const compactMinTileHeight = 160; // Hauteur imposée historiquement en mode confortable.

test.describe('Cartographie — densité compacte adaptative', () => {
  test('la densité compacte supprime la hauteur forcée des N1, sans modifier le mode confortable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const tiles = domain(page).locator('.cap');
    await expect(tiles).toHaveCount(3);

    const initialHeight = (await tiles.first().boundingBox())!.height;
    expect(initialHeight).toBeGreaterThanOrEqual(compactMinTileHeight);

    await page.getByTestId('map-reading-disclosure').locator('summary').click();
    await page.getByTestId('map-density').selectOption('compact');
    await expect(map(page)).toHaveAttribute('data-density', 'compact');
    const compactHeight = (await tiles.first().boundingBox())!.height;
    expect(compactHeight).toBeLessThan(compactMinTileHeight);
    expect(compactHeight).toBeLessThan(initialHeight);

    await page.getByTestId('map-density').selectOption('comfortable');
    await expect(map(page)).toHaveAttribute('data-density', 'comfortable');
    expect((await tiles.first().boundingBox())!.height).toBeGreaterThanOrEqual(compactMinTileHeight);
  });

  test('passe à deux N1 par rangée pour un N0 élargi, garde toutes les applications et revient à une colonne sur mobile', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();

    await page.evaluate(() => {
      const key = 'enterprise-capacity-mapper:model:v3';
      const json = localStorage.getItem(key);
      if (!json) throw new Error('Cartographie absente du stockage local');
      const model = JSON.parse(json);
      const first = model.domains.find((item: { id: string }) => item.id === 'l0-1');
      first.layout.columnSpan = 2; // Deux colonnes de la mosaïque, sur une zone libre.
      for (const app of model.applications.slice(1, 4)) {
        if (!app.capabilityIds.includes('l1-1')) app.capabilityIds.push('l1-1');
      }
      localStorage.setItem(key, JSON.stringify(model));
      localStorage.setItem('enterprise-capacity-mapper:map-density', 'compact');
    });
    await page.reload();
    await expect(map(page)).toHaveAttribute('data-density', 'compact');

    const wideDomain = domain(page);
    const tiles = wideDomain.locator('.cap');
    await expect(tiles).toHaveCount(3);
    const layout = await tiles.evaluateAll(elements => elements.map(element => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, right: box.right, bottom: box.bottom, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight };
    }));
    expect(layout[0].y).toBeCloseTo(layout[1].y, 0);
    expect(layout[0].right).toBeLessThanOrEqual(layout[1].x);
    expect(layout[2].y).toBeGreaterThanOrEqual(Math.max(layout[0].bottom, layout[1].bottom) - 1);
    expect(layout.every(tile => tile.scrollHeight <= tile.clientHeight + 1)).toBe(true);

    const linkedApps = tiles.first().locator('.relations .rel');
    await expect(linkedApps).toHaveCount(4);
    for (const rel of await linkedApps.all()) await expect(rel).toBeVisible();
    await expect(tiles.first().locator('.rel button')).toHaveCount(4);

    await page.setViewportSize({ width: 390, height: 844 });
    const mobile = await tiles.evaluateAll(elements => elements.map(element => element.getBoundingClientRect().x));
    expect(Math.abs(mobile[0] - mobile[1])).toBeLessThanOrEqual(1);
    expect(Math.abs(mobile[1] - mobile[2])).toBeLessThanOrEqual(1);
    for (const rel of await linkedApps.all()) await expect(rel).toBeVisible();
  });

  test('ne modifie pas la composition de la présentation', async ({ page }) => {
    await page.goto('/?view=presentation');
    const mosaic = map(page);
    await expect(mosaic).not.toHaveAttribute('data-density', 'compact');
    await expect(mosaic.locator('.mosaic-domain .caps-list').first()).toHaveCSS('display', 'grid');
    await expect(mosaic.locator('.mosaic-domain .cap')).not.toHaveCount(0);
  });
});
