import BusinessProcesses from '../../src/components/BusinessProcesses.tsx';
import { saveBusinessProcess, removeBusinessProcess } from '../../src/domain/businessProcesses.ts';
import type { CatalogModel } from '../../src/domain/catalogModel.ts';
import RiskAnalysis from '../../src/components/RiskAnalysis.tsx';
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
import NewMapWizard from '../../src/components/NewMapWizard.tsx';
import Dashboard from '../../src/components/Dashboard.tsx';
import CoverageTree from '../../src/components/CoverageTree.tsx';
import { DEMO_MODEL } from '../../src/data/demoData.ts';
import { withSignalTheme } from './storyFrame.tsx';

const meta = {
  title: 'Application/Modules métier',
  id: 'application-modules-metier',
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
    onSaveProcess={() => undefined}
    onRemoveProcess={() => undefined}
    onUpdateRisk={() => undefined}
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

function RiskScenario() {
  const [model, setModel] = useState<CatalogModel>({ ...DEMO_MODEL, applications: DEMO_MODEL.applications.map((app, index) => ({ ...app, risk: index === 0 ? { likelihood: 5, impact: 4, category: 'continuity' as const, owner: 'Responsable SI', rationale: 'Application indispensable au métier', supportEndDate: '2026-01-01' } : undefined })) });
  return <RiskAnalysis model={model} onUpdateRisk={(id, risk) => setModel(previous => ({ ...previous, applications: previous.applications.map(app => app.id === id ? { ...app, risk } : app) }))} onExploreTarget={() => undefined} onExport={() => undefined} />;
}
export const AnalyseDesRisques: Story = { render: () => <RiskScenario /> };

function ProcessesScenario() {
  const [model, setModel] = useState<CatalogModel>({ ...DEMO_MODEL, businessProcesses: [{ id: 'process-order', name: 'Traiter une commande client', owner: 'Direction commerciale', capabilityIds: ['l1-1', 'l1-2', 'l1-5'] }] });
  return <BusinessProcesses model={model} onSave={draft => setModel(previous => saveBusinessProcess(previous, { ...draft, id: draft.id || crypto.randomUUID() }))} onRemove={id => setModel(previous => removeBusinessProcess(previous, id))} onExploreTarget={() => undefined} onShowRisks={() => undefined} />;
}
export const ProcessusMetier: Story = { render: () => <ProcessesScenario /> };
