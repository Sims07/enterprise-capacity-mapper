# Enterprise Capacity Mapper

[![Deploy PWA to GitHub Pages](https://github.com/Sims07/enterprise-capacity-mapper/actions/workflows/deploy-pages.yml/badge.svg?branch=main)](https://github.com/Sims07/enterprise-capacity-mapper/actions/workflows/deploy-pages.yml)
[![Unit/integration line coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FSims07%2Fenterprise-capacity-mapper%2Fmain%2Fbadges%2Fcoverage.json)](https://github.com/Sims07/enterprise-capacity-mapper/actions/workflows/deploy-pages.yml)
[![Latest release](https://img.shields.io/github/v/release/Sims07/enterprise-capacity-mapper?display_name=tag&sort=semver)](https://github.com/Sims07/enterprise-capacity-mapper/releases)
[![PWA](https://img.shields.io/badge/PWA-offline%20ready-5A0FC8?logo=pwa)](https://github.com/Sims07/enterprise-capacity-mapper)

Application PWA de cartographie des capacités métier et de leur couverture applicative.

## Storybook

Consultez le [Storybook](https://sims07.github.io/enterprise-capacity-mapper/storybook/) : formulaires, inputs, dropdowns, boutons, navigation, menus, pop-ups, messages, tokens et composants métier en thèmes clair/sombre. [Inventaire et scénarios de test](docs/storybook-poc.md).

## Rôle des applications dans une capacité (existant / cible)

Le **cycle de vie** d'une application (active, planifiée ou obsolète) est indépendant de sa contribution à chaque capacité N1. Dans **Relier…**, chaque relation peut être qualifiée « Actuelle », « Cible » ou « Actuelle et cible ». Une application conservée dans la trajectoire peut apparaître dans les deux listes sans être comptée deux fois dans le total des applications liées. La vue présentation, le Dashboard et les processus métier utilisent les mêmes rôles.

Dans la fenêtre **Relier des applications à une capacité**, les applications déjà rattachées sont affichées en premier, puis les autres, avec tri alphabétique dans chaque groupe. Les cases cochées et leur rôle sont mis en évidence ; la recherche couvre toujours les deux groupes. Le classement repose sur les liens enregistrés pour ne pas déplacer une ligne pendant sa modification. Les libellés utilisent les couleurs sémantiques du design system dans les deux thèmes.

**Compatibilité** : les JSON V3 existants restent valides. En l'absence de rôle explicite, l'ancien statut `Cible` est interprété comme « Cible uniquement », les autres statuts comme « Actuelle ». Une modification ultérieure du cycle de vie préserve les contributions déjà déclarées. Les rôles supplémentaires sont stockés dans l'objet facultatif `relationRoles`, indexé par l'identifiant de capacité (ou de domaine pour une carte N0). Aucun stockage distant n'est nécessaire.

## Design system Signal

L'interface Signal conserve la **navigation haute**, la cartographie matricielle N0/N1 avec ses spans de lignes et de colonnes, et toutes les fonctions de gestion des applications. Le bouton **Cartographie SI** ouvre directement l'inventaire des applications. Le bouton **+ Application** se trouve dans ce panneau, au même endroit que la recherche, l'édition et l'action **Relier à…** pour associer une application à une capacité. L'inventaire s'ouvre directement **en panneau latéral pleine hauteur**, sans bouton de redimensionnement. Son en-tête (nom, action **+ Application**, recherche et sélection) reste fixe : **seule la liste des applications défile**. La cartographie conserve sa lisibilité en réservant la largeur du panneau sur ordinateur ; sur mobile, il occupe l'écran. La croix ferme l'inventaire.

**Cartographie compacte par défaut** — les N1 s'affichent à hauteur adaptée au contenu. Un N0 suffisamment large présente jusqu'à **deux N1 côte à côte** ; les N0 étroits et l'affichage mobile conservent une colonne. Toutes les applications associées restent visibles et modifiables. Le menu « Affichage » et l'ancien choix de densité ont été supprimés : les préférences locales historiques ne sont plus utilisées. La structure N0, les spans et le mode présentation sont inchangés.

Le **mode présentation** est une fenêtre distincte en lecture seule, synchronisée avec l'éditeur. Les surfaces de la présentation reprennent les tokens du thème Signal.

- [Application sur GitHub Pages](https://sims07.github.io/enterprise-capacity-mapper/)
- [Catalogue Storybook](https://sims07.github.io/enterprise-capacity-mapper/storybook/)
- [Choix de conception et scénarios de non-régression](docs/design/client-design-system-directions.md)

Pour vérifier les couleurs, utiliser **Outils → Thème sombre Signal** ; le thème clair reste disponible. La PWA fonctionne avec les données locales et le JSON versionné, sans service tiers.

## Architecture

L'application est conçue pour rester statique, déployable sur GitHub Pages et utilisable hors ligne comme PWA. Le modèle métier et les contrats de données sont indépendants du runtime React et de la persistance navigateur.

La cartographie suit le modèle :

`Domaine N0 → Capacité N1 → Application`

Une application peut couvrir plusieurs capacités et une capacité peut être couverte par plusieurs applications. Le modèle JSON actif utilise `schemaVersion: 3` et les migrations sont gérées par les services de persistance.

Les références d'architecture sont dans [`docs/architecture/`](docs/architecture/), notamment [`current-state.md`](docs/architecture/current-state.md), les ADR et le playbook de migration. Les conventions CSS et les tokens du design system sont décrits dans la section « Design system CSS » de [`current-state.md`](docs/architecture/current-state.md#8-design-system-css).

## Fonctionnalités

En mode mosaïque, une carte N0 se déplace par glisser-déposer vers une zone de la grille. Pour la redimensionner, faites glisser son bord droit ou inférieur, ou utilisez les flèches du clavier lorsque la carte a le focus. Les placements et dimensions sont enregistrés dans la cartographie ; les chevauchements et dépassements de la grille restent refusés. Un glissement de réduction trop important est ramené à **une colonne / une ligne minimum**, exactement comme l'aperçu ; le redimensionnement au clavier utilise les mêmes limites. Dans **Structure**, chaque axe peut être ajouté à la fin ou **inséré avant** une colonne/ligne existante. L'insertion au milieu d'un N0 étendu agrandit son `columnSpan`/`rowSpan` pour préserver sa couverture initiale ; une colonne/ligne encore occupée par un N0 ne peut pas être supprimée sans déplacer ou réduire d'abord ce dernier. Lorsqu'un déplacement est annulé ou interrompu, l'aperçu temporaire est automatiquement nettoyé : la carte réapparaît immédiatement à la position de son modèle, sans rechargement.

- mode présentation de la mosaïque, avec des cartes compactes, des contours colorés et une composition paysage sans pistes vides;

- cartographie TOGAF / capability mapping ;
- intitulés des axes de matrice affichables ou masquables indépendamment ;
- éditeur de structure large et responsive : colonnes et lignes côte à côte sur ordinateur, insertions/suppressions contextuelles, zones de matrice repliables et commandes de validation toujours accessibles ;
- matrices larges et mosaïques optimisées pour les cartographies multi-colonnes ;
- ajout et insertion d’un domaine N0 sur une cartographie existante : le formulaire permet de choisir « Insérer avant… » un N0, en repositionnant les domaines suivants sans changer leurs capacités ni leurs applications ; une ligne est ajoutée uniquement en cas de besoin, et l’annulation conserve la carte intacte ;
- capacités N1 et applications associées ;
- analyse de couverture, gaps, redondances et impact ;
- gestion des relations ;
- création de cartographies avec assistant ;
- import/export JSON versionné ;
- bibliothèque locale et cartographies récentes ;
  - bibliothèque compacte : sauvegardes triées par date de dernière modification et récents par date de dernière ouverture (plus récent en premier) ; repères verts « Versions conservées » versus indigo « Historique d’ouverture », boutons « Charger » et « Reprendre », et retrait de l’historique sans effacement d’une sauvegarde ;
- historique annuler/rétablir ;
- compagnon IA local/configurable ;
- thème clair/sombre ;
- responsive mobile ;
- PWA avec fonctionnement hors ligne après chargement préalable.

## Structure du dépôt

```text
.
├── .github/workflows/       # CI, contrôles et déploiement GitHub Pages
├── docs/                    # Architecture, tests, décisions et documentation
├── playwright/e2e/          # Parcours E2E navigateur Playwright
├── public/                  # Manifest, icônes et service worker PWA
├── src/
│   ├── adapters/            # Adaptateurs plateforme / fournisseurs
│   ├── application/         # Cas d'usage
│   ├── components/          # Composants React
│   ├── data/                # Modèle de démonstration
│   ├── domain/              # Modèle métier et règles
│   ├── ports/               # Contrats d'architecture
│   ├── services/            # Persistance et services applicatifs
│   └── styles/              # Styles et tokens
├── playwright.config.ts
├── vitest.config.ts
├── package.json
└── vite.config.ts
```

## Pyramide de tests

La suite privilégie les tests rapides et garde le navigateur pour les comportements qui en ont réellement besoin :

1. **Vitest / unitaires** — domaine, application, règles métier, invariants, migrations et transitions pures.
2. **Tests de contrats / adaptateurs** — frontières de persistance, navigation, préférences et fournisseurs.
3. **Playwright / E2E** — parcours utilisateur critiques, UI réelle, persistance navigateur, import/export, responsive et PWA.

Le badge de couverture mesure les lignes exécutées par **Vitest dans le code non-UI** (domaine, application, services et adaptateurs). Les écrans React (`App.tsx`, composants et adaptateurs de composition React) sont exclus de ce dénominateur unitaire et restent validés par Playwright. La CI impose au moins **80 % de couverture ligne unitaire/intégration** sur ce périmètre et **95 %** sur le noyau domaine + application. La couverture navigateur Playwright est mesurée et publiée séparément comme indicateur de diagnostic ; les pourcentages unitaires et E2E ne sont pas additionnés.

Playwright utilise Chromium desktop et une configuration mobile 390×844 avec touch. Les tests E2E sont parallélisables et conservent les traces en cas d'échec.

Cypress a été remplacé par Playwright pour les tests E2E. La collecte de couverture Playwright repose sur un build instrumenté Istanbul dédié ; le build de production déployé n’est pas instrumenté.

## Version de Node.js et GitHub Actions

Le projet utilise **Node.js 24** pour le développement, les tests, la compilation PWA, Storybook et les releases. Le fichier `.nvmrc` est la référence commune pour les workflows GitHub Actions : sur un poste utilisant `nvm`, exécuter `nvm install` puis `nvm use` avant `npm install`.

Les actions GitHub embarquent leur propre runtime Node, distinct de la version qui compile l'application. Les workflows utilisent les versions d'actions compatibles Node 24 (`checkout@v5`, `setup-node@v5`, `upload-artifact@v7`, `upload-pages-artifact@v5` et `deploy-pages@v5`). Dependabot surveille uniquement les actions GitHub chaque semaine ; ses PR doivent passer la CI avant toute fusion. L'application déployée reste une PWA statique et ne nécessite aucun serveur Node.

## Commandes de développement

Installer les dépendances :

```bash
npm install
```

Développement :

```bash
npm run dev
```

Build et prévisualisation :

```bash
npm run build
npm run preview
```

Typecheck :

```bash
npm run typecheck
```

Tests unitaires :

```bash
npm run test:unit
```

Couverture :

```bash
npm run test:unit:coverage
npm run test:unit:coverage:core
npm run test:e2e:playwright
```

E2E :

```bash
npm run test:e2e
```

Débogage Playwright :

```bash
npx playwright test --debug
npx playwright show-report
```

## CI et déploiement

GitHub Actions vérifie successivement le typecheck, les tests Vitest, la couverture V8, le seuil domaine/application, le build puis la suite Playwright desktop/mobile. Le déploiement GitHub Pages n'est effectué que lorsque les validations nécessaires passent.

Les rapports Vitest et Playwright sont conservés comme artefacts CI en cas de besoin de diagnostic. Le badge de couverture unitaire/intégration s'appuie sur un endpoint Shields.io alimenté par `badges/coverage.json`. Le rapport de couverture Playwright est conservé séparément dans les artefacts CI pour analyser les parcours navigateur. Le badge est actualisé automatiquement uniquement après le succès du pipeline sur `main`.

## Principes de contribution

- Une évolution fonctionnelle et ses tests évoluent dans la même PR.
- Les tests doivent être placés au niveau le plus bas qui apporte suffisamment de confiance.
- Un test E2E doit représenter un comportement utilisateur, pas un détail d'implémentation React.
- Les changements de schéma JSON sont versionnés et migrés explicitement.
- Toute migration technique se fait dans une PR dédiée et n'est jamais mergée sans autorisation explicite.


### PWA GitHub Pages — récupération d'un bundle JS 404

Si une ancienne page ouverte tente de charger un ancien `assets/app-<hash>.js` supprimé pendant un déploiement GitHub Pages, le navigateur peut afficher `Failed to load resource: 404`. La PR #220 a déjà empêché les navigations d'utiliser un `index.html` périmé dans le cache HTTP, mais cela ne conservait pas les anciens bundles des onglets encore ouverts.

**Mise à jour depuis Outils.** Le bouton « Mettre à jour » active la version PWA déjà prête, puis recharge la page après activation du service worker. Si le navigateur ne signale pas le changement de contrôleur, l’activation du worker déclenche également le rechargement. Si rien ne se produit après 15 secondes, le message d’installation est remplacé par une erreur explicite et le bouton redevient utilisable pour réessayer. Un worker devenu obsolète invite à recharger la page. Le mécanisme ne vide ni le stockage local des cartographies ni le cache PWA. Les scénarios d’activation, d’échec et de délai dépassé sont couverts par `playwright/e2e/pwa-update.spec.ts`.

Le service worker précharge désormais la liste des JS/CSS **issus du même build** (`pwa-assets.json`) avant activation et conserve les caches des deux versions précédentes. Le bootstrap HTML détecte un échec d'import de module JavaScript, fait **une seule** actualisation contournant le cache, puis affiche une action de reprise si le problème persiste. Les cartographies restent stockées localement et ne sont pas supprimées par ce mécanisme.

En CI, `node scripts/verify-pwa-bundles.mjs dist` contrôle que tous les bundles référencés sont effectivement présents. Un E2E simule explicitement un `app-<hash>.js` supprimé. Un 404 lié à une autre URL (image externe, requête IA, etc.) doit être diagnostiqué à partir de l'URL exacte de la requête dans l'onglet Réseau ; il ne doit pas déclencher une purge générale des données locales.

### Analyse des risques

La vue présente d'abord **une application à examiner**, puis des raccourcis actifs (risques élevés, à qualifier, échéances, acceptés) ; l'exploration par domaine et par capacité est facultative. [Mode d'emploi des parcours guidés](docs/analysis-guided-review.md).

Dans **Analyse → Analyser les risques**, qualifiez le risque principal de chaque application actuelle : probabilité et impact métier (1–5), catégorie, justification, fin de support, responsable, décision et plan d’action. Les domaines affichent l’exposition maximale de leurs applications ; les capacités concernées permettent d’ouvrir les relations. Les filtres isolent les risques élevés, données à qualifier et échéances dépassées. L’export Markdown respecte les filtres actifs.

Le score est le produit probabilité × impact : faible 1–4, modéré 5–9, élevé 10–16, critique 17–25. Une fin de support atteinte impose au moins un niveau élevé ; une fin dans les 180 jours impose au moins un niveau modéré. Cette grille est propre à l’application, inspirée de la traçabilité et du suivi de traitement de SAP LeanIX ; elle ne reproduit pas son algorithme propriétaire. Les applications Cible sont exclues du périmètre actuel. Un risque accepté demeure visible ; sa date de réexamen dépassée le ramène parmi les risques à traiter. La résolution exige une action documentée et retire le risque de l’exposition agrégée. Une information absente n’est jamais interprétée comme une absence de risque.

Les évaluations sont facultatives pour les anciens modèles JSON v3, validées à l’import et conservées par la sauvegarde locale, l’historique et l’export JSON. La fin de support est saisie à l’échelle de l’application : il n’y a pas encore d’inventaire de composants techniques, de flux CVE ou de synchronisation avec un catalogue éditeur. Une évaluation représente le risque principal d’une application, pas un registre de multiples risques par actif.

Références : [SAP LeanIX — Obsolescence Risk Management](https://help.sap.com/docs/leanix/ea/obsolescence-risk-management), [statuts et vues de risque](https://help.sap.com/docs/leanix/ea/technology-obsolescence-risk-statuses-and-views-in-reports). Le composant interactif est disponible dans Storybook → Application → Modules métier → Analyse des risques.

### Processus métier et capacités

La vue présente d'abord **l'action suivante** : créer le premier processus, rattacher un processus sans capacité ou vérifier son exposition indirecte. Les indicateurs filtrent le registre. [Mode d'emploi des parcours guidés](docs/analysis-guided-review.md).

Dans **Analyse → Processus métier**, ajoutez les processus métier, leur code, responsable, description et un lien vers une procédure ou un diagramme (HTTP/HTTPS). Sélectionnez une ou plusieurs capacités N1, ou des domaines N0 dans une cartographie à un seul niveau. Une capacité peut participer à plusieurs processus. Un processus sans rattachement reste visible dans le filtre **À rattacher** ; le filtre par capacité permet de retrouver les processus qui la mobilisent.

Une capacité décrit **ce que** l’entreprise sait faire ; un processus décrit **comment** le travail se déroule. Le registre garde les relations directes capacités–applications. Il déduit les applications associées aux capacités d’un processus et signale son **exposition indirecte** aux risques applicatifs élevés ou critiques non résolus, y compris acceptés. Cette déduction ne prouve ni l’utilisation directe d’une application dans le processus ni la couverture fonctionnelle du processus. Les applications Cible sont comptées séparément.

Les processus et leurs rattachements sont conservés dans le champ facultatif `businessProcesses` du JSON v3, dans la sauvegarde locale, l’historique et les exports/imports existants. Une suppression de capacité ou de domaine retire uniquement les liens correspondants : le processus reste disponible pour être rattaché à nouveau. Une nouvelle cartographie commence sans processus de la précédente. La suppression d’un processus demande une confirmation et conserve les capacités et applications.

Ce premier registre ne remplace pas un éditeur BPMN : les séquences détaillées, la hiérarchie de sous-processus et la synchronisation avec SAP Signavio ne sont pas modélisées. Les diagrammes existants peuvent être référencés par leur lien de documentation. Références : [SAP LeanIX — capacités et processus](https://help.sap.com/docs/leanix/ea/business-capability-modeling-guidelines), [relations directes et contexte métier](https://help.sap.com/docs/leanix/ea/add-relations). Scénario interactif : Storybook → Application → Modules métier → Processus métier.
