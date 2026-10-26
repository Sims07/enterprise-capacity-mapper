import React, { useEffect, useState } from 'react';
import App from '../../App.tsx';
import DesktopExperience from './DesktopExperience.tsx';
import MobileExperience from './MobileExperience.tsx';

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

  if (experienceKind === 'mobile') {
    return (
      <MobileExperience>
        <App />
      </MobileExperience>
    );
  }

  return (
    <DesktopExperience>
      <App />
    </DesktopExperience>
  );
}
