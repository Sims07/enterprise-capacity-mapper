import React, { useState } from 'react';
import type { Application, CatalogModel } from '../domain/catalogModel.ts';
import { analyzeApplicationRisks, validateApplicationRisk, RISK_SCALE, RISK_CATEGORIES, RISK_STATUSES, RISK_LEVELS, SUPPORT_WARNING_DAYS, type ApplicationRisk, type RiskLevel } from '../domain/applicationRisk.ts';
import { Button } from './ui/Button.tsx';
import { Field, SelectField, TextareaField } from './ui/Fields.tsx';
import { Modal } from './ui/Modal.tsx';

const options = (labels: Record<string, string>) => Object.entries(labels).map(([value, label]) => ({ value, label }));
const scaleOptions = [{ value: '', label: 'À qualifier' }, ...RISK_SCALE.map(value => ({ value: String(value), label: String(value) }))];
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};
const Badge = ({ level }: { level: RiskLevel }) => <span className={`risk-badge is-${level}`}>{RISK_LEVELS[level]}</span>;

function RiskEditor({ application, onSave, onClose }: { application: Application; onSave: (risk: ApplicationRisk) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<ApplicationRisk>({ ...application.risk });
  const [error, setError] = useState('');
  const change = (field: keyof ApplicationRisk, value: unknown) => setDraft(previous => ({ ...previous, [field]: value === '' ? undefined : value }));
  return <Modal title={`Risque · ${application.name}`} onClose={onClose}>
    <form className="risk-form" onSubmit={event => {
      event.preventDefault();
      try { onSave(validateApplicationRisk(draft)); onClose(); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Impossible d’enregistrer le risque.'); }
    }}>
      <p>Qualifiez le principal risque de cette application. La fin de support produit une alerte indépendante du score déclaré.</p>
      <SelectField label="Catégorie du risque" value={draft.category ?? ''} options={[{ value: '', label: 'À qualifier' }, ...options(RISK_CATEGORIES)]} onChange={e => change('category', e.target.value)} />
      <div className="risk-form-grid">
        <SelectField label="Probabilité (1 à 5)" hint="1 : rare · 5 : quasi certaine" value={draft.likelihood ?? ''} options={scaleOptions} onChange={e => change('likelihood', e.target.value ? Number(e.target.value) : '')} />
        <SelectField label="Impact métier (1 à 5)" hint="1 : mineur · 5 : majeur" value={draft.impact ?? ''} options={scaleOptions} onChange={e => change('impact', e.target.value ? Number(e.target.value) : '')} />
      </div>
      <Field label="Fin de support" type="date" value={draft.supportEndDate ?? ''} onChange={e => change('supportEndDate', e.target.value)} hint={`Alerte à ${SUPPORT_WARNING_DAYS} jours, risque élevé à échéance.`} />
      <TextareaField required={draft.status === 'accepted'} label="Justification et éléments constatés" value={draft.rationale ?? ''} onChange={e => change('rationale', e.target.value)} />
      <SelectField label="Décision de traitement" value={draft.status ?? 'open'} options={options(RISK_STATUSES)} onChange={e => change('status', e.target.value)} />
      <div className="risk-form-grid">
        <Field label="Responsable" required={draft.status === 'accepted'} value={draft.owner ?? ''} onChange={e => change('owner', e.target.value)} />
        <Field label={draft.status === 'accepted' ? 'Date de réexamen' : 'Échéance de traitement'} required={draft.status === 'accepted'} type="date" value={draft.dueDate ?? ''} onChange={e => change('dueDate', e.target.value)} />
      </div>
      <TextareaField label="Plan d’action ou action réalisée" required={draft.status === 'resolved'} value={draft.mitigation ?? ''} onChange={e => change('mitigation', e.target.value)} />
      {error && <p role="alert" className="field-error">{error}</p>}
      <div className="risk-actions"><Button variant="quiet" onClick={onClose}>Annuler</Button><Button variant="primary" type="submit">Enregistrer le risque</Button></div>
    </form>
  </Modal>;
}

export default function RiskAnalysis({ model, onUpdateRisk, onExploreTarget, onExport }: {
  model: CatalogModel;
  onUpdateRisk: (id: string, risk: ApplicationRisk) => void;
  onExploreTarget: (id: string) => void;
  onExport?: (content: string) => void;
}) {
  const asOf = today();
  const analysis = analyzeApplicationRisks(model, asOf);
  const [editing, setEditing] = useState<Application | null>(null);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [domainId, setDomainId] = useState('all');
  const urgent = analysis.applications.filter(item => item.actionable && ['high', 'critical'].includes(item.level));
  const unknown = analysis.applications.filter(item => item.needsQualification);
  const overdue = analysis.applications.filter(item => item.overdue);
  const domainApps = domainId === 'all' ? null : new Set(analysis.domains.find(domain => domain.id === domainId)?.applications.map(item => item.application.id));
  const visible = analysis.applications.filter(item => (!domainApps || domainApps.has(item.application.id))
    && item.application.name.toLocaleLowerCase('fr').includes(query.trim().toLocaleLowerCase('fr'))
    && (filter === 'all' || (filter === 'urgent' && urgent.includes(item)) || (filter === 'unknown' && item.needsQualification)
      || (filter === 'overdue' && item.overdue) || filter === item.status));
  const exportReview = () => {
    const clean = (value: unknown) => String(value ?? '—').replace(/[\r\n]+/g, ' ');
    onExport?.([`# Analyse des risques — ${asOf}`, '', 'Périmètre : applications actuelles. Score déclaré = probabilité × impact ; seuils 5 / 10 / 17. Une acceptation conserve l’exposition.', '',
      ...visible.flatMap(item => [`## ${clean(item.application.name)}`, `- Niveau : ${RISK_LEVELS[item.level]} · score déclaré : ${item.score ?? 'À qualifier'}/25 · ${RISK_STATUSES[item.status]}`,
        `- Fin de support : ${clean(item.risk.supportEndDate)} · responsable : ${clean(item.risk.owner)} · échéance : ${clean(item.risk.dueDate)}`,
        `- Capacités : ${analysis.targets.filter(target => target.applications.includes(item)).map(target => clean(target.name)).join(', ') || 'Sans relation'}`,
        `- Justification : ${clean(item.risk.rationale)}`, `- Action : ${clean(item.risk.mitigation)}`, ''])].join('\n'));
  };
  return <section className="risk-analysis dashboard-panel" aria-label="Analyse des risques" data-testid="risk-analysis">
    <div className="dashboard-panel-heading"><div><span className="attention-eyebrow">RISQUES ET RÉSILIENCE</span><h2>Quelles capacités sont exposées ?</h2><p>Identifiez les applications à traiter, puis suivez leur impact métier et les actions décidées.</p></div><Button onClick={exportReview} disabled={!visible.length}>Exporter l’analyse</Button></div>
    <div className="risk-metrics" aria-label="Indicateurs de risque">
      <div><strong>{urgent.length}</strong><span>Risques élevés à traiter</span></div>
      <div><strong>{unknown.length}</strong><span>Applications à qualifier</span></div>
      <div><strong>{overdue.length}</strong><span>Échéances dépassées</span></div>
      <div><strong>{analysis.applications.filter(item => item.status === 'accepted').length}</strong><span>Risques acceptés</span></div>
    </div>
    <details className="risk-method"><summary>Comprendre les niveaux de risque</summary><p>Score déclaré = probabilité × impact, de 1 à 25 : faible 1–4, modéré 5–9, élevé 10–16, critique 17–25. Une fin de support atteinte impose au moins un niveau élevé ; une échéance dans les {SUPPORT_WARNING_DAYS} prochains jours impose au moins un niveau modéré. Le niveau retenu est le plus fort des deux signaux.</p><p>L’exposition d’une capacité ou d’un domaine est le niveau maximal de ses applications actuelles non résolues. Une acceptation conserve le risque visible et revient à traiter après sa date de réexamen. « En traitement » ne diminue pas le niveau. Une résolution déclarée sort de l’exposition ; vérifiez sa justification. Les données manquantes restent signalées séparément, même lorsqu’une alerte de support existe.</p><p>Cette évaluation porte sur le risque principal déclaré et la fin de support de l’application. {analysis.plannedCount} application(s) au statut Cible sont exclues de l’exposition actuelle. Aucun catalogue de composants ou de vulnérabilités externe n’est interrogé.</p></details>
    <h3>Exposition par domaine</h3>
    <div className="risk-domain-grid">{analysis.domains.map(domain => <article key={domain.id} className="risk-domain">
      <strong>{domain.name}</strong>{domain.applications.length > 0 && domain.applications.every(item => item.status === 'resolved') ? <span className="risk-badge">Risques déclarés résolus</span> : <Badge level={domain.level} />}<small>{domain.applications.length} application(s) · {domain.unknownCount} à qualifier</small>
      {domain.applications.length === 0 && <small>Aucun support actuel : couverture à examiner.</small>}
      <Button variant="quiet" aria-pressed={domainId === domain.id} onClick={() => setDomainId(domainId === domain.id ? 'all' : domain.id)}>{domainId === domain.id ? 'Retirer le filtre' : 'Examiner ce domaine'}</Button>
    </article>)}</div>
    {(model.layout as { depth?: number })?.depth !== 1 && <details className="risk-method"><summary>Exposition des capacités N1</summary><div className="risk-capability-grid">{analysis.targets.map(target => <article key={target.id} className="risk-domain"><Button variant="quiet" onClick={() => onExploreTarget(target.id)}>{target.name}</Button>{target.applications.length > 0 && target.applications.every(item => item.status === 'resolved') ? <span className="risk-badge">Risques déclarés résolus</span> : <Badge level={target.level} />}<small>{target.applications.length} application(s) · {target.unknownCount} à qualifier</small></article>)}</div></details>}
    <div className="risk-filters">
      <Field label="Rechercher une application" type="search" value={query} onChange={e => setQuery(e.target.value)} />
      <SelectField label="Afficher les risques" value={filter} onChange={e => setFilter(e.target.value)} options={[{ value: 'all', label: 'Tous les risques' }, { value: 'urgent', label: 'Élevés et critiques à traiter' }, { value: 'unknown', label: 'À qualifier' }, { value: 'overdue', label: 'Échéance dépassée' }, ...options(RISK_STATUSES)]} />
      <SelectField label="Domaine" value={domainId} onChange={e => setDomainId(e.target.value)} options={[{ value: 'all', label: 'Tous les domaines' }, ...analysis.domains.map(domain => ({ value: domain.id, label: domain.name }))]} />
    </div>
    <p aria-live="polite">{visible.length} application(s) affichée(s) sur {analysis.applications.length} actuelles</p>
    <div className="risk-register">{visible.map(item => <article className="risk-entry" key={item.application.id} data-testid={`risk-application-${item.application.id}`}>
      <div className="risk-entry-heading"><div><h3>{item.application.name}</h3><span>{item.risk.category ? RISK_CATEGORIES[item.risk.category] : 'Catégorie à qualifier'} · {RISK_STATUSES[item.status]}</span></div>{item.status === 'resolved' ? <span className="risk-badge">Résolu</span> : <Badge level={item.level} />}</div>
      <div className="risk-entry-facts"><span>Score déclaré : <strong>{item.score === null ? 'À qualifier' : `${item.score}/25`}</strong></span><span>Support : <strong>{item.support === 'expired' ? 'Échéance atteinte' : item.support === 'upcoming' ? 'Fin proche' : item.support === 'supported' ? 'Date future' : 'Date inconnue'}</strong>{item.risk.supportEndDate && ` · ${item.risk.supportEndDate}`}</span><span>Responsable : {item.risk.owner || 'À désigner'}</span>{item.risk.dueDate && <span>Échéance : {item.risk.dueDate}{item.overdue && ' · Dépassée'}</span>}</div>
      {item.status === 'resolved' && <p>Risque déclaré résolu · niveau initial : {RISK_LEVELS[item.inherentLevel]}</p>}
      {item.risk.rationale && <p>{item.risk.rationale}</p>}{item.risk.mitigation && <p><strong>Action :</strong> {item.risk.mitigation}</p>}
      <div className="risk-targets"><span>Capacités concernées :</span>{analysis.targets.filter(target => target.applications.includes(item)).map(target => <Button variant="quiet" key={target.id} onClick={() => onExploreTarget(target.id)}>{target.name}</Button>)}{!item.application.capabilityIds?.length && <span>Aucune relation documentée</span>}</div>
      <Button onClick={() => setEditing(item.application)} aria-label={`Évaluer le risque de ${item.application.name}`}>Évaluer et traiter</Button>
    </article>)}</div>
    {!visible.length && <p className="attention-empty">Aucune application dans ce périmètre. Modifiez les filtres ou ajoutez des applications actuelles à la cartographie.</p>}
    {editing && <RiskEditor application={editing} onClose={() => setEditing(null)} onSave={risk => onUpdateRisk(editing.id, risk)} />}
  </section>;
}
