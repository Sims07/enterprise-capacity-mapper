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

## Build et accès externe

Le build statique est placé dans `dist/storybook/`, sans être importé par le runtime PWA. La CI construit maintenant Storybook avec le préfixe `/enterprise-capacity-mapper/storybook/` et l'inclut dans l'artefact GitHub Pages. Sur un push vers `main`, un job dédié publie l'artefact via GitHub Pages. Après fusion de cette PR et réussite du déploiement, l'URL attendue est `https://sims07.github.io/enterprise-capacity-mapper/storybook/`, sous réserve que le dépôt et les Pages soient publics. La disponibilité réelle doit être vérifiée après le déploiement ; un build vert sur une PR ne publie pas le site.

Storybook sert à inspecter les composants isolément. Il complète Vitest et Playwright, sans les remplacer. Les stories doivent importer le vrai code source, pas une copie de l'interface.
