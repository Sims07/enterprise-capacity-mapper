import { expect, test } from '../fixtures';

test.describe('Compagnon cartographe — partage de largeur', () => {
  test('réserve la largeur du compagnon ancré et restaure la carte au redimensionnement ou à la fermeture', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('companion-size'));
    await page.reload();

    const app = page.locator('.app');
    const map = page.getByTestId('capability-map');
    const panel = page.getByTestId('companion-panel');
    const getMapWidth = () => map.evaluate(element => element.getBoundingClientRect().width);
    const originalWidth = await getMapWidth();

    await page.getByTestId('companion-launcher').click();
    const sizeToggle = page.getByTestId('companion-size-toggle');
    await sizeToggle.click();
    await expect(panel).toHaveClass(/is-large/);
    expect(await getMapWidth()).toBeCloseTo(originalWidth, 0); // La grande fenêtre reste flottante.

    await sizeToggle.click();
    await expect(panel).toHaveClass(/is-dock/);
    await expect.poll(async () => {
      const bounds = await page.evaluate(() => {
        const app = document.querySelector('.app')!.getBoundingClientRect();
        const map = document.querySelector('[data-testid="capability-map"]')!.getBoundingClientRect();
        const dock = document.querySelector('[data-testid="companion-panel"]')!.getBoundingClientRect();
        return { appRight: app.right, mapRight: map.right, dockLeft: dock.left };
      });
      return bounds.appRight <= bounds.dockLeft + 1 && bounds.mapRight <= bounds.dockLeft + 1;
    }).toBe(true);
    expect(await getMapWidth()).toBeLessThan(originalWidth);
    await expect(map.locator('.mosaic-domain').first()).toBeVisible();
    await expect(page.getByTestId('map-add-domain')).toBeVisible();

    await sizeToggle.click(); // Ancré → flottant : la cartographie récupère sa largeur.
    await expect(panel).toHaveClass(/is-normal/);
    await expect.poll(getMapWidth).toBeCloseTo(originalWidth, 0);

    await sizeToggle.click();
    await sizeToggle.click();
    await expect(panel).toHaveClass(/is-dock/);
    await page.getByTestId('companion-close').click();
    await expect(panel).toHaveCount(0);
    await expect.poll(getMapWidth).toBeCloseTo(originalWidth, 0);
    await expect(app).toBeVisible();

    await page.getByTestId('companion-launcher').click(); // Le dock sauvegardé doit réserver sa place.
    await expect(panel).toHaveClass(/is-dock/);
    await expect.poll(getMapWidth).toBeLessThan(originalWidth);
  });

  test('ne rétrécit pas la cartographie derrière le panneau plein écran sur mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('companion-size', 'dock'));
    await page.reload();

    const originalWidth = await page.locator('.app').evaluate(element => element.getBoundingClientRect().width);
    await page.getByTestId('companion-launcher').click();
    const panel = page.getByTestId('companion-panel');
    await expect(panel).toHaveClass(/is-dock/);

    const geometry = await page.evaluate(() => ({
      appWidth: document.querySelector('.app')!.getBoundingClientRect().width,
      panelLeft: document.querySelector('[data-testid="companion-panel"]')!.getBoundingClientRect().left,
      panelWidth: document.querySelector('[data-testid="companion-panel"]')!.getBoundingClientRect().width,
    }));
    expect(geometry.appWidth).toBe(originalWidth);
    expect(geometry.panelLeft).toBe(0);
    expect(geometry.panelWidth).toBeCloseTo(originalWidth, 0);
    await page.getByTestId('companion-close').click();
    await expect(page.getByTestId('capability-map')).toBeVisible();
  });
});
