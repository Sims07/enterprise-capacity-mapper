# Lot 1 — Rationalisation de la navigation

## Objectif

Donner une structure de navigation explicite, sans ajouter de titres redondants ni supprimer de parcours métier.

## Navigation principale

- **Cartographie** : construire et modifier le modèle.
- **Analyse** : accéder à l’espace d’analyse et à sa vue d’ensemble.
- **Bibliothèque** : ouvrir les cartographies locales et récentes.
- **Outils** : actions transverses (import/export JSON, affichage, thème et version).

## Navigation secondaire de l’analyse

Les vues **Vue d'ensemble**, **Relations** et **Impact** sont regroupées sous une barre secondaire unique. Elles restent toutes accessibles directement, mais ne sont plus présentées comme des espaces principaux concurrents.

- La vue d'ensemble est le point d'entrée de l'analyse et affiche le Dashboard.
- Relations reste accessible pour explorer les liens entre applications et capacités.
- Impact reste accessible pour comprendre les conséquences liées à une capacité.
- Bibliothèque et Outils sont accessibles depuis leur propre entrée, sans libellés de groupe « Construire », « Analyser » ou « Gérer ».

## Critères d'acceptation

- Une seule navigation principale, sans titres de groupe redondants.
- Les quatre intentions sont identifiables : Cartographie, Analyse, Bibliothèque et Outils.
- Dashboard, Relations et Impact restent fonctionnels et sont regroupés dans la navigation secondaire.
- La bibliothèque ouvre la même gestion locale des cartographies.
- La navigation principale reste sur une seule ligne sur mobile, avec défilement horizontal si nécessaire.
- Les tests Cypress de navigation et les tests fonctionnels existants restent compatibles.
