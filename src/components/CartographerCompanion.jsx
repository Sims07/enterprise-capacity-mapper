import React, { useEffect, useRef, useState } from 'react';
import { analyzeCartography } from '../services/ai/cartographyAnalysis.js';

const PROMPTS = [
  { id: 'overview', label: 'Évaluer la cartographie', icon: '✦' },
  { id: 'coverage', label: 'Vérifier la couverture', icon: '◉' },
  { id: 'naming', label: 'Revoir le nommage métier', icon: 'Aa' },
  { id: 'structure', label: 'Contrôler la structure', icon: '⌘' },
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
  const [result, setResult] = useState(null);
  const [askedQuestion, setAskedQuestion] = useState('');
  const [activePrompt, setActivePrompt] = useState(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    setResult(null);
    setActivePrompt(null);
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

  const runReview = (prompt, question = PROMPTS.find(item => item.id === prompt)?.label || 'Revue de la cartographie') => {
    const fullResult = analyzeCartography(model);
    const category = categoryForPrompt(prompt);
    const observations = category
      ? fullResult.observations.filter(item => item.category === category)
      : fullResult.observations;
    setActivePrompt(prompt);
    setAskedQuestion(question);
    setResult({
      prompt,
      summary: resultMessage(prompt, fullResult, observations),
      observations,
      counts: {
        total: observations.length,
        errors: observations.filter(item => item.severity === 'error').length,
        reviews: observations.filter(item => ['warning', 'review'].includes(item.severity)).length,
        suggestions: observations.filter(item => item.severity === 'suggestion').length,
      },
    });
    setQuery('');
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
  };

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

          <div className="companion-conversation" data-testid="companion-conversation" aria-live="polite">
            <div className="companion-welcome">
              <span className="companion-avatar" aria-hidden="true">✦</span>
              <div>
                <p className="companion-message-title">Bonjour, regardons votre cartographie.</p>
                <p>Je peux lancer les premiers contrôles de structure, de nommage et de couverture directement dans votre navigateur.</p>
              </div>
            </div>

            <p className="companion-section-label">QUE SOUHAITEZ-VOUS EXAMINER ?</p>
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
                  <span>{prompt.label}</span>
                  <span className="companion-prompt-arrow" aria-hidden="true">↗</span>
                </button>
              ))}
            </div>

            {result && askedQuestion && (
              <section className="companion-exchange" data-testid="companion-exchange" aria-label="Question et réponse">
                <p className="companion-exchange-label">Votre question</p>
                <p className="companion-user-question" data-testid="companion-user-question">{askedQuestion}</p>
                <p className="companion-exchange-label companion-answer-label">Réponse du compagnon</p>
              </section>
            )}

            {result && (
              <section className="companion-result" data-testid="companion-result" aria-labelledby="companion-result-title">
                <div className="companion-result-heading">
                  <span className="companion-result-icon" aria-hidden="true">✓</span>
                  <div>
                    <h3 id="companion-result-title" data-testid="companion-result-title">Résultat de la revue</h3>
                    <p>{result.counts.total} point(s) détecté(s) par les règles locales</p>
                  </div>
                </div>
                <p className="companion-result-summary">{result.summary}</p>
                {result.observations.length > 0 ? (
                  <div className="companion-observations">
                    {result.observations.map((observation, index) => (
                      <article className="companion-observation" key={observation.id + ':' + index}>
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
                ) : (
                  <div className="companion-empty-result">
                    <span aria-hidden="true">✓</span>
                    <p>Aucun point de vigilance détecté par ces contrôles.</p>
                    <small>Ce résultat ne garantit pas à lui seul la qualité métier de la cartographie.</small>
                  </div>
                )}
                <p className="companion-disclaimer">Ces contrôles sont déterministes et indicatifs. Toute décision d’architecture reste à valider par un humain.</p>
              </section>
            )}
          </div>

          <form className="companion-composer" onSubmit={submitQuestion}>
            <label className="companion-sr-only" htmlFor="companion-question">Question sur la cartographie</label>
            <input
              id="companion-question"
              data-testid="companion-question"
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Ex. : où sont les gaps de couverture ?"
              autoComplete="off"
            />
            <button type="submit" aria-label="Lancer une revue locale" disabled={!query.trim()} data-testid="companion-submit">↑</button>
          </form>
          <p className="companion-footer-note">Version initiale · pas encore de modèle conversationnel connecté</p>
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
