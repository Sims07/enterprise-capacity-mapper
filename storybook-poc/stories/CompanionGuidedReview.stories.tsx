import type { Meta, StoryObj } from '@storybook/react-vite';
import CompanionGuidedReview from '../../src/components/CompanionGuidedReview';

const sampleFindings = [
  {
    id: 'coverage.target-uncovered:cap-1',
    ruleId: 'coverage.target-uncovered',
    title: 'Capacité sans application reliée',
    detail: 'Aucune relation applicative valide vers cette capacité N1 n’a été trouvée.',
    recommendation: 'Vérifier si la relation manque ou si la capacité n’est pas outillée.',
    evidence: [{ type: 'capability' as const, id: 'cap-1', name: 'Gestion des identités' }],
  },
  {
    id: 'name.duplicate:cap-2:cap-3',
    ruleId: 'name.duplicate',
    title: 'Noms potentiellement dupliqués',
    detail: 'Deux capacités possèdent le même nom dans le périmètre.',
    recommendation: 'Comparer leur périmètre métier avant de les consolider.',
    evidence: [{ type: 'capability' as const, id: 'cap-2', name: 'Authentification' }],
  },
];

const meta = {
  title: 'Application/Compagnon/Qualification guidée',
  component: CompanionGuidedReview,
  args: {
    observations: sampleFindings,
    model: {
      layout: { depth: 2 },
      domains: [{ id: 'domain', code: 'ID', name: 'Identité' }],
      capabilities: [{ id: 'cap-1', domainId: 'domain', name: 'Gestion des identités' }],
      applications: [{ id: 'app-1', name: 'Annuaire', capabilityIds: [] }],
    },
  },
  parameters: { layout: 'centered' },
  decorators: [Story => <div className="companion-root" style={{ maxWidth: 430, width: 'min(430px, 90vw)', padding: 14, background: 'var(--color-surface)', color: 'var(--color-text)' }}><Story /></div>],
} satisfies Meta<typeof CompanionGuidedReview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const QualificationLocale: Story = {};
export const ConstatUnique: Story = {
  args: { observations: [sampleFindings[0]] },
};

export const Sombre: Story = { globals: { theme: 'dark' } };
export const ConstatUniqueSombre: Story = {
  globals: { theme: 'dark' },
  args: { observations: [sampleFindings[0]] },
};
export const SansConstat: Story = { args: { observations: [] } };
