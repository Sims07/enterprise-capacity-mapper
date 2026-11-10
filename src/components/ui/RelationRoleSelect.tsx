import React from 'react';
import { RELATION_ROLE_OPTIONS } from '../../domain/applicationRelations.ts';
import type { RelationRole } from '../../domain/catalogModel.ts';

export type RelationRoleSelectProps = {
  value: RelationRole;
  onChange: (nextRole: RelationRole) => void;
  label: string;
  testId?: string;
};

/** Design-system field: role belongs to a relation, never to the application lifecycle. */
export function RelationRoleSelect({ value, onChange, label, testId }: RelationRoleSelectProps) {
  return <label className="field link-relation-role">
    <span>{label}</span>
    <select data-testid={testId} value={value} onChange={event => onChange(event.target.value as RelationRole)}>
      {RELATION_ROLE_OPTIONS.map(option =>
        <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  </label>;
}
