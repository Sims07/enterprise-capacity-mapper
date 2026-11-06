# Audit UX — hiérarchie de l'en-tête et des commandes SIGNAL (06/11/2026)

> **Nature :** proposition UX/documentaire après retour sur une capture desktop (~1906 px). Aucun changement de code ni de comportement. L'hypothèse d'usage est à confirmer avec les utilisateurs ; ce document ne prétend pas constituer une étude utilisateur.

## 1. Contexte et diagnostic

Sur la capture de l'éditeur en thème sombre, les fonctions sont accessibles, mais l'organisation est perçue comme « plein de boutons » malgré la simplification récente de la barre de la mosaïque.

Observations :
- L'identité fixe « Enterprise Architecture / Capacity Mapper » occupe seule le bord gauche de la ligne 1. Toute la navigation et ses actions sont groupées à droite ; l'espace intermédiaire n'aide ni l'orientation ni la lecture du document actif.
- Dans `src/App.tsx`, `.toolbar` juxtapose dans un même ensemble `primary-navigation`, menu `Outils`, état d'autosauvegarde, `toolbar-history` et `presentation-switch`. Navigation, retour d'état, édition et ouverture d'une fenêtre sont sémantiquement différents, mais spatialement assimilés.
- Sur la ligne 2, `map-unified-controls.css` réunit intentionnellement recherche, nombre de domaines, quatre modes de lecture, nombre d'éléments à qualifier, affichage, création et « Options ». Le regroupement a réduit le nombre de surfaces, mais **les deux lignes ont la même grammaire visuelle** : conteneurs bordés, petits boutons rectangulaires, mêmes alignements horizontaux.
- `Outils` ressemble visuellement à un onglet de navigation, alors que c'est un menu. `Options` est un second menu générique ; l'utilisateur ne peut pas anticiper la répartition de leurs commandes.
- Le statut « Enregistrée sur cet appareil » ressemble à une commande et se retrouve entre la navigation et l'historique. Il renseigne la persistance, non la destination de navigation.
- L'application ne donne pas dans cette zone un titre évident à la **cartographie active**. Le nom du produit et le contexte de travail restent disjoints.

La dette n'est donc **pas** seulement un mauvais choix de couleurs, de contrastes, d'espacements ou de boutons : c'est une hiérarchie d'information et d'action insuffisante. Ne pas répondre par une nouvelle feuille de surcharges `!important`.

## 2. Contrat d'architecture de l'interface

Séparer les fonctions selon leur rôle :

| Niveau | Question utilisateur | Contenu |
| --- | --- | --- |
| **Bandeau de produit / document** | « Où suis-je et dans quelle cartographie ? » | Identité discrète, nom de la cartographie active (élision si long), statut local/écriture, navigation des espaces Cartographie / Analyse / Bibliothèque, entrée Outils séparée, contrôle Présentation clairement identifié |
| **Barre contextuelle de cartographie** | « Que puis-je lire ou faire sur cette carte ? » | Modes Applications / Couverture / Maturité / Écarts, recherche, Affichage, création N0 et application, commandes d'édition utiles |
| **Canevas** | « Quelles capacités et quels signaux métier ? » | Mosaïque N0/N1 2D, sans chrome superflu et sans changement de modèle géométrique |
| **Menus/panneaux temporaires** | « Quels réglages ou actions occasionnelles ? » | Export/import, nouvelle cartographie, thème, options de structure, inventaire SI, aide, diagnostic détaillé et pilotage avancé |

Le bandeau et la barre contextuelle doivent être **distinguables sans lire leur texte** : le premier est sobre, presque non encadré, avec des onglets discrets ; la seconde est une zone de commandes moins haute, à groupements simples et séparateurs subtils, sans boîtes dans des boîtes.

## 3. Direction retenue pour prototypage : « Document-first, navigation horizontale »

Schéma conceptuel desktop (pas une maquette au pixel) :

```text
[◈ Capacity Mapper / NOM DE LA CARTOGRAPHIE]  Cartographie  Analyse  Bibliothèque           Sauvegardé · local   Outils   [Présentation ◯]

[Applications | Couverture | Maturité | Écarts]   [Rechercher…]   [Affichage]   [↶ ↷]   [+ Domaine N0]   [+ Application]   [⋯]

┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      MOSAÏQUE DE CAPACITÉS N0/N1                                                          │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

**Règles :**
1. Utiliser la place à gauche : identité produit compacte et **cartographie active** en premier, puis navigation à proximité, sans grand vide inutile entre le nom et les onglets. Le nom doit venir de la donnée réelle ; pas de fausse cartographie.
2. Ne pas confondre **Outils**, menu transversal, avec les onglets de pages. Il peut rester à droite sous forme de menu discret. « Options » dans l'éditeur devient un menu clairement contextualisé (« Actions de la carte » ou menu `⋯` accessible avec libellé).
3. Le statut d'autosauvegarde est une **information secondaire et contextualisée** près du nom ; pas un bouton ou une pastille verte permanente. Exposer clairement « Enregistrement… », « Enregistré localement », « Erreur de sauvegarde » selon les états réellement disponibles, sans masquer le dernier échec ; ne pas suggérer une synchronisation distante.
4. Annuler/Rétablir sont des commandes **de l'éditeur** et doivent être placées dans la barre contextuelle (ou juste à proximité de la cartographie), avec apparence `ghost`, états désactivés visibles et mêmes raccourcis clavier.
5. Préserver le **switch Présentation**, demandé pour la continuité fonctionnelle, et l'ouverture de la fenêtre dédiée. Afficher un contexte/infobulle qui clarifie l'effet du contrôle (ouvrir/fermer une fenêtre, non modifier la carte).
6. Garder **+ Application** comme action primaire clairement visible : les utilisateurs ont déjà peiné à trouver l'ajout d'applications. **+ Domaine N0** reste secondaire mais visible. Pas de second bouton primaire concurrent ni de déplacement derrière un menu caché.
7. Conserver les quatre modes de lecture directement accessibles ; ce sont les interactions à forte valeur métier. L'état « N à qualifier » devient un texte de contexte ou un accès à la qualification selon les données existantes, pas une pseudo-action.
8. Dans la barre contextuelle, recherche, mode de lecture et création doivent être distincts par **espacement et groupement**, pas par cadres répétés. Le champ de recherche ne doit pas monopoliser la moitié de l'écran sans raison.
9. Ne pas créer de navigation latérale persistante : elle consommerait la largeur de la mosaïque (6 à 8 colonnes).
10. Pas de modification de l'identité colorée N0, des statuts Couverture / Maturité / Écarts ni de la grille ; conserver leurs sémantiques.

## 4. Risques à vérifier avant d'implémenter

- **Responsive :** vérifier 1920, 1440, 1280, 900 et mobile, avec cartographie de nom long. Ne pas forcer la navigation en deux lignes confuses ni faire disparaître la création.
- **Accessibilité :** navigation clavier, ordre de focus cohérent, labels accessibles pour les icônes discrètes, statut de sauvegarde annoncé sans bruit excessif, contrastes thème clair/sombre, zoom 200 % et mouvements réduits.
- **Menu Outils / Options :** vérifier qu'aucune commande existante ne disparaît, notamment nouvelle cartographie, sauvegarde manuelle, import/export, préférences de thème, version PWA, inventaire SI, structure, aide TOGAF, examen des écarts et pilotage de présentation.
- **Desktop/productivité :** garder Ctrl/Cmd+S, Ctrl/Cmd+Z et rétablir, le mode présentation multi-écran et la même surface disponible pour la mosaïque.
- **Design system :** employer les `--color-*`, `--signal-space-*`, `--radius-*`, `--focus-*` existants ; documenter les styles des composants « App header », « Workspace toolbar », « Autosave status » et « Navigation tab » dans Storybook. Ne pas multiplier les règles CSS en fin de cascade.
- **Architecture :** conserver présentation React, logique applicative et ports/adaptateurs séparés. Aucun couplage du composant d'entête au stockage au-delà des états/commandes transmis.

## 5. Protocole de validation UX court (hypothèses, pas résultats)

Faire tester à des architectes et utilisateurs métier un prototype A (nouveau bandeau) comparé à la capture actuelle, sans expliquer les commandes au préalable :

1. « Quelle cartographie est ouverte et où sont enregistrées ses modifications ? »
2. « Changez la lecture Couverture vers Maturité puis revenez à Applications. »
3. « Ajoutez une application, puis un domaine N0. »
4. « Annulez et rétablissez votre dernière opération. »
5. « Ouvrez une présentation sur un second écran, puis revenez à l'édition. »
6. « Retrouvez l'import/export et l'inventaire des applications. »

Recueillir : réussite sans aide, erreurs de clic, hésitations, temps observé, verbatim « où avez-vous regardé en premier ? », préférence argumentée et remarques sur la densité. Pas de score d'acceptation inventé.

## 6. Critères d'acceptation pour une PR d'implémentation ultérieure

- Bandeau **identifie la cartographie active** et distingue visuellement page, statut, historique, présentation et commandes métier.
- Pas d'impression de **deux barres de boutons équivalentes** dans le prototype ; l'en-tête n'occupe pas inutilement la hauteur/largeur disponible.
- Aucun bouton fonctionnel supprimé ou caché sans alternative intelligible ; l'ajout d'application reste immédiatement visible.
- Actions de l'historique et du switch de présentation, modes de lecture et statut d'autosauvegarde se comportent comme avant.
- État de sauvegarde exact : jamais de faux « enregistré » en cas de changement non persisté/erreur.
- Storybook et tests E2E (ici Playwright, pas Cypress dans l'état actuel du dépôt) adaptés aux nouveaux placements.
- Build, typecheck, unitaires, E2E et vérifications GitHub Actions verts ; comparaison visuelle sur thèmes et tailles d'écran.
- PR indépendante, **non fusionnée sans autorisation explicite**.

## 7. Décision

Préférer **une refonte structurelle ciblée de la hiérarchie**, plutôt qu'un nouveau lot de polissage des boutons. La mosaïque reste la surface principale. Le prototype « Document-first » est une proposition à mesurer auprès d'utilisateurs, pas une vérité issue de tests réalisés.

Références internes : `docs/design/etude-benchmark-design-system-togaf-2026-11-06.md`, `docs/ux-navigation-rationalization.md`, `docs/ux/progressive-map-controls.md`, `src/App.tsx`, `src/styles/signal-experience.css`, `src/styles/map-unified-controls.css`.
