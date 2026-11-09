import type { Meta, StoryObj } from '@storybook/react-vite';
import MapReadingLegend from '../../src/components/MapReadingLegend.tsx';
import { withSignalTheme } from './storyFrame.tsx';

const meta = {
  title: 'Design system/Légende de la cartographie',
  id: 'design-system-legende-de-cartographie',
  component: MapReadingLegend,
  decorators: [withSignalTheme],
  parameters: { layout: 'fullscreen' },
  args: { mode: 'coverage' },
} satisfies Meta<typeof MapReadingLegend>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Applications: Story = { args: { mode: 'applications' } };
export const Couverture: Story = { args: { mode: 'coverage' } };
export const Maturite: Story = { args: { mode: 'maturity' } };
export const Ecarts: Story = { args: { mode: 'gaps' } };
