import type { Meta, StoryObj } from '@storybook/react-vite';
import ResponsiveApp from '../../src/adapters/react/ResponsiveApp';

const meta = {
  title: 'Application/Capacity Mapper',
  component: ResponsiveApp,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ResponsiveApp>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Application réelle et modèle de démonstration : ne pas recopier l'interface ici. */
export const Desktop: Story = {
  parameters: { viewport: { defaultViewport: 'desktop' } },
};

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'phone' } },
};

/** Vue de référence dédiée au rendu mosaïque en mode présentation. */
export const UnifiedMapPresentation: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    docs: { description: { story: 'Basculer vers Mosaïque puis activer Présentation pour examiner une cartographie paysage, en thème clair ou sombre.' } },
  },
};
