import { expect, test } from '../fixtures';

const PRINT_PAGE = { widthInches: 16, heightInches: 9 } as const;
const CSS_PIXELS_PER_INCH = 96;
const PDF_POINTS_PER_INCH = 72;

const PRINT_VIEWPORT = {
  width: PRINT_PAGE.widthInches * CSS_PIXELS_PER_INCH,
  height: PRINT_PAGE.heightInches * CSS_PIXELS_PER_INCH,
};

function verifyPresentationPdf(pdf: Buffer) {
  expect(pdf.subarray(0, 5).toString('ascii')).toBe('%PDF-');

  // Ces objets sont les dictionnaires de pages non compressés de Chromium ;
  // contrairement à une capture du DOM, ceci détecte une seconde page blanche.
  const contents = pdf.toString('latin1');
  const pageDictionaries = contents.match(/\/Type\s*\/Page\b/g) ?? [];
  expect(pageDictionaries).toHaveLength(1);

  const mediaBox = contents.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  expect(mediaBox, 'Le PDF doit déclarer les dimensions de la diapositive').not.toBeNull();
  expect(Number(mediaBox![1])).toBeCloseTo(PRINT_PAGE.widthInches * PDF_POINTS_PER_INCH, 0);
  expect(Number(mediaBox![2])).toBeCloseTo(PRINT_PAGE.heightInches * PDF_POINTS_PER_INCH, 0);
}

test('imprime une diapositive 16:9 identique à la disposition projetée', async ({ page }, testInfo) => {
  await page.setViewportSize(PRINT_VIEWPORT);
  await page.goto('/?view=presentation');

  const map = page.getByTestId('capability-map');
  await expect(map).toBeVisible();
  await expect(map.locator('.mosaic-domain')).not.toHaveCount(0);

  const measure = () => map.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const domain = element.querySelector<HTMLElement>('.mosaic-domain')!;
    const first = domain.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      firstX: first.x - rect.x,
      firstY: first.y - rect.y,
      firstWidth: first.width,
      firstHeight: first.height,
      domainSurface: getComputedStyle(domain.querySelector<HTMLElement>('.domain')!).backgroundColor,
      title: domain.querySelector('.domain-banner')?.textContent?.trim(),
    };
  });

  const screen = await measure();
  const sheet = page.locator('body > .presentation-print-sheet');
  await expect(sheet).toHaveCount(1);
  await expect(sheet).toBeHidden();
  await page.emulateMedia({ media: 'print' });

  // Ce sont les objets clonés SUR LA PAGE, pas le DOM original hors
  // impression : l'ancien test validait une géométrie pourtant coupée.
  await expect(map).toBeHidden();
  await expect(sheet).toBeVisible();
  const printedMap = sheet.locator('.map-mosaic');
  const printed = await printedMap.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const domain = element.querySelector<HTMLElement>('.mosaic-domain')!;
    const first = domain.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      firstX: first.x - rect.x,
      firstY: first.y - rect.y,
      firstWidth: first.width,
      firstHeight: first.height,
      domainSurface: getComputedStyle(domain.querySelector<HTMLElement>('.domain')!).backgroundColor,
      title: domain.querySelector('.domain-banner')?.textContent?.trim(),
    };
  });
  expect(printed).toEqual(screen);
  const paper = await sheet.boundingBox();
  expect(paper).not.toBeNull();
  expect(paper!.width).toBe(PRINT_VIEWPORT.width);
  expect(paper!.height).toBe(PRINT_VIEWPORT.height);
  await expect(page.locator('.presentation-exit-bar')).toBeHidden();
  await expect(page.locator('.presentation-focus-overlay')).toBeHidden();
  expect(await printedMap.evaluate(element => getComputedStyle(element).printColorAdjust)).toBe('exact');

  const pdf = await page.pdf({
    path: testInfo.outputPath('presentation-16-9.pdf'),
    preferCSSPageSize: true,
    printBackground: true,
  });
  verifyPresentationPdf(pdf);
});

test('conserve tous les N0 et les aperçus applicatifs dans le PDF d’une grande carte', async ({ page }, testInfo) => {
  const columnCount = 3;
  const rowCount = 7;
  const domainCount = columnCount * rowCount;
  const capabilityNames = [
    'Gestion du carnet de santé',
    'Gestion des applications de santé',
    'Gestion des retours des usagers',
    'Gestion des anomalies',
  ];

  await page.setViewportSize(PRINT_VIEWPORT);
  await page.goto('/');
  await expect.poll(() => page.evaluate(
    () => localStorage.getItem('enterprise-capacity-mapper:model:v3'),
  )).not.toBeNull();

  await page.evaluate(({ columnCount, rowCount, domainCount, capabilityNames }) => {
    const key = 'enterprise-capacity-mapper:model:v3';
    const model = JSON.parse(localStorage.getItem(key)!);
    const columns = Array.from({ length: columnCount }, (_, index) => ({
      id: `print-column-${index}`, name: `Colonne ${index + 1}`, order: index,
    }));
    const layers = Array.from({ length: rowCount }, (_, index) => ({
      id: `print-row-${index}`, name: `Ligne ${index + 1}`, order: index,
    }));
    model.layout = { ...model.layout, columns, layers };
    model.domains = Array.from({ length: domainCount }, (_, index) => ({
      id: `print-domain-${index}`,
      code: `DOM-${index}`,
      name: index === 0 ? 'Services de santé et parcours usager' : `Domaine métier ${index}`,
      color: 'indigo',
      layout: {
        columnId: columns[index % columnCount].id,
        layerId: layers[Math.floor(index / columnCount)].id,
      },
    }));
    // Un ordre de données différent des positions empêche un faux positif :
    // le PDF doit respecter les coordonnées métier, pas la liste des N0.
    model.domains.reverse();
    model.capabilities = [
      ...capabilityNames.map((name, index) => ({
        id: `print-cap-${index}`, code: `N1-${index}`, domainId: 'print-domain-0', name,
      })),
      ...Array.from({ length: domainCount - 1 }, (_, index) => ({
        id: `print-other-cap-${index}`, code: `N1-OTHER-${index}`,
        domainId: `print-domain-${index + 1}`, name: `Capacité métier ${index + 1}`,
      })),
    ];
    model.applications = capabilityNames.map((_, index) => ({
      id: `print-app-${index}`,
      name: ['Mon espace santé', 'Dossier médical partagé', 'Portail usager', 'Référentiel SI'][index],
      status: index === 1 ? 'Cible' : 'Actif',
      capabilityIds: [`print-cap-${index}`],
    }));
    localStorage.setItem(key, JSON.stringify(model));
  }, { columnCount, rowCount, domainCount, capabilityNames });

  await page.goto('/?view=presentation');
  await page.getByTestId('presentation-show-applications').check();

  const map = page.getByTestId('capability-map');
  await expect(map.locator('.mosaic-domain')).toHaveCount(domainCount);
  const firstDomain = map.locator('.mosaic-domain').filter({ hasText: 'Services de santé et parcours usager' });
  await expect(firstDomain.locator('.cap')).toHaveCount(capabilityNames.length);

  // Une carte 3 colonnes × 7 lignes doit impérativement garder ces trois
  // colonnes et les N1 à leur taille lors de l'impression native du navigateur.
  const measureGeometry = () => map.evaluate(element => {
    const root = element.getBoundingClientRect();
    const domains = Array.from(element.querySelectorAll<HTMLElement>(':scope > .mosaic-domain'));
    return {
      mapWidth: root.width,
      mapHeight: root.height,
      domains: domains.map(domain => {
        const rect = domain.getBoundingClientRect();
        const firstCapability = domain.querySelector<HTMLElement>('.cap');
        const firstBounds = firstCapability?.getBoundingClientRect();
        return {
          x: rect.left - root.left,
          y: rect.top - root.top,
          width: rect.width,
          height: rect.height,
          n1Height: firstBounds?.height ?? 0,
        };
      }),
    };
  });
  const screen = await measureGeometry();
  const COLUMN_TOLERANCE_PX = 2;
  expect(new Set(screen.domains.map(domain => Math.round(domain.x / COLUMN_TOLERANCE_PX))).size).toBe(columnCount);

  await expect(map).toHaveAttribute('data-presentation-print-snapshot', 'true');
  const sheet = page.locator('body > .presentation-print-sheet');
  await expect(sheet).toHaveCount(1);
  await expect(sheet).toBeHidden();
  await expect.poll(async () => sheet.locator('.mosaic-domain').count()).toBe(domainCount);

  // Une imprimante A4 ou un aperçu dimensionné différemment ne doivent pas
  // rogner la troisième colonne. Mesurer le SEUL arbre réellement imprimé.
  await page.emulateMedia({ media: 'print' });
  await expect(sheet).toBeVisible();
  const printedMap = sheet.locator('.map-mosaic');
  const printed = await printedMap.evaluate(element => {
    const root = element.getBoundingClientRect();
    return {
      mapWidth: root.width,
      mapHeight: root.height,
      domains: Array.from(element.querySelectorAll<HTMLElement>(':scope > .mosaic-domain')).map(domain => {
        const rect = domain.getBoundingClientRect();
        const n1 = domain.querySelector<HTMLElement>('.cap')?.getBoundingClientRect();
        return {
          x: rect.left - root.left,
          y: rect.top - root.top,
          width: rect.width,
          height: rect.height,
          n1Height: n1?.height ?? 0,
        };
      }),
    };
  });
  const scale = printed.mapWidth / screen.mapWidth;
  expect(scale).toBeGreaterThan(0);
  expect(printed.mapHeight).toBeCloseTo(screen.mapHeight * scale, 0);
  for (const [index, original] of screen.domains.entries()) {
    const current = printed.domains[index];
    expect(current.x).toBeCloseTo(original.x * scale, 0);
    expect(current.y).toBeCloseTo(original.y * scale, 0);
    expect(current.width).toBeCloseTo(original.width * scale, 0);
    expect(current.height).toBeCloseTo(original.height * scale, 0);
    expect(current.n1Height).toBeCloseTo(original.n1Height * scale, 0);
  }
  expect(new Set(printed.domains.map(domain => Math.round(domain.x / COLUMN_TOLERANCE_PX))).size).toBe(columnCount);
  const positions = await sheet.evaluate(element => {
    const paper = element.getBoundingClientRect();
    return Array.from(element.querySelectorAll<HTMLElement>('.mosaic-domain')).map(domain => {
      const { left, top, right, bottom } = domain.getBoundingClientRect();
      const tolerance = 2;
      return {
        visible: right > paper.left && bottom > paper.top
          && left >= paper.left - tolerance && top >= paper.top - tolerance
          && right <= paper.right + tolerance && bottom <= paper.bottom + tolerance,
        width: right - left,
        height: bottom - top,
      };
    });
  });
  expect(positions).toHaveLength(domainCount);
  expect(positions.every(position => position.visible && position.width > 0 && position.height > 0)).toBe(true);

  const firstApp = sheet.locator('.mosaic-domain').filter({
    hasText: 'Services de santé et parcours usager',
  }).locator('.cap').first();
  await expect(firstApp.locator(
    '.presentation-app-preview:visible, .presentation-app-compact:visible, .presentation-app-inline-count:visible',
  ).first()).toBeVisible();

  const pdf = await page.pdf({
    path: testInfo.outputPath('presentation-dense-applications.pdf'),
    preferCSSPageSize: true,
    printBackground: true,
  });
  verifyPresentationPdf(pdf);
});
