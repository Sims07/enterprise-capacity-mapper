# Lot 1 — Rationalisation de la navigation

## Objectif

Clarifier les responsabilités des espaces de l'application sans supprimer de fonctionnalité :

- **Cartographie** : construire et modifier le modèle.
- **Analyse** : comprendre la couverture, les gaps, les redondances et les impacts.
- **Bibliothèque** : gérer les cartographies locales et récentes.
- **Outils** : regrouper les fonctions transverses (import/export, guide TOGAF, affichage, version).

## Transition fonctionnelle

Les vues existantes **Relations**, **Impact** et **Dashboard** restent fonctionnellement disponibles pendant cette première étape. Elles ne doivent pas être supprimées ou rendues inaccessibles avant que les lots suivants aient déplacé leurs usages vers la surface Analyse.

La cible de navigation est donc une hiérarchie à quatre intentions :

```text
Cartographie | Analyse | Bibliothèque | Outils
                    |
                    +-- Vue d'ensemble / Dashboard
                    +-- Relations (transition)
                    +-- Impact (transition)
```

## Règles UX

1. Une action d'édition reste rattachée à **Cartographie**.
2. Une action de compréhension/analyse reste rattachée à **Analyse**.
3. Les relations ne sont pas supprimées dans ce lot : leur repositionnement est traité au lot 3.
4. Impact reste disponible dans ce lot : son repositionnement contextuel est traité au lot 4.
5. Bibliothèque et Outils ne doivent pas être mélangés aux actions métier d'analyse.
6. Les tests Cypress existants sur Relations, Impact et Dashboard doivent rester verts pendant la transition.

## Critères d'acceptation du lot 1

- L'utilisateur identifie immédiatement les quatre grandes intentions.
- Aucun parcours métier existant n'est supprimé.
- Relations et Impact restent accessibles pendant la phase de transition.
- Les tests E2E de navigation et les tests fonctionnels existants restent compatibles.
- Les lots 2 à 4 peuvent ensuite déplacer progressivement les fonctionnalités sans changer le modèle de données.
