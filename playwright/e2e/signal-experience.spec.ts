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

  test('passe de l’inventaire flottant au panneau ancré pleine hauteur et restaure la carte', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const map = page.getByTestId('capability-map');
    const inventory = page.locator('#app-inventory');
    const toggle = page.getByTestId('map-inventory-toggle');
    const originalWidth = (await map.boundingBox())!.width;
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(inventory).toBeVisible();
    const size = page.getByTestId('inventory-size-toggle');
    await expect(size).toHaveAttribute('aria-pressed', 'false');
    await size.click();
    await expect(size).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.workspace')).toHaveClass(/mosaic-inventory-docked/);
    await expect.poll(async () => (await inventory.boundingBox())!.height).toBe(900);
    await expect.poll(async () => (await map.boundingBox())!.width).toBeLessThan(originalWidth);
    const bounds = await inventory.boundingBox();
    expect(bounds!.y).toBe(0);
    expect(bounds!.x + bounds!.width).toBeCloseTo(1440, 0);

    await size.click();
    await expect(size).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => (await map.boundingBox())!.width).toBeCloseTo(originalWidth, 0);
    await toggle.click();
    await expect(inventory).toBeHidden();
  });

  test('le panneau Cartographie SI pleine hauteur reste fermable sur mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByTestId('map-inventory-toggle').click();
    await page.getByTestId('inventory-size-toggle').click();
    const inventory = page.locator('#app-inventory');
    const bounds = await inventory.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBe(0);
    expect(bounds!.y).toBe(0);
    expect(bounds!.width).toBeCloseTo(390, 0);
    expect(bounds!.height).toBeCloseTo(844, 0);
    await page.getByRole('button', { name: 'Fermer l’inventaire SI' }).click();
    await expect(inventory).toBeHidden();
    await expect(page.getByTestId('capability-map')).toBeVisible();
  });

  test('ajoute une application depuis la mosaïque puis la relie à une N1', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('map-inventory-toggle').click();
    await page.locator('#app-inventory .side-add').click();
    const dialog = page.getByRole('dialog', { name: 'Nouvelle application' });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await expect(dialog).toContainText('Le nom est obligatoire');

    await dialog.getByLabel('Nom').fill('Outil devis SIGNAL');
    await dialog.getByLabel('Code').fill('APP-SIGNAL-DEVIS');
    await dialog.getByLabel('Éditeur / fournisseur').fill('Éditeur interne');
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByTestId('map-inventory-toggle')).toHaveAttribute('aria-expanded', 'true');

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
    await expect(presentation.getByTestId('map-inventory-toggle')).toHaveCount(0);
    await presentation.close();
  });
});

test('les quatre lectures restent accessibles sans menu Affichage et sans modifier les spans', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const map = page.getByTestId('capability-map');
  await expect(map).toHaveAttribute('data-density', 'compact');
  await expect(page.getByTestId('map-reading-disclosure')).toHaveCount(0);
  await expect(page.getByTestId('map-reading-legend')).toHaveCount(0);
  await expect(page.getByTestId('map-density')).toHaveCount(0);

  const geometry = () => map.locator('.mosaic-domain').evaluateAll(elements => elements.map(element => ({
    name: element.getAttribute('aria-label'),
    column: (element as HTMLElement).style.gridColumn,
    row: (element as HTMLElement).style.gridRow,
    capabilities: element.querySelectorAll('.cap').length,
  })));
  const initial = await geometry();
  expect(initial.length).toBeGreaterThan(0);
  for (const mode of ['applications', 'coverage', 'maturity', 'gaps'] as const) {
    const button = page.getByTestId('map-reading-' + mode);
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await expect(map).toHaveAttribute('data-density', 'compact');
    expect(await geometry()).toEqual(initial);
  }
  await page.reload();
  await expect(map).toHaveAttribute('data-density', 'compact');
  await expect(page.getByTestId('map-reading-disclosure')).toHaveCount(0);
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
  await expect(page.getByTestId('map-inventory-toggle')).toBeVisible();
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

test('les modes de lecture restent pilotables au clavier après suppression du menu Affichage', async ({ page }) => {
  await page.goto('/');
  const coverage = page.getByTestId('map-reading-coverage');
  await coverage.focus();
  await page.keyboard.press('Enter');
  await expect(coverage).toHaveAttribute('aria-pressed', 'true');
  await expect(coverage).toBeFocused();
  await expect(page.getByTestId('capability-map')).toHaveAttribute('data-density', 'compact');
  await expect(page.getByTestId('map-reading-disclosure')).toHaveCount(0);
});

test('la commande de carte unifiée donne priorité à la carte et préserve les opérations métier', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const toolbar = page.getByTestId('map-unified-controls');
  const map = page.getByTestId('capability-map');
  await expect(toolbar).toBeVisible();
  await expect(toolbar.getByTestId('map-filter')).toBeVisible();
  await expect(toolbar.getByTestId('map-reading-applications')).toBeVisible();
  await expect(toolbar.getByTestId('map-inventory-toggle')).toBeVisible();
  await expect(toolbar.getByTestId('map-add-domain')).toBeVisible();
  await expect(toolbar.locator('.canvas-actions > button')).toHaveCount(2);
  await expect(toolbar.getByTestId('map-inventory-toggle')).toHaveAttribute('aria-expanded', 'false');
  await expect(toolbar.getByTestId('capability-diagnostic-shortcut')).toBeHidden();
  await expect(map.locator('.mosaic-domain')).not.toHaveCount(0);

  const geometry = () => map.locator('.mosaic-domain').evaluateAll(nodes => nodes.map(node => ({
    id: node.querySelector('[data-entity-id]')?.getAttribute('data-entity-id'),
    column: (node as HTMLElement).style.gridColumn,
    row: (node as HTMLElement).style.gridRow,
    caps: node.querySelectorAll('.cap').length,
  })));
  const initial = await geometry();
  await toolbar.getByTestId('map-reading-coverage').click();
  await expect(toolbar.getByTestId('map-reading-coverage')).toHaveAttribute('aria-pressed', 'true');
  expect(await geometry()).toEqual(initial);

  const menu = toolbar.getByTestId('map-more-actions');
  const trigger = menu.locator('summary');
  await trigger.click();
  await expect(menu.getByTestId('capability-diagnostic-shortcut')).toBeVisible();
  await menu.getByTestId('capability-diagnostic-shortcut').click();
  await expect(menu).not.toHaveAttribute('open', '');
  await expect(page.getByTestId('capability-diagnostic')).toBeVisible();
  await page.getByTestId('nav-cartography').click();
  await expect(toolbar).toBeVisible();

  await toolbar.getByTestId('map-inventory-toggle').click();
  await expect(page.locator('#app-inventory')).toBeVisible();
  await expect(menu).not.toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Fermer l’inventaire SI' }).click();
  expect(await geometry()).toEqual(initial);
});

test('les commandes secondaires restent accessibles en affichage mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.getByTestId('map-unified-controls')).toBeVisible();
  const menu = page.getByTestId('map-more-actions');
  await menu.locator('summary').click();
  await expect(menu.getByRole('button', { name: 'Structure' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).not.toHaveAttribute('open', '');
  await expect(menu.locator('summary')).toBeFocused();
  await expect(page.getByTestId('map-inventory-toggle')).toBeVisible();
});


test.describe('SIGNAL — hiérarchie document-first de l’éditeur', () => {
  test('rapproche identité et navigation et déplace l’historique dans les commandes de carte', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 900 });
    await page.goto('/');
    const document = page.getByTestId('document-context');
    const navigation = page.getByRole('navigation', { name: 'Navigation principale' });
    const toolbar = page.getByTestId('map-unified-controls');

    await expect(document).toBeVisible();
    await expect(document.getByTestId('active-map-name')).not.toBeEmpty();
    await expect(document.getByTestId('autosave-status')).toBeVisible();
    await expect(navigation).toBeVisible();
    const documentBounds = await document.boundingBox();
    const navBounds = await navigation.boundingBox();
    expect(documentBounds).not.toBeNull();
    expect(navBounds).not.toBeNull();
    expect(navBounds!.x - (documentBounds!.x + documentBounds!.width)).toBeLessThan(70);

    const history = toolbar.getByRole('group', { name: 'Historique des modifications' });
    await expect(history).toBeVisible();
    await expect(history.getByTestId('undo-button')).toBeVisible();
    await expect(history.getByTestId('redo-button')).toBeVisible();
    await expect(page.locator('header').getByTestId('undo-button')).toHaveCount(0);
    await expect(toolbar.getByTestId('map-inventory-toggle')).toBeVisible();
    await expect(toolbar.getByTestId('map-add-domain')).toBeVisible();
    await expect(toolbar.getByTestId('map-reading-applications')).toBeVisible();
    await expect(toolbar).toHaveCSS('border-top-style', 'none');
    await expect(navigation).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

    await page.getByTestId('nav-analysis').click();
    await expect(page.locator('header').getByTestId('undo-button')).toBeVisible();
    await page.getByTestId('nav-cartography').click();
    await expect(toolbar.getByTestId('undo-button')).toBeVisible();
  });

  test('garde les commandes accessibles en mode mobile sans faire disparaître le statut local', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await expect(page.getByTestId('active-map-name')).toBeVisible();
    await expect(page.getByTestId('autosave-status')).toBeVisible();
    await expect(page.getByTestId('tools-menu-toggle')).toBeVisible();
    await expect(page.getByTestId('presentation-switch-toolbar')).toBeVisible();
    const toolbar = page.getByTestId('map-unified-controls');
    await expect(toolbar.getByTestId('undo-button')).toBeVisible();
    await expect(toolbar.getByTestId('map-add-domain')).toBeVisible();
    await expect(toolbar.getByTestId('map-inventory-toggle')).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
