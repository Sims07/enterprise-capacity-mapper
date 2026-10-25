# Inventaire de migration TypeScript

Ce document prépare les lots 2 et 3 de la migration progressive vers TypeScript. Il ne change pas le comportement de l'application.

## État de référence

La CI du dernier commit de la migration valide :

- `npm run typecheck` ;
- tests unitaires déterministes ;
- build instrumenté ;
- Cypress et collecte de couverture ;
- build de production.

Les contrôles doivent rester verts sur le même SHA avant chaque bascule de périmètre.

## Lot 2 — services, ports et données

### Priorité 1 — contrats et persistance

- `src/ports/modelRepository.js` → `modelRepository.ts`
- `src/ports/navigation.js` → `navigation.ts`
- `src/ports/aiCompanion.js` → `aiCompanion.ts`
- `src/adapters/browser/localStorageRepository.js` → `localStorageRepository.ts`
- `src/adapters/browser/appPreferences.js` → `appPreferences.ts`
- `src/services/storage.js` → `storage.ts`

Les types partagés du modèle doivent être centralisés avant de typer les adapters afin d'éviter plusieurs définitions concurrentes de `Domain`, `Capability`, `Application` et du modèle global.

### Priorité 2 — logique applicative restante

- `src/application/mapService.js` → `mapService.ts`
- `src/application/modelHistory.js` → `modelHistory.ts`
- `src/data/demoData.js` → `demoData.ts`

Les tests unitaires existants doivent migrer avec leur module lorsque leur contrat change ; ils restent JavaScript tant que cela ne crée pas de bénéfice à les convertir.

### Priorité 3 — services IA et adapters navigateur

- `src/services/ai/cartographyAnalysis.js` → `cartographyAnalysis.ts`
- `src/services/ai/companionProviders.js` → `companionProviders.ts`
- `src/adapters/ai/providerClient.js` → `providerClient.ts`
- `src/adapters/ai/companionAdapter.js` → `companionAdapter.ts`
- `src/adapters/browser/browserInteractions.js` → `browserInteractions.ts`
- `src/adapters/browser/browserViewport.js` → `browserViewport.ts`

Pour les réponses JSON externes, les types TypeScript ne remplacent pas une validation runtime. Les frontières d'import, de stockage et d'IA devront donc conserver une validation explicite.

## Lot 3 — interface React

### Point d'entrée

- `src/main.jsx` → `main.tsx`
- `src/App.jsx` → `App.tsx`

`App.jsx` est un fichier volumineux et critique : sa migration doit être faite en dernier parmi les fichiers centraux, avec vérification du diff et du build après chaque étape. Aucun remplacement partiel d'un gros fichier ne doit être effectué à partir d'un contenu tronqué.

### Composants

Migrer ensuite, par périmètre fonctionnel :

- `CartographerCompanion.jsx`
- `Dashboard.jsx`
- `CoverageTree.jsx`
- `NewMapWizard.jsx`
- `TogafGuide.jsx`
- `PwaUpdateNotice.jsx`

Chaque composant devra typer ses props et les contrats échangés avec les use cases/adapters, sans introduire de `any` global.

## État du lot 3

- `index.html` charge directement `src/main.tsx`.
- `main.tsx` et `App.tsx` sont les seuls points d'entrée applicatifs ; les anciens `main.jsx` et `App.jsx` ont été supprimés.
- Les six composants React listés ci-dessus sont des fichiers TSX de première classe ; leurs anciens shims JSX ont été supprimés et `App.tsx` importe explicitement les fichiers TSX.
- Les anciens shims JavaScript de production ont été supprimés après bascule des tests unitaires vers les modules TypeScript. Les fichiers JavaScript restants dans `src` sont les tests unitaires ; ils importent directement les modules `.ts`. Les fichiers de configuration et Cypress restent en JavaScript hors du périmètre applicatif.

## Règles de bascule

1. Créer le `.ts`/`.tsx` à partir du fichier source complet vérifié.
2. Faire pointer les consommateurs vers le nouveau module.
3. Conserver temporairement un shim `.js` uniquement si nécessaire à la transition.
4. Exécuter typecheck + unitaires + build + Cypress.
5. Vérifier le diff et l'intégrité du fichier migré avant de supprimer le shim.
6. Supprimer le `.js` uniquement lorsque plus aucun consommateur ne l'utilise.

## Fin de migration

La suppression des shims applicatifs est terminée. Le mode `strict` est activé, avec exceptions explicites et temporaires : `noImplicitAny`, `strictNullChecks`, `strictPropertyInitialization` et `useUnknownInCatchVariables` restent désactivés. Leur activation a été testée et révèle des erreurs de typage concentrées sur l'état React et les contrats UI ; ces exceptions doivent être retirées progressivement en typant ces contrats, sans sacrifier la validation CI. Les fichiers de configuration/outillage (`vite.config.js`, `cypress.config.js`, scripts CI) restent hors migration applicative tant qu'un gain clair n'est pas démontré.
