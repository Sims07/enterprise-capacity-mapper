import { expect, test } from '../fixtures';

const MAX_LAYOUT_DRIFT_PX = 2;

test.describe('SIGNAL — parcours client sans régression', () => {
  test('conserve la navigation en haut et toute la largeur de la mosaïque en ouvrant l’inventaire', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.locator('.app.signal-experience')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeVisible();

    const map = page.getByTestId('capability-map');
    const before = await map.boundingBox();
    expect(before).not.toBeNull();
    const inventory = page.locator('#app-inventory');
    await expect(inventory).toBeHidden();

    await page.getByTestId('map-inventory-toggle').click();
    await expect(inventory).toBeVisible();
    await expect(inventory).toHaveCSS('position', 'fixed');
    const after = await map.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.width - before!.width)).toBeLessThanOrEqual(MAX_LAYOUT_DRIFT_PX);
    await expect(map.locator('.mosaic-domain')).toHaveCount(4);

    await page.getByRole('button', { name: 'Fermer l’inventaire SI' }).click();
    await expect(inventory).toBeHidden();
    await page.getByTestId('map-inventory-toggle').click();
    await expect(inventory).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(inventory).toBeHidden();
  });

  test('ajoute une application depuis la mosaïque puis la relie à une N1', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('signal-add-application').click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle application' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await expect(dialog).toContainText('Le nom est obligatoire');

    await dialog.getByLabel('Nom').fill('Outil devis SIGNAL');
    await dialog.getByLabel('Code').fill('APP-SIGNAL-DEVIS');
    await dialog.getByLabel('Éditeur / fournisseur').fill('Éditeur interne');
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await expect(dialog).toBeHidden();

    await page.getByTestId('map-inventory-toggle').click();
    const app = page.locator('#app-inventory .app-item').filter({ hasText: 'Outil devis SIGNAL' });
    await expect(app).toBeVisible();
    await app.getByRole('button', { name: /Relier/ }).click();

    const linkDialog = page.getByRole('dialog', { name: /Relier « Outil devis SIGNAL »/ });
    await linkDialog.getByLabel('Gestion des Offres & Devis').check();
    await linkDialog.getByTestId('link-save').click();
    await expect(linkDialog).toBeHidden();

    await page.getByRole('button', { name: 'Fermer l’inventaire SI' }).click();
    const capability = page.locator('.cap:visible').filter({ hasText: 'Gestion des Offres & Devis' });
    await expect(capability).toContainText('Outil devis SIGNAL');
    await page.reload();
    await expect(page.locator('.cap:visible').filter({ hasText: 'Gestion des Offres & Devis' })).toContainText('Outil devis SIGNAL');
  });

  test('préserve la fenêtre de présentation indépendante et sa grille en lecture seule', async ({ page, context }) => {
    await page.goto('/');
    const popupPromise = context.waitForEvent('page');
    await page.getByTestId('presentation-switch-toolbar').click();
    const presentation = await popupPromise;
    await presentation.waitForLoadState();
    await expect(presentation).toHaveURL(/view=presentation/);
    await expect(presentation.locator('.app.signal-experience.mosaic-presentation-mode')).toBeVisible();
    await expect(presentation.locator('.map-mosaic .mosaic-domain')).toHaveCount(4);
    await expect(presentation.locator('.map-controls-row')).toBeHidden();
    await expect(presentation.getByTestId('signal-add-application')).toHaveCount(0);
    await presentation.close();
  });
});

test('la légende suit les quatre lectures sans modifier les spans et la densité reste locale', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const map = page.getByTestId('capability-map');
  const geometry = () => map.locator('.mosaic-domain').evaluateAll(elements => elements.map(element => ({
    name: element.getAttribute('aria-label'),
    column: (element as HTMLElement).style.gridColumn,
    row: (element as HTMLElement).style.gridRow,
    capabilities: element.querySelectorAll('.cap').length,
  })));
  const initial = await geometry();
  expect(initial.length).toBeGreaterThan(0);
  const display = page.getByTestId('map-reading-disclosure');
  await expect(page.getByTestId('map-reading-legend')).toBeHidden();
  await display.locator('summary').click();
  await expect(page.getByTestId('map-reading-legend')).toBeVisible();
  for (const [mode, label] of [
    ['applications', 'Nombre de supports applicatifs actuels'],
    ['coverage', 'Non couverte'],
    ['maturity', 'Maturité actuelle /5 déclarée'],
    ['gaps', 'Signal à examiner'],
  ] as const) {
    await page.getByTestId('map-reading-' + mode).click();
    await expect(page.getByTestId('map-reading-legend')).toHaveAttribute('data-reading', mode);
    await expect(page.getByTestId('map-reading-legend')).toContainText(label);
    expect(await geometry()).toEqual(initial);
  }
  await page.getByTestId('map-density').selectOption('compact');
  await expect(map).toHaveAttribute('data-density', 'compact');
  expect(await geometry()).toEqual(initial);
  await page.reload();
  await expect(page.getByTestId('map-reading-legend')).toBeHidden();
  await page.getByTestId('map-reading-disclosure').locator('summary').click();
  await expect(page.getByTestId('map-density')).toHaveValue('compact');
  await expect(page.getByTestId('capability-map')).toHaveAttribute('data-density', 'compact');
  expect(await geometry()).toEqual(initial);
});

test('la restitution distingue chaque légende, imprime sans contrôles et explicite les métriques SI', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('nav-analysis').click();
  const definition = page.getByTestId('dashboard-coverage-definition');
  await expect(definition).toBeVisible();
  await expect(definition).toContainText('liens avec des applications actuelles');
  await expect(definition).toContainText('ne démontrent ni la qualité de couverture fonctionnelle');

  await page.goto('/?view=presentation');
  await expect(page.getByTestId('capability-map')).toBeVisible();
  await page.evaluate(() => { window.print = () => { document.documentElement.dataset.printCalled = 'true'; }; });
  await page.mouse.move(10, 10);
  const printButton = page.getByTestId('print-presentation');
  await expect(printButton).toBeVisible();
  await printButton.click();
  await expect(page.locator('html')).toHaveAttribute('data-print-called', 'true');

  for (const [mode, text] of [
    ['coverage', 'Non couverte'],
    ['maturity', 'Non évaluée'],
    ['gaps', 'Aucun signal détecté'],
  ] as const) {
    await page.mouse.move(10, 10);
    await page.getByTestId('presentation-reading-' + mode).click();
    await expect(page.getByTestId('presentation-legend')).toHaveAttribute('data-reading', mode);
    await expect(page.getByTestId('presentation-legend')).toContainText(text);
  }
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.presentation-exit-bar')).toBeHidden();
  await expect(page.getByTestId('capability-map')).toBeVisible();
});

test('la carte conserve les actions secondaires au survol et au clavier sans barres de dépôt répétées', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.getByTestId('signal-add-application')).toBeVisible();
  await expect(page.getByTestId('map-add-domain')).toBeVisible();
  await expect(page.getByTestId('capability-reading-toolbar')).toBeVisible();

  const capability = page.getByTestId('capability-map').locator('.mosaic-domain .cap').first();
  const actions = capability.locator('.capability-card-actions');
  await expect(capability.locator('.drop')).toHaveCSS('height', '0px');
  await page.mouse.move(0, 0);
  await expect(actions).toHaveCSS('opacity', '0');
  await capability.hover();
  await expect(actions).toHaveCSS('opacity', '1');
  const sheet = capability.getByTestId('capability-open-sheet');
  await sheet.focus();
  await expect(actions).toHaveCSS('opacity', '1');
  await sheet.click();
  await expect(page.getByRole('dialog', { name: 'Fiche de capacité N1' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Fiche de capacité N1' })
    .getByRole('button', { name: 'Fermer la fenêtre' }).click();
});

test('Affichage ouvre la légende au clavier, puis Escape la referme sans changer la lecture', async ({ page }) => {
  await page.goto('/');
  const disclosure = page.getByTestId('map-reading-disclosure');
  const summary = disclosure.locator('summary');
  await summary.focus();
  await page.keyboard.press('Enter');
  await expect(disclosure).toHaveAttribute('open', '');
  await expect(page.getByTestId('map-reading-legend')).toBeVisible();
  await disclosure.getByTestId('map-density').selectOption('compact');
  await page.keyboard.press('Escape');
  await expect(disclosure).not.toHaveAttribute('open', '');
  await expect(summary).toBeFocused();
  await expect(page.getByTestId('map-reading-applications')).toHaveAttribute('aria-pressed', 'true');
});
