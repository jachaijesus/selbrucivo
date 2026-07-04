import type { PathwayId } from './pathways';

export type RelationshipAction =
  | 'capture'
  | 'route'
  | 'link'
  | 'hold'
  | 'remove'
  | 'compose'
  | 'revise'
  | 'complete'
  | 'preserve'
  | 'return'
  | 'open';

export type RoutePolicy = 'allowed' | 'optional' | 'blocked' | 'unsupported' | 'intentional';

export type PathwayRelationshipRule = {
  from: string;
  to: string;
  rule: string;
  sourcePathway?: PathwayId;
  destinationPathway?: PathwayId;
  policy: RoutePolicy;
  reason: string;
  requiresConfirmation: boolean;
  neverAutomatic: boolean;
};

export type MaterialRoute = {
  action: RelationshipAction;
  at: string;
  from: PathwayId;
  to: PathwayId;
};

export type MaterialRelationship = {
  id: string;
  action: RelationshipAction;
  at: string;
  fromMaterialId: string;
  toMaterialId: string;
  fromPathway: PathwayId;
  toPathway: PathwayId;
  label: string;
  policy?: RoutePolicy;
  reason?: string;
  requiresConfirmation?: boolean;
  neverAutomatic?: boolean;
};

export function createRelationshipRule(from: string, to: string, rule: string): PathwayRelationshipRule {
  const normalizedRule = rule.toLowerCase();
  const neverAutomatic = normalizedRule.includes('never automatic');
  const policy: RoutePolicy = normalizedRule.includes('blocked')
    ? 'blocked'
    : normalizedRule.includes('unsupported')
      ? 'unsupported'
      : normalizedRule.includes('optional')
        ? 'optional'
        : normalizedRule.includes('intentional')
          ? 'intentional'
          : 'allowed';

  return {
    from,
    to,
    rule,
    policy,
    reason: rule,
    requiresConfirmation: policy !== 'blocked' && policy !== 'unsupported',
    neverAutomatic,
  };
}

export function createRoute(action: RelationshipAction, from: PathwayId, to: PathwayId): MaterialRoute {
  return {
    action,
    at: new Date().toISOString(),
    from,
    to,
  };
}
