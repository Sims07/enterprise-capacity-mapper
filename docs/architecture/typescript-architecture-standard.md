# Référentiel officiel d'architecture TypeScript

- **Statut :** norme de conception à appliquer progressivement
- **Périmètre :** code TypeScript/JavaScript applicatif, modèle de cartographie, ports, adaptateurs, composition et tests
- **Contrainte de déploiement :** application statique compatible GitHub Pages et PWA
- **Décision associée :** ADR 0002 — Contrats TypeScript, ports et adaptateurs

Ce document est la référence normative pour les nouvelles modifications et les refactorings d'architecture. Il décrit la cible et les règles de décision ; il ne prétend pas que l'ensemble du code existant a déjà été migré.

## 1. Principes non négociables

1. **Inversion de dépendance.** Le code métier et les cas d'usage ne dépendent pas directement des API navigateur, de React, de LocalStorage, d'un fournisseur IA ou d'un service concret.
2. **Contrats explicites.** Les frontières d'architecture utiles sont définies par des ports TypeScript, généralement des `interface` lorsque le contrat est comportemental.
3. **Adaptateurs remplaçables.** Les détails de plateforme vivent dans des adaptateurs, qui dépendent des ports et les respectent.
4. **Composition à la frontière.** Le choix des implémentations concrètes et leur injection sont centralisés dans un point de composition identifiable.
5. **Métier non anémique.** Les règles, validations, transitions et invariants appartiennent au domaine ou à des fonctions métier nommées ; l'UI ne doit pas devenir l'unique endroit où ils existent.
6. **Pas d'abstraction pour l'abstraction.** Une frontière est créée lorsqu'elle protège un contrat, rend une dépendance remplaçable ou améliore concrètement les tests.
7. **Compatibilité préservée.** La sémantique TOGAF/capability mapping, les JSON existants, la PWA et le déploiement GitHub Pages restent stables sauf évolution fonctionnelle explicitement décidée.
8. **Migration incrémentale.** Les changements structurants sont proposés dans une PR dédiée, avec tests et CI vérifiés ; aucune PR n'est fusionnée sans autorisation explicite.

## 2. Couches et direction des dépendances

La direction cible est :

```text
UI (React aujourd'hui)
        ↓
Application / cas d'usage
        ↓
Domaine et modèle métier
        ↑
Ports (contrats consommés par l'application)
        ↑
Adaptateurs d'infrastructure (navigateur, LocalStorage, IA, fichiers...)
        ↑
Point de composition : choisit et injecte les adaptateurs
```

La flèche représente une dépendance de code, pas le flux d'exécution. Le code applicatif peut appeler un port ; l'adaptateur concret est fourni de l'extérieur. Le domaine ne doit pas importer React, des composants UI, des API navigateur ni des adaptateurs concrets.

Un port peut être entrant (par exemple une commande exposée à l'UI) ou sortant (par exemple un dépôt de cartographies). On ne crée pas un port artificiel autour de chaque fonction interne.

## 3. Règles TypeScript : `interface`, `type`, `satisfies`, `implements`

### 3.1 `interface` : contrats comportementaux

Utiliser en priorité une `interface` pour un port qui décrit les opérations offertes par une dépendance, par exemple `ModelRepository`, `NavigationPort` ou `AiCompanionPort`.

Un port doit :
- décrire le comportement attendu, sans révéler le mécanisme de stockage ou de transport ;
- exposer des entrées et sorties typées ;
- rester indépendant des modules d'adaptateurs ;
- être assez petit pour que ses consommateurs ne dépendent que des opérations nécessaires, sans fragmentation excessive.

### 3.2 `type` : données, unions et compositions

Conserver les alias `type` pour les modèles de données, états, unions discriminées, paramètres et résultats, notamment lorsque les formes sont composées ou dérivées d'autres types.

Ne pas transformer automatiquement tous les `type` en `interface`, ni les données JSON en classes. Le format persistant reste un contrat de données versionné ; un type TypeScript seul ne valide pas des données reçues au runtime. Les données importées doivent continuer à passer par la validation/normalisation existante.

### 3.3 Adaptateur simple : objet typé avec `satisfies`

Pour un adaptateur sans état complexe ni cycle de vie, préférer une fabrique qui retourne un objet littéral. Déclarer l'objet avec `satisfies Port` rend la conformité explicite à la compilation sans imposer une classe :

```ts
export const createExampleAdapter = (dependency: Dependency) => {
  const adapter = {
    execute: (input: Input) => dependency.execute(input),
  } satisfies ExamplePort;

  return Object.freeze(adapter);
};
```

`Object.freeze` est facultatif et ne gèle que superficiellement ; l'utiliser uniquement lorsque l'objet de façade ne doit pas être reconfiguré. Il ne remplace ni l'encapsulation ni la validation.

### 3.4 Quand choisir une classe avec `implements`

Une classe est justifiée si elle apporte un bénéfice réel, notamment :
- un état interne cohérent avec des invariants ;
- un cycle de vie explicite (initialisation, fermeture, libération de ressources) ;
- une encapsulation qui serait moins claire avec une fermeture/fabrique ;
- une identité d'objet ou une hiérarchie réellement nécessaire.

Dans ce cas, déclarer `class X implements SomePort` afin de rendre le contrat visible et vérifié. Ne pas créer de classes uniquement pour reproduire les conventions Java : TypeScript vérifie les objets par compatibilité structurelle, et une classe n'est pas nécessaire pour avoir un contrat statiquement vérifié.

### 3.5 Typage sûr des frontières

- Préférer `unknown` à `any` pour une valeur non fiable, puis la valider.
- Donner aux paramètres injectés le type du port ou un type de fonction précis ; éviter les objets de configuration non typés quand leur forme est connue.
- Éviter les assertions de type qui masquent une incompatibilité réelle.
- Le typecheck doit être exécuté dans la CI. La migration vers un mode TypeScript plus strict doit être progressive, en traitant chaque classe d'erreurs et en évitant de désactiver globalement la vérification pour faire passer la compilation.

## 4. Composition et injection des dépendances

Le point de composition est le seul endroit qui choisit normalement les adaptateurs par défaut. Il peut accepter des implémentations injectées pour les tests, les variantes de runtime ou les évolutions futures.

Exemple conceptuel :

```ts
type ApplicationOptions = {
  repository?: ModelRepository;
  navigation?: NavigationPort;
  ai?: AiCompanionPort;
};

function createApplication(options: ApplicationOptions) {
  const repository = options.repository ?? createLocalStorageModelRepository();
  const navigation = options.navigation ?? createBrowserNavigationAdapter();
  // Construire les cas d'usage à partir des contrats.
  return { repository, navigation };
}
```

Règles :
- le code applicatif reçoit des ports, pas des classes concrètes ;
- les adaptateurs ne doivent pas s'importer mutuellement sans nécessité ;
- les valeurs par défaut restent explicites et localisées ;
- préférer `??` à `||` pour les dépendances injectées, afin de ne pas remplacer une valeur légitimement falsy ;
- les tests injectent des doublures ciblées ou des adaptateurs de test plutôt que de modifier le comportement global du navigateur.

## 5. Modèle métier et invariants

Le domaine représente la sémantique de cartographie, pas sa présentation. Les concepts clés restent Domaines N0, Capacités N1, Applications, relations N↔N, couverture, gaps, redondances et impact.

Lorsqu'une règle doit toujours être vraie, elle doit être protégée par une opération métier identifiable et testable. Exemples :
- une relation ne référence que des entités existantes ;
- un domaine et son étendue de placement respectent les contraintes de la matrice ;
- une capacité conserve son domaine parent conformément au modèle ;
- l'import d'un JSON n'introduit pas de références invalides ;
- une analyse déterministe ne mute pas le modèle reçu.

Ne pas déplacer toutes les données dans des classes riches par principe. Un modèle peut être un alias `type` si les données sont passives et les invariants sont centralisés dans des fonctions métier pures et nommées. En revanche, ne pas disperser les mêmes règles dans des composants React, des formulaires et des adaptateurs.

Les règles TOGAF/capability mapping ne doivent pas être modifiées par un refactoring technique.

## 6. Frontières actuelles et cible de remplacement

| Besoin | Port / contrat | Adaptateur actuel | Évolution possible |
|---|---|---|---|
| Cartographies et persistance | `ModelRepository` | LocalStorage + services de stockage | IndexedDB, fichier local, source distante |
| Navigation | `NavigationPort` | History API du navigateur | autre shell/runtime |
| Compagnon IA | `AiCompanionPort` | client fournisseur configuré | autre fournisseur ou faux adaptateur de test |
| Préférences et viewport | à maintenir derrière les frontières existantes pertinentes | API navigateur | autre runtime si nécessaire |
| Import/export | contrat du dépôt / frontière fichiers à préciser au besoin | APIs Web et JSON versionné | dialogue fichiers ou système de fichiers local via adaptateur contrôlé |

Ne pas introduire un backend, une base de données ou des secrets persistants dans le navigateur pour satisfaire ces objectifs. La persistance utilisateur reste locale ; les données de référence partagées peuvent être un JSON public configurable. Une écriture authentifiée dans un dépôt nécessite une authentification explicite et ne doit pas exposer de token permanent côté client.

## 7. Stratégie de tests

Chaque changement doit choisir les niveaux de tests proportionnés à son risque.

### Tests de domaine / unitaires
- règles et invariants avec des entrées minimales et des cas limites ;
- validation et migration de schéma ;
- absence de mutation involontaire ;
- tests Node sans navigateur lorsqu'ils sont possibles.

### Tests des ports et adaptateurs
- tests du contrat : résultats attendus, erreurs et appels aux dépendances ;
- tests des adaptateurs avec dépendances injectées (History, sender IA, stockage) ;
- ne pas faire dépendre les tests de l'implémentation privée ou du nombre de fonctions internes.

### Cypress E2E
- préserver les parcours utilisateurs critiques : création/édition, relations, import/export, bibliothèque locale, navigation, compagnon IA et PWA ;
- ajouter ou adapter un scénario quand le comportement visible change ;
- privilégier les rôles, libellés, états accessibles et effets utilisateur plutôt que les détails CSS ou l'arborescence React.

### CI obligatoire avant de déclarer une PR prête
1. `npm run typecheck`
2. `npm run test:unit`
3. `npm run test:e2e` avec collecte de coverage selon le workflow
4. `npm run build`
5. vérifier les jobs GitHub Actions et examiner les échecs avant toute correction.

Ne pas déclarer tous les tests verts sur la seule base d'un test local ou d'un run antérieur. Les résultats doivent correspondre au dernier commit de la PR.

## 8. Règles de migration

1. Auditer l'existant avant de créer une nouvelle abstraction.
2. Écrire ou adapter les tests avant de déplacer un comportement sensible.
3. Introduire le contrat sans changer la sémantique utilisateur.
4. Injecter l'adaptateur et conserver une implémentation par défaut.
5. Exécuter les tests pertinents et analyser tout échec avant de modifier le code.
6. Documenter les décisions qui changent la cible d'architecture dans un ADR.
7. Garder les refactorings cohérents dans une PR dédiée.
8. Ne jamais fusionner sans autorisation explicite du mainteneur.

## 9. Critères d'acceptation d'une modification

Une modification respecte le référentiel si :
- la direction des dépendances est correcte ;
- les ports n'importent pas leurs adaptateurs ;
- les adaptateurs respectent explicitement leurs contrats ;
- l'injection des dépendances reste possible ;
- les règles métier et données persistées conservent leur sémantique ;
- les tests pertinents sont ajoutés/adaptés ;
- le typecheck, les tests, la couverture attendue et le build sont vérifiés sur le commit final ;
- la PR explique ce qui est fait, ce qui reste hors périmètre et les limites connues.

## 10. Sources techniques de référence

Ces règles suivent les mécanismes TypeScript documentés et les principes usuels d'architecture hexagonale :
- TypeScript Handbook — Interfaces : https://www.typescriptlang.org/docs/handbook/2/objects.html
- TypeScript Handbook — Classes et `implements` : https://www.typescriptlang.org/docs/handbook/2/classes.html
- TypeScript 4.9 — `satisfies` : https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-9.html
- AWS Prescriptive Guidance — Hexagonal architecture : https://docs.aws.amazon.com/prescriptive-guidance/latest/hexagonal-architectures/
