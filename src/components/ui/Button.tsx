import React from 'react';

/**
 * Action Signal réutilisable. L'élément reste un véritable button (clavier, focus,
 * disabled, submit/reset, ARIA) ; les variantes sont des intentions sémantiques.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger' | 'icon';
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({ variant = 'secondary', type = 'button', className, ...props }: ButtonProps) {
  return <button {...props} type={type} className={['ds-button', `ds-button--${variant}`, className].filter(Boolean).join(' ')} />;
}
