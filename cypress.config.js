import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig } from 'cypress';

let coverageSnapshot = 0;

export default defineConfig({
  e2e: {
    baseUrl: 'http://127.0.0.1:4173',
    supportFile: process.env.COVERAGE === 'true' ? 'cypress/support/e2e.js' : false,
    video: false,
    setupNodeEvents(on, config) {
      if (process.env.COVERAGE === 'true') {
        return import('@cypress/code-coverage/task').then(({ default: coverageTask }) => {
          coverageTask(on, config);
          on('task', {
            saveCoverageShard(rawCoverage) {
              const coverage = JSON.parse(rawCoverage);
              if (!coverage || typeof coverage !== 'object' || Object.keys(coverage).length === 0) {
                return null;
              }

              const outputDir = path.resolve('.nyc_output');
              mkdirSync(outputDir, { recursive: true });
              const outputFile = path.join(
                outputDir,
                `coverage-${process.pid}-${coverageSnapshot++}.json`,
              );
              writeFileSync(outputFile, JSON.stringify(coverage));
              return null;
            },
          });
          return config;
        });
      }
      return config;
    },
  },
});
