import { expect, test } from '../fixtures';

const VIEWPORTS = [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 900, height: 800 },
  { width: 1280, height: 900 },
] as const;

for (const viewport of VIEWPORTS) {
  test(`menu Outils homogène et ancré dans le viewport ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const toggle = page.getByTestId('tools-menu-toggle');
    await toggle.click();

    const menu = page.locator('#tools-panel');
    await expect(menu).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const commands = menu.locator('.toolbar-menu-action');
    await expect(commands).toHaveCount(5);
    await expect(menu.getByTestId('import-model')).toHaveCount(1);
    await expect(menu.getByTestId('pwa-version')).toBeVisible();

    const bounds = await menu.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);

    // Les icônes et les surfaces de clic partagent un alignement unique,
    // quelle que soit la primitive (Button ou FilePicker).
    const geometry = await commands.evaluateAll(elements => elements.map(element => {
      const command = element.getBoundingClientRect();
      const icon = element.querySelector('.toolbar-menu-icon')?.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: command.x, iconX: icon?.x, aligned: style.justifyContent, border: style.borderTopColor };
    }));
    const first = geometry[0];
    for (const item of geometry) {
      expect(Math.abs(item.x - first.x)).toBeLessThanOrEqual(1);
      expect(Math.abs((item.iconX ?? 0) - (first.iconX ?? 0))).toBeLessThanOrEqual(1);
      expect(['flex-start', 'flow-start']).toContain(item.aligned);
      expect(item.border).toBe('rgba(0, 0, 0, 0)');
    }

    await page.getByTestId('theme-toggle').click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await toggle.click();
    await expect(menu).toBeVisible();
    const themeBounds = await menu.boundingBox();
    expect(themeBounds).not.toBeNull();
    expect(themeBounds!.x).toBeGreaterThanOrEqual(0);
    expect(themeBounds!.x + themeBounds!.width).toBeLessThanOrEqual(viewport.width);
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
  });
}
