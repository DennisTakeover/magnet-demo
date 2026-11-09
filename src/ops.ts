import type { KillSwitch, State, SwitchModule } from './types';

export const SWITCH_LABEL: Record<SwitchModule, string> = {
  grow: 'Grow interactions',
  flows: 'Lead Flow sends',
  ai: 'AI replies',
  comments: 'Comment queue',
  planner: 'Scheduled publishing',
};

/** The switch that currently blocks this module for a client (global wins), or undefined. Workers check this before every submission. */
export function blockedBy(s: State, module: SwitchModule, clientId = 'c1'): KillSwitch | undefined {
  const list = s.killSwitches ?? [];
  return list.find((k) => k.module === module && k.scope === 'global') ?? list.find((k) => k.module === module && k.scope === clientId);
}
