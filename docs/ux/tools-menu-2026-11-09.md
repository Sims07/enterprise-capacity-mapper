# Menu Outils — finition professionnelle (9 novembre 2026)

La navigation principale conserve un seul déclencheur **Outils**, à côté de **Bibliothèque**. Le menu est ancré au bord droit de ce déclencheur, y compris sur les petits écrans : aucune position verticale fixe ne doit le faire « sauter » quand la hauteur de l'en-tête évolue.

## Hiérarchie des actions

- **Cartographie** : nouvelle cartographie (accentuation discrète), enregistrement manuel.
- **Données** : export JSON et import local JSON.
- **Affichage** : bascule clair/sombre.
- **Pied de menu** : version PWA et mise à jour si disponible.

Chaque action est une **ligne de menu**, et non une carte ou un bouton bordé. Les pictogrammes filaires sont à gauche, avec largeur constante ; le texte est aligné à gauche. Le composant partagé `Button` reste utilisé, et `FilePicker` accepte une icône optionnelle sans perdre son vrai champ fichier focusable. Le menu ne modifie pas la persistance locale, les formats JSON ni les actions métier.

## Source de vérité visuelle

`src/styles/tools-menu.css` fixe la géométrie du menu et réutilise les tokens SIGNAL (`--color-*`, `--signal-space-*`, `--radius-*`, `--focus-*`, `--control-target-size`). Il est importé après les anciennes feuilles afin d'unifier les états clair/sombre et d'éviter les conflits entre bordures des boutons historiques.

## Non-régression

La story **Design system → Actions et navigation → Menu déroulant** utilise la même composition. `playwright/e2e/tools-menu-layout.spec.ts` vérifie le panneau dans le viewport à 320, 390, 900 et 1280 px, l'alignement des lignes et des pictogrammes, le changement de thème et la fermeture par Échap. Les autres parcours d'import/export, de sauvegarde et de création restent couverts par les E2E de l'application.
