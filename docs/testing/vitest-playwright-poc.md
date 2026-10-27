# Vitest + Playwright — stratégie de tests

La migration de la pyramide de tests est maintenant terminée sur cette branche.

## Principes

- **Vitest** est le runner des tests unitaires. Les tests existants utilisant l'API `node:test` sont exécutés via un petit adaptateur de compatibilité afin d'éviter une réécriture mécanique.
- **V8 coverage** collecte la couverture directement pendant les tests unitaires. Il n'y a plus de build instrumenté Istanbul dédié à l'E2E.
- **Playwright** est le runner E2E. Les tests décrivent des comportements utilisateur, la persistance et les frontières navigateur/PWA.
- Les règles métier restent au niveau domaine/application et les contrats/adaptateurs restent testés sans navigateur lorsque c'est suffisant.

## E2E Playwright

La suite est organisée par valeur fonctionnelle :

- `critical-workflows.spec.ts` : parcours critiques de renommage, assistant et bibliothèque locale ;
- `regression.spec.ts` : navigation, wizard, analyse/relations, import/export, migration locale et compagnon ;
- `mobile-navigation.spec.ts` et `mobile.spec.ts` : validations responsive à 390×844, débordement horizontal, contrôles tactiles, structure et compagnon.

Les scénarios sont exécutés avec Chromium desktop et un projet Chromium mobile simulant un viewport 390×844 avec touch.

Playwright utilise des attentes et assertions orientées utilisateur, des workers parallèles en CI, des traces conservées en cas d'échec et des screenshots uniquement en cas d'échec.

## Couverture

La couverture source de référence est désormais celle de Vitest/V8 :

```bash
npm run test:unit:coverage
npm run test:unit:coverage:core
```

Le noyau domaine + application conserve son seuil minimal de **95 % de couverture ligne**.

La couverture E2E n'est volontairement plus utilisée comme métrique source : son rôle est de valider des parcours et des frontières navigateur. Cela évite d'instrumenter le build de production uniquement pour mesurer le passage des tests E2E.

## CI

Le workflow de déploiement :

1. installe les dépendances ;
2. exécute les unitaires Vitest ;
3. produit et vérifie les rapports de couverture V8 ;
4. vérifie le seuil domaine/application ;
5. construit l'application ;
6. installe Chromium Playwright ;
7. exécute la suite E2E desktop/mobile ;
8. publie les rapports de test ;
9. publie l'application sur GitHub Pages lorsque toutes les validations passent.

Cypress et son instrumentation Istanbul ont été retirés de la CI et du projet.

## Commandes locales

```bash
npm run test:unit
npm run test:unit:coverage
npm run test:unit:coverage:core
npm run test:e2e:playwright
npm run build
npm run typecheck
```

Pour diagnostiquer un E2E :

```bash
npx playwright test --debug
npx playwright show-report
```
