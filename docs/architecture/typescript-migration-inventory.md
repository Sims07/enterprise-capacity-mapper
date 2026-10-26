# Inventaire de migration TypeScript

Ce document a servi à préparer les lots de migration progressive vers TypeScript. Les lots applicatifs et la migration des spécifications Cypress sont désormais terminés.

## État final

Le dépôt est maintenant entièrement TypeScript pour le code applicatif et les tests E2E :

- `src/**/*.ts` et `src/**/*.tsx` pour l'application ;
- `cypress/**/*.ts` pour Cypress ;
- `vite.config.ts` et `cypress.config.ts` pour la configuration principale ;
- `scripts/**/*.ts` pour les scripts de qualité ;
- aucun fichier `.js`, `.jsx` ou `.cy.js` ne subsiste dans le code applicatif ou les tests E2E.

Les fichiers JavaScript ne constituent donc plus une dette de migration applicative. Les règles de contribution doivent continuer à éviter leur réintroduction.

## Architecture obtenue

Les frontières principales sont maintenant explicites :

- `src/domain/` — modèle métier et invariants ;
- `src/application/` — cas d'usage et orchestration métier ;
- `src/ports/` — contrats sortants/entrants ;
- `src/adapters/` — intégrations navigateur, IA et React ;
- `src/components/` — présentation React ;
- `src/services/` — services transverses, notamment stockage et import/export.

Le test `test/architecture-boundaries.test.ts` vérifie automatiquement des règles de dépendance afin d'empêcher les régressions évidentes de ces frontières.

## Stratégie de tests issue de la migration

La migration TypeScript a été accompagnée d'une réorganisation de la pyramide :

1. **Domaine / unitaires** — règles, invariants et cas limites sans navigateur ;
2. **Application / contrats / adaptateurs** — use cases, ports et intégrations avec dépendances injectées ;
3. **Cypress E2E** — parcours critiques et intégration UI/browser/PWA.

Le domaine et l'application constituent désormais le niveau de confiance principal : la CI exige au moins **95 % de couverture ligne** sur `src/domain/**` + `src/application/**`.

Les tests Cypress sont conservés pour les comportements qu'un test unitaire ne peut pas valider correctement : parcours utilisateur, composition React, persistance navigateur, navigation, PWA et intégration réelle des frontières visibles.

La dernière rationalisation Cypress a réduit les scénarios redondants sans retirer de parcours critique : **17 specs / 105 tests**, avec une couverture Cypress de **79,27 %**, une couverture consolidée de **87,21 %** et une couverture unitaire domaine/application de **96,8 %** sur la dernière CI documentée.

## Contrôles CI

La CI de référence exécute :

1. `npm run typecheck` ;
2. `npm run test:unit:coverage` ;
3. `npm run test:unit:coverage:core` avec seuil de 95 % ;
4. build instrumenté ;
5. Cypress avec collecte de couverture ;
6. consolidation unitaires + Cypress ;
7. build de production.

Le badge de couverture publié sur `main` est alimenté par la couverture ligne **consolidée**. Il ne doit pas être interprété comme la couverture Cypress seule.

## Typage strict

`strict` reste activé dans `tsconfig.json`, mais quatre options sont temporairement relâchées :

- `noImplicitAny` ;
- `strictNullChecks` ;
- `strictPropertyInitialization` ;
- `useUnknownInCatchVariables`.

Ce point est une **dette de typage ciblée**, pas une dette JavaScript. Elle peut être réduite progressivement si des erreurs concrètes et utiles sont identifiées ; elle ne justifie pas une nouvelle phase globale de migration.

## Outillage hors code applicatif

Le dépôt peut contenir des contraintes ou artefacts d'outillage spécifiques à GitHub Actions et aux dépendances. Ils ne doivent pas être confondus avec le code applicatif TypeScript.

La règle importante est de ne plus réintroduire de JavaScript dans `src/` ou `cypress/` sans décision explicite et documentée.
