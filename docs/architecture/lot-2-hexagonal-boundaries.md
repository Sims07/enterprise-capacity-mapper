# Lot 2 — frontières hexagonales et critères de contrôle

## Cible de dépendances

- **Domaine** : modèle métier et invariants ; aucune dépendance vers l'application, l'interface, les adaptateurs ou les API du navigateur.
- **Application** : cas d'utilisation et orchestration ; dépend du domaine et de contrats abstraits, jamais d'une implémentation concrète d'adaptateur.
- **Ports** : contrats exprimant les besoins du cœur applicatif sans types propres à React, au DOM ou à un fournisseur.
- **Adaptateurs** : traduction des contrats vers le navigateur, le stockage, la navigation et les fournisseurs externes.
- **Composition root** : seul point d'assemblage des implémentations concrètes. L'UI déclenche les cas d'utilisation mais ne doit pas instancier elle-même l'infrastructure.

## Contrôle automatisé

Le test `test/architecture-boundaries.test.js`, exécuté par `npm run test:unit`, vérifie les imports interdits dans le domaine et l'application ainsi que les imports d'adaptateurs hors de la frontière UI/composition. Toute exception doit être justifiée explicitement et rester dans la couche la plus externe possible.

Ces contrôles sont volontairement statiques et légers : ils utilisent le runner Node déjà présent, sans nouvelle dépendance, navigateur, build supplémentaire ou impact sur Cypress/Istanbul.

## Points d'audit et stratégie

1. Garder `src/adapters/react/architecture.ts` comme composition root et injecter les dépendances concrètes à cet endroit.
2. Ne créer un port que lorsqu'il représente une frontière extérieure réelle et utilisée par l'application.
3. Conserver les tests unitaires Node pour le domaine, les cas d'utilisation et les contrats ; réserver Cypress aux parcours utilisateurs.
4. Vérifier le build, le typecheck, la suite Node et Cypress sur la PR avant fusion. Une PR verte ne doit pas être fusionnée sans autorisation explicite.

## Portée

Les règles automatisées empêchent les régressions de dépendances les plus importantes, mais ne prétendent pas démontrer à elles seules la qualité de chaque port ou l'absence de logique métier dans tous les composants. Les extractions comportementales restent incrémentales et doivent être accompagnées de tests ciblés.
