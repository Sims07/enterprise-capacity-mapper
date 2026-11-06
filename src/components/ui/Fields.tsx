import React, { useId } from 'react';

/** Champs du design system Signal, utilisés aussi par l'éditeur métier. */
type FieldBase = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
};

const describedBy = (id: string, hint?: string, error?: string, custom?: string) =>
  [custom, hint ? id + '-hint' : undefined, error ? id + '-error' : undefined].filter(Boolean).join(' ') || undefined;

function FieldLabel({ label, required }: Pick<FieldBase, 'label' | 'required'>) {
  return <span>{label}{required && <b className="required" aria-hidden="true"> *</b>}</span>;
}

function FieldHelp({ id, hint, error }: { id: string; hint?: string; error?: string }) {
  return <>
    {hint && <small className="ds-field-hint" id={id + '-hint'}>{hint}</small>}
    {error && <small className="field-error" id={id + '-error'}>{error}</small>}
  </>;
}

export type FieldProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'children'> & FieldBase;

export function Field({ label, required = false, error, hint, id, className, 'aria-describedby': ariaDescribedBy, ...props }: FieldProps) {
  const generated = useId();
  const controlId = id || generated;
  return <label className={['field', error && 'has-error', className].filter(Boolean).join(' ')}>
    <FieldLabel label={label} required={required} />
    <input {...props} id={controlId} required={required} aria-required={required} aria-invalid={!!error}
      aria-describedby={describedBy(controlId, hint, error, ariaDescribedBy)} />
    <FieldHelp id={controlId} hint={hint} error={error} />
  </label>;
}

export type SelectFieldProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> &
  FieldBase & { options: ReadonlyArray<{ value: string; label: string; disabled?: boolean }> };

export function SelectField({ label, required = false, error, hint, id, options, className, 'aria-describedby': ariaDescribedBy, ...props }: SelectFieldProps) {
  const generated = useId();
  const controlId = id || generated;
  return <label className={['field', error && 'has-error', className].filter(Boolean).join(' ')}>
    <FieldLabel label={label} required={required} />
    <select {...props} id={controlId} required={required} aria-required={required} aria-invalid={!!error}
      aria-describedby={describedBy(controlId, hint, error, ariaDescribedBy)}>
      {options.map(option => <option key={option.value} value={option.value} disabled={option.disabled}>{option.label}</option>)}
    </select>
    <FieldHelp id={controlId} hint={hint} error={error} />
  </label>;
}

export type TextareaFieldProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldBase;

export function TextareaField({ label, required = false, error, hint, id, className, 'aria-describedby': ariaDescribedBy, ...props }: TextareaFieldProps) {
  const generated = useId();
  const controlId = id || generated;
  return <label className={['field', error && 'has-error', className].filter(Boolean).join(' ')}>
    <FieldLabel label={label} required={required} />
    <textarea {...props} id={controlId} required={required} aria-required={required} aria-invalid={!!error}
      aria-describedby={describedBy(controlId, hint, error, ariaDescribedBy)} />
    <FieldHelp id={controlId} hint={hint} error={error} />
  </label>;
}

export function CheckboxField({ label, hint, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & { label: string; hint?: string }) {
  return <label className="ds-check">
    <input {...props} type="checkbox" />
    <span>{label}{hint && <small>{hint}</small>}</span>
  </label>;
}

export function SwitchField({ label, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> & { label: string }) {
  return <label className="presentation-switch">
    <span>{label}</span>
    <input {...props} type="checkbox" aria-label={props['aria-label'] || label} />
    <span className="presentation-switch-track" aria-hidden="true"><span className="presentation-switch-thumb" /></span>
  </label>;
}
