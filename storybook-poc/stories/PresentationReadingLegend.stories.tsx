import type { Meta, StoryObj } from '@storybook/react-vite';
import PresentationReadingLegend from '../../src/components/PresentationReadingLegend.tsx';
import { withSignalTheme } from './storyFrame.tsx';

const meta = {
  title: 'Design system/Légende de présentation',
  id: 'design-system-legende-de-presentation',
  component: PresentationReadingLegend,
  decorators: [withSignalTheme],
  parameters: { layout: 'fullscreen' },
  args: { mode: 'coverage' },
} satisfies Meta<typeof PresentationReadingLegend>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Couverture: Story = { args: { mode: 'coverage' } };
export const Maturite: Story = { args: { mode: 'maturity' } };
export const Ecarts: Story = { args: { mode: 'gaps' } };
