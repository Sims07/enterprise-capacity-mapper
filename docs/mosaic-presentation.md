# Mode présentation de la cartographie

Le mode présentation de la cartographie est un rendu de restitution, distinct de l'espace d'édition.

## Comportement

- La cartographie occupe toute la fenêtre en paysage : aucun défilement de page, de grille ou de carte N0.
- L'en-tête, les commandes d'édition, l'inventaire applicatif et le compagnon sont masqués.
- La grille conserve strictement les placements et les étendues N0 configurés dans la structure ; seules les pistes vides sont retirées du rendu.
- Les lignes et les colonnes utilisent les poids `size` de la structure et se partagent l'espace disponible.
- Les cartes N0 ont une hiérarchie stable : titre N0, capacités N1, puis code et nombre de capacités lorsqu'il est non nul.
- Un domaine sans N1 remplit toute sa carte avec son bandeau coloré ; aucune liste vide ne réserve de hauteur.
- Les titres se replient entre les mots ; en présentation, leur taille et les espacements dépendent **de la largeur et de la hauteur de la carte** (container queries). Cela évite qu'un N0 large mais peu haut pousse ses N1 hors du cadre.
- À partir de quatre N1 dans un même N0, la grille privilégie des colonnes suffisamment larges pour éviter les titres illisibles, avec ou sans aperçu des applications.
- L'icône **↗** en haut à droite d'un N0 ouvre une lecture agrandie de toutes ses capacités avec leurs libellés complets ; chaque N1 mène ensuite à sa fiche de restitution. C'est le repli de lecture pour les cartographies tellement denses qu'un écran ne peut plus afficher tout le texte simultanément.
- En thème clair, les bandeaux conservent une teinte légère de la couleur du domaine. En thème sombre, la couleur est davantage saturée sur la surface graphite ; le texte est choisi en fonction du contraste du fond calculé.
- Toutes les capacités N1 sont rendues dans la carte : la liste utilise une grille verticale qui répartit la hauteur disponible, sans zone de défilement interne ni masquage silencieux.
- La présentation est strictement en lecture seule : aucun contrôle de sélection/édition, glisser-déposer, menu contextuel ou redimensionnement par pointeur/clavier n'est actif.
- Le switch de la barre d'outils ouvre toujours la présentation dans un nouvel onglet, sur ordinateur comme sur mobile ; la fenêtre d'édition reste ouverte et son switch revient immédiatement à l'état désactivé.
- Dans l'onglet de présentation, un switch temporaire dans la barre flottante permet de fermer cette page (ou de revenir à l'éditeur si le navigateur interdit sa fermeture). La barre se masque après trois secondes d'inactivité.
- La touche **Échap** ferme d'abord la fiche N1 ou la lecture agrandie N0, puis la fenêtre de présentation si aucun détail n'est ouvert.
- L'URL `?view=presentation` reste disponible pour ouvrir directement une vue de restitution.

## Vérification

Le scénario Playwright `playwright/e2e/mosaic-rendering.spec.ts` vérifie les dimensions 1440×900, 1600×900 et 1920×1080 avec douze domaines, l'absence de débordement, le retour à la ligne des titres, le remplissage des cartes sans N1, l'absence de « 0 N1 », la visibilité individuelle des quatre capacités d'un même N0, l'absence de contrôles/drag-and-drop et le contraste en thème sombre.

Le scénario `playwright/e2e/presentation-applications.spec.ts` teste aussi une cartographie de **3 colonnes × 7 lignes** : quatre N1 dans une carte peu haute, absence de texte coupé et ouverture des lectures N0 puis N1.

Le test visuel Storybook capture les rendus paysage clair et sombre dans `playwright/storybook/__screenshots__/`. Les captures évoluent parce que les cartes vides occupent maintenant toute leur surface, que la grille remplit le viewport et que les couleurs/tailles de texte sont recalculées à partir de la carte plutôt que de la fenêtre.


## Robustesse des structures importées

Si un domaine référence un identifiant de colonne ou de ligne absent de la structure courante (par exemple après import d'un ancien JSON ou suppression/recréation de pistes), le rendu le rattache à la première piste disponible. La présentation conserve ainsi les domaines au lieu de produire une grille vide. Les tests d'ouverture dans un nouvel onglet vérifient la présence effective des cartes et de leurs titres, pas seulement celle du conteneur.

## Lecture métier colorée (lot 1)

La barre de restitution permet de choisir **Carte** (couleurs N0 habituelles), **Couverture**, **Maturité** ou **Écarts**. La coloration porte sur les N1, sans écraser les couleurs de domaine ni modifier les placements. Une légende explicite les états et le gris signifie toujours « non évalué ». Le mode initial Carte conserve le rendu historique.

- Couverture : uniquement l'évaluation fonctionnelle renseignée par les métiers ; la présence d'applications ne prouve pas la couverture.
- Maturité : niveau courant déclaré sur 5, avec cible affichée en indication si disponible ; pas de score calculé.
- Écarts : affiche les signaux existants ; les teintes servent à guider la lecture et non à attribuer une criticité métier calculée.

Les couleurs sont issues des tokens `--status-*` du design system (clair et sombre). Dans les deux thèmes, **le fond entier et le contour de chaque N1** reflètent son état (pas uniquement la couleur de son texte), y compris au survol ; le libellé reprend la couleur de texte contrastée du token. Le mode Carte conserve ses surfaces habituelles. La barre reste temporaire comme le switch de sortie, accessible au clavier.

## Applications rattachées (lot 2)

L'option **Applications** de la barre de présentation affiche jusqu'à deux noms par N1, puis un compteur de relations supplémentaires. Les applications cibles sont identifiées et ne prouvent pas une couverture actuelle. L'option est désactivée en cartographie à un seul niveau.

Lorsque le N0 contient au moins quatre N1 et que l'aperçu applicatif est activé, la mosaïque privilégie des cartes N1 plus larges (si l'espace le permet). Chaque carte réserve la ligne inférieure aux applications : les noms de capacité très longs se limitent visuellement à deux lignes et les badges trop longs sont abrégés horizontalement, jamais coupés verticalement. Le titre complet et toutes les applications restent accessibles dans la fiche N1 (clic ou clavier). Le mode Carte sans applications conserve son dimensionnement antérieur. Un écran extrêmement dense reste limité par l'espace physique disponible sur une page paysage.

Le test Playwright `playwright/e2e/presentation-applications.spec.ts` reproduit une mosaïque de douze N0 sur quatre lignes, dont un N0 avec quatre N1 et plusieurs applications (actuelles et cibles). Il contrôle la géométrie réelle des puces et de leur conteneur en présentation 1440×900 et 1728×900, ainsi que l'accès à la fiche détaillée et le changement de lecture.

Une N1 activée au clic ou au clavier (Entrée/Espace) ouvre une fiche de restitution présentant couverture, maturité, signaux et **toutes** les applications actuelles et cibles. Échap ferme d'abord la fiche, puis quitte la présentation au second appui. Aucune modification métier n'est possible dans cette vue.

## Piloter l'écran projeté depuis l'éditeur (lot 3)

Le panneau **Piloter la présentation**, dans la barre de lecture métier de l'éditeur (cartographie 2 niveaux), contrôle l'onglet de présentation ouvert **dans le même navigateur et sur la même origine**. Il permet de choisir la lecture Carte/Couverture/Maturité/Écarts, d'afficher ou masquer les applications, et de mettre en avant un domaine N0. Les boutons Précédent/Suivant parcourent les domaines dans l'ordre du catalogue ; « Tous les domaines » rétablit le rendu normal.

Les options sont transmises par `BroadcastChannel` sous forme de messages typés et validés. Le JSON métier n'est ni modifié ni dupliqué. Les commandes restent disponibles directement sur l'écran de présentation ; un changement effectué dans cet écran peut mettre à jour le panneau de pilotage de l'éditeur. La mise en avant N0 fait ressortir la carte active par un contour et atténue les bandeaux des autres N0 **sans rendre leurs conteneurs transparents** : titres, N1 et surfaces restent opaques et lisibles même si deux emplacements se recouvrent. Les placements et le niveau de détail des N1 ne changent pas. Pour un écran situé sur un autre appareil ou navigateur, ce pilotage local n'est pas disponible.


### Non-régression du focus N0

Le rendu ne doit jamais utiliser `opacity` sur un conteneur `mosaic-domain` atténué : la transparence globale rendait visibles plusieurs titres superposés dans des cartographies à étendues de lignes/colonnes. Le domaine sélectionné reste au premier plan ; les autres conservent une surface opaque et un texte contrasté, avec un bandeau discrètement neutralisé par le token `--map-presentation-muted-domain-share`. Les scénarios E2E et les captures Storybook couvrent le focus en clair/sombre, sa navigation et sa désactivation.


## Restitution métier et impression (lot 3, novembre 2026)

Les quatre modes Carte / Couverture / Maturité / Écarts conservent les mêmes positions N0/N1, sans glisser-déposer. La légende contextuelle du mode présentation emploie les **libellés réellement associés aux signaux** : « Suffisante/Partielle/Non couverte/À évaluer » en couverture, échelle actuelle 1–5 en maturité, signaux déclarés en écarts. « Aucun signal détecté » n'est pas une preuve de qualité de couverture fonctionnelle.

Le bouton **Imprimer / PDF**, dans les contrôles de la fenêtre de présentation, lance l'impression native du navigateur (qui peut proposer « Enregistrer en PDF »). En impression, les commandes et la fiche de focus sont masquées, le rendu conserve les couleurs sémantiques et demande une orientation paysage. Selon le navigateur et l'imprimante, vérifier les marges, l'échelle et l'option d'impression des arrière-plans avant diffusion ; ce n'est pas un export PDF programmatique.

Les indicateurs du Dashboard sont des **relations à des applications actuelles** : ils ne prouvent pas la maturité ni la couverture fonctionnelle. Cette distinction est visible sous les cartes de KPI.

Les tests unitaires protègent les associations mode/tonalité/libellé ; Playwright vérifie changement des légendes, appel à l'impression, styles d'impression et note de définition des KPI. La PWA reste statique, locale et compatible GitHub Pages.
