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
    };
  },
};

export default config;
