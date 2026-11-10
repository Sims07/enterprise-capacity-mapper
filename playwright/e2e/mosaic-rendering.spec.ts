import { expect, test } from '../fixtures';

test.describe('Cartographie unifiée', () => {
  test('affiche les domaines dans une cartographie bidimensionnelle unique', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('matrix-view')).toHaveCount(0);
    await expect(page.getByTestId('mosaic-view')).toHaveCount(0);
    
    const mosaic = page.getByTestId('capability-map');
    await expect(mosaic).toBeVisible();
    await expect(mosaic.locator('.mosaic-column-heading')).toHaveCount(4);
    await expect(mosaic.locator('.mosaic-row-heading')).toHaveCount(3);
    await expect(mosaic.locator('.mosaic-domain')).not.toHaveCount(0);

    await page.reload();
    await expect(page.getByTestId('capability-map')).toBeVisible();
  });

  test('repositionne visuellement le N0 après drag et répare un aperçu de grille abandonné', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/');

    const map = page.getByTestId('capability-map');
    const domain = map.locator('.mosaic-domain').filter({ hasText: 'Relation & Engagement Client' });
    const destination = map.locator('[data-zone-key="product:core"]');
    await expect(domain).toBeVisible();
    await domain.locator('.domain-banner').dragTo(destination);

    const assertOnDestination = async () => {
      await expect.poll(async () => domain.evaluate(wrapper => {
        const map = wrapper.closest('.map-mosaic')!;
        const cell = map.querySelector<HTMLElement>('[data-zone-key="product:core"]')!;
        const cardStyle = getComputedStyle(wrapper);
        const cellStyle = getComputedStyle(cell);
        const card = wrapper.getBoundingClientRect();
        const target = cell.getBoundingClientRect();
        const mapBounds = map.getBoundingClientRect();
        const geometryMatches = Math.abs(card.left - target.left) <= 2
          && Math.abs(card.top - target.top) <= 2
          && card.bottom <= mapBounds.bottom + 2;
        return cardStyle.gridColumnStart === cellStyle.gridColumnStart
          && cardStyle.gridRowStart === cellStyle.gridRowStart
          && geometryMatches;
      })).toBe(true);
    };

    // The card must follow its saved placement immediately, without reloading.
    await assertOnDestination();

    // A lost dragend/pointerup used to leave an inline CSS grid preview on the
    // node, while its properties still referenced the correct business layer.
    await domain.evaluate(wrapper => {
      const card = wrapper as HTMLElement;
      card.style.gridRow = 'auto';
      card.dataset.resizeStartX = String(card.getBoundingClientRect().x);
      const draggable = card.querySelector<HTMLElement>('.domain-card')!;
      draggable.dataset.resizeWasDraggable = 'true';
      draggable.setAttribute('draggable', 'false');
    });
    await page.locator('body').dispatchEvent('dragend');
    await assertOnDestination();
    await expect(domain.locator('.domain-card')).toHaveAttribute('draggable', 'true');
    await expect(domain).not.toHaveAttribute('data-resize-start-x');

    // A cancelled/no-op drop also restores the exact model placement.
    await domain.evaluate(wrapper => { (wrapper as HTMLElement).style.gridColumn = 'auto'; });
    await page.locator('body').dispatchEvent('drop');
    await assertOnDestination();
  });

  test('présente la cartographie sans repères de grille et avec les panneaux colorés', async ({ page }) => {
    await page.goto('/');
        await page.goto('/?view=presentation');
    const mosaic = page.getByTestId('capability-map');
    await expect(mosaic.locator('.mosaic-zone')).toHaveCount(0);
    await expect(mosaic.locator('.mosaic-column-heading, .mosaic-row-heading, .mosaic-corner')).toHaveCount(0);
    const firstDomain = mosaic.locator('.mosaic-domain').first();
    await expect(firstDomain.locator('.domain')).toHaveCSS('background-color', /rgb/);
    await expect(firstDomain).toHaveCSS('border-style', 'solid');
    const borders = await firstDomain.evaluate(element => {
      const domain = getComputedStyle(element);
      const capability = getComputedStyle(element.querySelector('.cap')!);
      return {
        domainWidth: Number.parseFloat(domain.borderTopWidth),
        capabilityWidth: Number.parseFloat(capability.borderTopWidth),
        domainColor: domain.borderTopColor,
        capabilityColor: capability.borderTopColor,
        surfaceColor: getComputedStyle(element.querySelector('.domain')!).backgroundColor,
      };
    });
    expect(borders.domainWidth).toBeGreaterThanOrEqual(2);
    expect(borders.capabilityWidth).toBeGreaterThanOrEqual(1.5);
    expect(borders.domainColor).not.toBe(borders.surfaceColor);
    expect(borders.capabilityColor).not.toBe(borders.surfaceColor);
    const columnGap = await mosaic.evaluate(element => Number.parseFloat(getComputedStyle(element).columnGap));
    expect(columnGap).toBeGreaterThanOrEqual(8);
    expect(columnGap).toBeLessThanOrEqual(14);
    await expect(firstDomain.locator('.domain')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(firstDomain.locator('.mosaic-resize-controls')).toHaveCount(0);
  });


  test('fait tenir toute la mosaïque sur une seule page en mode présentation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
        await page.goto('/?view=presentation');

    const presentation = page.locator('.app.mosaic-presentation-mode');
    const mosaic = page.getByTestId('capability-map');
    await expect(presentation).toBeVisible();
    await expect(page.locator('.app > header')).toBeHidden();
    await expect(page.locator('.companion-root')).toBeHidden();
    await expect(page.locator('.map-controls-row')).toBeHidden();

    const compactTracks = await mosaic.evaluate(element => ({
      columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
      rows: getComputedStyle(element).gridTemplateRows.split(' ').length,
    }));
    // Two business rows remain, but the shared Support location needs two visual tiers.
    expect(compactTracks).toEqual({ columns: 3, rows: 3 });
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
    
    const firstDomain = page.getByTestId('capability-map').locator('.mosaic-domain')
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
      await page.getByTestId('map-add-domain').click();
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
      const mosaic = page.getByTestId('capability-map');
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
      await expect(exitBar).toHaveCSS('opacity', '0');
      await page.mouse.move(viewport.width / 2, viewport.height - 2);
      await expect(exitBar).toHaveCSS('opacity', '1');
    }
  });

  test('garantit un contraste lisible des bandeaux de domaine en thème sombre', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('tools-menu-toggle').click();
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('.app.theme-dark')).toBeVisible();
    await page.keyboard.press('Escape');
        await page.goto('/?view=presentation');
    await expect(page.locator('.mosaic-domain .domain-banner').first()).toBeVisible();
    const darkCanvas = page.locator('.app.theme-dark.mosaic-presentation-mode');
    const signalPresentationCanvas = await darkCanvas.evaluate(element => {
      const probe = document.createElement('span');
      probe.style.background = 'var(--map-canvas-bg)';
      element.append(probe);
      const color = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return color;
    });
    await expect(darkCanvas).toHaveCSS('background-color', signalPresentationCanvas);
    await expect(darkCanvas.locator('.workspace.mosaic-workspace')).toHaveCSS('background-color', signalPresentationCanvas);
    await expect(darkCanvas.locator('main')).toHaveCSS('background-color', signalPresentationCanvas);
    await expect(darkCanvas.locator('.map-mosaic')).toHaveCSS('background-color', signalPresentationCanvas);
    await expect(darkCanvas.locator('.map-mosaic')).toHaveCSS('background-image', 'none');

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
    const presentationMap = presentationPage.getByTestId('capability-map');
    await expect(presentationMap).toBeVisible();
    await expect(presentationMap.locator('.mosaic-domain')).not.toHaveCount(0);
    await expect(presentationMap.locator('.domain-banner h3').first()).toBeVisible();

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
        const presentationPagePromise = context.waitForEvent('page');
    await page.getByTestId('presentation-switch-toolbar').click();
    const presentationPage = await presentationPagePromise;
    await presentationPage.waitForLoadState();
    await expect(presentationPage.locator('.app.mosaic-presentation-mode')).toBeVisible();
    await expect(presentationPage.getByTestId('capability-map').locator('.mosaic-domain')).not.toHaveCount(0);
    const closed = presentationPage.waitForEvent('close');
    await presentationPage.keyboard.press('Escape').catch(() => undefined);
    await closed;
  });

  test('conserve les domaines en présentation si les pistes de leur structure ont été renommées', async ({ page, context }) => {
    await page.goto('/');
    await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();
    await page.evaluate(() => {
      const key = 'enterprise-capacity-mapper:model:v3';
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('Le modèle actif doit être persisté avant le test');
      const model = JSON.parse(raw);
      model.layout.columns = [{ id: 'new-column-id', name: 'Nouvelle colonne', order: 0 }];
      model.layout.layers = [{ id: 'new-layer-id', name: 'Nouvelle ligne', order: 0 }];
      model.domains = model.domains.map(domain => ({
        ...domain,
        layout: { ...domain.layout, columnId: 'removed-column-id', layerId: 'removed-layer-id' },
      }));
      localStorage.setItem(key, JSON.stringify(model));
    });
    await page.reload();
    const presentationPagePromise = context.waitForEvent('page');
    await page.getByTestId('presentation-switch-toolbar').click();
    const presentationPage = await presentationPagePromise;
    await presentationPage.waitForLoadState();
    const cards = presentationPage.getByTestId('capability-map').locator('.mosaic-domain');
    await expect(cards).not.toHaveCount(0);
    await expect(cards.first().locator('.domain-banner h3')).toBeVisible();
    await presentationPage.close();
  });

  test('ouvre également une nouvelle page sur mobile', async ({ page, context }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    
    const presentationPagePromise = context.waitForEvent('page');
    await page.getByTestId('presentation-switch-toolbar').click();
    const presentationPage = await presentationPagePromise;
    await presentationPage.waitForLoadState();
    await expect(presentationPage).toHaveURL(/view=presentation/);
    await expect(presentationPage.locator('.app.mosaic-presentation-mode')).toBeVisible();
    await expect(presentationPage.getByTestId('capability-map').locator('.mosaic-domain')).not.toHaveCount(0);
    await presentationPage.close();
  });

  test('met en valeur le titre d’un domaine sans N1 dans un panneau dédié', async ({ page }) => {
    await page.goto('/');
    await page.locator('.cell-add').first().click();
    const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
    await dialog.getByLabel('Nom').fill('Domaine sans capacité');
    await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('DOM-EMPTY');
    await dialog.getByRole('button', { name: 'Créer' }).click();
        await page.goto('/?view=presentation');
    const emptyDomain = page.getByTestId('capability-map').locator('.mosaic-presentation-empty').filter({ hasText: 'Domaine sans capacité' });
    await expect(emptyDomain).toBeVisible();
    await expect(emptyDomain.locator('.domain-banner')).toHaveCSS('justify-content', 'center');
    await expect(emptyDomain.locator('.domain-banner h3')).toBeVisible();
    const titleSize = await emptyDomain.locator('.domain-banner h3').evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
    const capabilitySize = await page.locator('.mosaic-domain .map-cap-select').first().evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize));
    expect(titleSize).toBeGreaterThan(16);
    expect(titleSize).toBeGreaterThan(capabilitySize);
  });
  test('redimensionne une carte par glisser-déposer et conserve ses dimensions après rechargement', async ({ page }) => {
    // La poignée basse est testée dans la fenêtre visible : le déplacement
    // doit rester dans le viewport pour que les événements pointer soient reçus.
    await page.setViewportSize({ width: 1280, height: 1200 });
    await page.goto('/');
    
    const firstDomain = page.locator('.mosaic-domain').first();
    await expect(firstDomain).toBeVisible();
    // Les bords de la carte sont les zones de redimensionnement.
    await firstDomain.scrollIntoViewIfNeeded();
    await expect(firstDomain).toBeInViewport();
    const placement = await firstDomain.evaluate(element => {
      const style = getComputedStyle(element);
      return { column: style.gridColumnStart, row: style.gridRowStart };
    });
    const zones = page.getByTestId('capability-map').locator('.mosaic-zone');
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
    // rowSpan=2 business layers spans 3 visual tiers (the second layer stacks two N0).
    await expect(firstDomain).toHaveCSS('grid-row', /span 3/);

    const mosaicBounds = await page.getByTestId('capability-map').boundingBox();
    const expandedBounds = await firstDomain.boundingBox();
    expect(mosaicBounds).not.toBeNull();
    expect(expandedBounds).not.toBeNull();
    expect(expandedBounds!.width).toBeGreaterThan(mosaicBounds!.width * 0.35);

    await page.reload();
        const persistedDomain = page.locator('.mosaic-domain').first();
    await expect(persistedDomain).toHaveCSS('grid-column', /span 2/);
    await expect(persistedDomain).toHaveCSS('grid-row', /span 3/);
    await persistedDomain.focus();
    await page.keyboard.press('ArrowLeft');
    await expect(persistedDomain).toHaveCSS('grid-column', /span 1/);
    await page.keyboard.press('ArrowUp');
    await expect(persistedDomain).toHaveCSS('grid-row', /span 1/);
  });

  test('permet de masquer indépendamment les intitulés des axes dans Structure', async ({ page }) => {
    await page.goto('/');
    const map = page.getByTestId('capability-map');
    await page.getByTestId('map-more-actions').locator('summary').click();
    await page.getByRole('button', { name: /Structure/ }).click();
    let options = page.getByTestId('axis-heading-options');
    await options.getByLabel('Afficher les titres des colonnes').uncheck();
    await page.getByRole('button', { name: 'Enregistrer' }).last().click();
    await expect(map.locator('.mosaic-column-heading')).toHaveCount(0);
    await expect(map.locator('.mosaic-row-heading')).toHaveCount(3);
    await page.getByTestId('map-more-actions').locator('summary').click();
    await page.getByRole('button', { name: /Structure/ }).click();
    options = page.getByTestId('axis-heading-options');
    await options.getByLabel('Afficher les titres des colonnes').check();
    await options.getByLabel('Afficher les titres des lignes').uncheck();
    await page.getByRole('button', { name: 'Enregistrer' }).last().click();
    await expect(map.locator('.mosaic-column-heading')).toHaveCount(4);
    await expect(map.locator('.mosaic-row-heading')).toHaveCount(0);
    await page.getByTestId('map-more-actions').locator('summary').click();
    await page.getByRole('button', { name: /Structure/ }).click();
    options = page.getByTestId('axis-heading-options');
    await options.getByLabel('Afficher les titres des colonnes').uncheck();
    await page.getByRole('button', { name: 'Enregistrer' }).last().click();
    await expect(map.locator('.mosaic-column-heading')).toHaveCount(0);
    await expect(map.locator('.mosaic-row-heading')).toHaveCount(0);
    await page.reload();
    await expect(page.getByTestId('capability-map').locator('.mosaic-column-heading')).toHaveCount(0);
    await expect(page.getByTestId('capability-map').locator('.mosaic-row-heading')).toHaveCount(0);
  });

  test('utilise toute la largeur avec un inventaire applicatif masquable', async ({ page }) => {
    await page.goto('/');
        await expect(page.locator('.workspace.mosaic-workspace > aside')).toBeHidden();
    const workspace = await page.locator('.workspace').boundingBox();
    const mosaic = await page.getByTestId('capability-map').boundingBox();
    expect(workspace).not.toBeNull();
    expect(mosaic).not.toBeNull();
    expect(mosaic!.width).toBeGreaterThan(workspace!.width * 0.85);

    await page.getByTestId('map-more-actions').locator('summary').click();
    const inventoryToggle = page.getByTestId('map-inventory-toggle');
    await expect(inventoryToggle).toHaveAttribute('aria-expanded', 'false');
    await inventoryToggle.click();
    await expect(page.locator('.workspace.mosaic-workspace > aside')).toBeVisible();
    await expect(page.locator('#app-inventory')).toContainText('Inventaire SI');
    await expect(inventoryToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByTestId('map-more-actions')).not.toHaveAttribute('open', '');
    await page.getByTestId('map-more-actions').locator('summary').click();
    await inventoryToggle.click();
    await expect(page.locator('.workspace.mosaic-workspace > aside')).toBeHidden();
  });

  test('conserve huit colonnes dans la largeur de la zone de travail', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('map-more-actions').locator('summary').click();
    await page.getByRole('button', { name: /Structure/ }).click();
    const addColumn = page.getByRole('button', { name: /Ajouter une colonne/ });
    for (let index = 0; index < 4; index += 1) await addColumn.click();
    await page.getByRole('button', { name: 'Enregistrer' }).last().click();

    const map = page.getByTestId('capability-map');
    await expect(map.locator('.mosaic-column-heading')).toHaveCount(8);
    const dimensions = await map.evaluate(element => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });

  test('permet de faire défiler verticalement la cartographie', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 600 });
    await page.goto('/');
    const main = page.locator('.workspace > main');
    const dimensions = await main.evaluate(element => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight }));
    expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight);
    await main.evaluate(element => { element.scrollTop = element.scrollHeight; });
    await expect.poll(() => main.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
  });

  test('permet de créer un domaine N0 dans la première zone libre', async ({ page }) => {
    await page.goto('/');
    
    const addDomain = page.getByTestId('map-add-domain');
    await expect(addDomain).toBeEnabled();
    await addDomain.click();

    const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
    await dialog.getByLabel('Nom').fill('Pilotage des données');
    await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('DATA-GOV');
    await dialog.getByRole('button', { name: 'Créer' }).click();

    const createdDomain = page.getByTestId('capability-map').locator('.mosaic-domain').filter({ hasText: 'Pilotage des données' });
    await expect(createdDomain).toBeVisible();
    await expect(createdDomain.locator('.domain-meta')).toContainText('0 N1');

    await page.reload();
    await expect(page.getByTestId('capability-map')).toBeVisible();
    await expect(page.getByTestId('capability-map').locator('.mosaic-domain').filter({ hasText: 'Pilotage des données' })).toBeVisible();
  });


  test('ajoute un domaine N0 directement depuis une zone libre', async ({ page }) => {
    await page.goto('/');
    const map = page.getByTestId('capability-map');
    const emptyZone = map.locator('.mosaic-zone').filter({ has: page.locator('.cell-add') }).first();
    await expect(emptyZone.locator('.cell-add')).toBeVisible();
    const before = await map.locator('.mosaic-domain').count();
    await emptyZone.locator('.cell-add').click();
    const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
    await dialog.getByLabel('Nom').fill('Domaine créé depuis une zone');
    await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('ZONE-ADD');
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await expect(map.locator('.mosaic-domain')).toHaveCount(before + 1);
    await expect(map.locator('.mosaic-domain').filter({ hasText: 'Domaine créé depuis une zone' })).toBeVisible();
  });

  test('affiche toutes les capacités N1 d’un N0 en présentation et désactive les interactions d’édition', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const domain = page.getByTestId('capability-map').locator('.mosaic-domain')
      .filter({ hasText: 'Relation & Engagement Client' });
    await expect(domain).toBeVisible();
    const initialCount = await domain.locator('.cap').count();
    const minimumCapabilities = 4;
    for (let index = initialCount; index < minimumCapabilities; index += 1) {
      await domain.getByTestId('add-capability-to-domain').click();
      const dialog = page.getByRole('dialog', { name: 'Nouvelle capacité N1' });
      await dialog.getByLabel('Nom').fill(`Capacité N1 visible ${index + 1}`);
      await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill(`CRM-VISIBLE-${index + 1}`);
      await dialog.getByRole('button', { name: 'Créer' }).click();
      await expect(dialog).toHaveCount(0);
    }

    await page.goto('/?view=presentation');
    const presentationDomain = page.getByTestId('capability-map').locator('.mosaic-domain')
      .filter({ hasText: 'Relation & Engagement Client' });
    const expectedCount = Math.max(initialCount, minimumCapabilities);
    await expect(presentationDomain.locator('.cap')).toHaveCount(expectedCount);
    await expect(presentationDomain.locator('.map-cap-select')).toHaveCount(expectedCount);
    const capabilityVisibility = await presentationDomain.locator('.cap').evaluateAll(elements =>
      elements.map(element => {
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return bounds.width > 0 && bounds.height > 0
          && style.display !== 'none'
          && bounds.top >= 0
          && bounds.bottom <= window.innerHeight;
      })
    );
    expect(capabilityVisibility).toEqual(Array.from({ length: expectedCount }, () => true));
    const textVisibility = await presentationDomain.locator('.cap').evaluateAll(elements => {
      const frame = elements[0]?.closest('.mosaic-domain')?.getBoundingClientRect();
      return elements.map(element => {
        const tile = element.getBoundingClientRect();
        const title = element.querySelector('.map-cap-select')!.getBoundingClientRect();
        return Boolean(frame) && tile.bottom <= frame!.bottom + 1 && title.bottom <= tile.bottom + 1;
      });
    });
    expect(textVisibility).toEqual(Array.from({ length: expectedCount }, () => true));
    await expect(presentationDomain.locator('[draggable="true"]')).toHaveCount(0);
    // L'agrandissement N0 est une action de lecture autorisée ; les actions
    // d'édition restent strictement absentes en présentation.
    await expect(presentationDomain.getByTestId('presentation-domain-open')).toHaveCount(1);
    await expect(presentationDomain.locator('button:not(.presentation-domain-open)')).toHaveCount(0);

    const map = page.getByTestId('capability-map');
    const before = await map.locator('.mosaic-domain').evaluateAll(elements =>
      elements.map(element => ({ id: element.getAttribute('data-entity-id'), style: (element as HTMLElement).style.cssText }))
    );
    const firstCard = presentationDomain.locator('.domain');
    const firstBounds = await firstCard.boundingBox();
    expect(firstBounds).not.toBeNull();
    await page.mouse.move(firstBounds!.x + firstBounds!.width - 2, firstBounds!.y + firstBounds!.height / 2);
    await page.mouse.down();
    await page.mouse.move(firstBounds!.x + firstBounds!.width + 80, firstBounds!.y + firstBounds!.height / 2);
    await page.mouse.up();
    const after = await map.locator('.mosaic-domain').evaluateAll(elements =>
      elements.map(element => ({ id: element.getAttribute('data-entity-id'), style: (element as HTMLElement).style.cssText }))
    );
    expect(after).toEqual(before);
  });

  test('permet de créer une capacité N1 directement depuis un domaine', async ({ page }) => {
    await page.goto('/');
    
    const domain = page.getByTestId('capability-map').locator('.mosaic-domain')
      .filter({ hasText: 'Relation & Engagement Client' });
    await domain.getByRole('button', { name: 'Ajouter une capacité N1 à Relation & Engagement Client' }).click();

    const dialog = page.getByRole('dialog', { name: 'Nouvelle capacité N1' });
    await dialog.getByLabel('Nom').fill('Gestion des contrats clients');
    await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill('CRM-04');
    await dialog.getByRole('button', { name: 'Créer' }).click();

    await expect(domain.locator('.caps-list')).toContainText('Gestion des contrats clients');
    await expect(domain.locator('.domain-meta')).toContainText('4 N1');
    await expect(domain.locator('.cap')).toHaveCount(4);

    const checkAllCapabilitiesFit = async () => {
      const geometry = await domain.evaluate(wrapper => {
        const map = wrapper.closest('.map-mosaic')!;
        const card = wrapper.querySelector('.domain')!;
        const list = wrapper.querySelector('.caps-list')!;
        const outer = wrapper.getBoundingClientRect();
        const inner = card.getBoundingClientRect();
        const listFrame = list.getBoundingClientRect();
        const mapFrame = map.getBoundingClientRect();
        const epsilon = 1;
        return {
          internalScroll: list.scrollHeight > list.clientHeight + epsilon,
          cardWithinGrid: outer.bottom <= mapFrame.bottom + epsilon,
          cardWithinPlacement: inner.bottom <= outer.bottom + epsilon,
          listWithinCard: listFrame.bottom <= inner.bottom + epsilon,
          visible: Array.from(list.querySelectorAll('.cap')).map(element => {
            const bounds = element.getBoundingClientRect();
            return bounds.height > 0
              && bounds.top >= listFrame.top - epsilon
              && bounds.bottom <= listFrame.bottom + epsilon
              && bounds.bottom <= outer.bottom + epsilon;
          }),
        };
      });
      expect(geometry.internalScroll).toBe(false);
      expect(geometry.cardWithinGrid).toBe(true);
      expect(geometry.cardWithinPlacement).toBe(true);
      expect(geometry.listWithinCard).toBe(true);
      expect(geometry.visible).toEqual([true, true, true, true]);
    };

    await checkAllCapabilitiesFit();
    // La sélection d'une N1 ne doit pas faire disparaître les autres tuiles.
    await domain.getByTestId('map-cap-select').first().click();
    await expect(domain.locator('.cap.impact-selected')).toHaveCount(1);
    await checkAllCapabilitiesFit();

    // Les axes à huit colonnes restent compacts, mais ne doivent ni écraser
    // les titres contre les actions ni éjecter le quatrième N1 hors de la grille.
    await page.getByTestId('map-more-actions').locator('summary').click();
    await page.getByRole('button', { name: /Structure/ }).click();
    const addColumn = page.getByRole('button', { name: /Ajouter une colonne/ });
    for (let index = 0; index < 4; index += 1) await addColumn.click();
    await page.getByRole('button', { name: 'Enregistrer' }).last().click();
    await expect(page.getByTestId('capability-map').locator('.mosaic-column-heading')).toHaveCount(8);
    await checkAllCapabilitiesFit();

    const headingGeometry = await domain.evaluate(wrapper => {
      const banner = wrapper.querySelector('.domain-banner')!;
      const title = wrapper.querySelector('.domain-banner h3')!;
      const actions = wrapper.querySelector('.domain-actions')!;
      const titleBounds = title.getBoundingClientRect();
      const actionsBounds = actions.getBoundingClientRect();
      const bannerBounds = banner.getBoundingClientRect();
      return {
        actionsBelowTitle: actionsBounds.top >= titleBounds.bottom - 1,
        titleOccupiesCardWidth: titleBounds.width >= bannerBounds.width * 0.7,
      };
    });
    expect(headingGeometry.actionsBelowTitle).toBe(true);
    expect(headingGeometry.titleOccupiesCardWidth).toBe(true);
  });




  for (const theme of ['light', 'dark'] as const) {
    test(`scorecard : fond, contour et texte des N1 restent cohérents en thème ${theme}`, async ({ page }) => {
      await page.goto('/');
      if (theme === 'dark') {
        await page.getByTestId('tools-menu-toggle').click();
        await page.getByTestId('theme-toggle').click();
        await expect(page.locator('.app.theme-dark')).toBeVisible();
      }
      await page.goto('/?view=presentation');
      await page.getByTestId('presentation-reading-coverage').click();
      const tile = page.locator('.mosaic-domain .cap[data-presentation-tone]').first();
      await expect(tile).toBeVisible();

      // Vérifie les cinq états sur le vrai DOM avec les tokens du thème.
      // Le jeu de démonstration ne contient pas nécessairement chaque niveau.
      for (const tone of ['covered', 'gap', 'high', 'critical', 'neutral'] as const) {
        await tile.evaluate((element, value) => element.setAttribute('data-presentation-tone', value), tone);
        const colors = await tile.evaluate(element => {
          const probe = document.createElement('span');
          probe.style.backgroundColor = 'var(--presentation-signal-bg)';
          probe.style.color = 'var(--presentation-signal-text)';
          element.appendChild(probe);
          const expected = getComputedStyle(probe);
          const expectedBackground = expected.backgroundColor;
          const expectedText = expected.color;
          probe.remove();
          const actual = getComputedStyle(element);
          return {
            foreground: actual.color,
            borderWidth: actual.borderTopWidth,
            expectedBackground,
            expectedText,
          };
        });
        // Le changement de tonalité anime background-color : attendre la
        // couleur finale évite d'asserter une image intermédiaire de la transition.
        await expect(tile, `${theme}/${tone}: fond N1`).toHaveCSS('background-color', colors.expectedBackground);
        expect(colors.foreground, `${theme}/${tone}: texte N1`).toBe(colors.expectedText);
        await expect(tile.locator('.map-cap-select'), `${theme}/${tone}: titre N1`).toHaveCSS('color', colors.expectedText);
        expect(colors.borderWidth).toBe('2px');

        await tile.hover();
        await expect(tile, `${theme}/${tone}: fond au survol`).toHaveCSS('background-color', colors.expectedBackground);
      }
    });
  }

  test('colorise les N1 selon les faits évalués en présentation sans masquer les capacités', async ({ page }) => {
    await page.goto('/?view=presentation');
    const capabilities = page.locator('.mosaic-domain .cap');
    await expect(capabilities.first()).toBeVisible();
    const total = await capabilities.count();
    expect(total).toBeGreaterThan(0);
    await page.getByTestId('presentation-reading-coverage').click();
    await expect(page.locator('.app')).toHaveAttribute('data-presentation-reading', 'coverage');
    await expect(page.getByTestId('presentation-legend')).toBeVisible();
    await expect(capabilities).toHaveCount(total);
    await expect(capabilities.first()).toHaveAttribute('data-presentation-tone', /covered|gap|high|critical|neutral/);
    await page.getByTestId('presentation-reading-maturity').click();
    await expect(page.locator('.app')).toHaveAttribute('data-presentation-reading', 'maturity');
    await page.getByTestId('presentation-reading-gaps').click();
    await expect(page.locator('.app')).toHaveAttribute('data-presentation-reading', 'gaps');
    await page.getByTestId('presentation-reading-identity').click();
    await expect(page.getByTestId('presentation-legend')).toHaveCount(0);
    await expect(capabilities.first()).not.toHaveAttribute('data-presentation-tone', /.+/);
  });

  test('révèle les applications et ouvre une fiche N1 accessible sans quitter la présentation', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/?view=presentation');
    await page.mouse.move(150, 150);
    const capabilities = page.locator('.mosaic-domain .cap');
    await expect(capabilities.first()).toBeVisible();
    const total = await capabilities.count();
    expect(total).toBeGreaterThan(0);
    await page.getByTestId('presentation-show-applications').check();
    await expect(page.locator('.presentation-app-preview')).toHaveCount(total);
    await expect(capabilities).toHaveCount(total);
    await capabilities.first().focus();
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog', { name: /Détail de/ });
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText('Applications actuelles')).toBeVisible();
    await expect(sheet.getByText('Applications cibles')).toBeVisible();
    await expect(sheet.getByText('Couverture métier')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toHaveCount(0);
    await expect(page.locator('.app.mosaic-presentation-mode')).toBeVisible();
    await capabilities.first().click();
    await expect(sheet).toBeVisible();
    await page.getByTestId('presentation-focus-close').click();
    await expect(sheet).toHaveCount(0);
    await page.mouse.move(160, 160);
    await page.getByTestId('presentation-show-applications').uncheck();
    await expect(page.locator('.presentation-app-preview')).toHaveCount(0);
  });

  test('synchronise le thème clair/sombre dans la fenêtre de présentation sans rechargement', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('enterprise-capacity-mapper:theme', 'light'));
    await page.reload();
    const presentationPromise = context.waitForEvent('page');
    await page.getByTestId('presentation-switch-toolbar').click();
    const presentationPage = await presentationPromise;
    await presentationPage.waitForLoadState();
    const editor = page.locator('.app');
    const projection = presentationPage.locator('.app');
    const banner = presentationPage.locator('.mosaic-domain .domain-banner').first();
    await expect(banner).toBeVisible();
    await expect(editor).not.toHaveClass(/theme-dark/);
    await expect(projection).not.toHaveClass(/theme-dark/);
    const lightBannerColor = await banner.evaluate(element => getComputedStyle(element).backgroundColor);

    await page.getByTestId('tools-menu-toggle').click();
    await page.getByTestId('theme-toggle').click();
    await expect(editor).toHaveClass(/theme-dark/);
    await expect(projection).toHaveClass(/theme-dark/);
    await expect(banner).not.toHaveCSS('background-color', lightBannerColor);

    await page.getByTestId('tools-menu-toggle').click();
    await page.getByTestId('theme-toggle').click();
    await expect(editor).not.toHaveClass(/theme-dark/);
    await expect(projection).not.toHaveClass(/theme-dark/);
    await expect(banner).toHaveCSS('background-color', lightBannerColor);
    expect(await presentationPage.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:theme'))).toBe('light');
  });

  test('pilote en temps réel le mode présentation depuis la fenêtre d’édition', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const presentationPromise = context.waitForEvent('page');
    await page.getByTestId('presentation-switch-toolbar').click();
    const presentationPage = await presentationPromise;
    await presentationPage.waitForLoadState();
    await expect(presentationPage.locator('.mosaic-domain .cap').first()).toBeVisible();
    await page.getByTestId('map-more-actions').locator('summary').click();
    await page.getByTestId('presentation-director-toggle').click();
    const panel = page.getByTestId('presentation-director-panel');
    await expect(panel).toBeVisible();

    await panel.getByTestId('director-reading-maturity').click();
    await expect(presentationPage.locator('.app')).toHaveAttribute('data-presentation-reading', 'maturity');
    await panel.getByTestId('director-show-applications').check();
    await expect(presentationPage.locator('.presentation-app-preview').first()).toBeVisible();
    await panel.getByTestId('presentation-director-domain').selectOption({ index: 1 });
    await expect(presentationPage.locator('.mosaic-domain.is-presentation-focused')).toHaveCount(1);
    await expect(presentationPage.locator('.mosaic-domain.is-presentation-dimmed').first()).toBeVisible();

    await panel.getByTestId('presentation-director-next').click();
    await expect(presentationPage.locator('.mosaic-domain.is-presentation-focused')).toHaveCount(1);
    await panel.getByTestId('presentation-director-domain').selectOption('');
    await expect(presentationPage.locator('.mosaic-domain.is-presentation-dimmed')).toHaveCount(0);
    await panel.getByTestId('director-reading-identity').click();
    await expect(presentationPage.locator('.app')).toHaveAttribute('data-presentation-reading', 'identity');
  });

  test('projette la sélection N1 en temps réel en conservant les couleurs métier', async ({ page, context }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const editorCaps = page.getByTestId('capability-map').locator('.cap');
    await expect(editorCaps.first()).toBeVisible();
    const firstId = await editorCaps.first().getAttribute('data-entity-id');
    const secondId = await editorCaps.nth(1).getAttribute('data-entity-id');
    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();

    await editorCaps.first().getByTestId('map-cap-select').click();
    const presentationPromise = context.waitForEvent('page');
    await page.getByTestId('presentation-switch-toolbar').click();
    const projection = await presentationPromise;
    await projection.waitForLoadState();
    const first = projection.locator(`.cap[data-entity-id="${firstId}"]`);
    const second = projection.locator(`.cap[data-entity-id="${secondId}"]`);
    await expect(first).toHaveClass(/is-presentation-selected/);
    await expect(projection.locator('.mosaic-domain.is-presentation-selection-parent')).not.toHaveCount(0);
    await expect(projection.locator('.presentation-focus-overlay')).toHaveCount(0);
    // Assert the actual projected spotlight, not only the class that can be
    // visually overridden by the dark theme or by the business status colors.
    await expect(first).toHaveCSS('outline-style', 'solid');
    await expect(first).toHaveCSS('outline-width', /px/);
    const spotlight = await first.evaluate(element => ({
      marker: getComputedStyle(element, '::before').content,
      markerColor: getComputedStyle(element, '::before').backgroundColor,
      parentOutline: getComputedStyle(element.closest('.mosaic-domain')!).boxShadow,
    }));
    expect(spotlight.marker).not.toBe('none');
    expect(spotlight.markerColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(spotlight.parentOutline).not.toBe('none');

    // Reconnecting an already-selected editor must restore the spotlight.
    await projection.reload();
    await expect(first).toHaveClass(/is-presentation-selected/);
    await expect(first).toHaveCSS('outline-style', 'solid');

    await projection.getByTestId('presentation-reading-maturity').click();
    await expect(first).toHaveAttribute('data-presentation-tone', /.+/);
    await editorCaps.nth(1).getByTestId('map-cap-select').click();
    await expect(first).toHaveClass(/is-presentation-selected/);
    await expect(second).toHaveClass(/is-presentation-selected/);
    await expect(second).toHaveAttribute('data-presentation-tone', /.+/);
    await editorCaps.first().getByTestId('map-cap-select').click();
    await expect(first).not.toHaveClass(/is-presentation-selected/);
    await expect(second).toHaveClass(/is-presentation-selected/);
    await editorCaps.nth(1).getByTestId('map-cap-select').click();
    await expect(projection.locator('.cap.is-presentation-selected')).toHaveCount(0);
    await expect(projection.locator('.mosaic-domain.is-presentation-selection-parent')).toHaveCount(0);
  });

  for (const theme of ['light', 'dark'] as const) {
    test(`garde le focus N0 net et les autres cartes opaques en thème ${theme}`, async ({ page, context }) => {
      await page.setViewportSize({ width: 1600, height: 900 });
      await page.goto('/');
      if (theme === 'dark') {
        await page.getByTestId('tools-menu-toggle').click();
        await page.getByTestId('theme-toggle').click();
        await expect(page.locator('.app.theme-dark')).toBeVisible();
        await page.keyboard.press('Escape');
      }

      const presentationPromise = context.waitForEvent('page');
      await page.getByTestId('presentation-switch-toolbar').click();
      const presentationPage = await presentationPromise;
      await presentationPage.waitForLoadState();
      await expect(presentationPage.locator('.mosaic-domain .cap').first()).toBeVisible();
      await page.getByTestId('map-more-actions').locator('summary').click();
      await page.getByTestId('presentation-director-toggle').click();
      const domainSelect = page.getByTestId('presentation-director-domain');
      await domainSelect.selectOption({ index: 1 });

      const focused = presentationPage.locator('.mosaic-domain.is-presentation-focused');
      const dimmed = presentationPage.locator('.mosaic-domain.is-presentation-dimmed');
      await expect(focused).toHaveCount(1);
      await expect(dimmed.first()).toBeVisible();
      await expect(focused).toHaveCSS('opacity', '1');
      await expect(dimmed.first()).toHaveCSS('opacity', '1');
      await expect(dimmed.first()).toHaveCSS('filter', 'none');

      const layers = await presentationPage.evaluate(() => {
        const active = document.querySelector('.mosaic-domain.is-presentation-focused')!;
        const subdued = document.querySelector('.mosaic-domain.is-presentation-dimmed')!;
        const title = subdued.querySelector('.domain-banner h3')!;
        const domain = subdued.querySelector('.domain')!;
        return {
          active: Number(getComputedStyle(active).zIndex),
          subdued: Number(getComputedStyle(subdued).zIndex),
          titleColor: getComputedStyle(title).color,
          bodyColor: getComputedStyle(domain).color,
          bodyBackground: getComputedStyle(domain).backgroundColor,
        };
      });
      expect(layers.active).toBeGreaterThan(layers.subdued);
      expect(layers.titleColor).toBe(layers.bodyColor);
      expect(layers.bodyBackground).not.toBe('transparent');
      expect(layers.bodyBackground).not.toBe('rgba(0, 0, 0, 0)');

      await domainSelect.selectOption({ index: 2 });
      await expect(presentationPage.locator('.mosaic-domain.is-presentation-focused')).toHaveCount(1);
      await expect(presentationPage.locator('.mosaic-domain.is-presentation-dimmed').first()).toHaveCSS('opacity', '1');
      await domainSelect.selectOption('');
      await expect(presentationPage.locator('.mosaic-domain.is-presentation-dimmed')).toHaveCount(0);
    });
  }

});

test('supprimer un N0 replie la ligne créée automatiquement sans laisser de trou dans la mosaïque', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('tools-menu-toggle').click();
  await page.getByTestId('new-map-button').click();
  await page.getByTestId('template-blank').click();
  await page.getByTestId('wizard-name').fill('Collapse après suppression');
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByRole('button', { name: 'Suivant' }).click();
  await page.getByTestId('wizard-backup').uncheck();
  await page.getByRole('button', { name: 'Créer la cartographie' }).click();

  const addDomain = async (name: string, code: string) => {
    await page.getByTestId('map-add-domain').click();
    const dialog = page.getByRole('dialog', { name: 'Nouveau domaine N0' });
    await dialog.getByLabel('Nom').fill(name);
    await dialog.getByRole('textbox', { name: 'Code', exact: true }).fill(code);
    await dialog.getByRole('button', { name: 'Créer' }).click();
    await expect(dialog).toHaveCount(0);
  };
  const map = page.getByTestId('capability-map');
  await addDomain('Gestion messagerie', 'GMS');
  await addDomain('Gestion notifications', 'GN');
  await expect(map.locator('.mosaic-row-heading')).toHaveCount(2);

  await map.locator('.mosaic-domain').filter({ hasText: 'Gestion notifications' })
    .locator('.domain-card').click({ button: 'right' });
  await page.locator('.context-menu').getByRole('button', { name: 'Supprimer', exact: true }).click();

  await expect(map.locator('.mosaic-domain')).toHaveCount(1);
  await expect(map.locator('.mosaic-domain')).toContainText('Gestion messagerie');
  await expect(map.locator('.mosaic-row-heading')).toHaveCount(1);
  const tracks = await map.evaluate(element => getComputedStyle(element).gridTemplateRows.split(' ').length);
  expect(tracks).toBe(2, 'one heading and one occupied row, no ghost track');

  await addDomain('Gestion incidents', 'GIN');
  await expect(map.locator('.mosaic-domain')).toHaveCount(2);
  await expect(map.locator('.mosaic-row-heading')).toHaveCount(2);
});
