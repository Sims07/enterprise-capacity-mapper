# Playbook de migration technologique

## 1. Objectif

Ce playbook est la procédure de référence lorsqu'une technologie structurante change : React, Vite, PWA, navigateur, Electron, stockage local, hébergement ou fournisseur de données.

La règle est simple : **une migration technique ne doit pas devenir une migration métier par accident.**

## 2. Phase 0 — cadrage

Créer une PR dédiée et documenter :

- technologie source ;
- technologie cible ;
- motivation ;
- périmètre ;
- fonctionnalités hors périmètre ;
- stratégie de coexistence ;
- stratégie de retour arrière ;
- données concernées ;
- contraintes sécurité/offline/distribution ;
- critères de succès.

Créer ou mettre à jour un ADR avant toute décision irréversible.

## 3. Phase 1 — inventaire des dépendances

Classer chaque dépendance dans quatre catégories :

| Catégorie | Exemple | Traitement |
|---|---|---|
| Métier | relation N1 → application | conserver |
| Contrat de données | `schemaVersion`, import/export | conserver/versionner |
| Plateforme | LocalStorage, service worker | adapter/remplacer |
| Présentation | React, CSS, composants | migrer avec oracle E2E |

Produire un tableau des dépendances avant de coder.

## 4. Phase 2 — figer les invariants

Avant la première modification, vérifier au minimum :

- `npm run build` ;
- `npm run test:unit` ;
- `npm run test:e2e` ;
- import d'une cartographie représentative ;
- export puis réimport ;
- création/modification/suppression d'éléments ;
- relations applicatives ;
- profondeur 1 et profondeur 2 ;
- undo/redo ;
- bibliothèque locale ;
- mode sombre ;
- fonctionnement sous le base path GitHub Pages ;
- PWA/offline si le scénario reste dans le périmètre.

Si un test échoue avant migration, **ne pas attribuer l'échec à la migration**. Diagnostiquer d'abord l'état de référence.

## 5. Phase 3 — extraction des contrats

Identifier les contrats suivants :

1. `CartographyModel` : modèle métier versionné ;
2. `StoragePort` : persistance ;
3. `FilePort` : import/export ;
4. `RemoteSourcePort` : lecture de références distantes ;
5. `AiProviderPort` : fournisseurs conversationnels ;
6. `RuntimePort` : capacités spécifiques à la plateforme, uniquement si nécessaire.

Ne pas créer une abstraction uniquement pour faire « propre ». Un port est justifié lorsqu'il permet une implémentation alternative, un test fiable ou une frontière de migration.

## 6. Phase 4 — migration par tranches verticales

Migrer dans cet ordre recommandé :

### Tranche A — noyau de données

Faire fonctionner le modèle, validation, normalisation et migrations sans UI.

### Tranche B — persistance

Ajouter l'adaptateur cible tout en conservant l'ancien adaptateur comme référence temporaire.

### Tranche C — import/export

Vérifier que les fichiers historiques restent lisibles et que les nouveaux exports restent conformes au contrat.

### Tranche D — règles métier

Déplacer les règles indépendantes de l'UI hors des composants lorsque cela réduit réellement le couplage.

### Tranche E — UI

Migrer un parcours complet à la fois : ouverture → modification → sauvegarde → vérification.

### Tranche F — intégrations plateforme

Migrer PWA, filesystem, notifications, raccourcis, distribution ou intégrations OS séparément.

## 7. Scénario React → Electron

### Option recommandée : ajout d'Electron comme shell

1. conserver le modèle JSON ;
2. conserver React dans le renderer ;
3. conserver les règles métier ;
4. conserver les tests d'acceptance ;
5. ajouter Electron ;
6. définir une API preload minimale ;
7. déplacer les accès filesystem/OS derrière cette API ;
8. remplacer progressivement le stockage si nécessaire ;
9. vérifier l'équivalence avec la version Web.

Cette étape permet d'obtenir une application installable sans prendre simultanément le risque d'une réécriture UI.

### Si React doit aussi être remplacé

Ne pas commencer par les écrans. Commencer par :

1. modèle ;
2. règles ;
3. ports ;
4. tests d'acceptance ;
5. adaptation d'un parcours vertical ;
6. migration des autres parcours.

## 8. Stratégie de données sans régression

Une migration de stockage doit suivre :

```text
ancienne donnée
   ↓
lecture legacy
   ↓
validation
   ↓
migration de schéma
   ↓
normalisation
   ↓
modèle canonique
   ↓
nouveau stockage
```

Ne jamais faire dépendre la nouvelle application du format interne de l'ancien stockage si ce format n'est pas le contrat public.

### Compatibilité

- Les anciennes versions doivent rester importables tant que la politique produit le demande.
- Chaque changement de schéma doit avoir une fonction de migration explicite et testée.
- Les exports doivent rester lisibles par une version précédente lorsque cela est raisonnablement possible ; sinon, documenter la rupture et fournir un convertisseur.
- Les IDs métier doivent rester stables pendant une migration technique.

## 9. Tests de non-régression

### Niveau 1 — tests du noyau

Tester validation, normalisation, migrations et règles métier sans UI.

### Niveau 2 — tests d'intégration

Tester chaque adaptateur avec son contrat : LocalStorage, fichier, HTTP, Electron, etc.

### Niveau 3 — E2E / acceptance

Tester les parcours utilisateur, sans dépendre de classes CSS ou de détails React.

Exemples :

- « je crée une cartographie » ;
- « j'ajoute un domaine et une capacité » ;
- « je relie une application à une capacité » ;
- « j'exporte puis réimporte » ;
- « je ferme puis rouvre l'application et retrouve ma carte » ;
- « je passe en profondeur 1 et les relations restent cohérentes ».

### Niveau 4 — tests de migration

Pour un corpus de cartographies réelles ou fixtures :

```text
fixture ancienne version
→ migration
→ validation
→ export canonique
→ comparaison sémantique
```

Comparer le sens du modèle, pas l'ordre accidentel des propriétés JSON.

## 10. Oracle de migration

Pour chaque fonctionnalité critique, définir :

- entrée ;
- action ;
- état attendu ;
- données attendues ;
- résultat visuel attendu si pertinent ;
- résultat exporté attendu.

Un oracle doit être stable même si le composant, le framework ou le runtime change.

## 11. Vérification spécifique Electron

Si Electron est introduit, vérifier en plus :

- isolation du renderer ;
- absence d'accès Node arbitraire depuis l'UI ;
- `contextIsolation` activé ;
- API preload minimale et explicitement documentée ;
- validation des arguments transmis au processus principal ;
- gestion des fichiers uniquement via des commandes contrôlées ;
- absence de secrets dans le renderer ;
- comportement offline ;
- installation/mise à jour ;
- compatibilité Windows/macOS/Linux selon le périmètre.

## 12. Validation finale

Une migration est prête uniquement si :

- tous les invariants métier sont verts ;
- les données historiques représentatives sont migrées ;
- les parcours E2E critiques sont verts ;
- les tests spécifiques à la nouvelle plateforme sont verts ;
- les performances et l'accessibilité restent acceptables ;
- les limitations connues sont documentées ;
- un plan de rollback existe ;
- la documentation d'architecture et les ADR sont à jour.

## 13. Décommissionnement

Ne supprimer l'ancien runtime/adaptateur qu'après :

- période de coexistence ou validation équivalente ;
- confirmation des migrations de données ;
- confirmation des exports ;
- vérification des parcours critiques ;
- décision explicite dans un ADR.

La suppression est une étape distincte de l'introduction du nouveau runtime.
