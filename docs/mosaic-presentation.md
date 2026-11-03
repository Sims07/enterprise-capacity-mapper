# Mode présentation de la mosaïque

Le mode présentation de la mosaïque est un rendu de restitution, distinct de l'espace d'édition.

## Comportement

- La cartographie occupe toute la fenêtre en paysage : aucun défilement ni découpage en pages.
- L'en-tête, les commandes d'édition, l'inventaire applicatif et le compagnon sont masqués.
- La grille conserve les placements et les étendues N0 configurés dans la structure.
- Les lignes utilisent l'espace vertical disponible sans hauteur minimale fixe ; les colonnes et lignes respectent leurs poids relatifs.
- Les panneaux N0 reprennent leur couleur de domaine. Les capacités N1 restent lisibles dans des tuiles discrètes de la même palette.
- Les intitulés sont centrés, équilibrés et peuvent revenir à la ligne sans césure forcée au milieu des mots.
- Les domaines sans N1 conservent un titre centré dans leur panneau.
- La touche **Échap** quitte le mode présentation et restaure l'interface d'édition.

## Vérification

Le scénario Playwright `playwright/e2e/mosaic-rendering.spec.ts` vérifie notamment le masquage de l'interface, l'absence de débordement de la page, l'occupation du viewport par la mosaïque, l'absence de titres débordants et le retour à l'édition avec Échap.
