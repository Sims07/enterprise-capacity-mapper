import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: process.env.COVERAGE === 'true'
      ? 'http://127.0.0.1:4173/enterprise-capacity-mapper/'
      : 'http://127.0.0.1:4173',
    supportFile: process.env.COVERAGE === 'true' ? 'cypress/support/e2e.js' : false,
    video: false,
    setupNodeEvents(on, config) {
      if (process.env.COVERAGE === 'true') {
        return import('@cypress/code-coverage/task').then(({ default: coverageTask }) => {
          coverageTask(on, config);
          return config;
        });
      }
      return config;
    },
  },
});
