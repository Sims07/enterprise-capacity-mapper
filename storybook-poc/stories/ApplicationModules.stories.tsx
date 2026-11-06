import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import NewMapWizard from '../../src/components/NewMapWizard.tsx';
import Dashboard from '../../src/components/Dashboard.tsx';
import CoverageTree from '../../src/components/CoverageTree.tsx';
import { DEMO_MODEL } from '../../src/data/demoData.ts';
import { withSignalTheme } from './storyFrame.tsx';

const meta = {
  title: 'Application/Modules métier',
  decorators: [withSignalTheme],
  parameters: { layout: 'fullscreen' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

function WizardScenario() {
  const [open, setOpen] = useState(true);
  const [created, setCreated] = useState('');
  return <>
    {!open && <section>
      <p role="status">{created ? 'Cartographie préparée : ' + created : 'Assistant fermé sans modification.'}</p>
      <button type="button" className="primary" onClick={() => setOpen(true)}>Ouvrir l’assistant</button>
    </section>}
    {open && <NewMapWizard model={DEMO_MODEL} onCancel={() => setOpen(false)} onCreate={details => {
      setCreated(details.name);
      setOpen(false);
    }} />}
  </>;
}
export const AssistantDeCreation: Story = { render: () => <WizardScenario /> };

function DashboardScenario({ depth = 2 }: { depth?: number }) {
  const [selected, setSelected] = useState<string[]>([]);
  return <Dashboard model={DEMO_MODEL} depth={depth} selected={selected}
    onToggleTarget={id => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])}
    onExploreTarget={id => setSelected([id])}
    onLinkApp={() => undefined}
    onUpdatePriority={() => undefined}
    onEditCapability={id => setSelected([id])}
    onShowOnMap={id => setSelected([id])}
    onExportReview={() => undefined}
    onClearReference={() => undefined}
    onLoadReferenceUrl={async () => undefined}
    onImportReference={async () => undefined}
  />;
}
export const DiagnosticN1: Story = { render: () => <DashboardScenario /> };
export const DiagnosticN0: Story = { render: () => <DashboardScenario depth={1} /> };

function RelationsScenario() {
  const [selected, setSelected] = useState<string[]>([]);
  return <CoverageTree domains={DEMO_MODEL.domains} capabilities={DEMO_MODEL.capabilities}
    apps={DEMO_MODEL.applications} depth={2} colorOf={() => 'var(--color-accent)'}
    selected={selected} pickedCount={0} onAssign={() => undefined} onUnassign={() => undefined}
    onLinkPicked={() => undefined} onOpenLink={() => undefined}
    onToggleSelection={id => setSelected(previous => previous.includes(id) ? previous.filter(item => item !== id) : [...previous, id])} />;
}
export const RelationsN0N1: Story = { render: () => <RelationsScenario /> };
