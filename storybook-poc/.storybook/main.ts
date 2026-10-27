import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: [],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  async viteFinal(viteConfig) {
    return {
      ...viteConfig,
      base: process.env.STORYBOOK_BASE_PATH ?? '/',
      resolve: {
        ...viteConfig.resolve,
        dedupe: [...(viteConfig.resolve?.dedupe ?? []), 'react', 'react-dom'],
      },
    };
  },
};

export default config;
