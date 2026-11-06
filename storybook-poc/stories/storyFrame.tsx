import type { Decorator } from '@storybook/react-vite';

/** Le cadre reprend les vrais tokens de l'éditeur Signal sans modifier les stories applicatives. */
export const withSignalTheme: Decorator = (Story, context) => (
  <div
    className={['app', 'signal-experience', context.globals.theme === 'dark' ? 'theme-dark' : ''].filter(Boolean).join(' ')}
    style={{ minHeight: '100vh', padding: 'var(--signal-space-5)', background: 'var(--color-bg)', color: 'var(--color-text)' }}
  >
    <Story />
  </div>
);

export const storyGrid: React.CSSProperties = {
  display: 'grid',
  gap: 'var(--signal-space-4)',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
  maxWidth: '960px',
};

export const storyPanel: React.CSSProperties = {
  minWidth: 0,
  padding: 'var(--signal-space-4)',
  background: 'var(--color-surface)',
  color: 'var(--color-text)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-panel)',
};

export const storyHelp: React.CSSProperties = {
  color: 'var(--color-text-muted)',
  fontSize: '12px',
};
