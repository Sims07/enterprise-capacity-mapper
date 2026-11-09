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
