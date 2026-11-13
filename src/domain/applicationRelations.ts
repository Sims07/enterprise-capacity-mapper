import type { Application, RelationRole } from './catalogModel.ts';

/** One explicit role per application/target relation; independent of lifecycle status. */
export const RELATION_ROLE_OPTIONS: ReadonlyArray<{ value: RelationRole; label: string }> = [
  { value: 'current', label: 'Actuelle' },
  { value: 'target', label: 'Cible' },
  { value: 'both', label: 'Actuelle et cible' },
];

/** Display a lifecycle state without reusing the technical legacy value "Cible" as a relation role. */
export const lifecycleLabel = (status?: string): string => status === 'Cible' ? 'Planifiée' : status || 'Non renseigné';

export const isRelationRole = (value: unknown): value is RelationRole =>
  value === 'current' || value === 'target' || value === 'both';

/** Legacy V3 did not distinguish link roles: 'Cible' meant target-only. */
export const defaultRelationRole = (application: Pick<Application, 'status'>): RelationRole =>
  String(application.status ?? '').trim().toLocaleLowerCase('fr') === 'cible' ? 'target' : 'current';

/** Undefined means *no link*, never a target-only or uncovered relation. */
export function relationRoleFor(application: Application, targetId: string): RelationRole | undefined {
  if (!application.capabilityIds?.includes(targetId)) return undefined;
  return application.relationRoles?.[targetId] ?? defaultRelationRole(application);
}

export const supportsCurrent = (application: Application, targetId: string): boolean => {
  const role = relationRoleFor(application, targetId);
  return role === 'current' || role === 'both';
};

export const supportsTarget = (application: Application, targetId: string): boolean => {
  const role = relationRoleFor(application, targetId);
  return role === 'target' || role === 'both';
};

export function validateRelationRoles(value: unknown, linkedIds: readonly string[]): void {
  if (value === undefined) return;
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Les rôles des relations applicatives doivent être un objet.');
  }
  const linked = new Set(linkedIds);
  for (const [targetId, role] of Object.entries(value)) {
    if (!linked.has(targetId)) throw new Error('Un rôle applicatif référence une relation inexistante.');
    if (!isRelationRole(role)) throw new Error('Rôle de relation applicative invalide.');
  }
}

/** A current-only link exits the target of this capability, not necessarily the whole SI.
 * Compare explicit current/target projections by identity, never by lifecycle status.
 */
export function outgoingApplicationsForCapability(
  currentApplications: readonly Application[],
  targetApplications: readonly Application[],
): Application[] {
  const targetIds = new Set(targetApplications.map(application => application.id));
  return currentApplications.filter(application => !targetIds.has(application.id));
}

/** Also removes orphaned per-relation roles when links are removed. */
export function retainRelationRoles(application: Application, linkedIds: readonly string[]): Pick<Application, 'relationRoles'> {
  if (!application.relationRoles) return {};
  const linked = new Set(linkedIds);
  const entries = Object.entries(application.relationRoles).filter(([id]) => linked.has(id));
  return entries.length ? { relationRoles: Object.fromEntries(entries) } : {};
}
