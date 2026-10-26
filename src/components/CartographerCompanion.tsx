import React, { useEffect, useRef, useState } from 'react';
import { analyzeCartography, buildDecisionBrief } from '../domain/cartographyAnalysis.ts';
import type { Application, Capability, CatalogModel, Domain } from '../domain/catalogModel.ts';
import type { AiCompanionPort } from '../ports/aiCompanion.ts';
import type { CompanionPreferencesPort } from '../ports/companionPreferences.ts';

const PROMPTS = [
  { id: 'overview', label: 'Évaluer la cartographie', description: 'Obtenir une vue d’ensemble des points à examiner.', icon: '✦' },
  { id: 'coverage', label: 'Vérifier la couverture', description: 'Repérer les capacités ou domaines sans lien applicatif.', icon: '◉' },
  { id: 'naming', label: 'Revoir le nommage métier', description: 'Identifier les noms absents, doublons et formulations à revoir.', icon: 'Aa' },
  { id: 'structure', label: 'Contrôler la structure', description: 'Vérifier les rattachements et les relations de la cartographie.', icon: '⌘' },
];

const CATEGORY_LABELS = {
  structure: 'Structure',
  naming: 'Nommage',
  coverage: 'Couverture',
};

const SEVERITY_LABELS = {
  error: 'À corriger',
  warning: 'Attention',
  review: 'À vérifier',
  suggestion: 'Suggestion',
};

const itemEvidence = (type, item) => ({ type, id: item?.id ?? null, name: String(item?.name ?? '').trim() || '(sans nom)' });

const categoryForPrompt = prompt => ({
  overview: null,
  coverage: 'coverage',
  naming: 'naming',
  structure: 'structure',
}[prompt] ?? null);

function resultMessage(prompt, result, observations) {
  if (prompt === 'coverage') {
    return observations.length
      ? `La revue locale a relevé ${observations.length} point(s) de couverture à examiner. Ce sont des pistes de vérification, pas des conclusions métier automatiques.`
      : 'Aucun point de couverture à examiner n’a été détecté par les règles locales. Cela ne remplace pas la validation métier.';
  }
  if (prompt === 'naming') {
    return observations.length
      ? `La revue du nommage a relevé ${observations.length} suggestion(s). Les intitulés restent à valider avec le contexte métier.`
      : 'Aucun point de nommage n’a été détecté par les règles locales. La qualité sémantique reste à valider par un architecte.';
  }
  if (prompt === 'structure') {
    return observations.length
      ? `La revue structurelle a relevé ${observations.length} point(s) à examiner. Les constats sont rattachés aux éléments de la cartographie.`
      : 'Aucun problème structurel n’a été détecté par les règles locales.';
  }
  return String(result.summary ?? '').split(/\r?\n\s*\r?\n/)[0];
}

type CompanionModel = Omit<CatalogModel, 'layout' | 'domains' | 'capabilities' | 'applications'> & {
  layout?: { depth?: number; [key: string]: unknown };
  domains: Domain[];
  capabilities: Capability[];
  applications: Application[];
};

type EvidenceReference = { type: 'domain' | 'capability' | 'application'; id: string; name: string };

function validateGeneratedReferences(answer: string, model: CompanionModel) {
  const entities = {
    domain: Array.isArray(model.domains) ? model.domains : [],
    capability: Array.isArray(model.capabilities) ? model.capabilities : [],
    application: Array.isArray(model.applications) ? model.applications : [],
  };
  const references: EvidenceReference[] = [];
  let invalidReferences = 0;
  const cleanedAnswer = String(answer ?? '').replace(/\[\[(domain|capability|application):([^\]]+)\]\]/g, (_marker, rawType: string, rawId: string) => {
    const type = rawType as keyof typeof entities;
    const id = rawId.trim();
    const entity = entities[type].find(item => item.id === id);
    if (!entity) {
      invalidReferences += 1;
      return '';
    }
    if (!references.some(reference => reference.type === type && reference.id === id)) {
      references.push({ type, id, name: String(entity.name || '(sans nom)') });
    }
    return '';
  }).replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { answer: cleanedAnswer, references, invalidReferences };
}

function formatAnswerInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part
  );
}

function FormattedAnswer({ text, testId }: { text: string; testId?: string }) {
  const lines = String(text ?? '').replace(/\r\n/g, '\n').split('\n');
  return (
    <div className="companion-answer-text companion-formatted-answer" data-testid={testId}>
      {lines.map((rawLine, index) => {
        const line = rawLine.trim();
        if (!line) return <div className="companion-answer-spacer" aria-hidden="true" key={index} />;
        const heading = line.match(/^#{1,3}\s+(.+)$/) || line.match(/^\*\*(.+)\*\*:?[ \t]*$/)
          || (line.endsWith(':') && line.length <= 90 ? [line, line.slice(0, -1)] : null);
        if (heading) return <h4 className="companion-answer-heading" key={index}>{formatAnswerInline(heading[1].replace(/\*\*/g, ''))}</h4>;
        const bullet = line.match(/^(?:[-*•]\s+|\d+[.)]\s+)(.+)$/);
        if (bullet) return (
          <div className="companion-answer-list-item" key={index}>
            <span aria-hidden="true">•</span>
            <p>{formatAnswerInline(bullet[1])}</p>
          </div>
        );
        return <p className="companion-answer-paragraph" key={index}>{formatAnswerInline(line)}</p>;
      })}
    </div>
  );
}

function evidenceExists(item: { type?: string; id?: string | null }, model: CompanionModel) {
  if (!item.id) return false;
  if (item.type === 'domain') return model.domains.some(entity => entity.id === item.id);
  if (item.type === 'capability') return model.capabilities.some(entity => entity.id === item.id);
  if (item.type === 'application') return model.applications.some(entity => entity.id === item.id);
  return false;
}


import { COMPANION_MASCOT_IMAGES, type MascotKind } from './companion-mascots';

const MASCOT_PERSONALITIES: Record<MascotKind, { name: string; tagline: string; style: string; thinking: string }> = {
  raccoon: {
    name: 'Rico le raton',
    tagline: 'Curieux, malicieux et toujours prêt à fouiller la carte',
    style: 'Tu es Rico, le raton laveur curieux et débrouillard. Explore les détails, repère les incohérences et cherche des pistes concrètes. Ton chaleureux, vif et légèrement espiègle ; une touche d’humour discrète seulement si elle sert l’échange. Sois un partenaire d’architecture exigeant, jamais un personnage comique au détriment de la précision.',
    thinking: 'Je fouille la cartographie…',
  },
  octopus: {
    name: 'Octave la pieuvre',
    tagline: 'Calme, méthodique et capable de relier tous les fils',
    style: 'Tu es Octave, la pieuvre calme et méthodique. Prends du recul, relie les éléments avec prudence et examine les risques, dépendances et interprétations alternatives. Ton posé, analytique et élégant ; formule des nuances utiles sans devenir verbeux. Tu es le second regard qui clarifie et approfondit, pas une voix qui répète la première analyse.',
    thinking: 'Je relie les tentacules de la cartographie…',
  },
};


function MascotIcon({ kind, className = '' }: { kind: MascotKind; className?: string }) {
  return <img
    className={className}
    src={COMPANION_MASCOT_IMAGES[kind]}
    alt={kind === 'raccoon' ? 'Mascotte raton laveur' : 'Mascotte pieuvre'}
    draggable={false}
  />;
}

export default function CartographerCompanion({ model, darkMode = false, aiCompanionFactory, companionPreferences, onNavigateToEvidence }: {
  model: CompanionModel;
  darkMode?: boolean;
  aiCompanionFactory: (settings?: Record<string, unknown>) => AiCompanionPort;
  companionPreferences: CompanionPreferencesPort;
  onNavigateToEvidence?: (item: EvidenceReference) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mascot, setMascot] = useState<MascotKind>(() => {
    try { return window.localStorage.getItem('companion-mascot') === 'octopus' ? 'octopus' : 'raccoon'; }
    catch { return 'raccoon'; }
  });
  const toggleMascot = () => setMascot(current => {
    const next: MascotKind = current === 'raccoon' ? 'octopus' : 'raccoon';
    try { window.localStorage.setItem('companion-mascot', next); } catch { /* Keep the selection for this session if storage is unavailable. */ }
    return next;
  });
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [activePrompt, setActivePrompt] = useState(null);
  const [mode, setMode] = useState('guided');
  const [duoMode, setDuoMode] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [providerSettings, setProviderSettings] = useState(() => companionPreferences.load());
  const [apiKey, setApiKey] = useState('');
  const [showProviderSettings, setShowProviderSettings] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const conversationRef = useRef(null);
  const wasOpenRef = useRef(false);

  const navigateToEvidence = (item: EvidenceReference) => {
    onNavigateToEvidence?.(item);
    // On narrow screens the companion covers the map, so reveal the selected entity after navigation.
    if (window.matchMedia('(max-width: 600px)').matches) {
      setOpen(false);
    }
  };

  useEffect(() => {
    companionPreferences.save(providerSettings);
  }, [providerSettings]);

  useEffect(() => {
    setHistory([]);
    setActivePrompt(null);
    setConfirmClear(false);
    setConfirmDeleteId(null);
  }, [model]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    // Restore focus after React has committed the closed state, when the panel no longer
    // owns focus. Calling focus in the click handler is too early and can be undone by unmount.
    if (wasOpenRef.current && !open) triggerRef.current?.focus();
    wasOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open || !panelRef.current) return undefined;

    const panel = panelRef.current;
    const visualViewport = window.visualViewport;
    const updateViewport = () => {
      const isMobile = window.matchMedia('(max-width: 600px)').matches;
      if (!isMobile) {
        panel.style.removeProperty('height');
        panel.style.removeProperty('max-height');
        panel.style.removeProperty('top');
        panel.style.removeProperty('bottom');
        panel.style.removeProperty('--companion-visual-viewport-height');
        panel.style.removeProperty('--companion-visual-viewport-offset-top');
        return;
      }

      const height = Math.round(visualViewport?.height ?? window.innerHeight);
      const offsetTop = Math.round(visualViewport?.offsetTop ?? 0);
      panel.style.setProperty('--companion-visual-viewport-height', height + 'px');
      panel.style.setProperty('--companion-visual-viewport-offset-top', offsetTop + 'px');
      // Inline sizing wins over legacy responsive declarations and keeps the panel
      // tied to the visible viewport even when the virtual keyboard is open.
      panel.style.height = height + 'px';
      panel.style.maxHeight = height + 'px';
      panel.style.top = offsetTop + 'px';
      panel.style.bottom = 'auto';
    };

    updateViewport();
    visualViewport?.addEventListener('resize', updateViewport);
    visualViewport?.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);
    window.addEventListener('orientationchange', updateViewport);

    return () => {
      visualViewport?.removeEventListener('resize', updateViewport);
      visualViewport?.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
      window.removeEventListener('orientationchange', updateViewport);
      panel.style.removeProperty('--companion-visual-viewport-height');
      panel.style.removeProperty('--companion-visual-viewport-offset-top');
      panel.style.removeProperty('height');
      panel.style.removeProperty('max-height');
      panel.style.removeProperty('top');
      panel.style.removeProperty('bottom');
    };
  }, [open]);

  useEffect(() => {
    if (conversationRef.current) {
      conversationRef.current.scrollTop = conversationRef.current.scrollHeight;
    }
  }, [history, open, mode]);

  const runReview = (prompt, question = PROMPTS.find(item => item.id === prompt)?.label || 'Revue de la cartographie') => {
    const fullResult = analyzeCartography(model);
    const category = categoryForPrompt(prompt);
    const observations = category
      ? fullResult.observations.filter(item => item.category === category)
      : fullResult.observations;
    const counts = {
      total: observations.length,
      errors: observations.filter(item => item.severity === 'error').length,
      reviews: observations.filter(item => ['warning', 'review'].includes(item.severity)).length,
      suggestions: observations.filter(item => item.severity === 'suggestion').length,
    };

    setActivePrompt(prompt);
    setHistory(previous => [...previous, {
      id: `${Date.now()}-${previous.length}`,
      question,
      prompt,
      answer: resultMessage(prompt, fullResult, observations),
      observations,
      brief: buildDecisionBrief({ observations }),
      counts,
      source: 'local',
      mascot,
    }]);
  };

  const normalizeText = value => String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const runRelationshipLookup = (question, preferredEntity: { type: 'application' | 'capability'; id: string } | null = null) => {
    const normalizedQuestion = normalizeText(question);
    const asksAboutRelations = /ou se trouve|ou est|a quoi.*(relie|rattach)|a quelle capacite|quelles? capacites?.*(lie|rattach|associe)|application.*(relie|rattach|associe|couvert)|dans la cartographie|rattachee? a quoi|relations? de/.test(normalizedQuestion);
    if (!asksAboutRelations) return false;

    const applications = Array.isArray(model?.applications) ? model.applications : [];
    const capabilities = Array.isArray(model?.capabilities) ? model.capabilities : [];
    const domains = Array.isArray(model?.domains) ? model.domains : [];
    const depth = model?.layout?.depth === 1 ? 1 : 2;
    const targets = depth === 1 ? domains : capabilities;
    const targetById = new Map<string, (typeof targets)[number]>(targets.map(item => [item.id, item] as const));
    let matchedApplications = applications.filter(app => {
      const name = normalizeText(app?.name);
      return name.length > 0 && normalizedQuestion.includes(name);
    });
    if (preferredEntity?.type === 'application') matchedApplications = matchedApplications.filter(app => app.id === preferredEntity.id);
    else if (preferredEntity) matchedApplications = [];

    const duplicateApplicationNames = matchedApplications.filter(app => matchedApplications.some(other => other.id !== app.id && normalizeText(other.name) === normalizeText(app.name)));
    if (!preferredEntity && duplicateApplicationNames.length > 1) {
      const options = [...new Map(duplicateApplicationNames.map(app => [app.id, { type: 'application' as const, id: app.id, name: app.name || '(sans nom)' }])).values()];
      addDirectAnswer(question, 'Plusieurs applications portent le même nom dans la cartographie. Choisis celle que tu souhaites examiner pour éviter toute confusion.', [], 'local', options);
      return true;
    }

    if (matchedApplications.length > 0) {
      const observations = [];
      matchedApplications.forEach(app => {
        const ids: string[] = Array.isArray(app.capabilityIds) ? app.capabilityIds.filter((id): id is string => typeof id === 'string') : [];
        const linkedTargets = [...new Set(ids)].map(id => targetById.get(id)).filter((target): target is (typeof targets)[number] => Boolean(target));
        const missingTargets = [...new Set(ids)].filter(id => !targetById.has(id));
        linkedTargets.forEach(target => {
          const domain = depth === 2 ? domains.find(item => item.id === target.domainId) : null;
          observations.push({
            id: `lookup:${app.id}:${target.id}`,
            ruleId: 'lookup.application-relations',
            category: 'structure',
            severity: 'review',
            title: depth === 1 ? `Domaine associé : ${target.name}` : `Capacité associée : ${target.name}`,
            detail: depth === 2
              ? `L’application « ${app.name} » est reliée à cette capacité N1.${domain ? ` Elle appartient au domaine N0 « ${domain.name} ».` : ' Son domaine N0 de rattachement n’a pas été retrouvé dans le modèle.'}`
              : `L’application « ${app.name} » est reliée à ce domaine N0 dans une cartographie configurée sur un niveau.`,
            recommendation: 'Vérifier que cette relation correspond bien au périmètre fonctionnel réel de l’application.',
            evidence: [{ type: 'application', id: app.id, name: app.name }, itemEvidence(depth === 1 ? 'domain' : 'capability', target), ...(domain ? [itemEvidence('domain', domain)] : [])],
          });
        });
        missingTargets.forEach(id => observations.push({
          id: `lookup:${app.id}:missing:${id}`,
          ruleId: 'lookup.application-missing-target',
          category: 'structure',
          severity: 'warning',
          title: 'Relation vers une cible introuvable',
          detail: `L’application « ${app.name} » référence un élément qui n’existe pas dans cette cartographie.`,
          recommendation: 'Vérifier ou corriger la relation dans la cartographie.',
          evidence: [{ type: 'application', id: app.id, name: app.name }, { type: depth === 1 ? 'domain' : 'capability', id, name: '(cible absente)' }],
        }));
        if (ids.length === 0 || (linkedTargets.length === 0 && missingTargets.length === 0)) {
          observations.push({
            id: `lookup:${app.id}:unlinked`,
            ruleId: 'lookup.application-unlinked',
            category: 'coverage',
            severity: 'review',
            title: 'Aucun rattachement déclaré',
            detail: `Aucune relation vers une ${depth === 1 ? 'cible N0' : 'capacité N1'} n’est déclarée pour l’application « ${app.name} ».`,
            recommendation: 'Confirmer si l’application est hors périmètre, si ses relations sont à compléter ou si les données sont incomplètes.',
            evidence: [itemEvidence('application', app)],
          });
        }
      });
      const linkedCount = observations.filter(item => item.ruleId === 'lookup.application-relations').length;
      const answer = linkedCount
        ? `J’ai trouvé ${matchedApplications.length} application(s) correspondant à la question et ${linkedCount} rattachement(s) déclaré(s). Les éléments associés sont détaillés ci-dessous.`
        : `J’ai trouvé ${matchedApplications.length} application(s) correspondant à la question, mais aucune relation valide vers une cible de la cartographie n’a été trouvée.`;
      addDirectAnswer(question, answer, observations);
      return true;
    }

    let matchedCapabilities = capabilities.filter(item => {
      const name = normalizeText(item?.name);
      return name.length > 0 && normalizedQuestion.includes(name);
    });
    if (preferredEntity?.type === 'capability') matchedCapabilities = matchedCapabilities.filter(item => item.id === preferredEntity.id);
    else if (preferredEntity) matchedCapabilities = [];
    const duplicateCapabilityNames = matchedCapabilities.filter(item => matchedCapabilities.some(other => other.id !== item.id && normalizeText(other.name) === normalizeText(item.name)));
    if (!preferredEntity && duplicateCapabilityNames.length > 1) {
      const options = [...new Map(duplicateCapabilityNames.map(item => [item.id, { type: 'capability' as const, id: item.id, name: item.name || '(sans nom)' }])).values()];
      addDirectAnswer(question, 'Plusieurs capacités portent le même nom dans la cartographie. Choisis celle que tu souhaites examiner pour éviter toute confusion.', [], 'local', options);
      return true;
    }
    if (matchedCapabilities.length > 0 && /application|qui.*(utilise|couvre)|relie|rattach|associe/.test(normalizedQuestion)) {
      const observations = [];
      matchedCapabilities.forEach(capability => {
        const linkedApps = applications.filter(app => Array.isArray(app.capabilityIds) && app.capabilityIds.includes(capability.id));
        linkedApps.forEach(app => observations.push({
          id: `lookup:${capability.id}:${app.id}`,
          ruleId: 'lookup.capability-applications',
          category: 'structure',
          severity: 'review',
          title: `Application associée : ${app.name || '(sans nom)'}`,
          detail: `L’application « ${app.name || '(sans nom)'} » déclare une relation vers la capacité « ${capability.name} ».`,
          recommendation: 'Vérifier que la relation représente bien le soutien applicatif de cette capacité.',
          evidence: [itemEvidence('capability', capability), itemEvidence('application', app), ...(domains.filter(domain => domain.id === capability.domainId).map(domain => itemEvidence('domain', domain)))],
        }));
        if (linkedApps.length === 0) observations.push({
          id: `lookup:${capability.id}:uncovered`,
          ruleId: 'lookup.capability-uncovered',
          category: 'coverage',
          severity: 'review',
          title: 'Aucune application associée',
          detail: `Aucune application ne déclare de relation vers la capacité « ${capability.name} ».`,
          recommendation: 'Confirmer si la capacité est hors périmètre applicatif ou si une relation manque.',
          evidence: [itemEvidence('capability', capability)],
        });
      });
      const count = observations.filter(item => item.ruleId === 'lookup.capability-applications').length;
      addDirectAnswer(question, count
        ? `J’ai trouvé ${count} relation(s) applicative(s) pour la capacité citée. Consulte les éléments ci-dessous.`
        : 'Aucune relation applicative n’a été trouvée pour la capacité citée.', observations);
      return true;
    }

    addDirectAnswer(question,
      'Je reconnais une question sur les rattachements, mais je ne trouve pas de nom d’application ou de capacité correspondant exactement dans la cartographie active. Essaie de reprendre son intitulé tel qu’il apparaît dans la carte.',
      [{
        id: `lookup:not-found:${Date.now()}`,
        ruleId: 'lookup.entity-not-found',
        category: 'structure',
        severity: 'warning',
        title: 'Élément à identifier',
        detail: 'Aucun nom d’application ou de capacité de la cartographie ne correspond au texte de la question.',
        recommendation: 'Réutiliser le nom affiché dans la cartographie ; les correspondances approximatives ne sont pas devinées.',
        evidence: [],
      }]);
    return true;
  };

  const addDirectAnswer = (question, answer, observations, source = 'local', clarificationOptions: Array<{ type: 'application' | 'capability'; id: string; name: string }> = []) => {
    const counts = {
      total: observations.length,
      errors: observations.filter(item => item.severity === 'error').length,
      reviews: observations.filter(item => ['warning', 'review'].includes(item.severity)).length,
      suggestions: observations.filter(item => item.severity === 'suggestion').length,
    };
    setActivePrompt('lookup');
    setHistory(previous => [...previous, {
      id: `${Date.now()}-${previous.length}`,
      question,
      prompt: 'lookup',
      answer,
      observations,
      counts,
      source,
      mascot,
      clarificationOptions,
    }]);
  };

  const submitQuestion = async event => {
    event.preventDefault();
    const question = query.trim();
    if (!question || isSending) return;
    const primaryMascot: MascotKind = duoMode ? 'raccoon' : mascot;

    if (providerSettings.enabled) {
      const exchangeId = `${Date.now()}-${history.length}`;
      setIsSending(true);
      setHistory(previous => [...previous, {
        id: exchangeId,
        question,
        prompt: 'conversation',
        answer: '',
        observations: [],
        counts: { total: 0, errors: 0, reviews: 0, suggestions: 0 },
        source: providerSettings.provider,
        mascot: primaryMascot,
        duoMode,
        duoAnswer: '',
        duoStatus: null,
        status: 'streaming',
      }]);
      setQuery('');
      try {
        const aiCompanion = aiCompanionFactory(providerSettings);
        const answer = await aiCompanion.ask({
          question,
          cartography: model,
          history,
          personaInstructions: MASCOT_PERSONALITIES[primaryMascot].style,
          onChunk: chunk => setHistory(previous => previous.map(exchange => exchange.id === exchangeId
            ? { ...exchange, answer: exchange.answer + chunk }
            : exchange)),
        });
        const validated = validateGeneratedReferences(answer || '', model);
        const primaryAnswer = validated.answer || '';
        setHistory(previous => previous.map(exchange => exchange.id === exchangeId
          ? {
              ...exchange,
              answer: primaryAnswer || exchange.answer.replace(/\[\[(domain|capability|application):([^\]]+)\]\]/g, ''),
              references: validated.references,
              invalidReferences: validated.invalidReferences,
              status: duoMode ? 'duo-follow-up' : null,
              duoStatus: duoMode ? 'streaming' : null,
            }
          : exchange));
        if (duoMode) {
          const octopusAnswer = await aiCompanion.ask({
            question: `Question initiale : ${question}

Réponse de Rico à examiner :
${primaryAnswer || answer || '(pas de réponse exploitable)'}

Fournis un second regard indépendant : relève les points solides, nuance les incertitudes et ajoute au maximum deux angles complémentaires. Ne répète pas la première réponse et n’invente aucun fait absent des données.`,
            cartography: model,
            history: [...history, { role: 'assistant', content: primaryAnswer || answer || '' }],
            personaInstructions: MASCOT_PERSONALITIES.octopus.style,
            onChunk: chunk => setHistory(previous => previous.map(exchange => exchange.id === exchangeId
              ? { ...exchange, duoAnswer: exchange.duoAnswer + chunk }
              : exchange)),
          });
          const validatedOctopus = validateGeneratedReferences(octopusAnswer || '', model);
          setHistory(previous => previous.map(exchange => exchange.id === exchangeId
            ? {
                ...exchange,
                duoAnswer: validatedOctopus.answer || exchange.duoAnswer.replace(/\[\[(domain|capability|application):([^\]]+)\]\]/g, ''),
                duoReferences: validatedOctopus.references,
                duoInvalidReferences: validatedOctopus.invalidReferences,
                duoStatus: null,
                status: null,
              }
            : exchange));
        }
      } catch (error) {
        setHistory(previous => previous.map(exchange => exchange.id === exchangeId
          ? {
              ...exchange,
              ...(exchange.status === 'duo-follow-up'
                ? { duoAnswer: `Octave n’a pas pu terminer son analyse complémentaire. ${error.message}`, duoStatus: null, status: null }
                : { answer: `Je n’ai pas pu obtenir de réponse du fournisseur sélectionné. ${error.message}`, source: 'error', status: null }),
            }
          : exchange));
      } finally {
        setIsSending(false);
      }
      return;
    }

    if (!runRelationshipLookup(question)) {
      const normalized = question.toLocaleLowerCase('fr');
      const prompt = /couverture|gap|application|relation|redondance/.test(normalized)
        ? 'coverage'
        : /nom|intitul|doublon|capacit/.test(normalized)
          ? 'naming'
          : /structure|rattachement|n0|n1/.test(normalized)
            ? 'structure'
            : 'overview';
      runReview(prompt, question);
    }
    setQuery('');
  };

  const deleteExchange = id => {
    setHistory(previous => previous.filter(exchange => exchange.id !== id));
    setConfirmDeleteId(null);
  };

  const clearHistory = () => {
    setHistory([]);
    setActivePrompt(null);
    setConfirmClear(false);
    setConfirmDeleteId(null);
    setQuery('');
  };

  const renderHistory = () => (
    <div className="companion-chat-history" data-testid="companion-chat-history">
      {history.map((exchange, index) => (
        <article className="companion-exchange" data-testid="companion-exchange" key={exchange.id}>
          <div className="companion-exchange-actions">
            {confirmDeleteId === exchange.id ? (
              <div className="companion-inline-confirm" role="group" aria-label="Confirmer la suppression de cet échange">
                <span>Supprimer cet échange ?</span>
                <button type="button" data-testid="companion-confirm-delete-exchange" onClick={() => deleteExchange(exchange.id)}>Supprimer</button>
                <button type="button" onClick={() => setConfirmDeleteId(null)}>Annuler</button>
              </div>
            ) : (
              <button type="button" className="companion-delete-exchange" data-testid="companion-delete-exchange" aria-label={`Supprimer l’échange : ${exchange.question}`} onClick={() => { setConfirmClear(false); setConfirmDeleteId(exchange.id); }}>Supprimer l’échange</button>
            )}
          </div>
          <div className="companion-user-message">
            <span className="companion-message-role">Vous</span>
            <p data-testid="companion-user-question">{exchange.question}</p>
          </div>

          <div className="companion-assistant-message">
            <div className="companion-assistant-heading">
              <MascotIcon kind={exchange.mascot || mascot} className="companion-avatar companion-mascot-svg" />
              <div>
                <p className="companion-message-role">{MASCOT_PERSONALITIES[exchange.mascot || mascot].name}</p>
                <p className="companion-answer-meta">{exchange.status === 'streaming' || exchange.status === 'duo-follow-up' ? `Génération en cours · ${companionPreferences.defaults[exchange.source]?.label || exchange.source}` : exchange.source === 'error' ? 'Erreur fournisseur' : exchange.source === 'local' ? `${exchange.counts.total} point(s) détecté(s) · analyse locale` : `Réponse générée · ${companionPreferences.defaults[exchange.source]?.label || exchange.source}`}</p>
              </div>
            </div>
            {exchange.status === 'streaming' && !exchange.answer ? (
              <p className="companion-thinking" role="status" data-testid="companion-thinking">
                <span className="companion-thinking-indicator" aria-hidden="true" />
                {MASCOT_PERSONALITIES[mascot].thinking}
              </p>
            ) : (
              <FormattedAnswer text={exchange.answer} testId="companion-answer" />
            )}
            {exchange.status === 'streaming' && exchange.answer && (
              <p className="companion-streaming-note" role="status" data-testid="companion-streaming-note">Réponse en cours de génération…</p>
            )}
            {exchange.duoMode && (
              <div className="companion-duo-turn" data-testid="companion-duo-turn">
                <div className="companion-assistant-heading companion-duo-heading">
                  <MascotIcon kind="octopus" className="companion-avatar companion-mascot-svg" />
                  <div>
                    <p className="companion-message-role">{MASCOT_PERSONALITIES.octopus.name}</p>
                    <p className="companion-answer-meta">{exchange.duoStatus === 'streaming' ? 'Second regard en cours…' : 'Analyse complémentaire'}</p>
                  </div>
                </div>
                {exchange.duoStatus === 'streaming' && !exchange.duoAnswer
                  ? <p className="companion-thinking" role="status">Octave examine la réponse de Rico…</p>
                  : <FormattedAnswer text={exchange.duoAnswer} testId="companion-duo-answer" />}
                {exchange.duoReferences?.length > 0 && (
                  <div className="companion-generated-references" data-testid="companion-duo-references">
                    <strong>Références vérifiées par Octave</strong>
                    <div>{exchange.duoReferences.map(reference => (
                      <button type="button" key={reference.type + ':' + reference.id} data-testid="companion-duo-reference" onClick={() => navigateToEvidence(reference)}>{reference.name}</button>
                    ))}</div>
                  </div>
                )}
                {exchange.duoInvalidReferences > 0 && <p className="companion-reference-warning" role="status">{exchange.duoInvalidReferences} référence(s) proposées par Octave ne correspondent pas à la cartographie.</p>}
              </div>
            )}
            {exchange.status !== 'streaming' && exchange.references?.length > 0 && (
              <div className="companion-generated-references" data-testid="companion-generated-references">
                <strong>Références vérifiées dans la carte</strong>
                <div>
                  {exchange.references.map(reference => (
                    <button type="button" key={reference.type + ':' + reference.id} data-testid="companion-generated-reference" onClick={() => navigateToEvidence(reference)}>
                      {reference.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {exchange.status !== 'streaming' && exchange.invalidReferences > 0 && (
              <p className="companion-reference-warning" role="status" data-testid="companion-reference-warning">
                {exchange.invalidReferences} référence(s) proposée(s) par le modèle ne correspondent pas à un élément de cette cartographie et ont été écartées.
              </p>
            )}
            {exchange.clarificationOptions?.length > 0 && (
              <div className="companion-clarification" data-testid="companion-clarification">
                <strong>Quel élément souhaites-tu examiner ?</strong>
                {exchange.clarificationOptions.map(option => (
                  <button type="button" key={option.type + ':' + option.id} data-testid="companion-clarification-option" onClick={() => {
                    setHistory(previous => previous.filter(item => item.id !== exchange.id));
                    runRelationshipLookup(exchange.question, option);
                  }}>
                    {option.name} <span>({option.type === 'application' ? 'application' : 'capacité'})</span>
                  </button>
                ))}
              </div>
            )}

            {exchange.status !== 'streaming' && exchange.source === 'local' && exchange.brief && (
              <section className="companion-decision-brief" data-testid="companion-decision-brief" aria-label="Synthèse de la revue">
                {exchange.brief.priorities.length > 0 && (
                  <div className="companion-decision-section">
                    <h4>À retenir</h4>
                    <ul className="companion-decision-priorities">
                      {exchange.brief.priorities.slice(0, 3).map(item => (
                        <li key={item.id}>
                          <span className={'companion-severity severity-' + item.severity}>{item.label}</span>
                          <span>
                            {item.title}
                            {item.evidence?.length > 0 && <small className="companion-priority-evidence">{item.evidence.map(evidence => evidence.name).filter(Boolean).join(' · ')}</small>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {exchange.observations.length > 0 && exchange.brief.questions.length > 0 && (
                  <div className="companion-decision-section">
                    <h4>Questions à trancher</h4>
                    <ul className="companion-review-questions">
                      {exchange.brief.questions.slice(0, 2).map(question => <li key={question}>{question}</li>)}
                    </ul>
                  </div>
                )}
              </section>
            )}
            {exchange.status === 'streaming' ? null : exchange.observations.length > 0 ? (
              <details className="companion-details">
                <summary>Voir les constats ({exchange.observations.length})</summary>
                <div className="companion-observations">
                  {exchange.observations.map((observation, observationIndex) => (
                    <article className="companion-observation" key={observation.id + ':' + observationIndex}>
                      <div className="companion-observation-topline">
                        <span className={'companion-severity severity-' + observation.severity}>{SEVERITY_LABELS[observation.severity] || observation.severity}</span>
                        <span className="companion-category">{CATEGORY_LABELS[observation.category] || observation.category}</span>
                      </div>
                      <h4>{observation.title}</h4>
                      <p>{observation.detail}</p>
                      <p className="companion-recommendation"><strong>Piste :</strong> {observation.recommendation}</p>
                      {observation.evidence?.length > 0 && (
                        <div className="companion-evidence">
                          <span>Éléments concernés</span>
                          {observation.evidence.map((item, itemIndex) => (
                            evidenceExists(item, model) ? (
                              <button type="button" className="companion-evidence-chip is-navigable" key={(item.id || item.name) + ':' + itemIndex} data-testid="companion-evidence-link" data-evidence-id={item.id} onClick={() => navigateToEvidence({ type: item.type as EvidenceReference['type'], id: item.id as string, name: item.name })}>{item.name} ↗</button>
                            ) : (
                              <span className="companion-evidence-chip" key={(item.id || item.name) + ':' + itemIndex}>{item.name}</span>
                            )
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </details>
            ) : exchange.source === 'local' ? (
              <p className="companion-no-findings">Aucun constat n’a été relevé par cette revue.</p>
            ) : null}
            {exchange.status !== 'streaming' && <p className="companion-disclaimer">{exchange.source === 'local' ? 'Résultat indicatif des règles locales ; à valider avec le contexte métier.' : exchange.source === 'error' ? 'Aucun résultat n’a été produit ; vérifie la configuration du fournisseur et réessaie.' : 'Réponse générée par un fournisseur externe ; vérifie les faits et les recommandations avec le contexte métier.'}</p>}
          </div>
          {index < history.length - 1 && <div className="companion-exchange-divider" aria-hidden="true" />}
        </article>
      ))}
    </div>
  );

  return (
    <div className={`companion-root${darkMode ? ' companion-dark' : ''}`}>
      {open && (
        <section
          id="companion-panel"
          className="companion-panel"
          data-testid="companion-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="companion-title"
          tabIndex={-1}
          ref={panelRef}
        >
          <div className="companion-header">
            <div className="companion-brand-mark"><MascotIcon kind={mascot} className="companion-mascot-svg" /></div>
            <div className="companion-heading">
              <h2 id="companion-title">{MASCOT_PERSONALITIES[mascot].name}</h2>
              <p data-testid="companion-personality-tagline">{MASCOT_PERSONALITIES[mascot].tagline}</p>
            </div>
            <button type="button" className="companion-mascot-toggle" aria-label={mascot === 'raccoon' ? 'Passer à la mascotte pieuvre' : 'Revenir à la mascotte raton laveur'} data-testid="companion-mascot-toggle" onClick={toggleMascot}><MascotIcon kind={mascot === 'raccoon' ? 'octopus' : 'raccoon'} className="companion-mascot-toggle-icon" /><span>{mascot === 'raccoon' ? 'Pieuvre' : 'Raton laveur'}</span></button>
            <button type="button" className="companion-settings-toggle" aria-label="Configurer le fournisseur IA" data-testid="companion-settings-toggle" aria-expanded={showProviderSettings} onClick={() => setShowProviderSettings(value => !value)}>IA</button>
            <button type="button" className="companion-close" aria-label="Fermer le compagnon" data-testid="companion-close" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}>×</button>
          </div>

          <div className="companion-mode-note" role="note">
            <span className="companion-status-dot" aria-hidden="true" />
            <span>{providerSettings.enabled
              ? <><strong>Fournisseur actif : {companionPreferences.defaults[providerSettings.provider].label}</strong> · la question et le contexte métier seront transmis à ce fournisseur.</>
              : <><strong>Analyse locale</strong> · aucune donnée transmise</>}</span>
          </div>

          {showProviderSettings && (
            <section className="companion-provider-settings" data-testid="companion-provider-settings" aria-label="Configuration du fournisseur IA">
              <div className="companion-provider-settings-heading">
                <strong>Fournisseur conversationnel</strong>
                <span>Les préférences sont enregistrées dans ce navigateur ; la clé API reste uniquement en mémoire.</span>
              </div>
              <label className="companion-provider-field">
                <span>Fournisseur</span>
                <select data-testid="companion-provider" value={providerSettings.provider} onChange={event => {
                  const provider = event.target.value;
                  setProviderSettings(current => ({ ...current, provider, model: companionPreferences.defaults[provider].model, endpoint: companionPreferences.defaults[provider].endpoint }));
                  setApiKey('');
                }}>
                  {Object.entries(companionPreferences.defaults).map(([value, option]) => <option value={value} key={value}>{option.label}</option>)}
                </select>
              </label>
              <label className="companion-provider-field">
                <span>Modèle</span>
                <input data-testid="companion-provider-model" value={providerSettings.model} onChange={event => setProviderSettings(current => ({ ...current, model: event.target.value }))} autoComplete="off" />
              </label>
              <label className="companion-provider-field">
                <span>URL du service</span>
                <input data-testid="companion-provider-endpoint" value={providerSettings.endpoint} onChange={event => setProviderSettings(current => ({ ...current, endpoint: event.target.value }))} autoComplete="url" spellCheck="false" />
              </label>
              {providerSettings.provider !== 'ollama' && (
                <label className="companion-provider-field">
                  <span>Clé API (non enregistrée)</span>
                  <input data-testid="companion-provider-key" type="password" value={apiKey} onChange={event => setApiKey(event.target.value)} autoComplete="new-password" placeholder="Saisir la clé pour cette session" />
                </label>
              )}
              <label className="companion-provider-enable">
                <input data-testid="companion-provider-enabled" type="checkbox" checked={providerSettings.enabled} onChange={event => setProviderSettings(current => ({ ...current, enabled: event.target.checked }))} />
                <span>Utiliser ce fournisseur dans le mode Conversation</span>
              </label>
              <p className="companion-provider-warning">Information de sécurité : une clé API saisie dans une application GitHub Pages ne peut pas être considérée comme un secret inviolable. Il est déconseillé d’utiliser cette fonction sur un appareil partagé. Lorsque le fournisseur est activé, la question, l’historique récent et les données métier utiles de la cartographie peuvent être transmis à ce fournisseur.</p>
              {providerSettings.provider === 'ollama' && (
                <details className="companion-ollama-cors-help" data-testid="companion-ollama-cors-help">
                  <summary>Configuration de l’accès à Ollama depuis la version publiée</summary>
                  <p>Lorsqu’Enterprise Capacity Mapper est utilisé depuis GitHub Pages, le navigateur peut bloquer les requêtes vers Ollama au titre de la politique CORS. La PWA ne permet pas de contourner cette restriction.</p>
                  <p>Pour autoriser les requêtes provenant de l’application publiée, Ollama doit accepter l’origine suivante :</p>
                  <code>https://sims07.github.io</code>
                  <p>Le chemin <code>/enterprise-capacity-mapper/</code> ne doit pas être ajouté à cette valeur. Il est recommandé de limiter l’autorisation à cette origine plutôt que d’utiliser <code>*</code>.</p>
                  <h4>Windows</h4>
                  <p>Définir la variable d’environnement utilisateur <code>OLLAMA_ORIGINS</code> avec la valeur <code>https://sims07.github.io</code>, puis redémarrer complètement Ollama afin que la configuration soit prise en compte.</p>
                  <h4>macOS / Linux</h4>
                  <p>Arrêter Ollama, puis démarrer le service avec la variable d’environnement suivante :</p>
                  <pre>OLLAMA_ORIGINS="https://sims07.github.io" ollama serve</pre>
                  <p>L’URL du service peut rester <code>http://localhost:11434</code> lorsque le navigateur et Ollama fonctionnent sur le même ordinateur. Sur un autre appareil, <code>localhost</code> désigne cet autre appareil et non l’ordinateur exécutant Ollama.</p>
                </details>
              )}
              <button type="button" className="companion-provider-clear-key" data-testid="companion-provider-clear-key" onClick={() => setApiKey('')} disabled={!apiKey}>Effacer la clé de cette session</button>
            </section>
          )}

          <div className="companion-mode-toolbar">
            <div className="companion-mode-switch" role="group" aria-label="Mode du compagnon">
              <button
                type="button"
                data-testid="companion-mode-guided"
                aria-pressed={mode === 'guided'}
                className={mode === 'guided' ? 'is-active' : ''}
                onClick={() => { setMode('guided'); setConfirmClear(false); setConfirmDeleteId(null); }}
              >
                Questions guidées
              </button>
              <button
                type="button"
                data-testid="companion-mode-conversation"
                aria-pressed={mode === 'conversation'}
                className={mode === 'conversation' ? 'is-active' : ''}
                onClick={() => { setMode('conversation'); setConfirmClear(false); setConfirmDeleteId(null); }}
              >
                Conversation
              </button>
            </div>
            {mode === 'conversation' && (
              <div className="companion-duo-control" data-testid="companion-duo-control">
                <button
                  type="button"
                  className={duoMode ? 'is-active' : ''}
                  data-testid="companion-duo-toggle"
                  aria-pressed={duoMode}
                  disabled={!providerSettings.enabled}
                  title={!providerSettings.enabled ? 'Activez un fournisseur IA pour faire dialoguer Rico et Octave.' : 'Faire répondre Rico puis demander un second regard à Octave.'}
                  onClick={() => setDuoMode(value => !value)}
                >
                  Dialogue Rico + Octave
                </button>
                <p>{!providerSettings.enabled ? 'Activez un fournisseur IA dans les réglages pour utiliser le dialogue à deux.' : duoMode ? 'Rico répond, puis Octave apporte un second regard indépendant.' : 'Mode duo désactivé : une seule mascotte répond.'}</p>
              </div>
            )}
            {history.length > 0 && (
              <div className="companion-clear-actions">
                {confirmClear ? (
                  <div className="companion-inline-confirm" role="group" aria-label="Confirmer la réinitialisation">
                    <span>Effacer tout l’historique ?</span>
                    <button type="button" data-testid="companion-confirm-clear" onClick={clearHistory}>Tout effacer</button>
                    <button type="button" onClick={() => setConfirmClear(false)}>Annuler</button>
                  </div>
                ) : (
                  <button type="button" className="companion-clear-history" data-testid="companion-clear-history" onClick={() => { setConfirmDeleteId(null); setConfirmClear(true); }}>Nouvelle conversation / Tout effacer</button>
                )}
              </div>
            )}
          </div>

          {mode === 'guided' && (
            <section className="companion-guided-section" aria-labelledby="companion-guided-title">
              <div className="companion-guided-heading">
                <h3 id="companion-guided-title">Que souhaitez-vous examiner ?</h3>
                <p>Choisissez un contrôle. Les questions restent ici ; les résultats défilent dessous.</p>
              </div>
              <div className="companion-prompts">
                {PROMPTS.map(prompt => (
                  <button
                    type="button"
                    key={prompt.id}
                    data-testid={`companion-prompt-${prompt.id}`}
                    className={'companion-prompt' + (activePrompt === prompt.id ? ' is-selected' : '')}
                    onClick={() => runReview(prompt.id)}
                  >
                    <span className="companion-prompt-icon" aria-hidden="true">{prompt.icon}</span>
                    <span className="companion-prompt-copy">
                      <span className="companion-prompt-label">{prompt.label}</span>
                      <span className="companion-prompt-description">{prompt.description}</span>
                    </span>
                    <span className="companion-prompt-arrow" aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="companion-conversation" data-testid="companion-conversation" aria-live="polite" ref={conversationRef}>
            {mode === 'conversation' && history.length === 0 && (
              <div className="companion-start">
                <div className="companion-welcome">
                  <MascotIcon kind={mascot} className="companion-avatar companion-mascot-svg" />
                  <div>
                    <p className="companion-message-title">Bonjour, regardons votre cartographie.</p>
                    <p>{providerSettings.enabled ? 'Posez une question en langage naturel. Les réponses du modèle apparaissent progressivement pendant leur génération.' : 'Posez une question en langage naturel pour examiner votre cartographie avec les contrôles locaux.'}</p>
                  </div>
                </div>
              </div>
            )}
            {history.length > 0 && renderHistory()}
          </div>

          {mode === 'conversation' ? (
            <form className="companion-composer" onSubmit={submitQuestion}>
              <label className="companion-sr-only" htmlFor="companion-question">Question sur la cartographie</label>
              <input
                id="companion-question"
                data-testid="companion-question"
                value={query}
                onChange={event => setQuery(event.target.value)}
                placeholder={isSending ? 'Réponse en cours…' : 'Posez une question sur votre cartographie…'}
                autoComplete="off"
                disabled={isSending}
              />
              <button type="submit" aria-label="Envoyer la question" disabled={!query.trim()} data-testid="companion-submit">↑</button>
            </form>
          ) : (
            <p className="companion-guided-footer">Les résultats restent disponibles dans cet onglet. Passez en mode Conversation pour poser une question libre.</p>
          )}
          <p className="companion-footer-note">Historique conservé pendant cette session · {providerSettings.enabled ? `fournisseur ${companionPreferences.defaults[providerSettings.provider].label} activé` : 'mode local, aucun envoi réseau'}</p>
        </section>
      )}
      <button
        type="button"
        className={'companion-launcher' + (open ? ' is-open' : '')}
        data-testid="companion-launcher"
        aria-label={open ? 'Fermer le compagnon cartographe' : 'Ouvrir le compagnon cartographe'}
        aria-expanded={open}
        aria-controls="companion-panel"
        ref={triggerRef}
        onClick={() => setOpen(value => !value)}
      >
        <span className="companion-launcher-icon" aria-hidden="true">{open ? '×' : <MascotIcon kind={mascot} className="companion-launcher-mascot" />}</span>
        <span>{open ? 'Fermer' : 'Compagnon'}</span>
        {!open && <span className="companion-launcher-status" aria-hidden="true" />}
      </button>
    </div>
  );
}
