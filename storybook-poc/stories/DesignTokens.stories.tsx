import type { Meta, StoryObj } from '@storybook/react-vite';

const meta = {
  title: 'Design system/Tokens sémantiques',
  parameters: { layout: 'fullscreen' },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const tokens = [
  { name: 'Fond', variable: '--color-bg' },
  { name: 'Surface', variable: '--color-surface' },
  { name: 'Surface secondaire', variable: '--color-surface-muted' },
  { name: 'Texte', variable: '--color-text' },
  { name: 'Texte secondaire', variable: '--color-text-muted' },
  { name: 'Bordure', variable: '--color-border' },
  { name: 'Accent', variable: '--color-accent' },
  { name: 'Succès', variable: '--status-covered-bg' },
  { name: 'Attention', variable: '--status-gap-bg' },
  { name: 'Critique', variable: '--status-critical-bg' },
];

export const Palette: Story = {
  render: () => (
    <main style={{ display: 'grid', gap: '1rem', maxWidth: '920px' }}>
      <header>
        <h1 style={{ marginBottom: '.25rem' }}>Tokens sémantiques</h1>
        <p style={{ color: 'var(--color-text-muted)', marginTop: 0 }}>
          Ces valeurs viennent de src/styles/tokens.css. Utilise le sélecteur « Thème »
          de la barre Storybook pour comparer clair et sombre.
        </p>
      </header>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '.75rem' }}>
        {tokens.map(token => (
          <article key={token.variable} style={{ overflow: 'hidden', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-card)', background: 'var(--color-surface)' }}>
            <div aria-label={token.name} style={{ height: '56px', background: `var(${token.variable})`, borderBottom: '1px solid var(--color-border)' }} />
            <div style={{ padding: '.75rem' }}>
              <strong>{token.name}</strong>
              <div style={{ color: 'var(--color-text-muted)', fontSize: '.8rem', marginTop: '.25rem' }}><code>{token.variable}</code></div>
            </div>
          </article>
        ))}
      </section>
    </main>
  ),
};
