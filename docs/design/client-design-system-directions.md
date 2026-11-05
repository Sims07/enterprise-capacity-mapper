# Trois directions de design system — revue client (novembre 2026)

## Objectif et statut

Document de conception accompagnant la présentation client de 15 diapositives « Trois façons de voir les capacités ». **Ce document et les maquettes ne remplacent pas l'UI de production.** Ils définissent trois cibles visuelles réalisables sur l'architecture actuelle ; une seule direction sera sélectionnée avant les changements d'interface.

Le contrat métier reste strictement : `Domaine N0 → Capacité N1 → Application`, avec les cartographies à un ou deux niveaux, la mosaïque, la bibliothèque locale, la présentation synchronisée et l'analyse des écarts. Aucune API, base de données, synchronisation serveur ou changement du schéma JSON v3 n'est nécessaire.

## Comparabilité et données

Les trois directions reprennent le modèle de démonstration existant (`src/data/demoData.ts`) :

- 4 domaines N0 : Relation client, Finance, Supply chain, Ressources humaines ;
- 10 capacités N1 ;
- 7 capacités disposant d'au moins une application **actuelle**, 3 sans application actuelle : Offres & devis, Achats fournisseurs, Congés & temps ;
- sur les écrans de qualification et de couverture, des **évaluations fonctionnelles illustratives**, identiques entre les trois directions, sont ajoutées : 4 « suffisante », 3 « partielle », 2 « non couverte », 1 « à évaluer » ;
- l'exemple de capacité sélectionnée est « CRM-02 — Gestion des offres & devis » : couverture fonctionnelle non couverte, maturité actuelle 1/5, cible 4/5, aucune application actuelle.

Ce jeu d'évaluations est une **simulation de maquette** et ne représente pas l'état réel de l'entreprise ni l'état initial de `DEMO_MODEL`. Il ne doit pas être présenté comme une mesure issue des données du client.

La lecture « applications actuelles » (7/10) ne constitue **pas** la couverture fonctionnelle. Le nombre d'applications n'infère ni maturité ni qualité de couverture ; les règles de calcul existantes restent seules sources de vérité.

## Parcours unique de comparaison

1. **Cartographier** : afficher les quatre N0 et leurs N1, basculer la grille entre applications, couverture, maturité et écarts, ouvrir un N0 ou une N1, conserver les positions et relations.
2. **Qualifier** : sélectionner CRM-02 ; saisir séparément couverture fonctionnelle, maturité actuelle, maturité cible ; observer le rattachement applicatif sans calcul de faux score.
3. **Décider** : lire les quatre états fonctionnels ; identifier les trois points d'attention ; revenir à la capacité sélectionnée, sans perdre le contexte.

La présentation montre pour chaque option ces trois écrans dans une cible desktop 1440 × 900.

## Direction A — ÉVIDENCE / clarté exécutive

**Audience prioritaire :** direction métier, comité d'architecture, client non spécialiste.

- Surface principale claire presque neutre ; navigation latérale visible et textes denses mais lisibles.
- Cartes N0 avec un bandeau supérieur de couleur métier ; N1 à hauteur cohérente et indication explicite du nombre d'applications.
- Qualification en deux zones, liste des N1 à gauche et fiche de saisie à droite.
- Couverture comme synthèse : quatre KPI, heatmap par domaine et liste de points d'attention.

Palette de référence : `--color-bg: #F7F8F6`, `--color-surface: #FFFFFF`, `--color-text: #1B2930`, `--color-text-muted: #6E7D86`, `--color-border: #DBE4E2`, `--color-accent: #116B62`, `--color-accent-soft: #E0F3EF`.

**Atout :** meilleure lecture projetée et appropriation rapide par une audience mixte. **Contrainte :** un peu moins d'informations simultanées.

## Direction B — SIGNAL / cockpit analytique

**Audience prioritaire :** architectes d'entreprise, responsables urbanisation et SI.

- Thème sombre graphite, densité plus élevée, bordures de capacités visibles.
- Navigation et filtres compacts, bandeaux de N0 identifiables par couleur métier.
- Qualification à contraste fort ; les statuts métier emploient toujours leur couleur sémantique, sans faire passer « non couverte » pour une réussite.
- Couverture dense par domaines avec statuts écrits en toutes lettres, et jamais uniquement des aplats de couleur.

Palette : `--color-bg: #0D1219`, `--color-surface: #19222D`, `--color-text: #EDF3FA`, `--color-text-muted: #A6B3C3`, `--color-border: #344151`, `--color-accent: #92A8FF`, `--color-accent-soft: #293754`.

**Atout :** excellent espace analytique, continuité avec le thème sombre existant. **Contrainte :** visuel plus chargé pour un public non expert, à contrôler sur vidéoprojecteur.

## Direction C — ATELIER / co-construction

**Audience prioritaire :** ateliers de conception métiers, équipes pluridisciplinaires, mobile.

- Surfaces lavande très claires, accent violet, cartes plus souples et davantage d'air.
- Navigation horizontale de progression « Cartographie → Qualifier → Couverture ».
- Qualification explicite et guidée, cartes sélectionnées très visibles.
- Synthèse de couverture disposée comme un tableau de travail partageable.

Palette : `--color-bg: #F6F3FF`, `--color-surface: #FFFFFF`, `--color-text: #27243B`, `--color-text-muted: #77718E`, `--color-border: #E5E1F1`, `--color-accent: #704DDD`, `--color-accent-soft: #EDE8FF`.

**Atout :** accessible en atelier et adaptable aux petits écrans. **Contrainte :** plus de travail de navigation et de composants responsives.

## Propriétés visuelles transverses à reproduire

Pour éviter une divergence entre validation client et implémentation :

- **Grille et typographie** : espace basé sur une échelle nommée de 4/8/12/16/24/32 px ; adapter les densités à un mode `comfortable` ou `compact` documenté ; utiliser Inter pour ÉVIDENCE et SIGNAL, Lato ou une alternative redistribuable de même métrique pour ATELIER.
- **Surface desktop de référence** : viewport 1440 × 900 ; sidebar approx. 248 px sur ÉVIDENCE/SIGNAL, menu de progression horizontal sur ATELIER ; grille N0 de quatre colonnes pour le jeu de données de revue, avec réagencement explicite sur mobile.
- **Formulaires** : labels permanents, statuts sélectionnés avec libellé, focus visible, confirmation ou autosauvegarde réutilisant les règles existantes.
- **Bords, ombres, rayons** : composants fondés sur les tokens sémantiques existants dans `src/styles/tokens.css`; valeurs de rayon et densité définies par direction dans une couche de thème, pas dans les composants métier.
- **Couleurs métier** : identifier N0 par la palette domaine ; ne jamais utiliser la même coloration pour identité de domaine et sémantique de couverture sans légende.
- **Statuts** : « suffisante », « partielle », « non couverte », « à évaluer » affichés comme texte, icône/forme et couleur ; ne jamais dériver leur état du simple nombre d'applications.
- **Présentation** : mêmes données, même thème dynamique, vue read-only, sans drag and drop ; la différence des systèmes reste principalement visuelle.

## Évaluation (jugement expert à valider)

Notes indicatives sur cinq (pas un résultat d'étude utilisateur) :

| Critère | ÉVIDENCE | SIGNAL | ATELIER |
|---|---:|---:|---:|
| Lisibilité en comité | 5 | 4 | 5 |
| Lecture des écarts | 4 | 5 | 4 |
| Simplicité de prise en main | 5 | 3 | 5 |
| Densité d'information | 3 | 5 | 3 |
| Adaptation mobile | 4 | 3 | 5 |
| Effort de réalisation (5 = plus simple) | 4 | 5 | 3 |

**Recommandation conditionnelle :** ÉVIDENCE pour une adoption client mixte et des restitutions ; SIGNAL pour les profils d'architecture technique et un effort initial plus faible ; ATELIER si la co-construction est prioritaire. Ne pas sélectionner une direction sans validation des trois tâches du parcours.

## Plan d'implémentation après sélection

1. Formaliser les tokens de la direction choisie (couleurs, densité, typographie, rayons, focus, surfaces) et leurs variantes light/dark dans le design system, sans casser les tokens et modes existants.
2. Produire les composants et états de Storybook nécessaires : N0, N1, filtres de lecture, fiche de qualification, KPI, heatmap, points d'attention, placeholders et états vides.
3. Implémenter les écrans du parcours en réutilisant les cas d'usage `src/application/` et les contrats du domaine ; aucun calcul de couverture dans la seule UI.
4. Tester le parcours métier complet avec Playwright (desktop + mobile, navigation, relations, persistance, états de couverture, thème dynamique et présentation read-only), et les règles pures avec Vitest.
5. Vérifier `npm run typecheck`, `npm run test:unit`, `npm run build`, `npm run test:e2e` et la CI GitHub avant une éventuelle fusion.

## Limites et décisions ouvertes

- Les maquettes sont **éditables** et réalisables par React/CSS, mais ne sont pas encore des captures du produit implémenté. Le rendu responsive mobile, le contrôle clavier et les états de chargement doivent être spécifiés avant la livraison.
- Le contenu est fictif, contrairement à la structure du modèle de démonstration utilisée.
- Ce document de décision ne modifie pas l'application ni les tests ; les changements fonctionnels seront proposés dans des PR distinctes **après choix explicite**. Aucune PR ne doit être fusionnée sans l'autorisation explicite du propriétaire.

## Correction après retour client — la mosaïque est un invariant (05/11/2026)

Le premier jeu de maquettes a été rejeté pour une raison de fidélité métier : il alignait les quatre N0 comme des listes verticales indépendantes. Les clients ne pouvaient plus se projeter dans la **mosaïque/matrice unifiée** de l'application, avec des positions et des zones occupées sur plusieurs colonnes **et plusieurs lignes**.

La présentation révisée de 16 diapositives corrige ce point. La comparaison doit désormais montrer une seule grille de référence **6 colonnes × 3 lignes** reproduite strictement dans les directions ÉVIDENCE, SIGNAL et ATELIER :

| Domaine | Colonne de départ (index 0) | Ligne de départ (index 0) | Colonnes occupées | Lignes occupées |
|---|---:|---:|---:|---:|
| Relation client (CRM) | 0 | 0 | 3 | 2 |
| Finance | 3 | 0 | 3 | 1 |
| Supply chain | 3 | 1 | 3 | 2 |
| Ressources humaines | 0 | 2 | 3 | 1 |

Ce **placement de démonstration est illustratif**, sans revendiquer les coordonnées réelles du `DEMO_MODEL` ; les quatre N0, les dix N1 et les sept rattachements applicatifs actuels restent ceux de la démo. Aucune modification JSON n'est requise.

**Règles visuelles non négociables :**

- Dans les trois directions, les N0 conservent **leurs surfaces et leurs spans de colonnes et de lignes** ; la carte doit être immédiatement reconnaissable comme la cartographie actuelle.
- Tous les N1 sont affichés à l'intérieur du N0 parent ; aucun plafond artificiel de trois N1, aucun découpage en liste indépendante, aucune carte masquée.
- La couverture s'affiche en changeant la **dimension de lecture des mêmes N1**, sans déplacer ni reclasser les zones : bandeau N0 = identité de domaine ; fond/contour N1 = état fonctionnel ; étiquette textuelle toujours présente.
- Le statut « aucune application actuelle » reste indépendant de la couverture fonctionnelle évaluée. Des évaluations illustratives servent seulement à comparer les styles.
- La géométrie matricielle est identique dans les trois options ; seuls changent le design system (palette, typographie, densité, navigation et formes). Un écran de qualification conserve le contexte du domaine/capacité sélectionné.
- Sur les petites cartes, la densité de texte est adaptée sans masquer un N1 ; les labels restent lisibles et les interactions devront être testées au clavier et en mode présentation.

**Vérification de fidélité à ajouter lors de l'implémentation :** un E2E Playwright doit comparer les coordonnées/colSpan/rowSpan des quatre N0 avant/après le basculement vers les vues applications, couverture, maturité, écarts et présentation. Ajouter les captures des trois systèmes dans Storybook lors du choix final, avec un scénario N0 ≥ 4 N1 pour éviter les anciennes régressions de visibilité.

## Décision client affinée — SIGNAL sans perte fonctionnelle (05/11/2026)

**Retour validé :** la direction SIGNAL est la préférée, mais sa première proposition de navigation latérale n'est **pas retenue**. Le client exige le maintien intégral de la mosaïque, du mode présentation et de la gestion applicative. La nouvelle maquette de 10 diapositives **SIGNAL — Un nouveau style, les mêmes capacités** matérialise l'arbitrage. Elle ne constitue pas une implémentation ; ce document décrit l'objectif qui devra être testé.

### Architecture d'interaction retenue

1. **Navigation principale horizontale**, dans l'en-tête comme dans la version actuelle : Cartographie, Analyse, Bibliothèque, Outils, statut d'enregistrement et switch Présentation. Pas de navigation latérale permanente, y compris sur les vues d'édition et de couverture.
2. **La mosaïque est le centre de l'écran**, sans reflow artificiel : N0 multi-colonnes/multi-lignes et tous les N1 toujours visibles. Les modes Applications / Couverture / Maturité / Écarts changent la lecture, pas les placements.
3. **Ajouter une application** doit être une action repérable directement depuis l'éditeur, en complément du bouton existant dans l'inventaire SI. Un contrôle « Inventaire SI » ouvre à la demande un panneau temporaire (superposition refermable), sans largeur réservée quand il est fermé. Le panneau contient recherche, états, édition et « Relier à… » ; sur petits écrans, il devient un panneau adapté au viewport.
4. **La création et le rattachement sont distincts et continus**. Le formulaire conserve les champs du modèle actuel (nom obligatoire, code, éditeur, type, statut, description et liens selon le parcours en place). Une action de liaison explicite mène à la sélection des N1. À aucun moment, la présence d'un lien n'implique une couverture fonctionnelle « suffisante ».
5. **Mode présentation maintenu à l'identique fonctionnellement** : nouvelle fenêtre `?view=presentation`, synchronisation des données, du thème et des filtres de lecture, contrôle depuis l'éditeur, affichage multi-lignes à pleine largeur, lecture seule, aucun drag-and-drop, choix Carte / Couverture / Maturité / Écarts et affichage éventuel des applications. En cas de popup bloquée, afficher le message déjà prévu.
6. **Le thème SIGNAL est une couche de design**, créée par tokens sémantiques, variantes de surface, typographie et composants Storybook. Il ne modifie ni `CatalogModel`, ni `schemaVersion: 3`, ni les cas d'usage de domaine/application, ni la persistance locale, ni le runtime GitHub Pages/PWA.

### Constat de code actuel à préserver

Dans `src/App.tsx`, la barre haute contient déjà la navigation principale et le switch `presentation-switch-toolbar`. La fonction `togglePresentation` ouvre déjà une fenêtre dédiée en lecture `?view=presentation`. Les événements passent par `subscribeToPresentationUpdates` (modèle, thème, mode de lecture). L'inventaire `#app-inventory` contient déjà un bouton `+ Application`, une recherche, l'édition d'application et `Relier à…`. Les use cases `createApplication`, `updateApplication` et `prepareLinkedApplications` doivent rester inchangés par la refonte. Le panneau superposé et le bouton d'ajout en haut sont **des cibles nouvelles de présentation**, et non des comportements déjà livrés.

### Tests d'acceptation minimaux à ajouter/adapter au lot d'implémentation

| Parcours | Vérification Playwright attendue |
|---|---|
| Navigation / largeur | Header toujours accessible ; aucun rail de navigation à largeur fixe ; ouvrir/fermer Inventaire SI sans casser les positions N0 ; scroll bureau et mobile conservé |
| Catalogue applicatif | Depuis « + Application » : validation du nom, création, présence dans l'inventaire, persistance ; modification discrète par crayon ; recherche |
| Relations | Depuis l'inventaire « Relier à… » et depuis une capacité : associer/dissocier N1 et application, vérifier les deux sens et l'impact sur les gaps applicatifs |
| Mosaïque | Afficher au moins 4 N1 dans un N0 ; insérer N0 dans une cartographie existante ; étirer un N0 sur des colonnes et des lignes, aperçu dynamique, maintien des spans après sauvegarde et changement de mode |
| Présentation | Switch ouvre fenêtre distincte ; ne peut pas modifier ; pas de drag ; dimensions/spans et N1 inchangés ; thèmes et dimension de lecture synchronisés ; sortie contrôlée ; comportement popup bloquée |
| Couverture métier | Afficher les quatre états indépendants du nombre d'applications ; matrice géométriquement stable en passant d'Applications à Couverture, Maturité, Écarts |
| Données / plateforme | Autosave et Ctrl/Cmd+S, annuler/rétablir, bibliothèque, JSON import/export versionné, GitHub Pages base path, offline/PWA ; thème clair et sombre, accessibilité clavier |

Validation obligatoire de la PR d'implémentation : `npm run typecheck`, `npm run test:unit`, `npm run build`, `npm run test:e2e`, Storybook (états et snapshots), seuils de couverture et tous les checks GitHub Actions au vert. Toute régression relevée doit être analysée à partir du test en échec avant correction. **Aucune fusion sans approbation explicite.**

### Scénario de démonstration approuvé pour la prochaine revue

**Cartographie multi-lignes** → **Inventaire SI à la demande** → **Créer une application** → **Relier à CRM-02** → **Lire la couverture sur la même mosaïque** → **Projeter dans une nouvelle fenêtre synchronisée**. Les éléments visuels sont illustratifs ; la version en production n'est pas encore modifiée.
