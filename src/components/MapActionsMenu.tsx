import React, { useEffect, useRef } from 'react';

type MapActionsMenuProps = {
  children: React.ReactNode;
  onDismiss?: () => void;
};

/**
 * Regroupe les commandes secondaires de la mosaïque.
 * Les commandes sont des boutons natifs : Tab, Entrée et Espace continuent de fonctionner.
 * data-map-menu-close est réservé aux commandes qui ouvrent une autre surface.
 */
export default function MapActionsMenu({ children, onDismiss }: MapActionsMenuProps) {
  const rootRef = useRef<HTMLDetailsElement>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    const dismissOutside = (event: PointerEvent) => {
      const root = rootRef.current;
      if (!root?.open || root.contains(event.target as Node)) return;
      root.open = false;
      dismissRef.current?.();
    };
    document.addEventListener('pointerdown', dismissOutside);
    return () => document.removeEventListener('pointerdown', dismissOutside);
  }, []);

  return <details ref={rootRef} className="map-actions-menu" data-testid="map-more-actions"
    onKeyDown={event => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.open = false;
      dismissRef.current?.();
      event.currentTarget.querySelector('summary')?.focus();
    }}
    onClick={event => {
      const target = event.target;
      if (!(target instanceof Element) || !target.closest('[data-map-menu-close]')) return;
      event.currentTarget.open = false;
      dismissRef.current?.();
      event.currentTarget.querySelector('summary')?.focus();
    }}>
    <summary aria-label="Ouvrir les options de la cartographie">
      <span aria-hidden="true">⋯</span> Options
    </summary>
    <div className="map-actions-menu-panel" role="group" aria-label="Actions secondaires de la cartographie">
      {children}
    </div>
  </details>;
}
