# POC Vitest + Playwright

## Objectif

Cette PR teste une évolution de la pyramide de tests sans changer le comportement métier :

- **Vitest** devient le runner des tests unitaires existants, en conservant temporairement leur API `node:test` via un alias de compatibilité afin d'éviter une réécriture mécanique de la suite.
- **V8 coverage** remplace l'instrumentation Istanbul nécessaire à la couverture unitaire. Vitest collecte la couverture directement à l'exécution, sans build instrumenté dédié.
- **Playwright** devient le runner E2E cible. Le POC couvre quelques parcours à forte valeur métier et une validation mobile.
- **Cypress est conservé pendant le POC** avec `npm run test:e2e:cypress` et la CI historique. Il n'est donc pas supprimé avant d'avoir comparé les résultats et la stabilité.

## Périmètre Playwright du POC

Les scénarios sont volontairement peu nombreux :

1. renommer une capacité N1 et vérifier la persistance après rechargement ;
2. créer une cartographie vierge avec l'assistant ;
3. vérifier la navigation mobile à 390×844 et l'absence de débordement horizontal ;
4. enregistrer une cartographie locale et la retrouver après rechargement.

Ces scénarios représentent le bon niveau pour l'E2E : navigateur réel, UI, navigation et frontière de persistance. Les règles métier détaillées restent couvertes en tests unitaires/contrats.

## Commandes

```bash
npm run test:unit
npm run test:unit:coverage
npm run test:unit:coverage:core
npm run test:e2e:playwright
npm run test:e2e:cypress
```

Le POC Playwright utilise Chromium desktop et l'émulation iPhone 13. Les traces sont conservées en cas d'échec.

## Suite après le POC

Si les résultats CI confirment la stabilité et le gain de temps, la migration pourra être faite progressivement :

1. transférer les autres parcours Cypress utiles vers Playwright ;
2. supprimer les doublons Cypress ;
3. décider si la couverture E2E reste une métrique séparée ou si la couverture source unitaire devient la métrique principale ;
4. retirer l'instrumentation Cypress et le build instrumenté de la CI ;
5. supprimer Cypress seulement lorsque la couverture comportementale équivalente est démontrée.
