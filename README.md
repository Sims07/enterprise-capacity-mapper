# Enterprise Capacity Mapper

[![Deploy PWA to GitHub Pages](https://github.com/Sims07/enterprise-capacity-mapper/actions/workflows/deploy-pages.yml/badge.svg?branch=main)](https://github.com/Sims07/enterprise-capacity-mapper/actions/workflows/deploy-pages.yml)
[![Combined line coverage](https://img.shields.io/endpoint?url=https%3A%2F%2Fraw.githubusercontent.com%2FSims07%2Fenterprise-capacity-mapper%2Fmain%2Fbadges%2Fcoverage.json)](https://github.com/Sims07/enterprise-capacity-mapper/actions/workflows/deploy-pages.yml)
[![Latest release](https://img.shields.io/github/v/release/Sims07/enterprise-capacity-mapper?display_name=tag&sort=semver)](https://github.com/Sims07/enterprise-capacity-mapper/releases)
[![PWA](https://img.shields.io/badge/PWA-offline%20ready-5A0FC8?logo=pwa)](https://github.com/Sims07/enterprise-capacity-mapper)

Application PWA de cartographie des capacités métier et de leur couverture applicative.

## Architecture

L'application est conçue pour rester statique, déployable sur GitHub Pages et utilisable hors ligne comme PWA. Le modèle métier et les contrats de données sont indépendants du runtime React et de la persistance navigateur.

La cartographie suit le modèle :

`Domaine N0 → Capacité N1 → Application`

Une application peut couvrir plusieurs capacités et une capacité peut être couverte par plusieurs applications. Le modèle JSON actif utilise `schemaVersion: 3` et les migrations sont gérées par les services de persistance.

Les références d'architecture sont dans [`docs/architecture/`](docs/architecture/), notamment [`current-state.md`](docs/architecture/current-state.md), les ADR et le playbook de migration. Les conventions CSS et les tokens du design system sont décrits dans la section « Design system CSS » de [`current-state.md`](docs/architecture/current-state.md#8-design-system-css).

## Fonctionnalités

- cartographie TOGAF / capability mapping ;
- capacités N1 et applications associées ;
- analyse de couverture, gaps, redondances et impact ;
- gestion des relations ;
- création de cartographies avec assistant ;
- import/export JSON versionné ;
- bibliothèque locale et cartographies récentes ;
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

Le badge de couverture présente l’union des lignes exécutées par **Vitest et Playwright** (une ligne compte si l’une des deux suites l’exécute). La CI publie ce taux combiné après un pipeline réussi sur `main`. Le noyau domaine + application conserve séparément un seuil de **95 % de couverture ligne unitaire**, vérifié par Vitest.

Playwright utilise Chromium desktop et une configuration mobile 390×844 avec touch. Les tests E2E sont parallélisables et conservent les traces en cas d'échec.

Cypress a été remplacé par Playwright pour les tests E2E. La collecte de couverture Playwright repose sur un build instrumenté Istanbul dédié ; le build de production déployé n’est pas instrumenté.

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

Les rapports Vitest et Playwright sont conservés comme artefacts CI en cas de besoin de diagnostic. Le badge de couverture combinée s'appuie sur un endpoint Shields.io alimenté par `badges/coverage.json`. Les rapports Vitest et Playwright sont normalisés puis agrégés par `scripts/merge-line-coverage.mjs` ; le badge est actualisé automatiquement uniquement après le succès du pipeline sur `main`.

## Principes de contribution

- Une évolution fonctionnelle et ses tests évoluent dans la même PR.
- Les tests doivent être placés au niveau le plus bas qui apporte suffisamment de confiance.
- Un test E2E doit représenter un comportement utilisateur, pas un détail d'implémentation React.
- Les changements de schéma JSON sont versionnés et migrés explicitement.
- Toute migration technique se fait dans une PR dédiée et n'est jamais mergée sans autorisation explicite.
