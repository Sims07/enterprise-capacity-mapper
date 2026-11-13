import { expect, test } from '../fixtures';

const map = (page: import('@playwright/test').Page) => page.getByTestId('capability-map');
const domain = (page: import('@playwright/test').Page) =>
  map(page).locator('.mosaic-domain').filter({ has: page.locator('[data-entity-id="l0-1"]') });
const compactMinTileHeight = 160; // Hauteur imposée historiquement en mode confortable.

test.describe('Cartographie — densité compacte adaptative', () => {
  test('affiche uniquement la densité compacte, même après une ancienne préférence Confortable', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem('enterprise-capacity-mapper:map-density', 'comfortable')
    );
    await page.reload();

    const tiles = domain(page).locator('.cap');
    await expect(tiles).toHaveCount(3);
    await expect(map(page)).toHaveAttribute('data-density', 'compact');
    await expect(page.getByTestId('map-reading-disclosure')).toHaveCount(0);
    await expect(page.getByTestId('map-density')).toHaveCount(0);
    await expect(page.getByText('Affichage', { exact: true })).toHaveCount(0);

    const tileHeight = (await tiles.first().boundingBox())!.height;
    expect(tileHeight).toBeLessThan(compactMinTileHeight);
    await page.reload();
    await expect(map(page)).toHaveAttribute('data-density', 'compact');
    expect((await tiles.first().boundingBox())!.height).toBeLessThan(compactMinTileHeight);
    expect(await page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:map-density'))).toBe('comfortable');
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
      localStorage.setItem('enterprise-capacity-mapper:map-density', 'comfortable'); // Ignoré par l'éditeur.
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

  test('remplit la hauteur du N0 avec ses N1 même quand le domaine voisin est plus dense', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect.poll(() => page.evaluate(() =>
      localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();

    // Deux N0 sur une même piste métier : celui de gauche devient plus dense,
    // celui de droite ne conserve qu'une N1 à étirer.
    await page.evaluate(() => {
      const key = 'enterprise-capacity-mapper:model:v3';
      const json = localStorage.getItem(key);
      if (!json) throw new Error('Cartographie absente du stockage local');
      const model = JSON.parse(json);
      const capability = model.capabilities.find((item: { id: string }) => item.id === 'l1-8');
      if (!capability) throw new Error('Capacité de démonstration introuvable');
      capability.domainId = 'l0-1';
      localStorage.setItem(key, JSON.stringify(model));
    });
    await page.reload();

    const mosaic = map(page);
    await expect(mosaic).toHaveAttribute('data-density', 'compact');
    const compactDomain = mosaic.locator('.mosaic-domain').filter({
      has: page.locator('.domain-card[data-entity-id="l0-3"]'),
    });
    await expect(compactDomain.locator('.cap')).toHaveCount(1);

    const geometry = await mosaic.evaluate(element => {
      const dense = element.querySelector<HTMLElement>('.domain-card[data-entity-id="l0-1"]');
      const sparse = element.querySelector<HTMLElement>('.domain-card[data-entity-id="l0-3"]');
      const list = sparse?.querySelector<HTMLElement>('.caps-list');
      const cap = list?.querySelector<HTMLElement>('.cap');
      if (!dense || !sparse || !list || !cap) throw new Error('N0 ou N1 absente');

      const denseBounds = dense.getBoundingClientRect();
      const sparseBounds = sparse.getBoundingClientRect();
      const listBounds = list.getBoundingClientRect();
      const capBounds = cap.getBoundingClientRect();
      const listBottomPadding = Number.parseFloat(getComputedStyle(list).paddingBottom);
      return {
        sameRow: Math.abs(denseBounds.top - sparseBounds.top),
        sameBottom: Math.abs(denseBounds.bottom - sparseBounds.bottom),
        unusedBottom: listBounds.bottom - capBounds.bottom - listBottomPadding,
        desktopCapabilityHeight: capBounds.height,
        allRelationsVisible: [...cap.querySelectorAll<HTMLElement>('.rel')]
          .every(rel => rel.getBoundingClientRect().height > 0),
        isGridUntouched: getComputedStyle(list).display === 'flex',
      };
    });

    const pixelTolerance = 2;
    expect(geometry.sameRow).toBeLessThanOrEqual(pixelTolerance);
    expect(geometry.sameBottom).toBeLessThanOrEqual(pixelTolerance);
    expect(Math.abs(geometry.unusedBottom)).toBeLessThanOrEqual(pixelTolerance);
    expect(geometry.allRelationsVisible).toBe(true);
    expect(geometry.isGridUntouched).toBe(true);

    // En lecture mobile les N0 n'ont plus à égaliser leurs hauteurs :
    // la N1 retrouve une hauteur dictée par son seul contenu.
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileCapabilityHeight = await compactDomain.locator('.cap').evaluate(
      element => element.getBoundingClientRect().height
    );
    expect(mobileCapabilityHeight).toBeLessThan(geometry.desktopCapabilityHeight);
  });

  test('ne modifie pas la composition de la présentation', async ({ page }) => {
    await page.goto('/?view=presentation');
    const mosaic = map(page);
    await expect(mosaic).not.toHaveAttribute('data-density', 'compact');
    await expect(mosaic.locator('.mosaic-domain .caps-list').first()).toHaveCSS('display', 'grid');
    await expect(mosaic.locator('.mosaic-domain .cap')).not.toHaveCount(0);
  });
});
