import type { Meta, StoryObj } from '@storybook/react-vite';
import CartographerCompanion from '../../src/components/CartographerCompanion';
import type { AiCompanionPort } from '../../src/ports/aiCompanion';
import type { CompanionPreferencesPort } from '../../src/ports/companionPreferences';

const model = {
  domains: [
    { id: 'dom-1', code: 'OPS', name: 'Opérations', description: 'Pilotage et exécution des opérations.' },
    { id: 'dom-2', code: 'REL', name: 'Relation client', description: 'Expérience et relation avec les clients.' },
  ],
  capabilities: [
    { id: 'cap-1', domainId: 'dom-1', code: 'OPS-01', name: 'Planifier les opérations' },
    { id: 'cap-2', domainId: 'dom-1', code: 'OPS-02', name: 'Superviser les opérations' },
    { id: 'cap-3', domainId: 'dom-2', code: 'REL-01', name: 'Gérer la relation client' },
  ],
  applications: [
    { id: 'app-1', name: 'Portail opérations', capabilityIds: ['cap-1', 'cap-2'], type: 'Application métier', status: 'Actif' },
    { id: 'app-2', name: 'CRM', capabilityIds: ['cap-3'], type: 'Application métier', status: 'Actif' },
  ],
};

const companionPreferences: CompanionPreferencesPort = {
  load: () => ({ provider: 'demo', model: 'storybook', endpoint: '', enabled: true }),
  save: () => undefined,
  defaults: {
    demo: { label: 'Démo Storybook', model: 'storybook', endpoint: '' },
  },
};

const aiCompanionFactory = (): AiCompanionPort => ({
  ask: async () => 'Voici une analyse de démonstration.\n\n**Points à examiner**:\n- Vérifier la couverture des capacités critiques.\n- Confirmer les rattachements avec les architectes métier.',
});

const meta = {
  title: 'Application/Compagnon cartographe',
  component: CartographerCompanion,
  parameters: { layout: 'fullscreen' },
  args: {
    model,
    darkMode: false,
    aiCompanionFactory,
    companionPreferences,
  },
} satisfies Meta<typeof CartographerCompanion>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Sombre: Story = {
  args: { darkMode: true },
};
