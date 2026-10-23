import React, { useEffect, useRef, useState } from 'react';
import { analyzeCartography } from '../services/ai/cartographyAnalysis.js';

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
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const conversationRef = useRef(null);

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
    }]);
  };

  const submitQuestion = event => {
    event.preventDefault();
    if (!query.trim()) return;
    const normalized = query.toLocaleLowerCase('fr');
    const prompt = /couverture|gap|application|relation|redondance/.test(normalized)
      ? 'coverage'
      : /nom|intitul|doublon|capacit/.test(normalized)
        ? 'naming'
        : /structure|rattachement|n0|n1/.test(normalized)
          ? 'structure'
          : 'overview';
    runReview(prompt, query.trim());
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
                <p className="companion-answer-meta">{exchange.counts.total} point(s) détecté(s) · analyse locale</p>
              </div>
            </div>
            <p className="companion-answer-text" data-testid="companion-answer">{exchange.answer}</p>

            {exchange.observations.length > 0 ? (
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
            <p className="companion-disclaimer">Résultat indicatif des règles locales ; à valider avec le contexte métier.</p>
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
            <button type="button" className="companion-close" aria-label="Fermer le compagnon" data-testid="companion-close" onClick={() => { setOpen(false); triggerRef.current?.focus(); }}>×</button>
          </div>

          <div className="companion-mode-note" role="note">
            <span className="companion-status-dot" aria-hidden="true" />
            <span><strong>Analyse locale</strong> · aucune donnée transmise</span>
          </div>

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
                    <p>Posez une question en langage naturel. Pour le moment, elle oriente vers des contrôles locaux prédéfinis ; aucun modèle conversationnel n’est connecté.</p>
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
                placeholder="Posez une question sur votre cartographie…"
                autoComplete="off"
              />
              <button type="submit" aria-label="Envoyer la question" disabled={!query.trim()} data-testid="companion-submit">↑</button>
            </form>
          ) : (
            <p className="companion-guided-footer">Les résultats restent disponibles dans cet onglet. Passez en mode Conversation pour poser une question libre.</p>
          )}
          <p className="companion-footer-note">Historique conservé pendant cette session · pas encore de modèle conversationnel connecté</p>
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
