# Storybook POC

Le POC est isolé dans `storybook-poc/` et réutilise des composants et tokens CSS du dépôt.

## Démarrage local

Avec Node.js 24 :

```bash
npm install
npm install --prefix storybook-poc
npm run storybook --prefix storybook-poc
```

Puis ouvrir `http://localhost:6006`.

## Scénarios inclus

- `Application/Guide TOGAF` affiche le composant React réel `src/components/TogafGuide.tsx`.
- `Design system/Tokens sémantiques` affiche les variables de `src/styles/tokens.css`.
- Le sélecteur de thème permet de comparer clair et sombre.
- Les viewports téléphone 390×844, tablette 768×1024 et desktop 1440×900 sont configurés.

## Publication

Le build statique est placé dans `dist/storybook/`, à côté de l'application, sans être importé par le runtime PWA. Une fois la PR fusionnée et le déploiement GitHub Pages réussi, l'URL publique sera `https://sims07.github.io/enterprise-capacity-mapper/storybook/` si le dépôt et Pages sont publics.

Storybook sert à inspecter les composants isolément. Il complète Vitest et Playwright, sans les remplacer. Les stories doivent importer le vrai code source, pas une copie de l'interface.
