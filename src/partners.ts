import type { LedgerEntry, PartnerAgreement, PartnerHistory, PartnerPayout, PartnerRecord, PartnerReferral, State, ModuleId } from './types';
import { PLAN_BASE, PLAN_FULL, addDays, fmtDate } from './billing';
import { IS_PROMOVIEW } from './brand';

/**
 * Partner Program engine (spec §18). Pure helpers over a PartnerRecord.
 * Amounts are settled in USD with cents so statements reconcile exactly.
 */

export const PARTNER_MANAGER = 'Sophie Laurent (partner manager)';
export const FINANCE_ACTOR = 'Daan Visser (finance)';
export const POLICY_VERSION = 'attr-2026.11-draft';
/** Program commission: 25% of what referred customers actually pay (excl. tax, after discounts and refunds). */
export const PROGRAM_RATE = 25;
export const PROGRAM_BASIS = 'revenue_share' as const;

/** How long a partner earns on one referred customer. */
export function durationLabel(a: { whilePaying?: boolean; durationMonths: number | null }) {
  if (a.whilePaying) return 'for as long as the customer keeps paying';
  return a.durationMonths != null ? `for ${a.durationMonths} months per customer` : 'duration not set';
}

/** Plan name shown to partners, derived from the monthly amount only (no customer details). */
export function planLabel(mrrUsd: number) {
  if (mrrUsd === PLAN_BASE) return 'Growth';
  if (mrrUsd === PLAN_FULL) return 'Full package';
  return mrrUsd > 0 ? 'Custom modules' : '—';
}

/** Earnings per calendar month (yyyy-mm), all ledger states except reversed totals netted in. */
export function earningsByMonth(p: PartnerRecord, months = 6) {
  const out: { key: string; label: string; amount: number }[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const amount = round2((p.program?.ledger ?? []).filter((e) => e.period === key).reduce((t, e) => t + e.amountUsd, 0));
    out.push({ key, label: d.toLocaleDateString('en-GB', { month: 'short' }), amount });
  }
  return out;
}

/** First day of next month: payouts are reviewed monthly. */
export function nextPayoutDate() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export const usd = (v: number) =>
  new Intl.NumberFormat(IS_PROMOVIEW ? 'nl-NL' : 'en-US', { style: 'currency', currency: IS_PROMOVIEW ? 'EUR' : 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
export const round2 = (v: number) => Math.round(v * 100) / 100;
export const today = () => new Date().toISOString().slice(0, 10);

export const APP_STATUS: Record<PartnerRecord['application']['status'], [string, 'green' | 'amber' | 'red' | 'blue' | 'neutral']> = {
  draft: ['Draft', 'neutral'],
  submitted: ['Submitted', 'blue'],
  under_review: ['Under review', 'blue'],
  more_info: ['More information needed', 'amber'],
  approved: ['Approved', 'green'],
  declined: ['Declined', 'red'],
};

export const LEDGER_STATE: Record<LedgerEntry['state'], [string, 'green' | 'amber' | 'red' | 'blue' | 'neutral']> = {
  provisional: ['Provisional', 'neutral'],
  pending_hold: ['Pending hold', 'amber'],
  approved: ['Payable', 'green'],
  scheduled: ['Scheduled', 'blue'],
  paid: ['Paid', 'green'],
  reversed: ['Reversed', 'red'],
  on_hold: ['On hold', 'amber'],
  failed: ['Failed', 'red'],
};

export const PAYOUT_STATE: Record<PartnerPayout['state'], [string, 'green' | 'amber' | 'red' | 'blue' | 'neutral']> = {
  draft: ['Waiting for finance', 'neutral'],
  approved: ['Approved by finance', 'blue'],
  sent: ['Transfer sent', 'blue'],
  uncertain: ['Outcome unknown', 'amber'],
  paid: ['Paid', 'green'],
  failed: ['Failed', 'red'],
};

export function hist(actor: string, action: string, reason?: string): PartnerHistory {
  return { time: Date.now(), actor, action, ...(reason ? { reason } : {}) };
}

export function agreementOf(p: PartnerRecord): PartnerAgreement | undefined {
  const a = p.program?.agreements;
  return a?.[a.length - 1];
}

/** Commercial fields that must be set before earnings can activate (PAR-03). */
export function missingTerms(a: PartnerAgreement | undefined): string[] {
  if (!a) return ['agreement'];
  const m: string[] = [];
  if (!a.basis) m.push('commission basis');
  if (a.ratePercent == null) m.push('rate');
  if (!a.whilePaying && a.durationMonths == null) m.push('reward duration');
  if (a.payoutMinimumUsd == null) m.push('payout minimum');
  return m;
}

export function isAccepted(p: PartnerRecord) {
  return !!agreementOf(p)?.acceptedAt;
}

export function earningsActive(p: PartnerRecord) {
  return !!p.program && p.program.status !== 'ended' && isAccepted(p) && missingTerms(agreementOf(p)).length === 0;
}

/** Complimentary modules currently in effect for a partner. */
export function grantedModules(p: PartnerRecord | undefined): ModuleId[] {
  if (!p?.program || !isAccepted(p) || p.program.status === 'ended') return [];
  const a = agreementOf(p)!;
  if (a.grantUntil && a.grantUntil < today()) return [];
  return a.grantModules;
}

export function demoPartner(s: State): PartnerRecord | undefined {
  return s.partners.find((p) => p.clientId === 'c1');
}

/** Paid modules plus complimentary partner modules. Granting never touches billing. */
export function entitledModules(s: State): ModuleId[] {
  // Grow is part of the Growth base plan, so it comes with every active subscription
  const base: ModuleId[] = s.billing.modules.includes('core') && s.billing.status !== 'ended' ? ['grow'] : [];
  return Array.from(new Set([...s.billing.modules, ...base, ...grantedModules(demoPartner(s))]));
}

export interface Calc {
  revenueUsd: number;
  costsUsd: number;
  basisUsd: number;
  amountUsd: number;
}

/** Commission basis = max(0, eligible revenue − agreed attributable costs); rate applied to that basis. */
export function calcCommission(a: PartnerAgreement, revenueUsd: number): Calc {
  const costs = a.basis === 'contribution_profit' ? round2((revenueUsd * a.costs.paymentFeePercent) / 100 + a.costs.serviceCostUsd) : 0;
  const basis = round2(Math.max(0, revenueUsd - costs));
  const amount = round2((basis * (a.ratePercent ?? 0)) / 100);
  return { revenueUsd, costsUsd: costs, basisUsd: basis, amountUsd: amount };
}

/** Estimated monthly earnings from currently paying referrals. An estimate, never income. */
export function estimatedMonthly(p: PartnerRecord): number | null {
  const a = agreementOf(p);
  if (!p.program || !a || missingTerms(a).length) return null;
  return round2(p.program.referrals.filter((r) => r.status === 'paying').reduce((t, r) => t + calcCommission(a, r.mrrUsd).amountUsd, 0));
}

export function sumState(p: PartnerRecord, ...states: LedgerEntry['state'][]) {
  return round2((p.program?.ledger ?? []).filter((e) => states.includes(e.state)).reduce((t, e) => t + e.amountUsd, 0));
}

export function summary(p: PartnerRecord) {
  const r = p.program?.referrals ?? [];
  return {
    signups: r.filter((x) => x.status !== 'clicked').length,
    paying: r.filter((x) => x.status === 'paying').length,
    referredMrr: round2(r.filter((x) => x.status === 'paying').reduce((t, x) => t + x.mrrUsd, 0)),
    estimated: estimatedMonthly(p),
    provisional: sumState(p, 'provisional'),
    pendingHold: sumState(p, 'pending_hold'),
    payable: sumState(p, 'approved'),
    scheduled: sumState(p, 'scheduled'),
    paid: sumState(p, 'paid'),
  };
}

export type InvoiceResult = 'credited' | 'duplicate' | 'zero' | 'flagged' | 'inactive';

/**
 * A confirmed paid invoice line for a referred customer (PAR-07).
 * Idempotent per invoice line; free/failed periods accrue zero; attribution locks on the first paid conversion.
 */
export function recordPaidInvoice(p: PartnerRecord, referralId: string, invoiceLine: string, revenueUsd: number): InvoiceResult {
  const prog = p.program!;
  if (prog.processedInvoices.includes(invoiceLine)) return 'duplicate';
  const ref = prog.referrals.find((r) => r.id === referralId)!;
  if (ref.status === 'needs_review') return 'flagged';
  const a = agreementOf(p);
  if (!a || !earningsActive(p)) return 'inactive';
  prog.processedInvoices.push(invoiceLine);
  if (revenueUsd <= 0) return 'zero';
  if (!ref.lockedAt) ref.lockedAt = Date.now();
  ref.status = 'paying';
  ref.mrrUsd = revenueUsd;
  const c = calcCommission(a, revenueUsd);
  prog.ledger.push({
    id: `L-${prog.ledger.length + 1001}`,
    referralRef: ref.ref,
    invoiceLine,
    period: new Date().toISOString().slice(0, 7),
    kind: 'accrual',
    ...c,
    agreementVersion: a.version,
    state: 'provisional',
    costsFinal: false,
    holdUntil: null,
    time: Date.now(),
  });
  return 'credited';
}

/** Refund/chargeback → proportionate linked reversal. The original entry is never edited (PAR-10). */
export function recordRefund(p: PartnerRecord, invoiceLine: string, refundUsd: number): LedgerEntry | null {
  const prog = p.program!;
  const orig = prog.ledger.find((e) => e.invoiceLine === invoiceLine && e.kind === 'accrual');
  if (!orig) return null;
  const already = prog.ledger.filter((e) => e.reversesId === orig.id).reduce((t, e) => t + e.revenueUsd, 0);
  const refundable = round2(orig.revenueUsd + already); // reversals carry negative revenue
  const refund = Math.min(refundUsd, refundable);
  if (refund <= 0) return null;
  const share = refund / orig.revenueUsd;
  const entry: LedgerEntry = {
    id: `L-${prog.ledger.length + 1001}`,
    referralRef: orig.referralRef,
    invoiceLine: `${invoiceLine}-R${prog.ledger.filter((e) => e.reversesId === orig.id).length + 1}`,
    period: orig.period,
    kind: 'reversal',
    revenueUsd: -round2(refund),
    costsUsd: -round2(orig.costsUsd * share),
    basisUsd: -round2(orig.basisUsd * share),
    amountUsd: -round2(orig.amountUsd * share),
    agreementVersion: orig.agreementVersion,
    // Unpaid: nets out in the same pipeline. Already paid: offsets the next payout.
    state: orig.state === 'provisional' ? 'provisional' : 'approved',
    costsFinal: orig.costsFinal,
    holdUntil: null,
    reversesId: orig.id,
    time: Date.now(),
  };
  prog.ledger.push(entry);
  return entry;
}

export function payoutBlockers(p: PartnerRecord): string[] {
  const a = agreementOf(p);
  const b: string[] = [];
  if (!p.program?.payoutDetails) b.push('Payout details are missing');
  const payable = sumState(p, 'approved');
  if (payable <= 0) b.push('No payable commission yet');
  else if (a?.payoutMinimumUsd != null && payable < a.payoutMinimumUsd) b.push(`Payable ${usd(payable)} is below the ${usd(a.payoutMinimumUsd)} minimum`);
  if (p.program?.payouts.some((x) => ['draft', 'approved', 'sent', 'uncertain'].includes(x.state))) b.push('A payout is already in progress');
  return b;
}

export function createBatch(p: PartnerRecord, actor: string): PartnerPayout | null {
  if (payoutBlockers(p).length) return null;
  const prog = p.program!;
  const entries = prog.ledger.filter((e) => e.state === 'approved');
  const id = `PO-${prog.payouts.length + 301}`;
  entries.forEach((e) => {
    e.state = 'scheduled';
    e.payoutId = id;
  });
  const payout: PartnerPayout = {
    id,
    entryIds: entries.map((e) => e.id),
    amountUsd: round2(entries.reduce((t, e) => t + e.amountUsd, 0)),
    state: 'draft',
    createdAt: Date.now(),
    attempt: 1,
    history: [hist(actor, 'Created payout batch')],
  };
  prog.payouts.push(payout);
  return payout;
}

/** Ends a payout as failed: its entries become payable again so a new, reconciled batch can follow. */
export function failPayout(p: PartnerRecord, po: PartnerPayout, actor: string, reason: string) {
  po.state = 'failed';
  po.history.push(hist(actor, 'Marked as failed', reason));
  p.program!.ledger.filter((e) => e.payoutId === po.id).forEach((e) => {
    e.state = 'approved';
    e.payoutId = undefined;
  });
}

export function markPaid(p: PartnerRecord, po: PartnerPayout, actor: string, evidence: string) {
  po.state = 'paid';
  po.evidence = evidence;
  po.history.push(hist(actor, 'Marked as paid', `Evidence: ${evidence}`));
  p.program!.ledger.filter((e) => e.payoutId === po.id).forEach((e) => (e.state = 'paid'));
}

export function finalizeCosts(p: PartnerRecord, e: LedgerEntry) {
  const a = agreementOf(p)!;
  e.costsFinal = true;
  if (e.state === 'provisional') {
    e.state = 'pending_hold';
    e.holdUntil = addDays(today(), a.holdDays);
  }
}

export function releaseHold(e: LedgerEntry) {
  if (e.state === 'pending_hold') e.state = 'approved';
}

export function newReferral(p: PartnerRecord, via: PartnerReferral['via'], segment: string): PartnerReferral {
  const prog = p.program!;
  const r: PartnerReferral = {
    id: `rf${prog.referrals.length + 1}_${Date.now().toString(36)}`,
    ref: `R-${(4800 + prog.referrals.length * 37 + 11).toString()}`,
    segment,
    status: 'trial',
    via,
    signedUpAt: Date.now(),
    lockedAt: null,
    mrrUsd: 0,
  };
  prog.referrals.push(r);
  prog.funnel.visits += 3;
  prog.funnel.signups += 1;
  return r;
}

export const fmt = fmtDate;
