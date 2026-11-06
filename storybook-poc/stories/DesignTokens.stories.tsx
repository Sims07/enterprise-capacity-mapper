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
  { name: 'Fond de cartographie', variable: '--map-canvas-bg' },
  { name: 'Points de repère', variable: '--map-canvas-dot' },
  { name: 'Surface des domaines', variable: '--map-card-surface' },
  { name: 'Texte des capacités', variable: '--map-capability-text' },
  { name: 'Survol des capacités', variable: '--map-capability-hover-bg' },
  { name: 'Contrôles de présentation', variable: '--map-presentation-control-bg' },
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


/** Deux variantes de Signal affichées ensemble pour contrôler l'harmonie des tokens. */
export const SignalPalette: Story = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, padding: 24 }}>
      {(['light', 'dark'] as const).map(theme => (
        <section key={theme} className={`app signal-experience ${theme === 'dark' ? 'theme-dark' : ''}`}
          style={{ padding: 24, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-panel)', background: 'var(--color-bg)', color: 'var(--color-text)' }}>
          <h2 style={{ marginTop: 0 }}>SIGNAL · {theme === 'dark' ? 'Sombre' : 'Clair'}</h2>
          <p style={{ color: 'var(--color-text-muted)' }}>Identité visuelle distincte de la sémantique métier.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
            {[
              ['Fond', '--color-bg'],
              ['Surface', '--color-surface'],
              ['Surface élevée', '--color-surface-raised'],
              ['Bordure', '--color-border'],
              ['Accent', '--color-accent'],
              ['Accent doux', '--color-accent-soft'],
              ['Carte N0', '--signal-map-surface'],
              ['Carte N1', '--signal-map-panel'],
            ].map(([label, token]) => (
              <div key={token} style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', padding: 9, borderRadius: 'var(--radius-card)' }}>
                <div style={{ height: 36, background: `var(${token})`, border: '1px solid var(--color-border)' }} />
                <div style={{ fontSize: 12, marginTop: 8 }}>{label}</div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};
