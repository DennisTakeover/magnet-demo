import { useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, Clock, Copy, FileText, Gift, Handshake, Link2, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { logActivity, navigate, routeQuery, useStore } from '../store';
import { Badge, Field, Modal, PageHeader, dateTime } from '../components/ui';
import { namesOf, PLAN_BASE, PLAN_FULL } from '../billing';
import {
  APP_STATUS, LEDGER_STATE, PAYOUT_STATE, POLICY_VERSION, agreementOf, calcCommission, demoPartner, earningsActive, fmt, hist, isAccepted,
  missingTerms, newReferral, PROGRAM_RATE, durationLabel, earningsByMonth, nextPayoutDate, planLabel, round2, payoutBlockers, recordPaidInvoice, recordRefund, summary, today, usd,
} from '../partners';
import { EMPTY_FORM, demoApprovedPartner } from '../partnerSeed';
import type { PartnerApplicationForm, PartnerRecord, ReferralStatus, State } from '../types';

const REQUIRED: (keyof PartnerApplicationForm)[] = ['business', 'role', 'profileLinks', 'country', 'niche', 'reachEvidence', 'audienceFit', 'promotion', 'contactEmail'];

const FIELDS: { k: keyof PartnerApplicationForm; label: string; hint?: string; long?: boolean }[] = [
  { k: 'business', label: 'Business name' },
  { k: 'role', label: 'Your role', hint: 'For example owner, founder or marketing lead' },
  { k: 'profileLinks', label: 'Profile links', hint: 'Instagram, YouTube, newsletter or other channels, separated by commas' },
  { k: 'country', label: 'Country' },
  { k: 'language', label: 'Languages you publish in' },
  { k: 'niche', label: 'Audience niche' },
  { k: 'reachEvidence', label: 'Recent reach and engagement', hint: 'Last 30 days: average reach, engagement or views. Follower count alone is not the criterion.', long: true },
  { k: 'audienceFit', label: 'Why your audience fits MAGNET', hint: 'Do business owners, shops or coaches follow you?', long: true },
  { k: 'promotion', label: 'How you’d promote MAGNET', hint: 'Channel, format and how often', long: true },
  { k: 'contactEmail', label: 'Contact email' },
];

const actor = (s: State) => `${s.business.owner} (client)`;

export default function Partner() {
  const { state } = useStore();
  const rec = demoPartner(state);
  if (rec?.program && rec.application.status === 'approved') return <PartnerDashboard rec={rec} />;
  return <Apply rec={rec} />;
}

/* ───────────── Before approval ───────────── */

function Apply({ rec }: { rec?: PartnerRecord }) {
  const { state, update, toast } = useStore();
  const status = rec?.application.status ?? 'draft';
  const editable = status === 'draft' || status === 'more_info';
  const [form, setForm] = useState<PartnerApplicationForm>(
    rec?.application.form ?? { ...EMPTY_FORM, business: state.business.name, role: 'Owner', profileLinks: `instagram.com/${state.clients[0].handle.replace('@', '')}`, contactEmail: '' },
  );
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const missing = REQUIRED.filter((k) => !form[k].trim());
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.contactEmail.trim());

  const upsert = (d: State, f: PartnerApplicationForm) => {
    let r = d.partners.find((p) => p.clientId === 'c1');
    if (!r) {
      r = { id: 'pt1', clientId: 'c1', name: d.business.owner, handle: d.clients[0].handle, application: { form: f, status: 'draft', submittedAt: null, history: [] } };
      d.partners.unshift(r);
    }
    r.application.form = f;
    return r;
  };

  const saveDraft = () => {
    update((d) => {
      const r = upsert(d, form);
      r.application.history.push(hist(actor(d), 'Saved draft'));
    });
    toast('Draft saved. You can finish it later.', 'success');
  };

  const submit = () => {
    setTouched(true);
    if (missing.length || !emailOk || busy) return;
    setBusy(true);
    update((d) => {
      const r = upsert(d, form);
      // Idempotent: a second click or a retried request never creates a second submission
      if (r.application.status !== 'draft' && r.application.status !== 'more_info') return;
      const resubmit = r.application.status === 'more_info';
      r.application.status = 'submitted';
      r.application.submittedAt = Date.now();
      r.application.history.push(hist(actor(d), resubmit ? 'Sent updated application' : 'Submitted application'));
      logActivity(d, { actor: actor(d), actorRole: 'client', clientId: 'c1', type: 'partner', action: resubmit ? 'Sent updated partner application' : 'Applied to the Partner Program', result: 'success' });
    });
    toast('Application sent. No benefits apply until the team approves it.', 'success');
    window.setTimeout(() => setBusy(false), 400);
  };

  return (
    <>
      <PageHeader title="Partner Program" subtitle="Promote MAGNET to your network. Approved partners get complimentary access and a share of recurring results from customers they refer." />

      {rec && status !== 'draft' && <StatusCard rec={rec} />}

      {(!rec || status === 'draft') && (
        <div className="partner-intro">
          <section className="card">
            <h2><Handshake size={18} aria-hidden /> How it works</h2>
            <ol className="partner-steps">
              <li><strong>Apply.</strong> Tell us about your audience and how you’d share MAGNET. Any customer can apply, whatever plan you have.</li>
              <li><strong>Review.</strong> The team looks at audience fit and engagement, not just follower count. We may ask for more information.</li>
              <li><strong>Agreement.</strong> If approved, you get a written agreement with the commission basis, rate, duration, payout rules and what you agree to publish.</li>
              <li><strong>Share and earn.</strong> Your personal link and code credit customers you refer. Commission accrues on their paid invoices under your agreement.</li>
            </ol>
          </section>
          <section className="card">
            <h2><ShieldCheck size={18} aria-hidden /> Good to know</h2>
            <ul className="plain-list small">
              <li>Complimentary modules are subject to approval and to the deliverables you agree to.</li>
              <li><strong>You earn {PROGRAM_RATE}% of what customers you referred pay us</strong>, every month, for as long as they keep paying. It is not guaranteed income and depends on what they actually pay.</li>
              <li>No commission on free access, unpaid invoices, tax, self-referrals or duplicate accounts.</li>
              <li>Your own subscription and your partnership are separate: one never silently changes the other.</li>
              <li>You see referral references and their status, never other customers’ names, messages or workspaces.</li>
            </ul>
          </section>
        </div>
      )}

      {(!rec || status === 'draft') && <EarningsCalculator rate={PROGRAM_RATE} duration={null} />}

      {editable && (
        <section className="card" aria-labelledby="apply-h">
          <h2 id="apply-h">{status === 'more_info' ? 'Update your application' : 'Application'}</h2>
          <div className="form-grid">
            {FIELDS.map((f) => {
              const err = touched && REQUIRED.includes(f.k) && !form[f.k].trim() ? 'Required' : touched && f.k === 'contactEmail' && form.contactEmail && !emailOk ? 'Enter a valid email' : undefined;
              return (
                <div key={f.k} className={f.long ? 'span-2' : ''}>
                  <Field label={f.label + (REQUIRED.includes(f.k) ? '' : ' (optional)')} hint={f.hint} error={err}>
                    {f.long ? (
                      <textarea rows={3} value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
                    ) : (
                      <input value={form[f.k]} onChange={(e) => setForm({ ...form, [f.k]: e.target.value })} />
                    )}
                  </Field>
                </div>
              );
            })}
          </div>
          {touched && (missing.length > 0 || !emailOk) && <p className="field-error" role="alert">Please complete the required fields before submitting.</p>}
          <div className="row gap-sm wrap">
            <button className="btn btn-primary" onClick={submit} disabled={busy}>{status === 'more_info' ? 'Send updated application' : 'Submit application'}</button>
            {status === 'draft' && <button className="btn btn-ghost" onClick={saveDraft}>Save draft</button>}
          </div>
          <p className="muted xsmall">Submitting doesn’t grant any benefit. Demo: nothing is sent; review happens in <a href="#/admin/partners">Admin → Partners</a>.</p>
        </section>
      )}

      {(!rec || status === 'draft') && (
        <section className="card demo-sim">
          <h2>Demo: see the partner dashboard</h2>
          <p className="muted small">Skip the review and open the dashboard of an approved partner with a few months of example referrals and earnings.</p>
          <button className="btn btn-secondary" onClick={() => {
            update((d) => {
              d.partners = d.partners.filter((p) => p.clientId !== 'c1');
              d.partners.unshift(demoApprovedPartner(d.clients[0], d.business.owner));
              logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'partner', action: 'Demo: loaded an approved partner with example history', result: 'success' });
            });
            toast('Showing an approved partner with example data', 'info');
          }}>Show an approved partner (demo)</button>
        </section>
      )}
    </>
  );
}

function StatusCard({ rec }: { rec: PartnerRecord }) {
  const a = rec.application;
  const [label, tone] = APP_STATUS[a.status];
  const steps = ['submitted', 'under_review', 'decision'] as const;
  const at = a.status === 'submitted' ? 0 : a.status === 'under_review' || a.status === 'more_info' ? 1 : 2;
  return (
    <section className="card partner-status" aria-labelledby="st-h">
      <div className="card-head">
        <h2 id="st-h">Your application</h2>
        <Badge tone={tone} dot>{label}</Badge>
      </div>
      <ol className="status-steps" aria-label="Application progress">
        {steps.map((s, i) => (
          <li key={s} className={i < at ? 'done' : i === at ? 'now' : ''}>
            <span className="dot" aria-hidden>{i < at ? <Check size={12} /> : i + 1}</span>
            {s === 'submitted' ? 'Submitted' : s === 'under_review' ? 'Under review' : 'Decision'}
          </li>
        ))}
      </ol>
      {a.status === 'submitted' && <p className="small">Thanks! The team reviews applications in the order they arrive. You’ll see the outcome here.</p>}
      {a.status === 'under_review' && <p className="small">The team is reviewing your audience and promotion plan. No action needed right now.</p>}
      {a.status === 'more_info' && (
        <div className="notice notice-amber" role="status">
          <AlertTriangle size={16} aria-hidden />
          <div><strong>More information needed.</strong> {a.infoRequest}<br /><span className="small">Update your application below and send it again.</span></div>
        </div>
      )}
      {a.status === 'declined' && (
        <div className="notice notice-neutral">
          <div><strong>Not approved this time.</strong> {a.history.filter((h) => h.action.startsWith('Declined')).pop()?.reason}<br /><span className="small">Your MAGNET subscription is not affected. You’re welcome to apply again when your audience or plans change.</span></div>
        </div>
      )}
      <details className="small">
        <summary>History</summary>
        <ul className="plain-list">
          {a.history.map((h, i) => <li key={i}>{dateTime(h.time)} · {h.action}{h.reason ? ` — ${h.reason}` : ''}</li>)}
        </ul>
      </details>
    </section>
  );
}

/* ───────────── After approval ───────────── */

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'links', label: 'Referral links' },
  { id: 'content', label: 'Content & commitments' },
  { id: 'earnings', label: 'Earnings' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'agreement', label: 'Agreement' },
] as const;

function PartnerDashboard({ rec }: { rec: PartnerRecord }) {
  const tab = routeQuery().get('tab') ?? 'overview';
  const prog = rec.program!;
  const accepted = isAccepted(rec);
  const statusBadge = prog.status === 'active' ? <Badge tone="green" dot>Active partner</Badge> : prog.status === 'paused' ? <Badge tone="amber" dot>Paused</Badge> : <Badge tone="neutral" dot>Ended</Badge>;
  return (
    <>
      <PageHeader title="Partner Program" subtitle={<>Your partnership with MAGNET {statusBadge}</>} />
      {!accepted && prog.status !== 'ended' && (
        <div className="banner banner-amber" role="status">
          <FileText size={18} aria-hidden />
          <span><strong>You’re approved.</strong> Review and accept your agreement to activate your referral link and complimentary modules.</span>
          <a className="btn btn-sm btn-secondary" href="#/app/partner?tab=agreement">Review agreement</a>
        </div>
      )}
      {prog.newReferralsPaused && prog.status !== 'ended' && <div className="notice notice-amber"><AlertTriangle size={16} aria-hidden /> New referrals are paused. Existing referrals and earned commission are not affected.</div>}
      <div className="tabs" role="tablist" aria-label="Partner sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => navigate(`/app/partner?tab=${t.id}`)}>{t.label}</button>
        ))}
      </div>
      {tab === 'overview' && <OverviewTab rec={rec} />}
      {tab === 'links' && <LinksTab rec={rec} />}
      {tab === 'content' && <ContentTab rec={rec} />}
      {tab === 'earnings' && <EarningsTab rec={rec} />}
      {tab === 'payouts' && <PayoutsTab rec={rec} />}
      {tab === 'agreement' && <AgreementTab rec={rec} />}
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="metric">
      <span className="metric-label">{label}</span>
      <strong className="metric-value sm">{value}</strong>
      {hint && <span className="metric-def">{hint}</span>}
    </div>
  );
}

function OverviewTab({ rec }: { rec: PartnerRecord }) {
  const s = summary(rec);
  const a = agreementOf(rec)!;
  const prog = rec.program!;
  const missing = missingTerms(a);
  const months = earningsByMonth(rec);
  const maxMonth = Math.max(1, ...months.map((m) => m.amount));
  const thisMonth = months[months.length - 1].amount;
  const earnedTotal = round2(prog.ledger.reduce((t, e) => t + e.amountUsd, 0));
  const yearly = s.estimated != null ? round2(s.estimated * 12) : null;
  const payingRefs = prog.referrals.filter((r) => r.status === 'paying' || prog.ledger.some((e) => e.referralRef === r.ref));
  const monthsSince = (t: number) => Math.floor((Date.now() - t) / (30 * 86_400_000));
  return (
    <>
      <section className="card earn-hero" aria-labelledby="earn-h">
        <div className="earn-main">
          <span className="eyebrow" id="earn-h">You earn</span>
          <strong className="earn-rate">{a.ratePercent ?? '—'}%</strong>
          <p className="small">of everything your referred customers pay MAGNET, {durationLabel(a)}. Excl. tax, after discounts and refunds.</p>
          <p className="xsmall muted">Example: a customer on Growth pays {usd(PLAN_BASE)} a month → you get <strong>{usd(calcCommission(a, PLAN_BASE).amountUsd)}</strong>. On the full package ({usd(PLAN_FULL)}) → <strong>{usd(calcCommission(a, PLAN_FULL).amountUsd)}</strong> a month.</p>
        </div>
        <div className="earn-figures">
          <div><span className="metric-label">Current monthly earnings</span><span className="metric-value">{s.estimated == null ? '—' : usd(s.estimated)}</span><span className="metric-def">From {s.paying} paying customer{s.paying === 1 ? '' : 's'} · ≈ {yearly == null ? '—' : usd(yearly)} a year if they stay</span></div>
          <div><span className="metric-label">Earned so far</span><span className="metric-value sm">{usd(earnedTotal)}</span><span className="metric-def">All entries, after refunds</span></div>
          <div><span className="metric-label">Paid out</span><span className="metric-value sm">{usd(s.paid)}</span><span className="metric-def">Payable now {usd(s.payable)} · next payout review {fmt(nextPayoutDate())}</span></div>
        </div>
      </section>
      {missing.length > 0 && <div className="notice notice-amber"><Lock size={16} aria-hidden /> Earnings activate once your agreement has a {missing.join(', ')}.</div>}

      <div className="grid-2">
        <section className="card" aria-labelledby="em-h">
          <div className="card-head"><h2 id="em-h">Earnings per month</h2><span className="muted small">This month {usd(thisMonth)}</span></div>
          <div className="cols" role="img" aria-label={`Earnings per month: ${months.map((m) => `${m.label} ${usd(m.amount)}`).join(', ')}`}>
            {months.map((m) => (
              <div key={m.key} className="col" title={`${m.label}: ${usd(m.amount)}`}>
                <span className="col-value">{m.amount ? `$${Math.round(m.amount)}` : '0'}</span>
                <span className="col-bar" style={{ height: `${Math.max(3, (m.amount / maxMonth) * 100)}%` }} />
                <span className="col-label">{m.label}</span>
              </div>
            ))}
          </div>
          <p className="muted xsmall">Includes provisional and pending amounts. See Earnings for the full statement.</p>
        </section>
        <section className="card" aria-labelledby="funnel-h">
          <h2 id="funnel-h">Your referrals</h2>
          <ul className="hbars" aria-label="Referral funnel">
            {[['Link visits', prog.funnel.visits], ['Signups', s.signups], ['Paying customers', s.paying]].map(([l, n]) => (
              <li key={l as string} title={`${l}: ${n}`}>
                <span className="hbar-label">{l}</span>
                <span className="hbar-track"><span className="hbar-fill" style={{ width: `${Math.max(2, ((n as number) / Math.max(1, prog.funnel.visits, s.signups)) * 100)}%` }} /></span>
                <span className="hbar-value">{n}{l !== 'Link visits' && prog.funnel.visits > 0 && <span className="muted xsmall"> · {((((n as number) / prog.funnel.visits) * 100)).toFixed(1)}%</span>}</span>
              </li>
            ))}
          </ul>
          <p className="muted xsmall">Referred customers together pay {usd(s.referredMrr)} a month. That is their payment, not your earnings.</p>
        </section>
      </div>

      <section className="card table-card" aria-labelledby="per-h">
        <h2 id="per-h" className="pad">What each customer brings you</h2>
        {payingRefs.length === 0 ? <p className="muted small pad">Nothing yet. Once someone you referred pays their first invoice, you’ll see it here.</p> : (
          <table className="table">
            <thead><tr><th>Referral</th><th>Plan</th><th>They pay / month</th><th>You get / month</th><th>Earned so far</th><th>Runs</th></tr></thead>
            <tbody>
              {payingRefs.map((r) => {
                const earned = round2(prog.ledger.filter((e) => e.referralRef === r.ref).reduce((t, e) => t + e.amountUsd, 0));
                const left = !a.whilePaying && a.durationMonths != null && r.lockedAt ? Math.max(0, a.durationMonths - monthsSince(r.lockedAt)) : null;
                return (
                  <tr key={r.id}>
                    <td><strong>{r.ref}</strong><div className="muted xsmall">{r.segment}</div></td>
                    <td>{r.status === 'paying' ? planLabel(r.mrrUsd) : <RefBadge status={r.status} />}</td>
                    <td>{r.status === 'paying' ? usd(r.mrrUsd) : '—'}</td>
                    <td><strong>{r.status === 'paying' ? usd(calcCommission(a, r.mrrUsd).amountUsd) : usd(0)}</strong></td>
                    <td>{usd(earned)}</td>
                    <td>{r.status !== 'paying' ? 'Stopped paying' : a.whilePaying ? 'While they pay' : left == null ? '—' : `${left} of ${a.durationMonths} months left`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <EarningsCalculator rate={a.ratePercent ?? PROGRAM_RATE} duration={a.whilePaying ? null : a.durationMonths} />

      <div className="grid-2">
        <section className="card">
          <h2><Gift size={18} aria-hidden /> Complimentary access</h2>
          {isAccepted(rec) && prog.status !== 'ended' ? (
            <>
              <p className="small">{namesOf(a.grantModules)}</p>
              <p className="muted small">Until {a.grantUntil ? fmt(a.grantUntil) : '—'}. Linked to your agreed deliverables. When it ends we show what stops first; paid continuation is always your own choice.</p>
            </>
          ) : (
            <p className="muted small">{prog.status === 'ended' ? 'Ended with the partnership. No billing started.' : 'Starts when you accept your agreement.'}</p>
          )}
        </section>
        <section className="card">
          <h2><Clock size={18} aria-hidden /> Next review</h2>
          <p className="small">{a.reviewDate ? fmt(a.reviewDate) : 'Not scheduled'}</p>
          <p className="muted small">We look at your commitments and referral quality together. No promise of a set number of sales or followers.</p>
          <a className="btn btn-sm btn-ghost" href="#/app/partner?tab=content">See commitments</a>
        </section>
      </div>
    </>
  );
}

/** "What could I earn?" Pure arithmetic on list prices; clearly an example, not a promise. */
export function EarningsCalculator({ rate, duration }: { rate: number; duration: number | null }) {
  const [starter, setStarter] = useState(5);
  const [growth, setGrowth] = useState(2);
  const monthly = round2(((starter * PLAN_BASE + growth * PLAN_FULL) * rate) / 100);
  const span = duration ?? 12;
  const ongoing = duration == null;
  return (
    <section className="card calc" aria-labelledby="calc-h">
      <h2 id="calc-h">What could you earn?</h2>
      <p className="small muted">Move the sliders to see what {rate}% of your referred customers’ payments adds up to.</p>
      <div className="calc-grid">
        <label className="calc-row">
          <span>Customers on Growth <span className="muted xsmall">({usd(PLAN_BASE)}/month → you {usd((PLAN_BASE * rate) / 100)})</span></span>
          <input type="range" min={0} max={50} value={starter} onChange={(e) => setStarter(Number(e.target.value))} aria-label="Customers on Growth" />
          <strong>{starter}</strong>
        </label>
        <label className="calc-row">
          <span>Customers on the full package <span className="muted xsmall">({usd(PLAN_FULL)}/month → you {usd((PLAN_FULL * rate) / 100)})</span></span>
          <input type="range" min={0} max={50} value={growth} onChange={(e) => setGrowth(Number(e.target.value))} aria-label="Customers on the full package" />
          <strong>{growth}</strong>
        </label>
      </div>
      <div className="calc-out">
        <div><span className="metric-label">Per month</span><span className="metric-value sm" data-testid="calc-monthly">{usd(monthly)}</span></div>
        <div><span className="metric-label">{ongoing ? 'Per year' : `Over ${span} months`}</span><span className="metric-value sm">{usd(round2(monthly * span))}</span></div>
      </div>
      <p className="muted xsmall">Example at list prices, assuming every customer keeps paying. {ongoing ? 'You keep earning for as long as they stay a paying customer.' : ''} Real earnings depend on what customers actually pay; discounts, refunds and cancellations lower them. Not guaranteed income.</p>
    </section>
  );
}

const CLAIMS = [
  'MAGNET helps business owners plan Instagram content, answer DMs and follow up on leads in one place.',
  'You stay in control: AI drafts replies in Assist mode and you approve them.',
  'MAGNET connects through the official Instagram login. It never asks for your password.',
  'Plans are built from modules, so you only pay for what you use.',
];

function LinksTab({ rec }: { rec: PartnerRecord }) {
  const { state, update, toast } = useStore();
  const prog = rec.program!;
  const usable = isAccepted(rec) && prog.status === 'active' && !prog.newReferralsPaused;
  const [label, setLabel] = useState('');
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const link = `https://${prog.link}${slug ? `?c=${slug}` : ''}`;
  const copy = (text: string, what: string) => {
    navigator.clipboard?.writeText(text).catch(() => undefined);
    toast(`${what} copied`, 'success');
  };

  const sim = (kind: 'link' | 'code' | 'paid' | 'duplicate' | 'refund' | 'self' | 'failed') => {
    let msg = '';
    let tone: 'success' | 'info' | 'warning' = 'success';
    update((d) => {
      const r = d.partners.find((p) => p.id === rec.id)!;
      const pr = r.program!;
      const act = actor(d);
      if (kind === 'link' || kind === 'code') {
        const ref = newReferral(r, kind, d.persona === 'coach' ? 'Coach' : d.persona === 'webshop' ? 'Webshop' : 'Local shop');
        msg = `New signup ${ref.ref} via your ${kind}. It counts once they pay.`;
        logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'partner', action: `Referral ${ref.ref} signed up via ${kind} (policy ${POLICY_VERSION})`, result: 'success' });
        return;
      }
      if (kind === 'self') {
        const ref = newReferral(r, 'code', 'Unknown');
        ref.status = 'needs_review';
        ref.flag = 'Billing identity matches the partner’s own account';
        msg = `Signup ${ref.ref} needs a review before it can count. No commission is created meanwhile.`;
        tone = 'warning';
        logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'partner', action: `Referral ${ref.ref} flagged for review (possible self-referral)`, result: 'success' });
        return;
      }
      const lastPaying = [...pr.ledger].reverse().find((e) => e.kind === 'accrual');
      if (kind === 'duplicate') {
        if (!lastPaying) { msg = 'No paid invoice yet to duplicate.'; tone = 'info'; return; }
        const refId = pr.referrals.find((x) => x.ref === lastPaying.referralRef)!.id;
        recordPaidInvoice(r, refId, lastPaying.invoiceLine, lastPaying.revenueUsd);
        msg = `Billing sent ${lastPaying.invoiceLine} again. Already credited, so no second accrual.`;
        tone = 'info';
        return;
      }
      if (kind === 'refund') {
        if (!lastPaying) { msg = 'No paid invoice yet to refund.'; tone = 'info'; return; }
        const rev = recordRefund(r, lastPaying.invoiceLine, lastPaying.revenueUsd / 2);
        msg = rev ? `Partial refund on ${lastPaying.invoiceLine}: linked correction ${usd(rev.amountUsd)} added. The original entry stays in your statement.` : 'Nothing left to refund on that invoice.';
        tone = 'info';
        if (rev) logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'partner', action: `Refund reversal ${rev.id} for ${lastPaying.invoiceLine}`, result: 'success' });
        return;
      }
      const target = pr.referrals.find((x) => x.status === 'trial');
      if (!target) { msg = 'Simulate a signup first.'; tone = 'info'; return; }
      const n = pr.processedInvoices.length + 1;
      if (kind === 'failed') {
        const res = recordPaidInvoice(r, target.id, `INV-D${9100 + n}-L1`, 0);
        msg = res === 'zero' ? `Payment failed for ${target.ref}: nothing was collected, so no commission.` : 'No commission created.';
        tone = 'info';
        return;
      }
      const amount = d.persona === 'webshop' ? PLAN_FULL : PLAN_BASE;
      const res = recordPaidInvoice(r, target.id, `INV-D${9100 + n}-L1`, amount);
      if (res === 'credited') {
        msg = `${target.ref} paid their first invoice. Attribution is now locked and a provisional commission was added.`;
        logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'partner', action: `Paid conversion ${target.ref}: attribution locked, provisional accrual added`, result: 'success' });
      } else {
        msg = res === 'inactive' ? 'Earnings are not active yet, so no commission was created.' : 'No commission created.';
        tone = 'info';
      }
      void act;
    });
    toast(msg, tone);
  };

  return (
    <>
      <div className="grid-2">
        <section className="card">
          <h2><Link2 size={18} aria-hidden /> Your referral link</h2>
          {usable ? (
            <>
              <div className="copy-row"><code>{link}</code><button className="btn btn-sm btn-secondary" onClick={() => copy(link, 'Link')}><Copy size={14} /> Copy link</button></div>
              <Field label="Campaign label (optional)" hint="Helps you compare posts. It never changes who gets credit.">
                <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. spring-reel" />
              </Field>
            </>
          ) : (
            <p className="muted small">{!isAccepted(rec) ? 'Available after you accept your agreement.' : 'Not available while new referrals are paused or the partnership has ended.'}</p>
          )}
        </section>
        <section className="card">
          <h2>Your partner code</h2>
          {usable ? (
            <div className="copy-row"><code className="big-code">{prog.code}</code><button className="btn btn-sm btn-secondary" onClick={() => copy(prog.code, 'Code')}><Copy size={14} /> Copy code</button></div>
          ) : <p className="muted small">Available after you accept your agreement.</p>}
          <p className="muted small">This is a partner code, not a discount code. A code entered at signup takes precedence over an earlier link visit within the {agreementOf(rec)!.attributionDays}-day window. Credit locks on the customer’s first paid invoice.</p>
        </section>
      </div>

      <section className="card table-card" aria-labelledby="refs-h">
        <h2 id="refs-h" className="pad">Referrals</h2>
        {prog.referrals.length === 0 ? <p className="muted small pad">No referrals yet. Share your link or code to get started.</p> : (
          <table className="table">
            <thead><tr><th>Reference</th><th>Status</th><th>Type</th><th>Via</th><th>Signed up</th><th>Attribution</th></tr></thead>
            <tbody>
              {prog.referrals.map((r) => (
                <tr key={r.id}>
                  <td><strong>{r.ref}</strong></td>
                  <td><RefBadge status={r.status} /></td>
                  <td>{r.segment}</td>
                  <td>{r.via === 'unknown' ? 'Unknown' : r.via === 'code' ? 'Code' : 'Link'}</td>
                  <td>{dateTime(r.signedUpAt)}</td>
                  <td>{r.lockedAt ? 'Locked' : r.status === 'needs_review' ? 'In review' : 'Not yet'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="muted xsmall pad">You see a reference and commercial status only, never the customer’s name, messages or workspace.</p>
      </section>

      {isAccepted(rec) && prog.status !== 'ended' && (
        <section className="card demo-sim" aria-labelledby="sim-h">
          <h2 id="sim-h">Demo: simulate referral activity</h2>
          <p className="muted small">Nothing real happens. These buttons show how credit and commission behave.</p>
          <div className="row gap-sm wrap">
            <button className="btn btn-sm btn-secondary" onClick={() => sim('link')} disabled={!usable}>Simulate signup via link</button>
            <button className="btn btn-sm btn-secondary" onClick={() => sim('code')} disabled={!usable}>Simulate signup with code</button>
            <button className="btn btn-sm btn-secondary" onClick={() => sim('paid')}>Simulate first paid invoice</button>
            <button className="btn btn-sm btn-ghost" onClick={() => sim('failed')}>Simulate failed payment</button>
            <button className="btn btn-sm btn-ghost" onClick={() => sim('duplicate')}>Simulate duplicate billing event</button>
            <button className="btn btn-sm btn-ghost" onClick={() => sim('refund')}>Simulate partial refund</button>
            <button className="btn btn-sm btn-ghost" onClick={() => sim('self')} disabled={!usable}>Simulate self-referral</button>
          </div>
          <p className="muted xsmall">Active persona: {state.business.name}</p>
        </section>
      )}

      <section className="card" aria-labelledby="claims-h">
        <h2 id="claims-h">Approved claims</h2>
        <p className="muted small">Use these factual statements. Please don’t promise specific sales, follower numbers or features that aren’t live.</p>
        <ul className="plain-list small claims">{CLAIMS.map((c) => <li key={c}><CheckCircle2 size={14} aria-hidden /> {c}</li>)}</ul>
        <p className="small"><strong>Disclosure:</strong> always make the partnership clear, for example “#ad” or “Partner of MAGNET”, and use your platform’s paid-partnership label where available. Local rules may require more.</p>
      </section>
    </>
  );
}

export function RefBadge({ status }: { status: ReferralStatus }) {
  const map: Record<string, [string, 'green' | 'amber' | 'red' | 'blue' | 'neutral']> = {
    clicked: ['Visited', 'neutral'], signed_up: ['Signed up', 'blue'], trial: ['Trial', 'blue'], paying: ['Paying', 'green'], cancelled: ['Cancelled', 'neutral'], needs_review: ['Needs review', 'amber'],
  };
  const [l, t] = map[status];
  return <Badge tone={t}>{l}</Badge>;
}

const COMMIT: Record<string, [string, 'green' | 'amber' | 'red' | 'blue' | 'neutral']> = {
  todo: ['To do', 'neutral'], submitted: ['Submitted', 'blue'], verified: ['Verified', 'green'], needs_changes: ['Needs changes', 'amber'], rejected: ['Rejected', 'red'], overdue: ['Overdue', 'amber'],
};
export const commitBadge = (s: string) => <Badge tone={COMMIT[s][1]}>{COMMIT[s][0]}</Badge>;

function ContentTab({ rec }: { rec: PartnerRecord }) {
  const { update, toast } = useStore();
  const prog = rec.program!;
  const [url, setUrl] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const submit = (id: string) => {
    const v = (url[id] ?? '').trim();
    if (!/^(https?:\/\/)?[\w-]+(\.[\w-]+)+\S*$/.test(v)) { setErr(id); return; }
    setErr(null);
    update((d) => {
      const c = d.partners.find((p) => p.id === rec.id)!.program!.commitments.find((x) => x.id === id)!;
      c.status = 'submitted';
      c.evidenceUrl = v;
      c.history.push(hist(actor(d), 'Submitted evidence', v));
      logActivity(d, { actor: actor(d), actorRole: 'client', clientId: 'c1', type: 'partner', action: `Submitted evidence for ${c.format}`, result: 'success' });
    });
    toast('Evidence sent for review.', 'success');
  };
  return (
    <>
      <section className="card">
        <h2>What you agreed to publish</h2>
        <p className="muted small">Each item lists channel, format and deadline. Add the post link when it’s live. A missed deadline leads to a conversation with the team, never an automatic charge.</p>
        {prog.commitments.length === 0 && <p className="muted small">No commitments in your agreement.</p>}
        <div className="commit-list">
          {prog.commitments.map((c) => (
            <article key={c.id} className="commit">
              <div className="card-head">
                <div>
                  <strong>{c.format}</strong> <span className="muted small">· {c.channel}</span>
                  <p className="muted small">Due {fmt(c.deadline)} · Use your tracked link or code {prog.code}</p>
                </div>
                {commitBadge(c.status)}
              </div>
              {c.reviewNote && <p className="small"><strong>Team note:</strong> {c.reviewNote}</p>}
              {c.evidenceUrl && <p className="small muted">Evidence: {c.evidenceUrl}</p>}
              {['todo', 'needs_changes', 'overdue'].includes(c.status) && isAccepted(rec) && prog.status !== 'ended' && (
                <div className="row gap-sm wrap commit-form">
                  <label className="grow">
                    <span className="sr-only">Post link for {c.format}</span>
                    <input placeholder="Link to the published post" value={url[c.id] ?? ''} onChange={(e) => setUrl({ ...url, [c.id]: e.target.value })} aria-label={`Post link for ${c.format}`} />
                  </label>
                  <button className="btn btn-sm btn-primary" onClick={() => submit(c.id)}>Submit evidence</button>
                </div>
              )}
              {err === c.id && <p className="field-error">Enter the link to the published post.</p>}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function EarningsTab({ rec }: { rec: PartnerRecord }) {
  const s = summary(rec);
  const a = agreementOf(rec)!;
  const ledger = [...rec.program!.ledger].reverse();
  return (
    <>
      <div className="metric-grid partner-metrics">
        <Stat label="Provisional" value={usd(s.provisional)} hint="Costs for the period are not final yet" />
        <Stat label="Pending hold" value={usd(s.pendingHold)} hint={`Held ${a.holdDays} days for refunds`} />
        <Stat label="Payable" value={usd(s.payable)} />
        <Stat label="Scheduled" value={usd(s.scheduled)} />
        <Stat label="Paid" value={usd(s.paid)} />
      </div>
      <section className="card">
        <h2>How commission is calculated</h2>
        {missingTerms(a).length ? <p className="small">Your agreement isn’t complete yet, so nothing accrues.</p> : (
          <p className="small">
            {a.basis === 'contribution_profit'
              ? <>For each paid invoice: collected subscription revenue (excl. tax, after discounts and refunds) minus the agreed costs ({a.costs.paymentFeePercent}% payment fee and {usd(a.costs.serviceCostUsd)} service cost), never below zero, × {a.ratePercent}%.</>
              : <>For each paid invoice: collected subscription revenue (excl. tax, after discounts and refunds) × {a.ratePercent}%.</>}
            {' '}Example for a {usd(PLAN_BASE)} invoice: {usd(calcCommission(a, PLAN_BASE).amountUsd)}. Paid {durationLabel(a)}.
          </p>
        )}
        <p className="muted xsmall">Settlement currency: USD. Refunds create a linked correction; earlier entries are never changed.</p>
      </section>
      <section className="card table-card" aria-labelledby="stmt-h">
        <h2 id="stmt-h" className="pad">Statement</h2>
        {ledger.length === 0 ? <p className="muted small pad">No entries yet. Commission appears after a referred customer’s first paid invoice.</p> : (
          <table className="table statement">
            <thead><tr><th>Entry</th><th>Referral</th><th>Invoice line</th><th>Revenue</th><th>Costs</th><th>Basis</th><th>Commission</th><th>Status</th></tr></thead>
            <tbody>
              {ledger.map((e) => (
                <tr key={e.id} className={e.kind === 'reversal' ? 'reversal' : ''}>
                  <td>{e.id}<div className="muted xsmall">{e.period} · v{e.agreementVersion}</div></td>
                  <td>{e.referralRef}</td>
                  <td>{e.invoiceLine}{e.reversesId && <div className="muted xsmall">Corrects {e.reversesId}</div>}</td>
                  <td>{usd(e.revenueUsd)}</td>
                  <td>{usd(e.costsUsd)}{!e.costsFinal && <div className="muted xsmall">estimate</div>}</td>
                  <td>{usd(e.basisUsd)}</td>
                  <td><strong>{usd(e.amountUsd)}</strong></td>
                  <td><Badge tone={LEDGER_STATE[e.state][1]}>{LEDGER_STATE[e.state][0]}</Badge>{e.holdUntil && e.state === 'pending_hold' && <div className="muted xsmall">until {fmt(e.holdUntil)}</div>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function PayoutsTab({ rec }: { rec: PartnerRecord }) {
  const { update, toast } = useStore();
  const [open, setOpen] = useState(false);
  const prog = rec.program!;
  const a = agreementOf(rec)!;
  const blockers = payoutBlockers(rec).filter((b) => b !== 'A payout is already in progress');
  const connect = () => {
    update((d) => {
      const p = d.partners.find((x) => x.id === rec.id)!.program!;
      p.payoutDetails = true;
      logActivity(d, { actor: actor(d), actorRole: 'client', clientId: 'c1', type: 'partner', action: 'Added payout details via the payment provider (simulated)', result: 'success' });
    });
    setOpen(false);
    toast('Payout details saved with the payment provider.', 'success');
  };
  return (
    <>
      <section className="card">
        <h2><Wallet size={18} aria-hidden /> Payout details</h2>
        {prog.payoutDetails ? <p className="small"><CheckCircle2 size={14} aria-hidden /> Saved with our payment provider. MAGNET only sees that they’re complete.</p> : (
          <>
            <p className="small">Add where you want to receive payouts. You enter bank details on the payment provider’s secure page, not in MAGNET.</p>
            <button className="btn btn-primary" onClick={() => setOpen(true)}>Add payout details</button>
          </>
        )}
        <p className="muted small">Payouts are reviewed by our finance team{a.payoutMinimumUsd != null ? ` once your payable balance reaches ${usd(a.payoutMinimumUsd)}` : ''}. Paid is shown only after the transfer is confirmed.</p>
        {blockers.length > 0 && <ul className="plain-list small blockers">{blockers.map((b) => <li key={b}><AlertTriangle size={14} aria-hidden /> {b}</li>)}</ul>}
      </section>
      <section className="card table-card">
        <h2 className="pad">Payouts</h2>
        {prog.payouts.length === 0 ? <p className="muted small pad">No payouts yet.</p> : (
          <table className="table">
            <thead><tr><th>Payout</th><th>Amount</th><th>Status</th><th>Created</th><th>Reference</th></tr></thead>
            <tbody>
              {[...prog.payouts].reverse().map((p) => (
                <tr key={p.id}><td>{p.id}</td><td>{usd(p.amountUsd)}</td><td><Badge tone={PAYOUT_STATE[p.state][1]}>{PAYOUT_STATE[p.state][0]}</Badge></td><td>{dateTime(p.createdAt)}</td><td className="small">{p.evidence ?? '—'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      {open && (
        <Modal title="Payment provider (simulated)" onClose={() => setOpen(false)} footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>Cancel</button><button className="btn btn-primary" onClick={connect}>Save on provider page</button></>}>
          <p className="small">In the real product this opens the payment provider’s own secure page, where you enter bank or payout account details. MAGNET never stores them.</p>
          <p className="muted xsmall">Demo: no details are collected.</p>
        </Modal>
      )}
    </>
  );
}

function AgreementTab({ rec }: { rec: PartnerRecord }) {
  const { state, update, toast } = useStore();
  const [ending, setEnding] = useState(false);
  const a = agreementOf(rec)!;
  const prog = rec.program!;
  const missing = missingTerms(a);
  const overlap = a.grantModules.filter((m) => state.billing.modules.includes(m));
  const accept = () => {
    if (missing.length) return;
    update((d) => {
      const r = d.partners.find((x) => x.id === rec.id)!;
      const ag = r.program!.agreements[r.program!.agreements.length - 1];
      if (ag.acceptedAt) return;
      ag.acceptedAt = Date.now();
      r.application.history.push(hist(actor(d), `Accepted agreement v${ag.version}`));
      logActivity(d, { actor: actor(d), actorRole: 'client', clientId: 'c1', type: 'partner', action: `Accepted partner agreement v${ag.version}; complimentary ${namesOf(ag.grantModules)} until ${ag.grantUntil}`, result: 'success' });
    });
    toast('Agreement accepted. Your referral link is active.', 'success');
  };
  const end = () => {
    update((d) => {
      const r = d.partners.find((x) => x.id === rec.id)!;
      r.program!.status = 'ended';
      r.program!.newReferralsPaused = true;
      r.program!.endedAt = Date.now();
      r.application.history.push(hist(actor(d), 'Ended partnership'));
      logActivity(d, { actor: actor(d), actorRole: 'client', clientId: 'c1', type: 'partner', action: 'Ended partnership (earned balance kept, no billing started)', result: 'success' });
    });
    setEnding(false);
    toast('Partnership ended. Your earned balance and statements are kept.', 'info');
  };
  const rows: [string, string][] = [
    ['Commission basis', a.basis === 'contribution_profit' ? 'Contribution profit (revenue minus agreed costs)' : a.basis === 'revenue_share' ? 'Revenue share' : 'Not set'],
    ['Rate', a.ratePercent != null ? `${a.ratePercent}%` : 'Not set'],
    ['Duration per referred customer', a.whilePaying ? 'As long as the customer keeps paying' : a.durationMonths != null ? `${a.durationMonths} months from their first paid invoice` : 'Not set'],
    ['Agreed deductions', a.basis === 'contribution_profit' ? `${a.costs.paymentFeePercent}% payment fee + ${usd(a.costs.serviceCostUsd)} service cost per invoice` : 'None'],
    ['Eligible referrals', 'New billing customers who sign up with your code, or via your link within the attribution window'],
    ['Attribution window', `${a.attributionDays} days · policy ${POLICY_VERSION}`],
    ['Payout minimum', a.payoutMinimumUsd != null ? usd(a.payoutMinimumUsd) : 'Not set'],
    ['Hold period', `${a.holdDays} days`],
    ['Complimentary modules', `${namesOf(a.grantModules)} until ${a.grantUntil ? fmt(a.grantUntil) : '—'}`],
    ['Commitments', `${prog.commitments.length} items, see Content & commitments`],
    ['Next review', a.reviewDate ? fmt(a.reviewDate) : '—'],
  ];
  return (
    <>
      <section className="card" aria-labelledby="ag-h">
        <div className="card-head">
          <h2 id="ag-h">Agreement v{a.version}</h2>
          {a.acceptedAt ? <Badge tone="green" dot>Accepted {dateTime(a.acceptedAt)}</Badge> : <Badge tone="amber" dot>Waiting for you</Badge>}
        </div>
        <dl className="terms">
          {rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
        </dl>
        <p className="muted small">No equity, no company-wide profit share, no rewards for recruiting other partners, and no guaranteed income. New terms never rewrite commission you’ve already earned.</p>
        <p className="muted xsmall">Demo terms for illustration only. Live program terms are still to be decided.</p>
        {!a.acceptedAt && (
          <>
            {overlap.length > 0 && (
              <div className="notice notice-neutral small">
                You already pay for {namesOf(overlap)}. Accepting doesn’t change your invoice automatically: the team proposes any billing adjustment and you confirm it.
              </div>
            )}
            {missing.length > 0 && <p className="field-error" role="alert">The team still needs to set: {missing.join(', ')}. You can accept once these are complete.</p>}
            <button className="btn btn-primary" disabled={missing.length > 0} onClick={accept}>Accept agreement</button>
          </>
        )}
      </section>
      {prog.status !== 'ended' && (
        <section className="card">
          <h2>End partnership</h2>
          <p className="small muted">Ending the partnership is separate from your MAGNET subscription.</p>
          <button className="btn btn-ghost" onClick={() => setEnding(true)}>End partnership…</button>
        </section>
      )}
      {ending && <EndConsequences rec={rec} onClose={() => setEnding(false)} onConfirm={end} who="you" />}
    </>
  );
}

export function EndConsequences({ rec, onClose, onConfirm, who }: { rec: PartnerRecord; onClose: () => void; onConfirm: () => void; who: 'you' | 'admin' }) {
  const a = agreementOf(rec)!;
  const s = summary(rec);
  const earned = s.provisional + s.pendingHold + s.payable + s.scheduled;
  return (
    <Modal title="End partnership?" onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Keep partnership</button><button className="btn btn-danger" onClick={onConfirm}>End partnership</button></>}>
      <ul className="plain-list consequences small">
        <li><strong>Complimentary access:</strong> {namesOf(a.grantModules)} ends{who === 'you' ? '' : ` for ${rec.name}`}. Modules that are also paid keep working. Nothing paid starts automatically.</li>
        <li><strong>New referrals:</strong> the link and code stop crediting new signups.</li>
        <li><strong>Existing referrals:</strong> renewals follow the accepted agreement (v{a.version}).</li>
        <li><strong>Earned commission:</strong> {usd(earned)} not yet paid stays in the statement and is paid under the normal rules. Statements are kept.</li>
        <li><strong>Subscription:</strong> {who === 'you' ? 'your' : 'their'} MAGNET subscription is not changed.</li>
      </ul>
      <p className="muted xsmall">Today: {fmt(today())}</p>
    </Modal>
  );
}

export function earningsLabel(rec: PartnerRecord) {
  return earningsActive(rec) ? 'Earnings active' : 'Earnings not active';
}
