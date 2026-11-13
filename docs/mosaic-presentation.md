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
- Lorsque l'option **Applications** est cochée, chaque carte N1 choisit son rendu selon **sa hauteur réelle** : les grandes cartes affichent **autant de badges d'applications que leurs dimensions le permettent**, avec une typographie adaptative par N1 (18, 16, 14 ou 12 px issus du design system) privilégiant la plus grande taille affichant toutes les applications, ou à défaut le maximum de noms lisibles, sur plusieurs lignes si nécessaire, sans limite arbitraire de deux ; `+N autres` apparaît uniquement pour les applications qui ne tiennent pas. Les cartes courtes conservent le résumé (première application et compteur), puis « n apps » directement à côté du titre si la hauteur ne permet pas deux lignes. **Même en très forte densité, les applications ne disparaissent jamais complètement.** La fiche de détail N1 donne toujours accès à tous les noms et statuts.
- Les noms longs bénéficient d'un titre au survol ; le résumé compact indique les applications restantes sans les perdre et distingue les capacités sans application.
- Le bouton **« Voir N1 »** dans chaque bandeau N0 ouvre une fenêtre dédiée regroupant ses capacités en grands libellés ; chaque N1 mène ensuite à sa fiche de restitution. Les événements `pointerdown` et `focusin` de la cartographie ne redessinent plus prématurément les cartes : un clic souris normal ou une activation clavier déclenche bien l'ouverture.
- En thème clair, les bandeaux conservent une teinte légère de la couleur du domaine. En thème sombre, la couleur est davantage saturée sur la surface graphite ; le texte est choisi en fonction du contraste du fond calculé.
- Toutes les capacités N1 sont rendues dans la carte : la liste utilise une grille verticale qui répartit la hauteur disponible, sans zone de défilement interne ni masquage silencieux.
- La présentation est strictement en lecture seule : aucun contrôle de sélection/édition, glisser-déposer, menu contextuel ou redimensionnement par pointeur/clavier n'est actif.
- Le switch de la barre d'outils ouvre toujours la présentation dans un nouvel onglet, sur ordinateur comme sur mobile ; la fenêtre d'édition reste ouverte et son switch revient immédiatement à l'état désactivé.
- Dans l'onglet de présentation, un switch temporaire dans la barre flottante permet de fermer cette page (ou de revenir à l'éditeur si le navigateur interdit sa fermeture). La barre se masque après trois secondes d'inactivité et se rappelle en approchant le pointeur du **bord inférieur** (ou via le clavier), sans réapparaître pendant la lecture du reste de la carte.
- La touche **Échap** ferme d'abord la fiche N1 ou la lecture agrandie N0, puis la fenêtre de présentation si aucun détail n'est ouvert.
- L'URL `?view=presentation` reste disponible pour ouvrir directement une vue de restitution.

## Vérification

Le scénario Playwright `playwright/e2e/mosaic-rendering.spec.ts` vérifie les dimensions 1440×900, 1600×900 et 1920×1080 avec douze domaines, l'absence de débordement, le retour à la ligne des titres, le remplissage des cartes sans N1, l'absence de « 0 N1 », la visibilité individuelle des quatre capacités d'un même N0, l'absence de contrôles/drag-and-drop et le contraste en thème sombre.

Le scénario `playwright/e2e/presentation-applications.spec.ts` teste aussi une cartographie de **3 colonnes × 7 lignes** : quatre N1 dans une carte peu haute, zéro, une ou plusieurs applications (dont des cibles), bascule automatique vers le résumé compact, absence de recouvrement et ouverture de la fiche N1 avec toutes les applications. Une mosaïque supplémentaire de **3 colonnes × 9 lignes** vérifie que les N1 les plus courts conservent un compteur d'applications visible, et que le bouton « Voir N1 » fonctionne après un appui souris prolongé ou au clavier. Un scénario de redimensionnement vérifie qu'un N0 large affiche tous ses badges, puis ajuste la taille des libellés et réduit automatiquement leur nombre et affiche un compteur exact lorsque la largeur et la hauteur disponibles diminuent, sans écrêtage des badges visibles. La suite CI inclut désormais ce fichier Playwright et vérifie également le passage à 18 px pour une N1 disposant d'espace. La fiche N1 neutralise aussi la règle générique du header mobile pour garder son titre et sa fermeture dans le cadre.

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

Une N1 activée au clic ou au clavier (Entrée/Espace) ouvre une **fiche de restitution centrée sur les applications** : contexte N0 et code, intitulé métier complet, dénombrement et liste exhaustive des applications actuelles et cibles avec leurs statuts. Les applications sont affichées avant les indicateurs d'évaluation, séparées visuellement par état actuel/cible. Si aucune application cible (ou actuelle) n'est présente, la fiche affiche un état vide explicite sans inventer de couverture métier. La section secondaire « Évaluation métier » conserve couverture fonctionnelle, maturité déclarée (actuelle et cible) et écarts, sans inférence à partir des liens applicatifs. La fiche reste défilable pour les grands catalogues et responsive sur les petits écrans. Échap ferme d'abord la fiche, puis quitte la présentation au second appui. Aucune modification métier n'est possible dans cette vue.

La fiche est un composant dédié `PresentationCapabilityDetail` utilisant les tokens Signal, documenté dans Storybook en quatre états (mixte, applications actuelles uniquement, vide, catalogue volumineux). Le test `presentation-applications.spec.ts` valide l'ordre de lecture, les statuts, le défilement des listes longues et les états vides.

### Trajectoire applicative — rôle des relations

Les sections « Applications actuelles » et « Applications cibles » représentent les **contributions de chaque relation** à la capacité projetée et non le seul statut global de cycle de vie. Une application déclarée « Actuelle et cible » apparaît dans les deux sections avec la précision « Maintenue dans la cible » / « Déjà en service ». Le compteur principal totalise des applications **distinctes** : une relation double n'est pas comptée deux fois. L'infobulle des aperçus N1 expose ce rôle ; le badge « maintenue » le distingue des applications futures seules. La qualification se fait dans l'éditeur via « Relier… » et non dans la fenêtre de projection en lecture seule.

Les JSON V3 non requalifiés conservent l'ancienne règle `status=Cible` → cible seule, tous les autres statuts → actuelle seule. Le changement du cycle de vie ne modifie pas les rôles de contribution enregistrés. Ce découpage ne présume ni de la fin de vie d'une application actuelle, ni de sa conservation en cible.

### Fiche exécutive N1

L'en-tête de restitution met d'abord en valeur le nom et le code de la capacité, ainsi que son domaine N0. La fermeture utilise le composant Button du design system et un pictogramme vectoriel, aligné en haut à droite. Les en-têtes internes ne reprennent plus le positionnement sticky, la hauteur et l'ombre du header global.

Les applications actuelles et cibles restent exhaustives, mais se lisent dans deux cartes distinctes avec un décompte sans équivalence avec la couverture fonctionnelle. Sous ce panorama, trois cartes mettent en évidence la couverture déclarée, la maturité actuelle/cible et les points à examiner, sans inventer de risque ni score. Les couleurs reprennent les tokens sémantiques Signal, avec un rendu clair et sombre. Les petits écrans empilent les colonnes, les catalogues longs défilent à l'intérieur du dialogue. Les tests Playwright vérifient aussi le placement réel du bouton de fermeture et l'absence de débordement horizontal en mobile.



### Affinage de la fiche exécutive

En présentation, le panorama applicatif n'ajoute plus de grand cadre supplémentaire autour des deux groupes. Lorsqu'un seul groupe possède des applications, il exploite la largeur de la fiche, avec deux colonnes de relations sur grand écran (une seule sur mobile). Le groupe vide reste visible, sous la forme d'un message compact sur la ligne suivante, sans être confondu avec une absence de couverture fonctionnelle. Si les deux groupes sont vides, leurs messages restent tous deux lisibles.

Les indicateurs métier forment une bande de trois mesures séparées par des filets plutôt que trois cartes imbriquées. Le nombre de signaux suit la grammaire singulier/pluriel et la fiche liste **les descriptions effectivement issues du diagnostic** pour permettre de comprendre le point à examiner (par exemple un écart de maturité déclaré). Une absence de signal ne signifie jamais absence de risque. Les champs existants et leurs règles métier restent inchangés, tout comme l'ouverture, la fermeture, les états clairs et sombres et la compatibilité GitHub Pages.

La non-régression Playwright vérifie la largeur libérée par l'absence de cibles, la compacité du message vide, le nombre exact d'applications, le détail d'un signal, l'empilement mobile, l'absence de débordement horizontal et la fermeture. Les variantes Storybook couvrent aussi « cibles uniquement » et « applications actuelles avec écart ».

## Piloter l'écran projeté depuis l'éditeur (lot 3)

Le panneau **Piloter la présentation**, dans la barre de lecture métier de l'éditeur (cartographie 2 niveaux), contrôle l'onglet de présentation ouvert **dans le même navigateur et sur la même origine**. Il permet de choisir la lecture Carte/Couverture/Maturité/Écarts, d'afficher ou masquer les applications, et de mettre en avant un domaine N0. Les boutons Précédent/Suivant parcourent les domaines dans l'ordre du catalogue ; « Tous les domaines » rétablit le rendu normal.

Les options sont transmises par `BroadcastChannel` sous forme de messages typés et validés. Le JSON métier n'est ni modifié ni dupliqué. Les commandes restent disponibles directement sur l'écran de présentation ; un changement effectué dans cet écran peut mettre à jour le panneau de pilotage de l'éditeur. La mise en avant N0 fait ressortir la carte active par un contour et atténue les bandeaux des autres N0 **sans rendre leurs conteneurs transparents** : titres, N1 et surfaces restent opaques et lisibles même si deux emplacements se recouvrent. Les placements et le niveau de détail des N1 ne changent pas. Pour un écran situé sur un autre appareil ou navigateur, ce pilotage local n'est pas disponible.


### Non-régression du focus N0

Le rendu ne doit jamais utiliser `opacity` sur un conteneur `mosaic-domain` atténué : la transparence globale rendait visibles plusieurs titres superposés dans des cartographies à étendues de lignes/colonnes. Le domaine sélectionné reste au premier plan ; les autres conservent une surface opaque et un texte contrasté, avec un bandeau discrètement neutralisé par le token `--map-presentation-muted-domain-share`. Les scénarios E2E et les captures Storybook couvrent le focus en clair/sombre, sa navigation et sa désactivation.


## Restitution métier et impression (lot 3, novembre 2026)

Les quatre modes Carte / Couverture / Maturité / Écarts conservent les mêmes positions N0/N1, sans glisser-déposer. La légende contextuelle du mode présentation emploie les **libellés réellement associés aux signaux** : « Suffisante/Partielle/Non couverte/À évaluer » en couverture, échelle actuelle 1–5 en maturité, signaux déclarés en écarts. « Aucun signal détecté » n'est pas une preuve de qualité de couverture fonctionnelle.

Le bouton **Imprimer / PDF**, dans les contrôles de la fenêtre de présentation, lance l'impression native du navigateur (qui peut proposer « Enregistrer en PDF »). En impression, les commandes et la fiche de focus sont masquées. La composition est désormais fixée sur une **diapositive 16:9 de 16 × 9 pouces** (1536 × 864 pixels CSS), avec marges nulles, et non dimensionnée par le viewport d'impression de l'ordinateur. La grille, les N0/N1, les aperçus applicatifs et les couleurs sémantiques occupent la page entière, sans réduction automatique à une feuille A4. Le navigateur peut proposer « Enregistrer en PDF » ; activer l'impression des arrière-plans si nécessaire. Une imprimante physique A4 peut réadapter ce format panoramique à son papier ; pour une restitution fidèle, conserver le format de page indiqué dans le PDF.

Les indicateurs du Dashboard sont des **relations à des applications actuelles** : ils ne prouvent pas la maturité ni la couverture fonctionnelle. Cette distinction est visible sous les cartes de KPI.

Les tests unitaires protègent les associations mode/tonalité/libellé ; Playwright vérifie changement des légendes, appel à l'impression, styles d'impression et note de définition des KPI. La PWA reste statique, locale et compatible GitHub Pages.

### Redimensionnement des N0 empilés

Les domaines N0 partageant une même ligne métier peuvent se superposer horizontalement :
ils sont alors disposés sur des sous-rangées visuelles, sans création de ligne métier artificielle.
Cette règle est identique lors de l'édition des propriétés, du déplacement et du
redimensionnement par les bords droit/bas (ou au clavier avec les flèches).
La réduction de 3 à 2 puis 1 colonne est permise même si un autre N0 occupe
une partie de la même ligne. Les chevauchements impliquant un N0 étendu sur
plusieurs lignes métier restent interdits.

Pendant un redimensionnement, le glisser-déposer natif des capacités ou
applications ne doit pas interrompre la capture du pointeur. La largeur enregistrée
est celle validée par la règle métier ; les aperçus interrompus sont restaurés.

## Focus N1 synchronisé entre l'éditeur et la présentation

La sélection d'une ou plusieurs capacités **N1** depuis leur titre dans la cartographie de travail met immédiatement ces mêmes N1 **en lumière** dans la fenêtre projetée. Un fond d'accent contrasté en mode Carte et un contour renforcé rendent chaque N1 pointée immédiatement identifiable, sans bande verticale sur le côté gauche. Le N0 parent est entouré d'une couronne de focus et les contours des autres N0 deviennent neutres tant qu'une sélection existe, sans rendre aucune carte transparente. En modes Couverture, Maturité et Écarts, le fond métier des N1 reste strictement celui de leur état, seul le contour de focus s'ajoute. Un nouveau clic désélectionne la capacité et retire le repère ; la multisélection est possible. La fenêtre demande aussi l'état courant à l'éditeur à son ouverture, à sa reprise de visibilité ou à son retour au premier plan. Si une N1 vient d'être créée, sa sélection est conservée pendant l'arrivée du modèle actualisé (les deux messages sont indépendants).

Le focus de sélection est un **repère de lecture temporaire**, pas une déclaration de risque ou d'impact métier. Il n'altère ni les couleurs fonctionnelles des modes Couverture/Maturité/Écarts, ni les liens applicatifs, ni les données enregistrées. La synchronisation ne transporte que des identifiants via `BroadcastChannel` (même navigateur, même origine). Sans canal disponible, chaque fenêtre reste utilisable indépendamment. Le focus N0 manuel conserve son fonctionnement. Le test Playwright `mosaic-rendering.spec.ts` couvre la sélection avant l'ouverture, la multisélection, la désélection et le respect de la coloration métier.


### Test de l'impression réelle

Le scénario `playwright/e2e/presentation-print.spec.ts` produit un **PDF Chromium**, et ne se limite pas à vérifier l'appel à `window.print()` : il contrôle l'unique page 16:9, la taille physique du PDF, la géométrie identique à la présentation 1536 × 864, le masquage des contrôles et la préservation des fonds. Une carte **3 colonnes × 7 lignes** avec capacités et applications vérifie que les N0 restent dans les limites du document, que l'indicateur applicatif demeure visible et qu'une page supplémentaire n'est pas créée. Les PDF générés sont joints aux résultats du test dans les artefacts CI.
