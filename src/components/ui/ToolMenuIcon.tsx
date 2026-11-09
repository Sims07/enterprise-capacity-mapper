import React from 'react';

export type ToolMenuIconName = 'create' | 'save' | 'download' | 'upload' | 'sun' | 'moon';

/** Pictogrammes filaires cohérents pour les actions du menu Outils. */
export function ToolMenuIcon({ name }: { name: ToolMenuIconName }): React.ReactElement {
  return <svg className="toolbar-menu-icon" xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {name === 'create' && <path d="M12 5v14M5 12h14" />}
    {name === 'save' && <><path d="M5 3h12l4 4v14H3V3h2Z" /><path d="M7 3v6h10V3M7 21v-9h10v9" /></>}
    {name === 'download' && <><path d="M12 3v12m-4-4 4 4 4-4M4 17v4h16v-4" /></>}
    {name === 'upload' && <><path d="M12 16V4m-4 4 4-4 4 4M4 17v4h16v-4" /></>}
    {name === 'sun' && <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>}
    {name === 'moon' && <path d="M20.9 13.1A9 9 0 0 1 10.9 3.1a9 9 0 1 0 10 10Z" />}
  </svg>;
}
