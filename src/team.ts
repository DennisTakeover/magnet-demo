import type { ModuleId, State, TeamMember } from './types';
import { entitledModules } from './partners';

/** Route segment → module a member needs for it. Core pages need nothing extra. */
export const ROUTE_MODULE: Record<string, ModuleId | 'owner' | null> = {
  overview: null, leads: null, help: null, settings: null,
  grow: 'grow', inbox: 'inbox', flows: 'flows', comments: 'comments', planner: 'planner',
  billing: 'owner', partner: 'owner', dfy: 'owner', connect: 'owner',
};

export function viewer(s: State): TeamMember | null {
  return s.viewAs ? s.team.find((m) => m.id === s.viewAs && m.status === 'active') ?? null : null;
}

/** Why the current viewer can't open a route, or null when allowed. Checked by the app shell; a server would enforce the same. */
export function deniedReason(s: State, route: string): string | null {
  const v = viewer(s);
  if (!v) return null;
  const need = ROUTE_MODULE[route];
  if (need === undefined || need === null) return null;
  if (need === 'owner') return 'Only the account owner can open this page.';
  if (!entitledModules(s).includes(need)) return null; // the plan gate shows its own screen
  return v.modules.includes(need) ? null : 'The account owner hasn’t given you access to this module.';
}

export function can(s: State, perm: keyof TeamMember['permissions']): boolean {
  const v = viewer(s);
  return !v || v.permissions[perm];
}
