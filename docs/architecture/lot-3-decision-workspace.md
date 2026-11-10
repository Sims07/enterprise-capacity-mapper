# Lot 3 — Decision workspace du Compagnon cartographe

## Intention

Le lot 3 fait évoluer le Compagnon d’un assistant qui explique des constats vers un assistant qui prépare une revue d’architecture. Cette évolution reste volontairement **read-only** : le compagnon structure les éléments à décider, mais ne conclut pas à la place de l’architecte et ne modifie pas la cartographie.

Cette direction est cohérente avec les assistants EA récents : les produits du marché mettent l’accent sur l’accès par intention, les réponses sourcées et la continuité entre analyse et décision, tout en conservant une validation humaine avant modification du référentiel.

## Contrat de décision

`buildDecisionBrief(result)` transforme les observations déterministes en un objet stable :

- `priorities` : au maximum cinq constats classés par gravité (`error`, `warning`, `review`, `suggestion`) ;
- `questions` : au maximum trois questions de revue adaptées aux catégories détectées (`coverage`, `structure`, `naming`) ;
- `hasFindings` et `totalFindings` pour permettre une UI de synthèse sans recalcul métier.

Les priorités conservent les preuves d’origine et la recommandation associée. Aucune nouvelle relation ou conclusion métier n’est inférée par cette étape.

## Positionnement UX

Le compagnon doit progressivement converger vers le flux suivant :

1. **Observer** — analyser la cartographie avec des règles déterministes ou une réponse IA sourcée.
2. **Prioriser** — présenter les points qui méritent une décision avant les détails exhaustifs.
3. **Explorer** — naviguer depuis chaque priorité vers les éléments de la carte.
4. **Questionner** — expliciter les hypothèses métier qui doivent être validées.
5. **Décider** — laisser l’architecte accepter, écarter ou approfondir une piste.
6. **Agir** — seulement dans un lot ultérieur, proposer une modification avec aperçu, validation explicite et traçabilité.

Cette séparation évite de transformer trop tôt le compagnon en agent autonome. Les usages structurés et déterministes restent traités par du code ; l’IA est réservée aux tâches où le raisonnement, la synthèse ou l’interprétation apportent une valeur réelle.

## Garde-fous

- aucune modification automatique du modèle ;
- aucune conclusion métier présentée comme un fait sans preuve ;
- les références vers la cartographie doivent rester traçables ;
- les recommandations restent des pistes de revue ;
- les décisions futures devront être explicites et auditables.

## Suite prévue

Le prochain incrément pourra exposer ce contrat dans l’interface sous forme d’un **Decision Brief** : priorités, questions de revue et accès direct aux preuves, puis préparer un format d’ADR sans l’enregistrer automatiquement.

## Lot complémentaire — Qualification guidée locale des constats

Le compagnon conserve ses **quatre actions d’analyse** (vue d’ensemble, couverture, nommage, structure) et le Decision Brief. Dans chaque résultat local comportant des observations, un bloc « Approfondir un constat » permet de choisir un élément priorisé par `buildDecisionBrief`, puis de répondre à une ou deux questions contextuelles.

- `src/domain/companionReview.ts` définit une arborescence déclarative et déterministe par identifiant de règle, avec des réponses « Je ne sais pas encore ». Les réponses ne sont **pas** déduites automatiquement d’une position visuelle, d’un nombre d’applications ou d’un LLM.
- `src/components/CompanionGuidedReview.tsx` utilise le bouton du design system, les tokens existants et les références déjà présentes vers la cartographie ; les autres constats restent accessibles sans nouvel onglet.
- Les réponses sont conservées en mémoire **dans le composant associé à l’échange** pendant la session. Elles sont perdues à la suppression de l’échange ou au rechargement : aucune écriture dans le JSON métier, le stockage local ou un fournisseur distant.
- Les conclusions sont des **pistes d’action**, jamais une décision prise à la place de l’architecte. La déclaration d’une lacune et son importance métier demandent une confirmation humaine. L’évaluation de risque opérationnelle reste dans le registre existant (`applicationRisk.ts`) ; le compagnon n’attribue aucun niveau de risque sans qualification.
- Les réponses « donnée incomplète », « hors périmètre » et « inconnu » n’aboutissent jamais à une lacune confirmée. Pour la couverture, une confirmation de lacune déclenche une seconde question sur son importance métier avant la recommandation.

Vérification : tests unitaires sur tous les scénarios et embranchements dans `src/domain/companionReview.test.ts`, tests Playwright de qualification sans mutation du modèle et de conservation des quatre analyses dans `playwright/e2e/regression.spec.ts`, exemples Storybook clair/sombre dans `CompanionGuidedReview.stories.tsx`.

## Lot suivant — Passer du constat à l’action sans duplication métier

Après une qualification humaine confirmant qu’une relation applicative manque, le compagnon propose des actions **explicites** depuis le résultat local : **Relier une application existante** ou **Créer une application liée**. Pour une application sans rattachement, il peut ouvrir la modale inverse « Relier cette application ».

- `src/domain/companionRemediation.ts` détermine de façon pure quelles actions sont pertinentes. Il exige une réponse de qualification complète, une référence d’élément existant et le bon niveau N0/N1 ; un constat « hors périmètre » ou « inconnu » n’ouvre aucune action de liaison.
- La commande est **déléguée à App**. Elle ouvre `openLinkForTarget`, `openLinkForApp` ou `openNew('app', target.id)`, réutilisant les validations et use cases de relations et de création déjà en place, sans écrire directement dans le modèle depuis le compagnon.
- Le nouvel élément est présélectionné dans la fiche de création d’application, avec son rattachement indiqué à l’écran. Les boutons Annuler/Enregistrer gardent leur fonctionnement normal.
- Après confirmation, le compagnon constate qu’une **relation est déclarée** dans la cartographie active et propose de relancer le diagnostic ; cette relation n’est pas assimilée à une couverture fonctionnelle suffisante ou à un niveau de risque calculé.
- Les réponses de qualification restent en mémoire de session et ne sont pas exportées. Les tests du domaine et Playwright couvrent les refus, l’annulation sans modification, la confirmation, les contextes N0/N1 et les références obsolètes.

L’application demeure statique, compatible GitHub Pages et hors ligne, sans appel à un LLM.

## Présentation des constats uniques dans le compagnon

Lorsque le diagnostic local retourne **exactement un constat**, la qualification s'ouvre immédiatement, sans clic sur une ligne de sélection. La carte « À retenir » n'est alors pas dupliquée : le constat, sa référence et la question sont visibles dans le même bloc. Une réponse qualifiée peut faire apparaître un encart « Passer à l'action » avec les **actions métier explicites** déjà reliées au parcours du compagnon (liaison ou création d'application) et une confirmation dans l'éditeur existant. Après la réponse, l'encart est amené dans la zone visible de la conversation. Le bouton « Recommencer la qualification » revient aux questions, sans mutation.

Avec **plusieurs constats**, le Decision Brief et la liste sélectionnable sont conservés pour ne pas décider à la place de l'architecte. Un clic sur un constat ouvre son questionnaire ; les autres constats ne sont pas ouverts automatiquement. Les variantes simple et sombre sont documentées dans Storybook et l'ouverture automatique ainsi que la visibilité de l'action sont couvertes par Playwright.

## Actualisation immédiate après une action de cartographie

Les échanges du compagnon restent **historiques** (question posée, contexte et réponses conservés pour la session), mais l'affichage des **constats encore actifs** est recalculé en temps réel par `analyzeCartography(model)`. Un diff déterministe de leurs identifiants stables (`reconcileCompanionReview`) distingue les constats levés, ceux encore présents et les nouveaux constats de même catégorie.

Après l'ajout ou la création d'une relation applicative :
- si le constat initial disparaît et qu'aucun écart de cette analyse ne subsiste, l'affichage annonce **« Constat levé dans la cartographie actuelle »**, à la place de l'ancien statut « Donnée incomplète », de sa recommandation et de la liste de constats obsolète ;
- si d'autres écarts restent présents, ils sont conservés comme **constats actifs** et peuvent toujours être qualifiés. Le nombre dans l'en-tête et la synthèse suivent également l'état actuel ;
- si l'édition est annulée, les constats restent actifs, et les recommandations ne sont pas présentées comme réalisées.

Une liaison déclarée prouve uniquement l'existence d'une **relation de cartographie**. La suffisance de la couverture métier ou le niveau de risque restent à qualifier par l'architecte. Aucun LLM, appel distant, modification automatique supplémentaire, ni persistance des réponses du compagnon ne sont introduits. Les tests Vitest du diff et les E2E Playwright couvrent la résolution totale et partielle, ainsi que le maintien des constats restants.
