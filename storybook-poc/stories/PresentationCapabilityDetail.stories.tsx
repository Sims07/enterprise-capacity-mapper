import type { Meta, StoryObj } from '@storybook/react-vite';
import PresentationCapabilityDetail from '../../src/components/PresentationCapabilityDetail.tsx';
import { capabilityMapReadout } from '../../src/application/capabilityMapReadout.ts';
import { getCapabilityCoverageState } from '../../src/domain/coverage.ts';
import type { Application, Capability } from '../../src/domain/catalogModel.ts';
import { withSignalTheme } from './storyFrame.tsx';

const capability: Capability = {
  id: 'cap-1',
  domainId: 'domain-1',
  code: 'REL-02',
  name: 'Gestion de consultation des données médicales',
  description: 'Consulter les informations de santé dans le respect des habilitations.',
};
const currentApplications: Application[] = [
  { id: 'app-1', name: 'Seali Portail', status: 'Actif', code: 'SEA', capabilityIds: [capability.id] },
  { id: 'app-2', name: 'Ameli Pro', status: 'Actif', capabilityIds: [capability.id] },
];
const targetApplications: Application[] = [
  { id: 'app-3', name: 'Portail européen', status: 'Cible', capabilityIds: [capability.id] },
];

const props = (current: Application[], target: Application[], assessed = false) => {
  const item = assessed
    ? { ...capability, assessment: { functionalCoverage: 'partial' as const, currentMaturity: 2, targetMaturity: 4 } }
    : capability;
  return {
    capability: item,
    domainName: 'Relation PS avec patient européen',
    currentApplications: current,
    targetApplications: target,
    readout: capabilityMapReadout(item, getCapabilityCoverageState(item.id, [...current, ...target]), undefined),
    onClose: () => {},
  };
};

const meta = {
  title: 'Design system/Fiche N1 de présentation',
  id: 'design-system-fiche-n1-presentation',
  component: PresentationCapabilityDetail,
  decorators: [
    withSignalTheme,
    Story => <div className="app mosaic-presentation-mode">
      <div className="presentation-focus-overlay"><Story /></div>
    </div>,
  ],
  parameters: { layout: 'fullscreen' },
  args: props(currentApplications, targetApplications),
} satisfies Meta<typeof PresentationCapabilityDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Mixte: Story = { args: props(currentApplications, targetApplications, true) };
export const ActuellesUniquement: Story = { args: props(currentApplications, []) };
export const SansApplications: Story = { args: props([], []) };
