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

Le build statique est placé dans `dist/storybook/`, sans être importé par le runtime PWA. Le POC ne publie pas encore Storybook sur une URL publique : la CI de cette PR ne modifie pas le déploiement GitHub Pages existant. Pour rendre Storybook accessible à l'extérieur, il faudra ajouter explicitement son build au site GitHub Pages existant et vérifier le déploiement après fusion. Cela permettra une URL du type `https://sims07.github.io/enterprise-capacity-mapper/storybook/`, si le dépôt et Pages sont publics.

Storybook sert à inspecter les composants isolément. Il complète Vitest et Playwright, sans les remplacer. Les stories doivent importer le vrai code source, pas une copie de l'interface.
