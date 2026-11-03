import { expect, test } from '../fixtures';

test.describe('Rendu mosaïque', () => {
  test('affiche les domaines dans une grille bidimensionnelle et conserve le mode choisi', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const mosaic = page.getByTestId('mosaic-map');
    await expect(mosaic).toBeVisible();
    await expect(mosaic.locator('.mosaic-column-heading')).toHaveCount(4);
    await expect(mosaic.locator('.mosaic-row-heading')).toHaveCount(3);
    await expect(mosaic.locator('.mosaic-domain')).not.toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('mosaic-map')).toBeVisible();
  });

  test('présente la mosaïque sans repères de grille et avec les panneaux colorés', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();
    await page.getByTestId('presentation-switch-input').check();
    const mosaic = page.getByTestId('mosaic-map');
    await expect(mosaic.locator('.mosaic-zone')).toHaveCount(0);
    await expect(mosaic.locator('.mosaic-column-heading, .mosaic-row-heading, .mosaic-corner')).toHaveCount(0);
    const firstDomain = mosaic.locator('.mosaic-domain').first();
    await expect(firstDomain.locator('.domain')).toHaveCSS('background-color', /rgb/);
    await expect(firstDomain.locator('.mosaic-resize-controls')).toHaveCount(0);
  });

  test('met en valeur le titre d’un domaine sans N1 dans un panneau dédié', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cell-add').first().click();
    const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
    await dialog.getByLabel('Nom').fill('Domaine sans capacité');
    await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('DOM-EMPTY');
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await page.getByTestId('mosaic-view').click();
    await page.getByTestId('presentation-switch-input').check();
    const emptyDomain = page.getByTestId('mosaic-map').locator('.mosaic-presentation-empty').filter({ hasText: 'Domaine sans capacité' });
    await expect(emptyDomain).toBeVisible();
    await expect(emptyDomain.locator('.domain-banner')).toHaveCSS('justify-content', 'center');
    const titleSize = await emptyDomain.locator('.domain-banner h3').evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(titleSize).toBeGreaterThan(22);
  });
  test('permet de revenir au rendu matrice', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();
    await page.getByTestId('matrix-view').click();
    await expect(page.locator('.map-matrix')).toBeVisible();
    await expect(page.getByTestId('mosaic-map')).toHaveCount(0);
  });

  test('redimensionne un domaine et conserve son étendue après rechargement', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const firstDomain = page.locator('.mosaic-domain').first();
    const increaseWidth = firstDomain.getByRole('button', { name: /Augmenter la largeur/ });
    await expect(increaseWidth).toBeEnabled();
    await increaseWidth.click();
    await expect(firstDomain).toHaveCSS('grid-column', /span 2/);
    const mosaicBounds = await page.getByTestId('mosaic-map').boundingBox();
    const expandedBounds = await firstDomain.boundingBox();
    expect(mosaicBounds).not.toBeNull();
    expect(expandedBounds).not.toBeNull();
    // A two-column span must be visible, not merely stored in grid-column.
    expect(expandedBounds!.width).toBeGreaterThan(mosaicBounds!.width * 0.35);

    await page.reload();
    await page.getByTestId('mosaic-view').click();
    const persistedDomain = page.locator('.mosaic-domain').first();
    await expect(persistedDomain).toHaveCSS('grid-column', /span 2/);
    await persistedDomain.getByRole('button', { name: /Réduire la largeur/ }).click();
    await expect(persistedDomain).toHaveCSS('grid-column', /span 1/);
  });

  test('permet de masquer indépendamment les intitulés des axes dans Structure', async ({ page }) => {
    await page.goto('/');
    const matrix = page.getByTestId('matrix-map');

    await page.getByRole('button', { name: /Structure/ }).click();
    let options = page.getByTestId('axis-heading-options');
    await options.getByLabel('Afficher les titres des colonnes').uncheck();
    await page.getByRole('button', { name: 'Enregistrer' }).last().click();
    await expect(matrix.locator('.map-head .col-head')).toHaveCount(0);
    await expect(matrix.locator('.axis-label')).toHaveCount(3);

    await page.getByRole('button', { name: /Structure/ }).click();
    options = page.getByTestId('axis-heading-options');
    await options.getByLabel('Afficher les titres des colonnes').check();
    await options.getByLabel('Afficher les titres des lignes').uncheck();
    await page.getByRole('button', { name: 'Enregistrer' }).last().click();
    await expect(matrix.locator('.map-head .col-head')).toHaveCount(4);
    await expect(matrix.locator('.axis-label')).toHaveCount(0);

    await page.getByRole('button', { name: /Structure/ }).click();
    options = page.getByTestId('axis-heading-options');
    await options.getByLabel('Afficher les titres des colonnes').uncheck();
    await page.getByRole('button', { name: 'Enregistrer' }).last().click();
    await expect(matrix.locator('.map-head .col-head')).toHaveCount(0);
    await expect(matrix.locator('.axis-label')).toHaveCount(0);

    await page.getByTestId('mosaic-view').click();
    const mosaic = page.getByTestId('mosaic-map');
    await expect(mosaic.locator('.mosaic-column-heading')).toHaveCount(0);
    await expect(mosaic.locator('.mosaic-row-heading')).toHaveCount(0);

    await page.reload();
    await page.getByTestId('mosaic-view').click();
    await expect(page.getByTestId('mosaic-map').locator('.mosaic-column-heading')).toHaveCount(0);
    await expect(page.getByTestId('mosaic-map').locator('.mosaic-row-heading')).toHaveCount(0);
  });

  test('utilise toute la largeur en mosaïque sans inventaire applicatif latéral', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();
    await expect(page.locator('.workspace.mosaic-workspace > aside')).toBeHidden();
    const workspace = await page.locator('.workspace').boundingBox();
    const mosaic = await page.getByTestId('mosaic-map').boundingBox();
    expect(workspace).not.toBeNull();
    expect(mosaic).not.toBeNull();
    expect(mosaic!.width).toBeGreaterThan(workspace!.width * 0.85);

    const inventoryToggle = page.getByTestId('mosaic-inventory-toggle');
    await expect(inventoryToggle).toHaveAttribute('aria-expanded', 'false');
    await inventoryToggle.click();
    await expect(page.locator('.workspace.mosaic-workspace > aside')).toBeVisible();
    await expect(page.locator('#app-inventory')).toContainText('Inventaire SI');
    await expect(inventoryToggle).toHaveAttribute('aria-expanded', 'true');
    await inventoryToggle.click();
    await expect(page.locator('.workspace.mosaic-workspace > aside')).toBeHidden();
  });

  test('conserve une matrice de huit colonnes dans la largeur de la zone de travail', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /Structure/ }).click();
    const addColumn = page.getByRole('button', { name: /Ajouter une colonne/ });
    for (let index = 0; index < 4; index += 1) await addColumn.click();
    await page.getByRole('button', { name: 'Enregistrer' }).last().click();

    const matrix = page.getByTestId('matrix-map');
    await expect(matrix.locator('.map-row').first().locator('.col-head')).toHaveCount(8);
    const dimensions = await matrix.evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });

  test('permet de créer une capacité N1 directement depuis un domaine en mosaïque', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const domain = page.getByTestId('mosaic-map').locator('.mosaic-domain')
      .filter({ hasText: 'Relation & Engagement Client' });
    await domain.getByRole('button', { name: 'Ajouter une capacité N1 à Relation & Engagement Client' }).click();

    const dialog = page.getByRole('dialog', { name: 'Nouvelle capacité N1' });
    await dialog.getByLabel('Nom').fill('Gestion des contrats clients');
    await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('CRM-04');
    await dialog.getByRole('button', { name: 'Créer' }).click();

    await expect(domain.locator('.caps-list')).toContainText('Gestion des contrats clients');
    await expect(domain.locator('.domain-meta')).toContainText('4 N1');
  });




});
