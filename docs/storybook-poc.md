# Storybook — catalogue UI et régressions visuelles

Storybook réutilise les composants et les styles réels de l'application. Il ne doit pas contenir de copie HTML/CSS de l'interface : les stories importent le code source de `src/`.

## Démarrage local

Avec Node.js 24 :

```bash
npm install
npm install --prefix storybook-poc
npm run storybook --prefix storybook-poc
```

Ouvrir `http://localhost:6006`. Les contrôles Storybook proposent les thèmes clair et sombre et les viewports téléphone (390×844), tablette (768×1024) et bureau (1440×900).

## Catalogue actuel

- **Application / Capacity Mapper** : l'application réelle via `ResponsiveApp`, avec ses données de démonstration, pour examiner la cartographie, la navigation, les relations, la barre d'outils et les états d'interface.
- **Application / Guide TOGAF** : le vrai composant modal d'aide, avec variantes bureau et mobile.
- **Design system / Tokens sémantiques** : aperçu des variables CSS définies dans `src/styles/tokens.css`.

Ajouter une story à partir du composant de production correspondant. Les états interactifs doivent utiliser des props et des données de test explicites plutôt qu'une imitation du rendu.

## Tests de régression visuelle

Les tests dédiés se trouvent dans `playwright/storybook/` et utilisent `playwright.storybook.config.ts`, indépendamment de la suite E2E applicative.

```bash
npx playwright install chromium
npx playwright test --config=playwright.storybook.config.ts
```

Les tests capturent quatre références de la cartographie réelle : bureau clair/sombre et mobile 390×844 clair/sombre. Ils contrôlent aussi l'absence de débordement horizontal sur mobile. Une différence de pixels doit être examinée comme une possible régression CSS, pas acceptée automatiquement.

### Première création ou mise à jour des références

Pour initialiser les références après revue du rendu attendu, ou après un changement visuel volontaire :

```bash
npx playwright test --config=playwright.storybook.config.ts --update-snapshots
```

Vérifier visuellement les PNG générés dans `playwright/storybook/__screenshots__/` avant de les committer. Ne jamais lancer `--update-snapshots` comme commande habituelle de CI : cela masquerait les régressions. Si une story ou une capture est modifiée intentionnellement, la PR doit expliquer pourquoi les références changent.

La CI construit Storybook, lance les tests visuels avec Chromium et conserve les rapports Playwright et les captures de diagnostic en artefacts, y compris en cas d'échec.

## Publication

Le build statique est placé dans `dist/storybook/`, sans être importé par le runtime PWA. La CI construit Storybook avec le préfixe `/enterprise-capacity-mapper/storybook/` et l'inclut dans l'artefact GitHub Pages. Après réussite du déploiement, l'URL attendue est `https://sims07.github.io/enterprise-capacity-mapper/storybook/`.

Storybook et les tests visuels complètent Vitest et les parcours E2E existants. Ils ne remplacent pas les tests métier. Les contrôles complémentaires d'accessibilité sont volontairement hors périmètre de cette étape.
