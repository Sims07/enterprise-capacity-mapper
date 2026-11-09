import React from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { LibrarySectionHeading } from '../../src/components/LibrarySectionHeading.tsx';
import { Button } from '../../src/components/ui/Button.tsx';
import { withSignalTheme } from './storyFrame.tsx';

const meta = {
  title: 'Design system/Bibliothèque',
  id: 'design-system-bibliotheque',
  decorators: [withSignalTheme],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

/** Exemple purement visuel : aucune écriture dans le stockage local. */
const examples = {
  saved: [
    { name: 'Cartographie de référence', date: '9 nov. 2026, 16:04', n0: 11, n1: 18, apps: 20 },
    { name: 'Cartographie CNAM', date: '6 nov. 2026, 11:41', n0: 17, n1: 0, apps: 0 },
  ],
  recent: [
    { name: 'Cartographie de référence', date: '9 nov. 2026, 10:08', n0: 11, n1: 18, apps: 20 },
    { name: 'Numérique en Santé', date: '6 nov. 2026, 11:34', n0: 10, n1: 12, apps: 14 },
  ],
} as const;

export const SauvegardesEtHistorique: Story = {
  render: () => <div className="library-page" style={{ width: '100%', maxWidth: 1200, marginInline: 'auto' }}>
    <div className="library-content-grid">
      {(['saved', 'recent'] as const).map(kind =>
        <section key={kind} className={`library-section library-${kind === 'saved' ? 'saved' : 'recent'}-section`}
          aria-labelledby={`storybook-${kind}-heading`}>
          <LibrarySectionHeading
            kind={kind}
            id={`storybook-${kind}-heading`}
            title={kind === 'saved' ? 'Sauvegardes' : 'Récemment ouvertes'}
            count={examples[kind].length}
            description={kind === 'saved' ? 'Dernières versions enregistrées sur cet appareil.' : 'Retirer de l’historique ne supprime pas la sauvegarde.'}
          />
          <div className="library-card-grid">
            {examples[kind].map(map => <article key={map.name} className="library-map-card">
              <div className="library-map-details">
                <div className="library-map-title"><h4>{map.name}</h4><span className="library-map-date">{map.date}</span></div>
                <div className="library-map-metrics">
                  <span><strong>{map.n0}</strong> N0</span>
                  <span><strong>{map.n1}</strong> N1</span>
                  <span><strong>{map.apps}</strong> applications</span>
                </div>
              </div>
              <div className="library-map-card-actions">
                <Button type="button" variant="secondary" className={kind === 'saved' ? 'library-open-saved' : 'library-open-recent'}>
                  {kind === 'saved' ? 'Charger' : 'Reprendre'}
                </Button>
                {kind === 'recent' && <Button type="button" variant="quiet" className="library-remove-recent">Retirer</Button>}
              </div>
            </article>)}
          </div>
        </section>)}
    </div>
  </div>,
};
