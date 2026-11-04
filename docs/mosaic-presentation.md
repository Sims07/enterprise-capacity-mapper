# Mode présentation de la mosaïque

Le mode présentation de la mosaïque est un rendu de restitution, distinct de l'espace d'édition.

## Comportement

- La cartographie occupe toute la fenêtre en paysage : aucun défilement de page, de grille ou de carte N0.
- L'en-tête, les commandes d'édition, l'inventaire applicatif et le compagnon sont masqués.
- La grille conserve strictement les placements et les étendues N0 configurés dans la structure ; seules les pistes vides sont retirées du rendu.
- Les lignes et les colonnes utilisent les poids `size` de la structure et se partagent l'espace disponible.
- Les cartes N0 ont une hiérarchie stable : titre N0, capacités N1, puis code et nombre de capacités lorsqu'il est non nul.
- Un domaine sans N1 remplit toute sa carte avec son bandeau coloré ; aucune liste vide ne réserve de hauteur.
- Les titres se replient entre les mots et leur taille dépend de la largeur réelle de la carte via les container queries.
- En thème clair, les bandeaux conservent une teinte légère de la couleur du domaine. En thème sombre, la couleur est davantage saturée sur la surface graphite ; le texte est choisi en fonction du contraste du fond calculé.
- Les capacités N1 se répartissent dans la hauteur disponible sans défilement interne.
- Le mode présentation est activé et désactivé par un switch dans la barre d'outils, dans la fenêtre courante, sur ordinateur comme sur mobile. En présentation, un second switch temporaire est disponible dans la barre flottante de sortie, qui se masque après trois secondes d'inactivité.
- La touche **Échap** quitte également le mode présentation et restaure l'interface d'édition.
- L'URL `?view=presentation` reste disponible pour ouvrir directement une vue de restitution.

## Vérification

Le scénario Playwright `playwright/e2e/mosaic-rendering.spec.ts` vérifie les dimensions 1440×900, 1600×900 et 1920×1080 avec douze domaines, l'absence de débordement, le retour à la ligne des titres, le remplissage des cartes sans N1, l'absence de « 0 N1 », le switch de présentation et le contraste en thème sombre.

Le test visuel Storybook capture les rendus paysage clair et sombre dans `playwright/storybook/__screenshots__/`. Les captures évoluent parce que les cartes vides occupent maintenant toute leur surface, que la grille remplit le viewport et que les couleurs/tailles de texte sont recalculées à partir de la carte plutôt que de la fenêtre.
