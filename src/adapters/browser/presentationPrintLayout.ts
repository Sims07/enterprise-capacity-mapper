/**
 * Adaptateur de restitution imprimée : gèle la géométrie réellement projetée.
 *
 * Le moteur d'impression (notamment WebKit) peut reconstruire CSS Grid avec
 * une largeur implicite différente de celle de l'écran. Les N0 passent alors
 * à une seule colonne et les N1 deviennent des lignes écrasées.
 *
 * Ici seules les positions visuelles sont figées ; aucune donnée métier n'est
 * changée et les mêmes éléments restent vectoriels/sélectionnables en PDF.
 */
const CSS_PIXELS_PER_INCH = 96;

export const PRESENTATION_PRINT_PAGE = Object.freeze({
  width: 16 * CSS_PIXELS_PER_INCH,
  height: 9 * CSS_PIXELS_PER_INCH,
});

const PRINT_STYLE_PROPERTIES = [
  '--presentation-print-x',
  '--presentation-print-y',
  '--presentation-print-width',
  '--presentation-print-height',
] as const;

const setPrintBounds = (element: HTMLElement, origin: DOMRect, bounds: DOMRect): void => {
  const values = [
    bounds.left - origin.left,
    bounds.top - origin.top,
    bounds.width,
    bounds.height,
  ];
  PRINT_STYLE_PROPERTIES.forEach((name, index) => {
    element.style.setProperty(name, `${values[index]}px`);
  });
};

export function calculatePresentationPrintFit(
  bounds: { width: number; height: number },
): { scale: number; offsetX: number; offsetY: number } | null {
  if (!Number.isFinite(bounds.width) || !Number.isFinite(bounds.height)
    || bounds.width <= 0 || bounds.height <= 0) return null;
  const scale = Math.min(
    PRESENTATION_PRINT_PAGE.width / bounds.width,
    PRESENTATION_PRINT_PAGE.height / bounds.height,
  );
  return {
    scale,
    offsetX: (PRESENTATION_PRINT_PAGE.width - bounds.width * scale) / 2,
    offsetY: (PRESENTATION_PRINT_PAGE.height - bounds.height * scale) / 2,
  };
}

/**
 * Le clone imprimable vit directement dans body : aucun ancestor (workspace
 * fixe, main avec overflow:hidden, viewport du dialogue d'impression) ne
 * peut rogner une portion de la mosaïque. Les dimensions restent celles de
 * la capture de l'écran, avec un ajustement uniforme sur la feuille 16:9.
 *
 * Cette surface ne participe pas à React ni à l'accessibilité écran. On
 * retire ids/testids du clone pour conserver l'unicité des sélecteurs.
 */
const PRINT_SHEET_CLASS = 'presentation-print-sheet';
const PRINT_READY_CLASS = 'presentation-print-ready';

const synchronizePresentationPrintSheet = (map: HTMLElement): void => {
  const documentObject = map.ownerDocument;
  const app = map.closest<HTMLElement>('.app.mosaic-presentation-mode');
  if (!app || !documentObject.body) return;

  let sheet = documentObject.body.querySelector<HTMLElement>(
    ':scope > .presentation-print-sheet',
  );
  if (!sheet) {
    sheet = documentObject.createElement('div');
    documentObject.body.appendChild(sheet);
  }

  sheet.className = `${app.className} ${PRINT_SHEET_CLASS}`;
  sheet.setAttribute('aria-hidden', 'true');
  sheet.style.cssText = app.style.cssText;
  for (const name of ['data-ui-experience', 'data-presentation-reading']) {
    const value = app.getAttribute(name);
    if (value === null) sheet.removeAttribute(name);
    else sheet.setAttribute(name, value);
  }

  const printedMap = map.cloneNode(true) as HTMLElement;
  printedMap.removeAttribute('data-testid');
  printedMap.removeAttribute('id');
  printedMap.querySelectorAll<HTMLElement>('[data-testid], [id]').forEach(element => {
    element.removeAttribute('data-testid');
    element.removeAttribute('id');
  });
  sheet.replaceChildren(printedMap);
  documentObject.body.classList.add(PRINT_READY_CLASS);
};

export function capturePresentationPrintLayout(map: HTMLElement): boolean {
  const bounds = map.getBoundingClientRect();
  const fit = calculatePresentationPrintFit(bounds);
  if (!fit) return false;

  map.style.setProperty('--presentation-print-width', `${bounds.width}px`);
  map.style.setProperty('--presentation-print-height', `${bounds.height}px`);
  map.style.setProperty('--presentation-print-scale', String(fit.scale));
  map.style.setProperty('--presentation-print-offset-x', `${fit.offsetX}px`);
  map.style.setProperty('--presentation-print-offset-y', `${fit.offsetY}px`);

  // Utiliser les rectangles en pixels de l'écran et non les numéros de piste :
  // le PDF n'a ainsi pas à recalculer grid-template-columns/rows.
  map.querySelectorAll<HTMLElement>(':scope > .mosaic-domain').forEach(domain => {
    setPrintBounds(domain, bounds, domain.getBoundingClientRect());

    const list = domain.querySelector<HTMLElement>('.caps-list');
    if (!list) return;
    const listBounds = list.getBoundingClientRect();
    list.querySelectorAll<HTMLElement>(':scope > .cap').forEach(capability => {
      setPrintBounds(capability, listBounds, capability.getBoundingClientRect());
    });
  });

  map.dataset.presentationPrintSnapshot = 'true';
  synchronizePresentationPrintSheet(map);
  return true;
}

const clearPrintBounds = (element: HTMLElement): void => {
  PRINT_STYLE_PROPERTIES.forEach(name => element.style.removeProperty(name));
};

export function clearPresentationPrintLayout(map: HTMLElement): void {
  delete map.dataset.presentationPrintSnapshot;
  [
    '--presentation-print-width',
    '--presentation-print-height',
    '--presentation-print-scale',
    '--presentation-print-offset-x',
    '--presentation-print-offset-y',
  ].forEach(name => map.style.removeProperty(name));

  map.querySelectorAll<HTMLElement>('.mosaic-domain, .caps-list > .cap')
    .forEach(clearPrintBounds);
  const documentObject = map.ownerDocument;
  documentObject.body.querySelector(':scope > .presentation-print-sheet')?.remove();
  documentObject.body.classList.remove(PRINT_READY_CLASS);
}

/** Capture initiale et mise à jour quand l'écran ou la mosaïque change. */
export function installPresentationPrintLayout(
  view: Window,
  findMap: () => HTMLElement | null,
): () => void {
  let frame: number | null = null;
  const isPrinting = () => view.matchMedia('print').matches;
  const capture = () => {
    frame = null;
    if (isPrinting()) return;
    const map = findMap();
    if (map) capturePresentationPrintLayout(map);
  };
  const scheduleCapture = () => {
    if (frame !== null || isPrinting()) return;
    frame = view.requestAnimationFrame(capture);
  };
  const resize = new ResizeObserver(scheduleCapture);
  const mutations = new MutationObserver(scheduleCapture);
  const map = findMap();

  if (map) {
    resize.observe(map);
    mutations.observe(map, { childList: true, subtree: true });
  }

  // Cmd/Ctrl+P fonctionne aussi : la dernière géométrie de l'écran est déjà
  // disponible avant que Safari/Chromium ne passent à leur média d'impression.
  const beforePrint = () => {
    if (map && !map.dataset.presentationPrintSnapshot) capturePresentationPrintLayout(map);
  };
  const afterPrint = () => scheduleCapture();
  view.addEventListener('resize', scheduleCapture);
  view.addEventListener('beforeprint', beforePrint);
  view.addEventListener('afterprint', afterPrint);
  scheduleCapture();

  return () => {
    if (frame !== null) view.cancelAnimationFrame(frame);
    resize.disconnect();
    mutations.disconnect();
    view.removeEventListener('resize', scheduleCapture);
    view.removeEventListener('beforeprint', beforePrint);
    view.removeEventListener('afterprint', afterPrint);
    if (map) clearPresentationPrintLayout(map);
  };
}
