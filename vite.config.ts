import { resolve } from 'node:path';
import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async () => {
  const coverageMode = process.env.COVERAGE === 'true';
  const plugins: PluginOption[] = [react()];

  if (coverageMode) {
    const { createInstrumenter } = await import('istanbul-lib-instrument');
    const instrumenter = createInstrumenter({
      coverageVariable: '__coverage__',
      compact: false,
      preserveComments: true,
      produceSourceMap: true,
    });

    plugins.push({
      name: 'ecm-istanbul-instrumentation',
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
          this.error(`Istanbul instrumentation failed for ${filename}: ${error instanceof Error ? error.message : String(error)}`);
        }
      },
    });
  }

  return {
    plugins,
    base: './',
    build: {
      target: 'es2020',
      sourcemap: coverageMode,
      rollupOptions: {
        input: {
          app: resolve(process.cwd(), 'index.html'),
          sw: resolve(process.cwd(), 'src/sw.ts'),
        },
        output: {
          entryFileNames: chunk => chunk.name === 'sw' ? 'sw.js' : 'assets/[name]-[hash].js',
        },
      },
    },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: ['.app.github.dev'],
      hmr: {
        protocol: 'wss',
        clientPort: 443,
      },
    },
  };
});
