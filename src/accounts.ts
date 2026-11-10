import type { GrowthConnection, IgAccount, State } from './types';

/** The primary account mirrors the workspace's main Meta / growth connection. */
export function accountStatus(s: State, a: IgAccount): IgAccount['status'] {
  return a.primary ? s.meta.status : a.status;
}

export function accountGrowth(s: State, a: IgAccount): GrowthConnection {
  return a.primary ? s.promoview : a.growth;
}

export const MAX_ACCOUNTS = 5;

export function activeAccountObj(s: State): IgAccount | null {
  return s.activeAccount === 'all' ? null : s.accounts.find((a) => a.id === s.activeAccount) ?? null;
}

/** Conversations visible for the selected account. */
export function inAccount<T extends { accountId?: string }>(s: State, items: T[]): T[] {
  if (s.activeAccount === 'all') return items;
  return items.filter((x) => (x.accountId ?? 'acc1') === s.activeAccount);
}

export function accountLabel(s: State, id?: string) {
  const a = s.accounts.find((x) => x.id === (id ?? 'acc1'));
  return a ? `@${a.username}` : '';
}
