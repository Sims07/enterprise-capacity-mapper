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
        <span className="presentation-detail-app-symbol" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="3" width="14" height="18" rx="2" />
            <path d="M9 7h2m2 0h2M9 11h2m2 0h2M9 15h2m2 0h2M10 21v-3h4v3" />
          </svg>
        </span>
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

/** Fiche de restitution en lecture seule : faits applicatifs et évaluations restent distincts. */
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
        <p className="presentation-detail-eyebrow">
          <span className="presentation-detail-level">CAPACITÉ N1</span>
          <span className="presentation-detail-context">Cartographie <span aria-hidden="true">/</span> {domainName || 'Domaine N0'}</span>
        </p>
        <div className="presentation-detail-title-row">
          <h2>{capability.name}</h2>
          {capability.code && <span className="presentation-detail-code">{capability.code}</span>}
        </div>
        {capability.description?.trim() && <p className="presentation-detail-description">{capability.description.trim()}</p>}
      </div>
      <Button className="presentation-detail-close" variant="icon" autoFocus aria-label="Fermer le détail" title="Fermer la fiche"
        data-testid="presentation-focus-close" onClick={onClose}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </Button>
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
        <div>
          <span className="presentation-detail-section-label">LECTURE MÉTIER</span>
          <h3>Évaluation métier</h3>
        </div>
        <p>Indicateurs déclarés, indépendants des applications</p>
      </div>
      <dl className="presentation-detail-assessment-list">
        <div data-coverage={readout.functionalCoverage}>
          <dt>Couverture métier</dt>
          <dd>{readout.functionalLabel}</dd>
          <small>Évaluation déclarée</small>
        </div>
        <div>
          <dt>Maturité</dt>
          <dd>{readout.currentMaturityLabel}</dd>
          <small>Cible : {readout.targetMaturityLabel}</small>
        </div>
        <div data-has-signals={readout.signals.length > 0}>
          <dt>Écarts</dt>
          <dd>{readout.signals.length
            ? readout.signals.length + ' point(s) à examiner'
            : readout.needsQualification ? 'À qualifier' : 'Aucun signal détecté'}</dd>
          <small>Points de vigilance déclarés</small>
        </div>
      </dl>
    </section>
  </section>;
}
