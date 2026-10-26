const ACTION_VERB_PREFIX = /^(?:gérer|gerer|piloter|assurer|suivre|traiter|créer|creer|effectuer|faire|mettre en place|réaliser|realiser|développer|developper|contrôler|controler|administrer|exécuter|executer)\b/i;

const normalizeName = value => String(value ?? '')
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLocaleLowerCase('fr')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const itemEvidence = (type, item) => ({
  type,
  id: item?.id ?? null,
  name: String(item?.name ?? '').trim() || '(sans nom)',
});

const makeObservation = (ruleId, category, severity, title, detail, recommendation, evidence = []) => ({
  id: ruleId + ':' + evidence.map(item => item.id ?? item.name).join(':'),
  ruleId,
  category,
  severity,
  title,
  detail,
  recommendation,
  evidence,
});

/**
 * Runs deterministic, provider-independent checks against a capability-map model.
 * It reports review prompts rather than asserting business truth or mutating the model.
 *
 * Expected model shape: domains[], capabilities[], applications[], layout.depth (1 or 2).
 */
export function analyzeCartography(model) {
  const observations = [];

  if (!model || typeof model !== 'object' || Array.isArray(model)) {
    observations.push(makeObservation(
      'model.invalid',
      'structure',
      'error',
      'Cartographie indisponible',
      'Le modèle fourni ne peut pas être analysé car il ne s’agit pas d’un objet de cartographie.',
      'Fournir un modèle de cartographie valide.'
    ));
    return buildResult(observations);
  }

  const domains = Array.isArray(model.domains) ? model.domains : [];
  const capabilities = Array.isArray(model.capabilities) ? model.capabilities : [];
  const applications = Array.isArray(model.applications) ? model.applications : [];
  const depth = model.layout?.depth === 1 ? 1 : 2;
  const domainById = new Map(domains.map(domain => [domain.id, domain]));
  const relationTargets = depth === 1 ? domains : capabilities;
  const targetById = new Map(relationTargets.map(target => [target.id, target]));
  const linkedTargetIds = new Set();

  for (const collection of [
    ['domain', 'Domaine N0', domains],
    ['capability', 'Capacité N1', capabilities],
    ['application', 'Application', applications],
  ]) {
    const [type, label, items] = collection;
    for (const item of items) {
      if (!String(item?.name ?? '').trim()) {
        observations.push(makeObservation(
          'name.missing',
          'naming',
          'warning',
          label + ' sans nom',
          'Un élément ne possède pas de nom exploitable dans le modèle reçu.',
          'Renseigner un nom métier explicite avant de partager ou d’interpréter cette cartographie.',
          [itemEvidence(type, item)]
        ));
      }
    }
  }

  const duplicateGroups = [
    { type: 'domain', label: 'domaine N0', items: domains, scope: () => 'all' },
    { type: 'capability', label: 'capacité N1', items: capabilities, scope: item => String(item?.domainId ?? '(sans domaine)') },
    { type: 'application', label: 'application', items: applications, scope: () => 'all' },
  ];

  for (const group of duplicateGroups) {
    const namesByKey = new Map();
    for (const item of group.items) {
      const normalized = normalizeName(item?.name);
      if (!normalized) continue;
      const key = group.scope(item) + '|' + normalized;
      const matches = namesByKey.get(key) || [];
      matches.push(item);
      namesByKey.set(key, matches);
    }
    for (const matches of namesByKey.values()) {
      if (matches.length < 2) continue;
      observations.push(makeObservation(
        'name.duplicate',
        'naming',
        'review',
        'Noms potentiellement dupliqués',
        'Plusieurs ' + group.label + ' partagent le même nom après normalisation. Cela peut être intentionnel, mais mérite une vérification.',
        'Comparer leur périmètre métier et leur description avant de renommer ou de regrouper quoi que ce soit.',
        matches.map(item => itemEvidence(group.type, item))
      ));
    }
  }

  for (const capability of capabilities) {
    if (!domainById.has(capability?.domainId)) {
      observations.push(makeObservation(
        'relationship.capability-domain-missing', 'structure', 'error',
        'Capacité rattachée à un domaine absent',
        'La capacité référence un domaine N0 qui n’est pas présent dans la cartographie.',
        'Vérifier le rattachement ou restaurer le domaine attendu.',
        [itemEvidence('capability', capability)]
      ));
    }
    if (ACTION_VERB_PREFIX.test(String(capability?.name ?? '').trim())) {
      observations.push(makeObservation(
        'naming.action-phrase', 'naming', 'suggestion', 'Intitulé à vérifier',
        'Le nom de cette capacité commence par une formulation verbale fréquente. Il peut décrire une action ou une étape de processus plutôt qu’un savoir-faire stable.',
        'Vérifier si un groupe nominal décrivant le savoir-faire serait plus durable. Ce contrôle linguistique est indicatif et peut produire des faux positifs.',
        [itemEvidence('capability', capability)]
      ));
    }
  }

  for (const domain of domains) {
    if (ACTION_VERB_PREFIX.test(String(domain?.name ?? '').trim())) {
      observations.push(makeObservation(
        'naming.action-phrase', 'naming', 'suggestion', 'Intitulé de domaine à vérifier',
        'Le nom de ce domaine commence par une formulation verbale fréquente, ce qui peut rendre le regroupement moins stable.',
        'Vérifier si un nom métier court décrivant un domaine de capacités serait plus approprié.',
        [itemEvidence('domain', domain)]
      ));
    }
  }

  for (const application of applications) {
    const ids = Array.isArray(application?.capabilityIds) ? application.capabilityIds : [];
    for (const id of ids) {
      const target = targetById.get(id);
      if (!target) {
        observations.push(makeObservation(
          'relationship.application-target-missing', 'structure', 'error',
          'Relation applicative vers une cible absente',
          depth === 1 ? 'L’application référence un domaine N0 absent de la cartographie.' : 'L’application référence une capacité N1 absente de la cartographie.',
          'Vérifier la relation et le niveau de détail de la cartographie.',
          [itemEvidence('application', application), { type: depth === 1 ? 'domain' : 'capability', id, name: '(cible absente)' }]
        ));
      } else {
        linkedTargetIds.add(id);
      }
    }
  }

  for (const target of relationTargets) {
    if (!linkedTargetIds.has(target?.id)) {
      const isDomain = depth === 1;
      observations.push(makeObservation(
        'coverage.target-uncovered', 'coverage', 'review',
        isDomain ? 'Domaine sans application reliée' : 'Capacité sans application reliée',
        isDomain ? 'Aucune relation applicative valide vers ce domaine N0 n’a été trouvée dans le modèle reçu.' : 'Aucune relation applicative valide vers cette capacité N1 n’a été trouvée dans le modèle reçu.',
        'Confirmer si l’absence de couverture est réelle, si la relation est manquante ou si le périmètre est volontairement hors du SI.',
        [itemEvidence(isDomain ? 'domain' : 'capability', target)]
      ));
    }
  }

  for (const application of applications) {
    const ids = Array.isArray(application?.capabilityIds) ? application.capabilityIds : [];
    if (ids.length === 0) {
      observations.push(makeObservation(
        'coverage.application-unlinked', 'coverage', 'review', 'Application sans relation déclarée',
        'Aucune cible de cartographie n’est reliée à cette application dans le modèle reçu.',
        'Vérifier si l’application est hors périmètre, non encore cartographiée ou si ses relations sont manquantes.',
        [itemEvidence('application', application)]
      ));
    }
  }

  return buildResult(observations, {
    mapName: String(model.metadata?.name ?? '').trim() || null,
    depth,
    counts: { domains: domains.length, capabilities: capabilities.length, applications: applications.length },
  });
}

const SEVERITY_WEIGHT = { error: 4, warning: 3, review: 2, suggestion: 1 };
const SEVERITY_BRIEF_LABEL = { error: 'À corriger', warning: 'À clarifier', review: 'À décider', suggestion: 'À améliorer' };

/**
 * Turns raw deterministic findings into an architecture decision brief.
 * It deliberately stays descriptive: no business conclusion is inferred.
 */
export function buildDecisionBrief(result) {
  const observations = Array.isArray(result?.observations) ? result.observations : [];
  const priorities = [...observations]
    .sort((left, right) => {
      const weight = (SEVERITY_WEIGHT[right.severity] ?? 0) - (SEVERITY_WEIGHT[left.severity] ?? 0);
      if (weight !== 0) return weight;
      return String(left.title).localeCompare(String(right.title), 'fr');
    })
    .slice(0, 5)
    .map(observation => ({
      id: observation.id,
      title: observation.title,
      severity: observation.severity,
      label: SEVERITY_BRIEF_LABEL[observation.severity] ?? 'À examiner',
      category: observation.category,
      recommendation: observation.recommendation,
      evidence: observation.evidence ?? [],
    }));

  const categories = new Set(observations.map(item => item.category));
  const questions = [];
  if (categories.has('coverage')) questions.push('Les zones non couvertes sont-elles de vraies lacunes ou des données de cartographie incomplètes ?');
  if (categories.has('structure')) questions.push('Les rattachements observés reflètent-ils bien le périmètre fonctionnel et le niveau de granularité attendus ?');
  if (categories.has('naming')) questions.push('Les intitulés permettent-ils de distinguer durablement les capacités, domaines et applications sans ambiguïté ?');
  if (questions.length === 0) questions.push('Quelles hypothèses métier souhaitez-vous challenger malgré l’absence de constat déterministe ?');

  return {
    priorities,
    questions: questions.slice(0, 3),
    hasFindings: observations.length > 0,
    totalFindings: observations.length,
  };
}

function buildResult(observations, context = {}) {
  const errors = observations.filter(item => item.severity === 'error').length;
  const reviews = observations.filter(item => item.severity === 'review' || item.severity === 'warning').length;
  const suggestions = observations.filter(item => item.severity === 'suggestion').length;
  const summary = observations.length === 0
    ? 'Aucun point de vigilance détecté par les contrôles déterministes exécutés.'
    : observations.length + ' point(s) de vigilance : ' + errors + ' erreur(s) structurelle(s), ' + reviews + ' point(s) à vérifier et ' + suggestions + ' suggestion(s) de nommage.';

  return {
    schemaVersion: 1,
    summary,
    context,
    observations,
    questions: [],
    limitations: [
      'Les contrôles signalent des constats structurels ou des pistes de revue ; ils ne remplacent pas la validation métier.',
      'Une différence de statut de cycle de vie entre applications ne constitue pas, à elle seule, une incohérence.',
      'Les ressemblances sémantiques entre noms ne sont pas déduites par ces règles déterministes.',
    ],
  };
}
