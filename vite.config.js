import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(async () => {
  const plugins = [react()];

  // L'instrumentation est réservée au serveur de test, jamais au build publié.
  if (process.env.COVERAGE === 'true') {
    const { default: istanbul } = await import('vite-plugin-istanbul');
    plugins.push(istanbul({
      include: ['src/**/*'],
      exclude: ['node_modules/**', 'cypress/**', '**/*.cy.{js,jsx,ts,tsx}'],
      extension: ['.js', '.jsx', '.ts', '.tsx'],
      requireEnv: true,
    }));
  }

  return {
    plugins,
    // Le serveur de test reproduit le sous-chemin GitHub Pages ; la production conserve sa base relative.
    base: process.env.COVERAGE === 'true' ? '/enterprise-capacity-mapper/' : './',
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
