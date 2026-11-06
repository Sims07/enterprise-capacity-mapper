# Étude comparée — Design system professionnel et cartographie de capacités (06/11/2026)

> **Nature :** audit statique du dépôt `main` au 6 novembre 2026, benchmark de références publiques et recommandations UX/produit. Ce document ne prétend pas mesurer l'expérience d'utilisateurs ni certifier l'accessibilité visuelle dans un navigateur. Les propositions sont des hypothèses à tester. Aucun changement d'interface ou de schéma n'est réalisé dans cette PR.

## 1. Synthèse de décision

**Choix recommandé : SIGNAL Professionnel**, évolution incrémentale du langage visuel actuel, **inspirée d'IBM Carbon pour les fondations/composants, de SAP Fiori pour les parcours d'analyse/qualification et de SAP LeanIX pour la lecture métier des cartes**. Ne pas intégrer un kit externe dans toute l'application sans prototype et audit de coût.

Conserver comme invariants : **mosaïque 2D** et ses `columnSpan` / `rowSpan`, tous les N1 sans plafond, **navigation principale horizontale**, inventaire SI accessible à la demande, application N0/N1, thème clair/sombre, lecture multidimensionnelle, fenêtre de présentation synchronisée et *read-only*, stockage local, JSON V3, PWA/GitHub Pages et architecture hexagonale. Ces décisions sont documentées dans `docs/design/client-design-system-directions.md` et dans les E2E SIGNAL.

La différenciation métier ne provient **pas** d'une palette à la mode : elle repose sur la capacité à afficher **sur la même géométrie** les applications, la couverture fonctionnelle **déclarée**, la maturité actuelle/cible et les signaux d'écart. Les informations absentes restent « à évaluer », jamais imputées.

## 2. Références étudiées

| Référence | Apport fort au projet | Limite pour notre cas | Décision |
|---|---|---|---|
| **IBM Carbon** (https://carbondesignsystem.com) | Surfaces neutres, tokens, contraste, thèmes clair/sombre, composants et tables accessibles, filtres structurés | Les composants génériques ne fournissent pas une mosaïque N0/N1 métier | **Référence principale du design system**, sans remplacer la cartographie par des tables |
| **SAP Fiori** (https://www.sap.com/design-system/fiori-design-web/) | Parcours `overview → list/analytical → object page`, mise en contexte et formulaires de qualification | Son shell et sa navigation ne doivent pas imposer une sidebar ni une dépendance SAPUI5 | **Référence de parcours et de fiches**, pas un framework à réinstaller |
| **Ant Design** (https://ant.design/components/overview/) | Bibliothèque large pour formulaires, selects, modales, feedback, tableaux, navigation | Aspect « back-office standard » possible ; bundle et conventions à intégrer ; cartographie à garder spécifique | **Alternative pragmatique pour formulaires**, à évaluer via prototype isolé |
| **Atlassian Design System** (https://atlassian.design/foundations/design-tokens) | Gouvernance des tokens sémantiques, états, densités, composants modulaires | Plus orienté collaboration/produit qu'analyse EA complexe ; risque de transposer une identité extérieure | **Référence de méthode**, tokens et documentation |
| **SAP LeanIX** (https://www.leanix.net/fr/sap-leanix-business-capability-map) | Référence métier de grilles N0/N1, heatmaps multi-dimensions, applications et roadmap | Produit EA, **pas** bibliothèque de composants librement transposable ; ne pas copier son UI | **Référence fonctionnelle et sémantique**, pas de dépendance |

Sources : https://www.carbondesignsystem.com/getting-started/designing/overview ; https://www.carbondesignsystem.com/building-blocks/foundations/color/overview ; https://www.sap.com/design-system/fiori-design-web/v1-120/discover/frameworks/sap-fiori-elements ; https://ant.design/components/overview/ ; https://atlassian.design/foundations/design-tokens ; https://www.leanix.net/fr/sap-leanix-business-capability-map .

**TOGAF/ArchiMate :** la cartographie des capacités décrit le *quoi* de l'entreprise, distinct des applications/processus/organisation. Ses vues de maturité, valeur, performance, coût ou risques sont des lectures configurées sur des attributs explicites ; aucune convention de couleur unique « TOGAF » n'existe. Référence à la section « Applying Business Capabilities » du standard TOGAF 9.2 et au guide métier de LeanIX : https://www.leanix.net/hubfs/2024-Website/content/white-paper/WP-7-EA-Use-Cases/EN/EN-WP-7-Use-Cases-EA.pdf .

## 3. État constaté dans le code de `main`

### Ce qui est déjà réel — à préserver

- `src/domain/catalogModel.ts` : N0, N1, applications, relations, `assessment.functionalCoverage` (`unknown/none/partial/sufficient`), maturité actuelle/cible, justification.
- `src/domain/capabilityGaps.ts` et `src/application/capabilityMapReadout.ts` : absence d'application actuelle, couverture évaluée, écart de maturité, obsolescence ; quatre lectures Applications / Couverture / Maturité / Écarts.
- `src/application/layoutUseCases.ts` et `src/domain/mapLayout.ts` : règles de placement bidimensionnel.
- `src/App.tsx` : navigation haute, édition N0/N1/applications, inventaire SI superposé, modes de lecture, états de sauvegarde, présentation `?view=presentation`.
- `src/adapters/browser/presentationSync.ts` : synchronisation interfenêtres ; `docs/architecture/current-state.md` explicite le mode lecture seule.
- `src/components/Dashboard.tsx` : couverture, analyse, points d'attention, questions de décision, simulation d'un retrait applicatif.
- Import/export JSON V3, autosauvegarde locale et raccourci Ctrl/Cmd+S, PWA sans backend.
- Tests Playwright : `signal-experience.spec.ts` vérifie navigation haute, largeur de mosaïque, ajout/relation applicative et fenêtre de présentation. D'autres scénarios couvrent la mosaïque et les parcours critiques.

### Limites de cohérence visuelle et de maintenabilité

- `src/styles/index.css` charge **plus de 20 feuilles spécialisées**, terminées par `signal-experience.css` : la cohérence repose encore en partie sur des surcharges successives.
- Audit textuel approximatif du 06/11 : `src/styles/base.css` comporte **199 occurrences** de `!important` et **827 occurrences** de couleurs hexadécimales à 6 chiffres ; `src/styles/signal-experience.css` comporte **32 occurrences** de `!important`. Ces nombres sont des occurrences lexicales, **pas** des anomalies d'accessibilité prouvées ; ils signalent une dette de cascade / tokens.
- `src/styles/tokens.css` contient des tokens utiles `--color-*`, `--map-*`, `--status-*`, `--radius-*`, `--focus-*`, mais les couleurs/couches historiques ne leur obéissent pas systématiquement.
- `src/App.tsx` déclare localement des composants de base comme `Modal` et contient de nombreux `<input>`, `<select>`, `<textarea>` et `<button>`; il n'existe pas de catalogue Storybook atomique correspondant.
- Le Storybook actuel ne comporte que quatre fichiers de stories : `CapacityMapper`, `CartographerCompanion`, `TogafGuide` et `DesignTokens`. Les stories de l'application entière **ne remplacent pas** un inventaire des états : Input, Select, Toggle, Menu, Modal, Drawer, Toast, Focus, Validation, Empty, Loading.
- Les tests de régression visuelle existent mais sont surtout orientés captures de pages et de présentation. L'audit des primitives/états accessibles et des tokens doit être ajouté.
- Ce diagnostic est **statique** : aucune conclusion définitive sur la lisibilité à 1440×900, l'impression, les animations, les contrastes mesurés ou les performances sans inspection navigateur et tests dédiés.

## 4. Écarts UX visuels — priorités

| Écart | Impact métier | Cible UX vérifiable | Priorité |
|---|---|---|---|
| Incohérence de surfaces entre pages et thèmes | Impression de plusieurs applications juxtaposées | Même système de surfaces, bordures, rayons, niveaux de profondeur dans Cartographie / Analyse / Bibliothèque / Compagnon / modales | **P0** |
| Composants de saisie non uniformisés | Qualification métier confuse, erreurs et charge cognitive | Champs, selects, aides, validation, confirmations, états désactivé/chargement/erreur documentés et visibles au clavier | **P0** |
| Sémantique de couleur parfois ambiguë | Un domaine coloré peut être pris pour une couverture suffisante | Séparer **couleur d'identité N0** / **statut N1** / **sélection** / **actions** ; libellés et légende contextuelle | **P0** |
| SIGNAL par surcouches `!important` | Régressions fréquentes light/dark et sur les vues spécialisées | Tokens sémantiques dominants, règles scoped et suppression progressive des surcharges remplacées | **P0** |
| Densité et microtypographie à arbitrer | Une mosaïque 6–8 colonnes devient difficile à lire | Deux densités nommées, dimensions minimales et zoom de lecture éventuel ; ne **jamais masquer** les N1 | **P1** |
| Panneaux et contextes d'édition | Moins de place disponible pour la carte | Barre horizontale conservée ; inspecteur/drawer **temporaire**, jamais rail fixe ; fermeture au clavier | **P1** |
| Mode présentation vs édition | Rendu de comité insuffisamment hiérarchisé | Présentation paysage, fidèle à la carte, sans survol clignotant, sans drag, avec modes/legendes synchronisés | **P1** |
| Justification des signaux peu « décisionnelle » | Le métier voit un état sans ses éléments de preuve | Fiche « constat / source / date / justification / action » seulement avec données explicites | **P2** |
| Accessibilité et export visuel peu spécifiés | Projection, impression ou usage clavier fragiles | Audit WCAG 2.2 AA, focus clavier, 400 % zoom, supports autres que couleur, export imprimable | **P2** |

**Ne pas inventer une mesure à partir d'une couleur** : absence de relation applicative ≠ « non couverte » fonctionnellement ; nombre d'applications ≠ maturité ; `Cible` ≠ support actuel.

## 5. Trois directions de design proposées (même cartographie, fonctions identiques)

### A — SIGNAL Professionnel (recommandée)

Style graphite/ardoise pour l'analyse, variante claire équivalente pour comité, accent primaire discret, surfaces couches 0/1/2, séparateurs fins, bordures N0/N1 permanentes. Ne pas augmenter la saturation des statuts métier ni rendre les fonds très colorés. En-tête **horizontal** ; barre de lecture de la mosaïque compacte ; inventaire SI en drawer à la demande ; sélection N1 → fiche latérale temporaire ; en présentation, un seul canevas 16:9 lisible.

**Pourquoi :** continuité avec le style SIGNAL déjà retenu et le comportement actuel, coût limité, grande densité d'information. **Risque :** contraste dark à confirmer sur projection, trop de petites inscriptions si densité unique.

### B — CARBON Executive (alternative claire)

Surface gris très clair, domaines N0 avec bandeau identitaire fin, N1 blancs/neutralisés, couleurs sémantiques affichées par un **marqueur** et un texte ; actions bleu discret ; grille très nette, fiches de qualification alignées. Même en-tête horizontal et même placement N0/N1.

**Pourquoi :** excellent pour comités d'architecture et ateliers mixtes. **Risque :** perdre la lisibilité analytique d'un grand ensemble sans mode compact.

### C — FIORI Analytique (alternative méthodologique)

Page Carte (lecture globale) → Fiche de capacité (qualification et relations) → Analyse (filtres, KPI, points d'attention) → revue/export de décisions. Contrôles et feedback uniformisés, workflow très explicite. L'habillage reprend les **tokens du projet**, pas nécessairement ceux de SAP.

**Pourquoi :** aide à industrialiser les parcours métier. **Risque :** une transposition littérale de Fiori ferait perdre la mosaïque et la navigation haute.

**Arbitrage proposé :** **A comme direction visuelle unique + méthodes de B/C**. Ne pas maintenir trois produits CSS concurrents. Éventuellement deux modes de densité et deux thèmes sur le **même** jeu de composants/tokens.

## 6. Maquette fonctionnelle cible (description)

**Ligne 1 — en-tête horizontal :** nom de cartographie, Cartographie / Analyse / Bibliothèque, Outils discrets, indicateur de sauvegarde et switch de Présentation ; pas de menu latéral permanent.

**Ligne 2 — intention de lecture :** `Applications | Couverture | Maturité | Écarts`, recherche/filtres réinitialisables, légende de la dimension active, actions « + Domaine », « + Application », « Inventaire SI » selon le contexte.

**Canevas — mosaïque bidimensionnelle :** N0 aux coordonnées/spans JSON exacts ; en-tête N0 coloré pour l'identité, cellules N1 toujours visibles ; titres/code, 1 ou 2 signaux lisibles, état inconnu « À évaluer », applications uniquement selon le mode. Ne pas transformer la mosaïque en liste uniforme.

**Fiche contextuelle — au clic seulement :** nom, description, couverture fonctionnelle, maturité actuelle/cible, justification, applications liées, questions et provenance ; fermeture sans changement de grille. Les statuts sont du texte et non uniquement du rouge/vert.

**Présentation — fenêtre dédiée :** même géométrie, légende et thème synchronisés, aucun élément d'édition ni survol clignotant ; prévoir une lecture « sans chrome » pour comité, un test impression/paysage et un zoom d'affichage si validé.

### Contrat de tokens recommandé (noms à valider en code)

- Fond/structure : `--color-bg`, `--color-surface`, `--color-surface-raised`, `--color-border`, `--color-text`, `--color-text-muted`.
- Interaction : `--color-accent`, `--color-focus`, `--color-accent-soft`, `--color-accent-on`.
- Cartographie : `--map-card-surface`, `--map-capability-border`, `--map-capability-text`, `--map-canvas-dot`.
- Métier : `--status-covered-*`, `--status-gap-*`, `--status-critical-*` ; ajouter des alias explicitement nommés `functional-none/partial/sufficient/unknown` si les états le requièrent, sans rebaptiser les priorités.
- Densité : tokens d'espacement et de taille `compact / comfortable` ; valeurs centralisées et jamais disséminées en nombres magiques.
- Éviter de conserver des hex locaux et des `!important` lorsque les composants partagés sont créés ; migrer écran par écran sous tests.

## 7. Écarts fonctionnels TOGAF — ne pas confondre déjà fait et opportunités

| Dimension | Existant vérifié | Opportunité raisonnée |
|---|---|---|
| Modèle de capacité N0/N1 | Oui, avec géométrie libre et relations applicatives | Profondeur N2/N3 **seulement si besoin réel** ; ne pas déstabiliser la carte |
| Couverture applicative | Relations et état actuel/cible | Qualité/criticité du support par relation, avec source et date, **pas déduite** |
| Couverture fonctionnelle | État déclaré 4 valeurs | Justification, propriétaire d'évaluation et date ; revue périodique |
| Maturité | Actuelle/cible 1–5 | Échelle rubricée par niveau et traçabilité de l'évaluation |
| Gap & redondance | Signaux déterministes et revue | Hiérarchiser par criticité/valeur *si et seulement si déclarées* |
| Décision | Questions classées, export Markdown, simulation de retrait | Dossier de décision contextualisé et comparaisons de scénarios versionnés |
| Stratégie/architecture | Capacités et applications | Liens explicites vers objectifs, value streams, processus, organisations et responsables |
| Roadmap | Applications « cible » possibles | Initiative, échéance et état futur avec dates explicites, pas une fausse chronologie |
| Gouvernance | JSON versionné et local | Historique d'évaluation, statut d'approbation, version et provenance dans JSON compatible |
| Restitution | Présentation multi-fenêtre et Dashboard | Export/print haute fidélité, légendes, vues décisionnelles enregistrées localement |

Les idées de droite ne sont **pas** des manques « TOGAF obligatoires » : elles répondent à un niveau croissant de gouvernance EA et doivent être validées par cas d'usage.

## 8. Lots de réalisation proposés

**Lot 0 — Contrat visuel & inventaire Storybook (P0).** Documenter tokens, contrastes, états et règles ; stories des primitives réelles Input, Select, Checkbox, Segmented, Buttons, Modal, Drawer, Feedback, Tooltip, Empty/Loading ; thèmes clair/sombre, clavier, validation, erreur, contenu long. Définir les critères de capture d'une mosaïque 6×3 avec N0 multi-spans et N1 ≥ 4. Pas de duplication HTML pour maquiller l'application.

**Lot 1 — Harmonisation transversale (P0).** Appliquer les primitives/tokens aux fenêtres d'édition et à l'analyse, puis bibliothèque, compagnon, modales. Reduire les `!important` progressivement ; ne pas modifier le domaine. Valider le thème et la navigation en continu.

**Lot 2 — Carte comme outil de lecture (P1).** Légende active, densité, filtres et sélection contextualisée ; N0 toujours en 2D, N1 visibles sans limite ; représentation du statut indépendante de la couleur de domaine.

**Lot 3 — Présentation & décisions (P1/P2).** Vérifier projeté, impression, lecture seule, zoom/densité utile ; relier visuellement constat → justification → action sans changement silencieux du modèle.

**Lot 4 — enrichissements TOGAF (P2, séparés).** Provenance des évaluations, criticité/valeur, value streams, plan de transformation, comparaison de scénarios avec gouvernance des données. Chaque champ nouveau nécessite validation/migration JSON et tests de domaine distincts.

### Critères d'acceptation obligatoires pour les PR de code

1. **Mosaïque identique** (identifiants, `columnId`, `layerId`, `columnSpan`, `rowSpan`) après changement de lecture, thème, inventaire, sauvegarde/rechargement et présentation.
2. **Aucun N1 masqué**, notamment avec 4 et plus par N0, desktop et mobile ; pas de glisser-déposer en présentation.
3. **Applications** : créer/modifier/lier/délier depuis les parcours existants, sans effet sur la couverture fonctionnelle déclarée.
4. **Couverture** : états `unknown/none/partial/sufficient` explicitement affichés, pas d'inférence depuis le nombre d'apps ; actuel/cible distingués.
5. **Accessibilité** : navigation clavier, focus visible, étiquettes reliées, fermeture de dialogs, réduction des mouvements, texte lisible ; tests automatisés **et** revue manuelle.
6. **Qualité** : stories des composants réellement utilisés ; captures visuelles approuvées et non mises à jour automatiquement en CI ; Playwright (parcours + présentation + responsive), Vitest, typecheck, build et workflows GitHub tous verts.
7. **Déploiement** : GitHub Pages/PWA, offline, localStorage/JSON V3 inchangés sauf lot explicitement migré. Aucun backend.
8. **Processus** : PR dédiée, analyse des échecs, documentation mise à jour, **ne jamais fusionner sans approbation explicite**.

## 9. Décisions et limites de cette étude

- **Décision recommandée** : conserver SIGNAL et la barre haute ; utiliser Carbon/Fiori/LeanIX comme références, sans imposer une nouvelle bibliothèque ou une nouvelle sémantique.
- **Décision à valider par démonstration** : priorité d'un thème clair « comité » vs dark « analyste », densité et éventuel zoom ; tester une vraie carte 6–8 colonnes, 4+ N1/domaines et le vidéoprojecteur.
- **Limite d'audit** : aucune mesure de contraste pixel par pixel, test utilisateur, mesure de performance ou inspection de rendu réel n'a été menée pour ce document. Les chiffres CSS sont indicatifs d'une dette de styles, pas un score qualité.
- **Nature de la PR** : **documentation seule**, pas de modification de CSS/React, pas de refonte ni de changement fonctionnel implicite.
