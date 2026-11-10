import { useLayoutEffect, useRef, useState } from 'react';
import type { Application } from '../domain/catalogModel.ts';
import { relationRoleFor } from '../domain/applicationRelations.ts';

// Les arrondis sous-pixel du navigateur ne doivent pas faire perdre un badge.
const LAYOUT_ROUNDING_TOLERANCE_PX = 1;

type Props = { applications: Application[]; targetId: string };

/**
 * Calcule les badges réellement logeables dans chaque N1 (largeur et hauteur).
 * Le miroir invisible utilise les mêmes styles que les badges affichés :
 * aucune limite globale de deux applications, aucune hauteur devinée.
 */
export default function PresentationApplicationPreview({ applications, targetId }: Props) {
  const previewRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(applications.length);

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

      // Même espace de mesure que la vraie zone d'aperçu.
      measure.style.width = `${availableWidth}px`;
      const chipSizes = chips.map(chip => chip.getBoundingClientRect());
      const style = getComputedStyle(preview);
      const columnGap = Number.parseFloat(style.columnGap) || 0;
      const rowGap = Number.parseFloat(style.rowGap) || 0;

      const fits = (count: number) => {
        const remaining = applications.length - count;
        more.textContent = remaining ? `+${remaining} autres` : '';
        const moreSize = more.getBoundingClientRect();
        const widths = chipSizes.slice(0, count).map(box => ({ width: box.width, height: box.height }));
        if (remaining) widths.push({ width: moreSize.width, height: moreSize.height });

        let usedWidth = 0;
        let usedHeight = 0;
        let lineHeight = 0;
        for (const item of widths) {
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

      // Tester aussi le badge « +N autres » : il doit tenir dans la carte et
      // ne jamais masquer un dernier nom d'application.
      let count = applications.length;
      while (count > 0 && !fits(count)) count -= 1;
      setVisibleCount(previous => previous === count ? previous : count);
    };

    const observer = new ResizeObserver(update);
    observer.observe(preview);
    observer.observe(card);
    if (heading) observer.observe(heading);
    update();
    return () => observer.disconnect();
  }, [applications]);

  if (!applications.length) {
    return <div className="presentation-app-preview" aria-label="Applications rattachées">
      <span className="presentation-app-empty">Aucune application reliée</span>
    </div>;
  }

  return <>
    <div ref={previewRef} className="presentation-app-preview" aria-label="Applications rattachées"
      data-testid="presentation-app-preview" data-visible-count={visibleCount}>
      {applications.slice(0, visibleCount).map(application => (
        <span key={application.id}
          className={relationRoleFor(application, targetId) === 'target'
            ? 'presentation-app-chip is-target'
            : relationRoleFor(application, targetId) === 'both' ? 'presentation-app-chip is-maintained' : 'presentation-app-chip'}
          title={`${application.name} · ${relationRoleFor(application, targetId) === 'both' ? 'Actuelle et cible' : relationRoleFor(application, targetId) === 'target' ? 'Cible' : 'Actuelle'}`}>
          {application.name}{relationRoleFor(application, targetId) === 'target' && <em>cible</em>}
          {relationRoleFor(application, targetId) === 'both' && <em>maintenue</em>}
        </span>
      ))}
      {visibleCount < applications.length &&
        <span className="presentation-app-more">+{applications.length - visibleCount} autres</span>}
    </div>
    <div ref={measureRef} className="presentation-app-measure" aria-hidden="true">
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
