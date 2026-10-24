# Architecture hexagonale du frontend

## Objectif

Le frontend est organisé pour que React soit un **adaptateur entrant** et non le lieu où résident les règles métier. Les décisions métier et les cas d'usage doivent pouvoir être exécutés sans DOM, sans `window`, sans `localStorage` et sans dépendance à React.

## Couches

```text
                    ┌──────────────────────────────┐
                    │        Adaptateurs UI         │
                    │ React / composants / hooks    │
                    └──────────────┬───────────────┘
                                   │ appels entrants
                           ┌───────▼────────┐
                           │ Application     │
                           │ use cases       │
                           │ mapService      │
                           └───────┬────────┘
                                   │
                           ┌───────▼────────┐
                           │ Domaine        │
                           │ commandes      │
                           │ histoire       │
                           └───────┬────────┘
                                   │ ports
                 ┌─────────────────┴──────────────────┐
                 │                                    │
       ┌─────────▼─────────┐                ┌─────────▼─────────┐
       │ Storage adapter   │                │ Navigation adapter │
       │ localStorage      │                │ browser history   │
       └───────────────────┘                └───────────────────┘
```

## Ports

- `src/ports/modelRepository.js` définit le port sortant de persistance.
- `src/ports/navigation.js` définit le port de navigation.

Les ports sont des contrats. Une implémentation future peut utiliser une autre source de données ou une autre navigation sans modifier les règles de cartographie.

## Application et domaine

- `src/application/modelHistory.js` contient l'historique undo/redo, sans React.
- `src/application/modelCommands.js` contient les transformations de modèle.
- `src/application/mapService.js` orchestre les cas d'usage et dépend uniquement des ports.

Ces modules sont testables avec Node, indépendamment du navigateur.

## Adaptateurs

- `src/adapters/browser/localStorageRepository.js` adapte le service de stockage actuel au port de repository.
- `src/adapters/react/architecture.js` est le composition root du frontend : il assemble React avec les ports et adaptateurs.

## Règle d'évolution

`App.jsx` doit progressivement devenir un adaptateur de présentation : il lit l'état applicatif, déclenche des cas d'usage et rend les composants. Toute nouvelle règle métier, manipulation du modèle ou persistance doit être ajoutée dans `application/` ou derrière un port, jamais directement dans un composant React.

La migration est volontairement incrémentale : les fonctionnalités existantes restent dans l'adaptateur tant qu'elles n'ont pas été déplacées avec une couverture de tests suffisante. Cela évite une réécriture risquée de l'éditeur et permet de réduire le couplage par cas d'usage.
