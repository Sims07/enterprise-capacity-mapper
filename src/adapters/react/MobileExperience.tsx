import React from 'react';

type MobileExperienceProps = {
  children: React.ReactNode;
};

/**
 * Mobile UI adapter boundary.
 *
 * The business/application layer is intentionally not aware of this wrapper.
 * Mobile-specific composition can therefore evolve here without changing the
 * desktop experience or duplicating domain/application logic.
 */
export default function MobileExperience({ children }: MobileExperienceProps) {
  return <div className="experience-shell experience-shell--mobile" data-ui-experience="mobile">{children}</div>;
}
