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
    await page.goto('/?view=presentation');
    const mosaic = page.getByTestId('mosaic-map');
    await expect(mosaic.locator('.mosaic-zone')).toHaveCount(0);
    await expect(mosaic.locator('.mosaic-column-heading, .mosaic-row-heading, .mosaic-corner')).toHaveCount(0);
    const firstDomain = mosaic.locator('.mosaic-domain').first();
    await expect(firstDomain.locator('.domain')).toHaveCSS('background-color', /rgb/);
    await expect(firstDomain).toHaveCSS('border-style', 'solid');
    const columnGap = await mosaic.evaluate(element => Number.parseFloat(getComputedStyle(element).columnGap));
    expect(columnGap).toBeGreaterThanOrEqual(8);
    expect(columnGap).toBeLessThanOrEqual(14);
    await expect(firstDomain.locator('.domain')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(firstDomain.locator('.mosaic-resize-controls')).toHaveCount(0);
  });


  test('fait tenir toute la mosaïque sur une seule page en mode présentation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();
    await page.goto('/?view=presentation');

    const presentation = page.locator('.app.mosaic-presentation-mode');
    const mosaic = page.getByTestId('mosaic-map');
    await expect(presentation).toBeVisible();
    await expect(page.locator('.app > header')).toBeHidden();
    await expect(page.locator('.companion-root')).toBeHidden();
    await expect(page.locator('.map-controls-row')).toBeHidden();

    const compactTracks = await mosaic.evaluate(element => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
      rows: getComputedStyle(element).gridTemplateRows.split(' ').length,
    }));
    expect(compactTracks).toEqual({ columns: 3, rows: 2 });
    const dimensions = await page.evaluate(() => ({
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: document.documentElement.clientHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.viewportWidth);
    expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.viewportHeight);

    const mapBounds = await mosaic.boundingBox();
    expect(mapBounds).not.toBeNull();
    expect(mapBounds!.x).toBeLessThanOrEqual(1);
    expect(mapBounds!.y).toBeLessThanOrEqual(1);
    expect(mapBounds!.width).toBeGreaterThanOrEqual(dimensions.viewportWidth - 2);
    expect(mapBounds!.height).toBeGreaterThanOrEqual(dimensions.viewportHeight - 2);

    const overflowingTitles = await mosaic.locator('.domain-banner h3').evaluateAll(elements =>
      elements.filter(element => element.scrollWidth > element.clientWidth + 1).map(element => element.textContent)
    );
    expect(overflowingTitles).toEqual([]);

    await page.keyboard.press('Escape');
    await expect(page.locator('.app.mosaic-presentation-mode')).toHaveCount(0);
    await expect(page.locator('.app > header')).toBeVisible();
  });

  test('adapte la présentation au viewport avec 12 domaines et sans débordement', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const firstDomain = page.getByTestId('mosaic-map').locator('.mosaic-domain')
      .filter({ hasText: 'Relation & Engagement Client' });
    for (let index = 0; index < 2; index += 1) {
      await firstDomain.getByTestId('add-capability-to-domain').click();
      const capabilityDialog = page.getByRole('dialog', { name: 'Nouvelle capacité N1' });
      await capabilityDialog.getByLabel('Nom').fill(`Capacité complémentaire ${index + 1}`);
      await capabilityDialog.getByRole('textbox', { name: 'Code', exact: true }).fill(`CRM-EXTRA-${index + 1}`);
      await capabilityDialog.getByRole('button', { name: 'Créer' }).click();
      await expect(capabilityDialog).toHaveCount(0);
    }

    const domainNames = [
      'Ordonnancement Contrôle Paiement',
      'Gouvernance des référentiels',
      'Pilotage de la performance opérationnelle',
      'Gestion des habilitations',
      'Conformité réglementaire',
      'Gestion des risques',
      'Architecture et urbanisation SI',
      'Qualité des données',
    ];
    for (let index = 0; index < domainNames.length; index += 1) {
      await page.getByTestId('mosaic-add-domain').click();
      const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
      await dialog.getByLabel('Nom').fill(domainNames[index]);
      await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill(`DOM-EMPTY-${index + 1}`);
      await dialog.getByRole('button', { name: 'Créer' }).click();
      await expect(dialog).toHaveCount(0);
    }

    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1600, height: 900 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/?view=presentation');
      const mosaic = page.getByTestId('mosaic-map');
      await expect(mosaic.locator('.mosaic-domain')).toHaveCount(12);

      const dimensions = await page.evaluate(() => ({
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
        scrollWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        scrollHeight: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight),
      }));
      expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.width);
      expect(dimensions.scrollHeight).toBeLessThanOrEqual(dimensions.height);

      const geometry = await mosaic.evaluate(element => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
      expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight + 1);

      const titleLayout = await mosaic.locator('.domain-banner h3').evaluateAll(elements => {
        const overflowing: string[] = [];
        const splitWords: string[] = [];
        for (const element of elements) {
          const title = element as HTMLElement;
          if (title.scrollWidth > title.clientWidth + 1) overflowing.push(title.innerText);
          if (getComputedStyle(title).overflowWrap === 'anywhere') overflowing.push(`overflow-wrap:anywhere: ${title.innerText}`);
          const walker = document.createTreeWalker(title, NodeFilter.SHOW_TEXT);
          let node: Node | null;
          while ((node = walker.nextNode())) {
            const text = node.textContent || '';
            const words = /\S+/g;
            let match: RegExpExecArray | null;
            while ((match = words.exec(text))) {
              const range = document.createRange();
              range.setStart(node, match.index);
              range.setEnd(node, match.index + match[0].length);
              if (range.getClientRects().length > 1) splitWords.push(`${title.innerText}: ${match[0]}`);
            }
          }
        }
        return { overflowing, splitWords };
      });
      expect(titleLayout.overflowing).toEqual([]);
      expect(titleLayout.splitWords).toEqual([]);

      const emptyCards = mosaic.locator('.mosaic-domain:has(.domain.mosaic-presentation-empty)');
      await expect(emptyCards).toHaveCount(8);
      const bannerRatios = await emptyCards.evaluateAll(elements => elements.map(element => {
        const card = element.querySelector('.domain')!.getBoundingClientRect();
        const banner = element.querySelector('.domain-banner')!.getBoundingClientRect();
        return banner.height / card.height;
      }));
      expect(bannerRatios.every(ratio => ratio >= 0.95)).toBe(true);
      const domainMeta = await mosaic.locator('.domain-meta').allTextContents();
      expect(domainMeta.every(value => !value.includes('0 N1'))).toBe(true);

      const capabilityLists = await mosaic.locator('.caps-list').evaluateAll(elements => elements.map(element => ({
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      })));
      expect(capabilityLists.every(list => list.scrollHeight <= list.clientHeight + 1 && list.scrollWidth <= list.clientWidth + 1)).toBe(true);

      const exitBar = page.locator('.presentation-exit-bar');
      const exitSwitch = page.getByTestId('presentation-switch-exit');
      await expect(exitSwitch).toBeChecked();
      const barBounds = await exitBar.boundingBox();
      expect(barBounds).not.toBeNull();
      expect(barBounds!.x).toBeGreaterThanOrEqual(0);
      expect(barBounds!.y).toBeGreaterThanOrEqual(0);
      expect(barBounds!.x + barBounds!.width).toBeLessThanOrEqual(viewport.width);
      expect(barBounds!.y + barBounds!.height).toBeLessThanOrEqual(viewport.height);

      await page.waitForTimeout(3200);
      await expect(exitBar).toHaveCSS('opacity', '0');
      await page.mouse.move(100, 100);
      await expect(exitBar).toHaveCSS('opacity', '1');
    }
  });

  test('garantit un contraste lisible des bandeaux de domaine en thème sombre', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('tools-menu-toggle').click();
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('.app.theme-dark')).toBeVisible();
    await page.keyboard.press('Escape');
    await page.getByTestId('mosaic-view').click();
    await page.goto('/?view=presentation');
    await expect(page.locator('.mosaic-domain .domain-banner').first()).toBeVisible();

    const contrastRatios = await page.locator('.mosaic-domain .domain-banner').evaluateAll(elements => {
      const luminance = (color: string) => {
        const channels = color.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(value => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
      };
      return elements.map(element => {
        const heading = element.querySelector('h3')!;
        const background = luminance(getComputedStyle(element).backgroundColor);
        const foreground = luminance(getComputedStyle(heading).color);
        return (Math.max(background, foreground) + 0.05) / (Math.min(background, foreground) + 0.05);
      });
    });
    expect(contrastRatios.length).toBeGreaterThan(0);
    expect(contrastRatios.every(ratio => ratio >= 4.5)).toBe(true);
  });

  test('ouvre le mode présentation dans un nouvel onglet depuis le switch', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const presentationSwitch = page.getByTestId('presentation-switch-toolbar');
    await expect(presentationSwitch).toBeVisible();
    await expect(presentationSwitch).not.toBeChecked();
    const presentationPagePromise = context.waitForEvent('page');
    await presentationSwitch.click();
    const presentationPage = await presentationPagePromise;
    await presentationPage.waitForLoadState();
    await expect(presentationPage).toHaveURL(/view=presentation/);
    await expect(presentationSwitch).not.toBeChecked();
    await expect(presentationPage.locator('.app.mosaic-presentation-mode')).toBeVisible();
    await expect(presentationPage.getByTestId('mosaic-map')).toBeVisible();

    const presentationExitSwitch = presentationPage.getByTestId('presentation-switch-exit');
    await expect(presentationExitSwitch).toBeChecked();
    const closed = presentationPage.waitForEvent('close').then(() => 'closed');
    const returnedToEditor = presentationPage.waitForURL(/\/$|index\.html(?:\?.*)?$/).then(() => 'returned');
    await presentationExitSwitch.evaluate((input: HTMLInputElement) => input.click());
    await Promise.any([closed, returnedToEditor]);
    if (!presentationPage.isClosed()) await presentationPage.close();
  });

  test('ferme la page de présentation avec Échap', async ({ page, context }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();
    const presentationPagePromise = context.waitForEvent('page');
    await page.getByTestId('presentation-switch-toolbar').click();
    const presentationPage = await presentationPagePromise;
    await presentationPage.waitForLoadState();
    await expect(presentationPage.locator('.app.mosaic-presentation-mode')).toBeVisible();
    const closed = presentationPage.waitForEvent('close');
    await presentationPage.keyboard.press('Escape').catch(() => undefined);
    await closed;
  });

  test('ouvre également une nouvelle page sur mobile', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const presentationPagePromise = context.waitForEvent('page');
    await page.getByTestId('presentation-switch-toolbar').click();
    const presentationPage = await presentationPagePromise;
    await presentationPage.waitForLoadState();
    await expect(presentationPage).toHaveURL(/view=presentation/);
    await expect(presentationPage.locator('.app.mosaic-presentation-mode')).toBeVisible();
    await presentationPage.close();
  });

  test('met en valeur le titre d’un domaine sans N1 dans un panneau dédié', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cell-add').first().click();
    const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
    await dialog.getByLabel('Nom').fill('Domaine sans capacité');
    await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('DOM-EMPTY');
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await page.getByTestId('mosaic-view').click();
    await page.goto('/?view=presentation');
    const emptyDomain = page.getByTestId('mosaic-map').locator('.mosaic-presentation-empty').filter({ hasText: 'Domaine sans capacité' });
    await expect(emptyDomain).toBeVisible();
    await expect(emptyDomain.locator('.domain-banner')).toHaveCSS('justify-content', 'center');
    await expect(emptyDomain.locator('.domain-banner h3')).toBeVisible();
    const titleSize = await emptyDomain.locator('.domain-banner h3').evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
    const capabilitySize = await page.locator('.mosaic-domain .map-cap-select').first().evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(titleSize).toBeGreaterThan(16);
    expect(titleSize).toBeGreaterThan(capabilitySize);
  });
  test('permet de revenir au rendu matrice', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();
    await page.getByTestId('matrix-view').click();
    await expect(page.locator('.map-matrix')).toBeVisible();
    await expect(page.getByTestId('mosaic-map')).toHaveCount(0);
  });

  test('redimensionne une carte par glisser-déposer et conserve ses dimensions après rechargement', async ({ page }) => {
    // La poignée basse est testée dans la fenêtre visible : le déplacement
    // doit rester dans le viewport pour que les événements pointer soient reçus.
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const firstDomain = page.locator('.mosaic-domain').first();
    await expect(firstDomain).toBeVisible();
    // Les bords de la carte sont les zones de redimensionnement.
    await firstDomain.scrollIntoViewIfNeeded();
    await expect(firstDomain).toBeInViewport();
    const placement = await firstDomain.evaluate(element => {
      const style = getComputedStyle(element);
      return { column: style.gridColumnStart, row: style.gridRowStart };
    });
    const zones = page.getByTestId('mosaic-map').locator('.mosaic-zone');
    const matchingZoneIndex = await zones.evaluateAll((elements, target) => elements.findIndex(element => {
      const style = getComputedStyle(element);
      return style.gridColumnStart === target.column && style.gridRowStart === target.row;
    }), placement);
    expect(matchingZoneIndex).toBeGreaterThanOrEqual(0);
    const zone = zones.nth(matchingZoneIndex);
    const cellBounds = await zone.boundingBox();
    const domainBounds = await firstDomain.boundingBox();
    expect(cellBounds).not.toBeNull();
    expect(domainBounds).not.toBeNull();
    const rightEdgeX = domainBounds!.x + domainBounds!.width - 3;
    const middleY = domainBounds!.y + domainBounds!.height / 2;
    await page.mouse.move(rightEdgeX, middleY);
    await page.mouse.down();
    await page.mouse.move(rightEdgeX + cellBounds!.width * 1.1, middleY);
    // La grille doit déjà refléter la nouvelle taille avant le relâchement.
    await expect(firstDomain).toHaveCSS('grid-column', /span 2/);
    const livePreviewBounds = await firstDomain.boundingBox();
    expect(livePreviewBounds).not.toBeNull();
    expect(livePreviewBounds!.width).toBeGreaterThan(domainBounds!.width);
    await page.mouse.up();

    await expect(firstDomain).toHaveCSS('grid-column', /span 2/);
    await firstDomain.scrollIntoViewIfNeeded();
    const resizedDomainBounds = await firstDomain.boundingBox();
    const resizedCellBounds = await zone.boundingBox();
    expect(resizedDomainBounds).not.toBeNull();
    expect(resizedCellBounds).not.toBeNull();
    const bottomEdgeY = resizedDomainBounds!.y + resizedDomainBounds!.height - 3;
    const middleX = resizedDomainBounds!.x + resizedDomainBounds!.width / 2;
    await page.mouse.move(middleX, bottomEdgeY);
    await page.mouse.down();
    await page.mouse.move(middleX, bottomEdgeY + resizedCellBounds!.height * 0.6);
    await page.mouse.up();
    await expect(firstDomain).toHaveCSS('grid-row', /span 2/);

    // Capture the identity before switching views: the Mosaic card is unmounted
    // when Matrix becomes active.
    const firstDomainName = await firstDomain.locator('.domain-banner h3').innerText();

    // Matrix must preserve the vertical span persisted by Mosaic.
    await page.getByTestId('matrix-view').click();
    const matrixDomain = page.locator('.matrix-domain').filter({
      has: page.locator('.domain').filter({ hasText: firstDomainName }),
    }).first();
    await expect(matrixDomain).toBeVisible();
    await expect(matrixDomain).toHaveCSS('grid-row', /span 2/);
    const matrixBounds = await matrixDomain.boundingBox();
    expect(matrixBounds).not.toBeNull();
    expect(matrixBounds!.height).toBeGreaterThan(160);

    // Returning to Mosaic must not reset the saved span.
    await page.getByTestId('mosaic-view').click();
    await expect(page.locator('.mosaic-domain').first()).toHaveCSS('grid-row', /span 2/);

    const mosaicBounds = await page.getByTestId('mosaic-map').boundingBox();
    const expandedBounds = await firstDomain.boundingBox();
    expect(mosaicBounds).not.toBeNull();
    expect(expandedBounds).not.toBeNull();
    expect(expandedBounds!.width).toBeGreaterThan(mosaicBounds!.width * 0.35);

    await page.reload();
    await page.getByTestId('mosaic-view').click();
    const persistedDomain = page.locator('.mosaic-domain').first();
    await expect(persistedDomain).toHaveCSS('grid-column', /span 2/);
    await expect(persistedDomain).toHaveCSS('grid-row', /span 2/);
    await persistedDomain.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(persistedDomain).toHaveCSS('grid-column', /span 1/);
    await page.keyboard.press('ArrowUp');
    await expect(persistedDomain).toHaveCSS('grid-row', /span 1/);
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

  test('permet de faire défiler verticalement les deux vues de cartographie', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto('/');

    for (const view of ['matrix', 'mosaic'] as const) {
      await page.getByTestId(view === 'matrix' ? 'matrix-view' : 'mosaic-view').click();
      const main = page.locator('.workspace > main');
      const dimensions = await main.evaluate(element => ({
        clientHeight: element.clientHeight,
        scrollHeight: element.scrollHeight,
      }));
      expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
      await main.evaluate(element => { element.scrollTop = element.scrollHeight; });
      await expect.poll(() => main.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
    }
  });

  test('permet de créer un domaine N0 depuis la mosaïque dans la première zone libre', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('mosaic-view').click();

    const addDomain = page.getByTestId('mosaic-add-domain');
    await expect(addDomain).toBeEnabled();
    await addDomain.click();

    const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
    await dialog.getByLabel('Nom').fill('Pilotage des données');
    await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('DATA-GOV');
    await dialog.getByRole('button', { name: 'Créer' }).click();

    const createdDomain = page.getByTestId('mosaic-map').locator('.mosaic-domain').filter({ hasText: 'Pilotage des données' });
    await expect(createdDomain).toBeVisible();
    await expect(createdDomain.locator('.domain-meta')).toContainText('0 N1');

    await page.reload();
    await expect(page.getByTestId('mosaic-map')).toBeVisible();
    await expect(page.getByTestId('mosaic-map').locator('.mosaic-domain').filter({ hasText: 'Pilotage des données' })).toBeVisible();
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
