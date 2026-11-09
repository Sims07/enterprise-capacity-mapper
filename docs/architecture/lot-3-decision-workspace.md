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
