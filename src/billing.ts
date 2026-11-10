import type { CancelReason, ModuleId, OfferKind, State } from './types';
import { clientLog, logActivity } from './store';

/** Example catalogue (USD per month). Starter = core+grow+inbox = 97, all modules = 297. No bundle discounts. */
export const MODULES: { id: ModuleId; name: string; priceUsd: number; desc: string; requires?: ModuleId[]; locked?: boolean }[] = [
  { id: 'core', name: 'Core workspace', priceUsd: 37, desc: 'Overview, Leads, settings, billing and support', locked: true },
  { id: 'grow', name: 'Grow', priceUsd: 30, desc: 'Audience, sources and growth campaign' },
  { id: 'inbox', name: 'Inbox & AI', priceUsd: 30, desc: 'Conversations with AI-suggested replies' },
  { id: 'flows', name: 'Lead Flows', priceUsd: 70, desc: 'Keyword triggers that deliver your resources', requires: ['inbox'] },
  { id: 'comments', name: 'Comments', priceUsd: 70, desc: 'AI comment drafts on target accounts' },
  { id: 'planner', name: 'Planner', priceUsd: 60, desc: 'Content calendar and scheduling' },
];

export const STARTER: ModuleId[] = ['core', 'grow', 'inbox'];
export const ALL_MODULES: ModuleId[] = MODULES.map((m) => m.id);

export const moduleName = (id: ModuleId) => MODULES.find((m) => m.id === id)!.name;

export function totalUsd(mods: ModuleId[]): number {
  return MODULES.filter((m) => mods.includes(m.id)).reduce((sum, m) => sum + m.priceUsd, 0);
}

/** Price actually charged per month, after an active discount. */
export function payableUsd(s: State, mods: ModuleId[] = s.billing.modules): number {
  const base = totalUsd(mods);
  const d = s.billing.discount;
  return d ? Math.round(base * (1 - d.percent / 100)) : base;
}

/** Modules that must be added back because something selected depends on them. */
export function missingDependencies(mods: ModuleId[]): { module: ModuleId; needs: ModuleId }[] {
  const out: { module: ModuleId; needs: ModuleId }[] = [];
  for (const m of MODULES) {
    if (!mods.includes(m.id) || !m.requires) continue;
    for (const r of m.requires) if (!mods.includes(r)) out.push({ module: m.id, needs: r });
  }
  return out;
}

/** Readable date for messages, e.g. "27 Nov 2026" */
export function fmtDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number) {
  const d = new Date(`${iso}T12:00:00`);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function daysUntil(iso: string) {
  return Math.max(0, Math.ceil((new Date(`${iso}T12:00:00`).getTime() - Date.now()) / 86_400_000));
}

/** What a configuration change means, so the customer sees it before confirming (price preview contract). */
export interface Quote {
  current: ModuleId[];
  next: ModuleId[];
  currentUsd: number;
  nextUsd: number;
  /** Positive = recurring saving; only shown when real */
  savingUsd: number;
  kind: 'downgrade' | 'upgrade' | 'mixed' | 'none';
  effective: string; // date
  chargeNowUsd: number; // prorated, upgrades only
  removed: ModuleId[];
  added: ModuleId[];
  consequences: string[];
}

export function quote(s: State, next: ModuleId[]): Quote {
  const current = s.billing.modules;
  const removed = current.filter((m) => !next.includes(m));
  const added = next.filter((m) => !current.includes(m));
  const currentUsd = totalUsd(current);
  const nextUsd = totalUsd(next);
  const kind = removed.length && added.length ? 'mixed' : removed.length ? 'downgrade' : added.length ? 'upgrade' : 'none';
  // Proposed default: removals at renewal, additions now with a prorated charge
  const left = daysUntil(s.billing.periodEnd);
  const chargeNowUsd = added.length ? Math.round((totalUsd(added) * left) / 30) : 0;
  const effective = removed.length ? s.billing.periodEnd : new Date().toISOString().slice(0, 10);
  return { current, next, currentUsd, nextUsd, savingUsd: currentUsd - nextUsd, kind, effective, chargeNowUsd, removed, added, consequences: consequencesOf(s, removed) };
}

/** What stops when modules go away (RET-07). Uses the customer's real data so the warning is concrete. */
export function consequencesOf(s: State, removed: ModuleId[]): string[] {
  const out: string[] = [];
  if (removed.includes('grow')) out.push(`Your growth campaign pauses${s.campaign === 'active' ? ' (it is running now)' : ''}. Audience and sources are kept.`);
  if (removed.includes('inbox')) out.push('AI reply suggestions stop. You can still read conversations.');
  if (removed.includes('flows')) {
    const live = s.flows.filter((f) => f.status === 'active' || f.status === 'waiting_for_post').length;
    out.push(`${live} active Lead Flow${live === 1 ? '' : 's'} pause. Flows and results are kept.`);
  }
  if (removed.includes('comments')) {
    const approved = s.commentDrafts.filter((d) => d.state === 'approved').length;
    out.push(`The comment queue stops${approved ? ` (${approved} approved, not yet posted)` : ''}. Drafts are kept.`);
  }
  if (removed.includes('planner')) {
    const scheduled = s.posts.filter((p) => p.status === 'scheduled').length;
    out.push(`${scheduled} scheduled post${scheduled === 1 ? '' : 's'} will not publish after the change. Drafts are kept.`);
  }
  return out;
}

/** Turn off what a module no longer covers. Saved data stays; nothing is deleted. */
export function applyModuleLoss(d: State, removed: ModuleId[]) {
  if (removed.includes('grow') && d.campaign === 'active') {
    d.campaign = 'paused';
    d.clients[0].campaign = 'paused';
  }
  if (removed.includes('flows')) {
    d.flows.forEach((f) => {
      if (f.status === 'active' || f.status === 'waiting_for_post') f.status = 'paused';
    });
  }
  if (removed.includes('inbox') && d.aiMode !== 'off') d.aiMode = 'off';
}

export function setModules(d: State, mods: ModuleId[]) {
  const removed = d.billing.modules.filter((m) => !mods.includes(m));
  d.billing.modules = mods;
  applyModuleLoss(d, removed);
}

/** Demo: jump to the renewal date and apply whatever was scheduled. */
export function simulateRenewal(d: State): string {
  const b = d.billing;
  const date = b.periodEnd;
  if (b.status === 'cancellation_scheduled') {
    b.status = 'ended';
    setModules(d, ['core']);
    d.campaign = 'paused';
    d.clients[0].campaign = 'paused';
    logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'setting', action: 'Subscription ended at period end. Outgoing automations stopped.', result: 'success' });
    return 'Subscription ended. Automations stopped; your data stays available to export.';
  }
  if (b.status === 'paused') return 'Paused: no renewal happens until the pause ends.';
  if (b.scheduled) {
    setModules(d, b.scheduled.modules);
    b.scheduled = null;
  }
  if (b.discount) {
    b.discount.months -= 1;
    if (b.discount.months <= 0) b.discount = null;
  }
  const firstCharge = !!b.trialEnd;
  b.trialEnd = null;
  b.invoices.unshift({ id: `INV-${1000 + b.invoices.length + 1}`, date, amountUsd: payableUsd(d), status: 'paid', modules: [...b.modules] });
  b.periodEnd = addMonths(date, 1);
  if (firstCharge) {
    logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'setting', action: 'Trial ended: first payment collected', result: 'success' });
    return 'Trial ended. Your first payment went through and your subscription is active.';
  }
  logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'setting', action: `Subscription renewed (${b.modules.length} modules)`, result: 'success' });
  return 'Renewed. Any scheduled change is now active.';
}

/* ---------- Retention offers (reason → one relevant alternative) ---------- */

export interface Offer {
  id: 'downgrade' | 'discount' | 'modules' | 'support' | 'pause' | 'ticket' | 'none';
  title: string;
  body: string;
  cta: string;
}

export const REASONS: { id: CancelReason; label: string }[] = [
  { id: 'price', label: 'It’s too expensive' },
  { id: 'unused', label: 'I’m not using everything' },
  { id: 'results', label: 'Not enough results' },
  { id: 'setup', label: 'Setting it up is too hard' },
  { id: 'break', label: 'I’m taking a break' },
  { id: 'technical', label: 'Something isn’t working' },
  { id: 'other', label: 'Other' },
];

/** Cost to serve one module for one month (estimate used for margin guardrails). */
export const MODULE_COST_USD: Record<ModuleId, number> = { core: 9, grow: 11, inbox: 8, flows: 14, comments: 16, planner: 7 };
/** Guardrail: an offer may not push the monthly margin below this share of the discounted price. */
export const MIN_MARGIN = 0.4;

export function publishedOffer(s: State, kind: OfferKind, reason?: CancelReason | 'skipped' | null) {
  const o = s.offers?.find((x) => x.kind === kind && x.status === 'published');
  if (!o) return undefined;
  if (reason && reason !== 'skipped' && !o.reasons.includes(reason)) return undefined;
  if (o.limit != null && o.redeemed >= o.limit) return undefined;
  if (o.validUntil && o.validUntil < new Date().toISOString().slice(0, 10)) return undefined;
  return o;
}

export function offerFor(s: State, reason: CancelReason | 'skipped' | null): Offer {
  const none: Offer = { id: 'none', title: '', body: '', cta: '' };
  if (!reason || reason === 'skipped') return none;
  const b = s.billing;
  const onStarter = b.modules.length === STARTER.length && STARTER.every((m) => b.modules.includes(m));
  const has = (k: OfferKind) => !!publishedOffer(s, k, reason);
  switch (reason) {
    case 'price': {
      if (!onStarter && has('downgrade')) return { id: 'downgrade', title: 'Keep the essentials for less', body: 'Switch to Grow and Inbox & AI only. You keep your audience, conversations and leads.', cta: 'See the lower price' };
      const d = publishedOffer(s, 'discount', reason);
      if (d && !b.usedDiscount) return { id: 'discount', title: `${d.percent}% off for the next ${d.months} months`, body: `A one-time discount on your current modules. After ${d.months} months the normal price applies again.`, cta: 'Review this discount' };
      return none;
    }
    case 'unused':
      return has('modules') ? { id: 'modules', title: 'Only pay for what you use', body: 'Remove the modules you don’t use. Your saved data stays.', cta: 'Choose modules' } : none;
    case 'results':
      return has('support') ? { id: 'support', title: 'Get a free setup review', body: 'A specialist looks at your audience and Lead Flows and suggests changes. No promise of specific results.', cta: 'Request a review' } : none;
    case 'setup':
      return has('support') ? { id: 'support', title: 'Get help with setup', body: 'We help you finish the setup in a short session. You can still cancel any time.', cta: 'Request setup help' } : none;
    case 'break': {
      const p = publishedOffer(s, 'pause', reason);
      return p ? { id: 'pause', title: 'Pause instead of cancelling', body: `Pause for 1 to ${p.months ?? 3} months. No charges while paused; everything picks up again when you’re back.`, cta: 'Choose a pause' } : none;
    }
    case 'technical':
      return has('ticket') ? { id: 'ticket', title: 'Let us look at the problem', body: 'There are no known issues right now. Tell us what’s wrong and we’ll open a ticket.', cta: 'Report the problem' } : none;
    default:
      return none;
  }
}

/** Count an accepted offer against its version (redemption limit). */
export function redeemOffer(d: State, kind: OfferKind) {
  const o = d.offers?.find((x) => x.kind === kind && x.status === 'published');
  if (o) o.redeemed += 1;
  return o;
}

/** Execute a billing change, or store it as pending when the provider is down. Returns the message to show. */
export function commitChange(
  d: State,
  change: { apply: 'cancel' | 'modules' | 'pause' | 'discount'; label: string; modules?: ModuleId[]; months?: number; percent?: number },
): { pending: boolean; message: string } {
  if (d.sim.billingDown) {
    d.billing.pending = { ...change, requestedAt: Date.now() };
    logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'setting', action: `Billing provider unavailable: "${change.label}" stored as pending`, result: 'failed', error: { code: 'BILLING_UNAVAILABLE', detail: 'The request is stored and will be applied when the billing provider responds. No renewal happens while it is pending.' } });
    return { pending: true, message: 'Your request is saved and pending processing. We’ll confirm once it’s done.' };
  }
  return { pending: false, message: applyChange(d, change) };
}

export function applyChange(d: State, change: { apply: 'cancel' | 'modules' | 'pause' | 'discount'; label: string; modules?: ModuleId[]; months?: number; percent?: number }): string {
  const b = d.billing;
  b.pending = null;
  if (change.apply === 'cancel') {
    b.status = 'cancellation_scheduled';
    b.scheduled = null;
    clientLog(d, 'setting', `Cancelled subscription. Access until ${b.periodEnd}`);
    return `Cancelled. You keep access until ${fmtDate(b.periodEnd)}; you won’t be charged again.`;
  }
  if (change.apply === 'modules' && change.modules) {
    const q = quote(d, change.modules);
    if (q.added.length && !q.removed.length) {
      setModules(d, change.modules);
      clientLog(d, 'setting', `Added ${q.added.map(moduleName).join(', ')}`);
      return `Added ${q.added.map(moduleName).join(', ')}. Available now.`;
    }
    // Additions now, removals at renewal
    if (q.added.length) setModules(d, [...b.modules, ...q.added]);
    b.scheduled = { modules: change.modules, effective: b.periodEnd };
    clientLog(d, 'setting', `Scheduled module change from ${b.periodEnd}: removing ${q.removed.map(moduleName).join(', ')}`);
    return `Scheduled. From ${fmtDate(b.periodEnd)} you pay the new price; until then everything keeps working.`;
  }
  if (change.apply === 'pause' && change.months) {
    b.status = 'paused';
    b.pauseUntil = addMonths(new Date().toISOString().slice(0, 10), change.months);
    if (d.campaign === 'active') { d.campaign = 'paused'; d.clients[0].campaign = 'paused'; }
    d.flows.forEach((f) => { if (f.status === 'active') f.status = 'paused'; });
    clientLog(d, 'setting', `Paused subscription until ${b.pauseUntil}`);
    return `Paused until ${fmtDate(b.pauseUntil)}. No charges and no outgoing automations until then.`;
  }
  if (change.apply === 'discount') {
    // Terms are copied from the offer version at acceptance; later offer edits never change them
    const o = redeemOffer(d, 'discount');
    const percent = change.percent ?? o?.percent ?? 20;
    const months = change.months ?? o?.months ?? 3;
    b.discount = { percent, months, until: addMonths(b.periodEnd, months), offerVersion: o?.version };
    b.usedDiscount = true;
    clientLog(d, 'setting', `Accepted retention offer: ${percent}% off for ${months} months`);
    return `${percent}% off applied for your next ${months} invoices.`;
  }
  return 'Done';
}
