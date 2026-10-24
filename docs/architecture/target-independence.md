# Architecture cible d'indépendance technologique

## But

Ce document définit les frontières qui permettent de remplacer React, Vite, le navigateur ou le mode de déploiement sans réécrire le métier.

Le principe directeur est : **le modèle de cartographie et ses règles sont le noyau ; l'UI, le stockage et le runtime sont des adaptateurs.**

## 1. Couches recommandées

```text
┌─────────────────────────────────────────────┐
│ Experience / UI                             │
│ React Web / Electron / autre renderer       │
├─────────────────────────────────────────────┤
│ Application orchestration                   │
│ use cases, commands, navigation, state       │
├─────────────────────────────────────────────┤
│ Domain / mapping model                      │
│ N0, N1, Applications, relations, analyses  │
├─────────────────────────────────────────────┤
│ Ports                                       │
│ Storage · File · Remote JSON · AI · Clock   │
├─────────────────────────────────────────────┤
│ Adapters                                    │
│ LocalStorage · IndexedDB · FS · HTTP · etc. │
└─────────────────────────────────────────────┘
```

Il ne s'agit pas de demander immédiatement une réécriture en Clean Architecture. Ces frontières servent surtout de **contrat de migration**. Elles peuvent rester sous forme de quelques fichiers cohérents tant qu'il n'existe pas de bénéfice concret à les multiplier.

## 2. Noyau métier

Le noyau doit idéalement pouvoir fonctionner sans DOM, React, Electron, `window`, `document` ou `localStorage`.

Il contient :

- structures du modèle ;
- validation ;
- normalisation ;
- migrations de schéma ;
- règles de relation ;
- calculs de couverture, gaps, redondances et impacts ;
- analyse déterministe ;
- commandes métier pures lorsque cela apporte un bénéfice de test.

Un test du noyau doit pouvoir être exécuté par Node sans navigateur.

## 3. Ports de plateforme

### StoragePort

Contrat conceptuel :

```text
loadActiveModel() -> Model
saveActiveModel(Model)
loadMapCollection() -> Map[]
saveMap(Map)
loadRecentMaps() -> Map[]
recordRecentMap(Map)
```

L'implémentation actuelle utilise LocalStorage. Une future implémentation pourrait utiliser IndexedDB, un fichier JSON Electron ou une API distante.

### FilePort

```text
importModel(source) -> Model
exportModel(Model) -> Artifact
```

Dans le navigateur, l'import/export passe par les APIs Web. Dans Electron, il pourra utiliser une boîte de dialogue et le système de fichiers via une API sécurisée du preload/main process.

### RemoteSourcePort

```text
loadReferenceModel(source) -> Model
```

Le contrat accepte une source HTTPS et retourne uniquement un modèle validé. Le détail GitHub `blob` → `raw` doit rester dans l'adaptateur de source, pas dans le métier.

### AiProviderPort

Le compagnon IA possède déjà une séparation fournisseur. La migration doit conserver la distinction entre :

- analyse déterministe locale ;
- fournisseur local ;
- fournisseur cloud ;
- configuration et secrets ;
- données effectivement transmises.

### RuntimePort

À introduire uniquement si nécessaire pour isoler les appels à `window`, `navigator`, `document`, notifications, clipboard, raccourcis ou autres capacités de plateforme.

## 4. Règle de dépendance

Une dépendance doit aller vers le bas :

`UI → application → domaine → ports`

Les adaptateurs implémentent les ports ; le domaine ne les importe pas.

Exemple interdit :

```text
règle métier → localStorage
```

Exemple souhaité :

```text
règle métier → état métier
application → StoragePort
adapter LocalStorage → Web Storage API
adapter Electron → fichier/DB local
```

## 5. Electron n'est pas une nouvelle UI obligatoire

Un passage à Electron ne signifie pas nécessairement « remplacer React ». Electron peut héberger le même renderer React dans une fenêtre Chromium. Il faut donc distinguer trois décisions :

1. **runtime de distribution** : Web/PWA → Electron ;
2. **renderer UI** : React conservé ou remplacé ;
3. **persistance** : LocalStorage → fichier/IndexedDB/base locale selon besoin.

Ces décisions doivent être évaluées séparément. Le scénario de migration le moins risqué est souvent : **React + modèle métier conservés, Electron ajouté comme shell**, puis migration éventuelle de l'UI dans un second temps.

## 6. Stratégie progressive

Utiliser une stratégie de migration incrémentale :

1. documenter les contrats actuels ;
2. figer les comportements critiques par tests ;
3. isoler les dépendances de plateforme ;
4. introduire les ports sans changer le comportement ;
5. ajouter le nouvel adaptateur ;
6. exécuter la même suite d'acceptance sur les deux runtimes quand c'est possible ;
7. comparer les données et exports ;
8. basculer progressivement ;
9. supprimer l'ancien adaptateur seulement après une période de stabilité.

Cette approche permet de réduire le risque plutôt que de réaliser un big bang technologique.

## 7. Critère d'indépendance

Une fonctionnalité est considérée comme correctement isolée lorsque :

- ses règles métier peuvent être testées sans navigateur ;
- son état métier n'est pas stocké directement dans le composant UI ;
- son stockage passe par un port ou une frontière clairement identifiée ;
- ses exports restent identiques ou explicitement versionnés ;
- son comportement utilisateur est exprimé par un scénario d'acceptance ;
- le changement de runtime ne nécessite pas de modifier la sémantique métier.
