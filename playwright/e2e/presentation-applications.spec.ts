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
    // Chaque N1 choisit le maximum de badges réellement logeables ; pas de
    // quota fixe (historiquement 2), ni de compteurs cachés dans le DOM.
    const firstPreview = domain.locator('.cap').first().getByTestId('presentation-app-preview');
    await expect.poll(async () => Number(await firstPreview.getAttribute('data-visible-count'))).toBeGreaterThan(0);
    const firstVisible = Number(await firstPreview.getAttribute('data-visible-count'));
    expect(firstVisible).toBeLessThanOrEqual(3);
    if (firstVisible < 3) {
      await expect(firstPreview.locator('.presentation-app-more')).toHaveText(`+${3 - firstVisible} autres`);
    } else {
      await expect(firstPreview.locator('.presentation-app-more')).toHaveCount(0);
    }
    await expect(domain.locator('.cap').nth(1).locator('.presentation-app-chip.is-target')).toHaveCount(1);

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
    await expect(detail.getByRole('heading', { name: 'Applications associées' })).toBeVisible();
    await expect(detail.getByTestId('presentation-app-total')).toHaveText('3');
    await expect(detail.getByTestId('presentation-current-apps').locator('li')).toHaveCount(2);
    await expect(detail.getByTestId('presentation-target-apps').locator('li')).toHaveCount(1);
    await expect(detail.getByTestId('presentation-current-apps')).toContainText('Dossier Médical Partagé');
    await expect(detail.getByTestId('presentation-target-apps')).toContainText('Historique de santé');
    // Le bouton fermer est réellement aligné dans l'en-tête interne, sans hériter
    // des règles globales sticky/hauteur fixe de l'en-tête de l'application.
    const alignment = await detail.evaluate(dialog => {
      const header = dialog.querySelector('.presentation-detail-header') as HTMLElement;
      const close = dialog.querySelector('.presentation-detail-close') as HTMLElement;
      const heading = dialog.querySelector('.presentation-detail-app-heading') as HTMLElement;
      const headerBounds = header.getBoundingClientRect();
      const closeBounds = close.getBoundingClientRect();
      const rightInset = Number.parseFloat(getComputedStyle(header).paddingRight);
      const pixelTolerance = 2;
      return {
        closeOnRight: Math.abs(closeBounds.right - (headerBounds.right - rightInset)) <= pixelTolerance,
        closeInsideHeader: closeBounds.top >= headerBounds.top && closeBounds.bottom <= headerBounds.bottom,
        headerUsesLocalPosition: getComputedStyle(header).position === 'relative',
        applicationHeaderNotSticky: getComputedStyle(heading).position === 'static',
      };
    });
    expect(alignment).toEqual({
      closeOnRight: true, closeInsideHeader: true,
      headerUsesLocalPosition: true, applicationHeaderNotSticky: true,
    });
    await expect(detail.getByText('CAPACITÉ N1')).toBeVisible();
    await expect(detail.locator('.presentation-detail-assessment-list > div')).toHaveCount(3);
    await expect(detail.locator('.presentation-detail-landscape')).toBeVisible();
    await expect(detail.locator('.presentation-detail-assessment')).toBeVisible();
    const order = await detail.evaluate(node => {
      const applications = node.querySelector('.presentation-detail-landscape')?.getBoundingClientRect();
      const assessment = node.querySelector('.presentation-detail-assessment')?.getBoundingClientRect();
      return !!applications && !!assessment && applications.bottom <= assessment.top;
    });
    expect(order).toBe(true);
    await detail.getByTestId('presentation-focus-close').click();

    // Couverture et Carte conservent le même aperçu des applications.
    await page.getByTestId('presentation-reading-coverage').click();
    await expect.poll(async () => Number(await firstPreview.getAttribute('data-visible-count'))).toBeGreaterThan(0);
  }
});




test('agrandit le nom d’application jusqu’au palier confortable lorsque la N1 est spacieuse', async ({ page }) => {
  await page.setViewportSize({ width: 1728, height: 900 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();
  await page.evaluate(() => {
    const key = 'enterprise-capacity-mapper:model:v3';
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('Cartographie de test absente');
    const model = JSON.parse(raw);
    model.layout = {
      ...model.layout,
      columns: [{ id: 'spacious-col', name: 'Métier', order: 0 }],
      layers: [{ id: 'spacious-row', name: 'Parcours', order: 0 }],
    };
    model.domains = [{
      id: 'spacious-domain', name: 'Parcours patients', code: 'PAR', color: 'indigo',
      layout: { columnId: 'spacious-col', layerId: 'spacious-row' },
    }];
    model.capabilities = [{ id: 'spacious-cap', name: 'Gestion des dossiers', code: 'GDD', domainId: 'spacious-domain' }];
    model.applications = [{
      id: 'spacious-app', name: 'Mon espace santé', status: 'Actif', capabilityIds: ['spacious-cap'],
    }];
    localStorage.setItem(key, JSON.stringify(model));
  });
  await page.goto('/?view=presentation');
  await page.getByTestId('presentation-show-applications').check();

  const preview = page.getByTestId('presentation-app-preview');
  await expect(preview).toHaveAttribute('data-visible-count', '1');
  await expect.poll(() => preview.evaluate(element => {
    const typography = getComputedStyle(element);
    return typography.fontSize === typography.getPropertyValue('--map-presentation-app-font-large').trim();
  })).toBe(true);
  await expect(preview.locator('.presentation-app-chip')).toContainText('Mon espace santé');
  await expect(preview.locator('.presentation-app-more')).toHaveCount(0);
});


test('présente les applications sans cible sur toute la largeur et explique le signal métier', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();
  await page.evaluate(() => {
    const key = 'enterprise-capacity-mapper:model:v3';
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('La cartographie doit exister');
    const model = JSON.parse(raw);
    const capability = model.capabilities[0];
    capability.assessment = { functionalCoverage: 'sufficient', currentMaturity: 4, targetMaturity: 5 };
    model.applications = ['Portail Support Niveau 1', 'Service Snow', 'ICD'].map((name, index) => ({
      id: 'presentation-polish-' + index,
      name,
      status: 'Actif',
      capabilityIds: [capability.id],
    }));
    localStorage.setItem(key, JSON.stringify(model));
  });
  await page.goto('/?view=presentation');
  await page.locator('.mosaic-domain .cap').first().click();
  const detail = page.getByTestId('presentation-capability-detail');
  await expect(detail.getByTestId('presentation-app-total')).toHaveText('3');
  await expect(detail.getByTestId('presentation-current-apps').locator('li')).toHaveCount(3);
  await expect(detail.getByText('Aucune application cible rattachée.')).toBeVisible();
  await expect(detail.locator('.presentation-detail-assessment-list > div').last()).toContainText('1 point à examiner');
  await expect(detail.getByRole('list', { name: 'Points de vigilance' })).toContainText('Écart de maturité de 1 niveau');
  const desktop = await detail.evaluate(node => {
    const group = node.querySelector('.presentation-detail-application-groups') as HTMLElement;
    const current = node.querySelector('.presentation-detail-app-group[data-kind="current"]') as HTMLElement;
    const target = node.querySelector('.presentation-detail-app-group[data-kind="target"]') as HTMLElement;
    const applications = current.querySelector('ul') as HTMLElement;
    const groupBox = group.getBoundingClientRect();
    const currentBox = current.getBoundingClientRect();
    const targetBox = target.getBoundingClientRect();
    const tolerance = 2;
    return {
      currentUsesWidth: Math.abs(currentBox.width - groupBox.width) <= tolerance,
      targetIsBelow: targetBox.top >= currentBox.bottom,
      targetIsCompact: targetBox.height < currentBox.height,
      twoApplicationColumns: getComputedStyle(applications).gridTemplateColumns.split(' ').length === 2,
      noHorizontalOverflow: node.scrollWidth <= node.clientWidth + tolerance,
    };
  });
  expect(desktop).toEqual({
    currentUsesWidth: true,
    targetIsBelow: true,
    targetIsCompact: true,
    twoApplicationColumns: true,
    noHorizontalOverflow: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await detail.evaluate(node => {
    const current = node.querySelector('.presentation-detail-app-group[data-kind="current"]') as HTMLElement;
    const applications = current.querySelector('ul') as HTMLElement;
    const tolerance = 2;
    return {
      oneApplicationColumn: getComputedStyle(applications).gridTemplateColumns.split(' ').length === 1,
      noHorizontalOverflow: node.scrollWidth <= node.clientWidth + tolerance,
    };
  });
  expect(mobile).toEqual({ oneApplicationColumn: true, noHorizontalOverflow: true });
  await detail.getByTestId('presentation-focus-close').click();
  await expect(detail).toHaveCount(0);
});


test('affiche toutes les applications nombreuses dans la fiche N1, puis un vrai état vide', async ({ page }) => {
  const count = 18;
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();
  await page.evaluate(applicationCount => {
    const key = 'enterprise-capacity-mapper:model:v3';
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('Cartographie de test absente');
    const model = JSON.parse(raw);
    const capability = model.capabilities[0];
    model.applications = Array.from({ length: applicationCount }, (_, index) => ({
      id: 'application-many-' + index,
      name: 'Application métier numéro ' + (index + 1),
      status: 'Actif',
      capabilityIds: [capability.id],
    }));
    localStorage.setItem(key, JSON.stringify(model));
  }, count);
  await page.goto('/?view=presentation');
  await page.locator('.mosaic-domain .cap').first().click();
  const detail = page.getByTestId('presentation-capability-detail');
  await expect(detail).toBeVisible();
  await expect(detail.getByTestId('presentation-app-total')).toHaveText(String(count));
  const apps = detail.getByTestId('presentation-current-apps').locator('li');
  await expect(apps).toHaveCount(count);
  await expect(detail.getByText('Aucune application cible rattachée.')).toBeVisible();
  await apps.last().scrollIntoViewIfNeeded();
  await expect(apps.last()).toBeInViewport();
  const overflow = await detail.evaluate(node => ({
    scrollTop: node.scrollTop, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight,
  }));
  expect(overflow.scrollHeight).toBeGreaterThan(overflow.clientHeight);
  expect(overflow.scrollTop).toBeGreaterThan(0);
  await page.keyboard.press('Escape');
  await expect(detail).toHaveCount(0);

  await page.evaluate(() => {
    const key = 'enterprise-capacity-mapper:model:v3';
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('Cartographie de test absente');
    const model = JSON.parse(raw);
    model.applications = [];
    localStorage.setItem(key, JSON.stringify(model));
  });
  await page.reload();
  await page.locator('.mosaic-domain .cap').first().click();
  const empty = page.getByTestId('presentation-capability-detail');
  await expect(empty.getByTestId('presentation-app-total')).toHaveText('0');
  await expect(empty.getByText('Aucune application actuelle rattachée.')).toBeVisible();
  await expect(empty.getByText('Aucune application cible rattachée.')).toBeVisible();
  // Avec un viewport réduit, les deux cartes sont empilées, sans défilement horizontal.
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileLayout = await empty.evaluate(dialog => {
    const groups = dialog.querySelectorAll('.presentation-detail-app-group');
    const first = groups[0].getBoundingClientRect();
    const second = groups[1].getBoundingClientRect();
    const sheet = dialog.getBoundingClientRect();
    const pixelTolerance = 2;
    return {
      stacked: second.top >= first.bottom && Math.abs(second.left - first.left) <= pixelTolerance,
      insideSheet: first.left >= sheet.left && second.right <= sheet.right,
      noHorizontalOverflow: dialog.scrollWidth <= dialog.clientWidth + pixelTolerance,
      closeInHeader: (() => {
        const header = dialog.querySelector('.presentation-detail-header') as HTMLElement;
        const close = dialog.querySelector('.presentation-detail-close') as HTMLElement;
        const headerBounds = header.getBoundingClientRect();
        const closeBounds = close.getBoundingClientRect();
        const rightInset = Number.parseFloat(getComputedStyle(header).paddingRight);
        return getComputedStyle(header).flexDirection === 'row'
          && closeBounds.top >= headerBounds.top
          && Math.abs(closeBounds.right - (headerBounds.right - rightInset)) <= pixelTolerance;
      })(),
    };
  });
  expect(mobileLayout).toEqual({ stacked: true, insideSheet: true, noHorizontalOverflow: true, closeInHeader: true });

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

  // Le rendu dépend de la hauteur réelle : les noms restent visibles par
  // badges complets si possible, sinon par résumé compact ou compteur, sans chevauchement.
  await page.getByTestId('presentation-show-applications').check();
  const firstCap = caps.first();
  const compact = firstCap.getByTestId('presentation-app-compact');
  const preview = firstCap.getByTestId('presentation-app-preview');
  const visibleApplicationSelector = '.presentation-app-preview:visible, .presentation-app-compact:visible, .presentation-app-inline-count:visible';
  await expect(firstCap.locator(visibleApplicationSelector)).toHaveCount(1);
  if (await firstCap.getByTestId('presentation-app-inline-count').isVisible()) {
    await expect(firstCap.getByTestId('presentation-app-inline-count')).toHaveText('4 apps');
  } else if (await compact.isVisible()) {
    await expect(compact).toContainText('Dossier Médical Partagé');
    await expect(compact).toContainText('+3');
  } else {
    await expect(preview).toBeVisible();
    await expect.poll(() => preview.locator('.presentation-app-chip').count()).toBeGreaterThan(0);
  }

  const presentationFits = await caps.evaluateAll(elements => elements.every(element => {
    const card = element.getBoundingClientRect();
    const title = (element.querySelector('.map-cap-select') as HTMLElement).getBoundingClientRect();
    const summary = Array.from(element.querySelectorAll<HTMLElement>(
      '.presentation-app-compact, .presentation-app-preview, .presentation-app-inline-count',
    )).find(node => getComputedStyle(node).display !== 'none');
    if (!summary) return false;
    const bounds = summary.getBoundingClientRect();
    const within = (box: DOMRect) => box.top >= card.top - 1 && box.bottom <= card.bottom + 1
      && box.left >= card.left - 1 && box.right <= card.right + 1;
    const inline = summary.classList.contains('presentation-app-inline-count');
    return within(title) && within(bounds) && (inline
      ? title.right <= bounds.left + 1
      : title.bottom <= bounds.top + 1);
  }));
  expect(presentationFits).toBe(true);

  await page.getByTestId('presentation-reading-coverage').click();
  await expect(firstCap.locator(visibleApplicationSelector)).toHaveCount(1);
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


test('affiche toutes les applications quand la carte est large, et seulement les badges qui tiennent quand elle rétrécit', async ({ page }) => {
  const names = Array.from({ length: 26 }, (_, index) => `Application métier ${index + 1} de santé`);
  await page.setViewportSize({ width: 1728, height: 900 });
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();
  await page.evaluate(names => {
    const key = 'enterprise-capacity-mapper:model:v3';
    const raw = localStorage.getItem(key);
    if (!raw) throw new Error('Cartographie de test absente');
    const model = JSON.parse(raw);
    const columns = Array.from({ length: 3 }, (_, index) => ({ id: `wide-col-${index}`, name: `Colonne ${index}`, order: index }));
    const layers = Array.from({ length: 3 }, (_, index) => ({ id: `wide-row-${index}`, name: `Ligne ${index}`, order: index }));
    model.layout = { ...model.layout, columns, layers };
    model.domains = [{
      id: 'wide-domain', name: 'Pilotage des applications métier', code: 'PAM', color: 'emerald',
      layout: { columnId: columns[0].id, layerId: layers[0].id, columnSpan: 3 },
    }, ...Array.from({ length: 6 }, (_, index) => ({
      id: `other-domain-${index}`, name: `Domaine ${index}`, code: `N0-${index}`, color: 'indigo',
      layout: { columnId: columns[index % 3].id, layerId: layers[1 + Math.floor(index / 3)].id },
    }))];
    model.capabilities = [{ id: 'wide-cap', name: 'Pilotage KPI métier', code: 'PKM', domainId: 'wide-domain' }];
    model.applications = names.map((name, index) => ({
      id: `wide-app-${index}`, name, status: index % 3 === 0 ? 'Cible' : 'Actif', capabilityIds: ['wide-cap'],
    }));
    localStorage.setItem(key, JSON.stringify(model));
  }, names);
  await page.goto('/?view=presentation');
  await page.getByTestId('presentation-show-applications').check();

  const cap = page.getByTestId('capability-map').locator('.mosaic-domain')
    .filter({ hasText: 'Pilotage des applications métier' }).locator('.cap');
  const preview = cap.getByTestId('presentation-app-preview');
  await expect(preview).toHaveAttribute('data-visible-count', String(names.length));
  await expect(preview.locator('.presentation-app-chip')).toHaveCount(names.length);
  await expect(preview.locator('.presentation-app-more')).toHaveCount(0);
  const initialFontSize = await preview.evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));

  await page.setViewportSize({ width: 700, height: 600 });
  await expect.poll(async () => Number(await preview.getAttribute('data-visible-count'))).toBeLessThan(names.length);
  const count = Number(await preview.getAttribute('data-visible-count'));
  expect(count).toBeGreaterThan(0);
  await expect.poll(() => preview.evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize)))
    .toBeLessThanOrEqual(initialFontSize);
  await expect(preview.locator('.presentation-app-chip')).toHaveCount(count);
  await expect(preview.locator('.presentation-app-more')).toHaveText(`+${names.length - count} autres`);

  const isInside = await preview.evaluate(element => {
    const frame = element.getBoundingClientRect();
    const inside = (child: Element) => {
      const box = child.getBoundingClientRect();
      return box.left >= frame.left - 1 && box.right <= frame.right + 1 &&
        box.top >= frame.top - 1 && box.bottom <= frame.bottom + 1;
    };
    return Array.from(element.children).every(inside) &&
      element.scrollHeight <= element.clientHeight + 1 &&
      element.scrollWidth <= element.clientWidth + 1;
  });
  expect(isInside).toBe(true);

  await cap.click();
  const detail = page.getByRole('dialog', { name: 'Détail de Pilotage KPI métier' });
  for (const name of names) await expect(detail).toContainText(name);
});
