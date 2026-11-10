import React, { useState } from 'react';
import { buildDecisionBrief } from '../domain/cartographyAnalysis.ts';
import { GUIDED_REVIEW_LIMIT, resolveCompanionReview, type ReviewFinding } from '../domain/companionReview.ts';
import { companionRemediation, type CompanionRemediationAction } from '../domain/companionRemediation.ts';
import type { CatalogModel } from '../domain/catalogModel.ts';
import { Button } from './ui/Button.tsx';

type Evidence = { type: 'domain' | 'capability' | 'application'; id: string | null; name: string };
type Finding = ReviewFinding & { detail?: string; evidence?: Evidence[] };
type NavigateEvidence = { type: Evidence['type']; id: string; name: string };

export default function CompanionGuidedReview({ observations, model, onNavigateToEvidence, onRemediation }: {
  observations: Finding[];
  model: Pick<CatalogModel, 'domains' | 'capabilities' | 'applications'> & { layout?: { depth?: number } };
  onNavigateToEvidence?: (item: NavigateEvidence) => void;
  onRemediation?: (action: CompanionRemediationAction) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answersById, setAnswersById] = useState<Record<string, string[]>>({});
  const [showOthers, setShowOthers] = useState(false);

  if (!observations.length) return null;
  const priorities = buildDecisionBrief({ observations }).priorities;
  const preferredIds = priorities.map(item => item.id);
  const ordered = [
    ...preferredIds.map(id => observations.find(item => item.id === id)).filter((item): item is Finding => Boolean(item)),
    ...observations.filter(item => !preferredIds.includes(item.id)),
  ];
  const visible = showOthers ? ordered : ordered.slice(0, GUIDED_REVIEW_LIMIT);
  const active = observations.find(item => item.id === activeId);
  const answers = active ? answersById[active.id] ?? [] : [];
  const step = active ? resolveCompanionReview(active, answers) : null;
  const remediation = active ? companionRemediation(active, answers, model) : null;

  const selectAnswer = (id: string) => {
    if (!active) return;
    setAnswersById(previous => ({ ...previous, [active.id]: [...(previous[active.id] ?? []), id] }));
  };

  return (
    <section className="companion-guided-review" data-testid="companion-guided-review" aria-label="Qualification guidée des constats">
      <div className="companion-guided-review-heading">
        <h4>Approfondir un constat</h4>
        <p>Choisissez un point de vigilance. Les réponses préparent une piste de décision, sans modifier la cartographie.</p>
      </div>
      <div className="companion-guided-review-list">
        {visible.map(item => {
          const completed = resolveCompanionReview(item, answersById[item.id] ?? []).status === 'completed';
          return (
            <Button key={item.id} variant={activeId === item.id ? 'secondary' : 'quiet'}
              className="companion-guided-review-item"
              data-testid="companion-review-item" data-rule-id={item.ruleId}
              aria-pressed={activeId === item.id}
              onClick={() => setActiveId(item.id)}>
              <span className="companion-guided-review-item-label">{item.title}<small>{item.evidence?.map(ref => ref.name).filter(Boolean).join(' · ')}</small></span>
              <span aria-hidden="true">{completed ? '✓' : '›'}</span>
            </Button>
          );
        })}
      </div>
      {ordered.length > GUIDED_REVIEW_LIMIT && (
        <Button variant="quiet" className="companion-guided-review-more" data-testid="companion-review-more" onClick={() => setShowOthers(value => !value)}>
          {showOthers ? 'Réduire la liste' : `Voir les autres constats (${ordered.length - GUIDED_REVIEW_LIMIT})`}
        </Button>
      )}
      {active && step && (
        <div className="companion-guided-review-detail" data-testid="companion-review-detail" aria-live="polite">
          <strong>{active.title}</strong>
          {active.detail && <p className="companion-guided-review-context">{active.detail}</p>}
          {active.evidence?.some(ref => Boolean(ref.id)) && (
            <div className="companion-guided-review-evidence">
              {active.evidence.filter((ref): ref is Evidence & { id: string } => Boolean(ref.id)).map(ref => (
                <Button variant="quiet" key={ref.type + ':' + ref.id}
                  data-testid="companion-review-evidence" onClick={() => onNavigateToEvidence?.({ type: ref.type, id: ref.id, name: ref.name })}>
                  {ref.name}
                </Button>
              ))}
            </div>
          )}
          {step.status === 'question' ? (
            <div className="companion-guided-review-question">
              <p className="companion-guided-review-prompt" data-testid="companion-review-question">{step.prompt}</p>
              <div className="companion-guided-review-choices">
                {step.choices.map(choice => (
                  <Button variant="secondary" key={choice.id} data-testid={`companion-review-answer-${choice.id}`}
                    onClick={() => selectAnswer(choice.id)}>{choice.label}</Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="companion-guided-review-conclusion" data-testid="companion-review-conclusion">
              <strong>{step.classification}</strong>
              <p><b>Piste à examiner :</b> {step.action}</p>
              <small>Qualification déclarative, conservée uniquement pendant cette session. Aucune modification automatique ni score de risque déduit.</small>
              {remediation?.state === 'available' && onRemediation && (
                <div className="companion-guided-review-actions" data-testid="companion-review-actions">
                  {remediation.actions.map((action, index) => (
                    <Button key={action.kind} variant={index === 0 ? 'primary' : 'secondary'}
                      data-testid={`companion-review-action-${action.kind}`}
                      onClick={() => onRemediation(action)}>{action.label}</Button>
                  ))}
                </div>
              )}
              {remediation?.state === 'relation-added' && (
                <p className="companion-guided-review-updated" data-testid="companion-review-updated" role="status">
                  Une relation est maintenant déclarée dans la cartographie. Relancez l’analyse pour actualiser les constats ; cela ne prouve pas à lui seul une couverture fonctionnelle suffisante.
                </p>
              )}
            </div>
          )}
          {answers.length > 0 && (
            <Button variant="quiet" className="companion-guided-review-restart" data-testid="companion-review-restart"
              onClick={() => setAnswersById(previous => ({ ...previous, [active.id]: [] }))}>
              Recommencer la qualification
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
