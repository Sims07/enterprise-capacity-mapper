import { expect, test, type Page } from '../fixtures';

const fresh = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
};

const openTools = async (page: Page) => {
  const menu = page.getByTestId('tools-menu');
  if (!(await menu.getAttribute('class'))?.includes('is-open')) {
    await page.getByTestId('tools-menu-toggle').click();
  }
};

const assertNoHorizontalOverflow = async (page: Page) => {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
};

test.describe('Playwright regression — application and navigation', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page);
  });

  test('charge la cartographie et les vues principales sans erreur', async ({ page }) => {
    await expect(page.getByText('Capacity Mapper')).toBeVisible();
    await expect(page.locator('.map-filter-bar')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-overview').click();
    await page.getByTestId('dashboard-view-impact').click();
    await expect(page.getByTestId('impact-view')).toBeVisible();
    await page.getByTestId('tab-relations').click();
    await expect(page.locator('.coverage-tree')).toBeVisible();
  });

  test('reste navigable quand le modèle local est corrompu', async ({ page }) => {
    await page.evaluate(() => localStorage.setItem('enterprise-capacity-mapper:model:v3', '{invalid json'));
    await page.reload();
    await expect(page.getByText('Capacity Mapper')).toBeVisible();
    await page.getByTestId('nav-analysis').click();
    await expect(page.getByTestId('dashboard-view-overview')).toBeVisible();
  });

  test('ignore les bibliothèques locales invalides', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem('enterprise-capacity-mapper:local-maps:v1', JSON.stringify({ invalid: true }));
      localStorage.setItem('enterprise-capacity-mapper:recent-maps:v1', JSON.stringify({ invalid: true }));
    });
    await page.reload();
    await page.getByTestId('primary-library').click();
    await expect(page.getByTestId('library-page')).toBeVisible();
    await expect(page.getByTestId('saved-maps-count')).toContainText('0');
    await expect(page.getByTestId('recent-maps-count')).toBeVisible();
  });

  test('gère le thème sombre et ferme Outils avec Echap', async ({ page }) => {
    await openTools(page);
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('.app.theme-dark')).toBeVisible();
    await openTools(page);
    await expect(page.locator('.toolbar-tools-panel')).toBeVisible();
    await expect(page.getByTestId('new-map-button')).toBeEnabled();
    await expect(page.getByTestId('save-local-map')).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('tools-menu')).not.toHaveClass(/is-open/);
    await expect(page.getByTestId('tools-menu-toggle')).toBeFocused();
  });

  test('adapte le compagnon et son bouton aux thèmes clair et sombre', async ({ page }) => {
    const launcher = page.getByTestId('companion-launcher');
    const panel = page.getByTestId('companion-panel');
    const appearance = async () => launcher.evaluate(element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, foreground: style.color, border: style.borderColor };
    });
    const contrast = ({ background, foreground }: { background: string; foreground: string }) => {
      const luminance = (rgb: string) => {
        const channels = rgb.match(/\d+/g)?.slice(0, 3).map(Number) ?? [];
        if (channels.length !== 3) throw new Error('Couleur RGB invalide : ' + rgb);
        const linear = channels.map(channel => {
          const normalized = channel / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
      };
      const lightness = [luminance(background), luminance(foreground)].sort((a, b) => b - a);
      return (lightness[0] + 0.05) / (lightness[1] + 0.05);
    };

    const light = await appearance();
    expect(contrast(light)).toBeGreaterThanOrEqual(4.5);
    await launcher.click();
    await expect(panel).toBeVisible();
    const lightPanel = await panel.evaluate(element => getComputedStyle(element).backgroundColor);
    await expect(launcher).toHaveAttribute('aria-expanded', 'true');
    await page.getByTestId('companion-close').click();
    await expect(launcher).toBeFocused();

    await openTools(page);
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('.companion-root')).toHaveClass(/theme-dark/);
    await expect.poll(async () => contrast(await appearance())).toBeGreaterThanOrEqual(4.5);
    const dark = await appearance();
    expect(dark.background).not.toBe(light.background);
    expect(dark.foreground).not.toBe(light.foreground);
    expect(contrast(dark)).toBeGreaterThanOrEqual(4.5);

    await launcher.click();
    await expect(panel).toBeVisible();
    const darkPanel = await panel.evaluate(element => getComputedStyle(element).backgroundColor);
    expect(darkPanel).not.toBe(lightPanel);
    await expect(panel.getByTestId('companion-mode-guided')).toBeVisible();
    await page.getByTestId('companion-close').click();
    await expect(launcher).toHaveAttribute('aria-expanded', 'false');
  });

  test('affiche les outils et l’éditeur de structure', async ({ page }) => {
    await page.getByTestId('map-more-actions').locator('summary').click();
    await page.getByRole('button', { name: 'Structure' }).click();
    await expect(page.locator('.modal h2')).toContainText('Personnaliser la structure');
    await expect(page.locator('.modal .structure-section').first()).toBeVisible();
    await page.locator('.modal').getByRole('button', { name: 'Annuler' }).click();
    await expect(page.locator('.modal')).not.toBeVisible();
  });
});

test.describe('Playwright regression — cartography wizard', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page);
    await openTools(page);
    await page.getByTestId('new-map-button').click();
    await expect(page.getByTestId('wizard-step-1')).toBeVisible();
  });

  test('refuse un nom vide puis accepte un nom valide', async ({ page }) => {
    await page.getByTestId('wizard-name').fill('');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByTestId('wizard-error')).toContainText('nom de la cartographie est obligatoire');
    await page.getByTestId('wizard-name').fill('Cartographie de test');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByTestId('wizard-step-2')).toBeVisible();
  });

  test('présente les trois points de départ métier', async ({ page }) => {
    await expect(page.getByTestId('template-capability-map')).toContainText('Cartographie de capacités');
    await expect(page.getByTestId('template-value-chain')).toContainText('Capacités par chaîne de valeur');
    await expect(page.getByTestId('template-blank')).toContainText('Cartographie vierge');
    await expect(page.getByTestId('template-matrix')).not.toBeVisible();
  });

  test('permet de modifier les axes et met à jour l’aperçu', async ({ page }) => {
    await page.getByRole('button', { name: 'Suivant' }).click();
    const columns = page.getByTestId('structure-columns-input');
    await page.getByTestId('structure-add-columns').click();
    await expect(columns).toHaveCount(5);
    await columns.last().fill('Canal');
    await page.getByLabel('Monter Canal').click();
    await expect(columns.nth(3)).toHaveValue('Canal');
    await page.getByLabel('Supprimer Canal').click();
    await expect(columns).toHaveCount(4);
    await columns.first().fill('Client modifié');
    await expect(page.getByTestId('wizard-preview')).toContainText('Client modifié');
  });

  test('refuse une structure contenant un axe sans nom', async ({ page }) => {
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByTestId('structure-columns-input').first().fill('');
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByTestId('wizard-error')).toContainText('Chaque colonne et chaque ligne doit avoir un nom');
    await page.getByRole('button', { name: 'Précédent' }).click();
    await expect(page.getByTestId('wizard-step-1')).toBeVisible();
  });

  test('construit le récapitulatif et permet l’annulation par Echap', async ({ page }) => {
    await page.getByTestId('wizard-name').fill('Cartographie sauvegardée');
    await page.getByTestId('wizard-description').fill('Description de test');
    await page.getByTestId('template-value-chain').click();
    await page.getByRole('button', { name: 'Suivant' }).click();
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByTestId('wizard-step-3')).toContainText('Cartographie sauvegardée');
    await expect(page.getByTestId('wizard-step-3')).toContainText('Description de test');
    await expect(page.getByTestId('wizard-create')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.modal.wizard')).not.toBeVisible();
  });
});

test.describe('Playwright regression — analysis and relations', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page);
    await page.getByTestId('nav-analysis').click();
  });

  test('recalcule les redondances après ajout puis retrait d’une relation', async ({ page }) => {
    await page.getByTestId('tab-relations').click();
    await expect(page.locator('.tree-summary')).toContainText('2 gaps');
    await page.getByRole('button', { name: 'Relier des applications à Gestion des Prospects & Leads' }).click();
    await page.getByTestId('link-list').getByLabel('ADP Decidium').check();
    await page.getByTestId('link-save').click();
    const node = page.locator('.tree-node-cap').filter({ hasText: 'Gestion des Prospects & Leads' });
    await expect(node).toContainText('ADP Decidium');
    await expect(node).toContainText('Redondance');
    await page.getByRole('button', { name: 'Retirer ADP Decidium de Gestion des Prospects & Leads' }).click();
    await expect(node).not.toContainText('ADP Decidium');
  });

  test('conserve la sélection d’impact entre analyse, relations et cartographie', async ({ page }) => {
    await page.getByTestId('dashboard-view-impact').click();
    const selection = page.getByTestId('impact-view').getByRole('button', { name: /CRM-01 — Gestion des Prospects & Leads/ });
    await selection.click();
    await expect(selection).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('tab-relations').click();
    await expect(page.locator('.tree-row.impact-highlight')).toContainText('Gestion des Prospects & Leads');
    await page.getByTestId('nav-cartography').click();
    await expect(page.locator('.cap.impact-selected:visible')).toContainText('Gestion des Prospects & Leads');
  });

  test('navigue de la couverture vers Relations et cible la capacité', async ({ page }) => {
    await page.getByTestId('dashboard-view-coverage').click();
    await page.locator('.dashboard-map-capability').last().click();
    await expect(page.getByTestId('tab-relations')).toHaveClass(/active/);
    await expect(page.locator('.tree-row.impact-highlight')).toBeVisible();
    await expect(page.getByTestId('return-to-dashboard')).not.toBeVisible();
  });
});

test.describe('Playwright regression — import, library and persistence', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page);
  });

  test('affiche une bibliothèque compacte sans blocs de statistiques redondants, y compris en mobile', async ({ page }) => {
    await page.getByTestId('autosave-action').click();
    await page.getByTestId('local-map-name').fill('Bibliothèque compacte');
    await page.locator('.modal-actions').getByRole('button', { name: 'Enregistrer' }).click();

    await page.getByTestId('primary-library').click();
    const library = page.getByTestId('library-page');
    await expect(library.getByTestId('library-page-heading').getByRole('heading', { name: 'Bibliothèque', exact: true })).toBeVisible();
    await expect(library.locator('.library-stats')).toHaveCount(0);
    await expect(library.getByTestId('library-active-map')).toContainText('Bibliothèque compacte');
    await expect(library.getByTestId('saved-maps-count')).toHaveText('1');
    await expect(library.getByTestId('recent-maps-count')).toBeVisible();
    const savedSection = library.locator('.library-saved-section');
    const savedCard = library.getByTestId('saved-maps-list').locator('.library-map-card').first();
    await expect(savedCard).toContainText('Bibliothèque compacte');
    await expect(savedCard.getByRole('button', { name: 'Charger' })).toBeVisible();
    const bounds = await savedSection.evaluate(section => {
      const heading = section.querySelector('h3');
      const row = section.querySelector('.library-map-card');
      if (!heading || !row) throw new Error('Ligne compacte ou titre introuvable');
      return {
        titleInset: heading.getBoundingClientRect().left - section.getBoundingClientRect().left,
        rowHeight: row.getBoundingClientRect().height,
      };
    });
    expect(bounds.titleInset).toBeGreaterThan(0);
    // Une ligne compacte doit rester nettement moins haute que les anciennes grandes cartes.
    const maxCompactRowHeightPx = 160;
    expect(bounds.rowHeight).toBeLessThan(maxCompactRowHeightPx);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(library.getByTestId('library-active-map')).toBeVisible();
    await expect(savedCard.getByRole('button', { name: 'Charger' })).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });


  test('trie par dates de sauvegarde et d’ouverture et différencie visuellement les deux sources', async ({ page }) => {
    await page.getByTestId('autosave-action').click();
    await page.getByTestId('local-map-name').fill('Base pour le tri');
    await page.locator('.modal-actions').getByRole('button', { name: 'Enregistrer' }).click();

    await page.evaluate(() => {
      const savedKey = 'enterprise-capacity-mapper:local-maps:v1';
      const recentKey = 'enterprise-capacity-mapper:recent-maps:v1';
      const base = JSON.parse(localStorage.getItem(savedKey) || '[]')[0];
      if (!base) throw new Error('Une sauvegarde de test est nécessaire');
      localStorage.setItem(savedKey, JSON.stringify([
        { ...base, id: 'saved-old', name: 'Sauvegarde ancienne', updatedAt: '2026-11-05T09:26:00Z' },
        { ...base, id: 'saved-new', name: 'Sauvegarde nouvelle', updatedAt: '2026-11-09T16:04:00Z' },
        { ...base, id: 'saved-middle', name: 'Sauvegarde intermédiaire', updatedAt: '2026-11-06T11:41:00Z' },
      ]));
      localStorage.setItem(recentKey, JSON.stringify([
        { ...base, id: 'recent-middle', name: 'Historique intermédiaire', openedAt: '2026-11-06T11:34:00Z' },
        { ...base, id: 'recent-old', name: 'Historique ancien', openedAt: '2026-11-05T09:48:00Z' },
        { ...base, id: 'recent-new', name: 'Historique nouveau', openedAt: '2026-11-09T10:08:00Z' },
      ]));
    });
    await page.reload();
    await page.getByTestId('primary-library').click();
    const library = page.getByTestId('library-page');
    const savedList = library.getByTestId('saved-maps-list');
    const recentList = library.getByTestId('recent-maps-list');
    await expect(savedList.locator('.library-map-card h4')).toHaveText([
      'Sauvegarde nouvelle', 'Sauvegarde intermédiaire', 'Sauvegarde ancienne',
    ]);
    // L’application peut ajouter une session récente au rechargement : ne comparer que les entrées préparées.
    const historyNames = (await recentList.locator('.library-map-card h4').allTextContents())
      .filter(name => name.startsWith('Historique '));
    expect(historyNames).toEqual(['Historique nouveau', 'Historique intermédiaire', 'Historique ancien']);
    await expect(savedList.getByRole('button', { name: 'Charger' })).toHaveCount(3);
    for (const name of ['Historique nouveau', 'Historique intermédiaire', 'Historique ancien']) {
      await expect(recentList.locator('.library-map-card').filter({ hasText: name })
        .getByRole('button', { name: 'Reprendre' })).toBeVisible();
    }
    const tones = await library.evaluate(element => {
      const saved = element.querySelector('.library-saved-section');
      const recent = element.querySelector('.library-recent-section');
      if (!saved || !recent) throw new Error('Sections introuvables');
      return {
        saved: getComputedStyle(saved).borderTopColor,
        recent: getComputedStyle(recent).borderTopColor,
        savedIcon: saved.querySelector('.library-section-icon')?.getAttribute('aria-hidden'),
        recentIcon: recent.querySelector('.library-section-icon')?.getAttribute('aria-hidden'),
      };
    });
    expect(tones.saved).not.toBe(tones.recent);
    expect(tones.savedIcon).toBe('true');
    expect(tones.recentIcon).toBe('true');

    await recentList.locator('.library-map-card').filter({ hasText: 'Historique ancien' })
      .getByRole('button', { name: 'Retirer' }).click();
    await expect(recentList).not.toContainText('Historique ancien');
    await expect(savedList).toContainText('Sauvegarde ancienne');
  });

  test('indique le brouillon local puis sa sauvegarde sur cet appareil', async ({ page }) => {
    await expect(page.getByTestId('autosave-status')).toHaveText('Brouillon local');
    await page.getByTestId('autosave-action').click();
    await page.getByTestId('local-map-name').fill('Mon brouillon');
    await page.locator('.modal-actions').getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByTestId('autosave-status')).toHaveText('Enregistrée sur cet appareil');
    await expect(page.getByTestId('autosave-action')).toHaveCount(0);
  });

  test('enregistre une cartographie locale et la restaure', async ({ page }) => {
    await openTools(page);
    await page.getByTestId('save-local-map').click();
    await page.getByTestId('local-map-name').fill('Playwright local');
    await page.locator('.modal').getByRole('button', { name: 'Enregistrer' }).click();
    await page.reload();
    await page.getByTestId('primary-library').click();
    await expect(page.getByTestId('saved-maps-list')).toContainText('Playwright local');
  });

  test('sauvegarde automatiquement les changements d’une cartographie déjà enregistrée', async ({ page }) => {
    await openTools(page);
    await page.getByTestId('save-local-map').click();
    await page.getByTestId('local-map-name').fill('Autosave Playwright');
    await page.locator('.modal').getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByTestId('autosave-status')).toHaveText('Enregistrée sur cet appareil');

    const capability = page.locator('.cap:visible').first();
    await capability.getByRole('button', { name: /^Ouvrir la fiche de / }).click();
    await page.locator('.modal .field input').fill('Capacité sauvegardée automatiquement');
    await page.locator('.modal-actions').getByRole('button', { name: 'Enregistrer' }).click();
    // Vérifier que la sauvegarde différée aboutit avant la sauvegarde manuelle.
    await expect.poll(() => page.evaluate(() => {
      const maps = JSON.parse(localStorage.getItem('enterprise-capacity-mapper:local-maps:v1') || '[]');
      return maps.find((entry: { name: string }) => entry.name === 'Autosave Playwright')
        ?.model.capabilities[0].name;
    })).toBe('Capacité sauvegardée automatiquement');
    await page.keyboard.press('Control+s');
    await expect(page.getByTestId('autosave-status')).toHaveText('Enregistrée sur cet appareil');
    await expect(page.getByText('Cartographie « Autosave Playwright » enregistrée sur cet appareil')).toBeVisible();

    await expect.poll(() => page.evaluate(() => {
      const maps = JSON.parse(localStorage.getItem('enterprise-capacity-mapper:local-maps:v1') || '[]');
      return maps.find((entry: { name: string }) => entry.name === 'Autosave Playwright')
        ?.model.capabilities[0].name;
    })).toBe('Capacité sauvegardée automatiquement');
    await page.reload();
    await page.getByTestId('primary-library').click();
    const savedCard = page.getByTestId('saved-maps-list').locator('.library-map-card').filter({ has: page.getByRole('heading', { name: 'Autosave Playwright' }) });
    await savedCard.getByRole('button', { name: 'Charger' }).click();
    await page.locator('.modal-actions').getByRole('button', { name: 'Ouvrir' }).click();
    await expect(page.locator('.cap:visible').filter({ hasText: 'Capacité sauvegardée automatiquement' })).toBeVisible();
  });


  test('permet de réessayer après une erreur de sauvegarde dans le navigateur', async ({ page }) => {
    await openTools(page);
    await page.getByTestId('save-local-map').click();
    await page.getByTestId('local-map-name').fill('Test reprise');
    await page.locator('.modal-actions').getByRole('button', { name: 'Enregistrer' }).click();
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'enterprise-capacity-mapper:local-maps:v1' && sessionStorage.getItem('__block_save') === 'yes') {
          throw new DOMException('Stockage saturé', 'QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      };
      sessionStorage.setItem('__block_save', 'yes');
    });
    const capability = page.locator('.cap:visible').first();
    await capability.getByTestId('capability-open-sheet').click();
    await page.locator('.modal .field input').fill('Modification après panne');
    await page.locator('.modal-actions').getByRole('button', { name: 'Enregistrer' }).click();
    await expect(page.getByTestId('autosave-status')).toHaveText('Sauvegarde échouée');
    await page.evaluate(() => sessionStorage.removeItem('__block_save'));
    await page.getByTestId('autosave-action').click();
    await expect(page.getByTestId('autosave-status')).toHaveText('Enregistrée sur cet appareil');
    await expect.poll(() => page.evaluate(() => {
      const maps = JSON.parse(localStorage.getItem('enterprise-capacity-mapper:local-maps:v1') || '[]');
      return maps.find((entry: { name: string }) => entry.name === 'Test reprise')
        ?.model.capabilities[0].name;
    })).toBe('Modification après panne');
  });

  test('ne recharge pas une version périmée lors de l’ouverture de la cartographie active', async ({ page }) => {
    await openTools(page);
    await page.getByTestId('save-local-map').click();
    await page.getByTestId('local-map-name').fill('Ouverture sécurisée');
    await page.locator('.modal-actions').getByRole('button', { name: 'Enregistrer' }).click();

    const capability = page.locator('.cap:visible').first();
    await capability.getByTestId('capability-open-sheet').click();
    await page.locator('.modal .field input').fill('Édition à conserver');
    await page.locator('.modal-actions').getByRole('button', { name: 'Enregistrer' }).click();
    await page.getByTestId('primary-library').click();
    await page.getByTestId('saved-maps-list').getByRole('button', { name: 'Charger' }).first().click();
    await page.locator('.modal-actions').getByRole('button', { name: 'Ouvrir' }).click();
    await expect(page.locator('.cap:visible').filter({ hasText: 'Édition à conserver' })).toBeVisible();
    await expect(page.getByTestId('autosave-status')).toHaveText('Enregistrée sur cet appareil');
  });

  test('une cartographie récente non nommée reste un brouillon', async ({ page }) => {
    await page.getByTestId('primary-library').click();
    await page.getByTestId('recent-maps-list').getByRole('button', { name: 'Reprendre' }).first().click();
    await page.locator('.modal-actions').getByRole('button', { name: 'Ouvrir' }).click();
    await expect(page.getByTestId('autosave-status')).toHaveText('Brouillon local');
    await expect(page.getByTestId('autosave-action')).toHaveText('Enregistrer');
  });

  test('importe un modèle JSON et conserve sa structure après rechargement', async ({ page }) => {
    await expect.poll(() => page.evaluate(() => localStorage.getItem('enterprise-capacity-mapper:model:v3'))).not.toBeNull();
    const model = await page.evaluate(() => {
      const raw = localStorage.getItem('enterprise-capacity-mapper:model:v3');
      if (!raw) throw new Error('demo model missing after initialization');
      const value = JSON.parse(raw);
      value.capabilities.find((item: { name: string }) => item.name === 'Gestion des Prospects & Leads').name = 'Gestion des Prospects & Leads — import vérifié';
      const domain = value.domains.find((item: { name: string }) => item.name === 'Relation & Engagement Client');
      domain.layout = { ...domain.layout, columnSpan: 2 };
      return JSON.stringify(value);
    });
    await openTools(page);
    await page.getByTestId('import-model').setInputFiles({
      name: 'cartographie-valide.json',
      mimeType: 'application/json',
      buffer: Buffer.from(model),
    });
    await expect(page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads — import vérifié' })).toBeVisible();
    await page.reload();
    await expect(page.locator('.cap:visible').filter({ hasText: 'Gestion des Prospects & Leads — import vérifié' })).toBeVisible();
    await expect(page.locator('.mosaic-domain:visible').filter({ hasText: 'Relation & Engagement Client' })).toHaveCSS('grid-column-end', 'span 2');
  });

  test('migre un ancien modèle local vers le schéma actuel', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('enterprise-capacity-mapper:model:v3');
      localStorage.setItem('ea_canvas_l0', JSON.stringify([{ id: 'legacy-domain', name: 'Domaine historique', code: 'LEG-0', description: 'Domaine migré', color: 'indigo' }]));
      localStorage.setItem('ea_canvas_l1', JSON.stringify([{ id: 'legacy-cap', name: 'Capacité historique', code: 'LEG-1', description: 'Capacité migrée', l0Id: 'legacy-domain' }]));
      localStorage.setItem('ea_canvas_apps', JSON.stringify([{ id: 'legacy-app', name: 'Application historique', code: 'LEG-APP', type: 'SaaS', status: 'Actif', vendor: 'Legacy', description: 'Application migrée', l1Id: 'legacy-cap' }]));
    });
    await page.reload();
    await expect(page.locator('.domain h3:visible')).toContainText('Domaine historique');
    await expect(page.locator('.cap:visible .map-cap-select')).toContainText('Capacité historique');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('enterprise-capacity-mapper:model:v3') ?? 'null').schemaVersion)).toBe(3);
  });
});

test.describe('Playwright regression — companion', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page);
    await page.getByTestId('companion-launcher').click();
  });

  test('qualifie un écart de couverture sans LLM ni modification de la cartographie', async ({ page }) => {
    const before = await page.evaluate(() => {
      const raw = localStorage.getItem('enterprise-capacity-mapper:model:v3');
      if (!raw) throw new Error('Cartographie absente');
      const model = JSON.parse(raw);
      return { applications: model.applications, capabilities: model.capabilities };
    });
    await page.getByTestId('companion-prompt-coverage').click();
    const review = page.getByTestId('companion-guided-review');
    await expect(review).toBeVisible();
    const gap = review.locator('[data-rule-id="coverage.target-uncovered"]').first();
    await expect(gap).toBeVisible();
    await gap.click();
    await expect(review.getByTestId('companion-review-question')).toContainText('lacune réelle');
    await review.getByTestId('companion-review-answer-confirmed').click();
    await expect(review.getByTestId('companion-review-question')).toContainText('processus métier');
    await review.getByTestId('companion-review-answer-important').click();
    await expect(review.getByTestId('companion-review-conclusion')).toContainText('Ne pas déduire automatiquement le niveau de risque');

    await review.getByTestId('companion-review-restart').click();
    await review.getByTestId('companion-review-answer-incomplete').click();
    await expect(review.getByTestId('companion-review-conclusion')).toContainText('Donnée incomplète');
    await expect(review.getByTestId('companion-review-conclusion')).not.toContainText('Lacune déclarée');

    const after = await page.evaluate(() => {
      const model = JSON.parse(localStorage.getItem('enterprise-capacity-mapper:model:v3') || '{}');
      return { applications: model.applications, capabilities: model.capabilities };
    });
    expect(after).toEqual(before);
  });

  test('propose de relier une application après qualification et utilise la modale de relations existante', async ({ page }) => {
    await page.getByTestId('companion-prompt-coverage').click();
    const review = page.getByTestId('companion-guided-review');
    await review.locator('[data-rule-id="coverage.target-uncovered"]').first().click();
    const targetName = (await review.getByTestId('companion-review-evidence').first().innerText()).trim();
    const targetId = await page.evaluate(name => {
      const data = JSON.parse(localStorage.getItem('enterprise-capacity-mapper:model:v3') || '{}');
      return data.capabilities.find((item: { name: string }) => item.name === name)?.id
        || data.domains.find((item: { name: string }) => item.name === name)?.id;
    }, targetName);
    expect(targetId).toBeTruthy();
    await review.getByTestId('companion-review-answer-outside').click();
    await expect(review.getByTestId('companion-review-actions')).toHaveCount(0);
    await review.getByTestId('companion-review-restart').click();
    await review.getByTestId('companion-review-answer-incomplete').click();
    const launch = review.getByTestId('companion-review-action-link-target');
    await expect(launch).toBeVisible();
    await launch.click();
    const modal = page.locator('.modal');
    await expect(modal).toContainText(targetName);
    await expect(page.getByTestId('link-list').locator('input[type="checkbox"]').first()).toBeVisible();

    // Cancel does not edit the model.
    await modal.getByRole('button', { name: 'Annuler' }).click();
    const unchanged = await page.evaluate(id => JSON.parse(localStorage.getItem('enterprise-capacity-mapper:model:v3') || '{}')
      .applications.some((app: { capabilityIds: string[] }) => app.capabilityIds.includes(id)), targetId);
    expect(unchanged).toBe(false);

    await launch.click();
    await page.getByTestId('link-list').locator('input[type="checkbox"]').first().check();
    await page.getByTestId('link-save').click();
    await expect(review.getByTestId('companion-review-updated')).toContainText('Une relation est maintenant déclarée');
    await expect.poll(() => page.evaluate(id => JSON.parse(localStorage.getItem('enterprise-capacity-mapper:model:v3') || '{}')
      .applications.some((app: { capabilityIds: string[] }) => app.capabilityIds.includes(id)), targetId)).toBe(true);
    await expect(review.getByTestId('companion-review-action-link-target')).toHaveCount(0);
  });

  test('propose de créer une application préreliée et ne l’enregistre qu’après validation', async ({ page }) => {
    await page.getByTestId('companion-prompt-coverage').click();
    const review = page.getByTestId('companion-guided-review');
    await review.locator('[data-rule-id="coverage.target-uncovered"]').first().click();
    const targetName = (await review.getByTestId('companion-review-evidence').first().innerText()).trim();
    await review.getByTestId('companion-review-answer-confirmed').click();
    await review.getByTestId('companion-review-answer-important').click();
    await review.getByTestId('companion-review-action-create-application').click();
    const modal = page.locator('.modal');
    await expect(modal).toContainText('Nouvelle application');
    await expect(page.getByTestId('companion-create-app-target')).toContainText(targetName);
    await modal.getByRole('button', { name: 'Annuler' }).click();
    await expect(page.getByTestId('companion-review-conclusion')).toContainText('Lacune déclarée');
    await review.getByTestId('companion-review-action-create-application').click();
    await modal.getByLabel('Nom', { exact: true }).fill('Application de test du compagnon');
    await modal.getByLabel('Code', { exact: true }).fill('APP-ASSIST');
    await modal.getByLabel('Éditeur / fournisseur').fill('Éditeur de test');
    await modal.getByRole('button', { name: 'Créer' }).click();
    await expect(modal).toHaveCount(0);
    await expect(review.getByTestId('companion-review-updated')).toBeVisible();
    await expect.poll(() => page.evaluate(name => {
      const data = JSON.parse(localStorage.getItem('enterprise-capacity-mapper:model:v3') || '{}');
      const app = data.applications.find((item: { name: string }) => item.name === 'Application de test du compagnon');
      const target = data.capabilities.find((item: { name: string }) => item.name === name)
        || data.domains.find((item: { name: string }) => item.name === name);
      return Boolean(app && target && app.capabilityIds.includes(target.id));
    }, targetName)).toBe(true);
  });

  test('conserve les quatre analyses existantes avec qualification complémentaire', async ({ page }) => {
    for (const prompt of ['overview', 'coverage', 'naming', 'structure']) {
      await page.getByTestId(`companion-prompt-${prompt}`).click();
      await expect(page.getByTestId('companion-exchange').last()).toBeVisible();
    }
    const history = page.getByTestId('companion-exchange');
    await expect(history).toHaveCount(4);
    await page.getByTestId('companion-mode-conversation').click();
    await expect(history).toHaveCount(4);
    await page.getByTestId('companion-mode-guided').click();
    await expect(history).toHaveCount(4);
  });

  test('redimensionne le panneau, persiste le format et garde le dock dans le viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 900 });
    const panel = page.getByTestId('companion-panel');
    const normal = await panel.boundingBox();
    await page.getByTestId('companion-size-toggle').click();
    await expect(panel).toHaveClass(/is-large/);
    const large = await panel.boundingBox();
    expect(large!.height).toBeGreaterThan(normal!.height);
    await page.getByTestId('companion-size-toggle').click();
    await expect(panel).toHaveClass(/is-dock/);
    const dock = await panel.boundingBox();
    expect(dock!.x).toBeGreaterThanOrEqual(0);
    expect(dock!.y).toBeGreaterThanOrEqual(0);
    expect(dock!.x + dock!.width).toBeLessThanOrEqual(1366);
    expect(dock!.y + dock!.height).toBeLessThanOrEqual(900);
    await page.reload();
    await page.getByTestId('companion-launcher').click();
    await expect(page.getByTestId('companion-panel')).toHaveClass(/is-dock/);
    expect(await page.evaluate(() => localStorage.getItem('companion-size'))).toBe('dock');
  });

  test('préserve au moins 240px de conversation à 1366×768', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.getByTestId('companion-mode-conversation').click();
    const conversation = page.getByTestId('companion-conversation');
    const box = await conversation.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(240);
  });

  test('accepte une saisie multiligne avec Maj+Entrée', async ({ page }) => {
    await page.getByTestId('companion-mode-conversation').click();
    const question = page.getByTestId('companion-question');
    await expect(question).toHaveJSProperty('tagName', 'TEXTAREA');
    await question.fill('Première ligne');
    await question.press('Shift+Enter');
    await question.type('Deuxième ligne');
    await expect(question).toHaveValue('Première ligne\nDeuxième ligne');
  });

  test('synchronise les surfaces du compagnon avec les tokens en thème clair et sombre', async ({ page }) => {
    const root = page.locator('.companion-root');
    const launcher = page.getByTestId('companion-launcher');
    const panel = page.getByTestId('companion-panel');

    const assertSemanticColors = async () => {
      await page.mouse.move(0, 0);
      const expected = await root.evaluate((element) => {
        const resolveToken = (token: string) => {
          const probe = document.createElement('span');
          probe.style.backgroundColor = `var(${token})`;
          element.appendChild(probe);
          const color = getComputedStyle(probe).backgroundColor;
          probe.remove();
          return color;
        };
        return {
          surface: resolveToken('--companion-bg'),
          launcherBorder: resolveToken('--color-accent-border'),
          launcherOpenSurface: resolveToken('--color-accent-soft'),
        };
      });
      await expect(panel).toHaveCSS('background-color', expected.surface);
      await expect(launcher).toHaveCSS('border-color', expected.launcherBorder);
      await expect(launcher).toHaveCSS('background-color', expected.launcherOpenSurface);
    };

    await expect(panel).toBeVisible();
    await assertSemanticColors();

    await launcher.click();
    await expect(panel).not.toBeVisible();
    await openTools(page);
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('.app.theme-dark')).toBeVisible();
    await launcher.click();
    await expect(panel).toBeVisible();
    await assertSemanticColors();
  });

  test('ouvre le compagnon avec ses deux modes et ses questions guidées', async ({ page }) => {
    await expect(page.getByTestId('companion-panel')).toHaveAttribute('role', 'dialog');
    await expect(page.getByTestId('companion-mode-guided')).toHaveAttribute('aria-pressed', 'true');
    for (const id of ['overview', 'coverage', 'naming', 'structure']) {
      await expect(page.getByTestId(`companion-prompt-${id}`)).toBeVisible();
    }
  });

  test('conserve l’historique en passant au mode conversation', async ({ page }) => {
    await page.getByTestId('companion-prompt-coverage').click();
    await expect(page.getByTestId('companion-exchange')).toHaveCount(1);
    await page.getByTestId('companion-mode-conversation').click();
    await page.getByTestId('companion-question').fill('Peux-tu revoir le nommage des capacités ?');
    await page.getByTestId('companion-submit').click();
    await expect(page.getByTestId('companion-exchange')).toHaveCount(2);
    await expect(page.getByTestId('companion-user-question').last()).toContainText('Peux-tu revoir le nommage');
  });

  test('supprime et réinitialise les échanges avec confirmation', async ({ page }) => {
    await page.getByTestId('companion-prompt-coverage').click();
    await page.getByTestId('companion-prompt-naming').click();
    await page.getByTestId('companion-delete-exchange').first().click();
    await page.getByTestId('companion-confirm-delete-exchange').click();
    await expect(page.getByTestId('companion-exchange')).toHaveCount(1);
    await page.getByTestId('companion-clear-history').click();
    await page.getByTestId('companion-confirm-clear').click();
    await expect(page.getByTestId('companion-exchange')).not.toBeVisible();
  });

  test('change de mascotte et persiste le choix', async ({ page }) => {
    await expect(page.locator('.companion-brand-mark img[alt="Mascotte raton laveur"]')).toBeVisible();
    await page.getByTestId('companion-mascot-toggle').click();
    await expect(page.locator('.companion-brand-mark img[alt="Mascotte pieuvre"]')).toBeVisible();
    const mascot = await page.evaluate(() => localStorage.getItem('companion-mascot'));
    expect(mascot).toBe('octopus');
  });

  test('utilise la géométrie partagée du design system', async ({ page }) => {
    const values = await page.evaluate(() => {
      const root = document.querySelector('.companion-root');
      const launcher = document.querySelector<HTMLElement>('[data-testid="companion-launcher"]');
      const panel = document.querySelector<HTMLElement>('[data-testid="companion-panel"]');
      const prompt = document.querySelector<HTMLElement>('.companion-prompt');
      if (!root || !launcher || !panel || !prompt) throw new Error('companion surface missing');
      const rootStyle = getComputedStyle(root);
      const launcherStyle = getComputedStyle(launcher);
      const panelStyle = getComputedStyle(panel);
      const promptStyle = getComputedStyle(prompt);
      return {
        controlRadius: rootStyle.getPropertyValue('--radius-control').trim(),
        cardRadius: rootStyle.getPropertyValue('--radius-card').trim(),
        panelRadius: rootStyle.getPropertyValue('--radius-panel').trim(),
        focusWidth: rootStyle.getPropertyValue('--focus-ring-width').trim(),
        launcherRadius: launcherStyle.borderRadius,
        panelRadiusComputed: panelStyle.borderRadius,
        promptRadius: promptStyle.borderRadius,
      };
    });

    expect(values.launcherRadius).toBe(values.panelRadius);
    expect(values.panelRadiusComputed).toBe(values.panelRadius);
    expect(values.promptRadius).toBe(values.cardRadius);
    expect(values.controlRadius).toBe('7px');
    expect(values.focusWidth).toBe('2px');
  });
});
test.describe('Diagnostic métier — expérience design system', () => {
  test('navigation entre écarts et capacités à qualifier, sans perdre les actions métier', async ({ page }) => {
    await fresh(page);
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-attention').click();
    const panel = page.getByTestId('capability-diagnostic');
    await expect(panel).toBeVisible();
    await expect(panel.getByTestId('attention-filter-signals')).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByTestId('capability-diagnostic-summary')).toContainText('Avec signal');
    await expect(panel.getByTestId('capability-diagnostic-item')).toHaveCount(3);
    await panel.getByTestId('attention-filter-qualification').click();
    await expect(panel.getByTestId('attention-filter-qualification')).toHaveAttribute('aria-pressed', 'true');
    await expect(panel.getByTestId('capability-diagnostic-summary')).toContainText('À qualifier');
    await expect(panel.getByTestId('capability-diagnostic-item')).toHaveCount(6);
    await panel.getByTestId('attention-show-all').click();
    await expect(panel.getByTestId('capability-diagnostic-item')).toHaveCount(10);
    await panel.getByTestId('attention-show-all').click();
    await expect(panel.getByTestId('capability-diagnostic-item')).toHaveCount(6);
    const first = panel.getByTestId('capability-diagnostic-item').first();
    await expect(first.getByTestId('capability-diagnostic-edit')).toBeVisible();
    await first.getByTestId('capability-diagnostic-edit').click();
    await expect(page.getByRole('dialog', { name: 'Fiche de capacité N1' })).toBeVisible();
    await page.getByRole('dialog', { name: 'Fiche de capacité N1' }).getByRole('button', { name: 'Fermer la fenêtre' }).click();
    await panel.getByTestId('attention-filter-signals').click();
    await expect(panel.getByTestId('capability-diagnostic-item')).toHaveCount(3);
  });

  test('comparaison optionnelle repliée, puis erreurs et résultats visuellement distincts', async ({ page }) => {
    await fresh(page);
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-attention').click();
    const toggle = page.getByTestId('attention-reference-toggle');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.getByTestId('capability-reference-url')).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await page.getByTestId('capability-reference-load-url').click();
    await expect(page.getByRole('alert')).toContainText('Renseignez une URL de référence JSON');
    const reference = {
      schemaVersion: 3,
      domains: [{ id: 'r-domain', code: 'CAP-CRM', name: 'Relation & Engagement Client' }],
      capabilities: [{ id: 'r-cap', domainId: 'r-domain', code: 'CRM-99', name: 'Gestion des abonnements' }],
      applications: [],
    };
    await page.getByTestId('capability-reference-import').setInputFiles({
      name: 'reference.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(reference)),
    });
    await expect(page.getByTestId('reference-missing-capabilities')).toContainText('Gestion des abonnements');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await toggle.click();
    await expect(page.getByTestId('capability-reference-url')).toHaveCount(0);
    await expect(page.getByTestId('reference-missing-capabilities')).toBeVisible();
    await page.getByRole('button', { name: 'Retirer la référence' }).click();
    await expect(page.getByTestId('reference-missing-capabilities')).toHaveCount(0);
  });

  test('design system : surfaces sémantiques en clair et sombre et contrôle accessible sur mobile', async ({ page }) => {
    await fresh(page);
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-attention').click();
    const card = page.getByTestId('capability-diagnostic-item').first();
    const inspect = () => card.evaluate((element) => {
      const surfaceProbe = document.createElement('div');
      surfaceProbe.style.backgroundColor = 'var(--color-surface)';
      element.appendChild(surfaceProbe);
      const expected = getComputedStyle(surfaceProbe).backgroundColor;
      surfaceProbe.remove();
      return { actual: getComputedStyle(element).backgroundColor, expected };
    });
    const light = await inspect();
    expect(light.actual).toBe(light.expected);
    await page.getByTestId('tools-menu-toggle').click();
    await page.getByTestId('theme-toggle').click();
    await expect(page.locator('.app.theme-dark')).toBeVisible();
    const dark = await inspect();
    expect(dark.actual).toBe(dark.expected);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByTestId('attention-filter-qualification')).toBeVisible();
    await page.getByTestId('attention-filter-qualification').click();
    await expect(page.getByTestId('capability-diagnostic-item').first()).toBeVisible();
    const horizontalOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(horizontalOverflow).toBeLessThanOrEqual(1);
  });
});

test.describe('Diagnostic métier des capacités', () => {
  test('sépare les applications cibles et les applications obsolètes dans les signaux', async ({ page }) => {
    await fresh(page);
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-attention').click();
    const panel = page.getByTestId('capability-diagnostic');
    await expect(panel).toContainText('Gestion des Offres & Devis');
    await expect(panel).toContainText('obsolète');
    await expect(panel).toContainText('Aucune application actuelle reliée');
  });

  test('compare une référence JSON sans remplacer la cartographie active', async ({ page }) => {
    await fresh(page);
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-attention').click();
    await page.getByTestId('attention-reference-toggle').click();
    const reference = {
      schemaVersion: 3,
      domains: [{ id: 'r-domain', code: 'CAP-CRM', name: 'Relation & Engagement Client' }],
      capabilities: [{ id: 'r-cap', domainId: 'r-domain', code: 'CRM-99', name: 'Gestion des abonnements' }],
      applications: [],
    };
    await page.getByTestId('capability-reference-import').setInputFiles({
      name: 'reference.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(reference)),
    });
    await expect(page.getByTestId('reference-missing-capabilities')).toContainText('Gestion des abonnements');
    await page.getByRole('button', { name: 'Retirer la référence' }).click();
    await expect(page.getByTestId('reference-missing-capabilities')).toHaveCount(0);
    await page.getByTestId('dashboard-view-overview').click();
    await expect(page.getByTestId('dashboard-coverage-rate')).toBeVisible();
  });
});

test.describe('Revue de décisions et scénarios de transformation', () => {
  // These tests mock a remote reference. Allow page.route to intercept the fetch,
  // rather than letting the PWA service worker own the request.
  test.use({ serviceWorkers: 'block' });

  test('simule le retrait d’une application sans modifier les relations et exporte la revue', async ({ page }) => {
    await fresh(page);
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-attention').click();
    const review = page.getByTestId('capability-decision-review');
    await expect(review).toContainText('Préparer une revue de décisions');
    await page.getByTestId('retirement-application').selectOption('app-1');
    await expect(page.getByTestId('retirement-scenario')).toContainText('Gestion des Prospects & Leads');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('download-decision-review').click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe('capability-decision-review.md');
    await page.reload();
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-overview').click();
    await expect(page.getByTestId('dashboard-coverage-rate')).toBeVisible();
  });

  test('charge la référence via une URL GitHub compatible JSON brut sans remplacer la carte', async ({ page }) => {
    await fresh(page);
    const reference = {
      schemaVersion: 3,
      domains: [{ id: 'domain-reference', code: 'CAP-CRM', name: 'Relation client' }],
      capabilities: [{ id: 'cap-reference', domainId: 'domain-reference', code: 'CRM-99', name: 'Gestion des abonnements' }],
      applications: [],
    };
    await page.route('https://raw.githubusercontent.com/Sims07/test-capabilities/main/reference.json', route =>
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(reference) }));
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-attention').click();
    await page.getByTestId('attention-reference-toggle').click();
    await page.getByTestId('capability-reference-url').fill('https://github.com/Sims07/test-capabilities/blob/main/reference.json');
    await page.getByTestId('capability-reference-load-url').click();
    const referenceError = page.getByTestId('capability-diagnostic').getByRole('alert');
    if (await referenceError.isVisible()) throw new Error('Chargement référence: ' + await referenceError.innerText());
    await expect(page.getByTestId('reference-missing-capabilities')).toContainText('Gestion des abonnements');
    await page.getByTestId('dashboard-view-overview').click();
    await expect(page.getByTestId('dashboard-coverage-rate')).toBeVisible();
  });
});

test('ne compte pas une application uniquement cible dans la couverture actuelle', async ({ page }) => {
  await fresh(page);
  await page.getByTestId('map-more-actions').locator('summary').click();
  await page.getByTestId('map-inventory-toggle').click();
  const application = page.locator('.app-item').filter({ hasText: 'Salesforce CRM' });
  await application.getByRole('button', { name: 'Modifier Salesforce CRM' }).click();
  const dialog = page.getByRole('dialog', { name: 'Modifier l’application' });
  await dialog.getByLabel('Statut').selectOption('Cible');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();
  await page.getByTestId('nav-analysis').click();
  await expect(page.getByTestId('dashboard-gap-count')).toHaveText('3');
  await page.getByTestId('tab-relations').click();
  await expect(page.locator('.tree-summary')).toContainText('3 gaps');
  const capability = page.locator('.tree-node-cap').filter({ hasText: 'Gestion des Prospects & Leads' });
  await expect(capability).toContainText('Gap');
  await expect(capability).toContainText('1 cible(s)');
});


test.describe('PWA — disparition de bundles hashés après déploiement', () => {
  test('récupère automatiquement un nouvel index si le bundle applicatif répond 404 une fois', async ({ page }) => {
    let missingBundleCount = 0;
    await page.route('**/assets/app-*.js', async route => {
      if (missingBundleCount === 0) {
        missingBundleCount++;
        await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Previous release bundle removed' });
      } else {
        await route.continue();
      }
    });

    await page.goto('/');
    await expect(page.getByTestId('capability-map')).toBeVisible({ timeout: 20000 });
    expect(missingBundleCount).toBe(1);
    await expect.poll(() => page.evaluate(() => sessionStorage.getItem('ecm:missing-bundle-retry'))).toBeNull();
    await expect.poll(() => page.url()).not.toContain('ecm_refresh');
  });

  test('arrête la relance automatique si la ressource reste absente et propose une reprise manuelle', async ({ page }) => {
    let missingBundleCount = 0;
    await page.route('**/assets/app-*.js', async route => {
      missingBundleCount++;
      await route.fulfill({ status: 404, contentType: 'text/plain', body: 'Missing release bundle' });
    });
    await page.goto('/');
    await expect(page.getByText(/Une ressource de l'application n'est plus disponible/)).toBeVisible({ timeout: 20000 });
    await expect(page.getByRole('button', { name: 'Recharger l’application' })).toBeVisible();
    expect(missingBundleCount).toBe(2);
  });
});

test.describe('Analyse des risques applicatifs', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page);
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-risk').click();
  });

  test('qualifie un risque, conserve la décision et exporte les capacités concernées', async ({ page }) => {
    await expect(page.getByTestId('risk-analysis')).toBeVisible();
    const entry = page.getByTestId('risk-application-app-1');
    await expect(entry).toContainText('À qualifier');
    await entry.getByRole('button', { name: 'Évaluer le risque de Salesforce CRM' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Probabilité (1 à 5)').selectOption('5');
    await dialog.getByRole('button', { name: 'Enregistrer le risque' }).click();
    await expect(dialog.getByRole('alert')).toContainText('Renseignez ensemble');
    await dialog.getByLabel('Impact métier (1 à 5)').selectOption('4');
    await dialog.getByLabel('Catégorie du risque').selectOption('security');
    await dialog.getByLabel(/^Fin de support/).fill('2026-01-01');
    await dialog.getByLabel('Justification et éléments constatés').fill('Défaillance impactant les ventes');
    await dialog.getByLabel(/^Responsable/).fill('RSSI');
    await dialog.getByLabel('Plan d’action ou action réalisée').fill('Migrer la plateforme');
    await dialog.getByRole('button', { name: 'Enregistrer le risque' }).click();
    await expect(dialog).not.toBeVisible();
    await expect(entry).toContainText('Critique');
    await expect(entry).toContainText('20/25');
    await expect(entry).toContainText('Échéance atteinte');
    await expect(entry).toContainText('Gestion des Prospects');
    await page.screenshot({ path: 'test-results/risk-analysis-qualified.png', fullPage: true, animations: 'disabled' });
    await page.reload();
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-risk').click();
    await expect(entry).toContainText('Migrer la plateforme');
    await page.getByLabel('Afficher les risques').selectOption('urgent');
    await expect(entry).toBeVisible();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Exporter l’analyse' }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    let content = '';
    for await (const chunk of stream!) content += chunk.toString();
    expect(content).toContain('Salesforce CRM');
    expect(content).toContain('Gestion des Prospects');
    expect(content).toContain('20/25');
    await assertNoHorizontalOverflow(page);
  });

  test('garde les risques acceptés visibles et retire les risques résolus de la file', async ({ page }) => {
    const entry = page.getByTestId('risk-application-app-1');
    await entry.getByRole('button', { name: 'Évaluer le risque de Salesforce CRM' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Probabilité (1 à 5)').selectOption('5');
    await dialog.getByLabel('Impact métier (1 à 5)').selectOption('5');
    await dialog.getByLabel('Décision de traitement').selectOption('accepted');
    await dialog.getByLabel(/^Responsable/).fill('DSI');
    await dialog.getByLabel('Date de réexamen').fill('2099-01-01');
    await dialog.getByLabel('Justification et éléments constatés').fill('Accepté par la DSI');
    await dialog.getByRole('button', { name: 'Enregistrer le risque' }).click();
    await expect(entry).toContainText('Critique');
    await expect(entry).toContainText('Accepté');
    await page.getByLabel('Afficher les risques').selectOption('urgent');
    await expect(entry).not.toBeVisible();
    await page.getByLabel('Afficher les risques').selectOption('accepted');
    await entry.getByRole('button', { name: 'Évaluer le risque de Salesforce CRM' }).click();
    await dialog.getByLabel('Décision de traitement').selectOption('resolved');
    await dialog.getByLabel('Plan d’action ou action réalisée').fill('Migration vérifiée');
    await dialog.getByRole('button', { name: 'Enregistrer le risque' }).click();
    await page.getByLabel('Afficher les risques').selectOption('resolved');
    await expect(entry).toContainText('Migration vérifiée');
    await expect(entry).toContainText('niveau initial : Critique');
    await expect(page.getByTestId('risk-application-app-4')).not.toBeVisible();
  });

  test('reste utilisable en thème sombre et en écran étroit', async ({ page }) => {
    await openTools(page);
    await page.getByTestId('theme-toggle').click();
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('risk-analysis')).toBeVisible();
    await page.screenshot({ path: 'test-results/risk-analysis-dark.png', fullPage: true, animations: 'disabled' });
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await page.getByTestId('risk-application-app-1').getByRole('button', { name: 'Évaluer le risque de Salesforce CRM' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await assertNoHorizontalOverflow(page);
    await page.screenshot({ path: 'test-results/risk-analysis-mobile-form.png', animations: 'disabled' });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

test.describe('Processus métier et capacités', () => {
  test('crée, retrouve par capacité, modifie et supprime un processus avec persistance JSON', async ({ page }) => {
    await fresh(page);
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-processes').click();
    await expect(page.getByTestId('business-processes')).toContainText('Ajoutez votre premier processus');
    await page.getByRole('button', { name: 'Ajouter un processus', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Nom du processus/).fill('   ');
    await dialog.getByRole('button', { name: 'Enregistrer le processus' }).click();
    await expect(dialog.getByText('Renseignez un nom de processus.')).toBeVisible();
    await dialog.getByLabel(/^Nom du processus/).fill('Traiter une commande client');
    await dialog.getByLabel('Responsable du processus').fill('Direction commerciale');
    await dialog.getByLabel('Code du processus').fill('P-COM');
    await dialog.getByLabel('Description du processus').fill('De la commande à la facturation');
    await dialog.getByLabel(/^Lien de documentation/).fill('https://example.org/procedure');
    await dialog.getByRole('checkbox', { name: 'Gestion des Prospects & Leads', exact: true }).check();
    await dialog.getByRole('checkbox', { name: 'Facturation & Recouvrement', exact: true }).check();
    await dialog.getByRole('button', { name: 'Enregistrer le processus' }).click();
    await expect(dialog).not.toBeVisible();
    const register = page.getByTestId('business-processes');
    await expect(register).toContainText('Traiter une commande client');
    await expect(register).toContainText('Direction commerciale');
    await register.locator('summary').filter({ hasText: 'application(s) actuelle(s)' }).click();
    await expect(register).toContainText('Salesforce CRM');
    await expect(register).toContainText('SAP S/4HANA Finance');
    await expect(register).toContainText('Odoo Invoice');
    await page.getByLabel('Filtrer par capacité').selectOption('l1-9');
    await expect(register).toContainText('Aucun processus ne correspond');
    await page.getByLabel('Filtrer par capacité').selectOption('l1-5');
    await expect(register.getByRole('heading', { name: 'Traiter une commande client' })).toBeVisible();
    await page.screenshot({ path: 'test-results/business-processes-light.png', animations: 'disabled' });
    await page.reload();
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-processes').click();
    await expect(register).toContainText('Traiter une commande client');
    await register.getByRole('button', { name: 'Modifier le processus Traiter une commande client' }).click();
    await dialog.getByLabel(/^Nom du processus/).fill('Traiter et facturer une commande');
    await dialog.getByRole('button', { name: 'Enregistrer le processus' }).click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('enterprise-capacity-mapper:model:v3') || '{}').businessProcesses?.[0]?.name)).toBe('Traiter et facturer une commande');
    const persisted = await page.evaluate(() => JSON.parse(localStorage.getItem('enterprise-capacity-mapper:model:v3') || '{}'));
    expect(persisted.businessProcesses[0].name).toBe('Traiter et facturer une commande');
    expect(persisted.businessProcesses[0].capabilityIds).toEqual(['l1-1', 'l1-5']);
    await register.getByRole('button', { name: 'Supprimer le processus Traiter et facturer une commande' }).click();
    await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(register).toContainText('Traiter et facturer une commande');
    await register.getByRole('button', { name: 'Supprimer le processus Traiter et facturer une commande' }).click();
    await dialog.getByRole('button', { name: 'Confirmer la suppression' }).click();
    await expect(register).toContainText('Ajoutez votre premier processus');
    await assertNoHorizontalOverflow(page);
  });

  test('affiche l’exposition indirecte et gère les processus sans rattachement en mobile sombre', async ({ page }) => {
    await fresh(page);
    await expect(page.getByTestId('nav-analysis')).toBeVisible();
    await page.evaluate(() => {
      const model = JSON.parse(localStorage.getItem('enterprise-capacity-mapper:model:v3') || '{}');
      model.businessProcesses = [{ id: 'order', name: 'Traiter une commande', capabilityIds: ['l1-1'] }, { id: 'draft', name: 'Processus à instruire', capabilityIds: [] }];
      model.applications.find(app => app.id === 'app-1').risk = { likelihood: 5, impact: 5, status: 'accepted', owner: 'DSI', rationale: 'Décision de revue', dueDate: '2099-01-01' };
      localStorage.setItem('enterprise-capacity-mapper:model:v3', JSON.stringify(model));
    });
    await page.reload();
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-processes').click();
    await expect(page.getByTestId('business-process-order')).toContainText('Exposition indirecte');
    await expect(page.getByTestId('business-process-order')).toContainText('Risque accepté');
    await page.getByLabel('Afficher les processus').selectOption('unlinked');
    await expect(page.getByTestId('business-process-draft')).toBeVisible();
    await expect(page.getByTestId('business-process-order')).not.toBeVisible();
    await openTools(page);
    await page.getByTestId('theme-toggle').click();
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 390, height: 844 });
    await assertNoHorizontalOverflow(page);
    await page.getByTestId('business-process-draft').getByRole('button', { name: 'Modifier le processus Processus à instruire' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: 'test-results/business-processes-mobile-dark.png', animations: 'disabled' });
    await assertNoHorizontalOverflow(page);
    await page.keyboard.press('Escape');
    await page.getByLabel('Afficher les processus').selectOption('exposed');
    await page.getByRole('button', { name: 'Examiner les risques applicatifs' }).click();
    await expect(page.getByTestId('risk-analysis')).toBeVisible();
  });
});

test.describe('Processus métier sous le chemin GitHub Pages', () => {
  test.use({ serviceWorkers: 'block' });
  test('charge le module différé et ouvre la fiche depuis un sous-chemin', async ({ page }) => {
    await page.route('**/enterprise-capacity-mapper/**', async route => {
      const url = new URL(route.request().url());
      url.pathname = url.pathname.replace('/enterprise-capacity-mapper', '');
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    });
    await page.goto('/enterprise-capacity-mapper/');
    await page.getByTestId('nav-analysis').click();
    await page.getByTestId('dashboard-view-processes').click();
    await expect(page.getByTestId('business-processes')).toBeVisible();
    await page.getByRole('button', { name: 'Ajouter un processus', exact: true }).click();
    await expect(page.getByRole('dialog').getByRole('checkbox', { name: 'Gestion des Prospects & Leads', exact: true })).toBeVisible();
  });
});
