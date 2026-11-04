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
- Sur ordinateur, l'action « Ouvrir la présentation » ouvre une nouvelle fenêtre indépendante de l'éditeur.\n- Sur mobile, la présentation utilise la fenêtre courante pour éviter une expérience popup inadaptée.\n- Si le navigateur bloque la popup sur ordinateur, la présentation s'active dans la fenêtre courante.\n- Les modifications sont synchronisées entre l'éditeur et la fenêtre de présentation via `BroadcastChannel`, avec repli sur l'événement `storage`.\n- Le bouton de retour ferme la fenêtre dédiée ; dans une présentation ouverte directement par URL, il revient à l'éditeur.\n- La touche **Échap** quitte le mode présentation et restaure l'interface d'édition.

## Vérification

Le scénario Playwright `playwright/e2e/mosaic-rendering.spec.ts` vérifie notamment l'ouverture d'une fenêtre dédiée sur desktop, la synchronisation inter-fenêtres, le repli en cas de popup bloquée, le comportement mobile, le masquage de l'interface, l'absence de débordement et le retour à l'éditeur.
