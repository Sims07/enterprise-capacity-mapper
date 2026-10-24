# Architecture hexagonale du frontend

## Objectif

Le frontend est organisé en **trois blocs** : React, application/domaine et ports/adaptateurs. React est un adaptateur entrant ; les règles de cartographie ne dépendent ni du DOM, ni de React, ni d'un fournisseur technique.

## Les trois blocs

```text
                         ┌──────────────────┐
                         │      REACT       │
                         │ UI + hooks       │
                         └────────┬─────────┘
                                  │ use cases
                                  ▼
                         ┌──────────────────┐
                         │ APPLICATION /    │
                         │ DOMAINE          │
                         │ modèle + règles  │
                         └────────┬─────────┘
                                  │ ports
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
                 Storage          AI       Navigation
                 adapter       adapter       adapter
```

On ne crée pas de couches supplémentaires simplement pour appliquer un pattern. Chaque abstraction doit protéger une règle métier ou isoler une dépendance technique réelle.

## Ports

- `src/ports/modelRepository.js` : persistance des cartographies.
- `src/ports/navigation.js` : navigation entre les vues applicatives.
- `src/ports/aiCompanion.js` : interaction avec le compagnon IA.

Le port IA est volontairement exprimé en termes de besoin applicatif (`ask`) et ne connaît ni Ollama, ni HTTP, ni un autre fournisseur. L'adaptateur `src/adapters/ai/companionAdapter.js` branche l'implémentation actuelle des fournisseurs IA sur ce contrat. Les préférences de l'interface, le scroll/drag-and-drop et les interactions DOM des menus sont isolés dans `src/adapters/browser/appPreferences.js`, `src/adapters/browser/browserViewport.js` et `src/adapters/browser/browserInteractions.js`.

## Application et domaine

- `src/application/modelHistory.js` : undo/redo sans React ni navigateur.
- `src/application/modelUseCases.js` : cas d’utilisation de transformation du modèle, dont la création d’une cartographie vide.
- `src/application/catalogUseCases.js` : création, modification et suppression des domaines N0, capacités N1 et applications, avec nettoyage des relations dépendantes.
- `src/application/coverageUseCases.js` : calcul des indicateurs de couverture (gap, couvert, redondance) et des éléments touchés par la sélection, sans dépendance React.
- `src/application/mapService.js` : orchestration des cas d'usage.

Ces modules sont testables avec Node, indépendamment du navigateur. Les opérations métier sont nommées comme des cas d’utilisation ; le service de cartographie les orchestre avec l’historique et le port de persistance.

## Adaptateurs

Les adaptateurs contiennent les détails techniques :

- navigateur et `localStorage` pour la persistance ;
- Browser History pour la navigation ;
- fournisseur IA pour le compagnon.

`src/adapters/react/architecture.js` sert de composition root : il assemble les dépendances concrètes avant de les exposer à React. La factory accepte aussi des dépendances injectées (repository, navigation, service de cartographie, préférences, viewport et factory IA), ce qui permet de substituer les adaptateurs dans les tests sans conteneur IoC global.

## Règle d'évolution

`App.jsx` et `CartographerCompanion.jsx` doivent progressivement devenir des adaptateurs de présentation : ils lisent l'état, déclenchent les cas d'usage et rendent l'interface. `App.jsx` compose désormais ses dépendances une seule fois via la factory ; il ne lit plus directement `localStorage`, ne manipule plus `window.history` et délègue le scroll/drag auto-scroll à l'adaptateur viewport ainsi que le calcul de position, les écouteurs de fermeture des menus et l'abonnement aux événements clavier à l'adaptateur d'interactions navigateur. Le compagnon reçoit sa factory IA en propriété et ne choisit plus directement la factory d'infrastructure par défaut.

Toute nouvelle règle métier, manipulation du modèle ou dépendance externe doit être placée dans `application/` ou derrière un port. En particulier, un composant React ne doit pas appeler directement un fournisseur IA.

La migration reste incrémentale : chaque déplacement doit conserver le comportement existant et être protégé par les tests unitaires ou Cypress appropriés. Une réécriture complète n'est pas recherchée.


### Extraction des règles de mise en page

Les transformations de l'éditeur de structure sont regroupées dans `src/application/layoutUseCases.js`. Ce module pur complète la grille des zones colonne/layer, renomme les colonnes et zones, ajoute ou retire des colonnes/layers, prépare une structure validée pour l'enregistrement et vérifie les chevauchements de domaines. Il ne dépend ni de React ni du navigateur.

`App.jsx` conserve l'orchestration d'interface : état temporaire du formulaire, ouverture/fermeture de la modale, notifications et application du résultat au modèle. Les règles déterministes de transformation sont testées séparément dans `src/application/layoutUseCases.test.js`. Cette extraction constitue une première tranche du découpage orchestration/présentation ; les autres parcours métier restent à extraire par tranches testées.


### Extraction des règles de relations

Les transformations des liens entre applications et capacités sont regroupées dans `src/application/relationshipUseCases.js`. Ce module pur prend en charge l'affectation et le retrait d'une relation, l'association groupée d'applications à une cible, ainsi que la préparation des relations depuis la modale d'édition. Lorsqu'une application est éditée, les identifiants qui ne font pas partie de la cartographie affichée sont conservés.

`App.jsx` conserve la sélection temporaire, les cases cochées, les notifications et la validation de la modale ; il délègue désormais les transformations du tableau d'applications au module applicatif. Les cas d'ajout idempotent, de retrait, de sélection groupée, de remplacement et de conservation des relations externes sont couverts par `src/application/relationshipUseCases.test.js`.


### Création de cartographie

La création d'une nouvelle cartographie passe désormais par `createEmptyMap` dans `modelUseCases.js`, orchestré par `mapService.js`. `App.jsx` conserve les effets propres à l'interface (export de sauvegarde demandé, navigation, sélection et notifications), tandis que la construction du nouvel état du modèle est centralisée dans le cas d'utilisation. Un test du service vérifie le contenu initial et la possibilité d'annuler cette création.


### Extraction du catalogue métier (L4)

Les mutations du catalogue sont regroupées dans `src/application/catalogUseCases.js` : création et modification des domaines N0, création et modification des capacités N1, création d'applications et suppression d'un domaine avec nettoyage des dépendances. Les cas d'utilisation sont des fonctions pures qui reçoivent les données et les identifiants ; la validation du formulaire, la génération des identifiants, les notifications et la gestion des modales restent dans `App.jsx`.

Les tests `src/application/catalogUseCases.test.js` couvrent les transformations des entités, la conservation des propriétés de layout lors d'une modification et les règles existantes de suppression des relations selon la profondeur de cartographie. Cette dernière distinction est volontairement conservée pour éviter de modifier le comportement fonctionnel dans un refactoring.


### Analyse de couverture et d'impact

Le calcul des états de couverture d'une capacité (gap, couverte, redondante) et les listes de synthèse pour l'analyse d'impact sont extraits dans `coverageUseCases.js`. Ces cas d'utilisation sont en lecture seule : ils dérivent des indicateurs à partir des capacités visibles, des applications et de la sélection. React conserve l'état de sélection et le rendu des indicateurs.

Les tests dédiés vérifient les trois états, les liens manquants, les relations multiples, la compatibilité avec les applications sans `capabilityIds` et l'absence de mutation des données.
