import { describe, expect, it } from 'vitest';
import { calculatePresentationPrintFit, PRESENTATION_PRINT_PAGE } from './presentationPrintLayout.ts';

describe('cadrage PDF de la présentation', () => {
  it('imprime sans réduction une présentation déjà au ratio A4 paysage', () => {
    expect(calculatePresentationPrintFit(PRESENTATION_PRINT_PAGE)).toEqual({
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });
  });

  it('exploite toute la largeur A4 pour une présentation 16:9 sans la déformer', () => {
    const screen = { width: 1536, height: 864 };
    const fit = calculatePresentationPrintFit(screen)!;
    expect(fit.scale).toBeCloseTo(PRESENTATION_PRINT_PAGE.width / screen.width);
    expect(fit.offsetX).toBeCloseTo(0);
    expect(fit.offsetY).toBeGreaterThan(0);
    expect(screen.width * fit.scale).toBeCloseTo(PRESENTATION_PRINT_PAGE.width);
    expect(screen.height * fit.scale + 2 * fit.offsetY).toBeCloseTo(PRESENTATION_PRINT_PAGE.height);
  });

  it('réduit uniformément les présentations panoramiques sans aplatir leur contenu', () => {
    const screen = { width: 1800, height: 1000 };
    const fit = calculatePresentationPrintFit(screen)!;
    expect(fit.scale).toBeCloseTo(PRESENTATION_PRINT_PAGE.width / screen.width);
    expect(fit.offsetX).toBeCloseTo(0);
    expect(fit.offsetY).toBeGreaterThan(0);
    expect(screen.width * fit.scale + 2 * fit.offsetX).toBeCloseTo(PRESENTATION_PRINT_PAGE.width);
    expect(screen.height * fit.scale + 2 * fit.offsetY).toBeCloseTo(PRESENTATION_PRINT_PAGE.height);
  });

  it('ne déforme pas les présentations hautes et conserve les marges horizontales', () => {
    const screen = { width: 1200, height: 1000 };
    const fit = calculatePresentationPrintFit(screen)!;
    expect(fit.scale).toBeCloseTo(PRESENTATION_PRINT_PAGE.height / screen.height);
    expect(fit.offsetY).toBeCloseTo(0);
    expect(fit.offsetX).toBeGreaterThan(0);
  });

  it('ignore les rectangles inexploitables', () => {
    expect(calculatePresentationPrintFit({ width: 0, height: 1000 })).toBeNull();
    expect(calculatePresentationPrintFit({ width: Number.NaN, height: 1000 })).toBeNull();
  });
});
