# Audit — étendue des capacités dans la matrice

## Objet

Vérifier si le modèle et l'interface permettent de représenter une capacité métier qui s'étend sur plusieurs colonnes, puis définir un comportement cible cohérent avec une capability map TOGAF.

## Constat sur l'implémentation actuelle

Dans `src/App.jsx`, la vue matrice est construite à partir de lignes (layers) et de colonnes. Chaque cellule filtre les domaines N0 selon un unique `columnId` et un unique `layerId`. Le modèle de placement d'un domaine ne contient lui aussi qu'un seul `columnId` et un seul `layerId`.

Les capacités N1 sont ensuite rendues à l'intérieur de leur domaine N0, sous forme de cartes empilées. Elles ne disposent pas de coordonnées propres dans la matrice et aucun mécanisme de portée (`colSpan`, largeur multi-colonnes, cellules fusionnées ou ancrage de début/fin) n'est présent dans ce rendu.

**Conclusion :** le comportement multi-colonnes n'est pas pris en charge par le modèle d'affichage actuel. Déplacer un domaine d'une cellule à une autre ne permet pas de lui donner une étendue sur plusieurs colonnes. Les capacités N1 héritent de la cellule du domaine parent et ne peuvent donc pas s'étendre indépendamment.

## Comparaison avec une capability map

Une capability map TOGAF représente les capacités métier de façon stable, indépendamment des processus, de l'organisation et des applications qui les supportent. Il n'existe pas une grille universelle obligatoire dans laquelle chaque capacité doit occuper exactement une cellule : les colonnes et lignes sont une convention de visualisation propre à la cartographie.

Une capacité peut légitimement être représentée sur plusieurs colonnes si ces colonnes décrivent des segments adjacents d'un même axe de lecture et que la convention de la carte rend cette portée compréhensible. Cette portée visuelle ne doit pas être confondue avec une relation entre capacités, ni avec une relation capacité-application.

Références de conception :
- TOGAF décrit la cartographie des capacités comme un moyen de structurer et visualiser les capacités métier, notamment dans le contexte de la planification de transformation.
- La notation précise de la matrice (axes, cellules, portée des cartes) relève d'une convention de modélisation à documenter pour éviter les ambiguïtés.

## Comportement cible recommandé

### 1. Étendue explicite et persistée

Ajouter un placement explicite pour les éléments que l'on souhaite positionner dans la matrice. À minima :
- `columnId` : colonne de départ ;
- `layerId` : ligne ;
- `columnSpan` (ou une liste ordonnée de colonnes couvertes) : nombre de colonnes adjacentes couvertes.

Pour un modèle plus robuste si les colonnes peuvent être réordonnées ou supprimées, préférer une liste d'identifiants de colonnes couvertes, avec validation de leur contiguïté. Ne pas persister un simple index CSS comme seule source de vérité.

### 2. Rendu de la matrice

- Une capacité multi-colonnes doit être rendue une seule fois, avec une largeur couvrant les colonnes concernées.
- Les cellules couvertes doivent être réservées : ne pas permettre qu'une seconde carte occupe la même zone sur la même ligne si cela crée un chevauchement visuel.
- Les déplacements et redimensionnements doivent être possibles via des commandes accessibles (sélecteurs ou actions explicites), en plus du glisser-déposer.
- Sur petit écran, la matrice peut défiler horizontalement ; la portée doit rester lisible et ne pas être tronquée silencieusement.

### 3. Clarifier le niveau de modélisation

Le code actuel place les domaines N0 dans la matrice et imbrique les capacités N1 dans ces domaines. Il faut décider explicitement si la portée multi-colonnes concerne :
- uniquement les domaines N0 ;
- les capacités N1 individuellement ;
- ou les deux.

Recommandation : rendre la portée configurable par élément de cartographie plutôt que de la déduire du parent. Préserver les relations existantes entre applications et capacités N1 lors de toute migration.

### 4. Règles de validation

- Refuser une portée vide, des colonnes inconnues ou une liste de colonnes non contiguës si la convention choisie exige la contiguïté.
- Définir le comportement lors de la suppression ou du déplacement d'une colonne.
- Ne pas laisser de placement invalide après un changement de structure.
- Conserver la compatibilité des cartographies JSON existantes : en l'absence de portée, interpréter l'élément comme couvrant une seule colonne.

## Tests d'acceptation à ajouter

1. Une capacité peut être configurée pour couvrir deux colonnes adjacentes et s'affiche une seule fois.
2. La carte multi-colonnes ne chevauche pas les autres éléments de la même ligne.
3. L'étendue est conservée après rechargement et export/import JSON.
4. Le changement de nom d'une colonne ne casse pas la portée.
5. La suppression ou le réordonnancement d'une colonne produit un résultat défini et ne perd pas silencieusement la capacité.
6. Les placements existants sans propriété d'étendue restent affichés comme avant.
7. Le rendu reste utilisable sous le chemin GitHub Pages et en mode PWA.

## Périmètre de cet audit

Ce document formalise le constat et le comportement cible. Il ne prétend pas que la fonctionnalité multi-colonnes est déjà implémentée : celle-ci nécessite une évolution du modèle de données, du rendu de la matrice, des interactions et des tests E2E.

## Suivi de mise en œuvre — PR #12

La PR dédiée `feat/multi-column-capabilities` met en œuvre une première version du comportement cible, avec un périmètre volontairement limité :

- **Livré dans le code de la PR #12** : étendue configurable des domaines N0 via `layout.columnSpan` ; rendu du domaine sur plusieurs colonnes adjacentes ; refus des chevauchements et des portées qui dépassent la matrice ; valeur par défaut de 1 pour les données existantes.
- **Non couvert à ce stade** : étendue indépendante des capacités N1 ; représentation par liste d'identifiants de colonnes ; vérifications E2E dédiées à l'export/import JSON et aux changements de structure (suppression ou réordonnancement de colonnes).
- **Validation** : les tests E2E de la PR ont révélé deux attentes de test à corriger. La correction est poussée dans la PR #12 ; le succès de la nouvelle exécution CI doit être confirmé avant de considérer la fonctionnalité comme validée.

L'audit décrit donc le besoin et les critères généraux ; la PR #12 fournit une première implémentation partielle et explicite, sans prétendre couvrir tous les cas de robustesse listés ci-dessus.
