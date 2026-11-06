import React, { useEffect, useId, useRef } from 'react';
import { Button } from './Button.tsx';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not(:disabled)',
  'input:not(:disabled):not([type="hidden"])',
  'select:not(:disabled)',
  'textarea:not(:disabled)',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/**
 * Fenêtre accessible commune aux fiches métier et à Storybook.
 * Garde le focus dans la fenêtre et le rend au contrôle d'origine à la fermeture.
 */
export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  // Une sauvegarde ou un changement de saisie peut recréer onClose sans devoir réinitialiser le focus.
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const origin = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusables = () => Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      .filter(item => item.getClientRects().length > 0 && item.getAttribute('aria-hidden') !== 'true');

    const preferred = dialog.querySelector<HTMLElement>(
      'input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled)',
    );
    (preferred ?? focusables()[0] ?? dialog).focus();

    const onKey = (event: KeyboardEvent) => {
      // Un dialog secondaire ne doit pas fermer ou intercepter le focus d'un dialog supérieur.
      const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      if (dialogs[dialogs.length - 1] !== dialog) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (items.length === 0) {
        event.preventDefault();
        dialog.focus();
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && (active === first || active === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (origin?.isConnected) origin.focus();
    };
  }, []);

  return <div className="modal-backdrop" onClick={onClose}>
    <div ref={dialogRef} tabIndex={-1} className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId}
      onClick={event => event.stopPropagation()}>
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <Button variant="icon" aria-label="Fermer la fenêtre" onClick={onClose}>×</Button>
      </div>
      {children}
    </div>
  </div>;
}
