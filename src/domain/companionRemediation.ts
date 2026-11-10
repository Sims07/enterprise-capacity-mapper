import type { CatalogModel } from './catalogModel.ts';
import { resolveCompanionReview } from './companionReview.ts';

export type CompanionRemediationReference = {
  type: 'domain' | 'capability' | 'application';
  id: string;
  name: string;
};

export type CompanionRemediationAction = {
  kind: 'link-target' | 'create-application' | 'link-application';
  label: string;
  reference: CompanionRemediationReference;
};

type Finding = {
  id: string;
  title: string;
  ruleId: string;
  evidence?: ReadonlyArray<{ type: string; id: string | null; name: string }>;
};

type ReviewModel = Pick<CatalogModel, 'domains' | 'capabilities' | 'applications'> & {
  layout?: { depth?: number };
};

export type CompanionRemediation = {
  state: 'none' | 'available' | 'relation-added';
  actions: CompanionRemediationAction[];
};

const none = (): CompanionRemediation => ({ state: 'none', actions: [] });

/**
 * Converts a confirmed *human* answer into explicit workflow entry points.
 * It never infers business coverage, modifies the map or suggests linking a
 * non-existent target. The existing App layer remains responsible for edits.
 */
export function companionRemediation(finding: Finding, answers: readonly string[], model: ReviewModel): CompanionRemediation {
  if (resolveCompanionReview(finding, answers).status !== 'completed') return none();

  if (finding.ruleId === 'coverage.target-uncovered') {
    if (answers[0] !== 'incomplete' && answers[0] !== 'confirmed') return none();
    const type = model.layout?.depth === 1 ? 'domain' : 'capability';
    const targets = type === 'domain' ? model.domains : model.capabilities;
    const evidence = finding.evidence?.find(item => item.type === type && typeof item.id === 'string');
    const target = targets.find(item => item.id === evidence?.id);
    if (!target) return none();

    // Once the model contains a relation, do not offer to 'fix' a stale finding.
    // The relationship does not prove sufficient functional coverage.
    if (model.applications.some(application => application.capabilityIds?.includes(target.id))) {
      return { state: 'relation-added', actions: [] };
    }

    const reference: CompanionRemediationReference = { type, id: target.id, name: target.name };
    const existing: CompanionRemediationAction = { kind: 'link-target', label: 'Relier une application existante', reference };
    const create: CompanionRemediationAction = { kind: 'create-application', label: 'Créer une application liée', reference };
    return {
      state: 'available',
      actions: answers[0] === 'incomplete'
        ? [...(model.applications.length ? [existing] : []), create]
        : [create, ...(model.applications.length ? [existing] : [])],
    };
  }

  if (finding.ruleId === 'coverage.application-unlinked' && answers[0] === 'incomplete') {
    const evidence = finding.evidence?.find(item => item.type === 'application' && typeof item.id === 'string');
    const application = model.applications.find(item => item.id === evidence?.id);
    if (!application) return none();
    if (application.capabilityIds?.length) return { state: 'relation-added', actions: [] };
    return {
      state: 'available',
      actions: [{ kind: 'link-application', label: 'Relier cette application', reference: { type: 'application', id: application.id, name: application.name } }],
    };
  }

  return none();
}
