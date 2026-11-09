import type { LibraryDateKind } from '../application/sortLibraryEntries.ts';

type Props = {
  kind: LibraryDateKind;
  id: string;
  title: string;
  count: number;
  description: string;
};

export function LibrarySectionHeading({ kind, id, title, count, description }: Props) {
  return <div className="library-section-heading">
    <span className="library-section-icon" aria-hidden="true">
      {kind === 'saved'
        ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M3 5h18v3H3zM10 12h4" /></svg>
        : <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>}
    </span>
    <div className="library-section-heading-copy">
      <span className="library-section-eyebrow">{kind === 'saved' ? 'Versions conservées' : 'Historique d’ouverture'}</span>
      <h3 id={id}>{title} <span className="library-section-count" data-testid={kind === 'saved' ? 'saved-maps-count' : 'recent-maps-count'}>{count}</span></h3>
      <p>{description}</p>
    </div>
  </div>;
}
