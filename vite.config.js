import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(async () => {
  const plugins = [react()];

  // L'instrumentation est réservée au serveur de test, jamais au build publié.
  if (process.env.COVERAGE === 'true') {
    const { default: istanbul } = await import('vite-plugin-istanbul');
    plugins.push(istanbul({
      include: [path.resolve(process.cwd(), 'src/**/*')],
      exclude: ['node_modules/**', 'cypress/**', '**/*.cy.{js,jsx,ts,tsx}'],
      extension: ['.js', '.jsx', '.ts', '.tsx'],
      requireEnv: true,
      cypress: true,
      // Le plugin n'est chargé que sur le serveur de test ; ne pas le désactiver
      // selon le mode de build résolu par Vite en CI.
      checkProd: false,
    }));
  }

  const coverageMode = process.env.COVERAGE === 'true';

  return {
    plugins,
    // Le serveur de test reproduit le sous-chemin GitHub Pages ; la production conserve sa base relative.
    base: coverageMode ? '/enterprise-capacity-mapper/' : './',
    build: { target: 'es2020', sourcemap: coverageMode },
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,
      allowedHosts: ['.app.github.dev'],
      // En CI, Cypress utilise HTTP local : ne pas tenter d'ouvrir le WebSocket WSS
      // configuré pour l'accès distant via GitHub Codespaces.
      hmr: coverageMode ? false : {
        protocol: 'wss',
        clientPort: 443
      }
    }
  };
});
