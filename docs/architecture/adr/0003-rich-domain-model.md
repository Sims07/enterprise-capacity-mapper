# ADR 0003 — Domaine riche pour la cartographie

- **Statut :** accepté
- **Date :** 2026-10-25

## Décision

Le domaine de cartographie n'est pas un simple sac de DTO manipulé par l'UI. Les invariants et transitions cohérentes sont portés par des modèles métier indépendants de React et de la persistance.

Deux modèles riches portent les règles déterministes principales :

- `Catalog` : domaines N0, capacités N1, applications et leurs relations ;
- `MapLayout` : axes, zones, placements et règles de chevauchement de la matrice.

`CatalogModel` reste le contrat DTO sérialisable utilisé par la persistance et l'import/export JSON. Les use cases applicatifs adaptent les formulaires et orchestrent ces modèles métier ; ils ne réimplémentent pas leurs invariants.

## Invariants

- Les noms métier créés ou modifiés ne sont pas vides et sont normalisés.
- Les identifiants créés sont non vides et uniques au sein de leur collection.
- Une capacité référence un domaine existant ; une application ne référence que des capacités existantes dans les opérations qui créent ou modifient ses relations.
- Une relation application-cible est idempotente ; les suppressions nettoient les relations dépendantes.
- Les transitions métier renvoient des snapshots immuables ; les collections et structures imbriquées retournées ne permettent pas de modifier l'état interne.
- Une matrice doit avoir au moins un axe de chaque type ; ses noms doivent être renseignés et les placements doivent respecter les bornes et l'absence de chevauchement.
- La réhydratation d'un ancien DTO ne rejette pas toute la cartographie à cause d'une incohérence héritée. Les opérations métier nouvelles ou modifiées valident les références qu'elles contrôlent.

Le domaine ne dépend ni de React, du DOM, de LocalStorage, de `fetch`, de Cypress ou d'un fournisseur IA.

## Règles d'implémentation

- La conversion DTO ↔ domaine est réalisée à la frontière des use cases/adaptateurs.
- L'interface ne doit pas reconstruire les invariants déjà portés par le domaine.
- Les champs additionnels des DTO existants sont préservés lors des modifications métier.
- Une classe n'est ajoutée que lorsqu'elle porte une responsabilité métier identifiable ; aucun pattern n'est appliqué mécaniquement.
- Les opérations de disposition visuelle restent dans `MapLayout`, distinctes du catalogue des concepts métier.

## Migration et validation

Chaque tranche identifie un invariant existant, le porte dans le domaine, ajoute un test de domaine pur, adapte les use cases et conserve Cypress comme oracle comportemental. Les changements doivent rester compatibles avec le format JSON v3 et le déploiement statique GitHub Pages/PWA. Les tests de type, unitaires, Cypress, couverture et build doivent être verts avant la revue finale.
