# Étude — rendre la cartographie des capacités plus lisible et attractive

## Synthèse

La cartographie doit être un livrable d'architecture lisible et partageable, pas seulement une grille de saisie. L'amélioration recommandée est une **vue de lecture soignée**, distincte des actions d'édition, avec des options visuelles qui servent le sens métier. Les couleurs et les effets ne doivent jamais remplacer la qualité du modèle de capacités.

Cette proposition est conçue pour l'application React/Vite actuelle, compatible GitHub Pages et PWA, sans serveur ni dépendance à un service distant. Elle ne prescrit aucune persistance supplémentaire : les préférences de présentation peuvent rester locales.

## Principes de conception

1. **Lisibilité avant décoration** : titres courts, contraste suffisant, espacements cohérents et densité réglable.
2. **Sens métier explicite** : une couleur ou un indicateur doit correspondre à une information identifiable (domaine, priorité, maturité, état cible), jamais à une couleur arbitraire sans légende.
3. **Vue de lecture distincte de l'édition** : une présentation propre pour les ateliers et les comités, avec les commandes d'édition masquées ou discrètes.
4. **Progressivité** : conserver la carte et les données existantes ; ajouter des réglages de présentation non destructifs.
5. **Accessibilité et impression** : ne pas transmettre une information uniquement par la couleur ; maintenir les contrastes, le clavier, les libellés accessibles et une version imprimable.
6. **Pas d'inflation fonctionnelle** : chaque option doit améliorer une tâche de lecture ou de communication.

## Fonctionnalités visuelles proposées

### P0 — impact fort, risque limité

- **Palette de thèmes sobres** : par exemple « Classique », « Executive » et « Contrasté ». Palette limitée et cohérente, avec couleurs assignées de façon déterministe aux domaines N0.
- **Mode présentation** : masquer les panneaux d'édition et les actions secondaires, donner plus de place à la carte et afficher un titre/sous-titre facultatif.
- **Densité de la carte** : confortable / compacte, avec tailles de cellules et espacements adaptés au nombre de capacités.
- **Hiérarchie typographique** : distinguer clairement le domaine N0, les capacités N1, les codes et les descriptions. Limiter le texte visible dans les cellules et afficher le détail à la sélection ou au survol, sans dépendre uniquement du survol.
- **Légende contextualisée** : afficher la signification des couleurs, statuts et marqueurs actifs. La légende doit se mettre à jour avec le mode visuel choisi.
- **Export propre** : mise en page d'impression / « Enregistrer en PDF » du navigateur, sans boutons, modales ni éléments de navigation. Vérifier le rendu multi-page et les fonds imprimés.

### P1 — aider à comprendre et raconter la carte

- **Coloration par objectif de lecture** : couleur par domaine N0 ou par statut de capacité (existant, cible, à transformer) selon les données réellement disponibles. Un seul mode principal à la fois pour éviter une surcharge visuelle.
- **Mise en évidence ciblée** : rechercher une capacité et mettre en évidence son domaine ; possibilité de griser temporairement le reste de la carte.
- **Filtres visuels** : filtrer par domaine, statut et niveau N0/N1 lorsque ces dimensions existent dans le modèle. Afficher clairement le nombre de capacités masquées et proposer « Réinitialiser ».
- **Fiche de détail discrète** : au clic, présenter description, identifiant, statut et relations existantes dans un panneau latéral plutôt que d'encombrer chaque cellule.
- **Variantes de présentation enregistrables localement** : mémoriser le thème, la densité et le mode de coloration sur cet appareil, sans modifier les données métier ni créer un compte.

### P2 — à valider avec des utilisateurs avant d'investir

- **Vues narratives** : « Vue exécutive » (N0, très synthétique), « Vue capacités » (N0/N1), et éventuellement une vue de transformation si les attributs nécessaires existent.
- **Comparaison actuel / cible** ou mise en évidence de l'écart : uniquement si le modèle représente explicitement les états actuel et cible ; ne pas inférer de maturité ou de criticité absente des données.
- **Export image / SVG** : utile pour les présentations, mais à évaluer après stabilisation du rendu imprimable.
- **Icônes** : à employer avec parcimonie et seulement si elles ajoutent une signification stable. Éviter une icône différente pour chaque capacité, qui alourdirait la carte.

## Direction visuelle recommandée

Une esthétique de cartographie d'entreprise contemporaine :

- fond clair légèrement teinté et carte au premier plan ;
- en-têtes N0 avec couleur d'accent maîtrisée, libellés courts et nombre de capacités ;
- cellules N1 aérées, alignées et de dimensions cohérentes ;
- bordures fines, ombres très légères uniquement pour la profondeur fonctionnelle ;
- couleurs peu saturées, réservant les couleurs fortes aux statuts et aux sélections ;
- barre d'outils dédiée à la présentation, séparée des commandes de gestion ;
- états vides et filtres actifs explicitement signalés.

Éviter les dégradés décoratifs généralisés, les ombres prononcées, les palettes arc-en-ciel, les animations permanentes et les cartes arrondies excessivement : ils réduisent la densité utile et nuisent à l'impression professionnelle.

## Règles TOGAF / qualité du modèle

- La présentation ne change pas la sémantique d'une capacité.
- Ne pas confondre capacité métier, application, organisation et processus.
- Les codes couleur ne doivent pas être présentés comme une convention TOGAF universelle : ce sont des choix de visualisation configurables, accompagnés d'une légende.
- Une coloration par maturité, criticité, valeur ou risque n'est proposée que si le modèle contient cette donnée et si sa définition est documentée.
- Le regroupement visuel N0/N1 doit rester explicite, avec une hiérarchie stable et sans ambiguïté sur l'appartenance des capacités.
- Les réglages d'affichage ne doivent pas altérer les données exportées ni les identifiants.

## Architecture et compatibilité

- Réutiliser React et la feuille de styles existante ; éviter une bibliothèque de visualisation pour une grille de capacités tant qu'un besoin concret ne la justifie pas.
- Garder les préférences de présentation dans le stockage local du navigateur. Aucun backend requis.
- Préserver le fonctionnement à la racine et sous un sous-chemin GitHub Pages.
- Vérifier le fonctionnement hors ligne PWA et ne pas ajouter de ressource distante indispensable au rendu.
- Les exports doivent être déclenchés côté client.
- Respecter la convention du dépôt : peu de composants, chacun avec une responsabilité claire.

## Plan de réalisation proposé

1. **Fondation visuelle** : harmoniser typographie, espacements, cellules, en-têtes N0/N1 et états de sélection ; faire un premier contrôle de lisibilité sur une carte dense.
2. **Lecture et présentation** : ajouter le mode présentation, la densité et deux ou trois thèmes, avec légende et préférence locale.
3. **Exploration** : ajouter mise en évidence de recherche et filtres, avec réinitialisation visible.
4. **Partage** : fiabiliser impression/PDF puis envisager l'export image.
5. **Validation** : faire tester par quelques utilisateurs une carte vide, une carte dense et une carte avec statuts ; ne retenir les options qui facilitent effectivement la compréhension.

## Critères d'acceptation à prévoir

- La carte est compréhensible sans explication orale, avec une hiérarchie N0/N1 évidente.
- Chaque mode de couleur affiche une légende et reste lisible en niveaux de gris autant que possible.
- Le mode présentation ne modifie ni les données ni les droits d'édition ; quitter ce mode restaure l'interface normale.
- Les filtres peuvent être réinitialisés en une action et leur effet est explicite.
- Les préférences visuelles persistent localement sans remplacer ni corrompre le modèle de capacités.
- L'interface reste utilisable au clavier, avec des contrastes adaptés et des libellés accessibles.
- L'impression n'inclut pas les contrôles de l'application et reste lisible sur une carte large.
- Les tests de non-régression couvrent création, déplacement, renommage, profondeur de carte, import/export, stockage et déploiement sous le chemin GitHub Pages.

## Décision recommandée

Commencer par **P0 : finition visuelle + mode présentation + densité + palettes légendées + impression**. Ce sont les améliorations qui rendent immédiatement la cartographie plus présentable sans créer de nouvelles données métier ni compliquer la modélisation. Évaluer ensuite les filtres et vues narratives sur des retours utilisateurs.

Cette PR documente l'étude et le périmètre recommandé ; elle ne modifie pas encore le comportement de l'application.