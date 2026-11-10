import React, { useState } from 'react';
import { Button } from '../../src/components/ui/Button.tsx';
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
      <Button type="button" variant="primary" onClick={() => setAction("Cartographie SI : inventaire des applications")}>Cartographie SI</Button>
      <Button type="button" variant="secondary" onClick={() => setAction("Nouveau domaine N0")}>+ Domaine N0</Button>
      <MapActionsMenu onDismiss={() => setDirector(false)}>
        <Button type="button" variant="quiet" className="map-actions-menu-item" data-map-menu-close="true"
          onClick={() => setAction('Structure')}>Structure</Button>
        <Button type="button" variant="quiet" className="map-actions-menu-item" data-map-menu-close="true"
          onClick={() => setAction('Aide TOGAF')}>Aide TOGAF</Button>
        <div className="map-actions-menu-divider" role="separator" />
        <Button type="button" variant="quiet" className="map-actions-menu-item" data-map-menu-close="true"
          onClick={() => setAction('Examiner les écarts')}>Examiner les écarts (6)</Button>
        <div className="presentation-director">
          <Button type="button" variant="quiet" className="presentation-director-toggle" aria-expanded={director}
            onClick={() => setDirector(value => !value)}>Piloter la présentation</Button>
          {director && <div className="presentation-director-panel"><strong>Écran de restitution</strong>
            <p>Choisir la dimension sur l'écran distant.</p></div>}
        </div>
      </MapActionsMenu>
    </div>
    <p style={{ ...storyHelp, width: '100%' }} role="status">Action sélectionnée : {action}</p>
  </div>;
}

export const Options: Story = { render: () => <Example /> };
