import type { Meta, StoryObj } from '@storybook/react-vite';
import TogafGuide from '../../src/components/TogafGuide';

const meta = {
  title: 'Application/Guide TOGAF',
  component: TogafGuide,
  args: { onClose: () => undefined },
} satisfies Meta<typeof TogafGuide>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'phone' } },
};
