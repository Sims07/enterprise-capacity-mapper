import { expect, test } from '@playwright/test';

const fresh = async (page: Parameters<typeof test>[0]['page']) => {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
};

const openTools = async (page: Parameters<typeof test>[0]['page']) => {
  const menu = page.getByTestId('tools-menu');
  if (!(await menu.getAttribute('class'))?.includes('is-open')) {
    await page.getByTestId('tools-menu-toggle').click();
  }
};

const assertNoHorizontalOverflow = async (page: Parameters<typeof test>[0]['page']) => {
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
    await expect(page.getByTestId('recent-maps-count')).toContainText('0');
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

  test('affiche les outils et l’éditeur de structure', async ({ page }) => {
    await page.getByRole('button', { name: 'Structure' }).click();
    await expect(page.locator('.modal h2')).toContainText('Personnaliser la structure');
    await expect(page.locator('.modal .structure-section').first()).toBeVisible();
    await page.getByRole('button', { name: 'Annuler' }).click();
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
    await page.getByTestId('link-list').getByLabel('Odoo Invoice').check();
    await page.getByTestId('link-save').click();
    const node = page.locator('.tree-node-cap').filter({ hasText: 'Gestion des Prospects & Leads' });
    await expect(node).toContainText('Odoo Invoice');
    await expect(node).toContainText('Redondance');
    await page.getByRole('button', { name: 'Retirer Odoo Invoice de Gestion des Prospects & Leads' }).click();
    await expect(node).not.toContainText('Odoo Invoice');
  });

  test('conserve la sélection d’impact entre analyse, relations et cartographie', async ({ page }) => {
    await page.getByTestId('dashboard-view-impact').click();
    const selection = page.getByTestId('impact-view').getByRole('button', { name: /CRM-01 — Gestion des Prospects & Leads/ });
    await selection.click();
    await expect(selection).toHaveAttribute('aria-pressed', 'true');
    await page.getByTestId('tab-relations').click();
    await expect(page.locator('.tree-row.impact-highlight')).toContainText('Gestion des Prospects & Leads');
    await page.getByTestId('nav-cartography').click();
    await expect(page.locator('.cap.impact-selected')).toContainText('Gestion des Prospects & Leads');
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

  test('enregistre une cartographie locale et la restaure', async ({ page }) => {
    await openTools(page);
    await page.getByTestId('save-local-map').click();
    await page.getByTestId('local-map-name').fill('Playwright local');
    await page.locator('.modal').getByRole('button', { name: 'Enregistrer' }).click();
    await page.reload();
    await page.getByTestId('primary-library').click();
    await expect(page.getByTestId('saved-maps-list')).toContainText('Playwright local');
  });

  test('importe un modèle JSON et conserve sa structure après rechargement', async ({ page }) => {
    const model = await page.evaluate(() => {
      const raw = localStorage.getItem('enterprise-capacity-mapper:model:v3');
      if (!raw) throw new Error('demo model missing');
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
    await expect(page.locator('.cap').filter({ hasText: 'Gestion des Prospects & Leads — import vérifié' })).toBeVisible();
    await page.reload();
    await expect(page.locator('.cap').filter({ hasText: 'Gestion des Prospects & Leads — import vérifié' })).toBeVisible();
    await expect(page.locator('.map-cell').filter({ hasText: 'Relation & Engagement Client' })).toHaveAttribute('style', /grid-column: span 2/);
  });

  test('migre un ancien modèle local vers le schéma actuel', async ({ page }) => {
    await page.evaluate(() => {
      localStorage.removeItem('enterprise-capacity-mapper:model:v3');
      localStorage.setItem('ea_canvas_l0', JSON.stringify([{ id: 'legacy-domain', name: 'Domaine historique', code: 'LEG-0', description: 'Domaine migré', color: 'indigo' }]));
      localStorage.setItem('ea_canvas_l1', JSON.stringify([{ id: 'legacy-cap', name: 'Capacité historique', code: 'LEG-1', description: 'Capacité migrée', l0Id: 'legacy-domain' }]));
      localStorage.setItem('ea_canvas_apps', JSON.stringify([{ id: 'legacy-app', name: 'Application historique', code: 'LEG-APP', type: 'SaaS', status: 'Actif', vendor: 'Legacy', description: 'Application migrée', l1Id: 'legacy-cap' }]));
    });
    await page.reload();
    await expect(page.locator('.domain h3')).toContainText('Domaine historique');
    await expect(page.locator('.cap .map-cap-select')).toContainText('Capacité historique');
    await expect(page.evaluate(() => JSON.parse(localStorage.getItem('enterprise-capacity-mapper:model:v3') ?? 'null').schemaVersion)).toBe(3);
  });
});

test.describe('Playwright regression — companion', () => {
  test.beforeEach(async ({ page }) => {
    await fresh(page);
    await page.getByTestId('companion-launcher').click();
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
    await expect(page.evaluate(() => localStorage.getItem('companion-mascot'))).resolves.toBe('octopus');
  });
});
