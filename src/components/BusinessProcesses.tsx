import React, { useState } from 'react';
import type { BusinessProcess, CatalogModel } from '../domain/catalogModel.ts';
import { analyzeBusinessProcesses, processCapabilityTargets } from '../domain/businessProcesses.ts';
import { RISK_LEVELS } from '../domain/applicationRisk.ts';
import { Button } from './ui/Button.tsx';
import { CheckboxField, Field, SelectField, TextareaField } from './ui/Fields.tsx';
import { Modal } from './ui/Modal.tsx';

const capabilityPath = (model: CatalogModel, target: { name: string; domainId?: unknown }) => {
  const domain = model.domains.find(item => item.id === target.domainId);
  return domain ? `${domain.name} / ${target.name}` : target.name;
};

function ProcessEditor({ model, process, onSave, onClose }: { model: CatalogModel; process: BusinessProcess;
  onSave: (draft: BusinessProcess) => void; onClose: () => void }) {
  const [draft, setDraft] = useState<BusinessProcess>({ ...process, capabilityIds: [...process.capabilityIds] });
  const [error, setError] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [query, setQuery] = useState('');
  const depth = (model.layout as { depth?: number })?.depth === 1 ? 1 : 2;
  const targets = processCapabilityTargets(model);
  const visible = targets.filter(target => target.name.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr').trim()));
  return <Modal title={process.id ? 'Modifier le processus métier' : 'Ajouter un processus métier'} onClose={onClose}>
    <form className="process-form" onSubmit={event => {
      event.preventDefault();
      if (!draft.name.trim()) { setNameInvalid(true); return; }
      try { onSave(draft); onClose(); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Impossible d’enregistrer le processus.'); }
    }}>
      <p>Décrivez le déroulement métier et les capacités qu’il mobilise. Exemple : « Traiter une commande client ».</p>
      <Field label="Nom du processus" required value={draft.name} error={nameInvalid ? 'Renseignez un nom de processus.' : undefined}
        onInvalid={() => setNameInvalid(true)} onChange={e => { setDraft(previous => ({ ...previous, name: e.target.value })); setNameInvalid(false); }} />
      <div className="process-form-grid">
        <Field label="Code du processus" value={draft.code ?? ''} onChange={e => setDraft(previous => ({ ...previous, code: e.target.value }))} />
        <Field label="Responsable du processus" value={draft.owner ?? ''} onChange={e => setDraft(previous => ({ ...previous, owner: e.target.value }))} />
      </div>
      <TextareaField label="Description du processus" value={draft.description ?? ''} onChange={e => setDraft(previous => ({ ...previous, description: e.target.value }))} />
      <Field label="Lien de documentation" type="url" hint="Lien HTTP ou HTTPS vers une procédure ou un diagramme métier." value={draft.documentationUrl ?? ''} onChange={e => setDraft(previous => ({ ...previous, documentationUrl: e.target.value }))} />
      <fieldset className="process-capability-picker"><legend>{depth === 1 ? 'Domaines N0 mobilisés' : 'Capacités N1 mobilisées'} · {draft.capabilityIds.length} sélectionné(s)</legend>
        <Field label="Rechercher une capacité" type="search" value={query} onChange={e => setQuery(e.target.value)} />
        <div className="process-capability-options">{model.domains.map(domain => {
          const choices = visible.filter(target => depth === 1 ? target.id === domain.id : (target as { domainId?: string }).domainId === domain.id);
          return choices.length > 0 && <div key={domain.id}><strong>{domain.name}</strong>{choices.map(target => <CheckboxField key={target.id}
            label={target.name} checked={draft.capabilityIds.includes(target.id)} onChange={e => setDraft(previous => ({ ...previous,
              capabilityIds: e.target.checked ? [...previous.capabilityIds, target.id] : previous.capabilityIds.filter(id => id !== target.id) }))} />)}</div>;
        })}</div>
        {!visible.length && <p>Aucune capacité ne correspond à la recherche.</p>}
        <small>Un processus peut mobiliser plusieurs capacités. Sans rattachement, il restera signalé « À rattacher ».</small>
      </fieldset>
      {error && <p className="field-error" role="alert">{error}</p>}
      <div className="process-actions"><Button variant="quiet" onClick={onClose}>Annuler</Button><Button variant="primary" type="submit">Enregistrer le processus</Button></div>
    </form>
  </Modal>;
}

export default function BusinessProcesses({ model, onSave, onRemove, onExploreTarget, onShowRisks }: {
  model: CatalogModel; onSave: (draft: BusinessProcess) => void; onRemove: (id: string) => void;
  onExploreTarget: (id: string) => void; onShowRisks: () => void;
}) {
  const [editing, setEditing] = useState<BusinessProcess | null>(null);
  const [removing, setRemoving] = useState<BusinessProcess | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [targetId, setTargetId] = useState('all');
  const [filter, setFilter] = useState('all');
  const now = new Date();
  const asOf = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const analysis = analyzeBusinessProcesses(model, asOf);
  const targets = processCapabilityTargets(model);
  const visible = analysis.filter(item => [item.process.name, item.process.code, item.process.owner].join(' ').toLocaleLowerCase('fr').includes(search.trim().toLocaleLowerCase('fr'))
    && (targetId === 'all' || item.process.capabilityIds.includes(targetId))
    && (filter === 'all' || filter === 'unlinked' && item.capabilities.length === 0 || filter === 'exposed' && item.exposedApplications.length > 0));
  return <section className="dashboard-panel process-analysis" data-testid="business-processes" aria-label="Processus métier">
    <div className="dashboard-panel-heading"><div><span className="attention-eyebrow">ARCHITECTURE MÉTIER</span><h2>Quels processus mobilisent vos capacités ?</h2><p>Décrivez les processus, reliez leurs capacités et examinez les applications et risques associés.</p></div>
      <Button variant="primary" onClick={() => setEditing({ id: '', name: '', capabilityIds: [] })}>Ajouter un processus</Button></div>
    <div className="process-metrics"><div><strong>{analysis.length}</strong><span>Processus documentés</span></div><div><strong>{analysis.filter(item => !item.capabilities.length).length}</strong><span>À rattacher aux capacités</span></div><div><strong>{analysis.filter(item => item.exposedApplications.length > 0).length}</strong><span>Avec une exposition élevée ou critique</span></div></div>
    <details className="process-method"><summary>Processus, capacités et applications : comment les lire ?</summary><p>Une capacité décrit ce que l’entreprise sait faire ; un processus décrit comment le travail se déroule. Un même processus mobilise plusieurs capacités, et une capacité peut intervenir dans plusieurs processus.</p><p>Les applications ci-dessous sont déduites des relations entre capacités et applications. Elles ne prouvent pas un usage direct dans le processus ni sa couverture fonctionnelle. Les applications Cible sont comptées à part. Les risques élevés ou critiques non résolus, y compris acceptés, sont signalés comme exposition indirecte.</p></details>
    <div className="process-filters"><Field label="Rechercher un processus" type="search" value={search} onChange={e => setSearch(e.target.value)} />
      <SelectField label="Filtrer par capacité" value={targetId} onChange={e => setTargetId(e.target.value)} options={[{ value: 'all', label: 'Toutes les capacités' }, ...targets.map(target => ({ value: target.id, label: capabilityPath(model, target) }))]} />
      <SelectField label="Afficher les processus" value={filter} onChange={e => setFilter(e.target.value)} options={[{ value: 'all', label: 'Tous les processus' }, { value: 'unlinked', label: 'À rattacher' }, { value: 'exposed', label: 'Exposition élevée ou critique' }]} /></div>
    <p aria-live="polite">{visible.length} processus affiché(s) sur {analysis.length}</p>
    {visible.length ? <div className="process-register">{visible.map(item => <article className="process-entry" key={item.process.id} data-testid={`business-process-${item.process.id}`}>
      <div className="process-entry-heading"><div><h3>{item.process.name}</h3><p>{item.process.code && `${item.process.code} · `}Responsable : {item.process.owner || 'À désigner'}</p></div><div className="process-actions"><Button onClick={() => setEditing(item.process)} aria-label={`Modifier le processus ${item.process.name}`}>Modifier</Button><Button variant="quiet" onClick={() => { setError(''); setRemoving(item.process); }} aria-label={`Supprimer le processus ${item.process.name}`}>Supprimer</Button></div></div>
      {item.process.description && <p>{item.process.description}</p>}
      {item.process.documentationUrl && <a href={item.process.documentationUrl} target="_blank" rel="noopener noreferrer">Consulter la documentation ↗</a>}
      <div className="process-capability-links"><strong>Capacités mobilisées</strong>{item.capabilities.map(target => <Button variant="quiet" key={target.id} onClick={() => onExploreTarget(target.id)}>{capabilityPath(model, target)}</Button>)}{!item.capabilities.length && <span className="risk-badge is-unknown">À rattacher</span>}</div>
      <details className="process-method"><summary>{item.currentApplications.length} application(s) actuelle(s) liée(s) aux capacités · {item.plannedApplications.length} cible(s)</summary><p>{item.currentApplications.map(app => app.name).join(' · ') || 'Aucune relation applicative actuelle documentée.'}</p>{item.plannedApplications.length > 0 && <p>Cible : {item.plannedApplications.map(app => app.name).join(' · ')}</p>}{item.unsupportedCapabilities.length > 0 && <p>Sans relation applicative actuelle : {item.unsupportedCapabilities.map(target => target.name).join(' · ')}</p>}</details>
      {item.exposedApplications.length > 0 && <div className="process-risk-exposure"><strong>Exposition indirecte via les capacités</strong><ul>{item.exposedApplications.map(risk => <li key={risk.application.id}>{risk.application.name} · {RISK_LEVELS[risk.level]}{risk.status === 'accepted' && ' · Risque accepté'}</li>)}</ul><Button variant="quiet" onClick={onShowRisks}>Examiner les risques applicatifs</Button></div>}
    </article>)}</div> : <div className="attention-empty">{analysis.length ? 'Aucun processus ne correspond aux filtres.' : 'Ajoutez votre premier processus métier, puis sélectionnez les capacités qu’il mobilise.'}</div>}
    {editing && <ProcessEditor model={model} process={editing} onSave={onSave} onClose={() => setEditing(null)} />}
    {removing && <Modal title="Supprimer le processus métier" onClose={() => setRemoving(null)}><p>Retirer le processus « {removing.name} » du registre ?</p>{error && <p role="alert" className="field-error">{error}</p>}<div className="process-actions"><Button variant="quiet" onClick={() => setRemoving(null)}>Annuler</Button><Button variant="danger" onClick={() => { try { onRemove(removing.id); setRemoving(null); } catch (failure) { setError(failure instanceof Error ? failure.message : 'Impossible de supprimer le processus.'); } }}>Confirmer la suppression</Button></div></Modal>}
  </section>;
}
