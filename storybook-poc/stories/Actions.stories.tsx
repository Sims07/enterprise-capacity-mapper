import React, { useEffect, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { withSignalTheme, storyGrid, storyPanel, storyHelp } from './storyFrame.tsx';

const meta = {
  title: 'Design system/Actions et navigation',
  decorators: [withSignalTheme],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const Boutons: Story = {
  render: () => <div style={storyGrid}>
    <section style={storyPanel}>
      <h3>Actions principales et secondaires</h3>
      <div className="canvas-actions" style={{ flexWrap: 'wrap', marginLeft: 0 }}>
        <button type="button" className="primary">＋ Application</button>
        <button type="button" className="secondary">Inventaire SI</button>
        <button type="button" disabled>Indisponible</button>
      </div>
    </section>
    <section style={storyPanel}>
      <h3>Actions iconographiques</h3>
      <div style={{ display: 'flex', gap: 'var(--signal-space-2)' }}>
        <button type="button" className="icon-btn" aria-label="Monter">↑</button>
        <button type="button" className="icon-btn" aria-label="Descendre">↓</button>
        <button type="button" className="icon-btn danger" aria-label="Supprimer">×</button>
        <button type="button" className="icon-btn" disabled aria-label="Indisponible">↷</button>
      </div>
    </section>
  </div>,
};

function TabsDemo() {
  const [selected, setSelected] = useState('overview');
  return <section style={storyPanel}>
    <div className="analysis-view-switch" aria-label="Vues d'analyse" role="group" style={{ padding: 0, borderBottom: 0 }}>
      {([{ id: 'overview', title: 'Vue d’ensemble' }, { id: 'coverage', title: 'Couverture' }, { id: 'impact', title: 'Impact' }] as const).map(item =>
        <button key={item.id} type="button" aria-pressed={selected === item.id} className={selected === item.id ? 'active' : ''}
          onClick={() => setSelected(item.id)}>{item.title}</button>)}
    </div>
    <p aria-live="polite" style={storyHelp}>Vue sélectionnée : {selected}</p>
  </section>;
}
export const NavigationParOnglets: Story = { render: () => <TabsDemo /> };

function MenuDemo() {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const onPointer = (event: MouseEvent) => { if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onPointer); };
  }, []);
  const choose = (value: string) => { setSelected(value); setOpen(false); };
  return <section style={storyPanel}>
    <h3>Menu Outils</h3>
    <div ref={ref} className="toolbar" style={{ position: 'relative', display: 'inline-flex' }}>
      <button type="button" className="secondary toolbar-tools-toggle" aria-expanded={open}
        aria-controls="storybook-tools-panel" onClick={() => setOpen(value => !value)}>⋯ Outils</button>
      {open && <div className="toolbar-tools-panel" id="storybook-tools-panel">
        <section className="toolbar-menu-group" aria-label="Données">
          <h3 className="toolbar-menu-heading">Données</h3>
          <button type="button" onClick={() => choose('Export JSON')}>Exporter en JSON</button>
          <button type="button" onClick={() => choose('Import JSON')}>Importer depuis JSON</button>
        </section>
        <div className="toolbar-menu-divider" role="separator" />
        <section className="toolbar-menu-group" aria-label="Affichage">
          <h3 className="toolbar-menu-heading">Affichage</h3>
          <button type="button" onClick={() => choose('Thème sombre')}>Thème sombre</button>
        </section>
      </div>}
    </div>
    <p role="status" style={storyHelp}>{selected || 'Ouvrez le menu pour examiner les actions.'}</p>
  </section>;
}
export const MenuDeroulant: Story = { render: () => <MenuDemo /> };

function ChoiceDemo() {
  const [value, setValue] = useState('2');
  return <div className="template-grid depth-choice" style={{ maxWidth: 680 }}>
    <button type="button" className="template-card" aria-pressed={value === '1'} onClick={() => setValue('1')}>
      <b>Vue synthétique</b><p>Domaines N0 sans détail des capacités.</p><small>1 niveau</small>
    </button>
    <button type="button" className="template-card" aria-pressed={value === '2'} onClick={() => setValue('2')}>
      <b>Vue détaillée</b><p>Domaines N0 et capacités N1 pour l'analyse.</p><small>2 niveaux · Recommandé</small>
    </button>
  </div>;
}
export const CartesDeSelection: Story = { render: () => <ChoiceDemo /> };

export const BadgesMetier: Story = {
  render: () => <div style={storyGrid}>
    <section style={storyPanel}>
      <h3>Statut des applications</h3>
      <p><span className="badge actif">Actif</span> <span className="badge cible">Cible</span> <span className="badge obsolete">Obsolète</span></p>
    </section>
    <section style={storyPanel}>
      <h3>Couverture et écarts</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--signal-space-3)' }}>
        {[
          { label: 'Couverte', foreground: '--status-covered-text', background: '--status-covered-bg' },
          { label: 'Gap', foreground: '--status-gap-text', background: '--status-gap-bg' },
          { label: 'Critique', foreground: '--status-critical-text', background: '--status-critical-bg' },
          { label: 'Non qualifiée', foreground: '--status-neutral-text', background: '--status-neutral-bg' },
        ].map(item => <span key={item.label} className="badge" style={{ color: 'var(' + item.foreground + ')', background: 'var(' + item.background + ')' }}>{item.label}</span>)}
      </div>
    </section>
  </div>,
};
