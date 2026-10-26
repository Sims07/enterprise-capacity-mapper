# Architecture actuelle — Enterprise Capacity Mapper

> Référence de départ pour toute évolution technique ou migration. Ce document décrit les faits observables du dépôt ; il ne constitue pas une cible technologique.

## 1. Vue d'ensemble

Enterprise Capacity Mapper est une application de cartographie de capacités métier conçue pour rester :

- statique et déployable sur GitHub Pages ;
- utilisable hors ligne comme PWA ;
- sans backend ni base de données pour le fonctionnement nominal ;
- centrée sur un modèle de cartographie JSON versionné ;
- testable par des tests Node déterministes, des tests de contrats/adaptateurs et Cypress E2E.

La stack actuelle est React + Vite + TypeScript, avec `react-dom`, Vite et Cypress. Le code applicatif et les spécifications Cypress sont désormais en TypeScript ; les fichiers JavaScript ne constituent plus le code source applicatif ou les tests E2E. Les commandes de référence sont `npm run typecheck`, `npm run test:unit`, `npm run test:e2e` et `npm run build`.

## 2. Cartographie des responsabilités

| Responsabilité | Implémentation actuelle | Ce qui doit rester stable |
|---|---|---|
| Bootstrap navigateur | `src/main.tsx` | Point d'entrée et initialisation PWA doivent rester remplaçables |
| Orchestration UI | `src/App.tsx` | Parcours et règles métier observables |
| Composants d'interface | `src/components/*.tsx` | Contrats fonctionnels et accessibilité |
| Modèle de démonstration | `src/data/demoData.ts` | Aucun rôle d'infrastructure |
| Persistance / import / export | `src/services/storage.ts` + ports/adaptateurs | Contrat de stockage et migrations de schéma |
| Analyse déterministe | `src/domain/cartographyAnalysis.ts` | Entrée/sortie JSON et absence de mutation |
| Fournisseurs IA | `src/adapters/ai/` | Contrats d'adaptation, séparation local/cloud |
| Présentation | `src/styles/` | Tokens sémantiques et comportement visuel |
| Tests de domaine/application | `src/domain/*.test.ts`, `src/application/*.test.ts` | Règles métier et transitions pures |
| Tests de ports/adaptateurs | `src/ports/*.test.ts`, `src/adapters/**/*.test.ts`, `tests/ai/*.test.ts` | Contrats et intégrations isolées |
| Tests de comportement | `cypress/e2e/*.cy.ts` | Parcours utilisateur critiques |
| Déploiement | `.github/workflows/` | Build statique, base path GitHub Pages, publication |
| PWA | `public/` + `src/sw.ts` | Manifest, service worker, cache/offline |

## 3. Modèle métier invariant

La sémantique métier est indépendante de React :

`Domaine N0 → Capacité N1 → Application`

Le code TypeScript introduit deux modèles de domaine riches : `Catalog` (`src/domain/catalog.ts`) pour les identités, références et relations du catalogue, et `MapLayout` (`src/domain/mapLayout.ts`) pour les règles de matrice et de placement. `CatalogModel` reste le DTO JSON à la frontière de persistance ; il ne doit pas être utilisé comme objet métier mutable. Les cas d’usage adaptent les formulaires puis délèguent les transitions au domaine.

Une cartographie peut également être configurée en profondeur 1 :

`Domaine N0 → Application`

Les relations applicatives restent explicites. Une application peut couvrir plusieurs cibles et une cible peut être couverte par plusieurs applications.

Les concepts Gap, Redundancy, Impact et Coverage sont des concepts fonctionnels ; ils ne doivent pas être déduits de la technologie de présentation.

## 4. Contrat de données

Le modèle actif utilise actuellement `schemaVersion: 3`. `src/services/storage.ts` assure :

- lecture de la clé LocalStorage du modèle actif ;
- migration des modèles v2 et des anciennes clés `ea_canvas_*` ;
- normalisation du modèle ;
- validation des références entre domaines, capacités et applications ;
- gestion de la bibliothèque locale et des cartes récentes ;
- import/export JSON ;
- chargement optionnel d'un JSON distant HTTPS ;
- normalisation d'une URL GitHub `blob` vers son contenu `raw`.

Ce contrat de données est la principale frontière de migration. Une nouvelle technologie ne doit pas lire directement les détails de LocalStorage si elle peut consommer le port `ModelRepository` et son adaptateur.

## 5. État et persistance

Les préférences et l'état applicatif local utilisent actuellement LocalStorage. Cela comprend notamment le modèle, la bibliothèque locale, les cartes récentes, le thème et la configuration de certaines fonctions.

Le dépôt autorise une source JSON distante pour les données partagées/publiées. Cette source est volontairement distincte de la persistance locale.

**Conséquence pour une migration :** LocalStorage n'est pas le modèle métier. C'est une implémentation d'un mécanisme de persistance. Electron, IndexedDB, un fichier local, une API ou une autre technologie pourront remplacer cet adaptateur sans redéfinir la sémantique du modèle.

## 6. Tests et pyramide de tests

La stratégie actuelle suit une pyramide volontairement déséquilibrée vers le bas :

```text
                 /\
                /  \
               / E2E\       Cypress — parcours utilisateur critiques
              /------\      17 specs / 105 tests sur l'état de référence récent
             / Contrats\    ports + adaptateurs + intégrations ciblées
            /------------\
           / Unitaires     \ domaine + application + règles déterministes
          /----------------\
```

Les responsabilités sont séparées ainsi :

- **Domaine / unitaires** : règles et invariants, calculs de couverture/impact, modèle riche `Catalog` et `MapLayout`, transitions et cas limites. Ces tests sont exécutés sans navigateur lorsque cela est possible.
- **Application / contrats / adaptateurs** : cas d'usage, ports, persistance navigateur, navigation, préférences et fournisseurs IA avec dépendances injectées. Ils vérifient les frontières plutôt que l'implémentation privée.
- **Cypress E2E** : comportement visible et intégration réelle de l'UI, persistance navigateur et intégration PWA/browser. Les scénarios critiques sont conservés ; les scénarios purement redondants ont été rationalisés.

La CI impose en particulier une couverture ligne de **95 % minimum sur le noyau domaine + application**. La couverture consolidée combine la couverture des tests unitaires et Cypress sur leur périmètre commun ; le badge publié correspond à cette union consolidée. La couverture Cypress seule reste un indicateur complémentaire et n'est pas confondue avec la couverture consolidée.

La suite Cypress récente a été rationalisée sans retirer les parcours métier critiques : 17 specs et 105 tests, avec 79,27 % de couverture Cypress et 87,21 % de couverture consolidée sur la dernière CI documentée de la PR de rationalisation. Les tests unitaires domaine/application étaient à 96,8 %, au-dessus du seuil CI de 95 %.

La suite E2E doit être considérée comme un **oracle comportemental** : lors d'une migration, on cherche à conserver les comportements attendus, pas les sélecteurs, composants ou détails d'implémentation React.

Les assertions fragiles sur les valeurs RGB/RGBA ne font pas partie du contrat de migration. Les tests doivent privilégier les rôles, textes utiles, états accessibles et effets visibles.

## 7. Dépendances technologiques à isoler

Les dépendances suivantes sont explicitement liées à la plateforme actuelle :

- React / `react-dom` : rendu et cycle de vie UI ;
- Vite : bundling et serveur de développement ;
- Browser APIs : `localStorage`, `fetch`, `Blob`, `URL`, événements clavier/souris ;
- service worker / manifest : installation et cache/offline ;
- GitHub Pages : hébergement statique et base path ;
- Cypress : exécution des scénarios E2E.

Lors d'une migration, chacune doit être classée comme :

1. **à conserver** parce qu'elle porte un besoin métier ou un contrat utilisateur ;
2. **à adapter** parce qu'elle dépend du runtime ;
3. **à remplacer** parce qu'elle appartient à la plateforme ;
4. **à supprimer** parce qu'elle n'est plus nécessaire.

## 8. Zones de couplage actuelles à surveiller

### `src/App.tsx`

Le composant principal reste volumineux et concentre encore beaucoup d'orchestration, d'état, de formulaires et de comportements. C'est le principal point de couplage avec React. Les ports, cas d'usage et modèles riches réduisent déjà le couplage métier, mais une migration UI importante devra éviter de reproduire cette concentration.

### `src/services/storage.ts`

La frontière existe et est maintenant consommée derrière `ModelRepository`, mais le service regroupe encore modèle, migration, validation, persistance et import/export. C'est une bonne frontière fonctionnelle ; elle pourra être découpée progressivement si un bénéfice concret apparaît.

### Browser APIs

Le code utilise directement plusieurs API navigateur dans les adaptateurs. Elles doivent rester derrière ces frontières dans toute migration vers Electron ou un autre runtime.

## 9. Ce qui n'est pas un objectif de migration

Une migration ne doit pas modifier implicitement :

- la sémantique TOGAF / capability mapping ;
- la structure logique N0/N1/Application ;
- les règles de couverture et de relations ;
- le format d'import/export sans plan de compatibilité ;
- les règles de validation ;
- les comportements critiques couverts par Cypress ;
- les garanties de confidentialité du compagnon IA ;
- la capacité à récupérer une cartographie existante.

Toute modification de ces éléments est une évolution fonctionnelle distincte et doit être traitée comme telle.
