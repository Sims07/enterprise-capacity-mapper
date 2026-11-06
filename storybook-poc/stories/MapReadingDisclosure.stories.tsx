import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import type { MapDensity } from '../../src/adapters/browser/appPreferences.ts';
import type { MapReadingMode } from '../../src/application/capabilityMapReadout.ts';
import MapReadingDisclosure from '../../src/components/MapReadingDisclosure.tsx';
import { withSignalTheme, storyHelp } from './storyFrame.tsx';

const meta = {
  title: 'Design system/Affichage de la cartographie',
  id: 'design-system-affichage-cartographie',
  component: MapReadingDisclosure,
  decorators: [withSignalTheme],
  parameters: { layout: 'fullscreen' },
  args: { mode: 'applications', density: 'comfortable', onDensityChange: () => undefined },
} satisfies Meta<typeof MapReadingDisclosure>;
export default meta;
type Story = StoryObj<typeof meta>;

function Example({ mode }: { mode: MapReadingMode }) {
  const [density, setDensity] = useState<MapDensity>('comfortable');
  return <section className="capability-reading-toolbar" aria-label="Exemple de contrôle de lecture">
    <strong>Lecture métier</strong>
    <div className="capability-reading-options" role="group" aria-label="Mode de lecture">
      <button type="button" aria-pressed="true">{mode}</button>
    </div>
    <MapReadingDisclosure mode={mode} density={density} onDensityChange={setDensity} />
    <p style={storyHelp} role="status">Densité choisie : {density}</p>
  </section>;
}
export const Applications: Story = { render: () => <Example mode="applications" /> };
export const Couverture: Story = { render: () => <Example mode="coverage" /> };
export const Maturite: Story = { render: () => <Example mode="maturity" /> };
export const Ecarts: Story = { render: () => <Example mode="gaps" /> };
