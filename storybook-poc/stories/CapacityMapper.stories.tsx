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

/** Contrôle visuel du focus à distance : choisir une N1 puis ouvrir la restitution. */
export const ProjectedSelection: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    docs: { description: { story: 'Sélectionner une capacité N1 dans la cartographie et ouvrir Présentation. Contrôler le fond contrasté et le contour renforcé en clair et sombre ; les autres N0 conservent leurs couleurs métier et leurs titres.' } },
  },
};

/** Atelier SIGNAL : navigation documentaire, commandes métier et mosaïque inchangée. */
export const SignalCartography: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    docs: { description: { story: 'SIGNAL document-first : titre de cartographie et sauvegarde associés, onglets sobres, historique au niveau des commandes de carte. Les N0/N1 gardent leur géométrie et « Cartographie SI » ouvre l’inventaire, où se trouve « + Application ».' } },
  },
};

/** Instance réelle de l'application : la densité compacte est désormais l'unique mode. */
export const CompactCapabilities: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    docs: { description: { story: 'Vérifier les N1 à hauteur naturelle et, dans un domaine N0 étendu, deux cartes N1 côte à côte. Vérifier les applications sans troncature et la lecture sur mobile. Aucun réglage de densité ni menu Affichage.' } },
  },
};

/** Vérifier dans Storybook : inventaire SI sur demande, puis « Relier à… ». */
export const SignalApplications: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    docs: { description: { story: 'Cliquer sur « Cartographie SI » : le panneau occupe directement toute la hauteur, sans commande de redimensionnement. Faire défiler les applications : le titre, « + Application » et la recherche restent visibles. Tester aussi « Relier à… » et la fermeture.' } },
  },
};

/** Inspection dédiée de la hiérarchie : une vraie instance du shell, aucun duplicata de markup. */
export const DocumentFirstHeader: Story = {
  parameters: {
    viewport: { defaultViewport: 'desktop' },
    docs: { description: { story: 'Vérifier sur 1920, 1440 et mobile : nom du document actif à gauche, état local discret (et erreur visible), navigation horizontale distincte, commandes de lecture et Annuler/Rétablir dans la barre contextuelle, présentation toujours accessible.' } },
  },
};
