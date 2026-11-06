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


## Lot de finition — barre de commandes unifiée (#250)

La cartographie ne doit pas présenter deux bandes successives (Filtrer/Créer puis Lecture métier). L'éditeur SIGNAL dispose désormais d'**une seule surface de commandes**, contenant :

- **Filtrer les domaines** (champ de recherche accessible par son label), avec nombre de domaines visibles.
- **Applications / Couverture / Maturité / Écarts** (modes de lecture explicites et inchangés).
- **À qualifier** (information compacte) et **Affichage** (densité locale et légende à la demande).
- **+ Application** et **+ Domaine N0**, les deux commandes principales immédiatement visibles.
- **Options** (menu temporaire) regroupant Inventaire SI, Structure, Aide TOGAF, Examiner les écarts et Piloter la présentation. Le pilotage reste disponible depuis la fenêtre de l'éditeur lorsque la fenêtre de présentation est ouverte ; les commandes de projection et le focus N0 restent inchangés.

Le composant réutilisable `MapActionsMenu` est documenté dans Storybook. Son `<details>` natif conserve navigation clavier, activation avec Entrée/Espace, fermeture Escape avec restitution du focus et fermeture au clic en dehors. Un sous-panneau de pilotage peut rester ouvert dans le menu ; l'ouverture d'une autre interface ferme le menu. Les écrans tactiles conservent des surfaces cliquables.

La même surface peut occuper deux rangées internes aux résolutions intermédiaires et petites (sans créer un deuxième bloc visuel). Ce repli est contrôlé par les breakpoints de la feuille `map-unified-controls.css`, ajoutée après les styles SIGNAL existants.

**Non-régression :** le modèle N0/N1, la géométrie spatiale, les relations, les états de maturité/couverture, la PWA, le stockage local et la présentation plein écran sont inchangés. Les tests Playwright existants ouvrent explicitement « Options » avant d'utiliser une commande secondaire ; cela vérifie un **parcours utilisateur réel**, sans rendre les fonctions accessibles uniquement aux tests.

### Critère de validation utilisateur

Sur une cartographie comportant 6–8 colonnes et 4 N1 ou plus par N0, vérifier que la mosaïque commence plus haut, que les commandes métier se retrouvent facilement et que le focus de toutes les commandes reste visible. La refonte n'est réussie que si elle allège l'interface sans compliquer l'ajout d'applications ni l'accès à la Structure et aux relations.

## Lot document-first — hiérarchie de l'en-tête (06/11/2026)

La réduction de commandes à une seule barre de carte n'avait pas suffi : la navigation, les retours de sauvegarde et les actions d'édition restaient mélangés dans l'en-tête, tandis que la seconde barre reproduisait une série de boutons encadrés.

**Comportement implémenté :**
- **Titre réel du document** affiché à gauche sous l'identité discrète Capacity Mapper ; titre élidé avec `title` complet quand il est trop long. L'enregistrement automatique reste explicite (local seulement), avec erreur et action de récupération conservées.
- **Navigation horizontale** Cartographie / Analyse / Bibliothèque visuellement distinguée des autres commandes par un état sélectionné souligné et un fond transparent. Outils demeure dans le rail de navigation pour garantir les parcours mobiles existants, mais est stylé comme commande de menu.
- **Historique** dans la barre de travail de la cartographie (actions accessibles au clavier, icônes avec noms accessibles) ; reste dans le bandeau global sur les autres pages afin de ne pas supprimer une capacité fonctionnelle.
- **Présentation** toujours un switch dans le bandeau ouvrant sa fenêtre indépendante, sans changement de synchronisation.
- **Lecture métier**, recherche et créations séparées par leur langage visuel : onglets de lecture, champ de recherche et commandes de création ; seule « + Application » est fortement accentuée. « + Domaine N0 » et l'accès aux options restent visibles.
- **Responsive** : sur petits écrans, la navigation garde ses trois destinations et l'emplacement Outils ; les contrôles de la carte se replient sans retirer de fonctions.

**Invariants :** N0/N1, spans 2D, placements, états d'évaluation, relations, stockage local JSON, PWA, vue présentation et raccourcis clavier inchangés. Design tokens SIGNAL existants employés.

**Vérifications :** `playwright/e2e/signal-experience.spec.ts` valide l'association nom/statut, l'absence d'espace perdu entre identité et navigation, le placement de l'historique, la barre de commandes, les transitions Analyse/Cartographie et un viewport mobile. Storybook expose `DocumentFirstHeader` depuis la vraie application.

**Attention :** cette refonte découle d'un retour illustré et d'un audit du code, pas d'une mesure utilisateur. Les scénarios comparatifs sont documentés dans `docs/ux/header-hierarchy-audit-2026-11-06.md`. Les retours de comité/atelier doivent confirmer la lisibilité et la rapidité de découverte des commandes.
