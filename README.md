# Enterprise Capacity Mapper

Application PWA de cartographie des capacités métier et de leur couverture applicative.

## Cible d'architecture

- **Frontend** : React + Vite, statique et compatible GitHub Pages.
- **PWA** : manifest + service worker + cache offline.
- **Données locales** : LocalStorage V2 par défaut, avec migration automatique des anciennes clés `ea_canvas_*`.
- **Échange** : import/export JSON versionné (`schemaVersion: 2`).
- **Modèle** : Domaines L0 → Capacités L1 → Applications, avec une relation application-capacité **N↔N**.
- **Analyse d'impact** : capacités sollicitées, applications impactées, gaps et redondances.
- **Déploiement** : GitHub Actions → GitHub Pages.
- **Backend** : aucun backend requis.

## Développement local

```bash
npm install
npm run dev
```

Production :

```bash
npm run build
npm run preview
```

## Données

Le modèle est stocké sous la clé `enterprise-capacity-mapper:model:v2`.

Le JSON exporté peut être versionné dans un dépôt GitHub ou partagé entre environnements. L'application ne met volontairement **aucun token GitHub permanent dans le navigateur** : une écriture authentifiée dans un dépôt devra passer par un mécanisme d'authentification explicite ou un backend de confiance.

## GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` construit automatiquement l'application à chaque push sur `main`.

Dans GitHub : **Settings → Pages → Source: GitHub Actions**.

## Évolution prévue

1. Provider de stockage interchangeable (LocalStorage / IndexedDB / JSON distant).
2. Configuration d'une source JSON publique dans un dépôt.
3. Authentification GitHub explicite pour le mode collaboratif.
4. Tests du modèle et de l'analyse d'impact.
5. Versionnement/migrations de schéma supplémentaires.

## Licence

MIT.
