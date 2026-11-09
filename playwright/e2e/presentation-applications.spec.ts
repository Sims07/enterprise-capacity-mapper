import { expect, test } from '../fixtures';

test('garde les applications visibles avec quatre N1 dans un N0 de présentation dense', async ({ page }) => {
  // Reproduit une mosaïque de 3 colonnes × 4 lignes, proche de la carte projetée.
  const domainColumns = 3;
  const domainRows = 4;
  const capabilityNames = [
    'Gestion du carnet de Santé',
    'Gestion de ses Applications de Santé',
    'Gestion des retours Usager',
    'Gestion des anomalies',
  ];
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();
  await page.evaluate(({ domainColumns, domainRows, capabilityNames }) => {
    const key = 'enterprise-capacity-mapper:model:v3';
    const persisted = localStorage.getItem(key);
    if (!persisted) throw new Error('La cartographie de test doit être persistée');
    const model = JSON.parse(persisted);
    const columns = Array.from({ length: domainColumns }, (_, index) => ({
      id: `presentation-col-${index}`, name: `Colonne ${index + 1}`, order: index,
    }));
    const layers = Array.from({ length: domainRows }, (_, index) => ({
      id: `presentation-row-${index}`, name: `Ligne ${index + 1}`, order: index,
    }));
    model.layout = { ...model.layout, columns, layers };
    model.domains = Array.from({ length: domainColumns * domainRows }, (_, index) => ({
      id: `presentation-domain-${index}`,
      code: `DOM-${index}`,
      name: index === 0 ? 'Relation propriétaire données de santé' : `Domaine ${index}`,
      color: 'indigo',
      layout: {
        columnId: columns[index % domainColumns].id,
        layerId: layers[Math.floor(index / domainColumns)].id,
      },
    }));
    model.capabilities = capabilityNames.map((name, index) => ({
      id: `presentation-cap-${index}`,
      domainId: 'presentation-domain-0',
      code: `N1-${index}`,
      name,
    }));
    model.applications = capabilityNames.map((_, index) => ({
      id: `presentation-app-${index}`,
      name: ['Mon espace santé', 'Gestion des applications de santé', 'Portail Usager', 'Dossier de soins'][index],
      status: index === 1 ? 'Cible' : 'Actif',
      capabilityIds: [`presentation-cap-${index}`],
    }));
    model.applications.push(
      { id: 'presentation-app-extra', name: 'Dossier Médical Partagé', status: 'Actif', capabilityIds: ['presentation-cap-0'] },
      { id: 'presentation-app-third', name: 'Historique de santé', status: 'Cible', capabilityIds: ['presentation-cap-0'] },
    );
    localStorage.setItem(key, JSON.stringify(model));
  }, { domainColumns, domainRows, capabilityNames });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 1728, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/?view=presentation');
    await page.getByTestId('presentation-show-applications').check();

    const mosaic = page.getByTestId('capability-map');
    await expect(mosaic.locator('.mosaic-domain')).toHaveCount(domainColumns * domainRows);
    const domain = mosaic.locator('.mosaic-domain').filter({ hasText: 'Relation propriétaire données de santé' });
    await expect(domain.locator('.cap')).toHaveCount(capabilityNames.length);
    await expect(domain.locator('.presentation-app-chip')).toHaveCount(capabilityNames.length + 1);
    await expect(domain.locator('.presentation-app-more')).toHaveText('+1 autres');
    await expect(domain.locator('.presentation-app-chip.is-target')).toHaveCount(1);

    // Le test mesure le rendu effectif : une puce présente dans le DOM mais masquée
    // par overflow:hidden (défaut signalé) doit faire échouer la non-régression.
    const visibility = await domain.locator('.cap').evaluateAll(elements => elements.map(element => {
      const card = element.getBoundingClientRect();
      const preview = element.querySelector('.presentation-app-preview') as HTMLElement;
      const previewBox = preview.getBoundingClientRect();
      const fitsInside = (box: DOMRect) => box.width > 0 && box.height > 0
        && box.top >= card.top - 1 && box.bottom <= card.bottom + 1
        && box.left >= card.left - 1 && box.right <= card.right + 1;
      return {
        previewFits: fitsInside(previewBox),
        itemsFit: Array.from(preview.children).every(item => fitsInside(item.getBoundingClientRect())),
        noClippedBadges: preview.scrollHeight <= preview.clientHeight + 1
          && preview.scrollWidth <= preview.clientWidth + 1,
      };
    }));
    expect(visibility).toEqual(capabilityNames.map(() => ({
      previewFits: true, itemsFit: true, noClippedBadges: true,
    })));

    await domain.locator('.cap').first().click();
    const detail = page.getByRole('dialog', { name: `Détail de ${capabilityNames[0]}` });
    await expect(detail).toBeVisible();
    await expect(detail).toContainText('Historique de santé');
    await detail.getByTestId('presentation-focus-close').click();

    // Couverture et Carte conservent le même aperçu des applications.
    await page.getByTestId('presentation-reading-coverage').click();
    await expect(domain.locator('.presentation-app-chip')).toHaveCount(capabilityNames.length + 1);
  }
});


test('rend lisibles quatre N1 dans une cartographie paysage de sept lignes et permet de les agrandir', async ({ page }) => {
  const columnsCount = 3;
  const rowsCount = 7;
  const names = [
    'Gestion du carnet de Santé',
    'Applications de santé',
    'Gestion des retours Usager',
    'Gestion des anomalies',
  ];
  await page.setViewportSize({ width: 1728, height: 900 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();
  await page.evaluate(({ columnsCount, rowsCount, names }) => {
    const key = 'enterprise-capacity-mapper:model:v3';
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('La cartographie de test doit être persistée');
    const model = JSON.parse(raw);
    const columns = Array.from({ length: columnsCount }, (_, index) => ({
      id: `dense-column-${index}`, name: `Colonne ${index + 1}`, order: index,
    }));
    const layers = Array.from({ length: rowsCount }, (_, index) => ({
      id: `dense-layer-${index}`, name: `Ligne ${index + 1}`, order: index,
    }));
    model.layout = { ...model.layout, columns, layers };
    model.domains = Array.from({ length: columnsCount * rowsCount }, (_, index) => ({
      id: `dense-domain-${index}`,
      code: `N0-${index}`,
      name: index === 0 ? 'Relation propriétaire données de santé' : `Domaine d'entreprise ${index}`,
      color: 'indigo',
      layout: {
        columnId: columns[index % columnsCount].id,
        layerId: layers[Math.floor(index / columnsCount)].id,
      },
    }));
    model.capabilities = names.map((name, index) => ({
      id: `dense-cap-${index}`, domainId: 'dense-domain-0', code: `N1-${index}`, name,
    }));
    model.applications = [
      { id: 'dense-app-a', name: 'Dossier Médical Partagé', status: 'Actif', capabilityIds: ['dense-cap-0'] },
      { id: 'dense-app-b', name: 'Mon espace santé', status: 'Actif', capabilityIds: ['dense-cap-0'] },
      { id: 'dense-app-c', name: 'Portail Usager', status: 'Cible', capabilityIds: ['dense-cap-0'] },
      { id: 'dense-app-d', name: 'Gestion des applications de santé', status: 'Actif', capabilityIds: ['dense-cap-0'] },
      { id: 'dense-app-e', name: 'Application cible', status: 'Cible', capabilityIds: ['dense-cap-1'] },
      { id: 'dense-app-f', name: 'Service applicatif', status: 'Actif', capabilityIds: ['dense-cap-3'] },
    ];
    localStorage.setItem(key, JSON.stringify(model));
  }, { columnsCount, rowsCount, names });
  await page.goto('/?view=presentation');

  const mosaic = page.getByTestId('capability-map');
  await expect(mosaic.locator('.mosaic-domain')).toHaveCount(columnsCount * rowsCount);
  const firstDomain = mosaic.locator('.mosaic-domain').filter({ hasText: 'Relation propriétaire données de santé' });
  const caps = firstDomain.locator('.cap');
  await expect(caps).toHaveCount(names.length);
  const dimensions = await firstDomain.evaluate(element => {
    const inside = (outer: DOMRect, inner: DOMRect) =>
      inner.top >= outer.top - 1 && inner.bottom <= outer.bottom + 1 &&
      inner.left >= outer.left - 1 && inner.right <= outer.right + 1;
    const domainBox = element.getBoundingClientRect();
    const heading = element.querySelector('.domain-banner') as HTMLElement;
    const list = element.querySelector('.caps-list') as HTMLElement;
    const cards = Array.from(element.querySelectorAll('.cap')) as HTMLElement[];
    return {
      headingFits: inside(domainBox, heading.getBoundingClientRect()),
      listFits: inside(domainBox, list.getBoundingClientRect()),
      labelsFit: cards.every(card => {
        const label = card.querySelector('.map-cap-select') as HTMLElement;
        return inside(card.getBoundingClientRect(), label.getBoundingClientRect())
          && label.scrollHeight <= label.clientHeight + 1;
      }),
      titlesFit: heading.scrollHeight <= heading.clientHeight + 1,
    };
  });
  expect(dimensions).toEqual({
    headingFits: true, listFits: true, labelsFit: true, titlesFit: true,
  });

  // Avec des applications, quatre N1 sur une rangée courte passent au résumé :
  // ni bandeau coupé, ni titre caché par les badges.
  await page.getByTestId('presentation-show-applications').check();
  const firstCap = caps.first();
  const compact = firstCap.getByTestId('presentation-app-compact');
  await expect(compact).toBeVisible();
  await expect(compact).toContainText('Dossier Médical Partagé');
  await expect(compact).toContainText('+3');
  await expect(firstCap.locator('.presentation-app-preview')).toBeHidden();
  await expect(caps.nth(1).getByTestId('presentation-app-compact')).toContainText('Application cible');
  await expect(caps.nth(1).getByTestId('presentation-app-compact')).toContainText('cible');
  await expect(caps.nth(2).getByTestId('presentation-app-compact')).toContainText('Aucune application reliée');

  const compactFit = await caps.evaluateAll(elements => elements.every(element => {
    const card = element.getBoundingClientRect();
    const title = (element.querySelector('.map-cap-select') as HTMLElement).getBoundingClientRect();
    const summary = (element.querySelector('.presentation-app-compact') as HTMLElement).getBoundingClientRect();
    const within = (box: DOMRect) => box.top >= card.top - 1 && box.bottom <= card.bottom + 1
      && box.left >= card.left - 1 && box.right <= card.right + 1;
    return within(title) && within(summary) && title.bottom <= summary.top + 1;
  }));
  expect(compactFit).toBe(true);

  await page.getByTestId('presentation-reading-coverage').click();
  await expect(compact).toBeVisible();
  await page.getByTestId('presentation-show-applications').uncheck();
  await expect(firstCap.getByTestId('presentation-app-compact')).toHaveCount(0);
  await page.getByTestId('presentation-show-applications').check();

  await firstCap.click();
  const applicationsDetail = page.getByRole('dialog', { name: `Détail de ${names[0]}` });
  await expect(applicationsDetail).toContainText('Gestion des applications de santé');
  await expect(applicationsDetail).toContainText('Portail Usager');
  await applicationsDetail.getByTestId('presentation-focus-close').click();

  // Un clic humain a un délai entre pointerdown et pointerup. Le gestionnaire
  // global ne doit PAS remonter App et perdre l'élément avant click.
  const openDomain = firstDomain.getByTestId('presentation-domain-open');
  await expect(openDomain).toHaveText('Voir N1');
  const buttonBox = await openDomain.boundingBox();
  expect(buttonBox).not.toBeNull();
  await page.mouse.move(buttonBox!.x + buttonBox!.width / 2, buttonBox!.y + buttonBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(120);
  await page.mouse.up();
  const detail = page.getByRole('dialog', { name: 'Capacités de Relation propriétaire données de santé' });
  await expect(detail).toBeVisible();
  for (const name of names) await expect(detail.getByRole('button', { name: new RegExp(name, 'i') })).toBeVisible();
  await detail.getByRole('button', { name: /Gestion des anomalies/ }).click();
  await expect(page.getByRole('dialog', { name: 'Détail de Gestion des anomalies' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Détail de Gestion des anomalies' })).not.toBeVisible();
  await expect(mosaic.locator('.mosaic-domain')).toHaveCount(columnsCount * rowsCount);
});

test('masque les commandes pendant la lecture et ne les rappelle que près du bord inférieur', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/?view=presentation');
  const bar = page.locator('.presentation-exit-bar');
  await expect(bar).toHaveAttribute('data-visible', 'true');
  await expect(bar).toHaveAttribute('data-visible', 'false', { timeout: 6000 });

  // La souris peut explorer la cartographie sans réveiller la barre flottante.
  await page.mouse.move(350, 220);
  await page.mouse.move(600, 550);
  await expect(bar).toHaveAttribute('data-visible', 'false');

  // Le contrôle reste accessible depuis le bas de l'écran.
  await page.mouse.move(700, 895);
  await expect(bar).toHaveAttribute('data-visible', 'true');
  await expect(page.getByTestId('presentation-reading-coverage')).toBeVisible();
});


test('affiche toujours une indication applicative dans les quatre N1 d’une mosaïque très dense', async ({ page }) => {
  const columnsCount = 3;
  const rowsCount = 9;
  await page.setViewportSize({ width: 1728, height: 900 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();
  await page.evaluate(({ columnsCount, rowsCount }) => {
    const key = 'enterprise-capacity-mapper:model:v3';
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('Cartographie de test non enregistrée');
    const model = JSON.parse(raw);
    const columns = Array.from({ length: columnsCount }, (_, index) => ({
      id: `compact-column-${index}`, name: `Colonne ${index + 1}`, order: index,
    }));
    const layers = Array.from({ length: rowsCount }, (_, index) => ({
      id: `compact-row-${index}`, name: `Ligne ${index + 1}`, order: index,
    }));
    model.layout = { ...model.layout, columns, layers };
    model.domains = Array.from({ length: columnsCount * rowsCount }, (_, index) => ({
      id: `compact-domain-${index}`, name: index === 0 ? 'Domaine de santé à forte densité' : `Domaine ${index}`,
      code: `N0-${index}`, color: 'indigo',
      layout: { columnId: columns[index % columnsCount].id, layerId: layers[Math.floor(index / columnsCount)].id },
    }));
    model.capabilities = Array.from({ length: 4 }, (_, index) => ({
      id: `compact-cap-${index}`, code: `N1-${index}`,
      name: ['Gestion du carnet de Santé', 'Applications de santé', 'Gestion des anomalies', 'Gestion des notifications'][index],
      domainId: 'compact-domain-0',
    }));
    model.applications = [
      { id: 'compact-app-1', name: 'Mon espace santé', status: 'Actif', capabilityIds: ['compact-cap-0'] },
      { id: 'compact-app-2', name: 'Dossier médical partagé', status: 'Actif', capabilityIds: ['compact-cap-0'] },
      { id: 'compact-app-3', name: 'Application cible', status: 'Cible', capabilityIds: ['compact-cap-0'] },
      { id: 'compact-app-4', name: 'Système d’alertes', status: 'Cible', capabilityIds: ['compact-cap-1'] },
    ];
    localStorage.setItem(key, JSON.stringify(model));
  }, { columnsCount, rowsCount });
  await page.goto('/?view=presentation&theme=dark');
  await page.getByTestId('presentation-show-applications').check();

  const domain = page.getByTestId('capability-map').locator('.mosaic-domain')
    .filter({ hasText: 'Domaine de santé à forte densité' });
  const caps = domain.locator('.cap');
  await expect(caps).toHaveCount(4);
  await expect(caps.first().getByTestId('presentation-app-inline-count')).toHaveText('3 apps');
  await expect(caps.nth(1).getByTestId('presentation-app-inline-count')).toHaveText('1 app');
  await expect(caps.nth(2).getByTestId('presentation-app-inline-count')).toHaveText('0 app');
  await expect(caps.first().getByTestId('presentation-app-compact')).toBeHidden();
  const isReadable = await caps.evaluateAll(elements => elements.every(element => {
    const card = element.getBoundingClientRect();
    const title = (element.querySelector('.map-cap-select') as HTMLElement).getBoundingClientRect();
    const badge = (element.querySelector('.presentation-app-inline-count') as HTMLElement).getBoundingClientRect();
    const fits = (box: DOMRect) => box.width > 0 && box.height > 0
      && box.left >= card.left - 1 && box.right <= card.right + 1
      && box.top >= card.top - 1 && box.bottom <= card.bottom + 1;
    return fits(title) && fits(badge) && title.right <= badge.left + 1;
  }));
  expect(isReadable).toBe(true);

  await caps.first().click();
  const detail = page.getByRole('dialog', { name: 'Détail de Gestion du carnet de Santé' });
  await expect(detail).toContainText('Mon espace santé');
  await expect(detail).toContainText('Dossier médical partagé');
  await expect(detail).toContainText('Application cible');
  await detail.getByTestId('presentation-focus-close').click();

  // La fenêtre N0 s'ouvre aussi depuis le clavier, même avec la barre masquée.
  await domain.getByTestId('presentation-domain-open').focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Capacités de Domaine de santé à forte densité' })).toBeVisible();
});
