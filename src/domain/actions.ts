import type { PathwayId } from './pathways';

export type PathwayActionKind =
  | 'standard'
  | 'capture'
  | 'departure'
  | 'route'
  | 'link'
  | 'hold'
  | 'remove'
  | 'compose'
  | 'revise'
  | 'complete';

export type ActionGroupName =
  | 'Preserve'
  | 'Annotate'
  | 'Link'
  | 'Retrieve'
  | 'Open'
  | 'Study'
  | 'Sort'
  | 'Preserve / Link'
  | 'Capture'
  | 'Hold'
  | 'Route'
  | 'Return'
  | 'Compose'
  | 'Revise';

export type PathwayAction = {
  id: string;
  label: string;
  kind: PathwayActionKind;
  destination?: string;
  group?: ActionGroupName;
};

export type ActionHandlerKey =
  | 'open'
  | 'capture'
  | 'route'
  | 'link'
  | 'hold'
  | 'departure'
  | 'remove'
  | 'compose'
  | 'revise'
  | 'complete';

export const ACTION_GROUPS: Record<PathwayId, ActionGroupName[]> = {
  chrysopoeia: ['Preserve', 'Annotate', 'Link', 'Retrieve'],
  golem: ['Open', 'Study', 'Sort', 'Preserve / Link'],
  fafo: ['Capture', 'Hold', 'Route', 'Return'],
  essays: ['Compose', 'Revise', 'Link', 'Preserve'],
};

export const ACTION_KIND_HANDLERS: Record<PathwayActionKind, ActionHandlerKey> = {
  standard: 'open',
  capture: 'capture',
  departure: 'departure',
  route: 'route',
  link: 'link',
  hold: 'hold',
  remove: 'remove',
  compose: 'compose',
  revise: 'revise',
  complete: 'complete',
};

export function getActionGroup(_pathwayId: PathwayId, action: PathwayAction): ActionGroupName {
  return action.group ?? 'Preserve';
}
