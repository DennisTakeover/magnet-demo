import { Fragment, useState } from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { logActivity, navigate, routeQuery, useStore } from '../store';
import { Badge, Field, Modal, PageHeader, Segmented, dateTime } from '../components/ui';
import { ReasonModal } from './shared';
import { ALL_MODULES, addDays, addMonths, moduleName } from '../billing';
import {
  APP_STATUS, FINANCE_ACTOR, LEDGER_STATE, PARTNER_MANAGER, PAYOUT_STATE, agreementOf, createBatch, failPayout, finalizeCosts, fmt, hist,
  isAccepted, markPaid, PROGRAM_BASIS, PROGRAM_RATE, missingTerms, payoutBlockers, releaseHold, round2, summary, today, usd,
} from '../partners';
import { EndConsequences, RefBadge, commitBadge } from '../screens/Partner';
import type { ModuleId, PartnerAgreement, PartnerRecord, State } from '../types';

const TABS = [
  { id: 'applications', label: 'Applications' },
  { id: 'active', label: 'Active partners' },
  { id: 'agreements', label: 'Agreements' },
  { id: 'deliverables', label: 'Deliverables' },
  { id: 'referrals', label: 'Referrals' },
  { id: 'commissions', label: 'Commissions' },
  { id: 'payouts', label: 'Payouts' },
  { id: 'performance', label: 'Performance' },
] as const;

const plog = (d: State, p: PartnerRecord, action: string, reason?: string, actor = PARTNER_MANAGER) =>
  logActivity(d, { actor, actorRole: 'admin', clientId: p.clientId, type: 'partner', action: `${action} (${p.name})`, reason, result: 'success' });

const find = (d: State, id: string) => d.partners.find((p) => p.id === id)!;

export default function Partners() {
  const tab = routeQuery().get('tab') ?? 'applications';
  const { state } = useStore();
  const pending = state.partners.filter((p) => ['submitted', 'under_review'].includes(p.application.status)).length;
  return (
    <>
      <PageHeader title="Partners" subtitle="Partner applications, agreements, referrals, commission and payouts." />
      <div className="tabs" role="tablist" aria-label="Partner admin sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => navigate(`/admin/partners?tab=${t.id}`)}>
            {t.label}{t.id === 'applications' && pending > 0 ? ` (${pending})` : ''}
          </button>
        ))}
      </div>
      {tab === 'applications' && <Applications />}
      {tab === 'active' && <Active />}
      {tab === 'agreements' && <Agreements />}
      {tab === 'deliverables' && <Deliverables />}
      {tab === 'referrals' && <Referrals />}
      {tab === 'commissions' && <Commissions />}
      {tab === 'payouts' && <Payouts />}
      {tab === 'performance' && <Performance />}
    </>
  );
}

/* ───────────── Applications ───────────── */

function Applications() {
  const { state } = useStore();
  const [status, setStatus] = useState('open');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const rows = state.partners.filter((p) => p.application.status !== 'draft').filter((p) =>
    (status === 'all' || (status === 'open' ? ['submitted', 'under_review', 'more_info'].includes(p.application.status) : p.application.status === status)) &&
    (!q || `${p.application.form.country} ${p.application.form.niche} ${p.application.form.reachEvidence} ${p.name}`.toLowerCase().includes(q.toLowerCase())));
  const sel = state.partners.find((p) => p.id === open);
  return (
    <>
      <div className="admin-filters">
        <label><span className="sr-only">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Application status">
            <option value="open">Open</option><option value="all">All</option>
            {(['submitted', 'under_review', 'more_info', 'approved', 'declined'] as const).map((s) => <option key={s} value={s}>{APP_STATUS[s][0]}</option>)}
          </select>
        </label>
        <input placeholder="Filter by market, niche or evidence" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Filter applications" />
      </div>
      <section className="card table-card">
        <table className="table">
          <thead><tr><th>Applicant</th><th>Status</th><th>Market</th><th>Niche</th><th>Audience evidence</th><th>Submitted</th></tr></thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="clickable" onClick={() => setOpen(p.id)}>
                <td><button className="link-btn" onClick={() => setOpen(p.id)}><strong>{p.name}</strong></button><div className="muted xsmall">{p.application.form.business}</div></td>
                <td><Badge tone={APP_STATUS[p.application.status][1]}>{APP_STATUS[p.application.status][0]}</Badge></td>
                <td>{p.application.form.country}</td>
                <td>{p.application.form.niche}</td>
                <td className="small">{p.application.form.reachEvidence}</td>
                <td>{p.application.submittedAt ? dateTime(p.application.submittedAt) : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="muted">No applications match.</td></tr>}
          </tbody>
        </table>
      </section>
      {sel && <ApplicationDetail p={sel} onClose={() => setOpen(null)} />}
    </>
  );
}

function ApplicationDetail({ p, onClose }: { p: PartnerRecord; onClose: () => void }) {
  const { update, toast } = useStore();
  const [modal, setModal] = useState<'info' | 'decline' | 'approve' | null>(null);
  const a = p.application;
  const decidable = ['submitted', 'under_review'].includes(a.status);
  const setStatus = (status: PartnerRecord['application']['status'], action: string, reason?: string, extra?: (r: PartnerRecord) => void) => {
    update((d) => {
      const r = find(d, p.id);
      r.application.status = status;
      r.application.history.push(hist(PARTNER_MANAGER, action, reason));
      extra?.(r);
      plog(d, r, action, reason);
    });
    toast(action, 'success');
  };
  const f = a.form;
  const rows: [string, string][] = [
    ['Business', `${f.business} · ${f.role}`], ['Profiles', f.profileLinks], ['Country / language', `${f.country} · ${f.language || '—'}`], ['Niche', f.niche],
    ['Reach & engagement', f.reachEvidence], ['Audience fit', f.audienceFit], ['Proposed promotion', f.promotion], ['Contact', f.contactEmail],
  ];
  return (
    <>
      <Modal title={`Application · ${p.name}`} onClose={onClose} wide>
        <div className="card-head"><span className="muted small">{p.handle}</span><Badge tone={APP_STATUS[a.status][1]}>{APP_STATUS[a.status][0]}</Badge></div>
        <dl className="kv">{rows.map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>)}</dl>
        {a.infoRequest && a.status === 'more_info' && <div className="notice notice-amber small">Requested: {a.infoRequest}</div>}
        <p className="muted xsmall">Select on audience fit and engagement, not follower count alone. Applicants can never approve their own application.</p>
        <div className="row gap-sm wrap">
          {a.status === 'submitted' && <button className="btn btn-secondary" onClick={() => setStatus('under_review', 'Started review')}>Start review</button>}
          {decidable && <button className="btn btn-primary" onClick={() => setModal('approve')}>Approve…</button>}
          {decidable && <button className="btn btn-ghost" onClick={() => setModal('info')}>Request information…</button>}
          {decidable && <button className="btn btn-ghost" onClick={() => setModal('decline')}>Decline…</button>}
        </div>
        <h3 className="small">Review history</h3>
        <ul className="plain-list small">{a.history.map((h, i) => <li key={i}>{dateTime(h.time)} · <strong>{h.actor}</strong> · {h.action}{h.reason ? ` — ${h.reason}` : ''}</li>)}</ul>
      </Modal>
      {modal === 'info' && <ReasonModal title="Request more information" description="The applicant sees this message and can update their application." confirmLabel="Send request" onClose={() => setModal(null)} onConfirm={(r) => setStatus('more_info', 'Requested more information', r, (x) => { x.application.infoRequest = r; })} />}
      {modal === 'decline' && <ReasonModal title="Decline application" description="The applicant sees the reason. Their subscription is not affected." confirmLabel="Decline" onClose={() => setModal(null)} onConfirm={(r) => setStatus('declined', 'Declined application', r)} />}
      {modal === 'approve' && <ApproveModal p={p} onClose={() => setModal(null)} onDone={onClose} />}
    </>
  );
}

const DELIVERABLES = [
  { id: 'reel', channel: 'Instagram', format: 'Reel showing how you use MAGNET', days: 30 },
  { id: 'stories', channel: 'Instagram', format: '3 Stories with link sticker', days: 45 },
  { id: 'newsletter', channel: 'Newsletter', format: 'Mention with tracked link', days: 60 },
];

function ApproveModal({ p, onClose, onDone }: { p: PartnerRecord; onClose: () => void; onDone: () => void }) {
  const { update, toast } = useStore();
  const [basis, setBasis] = useState<PartnerAgreement['basis']>(PROGRAM_BASIS);
  const [rate, setRate] = useState(String(PROGRAM_RATE));
  const [duration, setDuration] = useState('');
  const [whilePaying, setWhilePaying] = useState(true);
  const [minimum, setMinimum] = useState('');
  const [hold, setHold] = useState('30');
  const [fee, setFee] = useState('3');
  const [svc, setSvc] = useState('8');
  const [grant, setGrant] = useState<ModuleId[]>(['core', 'grow', 'inbox']);
  const [grantMonths, setGrantMonths] = useState('3');
  const [deliv, setDeliv] = useState<string[]>(['reel', 'stories']);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const num = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Number(v));
  const draft: Omit<PartnerAgreement, 'proposedAt' | 'acceptedAt' | 'version'> = {
    basis, ratePercent: num(rate), durationMonths: whilePaying ? null : num(duration), whilePaying, payoutMinimumUsd: num(minimum), holdDays: num(hold) ?? 30, attributionDays: 30,
    costs: { paymentFeePercent: num(fee) ?? 0, serviceCostUsd: num(svc) ?? 0 }, grantModules: grant, grantUntil: addMonths(today(), num(grantMonths) ?? 3), reviewDate: addDays(today(), 30),
  };
  const missing = missingTerms({ ...draft, version: 1, proposedAt: 0, acceptedAt: null });
  const approve = () => {
    setTouched(true);
    if (reason.trim().length < 5 || deliv.length === 0) return;
    update((d) => {
      const r = find(d, p.id);
      if (r.application.status === 'approved') return;
      r.application.status = 'approved';
      r.application.history.push(hist(PARTNER_MANAGER, 'Approved with agreement v1', reason.trim()));
      const code = (r.name.split(' ')[0] + 'GROWS').toUpperCase().replace(/[^A-Z]/g, '');
      r.program = {
        status: 'active', newReferralsPaused: false, code, link: `magnet.app/r/${code.toLowerCase()}`,
        agreements: [{ ...draft, version: 1, proposedAt: Date.now(), acceptedAt: null }],
        commitments: DELIVERABLES.filter((x) => deliv.includes(x.id)).map((x, i) => ({ id: `cm_${Date.now()}_${i}`, channel: x.channel, format: x.format, deadline: addDays(today(), x.days), status: 'todo', history: [] })),
        referrals: [], ledger: [], payouts: [], payoutDetails: false, grantCostUsd: round2(grant.length * 7), funnel: { visits: 0, signups: 0, activated: 0 }, retention: { d30: null, d60: null, d90: null }, processedInvoices: [],
      };
      plog(d, r, 'Approved partner application with agreement v1', reason.trim());
    });
    toast(missing.length ? `Approved. Earnings stay inactive until you set: ${missing.join(', ')}.` : 'Approved. The partner can now review and accept the agreement.', 'success');
    onClose();
    onDone();
  };
  return (
    <Modal title={`Approve ${p.name}`} onClose={onClose} wide footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={approve}>Approve and propose agreement</button></>}>
      <p className="small muted">Approval proposes agreement v1. Nothing is granted until the partner accepts it. Fill in the commercial terms; leave a field empty if it isn’t decided yet (earnings stay inactive until it is).</p>
      <div className="form-grid">
        <Field label="Commission basis">
          <select value={basis ?? ''} onChange={(e) => setBasis((e.target.value || null) as PartnerAgreement['basis'])}>
            <option value="revenue_share">Revenue share (program standard: {PROGRAM_RATE}%)</option>
            <option value="contribution_profit">Contribution profit (revenue minus agreed costs)</option>
            <option value="">Not decided</option>
          </select>
        </Field>
        <Field label="Rate (%)" hint={`Program standard is ${PROGRAM_RATE}% of what referred customers pay`}><input type="number" min={0} max={100} value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
        <Field label="Reward duration">
          <select value={whilePaying ? 'paying' : 'fixed'} onChange={(e) => setWhilePaying(e.target.value === 'paying')}>
            <option value="paying">As long as the customer pays (program standard)</option>
            <option value="fixed">Fixed number of months</option>
          </select>
        </Field>
        {!whilePaying && <Field label="Reward duration (months)"><input type="number" min={1} value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>}
        <Field label="Payout minimum (USD)"><input type="number" min={0} value={minimum} onChange={(e) => setMinimum(e.target.value)} /></Field>
        <Field label="Hold period (days)"><input type="number" min={0} value={hold} onChange={(e) => setHold(e.target.value)} /></Field>
        {basis === 'contribution_profit' && (
          <>
            <Field label="Payment fee deducted (%)"><input type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} /></Field>
            <Field label="Service cost per invoice (USD)" hint="Backend execution and AI usage"><input type="number" min={0} value={svc} onChange={(e) => setSvc(e.target.value)} /></Field>
          </>
        )}
        <Field label="Complimentary access (months)"><input type="number" min={1} value={grantMonths} onChange={(e) => setGrantMonths(e.target.value)} /></Field>
      </div>
      <fieldset className="check-group">
        <legend className="field-label">Complimentary modules</legend>
        {ALL_MODULES.map((m) => (
          <label key={m} className="check"><input type="checkbox" checked={grant.includes(m)} disabled={m === 'core'} onChange={(e) => setGrant(e.target.checked ? [...grant, m] : grant.filter((x) => x !== m))} /> {moduleName(m)}</label>
        ))}
      </fieldset>
      <fieldset className="check-group">
        <legend className="field-label">Deliverables</legend>
        {DELIVERABLES.map((x) => (
          <label key={x.id} className="check"><input type="checkbox" checked={deliv.includes(x.id)} onChange={(e) => setDeliv(e.target.checked ? [...deliv, x.id] : deliv.filter((y) => y !== x.id))} /> {x.format} · {x.channel} · within {x.days} days</label>
        ))}
        {touched && deliv.length === 0 && <p className="field-error">Choose at least one deliverable.</p>}
      </fieldset>
      <Field label="Reason for approval (logged)" error={touched && reason.trim().length < 5 ? 'Please add a short reason' : undefined}>
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
      </Field>
      {missing.length > 0 && <p className="small"><AlertTriangle size={14} aria-hidden /> Not set yet: {missing.join(', ')}. The partner can’t accept until these are set.</p>}
    </Modal>
  );
}

/* ───────────── Active partners ───────────── */

const programs = (s: State) => s.partners.filter((p) => p.program);

function Active() {
  const { state, update, toast } = useStore();
  const [ending, setEnding] = useState<string | null>(null);
  const [pausing, setPausing] = useState<string | null>(null);
  const endP = state.partners.find((p) => p.id === ending);
  return (
    <section className="card table-card">
      <table className="table">
        <thead><tr><th>Partner</th><th>Status</th><th>Code</th><th>Complimentary</th><th>Paying referrals</th><th>Referred MRR</th><th>Actions</th></tr></thead>
        <tbody>
          {programs(state).map((p) => {
            const pr = p.program!;
            const a = agreementOf(p)!;
            const s = summary(p);
            return (
              <tr key={p.id}>
                <td><a href={`#/admin/clients/${p.clientId}`}><strong>{p.name}</strong></a><div className="muted xsmall">{p.handle}</div></td>
                <td>
                  {pr.status === 'active' ? <Badge tone="green">Active</Badge> : pr.status === 'paused' ? <Badge tone="amber">Paused</Badge> : <Badge tone="neutral">Ended</Badge>}
                  {!isAccepted(p) && pr.status !== 'ended' && <div className="muted xsmall">Agreement not accepted</div>}
                  {pr.newReferralsPaused && pr.status !== 'ended' && <div className="muted xsmall">New referrals paused</div>}
                </td>
                <td>{pr.code}</td>
                <td className="small">{isAccepted(p) && pr.status !== 'ended' ? `${a.grantModules.map(moduleName).join(', ')} · until ${a.grantUntil ? fmt(a.grantUntil) : '—'}` : '—'}</td>
                <td>{s.paying}</td>
                <td>{usd(s.referredMrr)}</td>
                <td>
                  {pr.status !== 'ended' && (
                    <div className="row gap-sm wrap">
                      {pr.newReferralsPaused
                        ? <button className="btn btn-sm btn-secondary" onClick={() => { update((d) => { const r = find(d, p.id); r.program!.newReferralsPaused = false; r.program!.status = 'active'; plog(d, r, 'Resumed new referrals'); }); toast('New referrals resumed'); }}>Resume referrals</button>
                        : <button className="btn btn-sm btn-ghost" onClick={() => setPausing(p.id)}>Pause new referrals</button>}
                      <button className="btn btn-sm btn-ghost" onClick={() => setEnding(p.id)}>End…</button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {pausing && <ReasonModal title="Pause new referrals" description="New signups stop being credited. Existing referrals, renewals and earned commission are not affected." confirmLabel="Pause" onClose={() => setPausing(null)} onConfirm={(r) => { update((d) => { const x = find(d, pausing); x.program!.newReferralsPaused = true; x.program!.status = 'paused'; plog(d, x, 'Paused new referrals', r); }); toast('New referrals paused'); }} />}
      {endP && <EndConsequences rec={endP} who="admin" onClose={() => setEnding(null)} onConfirm={() => { update((d) => { const x = find(d, endP.id); x.program!.status = 'ended'; x.program!.newReferralsPaused = true; x.program!.endedAt = Date.now(); plog(d, x, 'Ended partnership (earned balance kept)'); }); setEnding(null); toast('Partnership ended. Earned balance kept; no billing started.', 'info'); }} />}
    </section>
  );
}

/* ───────────── Agreements ───────────── */

function Agreements() {
  const { state, update, toast } = useStore();
  const [edit, setEdit] = useState<string | null>(null);
  const [rate, setRate] = useState('');
  const [duration, setDuration] = useState('');
  const [minimum, setMinimum] = useState('');
  const save = () => {
    update((d) => {
      const r = find(d, edit!);
      const a = agreementOf(r)!;
      if (a.acceptedAt) return; // accepted terms are never edited in place
      if (rate) a.ratePercent = Number(rate);
      if (duration) a.durationMonths = Number(duration);
      if (minimum) a.payoutMinimumUsd = Number(minimum);
      if (!a.basis) a.basis = 'revenue_share';
      plog(d, r, `Completed terms of agreement v${a.version}`);
    });
    setEdit(null);
    toast('Terms updated. The partner can now accept.', 'success');
  };
  return (
    <>
      <section className="card table-card">
        <table className="table">
          <thead><tr><th>Partner</th><th>Version</th><th>Basis · rate</th><th>Duration</th><th>Payout min · hold</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {programs(state).flatMap((p) => p.program!.agreements.map((a) => {
              const m = missingTerms(a);
              return (
                <tr key={p.id + a.version}>
                  <td>{p.name}</td>
                  <td>v{a.version}</td>
                  <td>{a.basis === 'contribution_profit' ? 'Contribution profit' : a.basis === 'revenue_share' ? 'Revenue share' : 'Not set'} · {a.ratePercent != null ? `${a.ratePercent}%` : 'rate not set'}</td>
                  <td>{a.whilePaying ? 'While customer pays' : a.durationMonths != null ? `${a.durationMonths} months` : 'Not set'}</td>
                  <td>{a.payoutMinimumUsd != null ? usd(a.payoutMinimumUsd) : 'Not set'} · {a.holdDays} days</td>
                  <td>{a.acceptedAt ? <Badge tone="green">Accepted {fmt(new Date(a.acceptedAt).toISOString().slice(0, 10))}</Badge> : m.length ? <Badge tone="amber">Missing: {m.join(', ')}</Badge> : <Badge tone="blue">Waiting for partner</Badge>}</td>
                  <td>{!a.acceptedAt && m.length > 0 && <button className="btn btn-sm btn-secondary" onClick={() => { setEdit(p.id); setRate(''); setDuration(''); setMinimum(''); }}>Complete terms</button>}</td>
                </tr>
              );
            }))}
          </tbody>
        </table>
        <p className="muted xsmall pad">Accepted agreements are never edited. Changes become a new version that the partner accepts, and never rewrite earned commission.</p>
      </section>
      {edit && (
        <Modal title="Complete terms" onClose={() => setEdit(null)} footer={<><button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button><button className="btn btn-primary" onClick={save}>Save terms</button></>}>
          <Field label="Rate (%)"><input type="number" value={rate} onChange={(e) => setRate(e.target.value)} /></Field>
          {!agreementOf(state.partners.find((x) => x.id === edit)!)?.whilePaying && <Field label="Reward duration (months)"><input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></Field>}
          <Field label="Payout minimum (USD)"><input type="number" value={minimum} onChange={(e) => setMinimum(e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}

/* ───────────── Deliverables ───────────── */

function Deliverables() {
  const { state, update, toast } = useStore();
  const [act, setAct] = useState<{ pid: string; cid: string; to: 'needs_changes' | 'rejected' } | null>(null);
  const set = (pid: string, cid: string, to: 'verified' | 'needs_changes' | 'rejected', reason?: string) => {
    update((d) => {
      const r = find(d, pid);
      const c = r.program!.commitments.find((x) => x.id === cid)!;
      c.status = to;
      c.reviewNote = reason;
      c.history.push(hist(PARTNER_MANAGER, to === 'verified' ? 'Verified' : to === 'rejected' ? 'Rejected' : 'Asked for changes', reason));
      plog(d, r, `${to === 'verified' ? 'Verified' : to === 'rejected' ? 'Rejected' : 'Requested changes to'} deliverable “${c.format}”`, reason);
    });
    toast(to === 'verified' ? 'Deliverable verified' : 'Partner notified', 'success');
  };
  const contact = (pid: string, cid: string) => {
    update((d) => {
      const r = find(d, pid);
      const c = r.program!.commitments.find((x) => x.id === cid)!;
      c.history.push(hist(PARTNER_MANAGER, 'Contacted partner about overdue deliverable'));
      d.support.unshift({ id: `sp_${Date.now()}`, clientId: r.clientId, subject: `Partner deliverable overdue: ${c.format}`, detail: `Deadline ${c.deadline}. Review and agree next steps with the partner. No automatic charge.`, status: 'Open', assignee: 'Sophie Laurent', time: Date.now() });
      plog(d, r, `Opened review task for overdue “${c.format}”`);
    });
    toast('Review task created in Support', 'success');
  };
  return (
    <section className="card table-card">
      <table className="table">
        <thead><tr><th>Partner</th><th>Deliverable</th><th>Deadline</th><th>Evidence</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {programs(state).flatMap((p) => p.program!.commitments.map((c) => (
            <tr key={c.id}>
              <td>{p.name}</td>
              <td>{c.format}<div className="muted xsmall">{c.channel}</div></td>
              <td>{fmt(c.deadline)}</td>
              <td className="small">{c.evidenceUrl ?? '—'}</td>
              <td>{commitBadge(c.status)}</td>
              <td>
                <div className="row gap-sm wrap">
                  {c.status === 'submitted' && <>
                    <button className="btn btn-sm btn-secondary" onClick={() => set(p.id, c.id, 'verified')}><CheckCircle2 size={14} /> Verify</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setAct({ pid: p.id, cid: c.id, to: 'needs_changes' })}>Needs changes</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setAct({ pid: p.id, cid: c.id, to: 'rejected' })}>Reject</button>
                  </>}
                  {c.status === 'overdue' && <button className="btn btn-sm btn-secondary" onClick={() => contact(p.id, c.id)}>Open review task</button>}
                </div>
              </td>
            </tr>
          )))}
        </tbody>
      </table>
      <p className="muted xsmall pad">Overdue or removed content opens a review and a conversation. It never bills the partner automatically.</p>
      {act && <ReasonModal title={act.to === 'rejected' ? 'Reject evidence' : 'Ask for changes'} confirmLabel="Send" onClose={() => setAct(null)} onConfirm={(r) => set(act.pid, act.cid, act.to, r)} />}
    </section>
  );
}

/* ───────────── Referrals ───────────── */

function Referrals() {
  const { state, update, toast } = useStore();
  const [act, setAct] = useState<{ pid: string; rid: string; ok: boolean } | null>(null);
  const resolve = (pid: string, rid: string, ok: boolean, reason: string) => {
    update((d) => {
      const r = find(d, pid);
      const ref = r.program!.referrals.find((x) => x.id === rid)!;
      ref.status = ok ? 'trial' : 'cancelled';
      ref.flag = ok ? undefined : `Not credited: ${reason}`;
      plog(d, r, ok ? `Cleared review flag on ${ref.ref}` : `Declined credit for ${ref.ref}`, reason);
    });
    toast(ok ? 'Flag cleared. The referral can now earn once it pays.' : 'Referral will not be credited.', 'success');
  };
  return (
    <section className="card table-card">
      <table className="table">
        <thead><tr><th>Reference</th><th>Partner</th><th>Status</th><th>Via</th><th>Attribution</th><th>Flag</th><th>Actions</th></tr></thead>
        <tbody>
          {programs(state).flatMap((p) => p.program!.referrals.map((r) => (
            <tr key={p.id + r.id}>
              <td><strong>{r.ref}</strong><div className="muted xsmall">{r.segment}</div></td>
              <td>{p.name}</td>
              <td><RefBadge status={r.status} /></td>
              <td>{r.via === 'unknown' ? 'Unknown (tracking unavailable)' : r.via}</td>
              <td>{r.lockedAt ? `Locked ${dateTime(r.lockedAt)}` : 'Open'}</td>
              <td className="small">{r.flag ?? '—'}</td>
              <td>{r.status === 'needs_review' && <div className="row gap-sm wrap">
                <button className="btn btn-sm btn-secondary" onClick={() => setAct({ pid: p.id, rid: r.id, ok: true })}>Clear flag</button>
                <button className="btn btn-sm btn-ghost" onClick={() => setAct({ pid: p.id, rid: r.id, ok: false })}>Don’t credit</button>
              </div>}</td>
            </tr>
          )))}
        </tbody>
      </table>
      <p className="muted xsmall pad">One credited partner per new billing customer. A flag means “check”, not an accusation; partners only see that the referral is in review.</p>
      {act && <ReasonModal title={act.ok ? 'Clear review flag' : 'Don’t credit this referral'} confirmLabel="Confirm" onClose={() => setAct(null)} onConfirm={(r) => resolve(act.pid, act.rid, act.ok, r)} />}
    </section>
  );
}

/* ───────────── Commissions ───────────── */

function Commissions() {
  const { state, update, toast } = useStore();
  const rows = programs(state).flatMap((p) => p.program!.ledger.map((e) => ({ p, e }))).sort((a, b) => b.e.time - a.e.time);
  const act = (pid: string, eid: string, kind: 'finalize' | 'release') => {
    update((d) => {
      const r = find(d, pid);
      const e = r.program!.ledger.find((x) => x.id === eid)!;
      if (kind === 'finalize') finalizeCosts(r, e);
      else releaseHold(e);
      plog(d, r, kind === 'finalize' ? `Finalized costs for ${e.id}` : `Released hold on ${e.id} (demo: hold period skipped)`);
    });
    toast(kind === 'finalize' ? 'Costs final. Entry moved to pending hold.' : 'Entry is now payable.', 'success');
  };
  return (
    <section className="card table-card">
      <table className="table statement">
        <thead><tr><th>Entry</th><th>Partner</th><th>Invoice line</th><th>Revenue</th><th>Costs</th><th>Commission</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {rows.map(({ p, e }) => (
            <tr key={p.id + e.id} className={e.kind === 'reversal' ? 'reversal' : ''}>
              <td>{e.id}<div className="muted xsmall">{e.referralRef} · v{e.agreementVersion}</div></td>
              <td>{p.name}</td>
              <td>{e.invoiceLine}{e.reversesId && <div className="muted xsmall">Reverses {e.reversesId}</div>}</td>
              <td>{usd(e.revenueUsd)}</td>
              <td>{usd(e.costsUsd)}{!e.costsFinal && <div className="muted xsmall">estimate</div>}</td>
              <td><strong>{usd(e.amountUsd)}</strong></td>
              <td><Badge tone={LEDGER_STATE[e.state][1]}>{LEDGER_STATE[e.state][0]}</Badge></td>
              <td>
                {e.state === 'provisional' && <button className="btn btn-sm btn-secondary" onClick={() => act(p.id, e.id, 'finalize')}>Finalize costs</button>}
                {e.state === 'pending_hold' && <button className="btn btn-sm btn-ghost" onClick={() => act(p.id, e.id, 'release')}>Release hold</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted xsmall pad">Append-only ledger linked to unique invoice lines. Refunds and chargebacks add linked reversals; paid entries are never overwritten.</p>
    </section>
  );
}

/* ───────────── Payouts ───────────── */

function Payouts() {
  const { state, update, toast } = useStore();
  const [role, setRole] = useState<'manager' | 'finance'>('manager');
  const [evidence, setEvidence] = useState<{ pid: string; po: string } | null>(null);
  const [failing, setFailing] = useState<{ pid: string; po: string } | null>(null);
  const actor = role === 'finance' ? FINANCE_ACTOR : PARTNER_MANAGER;
  const batch = (pid: string) => {
    let id = '';
    update((d) => {
      const r = find(d, pid);
      const po = createBatch(r, actor);
      if (po) { id = po.id; plog(d, r, `Created payout batch ${po.id} for ${usd(po.amountUsd)}`, undefined, actor); }
    });
    toast(id ? `Batch ${id} created. Waiting for finance approval.` : 'Batch could not be created', id ? 'success' : 'warning');
  };
  const step = (pid: string, poId: string, to: 'approved' | 'sent' | 'uncertain') => {
    update((d) => {
      const r = find(d, pid);
      const po = r.program!.payouts.find((x) => x.id === poId)!;
      if (to === 'approved') { if (po.state !== 'draft') return; po.approvedBy = actor; }
      po.state = to;
      const label = to === 'approved' ? 'Approved batch' : to === 'sent' ? 'Sent transfer' : 'Outcome unknown: needs reconciliation';
      po.history.push(hist(actor, label));
      plog(d, r, `${label} ${po.id}`, undefined, actor);
    });
    toast(to === 'approved' ? 'Batch approved by finance' : to === 'sent' ? 'Transfer sent. Mark it paid once the bank confirms.' : 'Marked as unknown. Reconcile before any retry.', 'info');
  };
  return (
    <>
      <div className="row gap-sm wrap admin-filters">
        <Segmented label="Acting as" value={role} onChange={setRole} options={[{ id: 'manager', label: 'Partner manager' }, { id: 'finance', label: 'Finance' }]} />
        <span className="muted small">Payout approval needs the finance permission.</span>
      </div>
      <section className="card table-card">
        <h2 className="pad">Ready for payout</h2>
        <table className="table">
          <thead><tr><th>Partner</th><th>Payable</th><th>Blockers</th><th></th></tr></thead>
          <tbody>
            {programs(state).map((p) => {
              const b = payoutBlockers(p);
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{usd(summary(p).payable)}</td>
                  <td className="small">{b.length ? b.join(' · ') : <span className="muted">None</span>}</td>
                  <td>{b.length === 0 && <button className="btn btn-sm btn-primary" onClick={() => batch(p.id)}>Create payout batch</button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
      <section className="card table-card">
        <h2 className="pad">Batches</h2>
        <table className="table">
          <thead><tr><th>Batch</th><th>Partner</th><th>Amount</th><th>Entries</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {programs(state).flatMap((p) => p.program!.payouts.map((po) => (
              <tr key={p.id + po.id}>
                <td>{po.id}<div className="muted xsmall">{dateTime(po.createdAt)}</div></td>
                <td>{p.name}</td>
                <td>{usd(po.amountUsd)}</td>
                <td className="small">{po.entryIds.join(', ')}</td>
                <td><Badge tone={PAYOUT_STATE[po.state][1]}>{PAYOUT_STATE[po.state][0]}</Badge>{po.evidence && <div className="muted xsmall">{po.evidence}</div>}</td>
                <td>
                  <div className="row gap-sm wrap">
                    {po.state === 'draft' && <button className="btn btn-sm btn-secondary" disabled={role !== 'finance'} title={role !== 'finance' ? 'Finance permission required' : undefined} onClick={() => step(p.id, po.id, 'approved')}>Approve batch</button>}
                    {po.state === 'approved' && <button className="btn btn-sm btn-secondary" disabled={role !== 'finance'} onClick={() => step(p.id, po.id, 'sent')}>Send transfer</button>}
                    {(po.state === 'sent' || po.state === 'uncertain') && <>
                      <button className="btn btn-sm btn-secondary" disabled={role !== 'finance'} onClick={() => setEvidence({ pid: p.id, po: po.id })}>{po.state === 'uncertain' ? 'Reconcile: received' : 'Confirm paid'}</button>
                      {po.state === 'sent' && <button className="btn btn-sm btn-ghost" disabled={role !== 'finance'} onClick={() => step(p.id, po.id, 'uncertain')}>Outcome unknown</button>}
                      <button className="btn btn-sm btn-ghost" disabled={role !== 'finance'} onClick={() => setFailing({ pid: p.id, po: po.id })}>{po.state === 'uncertain' ? 'Reconcile: not received' : 'Mark failed'}</button>
                    </>}
                  </div>
                </td>
              </tr>
            )))}
          </tbody>
        </table>
        <p className="muted xsmall pad">Paid only with reconciled evidence. An uncertain transfer must be reconciled before anything is retried, so nothing is paid twice.</p>
      </section>
      {evidence && <EvidenceModal onClose={() => setEvidence(null)} onConfirm={(ev) => {
        update((d) => { const r = find(d, evidence.pid); const po = r.program!.payouts.find((x) => x.id === evidence.po)!; markPaid(r, po, actor, ev); plog(d, r, `Marked ${po.id} as paid`, `Evidence: ${ev}`, actor); });
        toast('Payout marked as paid', 'success');
      }} />}
      {failing && <ReasonModal title="Transfer not received" description="The entries become payable again so a new batch can follow. The failed batch stays visible." confirmLabel="Mark failed" onClose={() => setFailing(null)} onConfirm={(reason) => {
        update((d) => { const r = find(d, failing.pid); const po = r.program!.payouts.find((x) => x.id === failing.po)!; failPayout(r, po, actor, reason); plog(d, r, `Payout ${po.id} failed`, reason, actor); });
        toast('Marked as failed. Entries are payable again.', 'info');
      }} />}
    </>
  );
}

function EvidenceModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (v: string) => void }) {
  const [v, setV] = useState('');
  const [t, setT] = useState(false);
  return (
    <Modal title="Record payment evidence" onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => { setT(true); if (v.trim().length >= 4) { onConfirm(v.trim()); onClose(); } }}>Mark as paid</button></>}>
      <Field label="Bank or provider reference" hint="From the bank statement or provider confirmation" error={t && v.trim().length < 4 ? 'A reference is required to mark as paid' : undefined}>
        <input value={v} onChange={(e) => setV(e.target.value)} />
      </Field>
    </Modal>
  );
}

/* ───────────── Performance ───────────── */

function Performance() {
  const { state } = useStore();
  const pct = (v: number | null) => (v == null ? 'Too early' : `${v}%`);
  return (
    <section className="card table-card">
      <table className="table">
        <thead><tr><th>Partner</th><th>Visits</th><th>Signups</th><th>Activated</th><th>Paid</th><th>Referred MRR</th><th>Retention 30/60/90</th><th>Monthly cost</th><th>Contribution / mo</th></tr></thead>
        <tbody>
          {programs(state).map((p) => {
            const pr = p.program!;
            const s = summary(p);
            const unknown = pr.referrals.filter((r) => r.via === 'unknown').length;
            const est = s.estimated ?? 0;
            const grantCost = isAccepted(p) && pr.status !== 'ended' ? pr.grantCostUsd : 0;
            const contribution = round2(s.referredMrr - est - grantCost);
            return (
              <tr key={p.id}>
                <td><strong>{p.name}</strong>{unknown > 0 && <div className="muted xsmall">{unknown} with unknown attribution</div>}</td>
                <td>{pr.funnel.visits}</td>
                <td>{s.signups}</td>
                <td>{pr.funnel.activated}</td>
                <td>{s.paying}</td>
                <td>{usd(s.referredMrr)}</td>
                <td className="small">{pct(pr.retention.d30)} / {pct(pr.retention.d60)} / {pct(pr.retention.d90)}</td>
                <td className="small">{usd(est)} commission (est.)<br />{usd(grantCost)} free access</td>
                <td><strong>{usd(contribution)}</strong><div className="muted xsmall">before service costs</div></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="muted xsmall pad">Each cost counted once. Young cohorts are marked “Too early”. Attribution is commercial credit, not proof of extra marketing impact. Compare customer quality, not followers or clicks.</p>
    </section>
  );
}
