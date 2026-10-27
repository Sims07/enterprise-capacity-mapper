# Architecture actuelle — Enterprise Capacity Mapper

> Référence de départ pour toute évolution technique ou migration. Ce document décrit les faits observables du dépôt ; il ne constitue pas une cible technologique.

## 1. Vue d'ensemble

Enterprise Capacity Mapper est une application de cartographie de capacités métier conçue pour rester :

- statique et déployable sur GitHub Pages ;
- utilisable hors ligne comme PWA ;
- sans backend ni base de données pour le fonctionnement nominal ;
- centrée sur un modèle de cartographie JSON versionné ;
- testable sans navigateur pour la majorité de la logique et avec Playwright pour les parcours navigateur.

La stack est React + Vite + TypeScript. Les commandes de référence sont `npm run typecheck`, `npm run test:unit`, `npm run test:e2e` et `npm run build`.

## 2. Cartographie des responsabilités

| Responsabilité | Implémentation actuelle | Ce qui doit rester stable |
|---|---|---|
| Bootstrap navigateur | `src/main.tsx` | Point d'entrée et initialisation PWA |
| Orchestration UI | `src/App.tsx` | Parcours et règles métier observables |
| Composants d'interface | `src/components/*.tsx` | Contrats fonctionnels et accessibilité |
| Persistance / import / export | `src/services/storage.ts` + ports/adaptateurs | Contrat de stockage et migrations de schéma |
| Analyse déterministe | `src/domain/cartographyAnalysis.ts` | Entrée/sortie JSON et absence de mutation |
| Fournisseurs IA | `src/adapters/ai/` | Contrats d'adaptation, séparation local/cloud |
| Tests domaine/application | `src/domain/*.test.ts`, `src/application/*.test.ts` | Règles métier et transitions pures |
| Tests ports/adaptateurs | `src/ports/*.test.ts`, `src/adapters/**/*.test.ts`, `tests/ai/*.test.ts` | Contrats et intégrations isolées |
| Tests navigateur | `playwright/e2e/*.spec.ts` | Parcours utilisateur critiques et frontières navigateur |
| Déploiement | `.github/workflows/` | Build statique, GitHub Pages, publication |
| PWA | `public/` + `src/sw.ts` | Manifest, service worker, cache/offline |

## 3. Modèle métier invariant

La sémantique métier est indépendante de React :

`Domaine N0 → Capacité N1 → Application`

Le code TypeScript utilise `Catalog` pour les identités, références et relations du catalogue et `MapLayout` pour les règles de matrice et de placement. `CatalogModel` reste le DTO JSON à la frontière de persistance.

Une cartographie peut également être configurée en profondeur 1 :

`Domaine N0 → Application`

Les relations applicatives restent explicites. Une application peut couvrir plusieurs cibles et une cible peut être couverte par plusieurs applications.

## 4. Contrat de données

Le modèle actif utilise `schemaVersion: 3`. `src/services/storage.ts` assure notamment la lecture du modèle actif, les migrations des anciens formats, la normalisation, la validation des références, la bibliothèque locale et l'import/export JSON.

Ce contrat de données est la principale frontière de migration. Une nouvelle technologie ne doit pas lire directement les détails de LocalStorage si elle peut consommer le port `ModelRepository` et son adaptateur.

## 5. État et persistance

Les préférences et l'état applicatif local utilisent actuellement LocalStorage. Le dépôt autorise également une source JSON distante pour des données partagées/publiées.

LocalStorage n'est pas le modèle métier : c'est une implémentation de persistance remplaçable derrière une frontière explicite.

## 6. Pyramide de tests

La pyramide est volontairement déséquilibrée vers les niveaux rapides :

```text
                 /\
                /  \
               / E2E\       Playwright — parcours utilisateur critiques
              /------\      navigateur réel, UI, PWA et persistance
             / Contrats\    ports + adaptateurs + intégrations ciblées
            /------------\
           / Unitaires     \ Vitest + V8 — domaine + application
          /----------------\
```

### Domaine / unitaires — Vitest

Les règles et invariants, calculs, migrations, modèles riches, transitions et cas limites sont exécutés sans navigateur. Vitest est le runner unique de cette couche et V8 fournit la couverture source.

Le noyau domaine + application conserve un seuil CI de **95 % de couverture ligne**.

### Application / contrats / adaptateurs

Les cas d'usage, ports, persistance, navigation, préférences et fournisseurs IA sont testés sans navigateur lorsqu'une simulation de dépendance apporte la même confiance.

### E2E — Playwright

Playwright vérifie les comportements visibles et les frontières qui nécessitent réellement un navigateur : navigation, UI, LocalStorage, import/export, responsive, compagnon, PWA et parcours critiques.

La suite est organisée autour de `critical-workflows.spec.ts`, `regression.spec.ts`, `mobile-navigation.spec.ts` et `mobile.spec.ts`. Elle utilise Chromium desktop et un projet Chromium mobile à 390×844 avec touch, des workers parallèles en CI, des traces en cas d'échec et des screenshots uniquement en cas d'échec.

La couverture E2E n'est **pas** une métrique source : elle sert d'oracle comportemental. Cela évite d'instrumenter le build uniquement pour compter les lignes traversées par le navigateur.

## 7. Principes de non-régression

Les tests E2E ne doivent pas recopier les tests métier. Ils doivent valider des parcours et des frontières. Les assertions privilégient les rôles, textes utiles, états accessibles et effets observables plutôt que les détails CSS fragiles.

Lorsqu'un parcours change fonctionnellement, le test Playwright associé doit être adapté dans la même PR. Les tests unitaires et contrats doivent rester au niveau le plus bas qui apporte une confiance suffisante.

## 8. Dépendances technologiques à isoler

Les dépendances liées au runtime sont notamment React, Vite, les Browser APIs (`localStorage`, `fetch`, `Blob`, `URL`), le service worker/manifest et GitHub Pages. Elles doivent rester remplaçables derrière les ports et adaptateurs appropriés.

Le runner E2E actuel est Playwright. Cypress et son instrumentation Istanbul ne font plus partie de la chaîne de validation.

## 9. Ce qui n'est pas un objectif de migration

Une évolution technique ne doit pas modifier implicitement :

- la sémantique TOGAF / capability mapping ;
- la structure logique N0/N1/Application ;
- les règles de couverture et de relations ;
- le format d'import/export sans plan de compatibilité ;
- les règles de validation ;
- les comportements critiques couverts par Playwright ;
- les garanties de confidentialité du compagnon IA ;
- la capacité à récupérer une cartographie existante.
