# Architecture actuelle — Enterprise Capacity Mapper

> Référence de départ pour toute évolution technique ou migration. Ce document décrit les faits observables du dépôt ; il ne constitue pas une cible technologique.

## 1. Vue d'ensemble

Enterprise Capacity Mapper est une application de cartographie de capacités métier conçue pour rester :

- statique et déployable sur GitHub Pages ;
- utilisable hors ligne comme PWA ;
- sans backend ni base de données pour le fonctionnement nominal ;
- centrée sur un modèle de cartographie JSON versionné ;
- testable par Cypress E2E et par des tests Node pour les règles déterministes.

La stack actuelle est React + Vite, avec `react-dom`, Vite et Cypress. Les commandes de référence sont `npm run build`, `npm run test:e2e` et `npm run test:unit`.

## 2. Cartographie des responsabilités

| Responsabilité | Implémentation actuelle | Ce qui doit rester stable |
|---|---|---|
| Bootstrap navigateur | `src/main.jsx` | Point d'entrée et initialisation PWA doivent rester remplaçables |
| Orchestration UI | `src/App.jsx` | Parcours et règles métier observables |
| Composants d'interface | `src/components/` | Contrats fonctionnels et accessibilité |
| Modèle de démonstration | `src/data/demoData.js` | Aucun rôle d'infrastructure |
| Persistance / import / export | `src/services/storage.js` | Contrat de stockage et migrations de schéma |
| Analyse déterministe | `src/services/ai/cartographyAnalysis.js` | Entrée/sortie JSON et absence de mutation |
| Fournisseurs IA | `src/services/ai/` | Contrats d'adaptation, séparation local/cloud |
| Présentation | `src/styles/` | Tokens sémantiques et comportement visuel |
| Tests de comportement | `cypress/e2e/` | Parcours utilisateur critiques |
| Déploiement | `.github/workflows/` | Build statique, base path GitHub Pages, publication |
| PWA | `public/` + bootstrap | Manifest, service worker, cache/offline |

## 3. Modèle métier invariant

La sémantique métier est indépendante de React :

`Domaine N0 → Capacité N1 → Application`

Une cartographie peut également être configurée en profondeur 1 :

`Domaine N0 → Application`

Les relations applicatives restent explicites. Une application peut couvrir plusieurs cibles et une cible peut être couverte par plusieurs applications.

Les concepts Gap, Redundancy, Impact et Coverage sont des concepts fonctionnels ; ils ne doivent pas être déduits de la technologie de présentation.

## 4. Contrat de données

Le modèle actif utilise actuellement `schemaVersion: 3`. `storage.js` assure :

- lecture de la clé LocalStorage du modèle actif ;
- migration des modèles v2 et des anciennes clés `ea_canvas_*` ;
- normalisation du modèle ;
- validation des références entre domaines, capacités et applications ;
- gestion de la bibliothèque locale et des cartes récentes ;
- import/export JSON ;
- chargement optionnel d'un JSON distant HTTPS ;
- normalisation d'une URL GitHub `blob` vers son contenu `raw`.

Ce contrat de données est la principale frontière de migration. Une nouvelle technologie ne doit pas lire directement les détails de LocalStorage si elle peut consommer un adaptateur de stockage respectant le contrat du modèle.

## 5. État et persistance

Les préférences et l'état applicatif local utilisent actuellement LocalStorage. Cela comprend notamment le modèle, la bibliothèque locale, les cartes récentes, le thème et la configuration de certaines fonctions.

Le dépôt autorise une source JSON distante pour les données partagées/publiées. Cette source est volontairement distincte de la persistance locale.

**Conséquence pour une migration :** LocalStorage n'est pas le modèle métier. C'est une implémentation d'un mécanisme de persistance. Electron, IndexedDB, un fichier local, une API ou une autre technologie pourront remplacer cet adaptateur sans redéfinir la sémantique du modèle.

## 6. Tests et oracle comportemental

Les tests Cypress couvrent de nombreux parcours visibles : chargement, création, relations, import/export, compagnon IA, dashboard et thèmes. Des tests unitaires Node couvrent les règles déterministes du compagnon.

La suite E2E doit être considérée comme un **oracle comportemental** : lors d'une migration, on cherche à conserver les comportements attendus, pas les sélecteurs, composants ou détails d'implémentation React.

Les assertions fragiles sur les valeurs RGB/RGBA ne font pas partie du contrat de migration. Les tests doivent privilégier les rôles, textes utiles, états accessibles et effets visibles.

## 7. Dépendances technologiques à isoler

Les dépendances suivantes sont explicitement liées à la plateforme actuelle :

- React / `react-dom` : rendu et cycle de vie UI ;
- Vite : bundling et serveur de développement ;
- Browser APIs : `localStorage`, `fetch`, `Blob`, `URL`, événements clavier/souris ;
- service worker / manifest : installation et cache PWA ;
- GitHub Pages : hébergement statique et base path ;
- Cypress : exécution des scénarios E2E.

Lors d'une migration, chacune doit être classée comme :

1. **à conserver** parce qu'elle porte un besoin métier ou un contrat utilisateur ;
2. **à adapter** parce qu'elle dépend du runtime ;
3. **à remplacer** parce qu'elle appartient à la plateforme ;
4. **à supprimer** parce qu'elle n'est plus nécessaire.

## 8. Zones de couplage actuelles à surveiller

### `App.jsx`

Le composant principal concentre encore beaucoup d'orchestration, d'état, de formulaires et de comportements. C'est le principal point de couplage avec React. Une migration UI ou runtime importante devra éviter de reproduire ce couplage dans la nouvelle plateforme.

### `storage.js`

La frontière existe déjà, mais elle regroupe à la fois modèle, migration, validation, persistance et import/export. C'est une bonne frontière fonctionnelle mais elle pourra être découpée progressivement si une migration le justifie.

### Browser APIs

Le code utilise directement plusieurs API navigateur. Elles doivent être identifiées dans toute migration vers Electron : certaines restent disponibles dans le renderer Chromium, tandis que les accès système (fichiers, OS, intégration poste) doivent passer par une frontière Electron contrôlée plutôt que d'être injectés partout dans l'UI.

## 9. Ce qui n'est pas un objectif de migration

Une migration ne doit pas modifier implicitement :

- la sémantique TOGAF / capability mapping ;
- la structure logique N0/N1/Application ;
- les règles de couverture et de relations ;
- le format d'import/export sans plan de compatibilité ;
- les règles de validation ;
- les comportements critiques couverts par Cypress ;
- les garanties de confidentialité du compagnon IA ;
- la capacité à récupérer une cartographie existante.

Toute modification de ces éléments est une évolution fonctionnelle distincte et doit être traitée comme telle.
