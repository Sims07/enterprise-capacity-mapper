import React, { useEffect, useRef, useState } from 'react';
import { analyzeCartography } from '../services/ai/cartographyAnalysis.js';
import { loadCompanionProviderPreferences, PROVIDER_DEFAULTS, saveCompanionProviderPreferences, sendCompanionMessage } from '../services/ai/companionProviders.js';

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
  return result.summary;
}

export default function CartographerCompanion({ model, darkMode = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [history, setHistory] = useState([]);
  const [activePrompt, setActivePrompt] = useState(null);
  const [mode, setMode] = useState('guided');
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [providerSettings, setProviderSettings] = useState(() => loadCompanionProviderPreferences());
  const [apiKey, setApiKey] = useState('');
  const [showProviderSettings, setShowProviderSettings] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const conversationRef = useRef(null);

  useEffect(() => {
    saveCompanionProviderPreferences(providerSettings);
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
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    panelRef.current?.focus();
    return () => document.removeEventListener('keydown', handleKeyDown);
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
      counts,
      source: 'local',
    }]);
  };

  const normalizeText = value => String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  const runRelationshipLookup = question => {
    const normalizedQuestion = normalizeText(question);
    const asksAboutRelations = /ou se trouve|ou est|a quoi.*(relie|rattach)|a quelle capacite|quelles? capacites?.*(lie|rattach|associe)|application.*(relie|rattach|associe|couvert)|dans la cartographie|rattachee? a quoi|relations? de/.test(normalizedQuestion);
    if (!asksAboutRelations) return false;

    const applications = Array.isArray(model?.applications) ? model.applications : [];
    const capabilities = Array.isArray(model?.capabilities) ? model.capabilities : [];
    const domains = Array.isArray(model?.domains) ? model.domains : [];
    const depth = model?.layout?.depth === 1 ? 1 : 2;
    const targets = depth === 1 ? domains : capabilities;
    const targetById = new Map(targets.map(item => [item.id, item]));
    const matchedApplications = applications.filter(app => {
      const name = normalizeText(app?.name);
      return name.length > 0 && normalizedQuestion.includes(name);
    });

    if (matchedApplications.length > 0) {
      const observations = [];
      matchedApplications.forEach(app => {
        const ids = Array.isArray(app.capabilityIds) ? app.capabilityIds : [];
        const linkedTargets = [...new Set(ids)].map(id => targetById.get(id)).filter(Boolean);
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

    const matchedCapabilities = capabilities.filter(item => {
      const name = normalizeText(item?.name);
      return name.length > 0 && normalizedQuestion.includes(name);
    });
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

  const addDirectAnswer = (question, answer, observations, source = 'local') => {
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
    }]);
  };

  const submitQuestion = async event => {
    event.preventDefault();
    const question = query.trim();
    if (!question || isSending) return;

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
        status: 'streaming',
      }]);
      setQuery('');
      try {
        const answer = await sendCompanionMessage({
          provider: providerSettings.provider,
          model: providerSettings.model,
          endpoint: providerSettings.endpoint,
          apiKey,
          question,
          cartography: model,
          history,
          onChunk: chunk => setHistory(previous => previous.map(exchange => exchange.id === exchangeId
            ? { ...exchange, answer: exchange.answer + chunk }
            : exchange)),
        });
        setHistory(previous => previous.map(exchange => exchange.id === exchangeId
          ? { ...exchange, answer: answer || exchange.answer, status: null }
          : exchange));
      } catch (error) {
        setHistory(previous => previous.map(exchange => exchange.id === exchangeId
          ? {
              ...exchange,
              answer: `Je n’ai pas pu obtenir de réponse du fournisseur sélectionné. ${error.message}`,
              source: 'error',
              status: null,
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
              <span className="companion-avatar" aria-hidden="true">✦</span>
              <div>
                <p className="companion-message-role">Compagnon cartographe</p>
                <p className="companion-answer-meta">{exchange.status === 'streaming' ? `Génération en cours · ${PROVIDER_DEFAULTS[exchange.source]?.label || exchange.source}` : exchange.source === 'error' ? 'Erreur fournisseur' : exchange.source === 'local' ? `${exchange.counts.total} point(s) détecté(s) · analyse locale` : `Réponse générée · ${PROVIDER_DEFAULTS[exchange.source]?.label || exchange.source}`}</p>
              </div>
            </div>
            {exchange.status === 'streaming' && !exchange.answer ? (
              <p className="companion-thinking" role="status" data-testid="companion-thinking">
                <span className="companion-thinking-indicator" aria-hidden="true" />
                Le modèle prépare sa réponse…
              </p>
            ) : (
              <p className="companion-answer-text" data-testid="companion-answer">{exchange.answer}</p>
            )}
            {exchange.status === 'streaming' && exchange.answer && (
              <p className="companion-streaming-note" role="status" data-testid="companion-streaming-note">Réponse en cours de génération…</p>
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
                            <span className="companion-evidence-chip" key={(item.id || item.name) + ':' + itemIndex}>{item.name}</span>
                          ))}
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </details>
            ) : (
              <p className="companion-no-findings">Aucun constat n’a été relevé par cette revue.</p>
            )}
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
            <div className="companion-brand-mark" aria-hidden="true">✦</div>
            <div className="companion-heading">
              <h2 id="companion-title">Compagnon cartographe</h2>
              <p>Votre revue de cartographie d’entreprise</p>
            </div>
            <button type="button" className="companion-settings-toggle" aria-label="Configurer le fournisseur IA" data-testid="companion-settings-toggle" aria-expanded={showProviderSettings} onClick={() => setShowProviderSettings(value => !value)}>IA</button>
            <button type="button" className="companion-close" aria-label="Fermer le compagnon" data-testid="companion-close" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}>×</button>
          </div>

          <div className="companion-mode-note" role="note">
            <span className="companion-status-dot" aria-hidden="true" />
            <span>{providerSettings.enabled
              ? <><strong>Fournisseur actif : {PROVIDER_DEFAULTS[providerSettings.provider].label}</strong> · la question et le contexte métier seront transmis à ce fournisseur.</>
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
                  setProviderSettings(current => ({ ...current, provider, model: PROVIDER_DEFAULTS[provider].model, endpoint: PROVIDER_DEFAULTS[provider].endpoint }));
                  setApiKey('');
                }}>
                  {Object.entries(PROVIDER_DEFAULTS).map(([value, option]) => <option value={value} key={value}>{option.label}</option>)}
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
              <p className="companion-provider-warning">Attention : une clé saisie dans une application GitHub Pages n’est pas un secret inviolable. Ne l’utilise pas sur un appareil partagé. Lorsque le fournisseur est activé, la question, l’historique récent et les données métier utiles de la cartographie lui sont envoyés. Pour Ollama, le service local doit autoriser les requêtes CORS du navigateur.</p>
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
                  <span className="companion-avatar" aria-hidden="true">✦</span>
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
          <p className="companion-footer-note">Historique conservé pendant cette session · {providerSettings.enabled ? `fournisseur ${PROVIDER_DEFAULTS[providerSettings.provider].label} activé` : 'mode local, aucun envoi réseau'}</p>
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
        <span className="companion-launcher-icon" aria-hidden="true">{open ? '×' : '✦'}</span>
        <span>{open ? 'Fermer' : 'Compagnon'}</span>
        {!open && <span className="companion-launcher-status" aria-hidden="true" />}
      </button>
    </div>
  );
}
