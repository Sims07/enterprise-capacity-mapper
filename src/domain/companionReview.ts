/**
 * Local, deterministic qualification of findings from cartographyAnalysis.
 * Answers express the architect's judgment, not facts inferred from layout or AI.
 * No model mutation, persistence, browser API or network call.
 */
export const GUIDED_REVIEW_LIMIT = 3;

export type ReviewFinding = {
  id: string;
  ruleId: string;
  title: string;
  recommendation?: string;
};

type ReviewConclusion = { classification: string; action: string };
type ReviewChoice = ReviewConclusion & {
  id: string;
  label: string;
  followUp?: { prompt: string; choices: ReadonlyArray<ReviewChoice> };
};
type ReviewScenario = { prompt: string; choices: ReadonlyArray<ReviewChoice> };

export type ReviewStep =
  | { status: 'question'; prompt: string; choices: ReadonlyArray<{ id: string; label: string }> }
  | { status: 'completed'; classification: string; action: string };

const unknown: ReviewChoice = {
  id: 'unknown', label: 'Je ne sais pas encore',
  classification: 'À qualifier',
  action: 'Conserver ce point en revue et identifier la personne métier ou SI capable de confirmer les faits.',
};

const scenarios: Record<string, ReviewScenario> = {
  'coverage.target-uncovered': {
    prompt: 'Cette absence de relation applicative correspond-elle à une lacune réelle ?',
    choices: [
      {
        id: 'confirmed', label: 'Oui, aucune application ne soutient cette capacité',
        classification: 'Lacune déclarée', action: 'Qualifier le besoin métier et évaluer les options de couverture.',
        followUp: {
          prompt: 'Cette capacité est-elle indispensable à un processus métier important ?',
          choices: [
            { id: 'important', label: 'Oui, elle est importante', classification: 'Lacune déclarée · impact métier à examiner', action: 'Organiser une revue d’impact avec le responsable du processus, puis examiner une solution de couverture. Ne pas déduire automatiquement le niveau de risque.' },
            { id: 'not-important', label: 'Non, pas à ce stade', classification: 'Lacune déclarée · priorité à confirmer', action: 'Documenter l’absence de couverture et décider si un traitement ultérieur est nécessaire.' },
            unknown,
          ],
        },
      },
      { id: 'incomplete', label: 'Non, les applications ne sont pas encore renseignées', classification: 'Donnée incomplète', action: 'Compléter les relations applicatives existantes avant de qualifier un risque.' },
      { id: 'outside', label: 'Cette capacité est volontairement hors périmètre SI', classification: 'Hors périmètre déclaré', action: 'Documenter le périmètre et la justification de l’exclusion.' },
      unknown,
    ],
  },
  'coverage.application-unlinked': {
    prompt: 'Pourquoi cette application n’est-elle reliée à aucune capacité ?',
    choices: [
      { id: 'incomplete', label: 'Les relations restent à documenter', classification: 'Donnée incomplète', action: 'Relier l’application aux capacités réellement soutenues, sans inventer de rattachement.' },
      { id: 'outside', label: 'Cette application est hors du périmètre cartographié', classification: 'Hors périmètre déclaré', action: 'Clarifier la place de l’application dans l’inventaire et le périmètre couvert.' },
      unknown,
    ],
  },
  'name.duplicate': {
    prompt: 'Ces éléments ont-ils réellement le même périmètre métier ?',
    choices: [
      { id: 'same', label: 'Oui, ils se recouvrent', classification: 'Recouvrement à vérifier', action: 'Comparer les descriptions et les rattachements, puis envisager une consolidation après validation métier.' },
      { id: 'different', label: 'Non, leurs périmètres diffèrent', classification: 'Distinction métier déclarée', action: 'Préciser les noms ou descriptions pour rendre la différence explicite.' },
      unknown,
    ],
  },
  'name.missing': {
    prompt: 'Un nom métier stable peut-il être défini pour cet élément ?',
    choices: [
      { id: 'ready', label: 'Oui, le nom est connu', classification: 'Complément possible', action: 'Renseigner le nom métier dans la fiche de l’élément.' },
      { id: 'later', label: 'Non, une validation métier est nécessaire', classification: 'Validation nécessaire', action: 'Identifier le responsable métier et conserver l’élément à qualifier.' },
      unknown,
    ],
  },
  'naming.action-phrase': {
    prompt: 'L’intitulé désigne-t-il un savoir-faire durable ou une étape de processus ?',
    choices: [
      { id: 'process', label: 'Plutôt une action de processus', classification: 'Nommage à examiner', action: 'Reformuler éventuellement sous forme de capacité métier stable, puis rattacher le processus séparément.' },
      { id: 'capability', label: 'C’est bien un savoir-faire métier', classification: 'Nommage déclaré adapté', action: 'Conserver l’intitulé si les architectes métier confirment son sens.' },
      unknown,
    ],
  },
  'relationship.capability-domain-missing': {
    prompt: 'Le domaine N0 attendu existe-t-il encore dans la cartographie ?',
    choices: [
      { id: 'existing', label: 'Oui, la capacité pointe vers le mauvais domaine', classification: 'Rattachement erroné déclaré', action: 'Vérifier le domaine N0 attendu et corriger le rattachement dans la cartographie.' },
      { id: 'missing', label: 'Non, le domaine a été retiré', classification: 'Domaine manquant déclaré', action: 'Évaluer la restauration du domaine ou le reclassement métier de la capacité.' },
      unknown,
    ],
  },
  'relationship.application-target-missing': {
    prompt: 'La relation pointe-t-elle vers une ancienne capacité ou vers une erreur de saisie ?',
    choices: [
      { id: 'removed', label: 'La capacité ciblée a été supprimée', classification: 'Référence obsolète déclarée', action: 'Examiner la cible de remplacement et mettre à jour la relation après vérification.' },
      { id: 'error', label: 'La relation est incorrecte', classification: 'Relation erronée déclarée', action: 'Corriger la relation vers une cible existante et fonctionnellement justifiée.' },
      unknown,
    ],
  },
};

const general: ReviewScenario = {
  prompt: 'Ce constat nécessite-t-il une intervention sur la cartographie ?',
  choices: [
    { id: 'yes', label: 'Oui, il faut l’examiner', classification: 'Revue nécessaire', action: 'Examiner les preuves associées, puis appliquer la piste proposée uniquement après validation.' },
    { id: 'no', label: 'Non, il est justifié', classification: 'Situation justifiée selon l’architecte', action: 'Documenter pourquoi ce constat est acceptable dans le contexte métier.' },
    unknown,
  ],
};

const question = (scenario: ReviewScenario): ReviewStep => ({
  status: 'question', prompt: scenario.prompt,
  choices: scenario.choices.map(({ id, label }) => ({ id, label })),
});

/**
 * The first response can lead to a second contextual question.
 * Invalid answers never manufacture a decision.
 */
export function resolveCompanionReview(finding: ReviewFinding, answers: readonly string[] = []): ReviewStep {
  const scenario = scenarios[finding.ruleId] ?? general;
  const first = scenario.choices.find(choice => choice.id === answers[0]);
  if (!first) return question(scenario);
  if (first.followUp) {
    const followChoice = first.followUp.choices.find(choice => choice.id === answers[1]);
    if (!followChoice) return question(first.followUp);
    return { status: 'completed', classification: followChoice.classification, action: followChoice.action };
  }
  return { status: 'completed', classification: first.classification, action: first.action };
}
