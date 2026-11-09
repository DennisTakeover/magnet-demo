import type { AdminClient, LedgerEntry, PartnerAgreement, PartnerApplicationForm, PartnerRecord } from './types';
import { calcCommission, PARTNER_MANAGER, FINANCE_ACTOR } from './partners';

type H = { ago: (ms: number) => number; isoDate: (d: number) => string; DAY: number; HOUR: number };

export const EMPTY_FORM: PartnerApplicationForm = {
  business: '', role: '', profileLinks: '', country: '', language: '', niche: '', reachEvidence: '', audienceFit: '', promotion: '', contactEmail: '',
};

/** Demo agreement. Values are illustrative for the demo, not live program terms. */
export function demoAgreement(h: H, accepted: boolean): PartnerAgreement {
  return {
    version: 1,
    basis: 'revenue_share',
    ratePercent: 25,
    durationMonths: null,
    whilePaying: true,
    attributionDays: 30,
    payoutMinimumUsd: 50,
    holdDays: 30,
    costs: { paymentFeePercent: 3, serviceCostUsd: 8 },
    grantModules: ['core', 'grow', 'inbox'],
    grantUntil: h.isoDate(120),
    reviewDate: h.isoDate(30),
    proposedAt: h.ago(70 * h.DAY),
    acceptedAt: accepted ? h.ago(68 * h.DAY) : null,
  };
}

export function seedPartners(clients: AdminClient[], h: H): PartnerRecord[] {
  const [, c2, c3, c4] = clients;
  const a = demoAgreement(h, true);
  const month = (offset: number) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset);
    return d.toISOString().slice(0, 7);
  };
  let n = 1001;
  const entry = (ref: string, inv: string, revenue: number, offset: number, state: LedgerEntry['state'], payoutId?: string): LedgerEntry => ({
    id: `L-${n++}`,
    referralRef: ref,
    invoiceLine: inv,
    period: month(offset),
    kind: 'accrual',
    ...calcCommission(a, revenue),
    agreementVersion: 1,
    state,
    costsFinal: state !== 'provisional',
    holdUntil: state === 'pending_hold' ? h.isoDate(12) : null,
    payoutId,
    time: h.ago(-offset * 30 * h.DAY + 2 * h.DAY),
  });
  const ledger: LedgerEntry[] = [
    entry('R-4811', 'INV-8812-L1', 97, -2, 'paid', 'PO-301'),
    entry('R-4848', 'INV-8840-L1', 297, -2, 'paid', 'PO-301'),
    entry('R-4811', 'INV-8901-L1', 97, -1, 'approved'),
    entry('R-4848', 'INV-8933-L1', 297, -1, 'approved'),
    entry('R-4885', 'INV-8950-L1', 97, -1, 'pending_hold'),
    entry('R-4811', 'INV-9012-L1', 97, 0, 'provisional'),
    entry('R-4848', 'INV-9030-L1', 297, 0, 'provisional'),
  ];
  const paidTotal = Math.round((ledger[0].amountUsd + ledger[1].amountUsd) * 100) / 100;

  const form = (o: Partial<PartnerApplicationForm>): PartnerApplicationForm => ({ ...o } as PartnerApplicationForm);

  return [
    {
      id: 'pt2',
      clientId: 'c2',
      name: c2.owner,
      handle: c2.handle,
      application: {
        form: form({
          business: c2.name, role: 'Owner', profileLinks: `instagram.com/${c2.handle.replace('@', '')}`, country: 'Netherlands', language: 'Dutch, English',
          niche: c2.niche, reachEvidence: 'Insights screenshot: avg. 4,100 reach per post, 6.2% engagement (last 30 days)',
          audienceFit: 'Other small business owners ask how I grow; many run their own shop.', promotion: '2 Reels + 3 Stories per quarter, link in bio', contactEmail: 'partner@example.com',
        }),
        status: 'approved',
        submittedAt: h.ago(80 * h.DAY),
        history: [
          { time: h.ago(80 * h.DAY), actor: `${c2.owner} (client)`, action: 'Submitted application' },
          { time: h.ago(76 * h.DAY), actor: PARTNER_MANAGER, action: 'Started review' },
          { time: h.ago(70 * h.DAY), actor: PARTNER_MANAGER, action: 'Approved with agreement v1', reason: 'Engaged audience of shop owners; clear promotion plan.' },
        ],
      },
      program: {
        status: 'active',
        newReferralsPaused: false,
        code: 'NOORGROWS',
        link: 'magnet.app/r/noorgrows',
        agreements: [a],
        commitments: [
          { id: 'cm1', channel: 'Instagram', format: 'Reel', deadline: h.isoDate(-50), status: 'verified', evidenceUrl: 'instagram.com/reel/demo-1', history: [{ time: h.ago(48 * h.DAY), actor: PARTNER_MANAGER, action: 'Verified' }] },
          { id: 'cm2', channel: 'Instagram', format: '3 Stories with link sticker', deadline: h.isoDate(-20), status: 'verified', evidenceUrl: 'instagram.com/stories/demo-2', history: [{ time: h.ago(19 * h.DAY), actor: PARTNER_MANAGER, action: 'Verified' }] },
          { id: 'cm3', channel: 'Instagram', format: 'Reel', deadline: h.isoDate(-3), status: 'overdue', history: [{ time: h.ago(2 * h.DAY), actor: 'System', action: 'Deadline passed: review task created (no charge)' }] },
          { id: 'cm4', channel: 'Newsletter', format: 'Mention with tracked link', deadline: h.isoDate(14), status: 'submitted', evidenceUrl: 'newsletter.example.com/issue-41', history: [{ time: h.ago(h.DAY), actor: `${c2.owner} (client)`, action: 'Submitted evidence' }] },
        ],
        referrals: [
          { id: 'r1', ref: 'R-4811', segment: 'Coach', status: 'paying', via: 'code', signedUpAt: h.ago(64 * h.DAY), lockedAt: h.ago(60 * h.DAY), mrrUsd: 97 },
          { id: 'r2', ref: 'R-4848', segment: 'Webshop', status: 'paying', via: 'link', signedUpAt: h.ago(58 * h.DAY), lockedAt: h.ago(55 * h.DAY), mrrUsd: 297 },
          { id: 'r3', ref: 'R-4885', segment: 'Local shop', status: 'cancelled', via: 'link', signedUpAt: h.ago(40 * h.DAY), lockedAt: h.ago(38 * h.DAY), mrrUsd: 0 },
          { id: 'r4', ref: 'R-4922', segment: 'Coach', status: 'trial', via: 'unknown', signedUpAt: h.ago(4 * h.DAY), lockedAt: null, mrrUsd: 0 },
          { id: 'r5', ref: 'R-4959', segment: 'Webshop', status: 'needs_review', via: 'code', signedUpAt: h.ago(2 * h.DAY), lockedAt: null, mrrUsd: 0, flag: 'Billing identity matches the partner’s own account' },
        ],
        ledger,
        payouts: [
          { id: 'PO-301', entryIds: ['L-1001', 'L-1002'], amountUsd: paidTotal, state: 'paid', createdAt: h.ago(20 * h.DAY), approvedBy: FINANCE_ACTOR, evidence: 'Bank ref TRX-55120 (reconciled)', attempt: 1, history: [
            { time: h.ago(20 * h.DAY), actor: PARTNER_MANAGER, action: 'Created payout batch' },
            { time: h.ago(19 * h.DAY), actor: FINANCE_ACTOR, action: 'Approved batch' },
            { time: h.ago(17 * h.DAY), actor: FINANCE_ACTOR, action: 'Marked as paid', reason: 'Evidence: Bank ref TRX-55120 (reconciled)' },
          ] },
        ],
        payoutDetails: true,
        grantCostUsd: 21,
        funnel: { visits: 412, signups: 5, activated: 3 },
        retention: { d30: 100, d60: 67, d90: null },
        processedInvoices: ledger.map((e) => e.invoiceLine),
      },
    },
    {
      id: 'pt3',
      clientId: 'c3',
      name: c3.owner,
      handle: c3.handle,
      application: {
        form: form({
          business: c3.name, role: 'Owner', profileLinks: `instagram.com/${c3.handle.replace('@', '')}, youtube.com/@${c3.handle.replace('@', '')}`, country: 'Belgium', language: 'Dutch, French',
          niche: c3.niche, reachEvidence: 'Avg. 2,300 reach per Reel; YouTube 1,100 subscribers', audienceFit: 'Local retailers in my area follow my shop tips.', promotion: 'One tutorial video and a Story series', contactEmail: 'shop@example.com',
        }),
        status: 'under_review',
        submittedAt: h.ago(3 * h.DAY),
        history: [
          { time: h.ago(3 * h.DAY), actor: `${c3.owner} (client)`, action: 'Submitted application' },
          { time: h.ago(2 * h.DAY), actor: PARTNER_MANAGER, action: 'Started review' },
        ],
      },
    },
    {
      id: 'pt4',
      clientId: 'c4',
      name: c4.owner,
      handle: c4.handle,
      application: {
        form: form({
          business: c4.name, role: 'Founder', profileLinks: `instagram.com/${c4.handle.replace('@', '')}`, country: 'Canada', language: 'English',
          niche: c4.niche, reachEvidence: '18k followers', audienceFit: 'Parents interested in nutrition.', promotion: 'Shout-out', contactEmail: 'hello@example.com',
        }),
        status: 'more_info',
        infoRequest: 'Follower count alone is not enough. Please share recent reach and engagement (last 30 days) and how your audience relates to business owners.',
        submittedAt: h.ago(9 * h.DAY),
        history: [
          { time: h.ago(9 * h.DAY), actor: `${c4.owner} (client)`, action: 'Submitted application' },
          { time: h.ago(7 * h.DAY), actor: PARTNER_MANAGER, action: 'Requested more information', reason: 'Follower count alone is not enough. Please share recent reach and engagement (last 30 days) and how your audience relates to business owners.' },
        ],
      },
    },
  ];
}

/** Demo shortcut: the active business as an approved partner with a few months of history. */
export function demoApprovedPartner(client: AdminClient, owner: string): PartnerRecord {
  const DAY = 86_400_000;
  const now = Date.now();
  const h: H = {
    ago: (ms: number) => now - ms,
    isoDate: (d: number) => new Date(now + d * DAY).toISOString().slice(0, 10),
    DAY,
    HOUR: DAY / 24,
  };
  const base = seedPartners([client, client, client, client], h)[0];
  const code = `${owner.split(' ')[0]}GROWS`.toUpperCase().replace(/[^A-Z]/g, '');
  base.id = 'pt1';
  base.clientId = 'c1';
  base.name = owner;
  base.handle = client.handle;
  base.program!.code = code;
  base.program!.link = `magnet.app/r/${code.toLowerCase()}`;
  base.application.history = base.application.history.map((x) => (x.actor.endsWith('(client)') ? { ...x, actor: `${owner} (client)` } : x));
  return base;
}
