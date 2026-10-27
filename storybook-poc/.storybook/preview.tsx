import type { Preview } from '@storybook/react-vite';
import '../../src/styles/index.css';

const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Thème du design system',
      defaultValue: 'light',
      toolbar: {
        title: 'Thème',
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Clair' },
          { value: 'dark', title: 'Sombre' },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const isDark = context.globals.theme === 'dark';
      return (
        <div
          className={isDark ? 'theme-dark' : ''}
          style={{
            background: 'var(--color-bg)',
            color: 'var(--color-text)',
            minHeight: '100vh',
            padding: '1rem',
            boxSizing: 'border-box',
          }}
        >
          <Story />
        </div>
      );
    },
  ],
  parameters: {
    controls: { expanded: true },
    viewport: {
      viewports: {
        phone: {
          name: 'Téléphone (390 × 844)',
          styles: { width: '390px', height: '844px' },
          type: 'mobile',
        },
        tablet: {
          name: 'Tablette (768 × 1024)',
          styles: { width: '768px', height: '1024px' },
          type: 'tablet',
        },
        desktop: {
          name: 'Desktop (1440 × 900)',
          styles: { width: '1440px', height: '900px' },
          type: 'desktop',
        },
      },
    },
  },
};

export default preview;
