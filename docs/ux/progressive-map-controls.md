# Hiérarchie des commandes de la mosaïque — SIGNAL (novembre 2026)

## Constat

Une cartographie dense avec plusieurs N0/N1 présentait quatre niveaux de chrome permanent : l'entête de navigation, le filtre et les créations, la barre de lecture, puis la légende. Chaque N1 répétait les boutons « Fiche » et « ⋮ » ainsi qu'une zone vide en pointillés « Déposer une application ici ». Le bruit visuel concurrençait l'analyse des capacités.

Cette PR corrige **la densité des commandes**, pas le contenu métier ou la géométrie.

## Règles UX

- **Navigation haute conservée** : Cartographie, Analyse, Bibliothèque, Outils, état de sauvegarde, annuler/rétablir et Présentation.
- **Deux créations immédiatement visibles** : « + Application » (action la plus saillante) et « + Domaine N0 » (secondaire). Les utilitaires « Inventaire SI », « Structure », « Aide TOGAF » restent accessibles mais sont visuellement neutres.
- **Une seule barre de lecture** : les modes Applications / Couverture / Maturité / Écarts restent visibles. Le nombre de capacités à qualifier reste une information, et l'accès au diagnostic est présenté comme « N écarts à examiner ».
- **Affichage à la demande** : contrôle natif `<details>` « Affichage » contenant la densité et la légende contextuelle, sans quatrième bande permanente. Ouverture clavier `Enter`/`Espace`, fermeture `Escape`, focus rendu au résumé, accessible au toucher. Les mêmes fonctions et valeurs locales persistent.
- **Actions contextuelles sur les N1** : « Fiche » et « ⋮ » ne sont accentués qu'au survol ou au focus dans un environnement souris. Ils restent dans l'ordre de tabulation. Sur tactile, pas de masquage par `hover` ; les boutons restent visibles.
- **Actions N0** : « + N1 » reste disponible. Le menu « ⋮ » devient discret hors survol/focus sur souris, mais accessible au clavier/tactile.
- **Liaison applicative** : le rectangle vide « Déposer une application ici » ne s'affiche plus tant qu'aucun glisser-déposer n'est actif sur la cible. Les gestionnaires existants `onDragOver/onDrop` sur les N1/N0 restent inchangés ; la zone réapparaît pendant `.drop-over`. Les autres chemins de liaison depuis l'inventaire et les menus restent inchangés.

## Garde-fous

Aucun changement de `CatalogModel`, N0/N1, `columnSpan`, `rowSpan`, applications ou évaluations, schéma JSON V3, stockage, synchronisation de présentation, domaine ou services hexagonaux. Les CSS sont limités à `.app.signal-experience:not(.mosaic-presentation-mode)`; aucune animation nouvelle en mode présentation. Le design system utilise les tokens `--color-*`, `--signal-space-*`, `--radius-*` et les règles de réduction des mouvements.

Le composant `MapReadingDisclosure` sert la production et le catalogue Storybook ; `MapReadingLegend` demeure la seule source de légende.

## Validation

- E2E Playwright : création d'application/N0, inventaire SI, structure, diagnostic, lecture multi-dimensions, densité persistante, affichage/fermeture au clavier et fiche de capacité au survol.
- Storybook : contrôle d'affichage en thèmes clair/sombre, mode Couverture et état de densité ; interaction `Escape`/focus.
- Vérifications habituelles de la CI : TypeScript, Vitest/coverage, Vite, Storybook, tests visuels et E2E.
- À valider en atelier : équilibre de visibilité sur écran tactile, usage clavier, lisibilité d'une carte de 6–8 colonnes et de N0 ayant plus de 4 N1.

La PR reste ouverte jusqu'à une revue utilisateur explicite : elle ne doit pas être fusionnée automatiquement.
