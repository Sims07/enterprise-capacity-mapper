import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { RelationRole } from '../../src/domain/catalogModel.ts';
import { RelationRoleSelect } from '../../src/components/ui/RelationRoleSelect.tsx';
import { withSignalTheme } from './storyFrame.tsx';

const meta = {
  title: 'Design system/Rôle d’une relation applicative',
  component: RelationRoleSelect,
  decorators: [withSignalTheme],
  args: {
    value: 'both' as RelationRole,
    label: 'Contribution de Mon Espace Santé à Gestion du carnet de santé',
    onChange: () => {},
  },
  parameters: { layout: 'centered' },
} satisfies Meta<typeof RelationRoleSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ActuelleEtCible: Story = {
  render: args => {
    const [role, setRole] = useState<RelationRole>(args.value);
    return <div className="app signal-experience" style={{ padding: 'var(--signal-space-4)', minWidth: '18rem' }}>
      <RelationRoleSelect {...args} value={role} onChange={setRole} />
    </div>;
  },
};
export const FutureUniquement: Story = { args: { value: 'target' } };
export const ActuelleUniquement: Story = { args: { value: 'current' } };
