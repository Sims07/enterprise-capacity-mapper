import React from 'react';
import type { Application, Capability } from '../domain/catalogModel.ts';
import type { capabilityMapReadout } from '../application/capabilityMapReadout.ts';
import { Button } from './ui/Button.tsx';

type CapabilityReadout = ReturnType<typeof capabilityMapReadout>;

export type PresentationCapabilityDetailProps = {
  capability: Capability;
  domainName?: string;
  currentApplications: Application[];
  targetApplications: Application[];
  readout: CapabilityReadout;
  onClose: () => void;
};

function ApplicationGroup({ title, applications, kind }: {
  title: string;
  applications: Application[];
  kind: 'current' | 'target';
}) {
  return <section className="presentation-detail-app-group" data-kind={kind} data-empty={applications.length === 0}>
    <header className="presentation-detail-app-heading">
      <div className="presentation-detail-app-heading-label">
        <span className="presentation-detail-kind-mark" aria-hidden="true" />
        <h4>{title}</h4>
        <span className="presentation-detail-app-count">{applications.length}</span>
      </div>
    </header>
    {applications.length ? <ul className="presentation-detail-app-list" data-testid={kind === 'current' ? 'presentation-current-apps' : 'presentation-target-apps'}>
      {applications.map(application => <li className="presentation-detail-app-item" key={application.id}>
        <span className="presentation-detail-app-symbol" aria-hidden="true">▦</span>
        <div className="presentation-detail-app-body">
          <strong>{application.name}</strong>
          {application.code && <small>{application.code}</small>}
        </div>
        <span className="presentation-detail-app-status">{application.status || (kind === 'target' ? 'Cible' : 'Statut non renseigné')}</span>
      </li>)}
    </ul> : <p className="presentation-detail-app-empty">{kind === 'current'
      ? 'Aucune application actuelle rattachée.'
      : 'Aucune application cible rattachée.'}</p>}
  </section>;
}

/** Fiche de restitution N1 : relations applicatives d'abord, évaluations déclarées ensuite. */
export default function PresentationCapabilityDetail({
  capability,
  domainName,
  currentApplications,
  targetApplications,
  readout,
  onClose,
}: PresentationCapabilityDetailProps) {
  const applicationCount = currentApplications.length + targetApplications.length;
  return <section className="presentation-focus-sheet presentation-capability-detail" role="dialog" aria-modal="true"
    aria-label={'Détail de ' + capability.name} data-testid="presentation-capability-detail">
    <header className="presentation-detail-header">
      <div className="presentation-detail-identity">
        <p className="presentation-detail-eyebrow">Cartographie <span aria-hidden="true">/</span> {domainName || 'Domaine N0'} <span aria-hidden="true">/</span> Capacité N1</p>
        <div className="presentation-detail-title-row">
          <h2>{capability.name}</h2>
          {capability.code && <span className="presentation-detail-code">{capability.code}</span>}
        </div>
        {capability.description?.trim() && <p className="presentation-detail-description">{capability.description.trim()}</p>}
      </div>
      <Button variant="icon" autoFocus aria-label="Fermer le détail" title="Fermer la fiche"
        data-testid="presentation-focus-close" onClick={onClose}>×</Button>
    </header>

    <section className="presentation-detail-landscape" aria-label="Patrimoine applicatif">
      <div className="presentation-detail-landscape-top">
        <div className="presentation-detail-landscape-heading">
          <span className="presentation-detail-section-label">PATRIMOINE APPLICATIF</span>
          <h3>Applications associées</h3>
          <p>Relations déclarées avec cette capacité métier</p>
        </div>
        <div className="presentation-detail-total">
          <strong data-testid="presentation-app-total">{applicationCount}</strong>
          <span>application{applicationCount > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="presentation-detail-application-groups"
        data-one-sided={currentApplications.length === 0 || targetApplications.length === 0}>
        <ApplicationGroup kind="current" title="Applications actuelles" applications={currentApplications} />
        <ApplicationGroup kind="target" title="Applications cibles" applications={targetApplications} />
      </div>
    </section>

    <section className="presentation-detail-assessment" aria-label="Évaluation métier">
      <div className="presentation-detail-assessment-heading">
        <h3>Évaluation métier</h3>
        <p>Valeurs déclarées, indépendantes du nombre d’applications</p>
      </div>
      <dl className="presentation-detail-assessment-list">
        <div><dt>Couverture métier</dt><dd>{readout.functionalLabel}</dd></div>
        <div><dt>Maturité</dt><dd>{readout.currentMaturityLabel}</dd><small>Cible : {readout.targetMaturityLabel}</small></div>
        <div><dt>Écarts</dt><dd>{readout.signals.length
          ? readout.signals.length + ' point(s) à examiner'
          : readout.needsQualification ? 'À qualifier' : 'Aucun signal détecté'}</dd></div>
      </dl>
    </section>
  </section>;
}
