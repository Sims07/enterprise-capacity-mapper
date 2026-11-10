import { expect, test } from '../fixtures';

async function openUpdateNotice(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByTestId('tools-menu-toggle').click();
  const button = page.getByTestId('pwa-update-button');
  await expect(button).toBeVisible();
  return button;
}

test.beforeEach(async ({ page }) => {
  // A deterministic replacement for the browser SW API: the tests exercise
  // the real menu and update button without activating a cached CI worker.
  await page.addInitScript(() => {
    const commands: string[] = [];
    const worker = Object.assign(new EventTarget(), {
      state: 'installed',
      postMessage: (message: { type: string }) => { commands.push(message.type); },
    });
    const registration = Object.assign(new EventTarget(), {
      installing: null,
      waiting: worker,
      active: null,
      update: async () => undefined,
    });
    const serviceWorker = Object.assign(new EventTarget(), {
      controller: { state: 'activated' },
      register: async () => registration,
      getRegistration: async () => registration,
    });
    Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: serviceWorker });
    Object.assign(window, { __pwaUpdateTest: { worker, registration, serviceWorker, commands } });
  });
});

test('sort du mode installation si le nouveau worker devient redondant', async ({ page }) => {
  const button = await openUpdateNotice(page);
  await button.click();
  await expect(button).toBeDisabled();
  await expect(page.locator('.pwa-update-message')).toContainText('Installation de la mise à jour');

  await page.evaluate(() => {
    const state = (window as unknown as { __pwaUpdateTest: {
      worker: EventTarget & { state: string }; commands: string[];
    } }).__pwaUpdateTest;
    if (!state.commands.includes('SKIP_WAITING')) throw new Error('Missing SKIP_WAITING request');
    state.worker.state = 'redundant';
    state.worker.dispatchEvent(new Event('statechange'));
  });

  await expect(page.locator('.pwa-update-message')).toContainText('interrompue');
  await expect(button).toHaveCount(0);
});

test('propose une nouvelle tentative si aucune activation ne se produit', async ({ page }) => {
  await page.clock.install();
  const button = await openUpdateNotice(page);
  await button.click();
  await expect(button).toBeDisabled();

  // Go beyond the documented 15-second activation watchdog without waiting in real time.
  await page.clock.fastForward('00:20');
  await expect(page.locator('.pwa-update-message')).toContainText('n’a pas abouti');
  await expect(button).toBeEnabled();
  await button.click();
  await expect(button).toBeDisabled();
  await expect.poll(() => page.evaluate(() => (
    window as unknown as { __pwaUpdateTest: { commands: string[] } }
  ).__pwaUpdateTest.commands.length)).toBe(2);
});

test('recharge la page quand le worker est activé, même sans controllerchange', async ({ page }) => {
  const button = await openUpdateNotice(page);
  await button.click();
  const reloaded = page.waitForEvent('load');
  await page.evaluate(() => {
    const state = (window as unknown as { __pwaUpdateTest: {
      worker: EventTarget & { state: string };
      registration: { active: unknown; waiting: unknown };
    } }).__pwaUpdateTest;
    state.worker.state = 'activated';
    state.registration.active = state.worker;
    state.registration.waiting = null;
    state.worker.dispatchEvent(new Event('statechange'));
  }).catch(() => {}); // A real reload may interrupt the evaluation context.
  await reloaded;
  await expect.poll(() => page.evaluate(() => (
    performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
  ).type)).toBe('reload');
});
