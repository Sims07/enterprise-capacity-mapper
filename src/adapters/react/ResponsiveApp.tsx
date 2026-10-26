import React, { useEffect, useState } from 'react';
import App from '../../App.tsx';

export const MOBILE_BREAKPOINT = 900;

type ExperienceKind = 'desktop' | 'mobile';

const readExperienceKind = (): ExperienceKind => {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return 'desktop';
  return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`).matches ? 'mobile' : 'desktop';
};

export const useExperienceKind = () => {
  const [kind, setKind] = useState<ExperienceKind>(readExperienceKind);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const handleChange = event => setKind(event.matches ? 'mobile' : 'desktop');
    setKind(mediaQuery.matches ? 'mobile' : 'desktop');
    mediaQuery.addEventListener?.('change', handleChange);
    return () => mediaQuery.removeEventListener?.('change', handleChange);
  }, []);

  return kind;
};

/**
 * UI composition adapter. Domain and application services stay shared while
 * React composition can diverge by form factor.
 */
export default function ResponsiveApp() {
  const experienceKind = useExperienceKind();

  // Keep App at a stable React tree position so viewport changes do not
  // remount it and discard in-progress UI state or the in-memory application.
  return <App experienceKind={experienceKind} />;
}
