import React, { useEffect, useRef, useState } from 'react';
import { Button } from '../../src/components/ui/Button.tsx';
import { FilePicker } from '../../src/components/ui/FilePicker.tsx';
import { ToolMenuIcon } from '../../src/components/ui/ToolMenuIcon.tsx';
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
        <Button type="button" variant="primary">＋ Application</Button>
        <Button type="button" variant="secondary">Inventaire SI</Button>
        <Button type="button" disabled>Indisponible</Button>
      </div>
    </section>
    <section style={storyPanel}>
      <h3>Actions iconographiques</h3>
      <div style={{ display: 'flex', gap: 'var(--signal-space-2)' }}>
        <Button type="button" variant="icon" className="icon-btn" aria-label="Monter">↑</Button>
        <Button type="button" variant="icon" className="icon-btn" aria-label="Descendre">↓</Button>
        <Button type="button" variant="danger" className="icon-btn" aria-label="Supprimer">×</Button>
        <Button type="button" variant="icon" className="icon-btn" disabled aria-label="Indisponible">↷</Button>
      </div>
    </section>
  </div>,
};

function TabsDemo() {
  const [selected, setSelected] = useState('overview');
  return <section style={storyPanel}>
    <div className="analysis-view-switch" aria-label="Vues d'analyse" role="group" style={{ padding: 0, borderBottom: 0 }}>
      {([{ id: 'overview', title: 'Vue d’ensemble' }, { id: 'coverage', title: 'Couverture' }, { id: 'impact', title: 'Impact' }] as const).map(item =>
        <Button key={item.id} type="button" variant="quiet" aria-pressed={selected === item.id} className={selected === item.id ? 'active' : ''}
          onClick={() => setSelected(item.id)}>{item.title}</Button>)}
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
    <h3>Menu Outils — actions alignées, sans bordures superflues</h3>
    <div className="toolbar-switch primary-navigation" style={{ display: 'flex', position: 'relative', width: 'fit-content', overflow: 'visible' }}>
      <div ref={ref} className={['toolbar-tools', open && 'is-open'].filter(Boolean).join(' ')}>
        <Button type="button" variant="quiet" className="toolbar-tools-toggle" aria-expanded={open}
          aria-controls="storybook-tools-panel" onClick={() => setOpen(value => !value)}>Outils</Button>
        {open && <div className="toolbar-tools-panel" id="storybook-tools-panel" aria-label="Outils et actions">
          <section className="toolbar-menu-group" aria-label="Cartographie">
            <h3 className="toolbar-menu-heading">Cartographie</h3>
            <Button type="button" variant="quiet" className="toolbar-menu-action toolbar-menu-action--create" onClick={() => choose('Nouvelle cartographie')}>
              <ToolMenuIcon name="create" /><span>Nouvelle cartographie</span>
            </Button>
            <Button type="button" variant="quiet" className="toolbar-menu-action" onClick={() => choose('Enregistrer')}>
              <ToolMenuIcon name="save" /><span>Enregistrer la cartographie</span>
            </Button>
          </section>
          <div className="toolbar-menu-divider" role="separator" />
          <section className="toolbar-menu-group" aria-label="Données">
            <h3 className="toolbar-menu-heading">Données</h3>
            <Button type="button" variant="quiet" className="toolbar-menu-action" onClick={() => choose('Export JSON')}>
              <ToolMenuIcon name="download" /><span>Exporter en JSON</span>
            </Button>
            <FilePicker label="Importer depuis JSON" variant="quiet" className="toolbar-import toolbar-menu-action"
              leadingIcon={<ToolMenuIcon name="upload" />} accept=".json,application/json" onChange={() => choose('Import JSON')} />
          </section>
          <div className="toolbar-menu-divider" role="separator" />
          <section className="toolbar-menu-group" aria-label="Affichage">
            <h3 className="toolbar-menu-heading">Affichage</h3>
            <Button type="button" variant="quiet" className="toolbar-menu-action" onClick={() => choose('Thème sombre')}>
              <ToolMenuIcon name="moon" /><span>Thème sombre</span>
            </Button>
          </section>
          <div className="toolbar-menu-divider" role="separator" />
          <div className="toolbar-menu-footer" aria-label="Version de l’application">
            <small className="pwa-version">Version de démonstration</small>
          </div>
        </div>}
      </div>
    </div>
    <p role="status" style={storyHelp}>{selected || 'Ouvrez le menu pour examiner les actions.'}</p>
  </section>;
}
export const MenuDeroulant: Story = { render: () => <MenuDemo /> };

function ChoiceDemo() {
  const [value, setValue] = useState('2');
  return <div className="template-grid depth-choice" style={{ maxWidth: 680 }}>
    <Button type="button" variant="quiet" className="template-card" aria-pressed={value === '1'} onClick={() => setValue('1')}>
      <b>Vue synthétique</b><p>Domaines N0 sans détail des capacités.</p><small>1 niveau</small>
    </Button>
    <Button type="button" variant="quiet" className="template-card" aria-pressed={value === '2'} onClick={() => setValue('2')}>
      <b>Vue détaillée</b><p>Domaines N0 et capacités N1 pour l'analyse.</p><small>2 niveaux · Recommandé</small>
    </Button>
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
