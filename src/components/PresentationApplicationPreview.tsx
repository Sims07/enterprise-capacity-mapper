import { useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import type { Application } from '../domain/catalogModel.ts';
import { relationRoleFor } from '../domain/applicationRelations.ts';

// Les arrondis sous-pixel du navigateur ne doivent pas faire perdre un badge.
const LAYOUT_ROUNDING_TOLERANCE_PX = 1;

// Les paliers de projection sont définis dans le design system, pas dans le calcul.
const PRESENTATION_APPLICATION_FONT_TOKENS = [
  '--map-presentation-app-font-large',
  '--map-presentation-app-font-regular',
  '--map-presentation-app-font-small',
  '--map-presentation-app-font-min',
] as const;
const PRESENTATION_APPLICATION_FONT_OVERRIDE = '--presentation-app-font-size';

type Props = { applications: Application[]; targetId: string };

/**
 * Calcule les badges réellement logeables dans chaque N1 (largeur et hauteur).
 * Le miroir invisible utilise les mêmes styles que les badges affichés :
 * aucune limite globale de deux applications, aucune hauteur devinée.
 */
export default function PresentationApplicationPreview({ applications, targetId }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{ visibleCount: number; fontSize: number | null }>({
    visibleCount: applications.length,
    fontSize: null,
  });

  useLayoutEffect(() => {
    const preview = previewRef.current;
    const measure = measureRef.current;
    const card = preview?.closest('.cap');
    const heading = card?.querySelector('.cap-head');
    if (!preview || !measure || !card || !applications.length) return undefined;

    const chips = Array.from(measure.querySelectorAll<HTMLElement>('.presentation-app-measure-chip'));
    const more = measure.querySelector<HTMLElement>('.presentation-app-measure-more');
    if (!more) return undefined;

    const update = () => {
      const availableWidth = preview.clientWidth;
      const availableHeight = preview.clientHeight;
      if (availableWidth === 0 || availableHeight === 0) return;

      // Le maximum est essayé en premier. Si toutes les applications ne
      // tiennent pas, on privilégie le nombre de noms réellement lisibles,
      // puis la plus grande police à nombre de noms égal.
      const style = getComputedStyle(preview);
      const fontSizes = PRESENTATION_APPLICATION_FONT_TOKENS
        .map(token => Number.parseFloat(style.getPropertyValue(token)))
        .filter(fontSize => Number.isFinite(fontSize) && fontSize > 0);
      if (!fontSizes.length) return;

      measure.style.width = `${availableWidth}px`;
      const columnGap = Number.parseFloat(style.columnGap) || 0;
      const rowGap = Number.parseFloat(style.rowGap) || 0;
      let bestVisibleCount = -1;
      let bestFontSize = fontSizes[fontSizes.length - 1];

      for (const fontSize of fontSizes) {
        measure.style.setProperty(PRESENTATION_APPLICATION_FONT_OVERRIDE, `${fontSize}px`);
        const chipSizes = chips.map(chip => chip.getBoundingClientRect());

        const fits = (count: number) => {
          const remaining = applications.length - count;
          more.textContent = remaining ? `+${remaining} autres` : '';
          const moreSize = more.getBoundingClientRect();
          const boxes = chipSizes.slice(0, count).map(box => ({ width: box.width, height: box.height }));
          if (remaining) boxes.push({ width: moreSize.width, height: moreSize.height });

          let usedWidth = 0;
          let usedHeight = 0;
          let lineHeight = 0;
          for (const item of boxes) {
            if (usedWidth && usedWidth + columnGap + item.width > availableWidth + LAYOUT_ROUNDING_TOLERANCE_PX) {
              usedHeight += lineHeight + rowGap;
              usedWidth = 0;
              lineHeight = 0;
            }
            usedWidth += (usedWidth ? columnGap : 0) + item.width;
            lineHeight = Math.max(lineHeight, item.height);
          }
          return usedHeight + lineHeight <= availableHeight + LAYOUT_ROUNDING_TOLERANCE_PX;
        };

        let count = applications.length;
        while (count >= 0 && !fits(count)) count -= 1;
        if (count > bestVisibleCount) {
          bestVisibleCount = count;
          bestFontSize = fontSize;
        }
        if (count === applications.length) break;
      }

      const visibleCount = Math.max(0, bestVisibleCount);
      setLayout(previous => previous.visibleCount === visibleCount && previous.fontSize === bestFontSize
        ? previous : { visibleCount, fontSize: bestFontSize });
    };

    const observer = new ResizeObserver(update);
    observer.observe(preview);
    observer.observe(card);
    if (heading) observer.observe(heading);
    update();
    return () => observer.disconnect();
  }, [applications]);

  const fontStyle = layout.fontSize === null ? undefined
    : { [PRESENTATION_APPLICATION_FONT_OVERRIDE]: `${layout.fontSize}px` } as CSSProperties;

  if (!applications.length) {
    return <div className="presentation-app-preview" aria-label="Applications rattachées">
      <span className="presentation-app-empty">Aucune application reliée</span>
    </div>;
  }

  return <>
    <div ref={previewRef} className="presentation-app-preview" aria-label="Applications rattachées"
      data-testid="presentation-app-preview" data-visible-count={layout.visibleCount} style={fontStyle}>
      {applications.slice(0, layout.visibleCount).map(application => (
        <span key={application.id}
          className={relationRoleFor(application, targetId) === 'target'
            ? 'presentation-app-chip is-target'
            : relationRoleFor(application, targetId) === 'both' ? 'presentation-app-chip is-maintained' : 'presentation-app-chip'}
          title={`${application.name} · ${relationRoleFor(application, targetId) === 'both' ? 'Actuelle et cible' : relationRoleFor(application, targetId) === 'target' ? 'Cible' : 'Actuelle'}`}>
          {application.name}{relationRoleFor(application, targetId) === 'target' && <em>cible</em>}
          {relationRoleFor(application, targetId) === 'both' && <em>maintenue</em>}
        </span>
      ))}
      {layout.visibleCount < applications.length &&
        <span className="presentation-app-more">+{applications.length - layout.visibleCount} autres</span>}
    </div>
    <div ref={measureRef} className="presentation-app-measure" aria-hidden="true" style={fontStyle}>
      {applications.map(application => <span key={application.id}
        className={relationRoleFor(application, targetId) === 'target'
          ? 'presentation-app-measure-chip is-target' : 'presentation-app-measure-chip'}>
        {application.name}{relationRoleFor(application, targetId) === 'target' && <em>cible</em>}
        {relationRoleFor(application, targetId) === 'both' && <em>maintenue</em>}
      </span>)}
      <span className="presentation-app-measure-more" />
    </div>
  </>;
}
