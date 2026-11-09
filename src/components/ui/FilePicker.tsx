import React, { useId, useState } from 'react';

export type FilePickerProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & {
  /** Intitulé accessible et action visible sur le déclencheur. */
  label: string;
  /** Texte secondaire affiché sous le déclencheur tant qu'aucun fichier n'est choisi. */
  hint?: string;
  /** Le menu d'outils utilise la variante discrète ; les formulaires la variante secondaire. */
  variant?: 'secondary' | 'quiet';
  /** Classe du déclencheur (pour les menus contextuels préexistants). */
  className?: string;
  /** Icône optionnelle pour un déclencheur contextualisé. */
  leadingIcon?: React.ReactNode;
};

/**
 * Le véritable <input type="file"> demeure focusable au clavier et exploitable
 * par les tests d'import. Le libellé adopte la même primitive visuelle que Button.
 */
export function FilePicker({ label, hint, variant = 'secondary', className, leadingIcon, id, onChange, disabled, ...props }: FilePickerProps) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const [filename, setFilename] = useState('');

  return <div className="ds-file-picker">
    <label className={['ds-file-trigger', 'ds-button', `ds-button--${variant}`, disabled && 'is-disabled', className].filter(Boolean).join(' ')}>
      <input {...props} id={inputId} className="ds-file-picker-input" type="file" disabled={disabled}
        onChange={event => {
          setFilename(event.currentTarget.files?.[0]?.name || '');
          onChange?.(event);
        }} />
      <span aria-hidden="true" className="ds-file-picker-symbol">{leadingIcon ?? '↑'}</span>
      <span>{label}</span>
    </label>
    {(filename || hint) && <small className="ds-file-picker-detail" role="status">{filename || hint}</small>}
  </div>;
}
