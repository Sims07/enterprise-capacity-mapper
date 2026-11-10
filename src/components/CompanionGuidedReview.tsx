import React, { useEffect, useRef, useState } from 'react';
import { buildDecisionBrief } from '../domain/cartographyAnalysis.ts';
import { GUIDED_REVIEW_LIMIT, resolveCompanionReview, type ReviewFinding } from '../domain/companionReview.ts';
import { companionRemediation, type CompanionRemediationAction } from '../domain/companionRemediation.ts';
import type { CatalogModel } from '../domain/catalogModel.ts';
import { Button } from './ui/Button.tsx';

type Evidence = { type: 'domain' | 'capability' | 'application'; id: string | null; name: string };
type Finding = ReviewFinding & { detail?: string; evidence?: Evidence[] };
type NavigateEvidence = { type: Evidence['type']; id: string; name: string };

export default function CompanionGuidedReview({ observations, resolvedCount = 0, reviewCategory, model, onNavigateToEvidence, onRemediation }: {
  observations: Finding[];
  resolvedCount?: number;
  reviewCategory?: string;
  model: Pick<CatalogModel, 'domains' | 'capabilities' | 'applications'> & { layout?: { depth?: number } };
  onNavigateToEvidence?: (item: NavigateEvidence) => void;
  onRemediation?: (action: CompanionRemediationAction) => void;
}) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [answersById, setAnswersById] = useState<Record<string, string[]>>({});
  const [showOthers, setShowOthers] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);

  const priorities = buildDecisionBrief({ observations }).priorities;
  const preferredIds = priorities.map(item => item.id);
  const ordered = [
    ...preferredIds.map(id => observations.find(item => item.id === id)).filter((item): item is Finding => Boolean(item)),
    ...observations.filter(item => !preferredIds.includes(item.id)),
  ];
  const visible = showOthers ? ordered : ordered.slice(0, GUIDED_REVIEW_LIMIT);
  // One finding needs no selection step: show its qualification immediately.
  const singleFinding = ordered.length === 1;
  const active = singleFinding ? ordered[0] : observations.find(item => item.id === activeId);
  const answers = active ? answersById[active.id] ?? [] : [];
  const step = active ? resolveCompanionReview(active, answers) : null;
  const remediation = active ? companionRemediation(active, answers, model) : null;

  // Keep the proposed action visible in the scrollable companion after answering.
  useEffect(() => {
    if (step?.status === 'completed' && remediation?.state === 'available') {
      actionRef.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [active?.id, step?.status, remediation?.state]);

  const selectAnswer = (id: string) => {
    if (!active) return;
    setAnswersById(previous => ({ ...previous, [active.id]: [...(previous[active.id] ?? []), id] }));
  };

  if (!observations.length && !resolvedCount) return null;

  return (
    <section className={`companion-guided-review${singleFinding ? ' is-single' : ''}`} data-testid="companion-guided-review" aria-label="Qualification guidée des constats">
      {resolvedCount > 0 && (
        <div className="companion-guided-review-resolved" data-testid="companion-review-updated" role="status">
          <strong>{observations.length === 0
            ? 'Constat levé dans la cartographie actuelle'
            : `${resolvedCount} constat${resolvedCount > 1 ? 's' : ''} levé${resolvedCount > 1 ? 's' : ''} depuis l’analyse initiale`}</strong>
          <p>{observations.length === 0
            ? 'Ce constat n’est plus détecté dans la cartographie actuelle. Aucun écart de cette analyse ne reste actif.'
            : `La cartographie a évolué : ${observations.length} constat${observations.length > 1 ? 's' : ''} reste${observations.length > 1 ? 'nt' : ''} à examiner.`}
          </p>
          <small>{reviewCategory === 'coverage' ? 'Une liaison déclarée ne garantit pas à elle seule une couverture fonctionnelle suffisante.' : 'La disparition d’un constat automatique ne remplace pas la validation métier.'}</small>
        </div>
      )}
      {observations.length > 0 && <div className="companion-guided-review-heading">
        <h4>{singleFinding ? 'Et maintenant ?' : 'Approfondir un constat'}</h4>
        <p>{singleFinding
          ? 'Un seul point à examiner : répondez à la question pour obtenir une action adaptée.'
          : 'Choisissez un constat à examiner. Le compagnon vous guidera jusqu’à une action concrète.'}</p>
      </div>}
      {!singleFinding && <div className="companion-guided-review-list">
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
      </div>}
      {ordered.length > GUIDED_REVIEW_LIMIT && (
        <Button variant="quiet" className="companion-guided-review-more" data-testid="companion-review-more" onClick={() => setShowOthers(value => !value)}>
          {showOthers ? 'Réduire la liste' : `Voir les autres constats (${ordered.length - GUIDED_REVIEW_LIMIT})`}
        </Button>
      )}
      {active && step && (
        <div className="companion-guided-review-detail" data-testid="companion-review-detail" aria-live="polite">
          <div className="companion-guided-review-focus">
            <span className="companion-guided-review-eyebrow">Constat à qualifier</span>
            <strong>{active.title}</strong>
          </div>
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
              {remediation?.state === 'available' && onRemediation && (
                <div className="companion-guided-review-actions" ref={actionRef} data-testid="companion-review-actions">
                  <span className="companion-guided-review-action-heading">Passer à l’action</span>
                  {remediation.actions.map((action, index) => (
                    <Button key={action.kind} variant={index === 0 ? 'primary' : 'secondary'}
                      data-testid={`companion-review-action-${action.kind}`}
                      onClick={() => onRemediation(action)}>{action.label}</Button>
                  ))}
                  <small>Une fenêtre de confirmation s’ouvrira. Aucun changement n’est enregistré sans votre accord.</small>
                </div>
              )}
              {remediation?.state !== 'available' && <small>Ce constat demande une validation métier. Aucune modification automatique ni score de risque déduit.</small>}
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
