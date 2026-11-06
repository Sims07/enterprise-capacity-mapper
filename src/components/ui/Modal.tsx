import React, { useEffect, useId } from 'react';

/** Dialog applicatif partagé : même structure et classes que les modales de l'éditeur. */
export function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const titleId = useId();
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={event => event.stopPropagation()}>
      <div className="modal-head">
        <h2 id={titleId}>{title}</h2>
        <button type="button" aria-label="Fermer la fenêtre" onClick={onClose}>×</button>
      </div>
      {children}
    </div>
  </div>;
}
