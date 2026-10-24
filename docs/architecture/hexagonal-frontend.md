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

Le port IA est volontairement exprimé en termes de besoin applicatif (`ask`) et ne connaît ni Ollama, ni HTTP, ni un autre fournisseur. L'adaptateur `src/adapters/ai/companionAdapter.js` branche l'implémentation actuelle des fournisseurs IA sur ce contrat.

## Application et domaine

- `src/application/modelHistory.js` : undo/redo sans React ni navigateur.
- `src/application/modelCommands.js` : transformations du modèle.
- `src/application/mapService.js` : orchestration des cas d'usage.

Ces modules sont testables avec Node, indépendamment du navigateur.

## Adaptateurs

Les adaptateurs contiennent les détails techniques :

- navigateur et `localStorage` pour la persistance ;
- Browser History pour la navigation ;
- fournisseur IA pour le compagnon.

`src/adapters/react/architecture.js` sert de composition root : il assemble les dépendances concrètes avant de les exposer à React.

## Règle d'évolution

`App.jsx` et `CartographerCompanion.jsx` doivent progressivement devenir des adaptateurs de présentation : ils lisent l'état, déclenchent les cas d'usage et rendent l'interface.

Toute nouvelle règle métier, manipulation du modèle ou dépendance externe doit être placée dans `application/` ou derrière un port. En particulier, un composant React ne doit pas appeler directement un fournisseur IA.

La migration reste incrémentale : chaque déplacement doit conserver le comportement existant et être protégé par les tests unitaires ou Cypress appropriés. Une réécriture complète n'est pas recherchée.
