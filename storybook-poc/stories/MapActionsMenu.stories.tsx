import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import MapActionsMenu from '../../src/components/MapActionsMenu.tsx';
import { storyHelp, withSignalTheme } from './storyFrame.tsx';

const meta = {
  title: 'Design system/Actions secondaires de la cartographie',
  id: 'design-system-map-actions',
  component: MapActionsMenu,
  decorators: [withSignalTheme],
  parameters: { layout: 'fullscreen' },
  args: { children: null },
} satisfies Meta<typeof MapActionsMenu>;
export default meta;
type Story = StoryObj<typeof meta>;

function Example() {
  const [action, setAction] = useState('Aucune action');
  const [director, setDirector] = useState(false);
  return <div className="map-controls-row map-unified-controls">
    <label className="map-filter-control" style={{ minWidth: '180px' }}>
      <span>Filtrer les domaines</span>
      <input aria-label="Filtrer les domaines" placeholder="Nom ou code" />
    </label>
    <div className="canvas-actions map-primary-actions">
      <button type="button" className="primary">+ Application</button>
      <button type="button" className="secondary">+ Domaine N0</button>
      <MapActionsMenu onDismiss={() => setDirector(false)}>
        <button type="button" className="map-actions-menu-item" data-map-menu-close="true"
          onClick={() => setAction('Inventaire SI')}>Inventaire SI (20)</button>
        <button type="button" className="map-actions-menu-item" data-map-menu-close="true"
          onClick={() => setAction('Structure')}>Structure</button>
        <button type="button" className="map-actions-menu-item" data-map-menu-close="true"
          onClick={() => setAction('Aide TOGAF')}>Aide TOGAF</button>
        <div className="map-actions-menu-divider" role="separator" />
        <button type="button" className="map-actions-menu-item" data-map-menu-close="true"
          onClick={() => setAction('Examiner les écarts')}>Examiner les écarts (6)</button>
        <div className="presentation-director">
          <button type="button" className="presentation-director-toggle" aria-expanded={director}
            onClick={() => setDirector(value => !value)}>Piloter la présentation</button>
          {director && <div className="presentation-director-panel"><strong>Écran de restitution</strong>
            <p>Choisir la dimension sur l'écran distant.</p></div>}
        </div>
      </MapActionsMenu>
    </div>
    <p style={{ ...storyHelp, width: '100%' }} role="status">Action sélectionnée : {action}</p>
  </div>;
}

export const Options: Story = { render: () => <Example /> };
