# ADR 0003 — Domaine riche pour la cartographie

- **Statut :** accepté
- **Date :** 2026-10-25

## Décision

Le domaine de cartographie ne doit pas être un simple sac de données manipulé par l'UI ou par des cas d'utilisation qui dupliquent les règles métier. Les transitions métier et les invariants sont portés par des objets du domaine, tandis que les structures JSON restent des DTO à la frontière.

Deux modèles riches sont introduits :

- `Catalog` (`src/domain/catalog.ts)) : agrégat du catalogue qui protège l'identité, les noms, les références domaine-capacité-application, les relations et les suppressions avec nettoyage des dépendances.
- `MapLayout` (`src/domain/mapLayout.ts`) : objet de domaine immuable qui protège la cohérence de la matrice, les zones colonne/layer, les placements et les chevauchements.

`CatalogModel` reste le contrat sérialisable compatible avec les cartographies existantes. La réhydratation ne réécrit pas les données historiques à l'import ; les opérations métier appliquent les invariants au moment des transitions. Les conversions vers le DTO sont explicites via `toModel()`.

## Règles

- Une opération métier valide les invariants dont elle est responsable avant de produire un nouvel état.
- Les opérations retournent de nouveaux snapshots ; les références reçues et les résultats exportés ne peuvent pas muter l'état interne.
- Les identifiants de domaines, capacités et applications sont uniques dans leur collection.
- Les noms requis ne peuvent pas être vides après normalisation.
- Une capacité doit référencer un domaine existant.
- Une application ne peut lier que des cibles existantes au niveau de cartographie actif (domaines en profondeur 1, capacités en profondeur 2).
- Les suppressions nettoient les relations vers les éléments supprimés et préservent les relations non concernées.
- Une matrice enregistrée doit avoir au moins une colonne et un layer, des noms non vides et une zone pour chaque paire colonne/layer.
- Un placement doit rester dans les limites de la matrice et ne pas chevaucher un autre domaine de la même couche.
- Les cas d'utilisation traduisent les formulaires, fournissent les données et orchestrent le domaine ; ils ne réimplémentent pas ces invariants.
- Pas de Value Object ni de classe artificielle : chaque abstraction doit représenter une règle ou un concept métier identifiable.
- Le domaine ne dépend ni de React, du DOM, de LocalStorage, de `fetch`, de Cypress ou d'un fournisseur IA.

## Tests et migration

Chaque invariant significatif est couvert par des tests Node purs du domaine. Les tests d'application vérifient la traduction des formulaires vers les commandes du domaine, et Cypress reste l'oracle du comportement utilisateur.

La migration doit rester compatible avec le format JSON v3, le déploiement GitHub Pages et les usages PWA. Les changements de comportement de données (par exemple le nettoyage de références orphelines lors d'une suppression) sont explicites et testés. Les futurs ajouts métier doivent être introduits dans le domaine avant d'être exposés dans React.
