# ADR 0003 — Domaine riche pour la cartographie

- **Statut :** accepté
- **Date :** 2026-10-25

## Décision

Le domaine de cartographie ne sera pas un simple sac de données manipulé par l'UI. Les invariants métier et les transitions cohérentes appartiennent aux modèles du domaine ; les structures sérialisables restent des DTO à la frontière de persistance.

Deux modèles riches portent les principales règles de cartographie :

- `Catalog` : domaines N0, capacités N1, applications, relations, priorités, création et suppression cohérente.
- `MapLayout` : colonnes, layers, zones, placements et règles d'occupation de la matrice TOGAF.

Le domaine ne dépend ni de React, du DOM, de LocalStorage, de `fetch`, de Cypress ou d'un fournisseur IA.

## Invariants

- Les noms de domaine, capacité et application ne sont pas vides après normalisation.
- Les identifiants des entités créées sont obligatoires et uniques dans leur collection.
- Une capacité doit référencer un domaine existant.
- Une application ne peut référencer que des cibles de cartographie existantes au niveau actif (domaine ou capacité).
- Les relations ne sont pas dupliquées ; la suppression d'une capacité nettoie les relations qui la ciblent.
- Les mises à jour et transitions de domaine produisent des instantanés isolés ; un appelant ne peut pas muter l'état interne en modifiant un DTO retourné.
- Les colonnes et layers doivent rester non vides ; les zones doivent être nommées et cohérentes avec la matrice.
- Un placement respecte les limites, utilise un span entier positif et ne chevauche pas un autre domaine de la même layer.
- La conversion DTO ↔ domaine reste à la frontière ; le JSON v3 existant est conservé.

## Règles de conception

- Les composants React valident la saisie pour le retour utilisateur, mais le domaine protège lui-même les invariants.
- Les cas d'utilisation orchestrent le domaine et les ports ; ils ne dupliquent pas les règles métier.
- Les services d'application peuvent conserver les transformations d'orchestration et les requêtes de lecture qui ne représentent pas un invariant.
- On n'introduit pas de classe uniquement pour satisfaire un pattern : chaque comportement doit correspondre à une responsabilité métier identifiable.
- Les méthodes de domaine restent déterministes, sans accès au navigateur, au stockage ou au réseau.

## Migration et critères d'acceptation

Chaque tranche :

1. identifie une règle métier existante ;
2. la déplace dans le domaine ;
3. ajoute des tests unitaires purs pour les cas valides, invalides et limites ;
4. adapte les cas d'utilisation et React sans modifier le comportement attendu ;
5. conserve les scénarios Cypress comme oracle de régression ;
6. supprime le code dupliqué uniquement après validation de la CI complète.

Le lot 1 est considéré terminé lorsque les opérations de catalogue et les invariants de mise en page passent par ces modèles, que les cas d'utilisation ne reconstruisent plus ces règles, et que typecheck, tests unitaires, Cypress, couverture et build sont tous verts.
