import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async () => {
  const plugins = [react()];

  // Instrumenter uniquement les builds dédiés à la couverture, jamais le déploiement.
  if (process.env.COVERAGE === 'true') {
    const { default: istanbul } = await import('vite-plugin-istanbul');
    plugins.push(istanbul({
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'cypress/**', '**/*.cy.{js,jsx,ts,tsx}'],
      extension: ['.js', '.jsx', '.ts', '.tsx'],
      requireEnv: false,
      forceBuildInstrument: true,
    }));
  }

  return {
    plugins,
    base: './',
    build: { target: 'es2020' },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: ['.app.github.dev'],
      hmr: {
        protocol: 'wss',
        clientPort: 443
      }
    }
  };
});
