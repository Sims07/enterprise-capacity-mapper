# ADR 0003 — Domaine riche pour la cartographie

- **Statut :** accepté
- **Date :** 2026-10-25

## Décision

Le domaine de cartographie ne sera plus traité comme un simple sac de données manipulé par l'UI. Les invariants métier et les transitions cohérentes sont portés progressivement par des objets du domaine.

La frontière de persistance reste DTO-oriented : `CatalogModel` décrit la représentation sérialisable. La classe `Catalog` constitue une première entité/aggrégat métier riche et expose des opérations métier telles que `createDomain`, `createCapability`, `linkApplicationToCapability`, `unlinkApplicationFromCapability`, `removeDomain` et `renameDomain`.

Le domaine ne dépend ni de React, du DOM, de LocalStorage, de `fetch`, de Cypress ou d'un fournisseur IA.

## Règles

- Une opération métier doit protéger les invariants qu'elle contrôle.
- Les opérations retournent un nouvel état métier plutôt que de muter un DTO partagé.
- La conversion DTO ↔ domaine est réalisée à la frontière.
- Les composants React ne doivent pas reconstruire des invariants déjà portés par le domaine.
- Les cas d'utilisation orchestrent le domaine et les ports ; ils ne doivent pas devenir un second modèle métier.
- On n'introduit pas de classe uniquement pour satisfaire le pattern : chaque comportement doit correspondre à une responsabilité métier identifiable.

## Migration

La migration est verticale et incrémentale. Chaque tranche :

1. identifie un invariant métier existant ;
2. le déplace dans le domaine ;
3. ajoute un test de domaine pur ;
4. adapte le cas d'utilisation ;
5. conserve les scénarios Cypress comme oracle comportemental ;
6. supprime l'ancien code de duplication uniquement après validation CI.

L'objectif final est un domaine riche, mais la progression doit rester compatible avec le format JSON v3 et les usages GitHub Pages/PWA existants.
