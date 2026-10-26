import React from 'react';

type DesktopExperienceProps = {
  children: React.ReactNode;
};

/**
 * Desktop UI adapter.
 *
 * Deliberately returns the application unchanged so the desktop DOM and
 * behaviour remain the reference experience while the mobile adapter evolves
 * independently.
 */
export default function DesktopExperience({ children }: DesktopExperienceProps) {
  return <>{children}</>;
}
