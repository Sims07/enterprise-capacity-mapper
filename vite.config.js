import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async () => {
  const coverageMode = process.env.COVERAGE === 'true';
  const plugins = [react()];

  // Instrumentation explicite après la transformation React, uniquement dans le build de test.
  if (coverageMode) {
    const { createInstrumenter } = await import('istanbul-lib-instrument');
    const instrumenter = createInstrumenter({
      coverageVariable: '__coverage__',
      compact: false,
      preserveComments: true,
      produceSourceMap: true,
    });

    plugins.push({
      name: 'ecm-cypress-istanbul-instrumentation',
      enforce: 'post',
      apply: 'build',
      transform(code, id) {
        const filename = id.split('?')[0];
        if (!filename.includes('/src/') || !/\.(?:js|jsx|ts|tsx)$/.test(filename)) {
          return null;
        }

        try {
          const instrumented = instrumenter.instrumentSync(code, filename);
          return {
            code: instrumented,
            map: instrumenter.lastSourceMap() || null,
          };
        } catch (error) {
          this.error(`Istanbul instrumentation failed for ${filename}: ${error.message}`);
        }
      },
    });
  }

  return {
    plugins,
    base: coverageMode ? '/enterprise-capacity-mapper/' : './',
    build: { target: 'es2020', sourcemap: coverageMode },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: ['.app.github.dev'],
      hmr: coverageMode ? false : {
        protocol: 'wss',
        clientPort: 443
      }
    }
  };
});
