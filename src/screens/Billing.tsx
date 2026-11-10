import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, CalendarClock, Check, Clock, CreditCard, FileText, Lock, RotateCcw, Undo2 } from 'lucide-react';
import { clientLog, logActivity, navigate, uid, useStore } from '../store';
import { money } from '../i18n/locale';
import { Badge, Modal, PageHeader, formatDate } from '../components/ui';
import { ALL_MODULES, REASONS, STARTER, addMonths, applyChange, commitChange, missingDependencies, moduleName, offerFor, payableUsd, publishedOffer, quote, redeemOffer, simulateRenewal, totalUsd, type Quote, LISTED, namesOf } from '../billing';
import type { CancelReason, ModuleId, OffboardingSession, State, SubscriptionStatus } from '../types';

const STATUS: Record<SubscriptionStatus, [string, 'green' | 'amber' | 'red' | 'blue' | 'neutral']> = {
  active: ['Active', 'green'],
  payment_issue: ['Payment issue', 'red'],
  cancellation_scheduled: ['Cancellation scheduled', 'amber'],
  paused: ['Paused', 'blue'],
  ended: ['Ended', 'neutral'],
};

export default function Billing({ sub }: { sub?: string }) {
  if (sub === 'cancel') return <CancelFlow />;
  return <BillingHome />;
}

function BillingHome() {
  const { state, update, toast } = useStore();
  const b = state.billing;
  const [changeOpen, setChangeOpen] = useState<ModuleId[] | null>(null);
  const [invoice, setInvoice] = useState<string | null>(null);
  const [reactivate, setReactivate] = useState(false);
  const [st, tone] = STATUS[b.status];
  // Whole calendar days until the trial ends
  const trialLeft = b.trialEnd ? Math.max(0, Math.round((new Date(`${b.trialEnd}T00:00:00`).getTime() - new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00`).getTime()) / 86_400_000)) : 0;
  const inv = b.invoices.find((i) => i.id === invoice);

  const undoScheduled = () => {
    update((d) => {
      d.billing.scheduled = null;
      clientLog(d, 'setting', 'Reversed scheduled module change');
    });
    toast('Scheduled change removed. Nothing changes at renewal.', 'info');
  };

  const keepSubscription = () => {
    update((d) => {
      d.billing.status = 'active';
      clientLog(d, 'setting', 'Kept subscription (undid scheduled cancellation)');
    });
    toast('Your subscription continues. Next charge as before.', 'success');
  };

  const resumePause = () => {
    update((d) => {
      d.billing.status = 'active';
      d.billing.pauseUntil = null;
      clientLog(d, 'setting', 'Resumed subscription early');
    });
    toast('Resumed. Review your campaign and Lead Flows before turning them back on.', 'success');
  };

  return (
    <>
      <PageHeader title="Billing" subtitle="Your modules, invoices and subscription. Change or cancel any time, right here." />

      {b.trialEnd && b.status !== 'ended' && (
        <div className="banner trial-banner" role="status">
          <Clock size={18} aria-hidden />
          <span>
            <strong>Free trial: {trialLeft} day{trialLeft === 1 ? '' : 's'} left.</strong>{' '}
            {b.status === 'cancellation_scheduled'
              ? `You cancelled, so nothing will be charged. Access ends on ${formatDate(b.trialEnd)}.`
              : `Nothing has been charged. Your first payment of ${money(payableUsd(state))} is on ${formatDate(b.trialEnd)}. Cancel before then and you pay nothing.`}
          </span>
        </div>
      )}

      {b.pending && (
        <div className="banner banner-amber" role="status">
          <Clock size={18} aria-hidden />
          <span><strong>Pending processing:</strong> “{b.pending.label}”, requested {new Date(b.pending.requestedAt).toLocaleString()}. You won’t be renewed while this is pending.</span>
          <button
            className="btn btn-sm btn-secondary"
            onClick={() => {
              let msg = '';
              update((d) => {
                if (d.sim.billingDown) return;
                msg = applyChange(d, d.billing.pending!);
                logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'setting', action: 'Reconciled pending billing change', result: 'success' });
              });
              toast(msg || 'The billing provider is still unavailable. We’ll keep trying.', msg ? 'success' : 'warning');
            }}
          >
            Check status
          </button>
        </div>
      )}

      {b.status === 'payment_issue' && (
        <div className="banner banner-red" role="alert">
          <AlertTriangle size={18} aria-hidden />
          <span><strong>Your last payment failed.</strong> Update your payment method to keep your modules running.</span>
          <button className="btn btn-sm btn-secondary" onClick={() => {
            update((d) => {
              d.billing.status = 'active';
              d.billing.invoices[0].status = 'paid';
              clientLog(d, 'setting', 'Updated payment method; failed invoice paid (demo)');
            });
            toast('Payment method updated and invoice paid (demo).', 'success');
          }}>Update payment method</button>
        </div>
      )}

      <div className="bl-grid">
        <section className="card bl-plan" aria-labelledby="plan">
          <div className="card-head">
            <h2 id="plan">Your subscription</h2>
            {b.trialEnd && b.status === 'active' ? <Badge tone="blue" dot>Free trial</Badge> : <Badge tone={tone} dot>{st}</Badge>}
          </div>

          <ul className="bl-modules">
            {LISTED.filter((m) => b.modules.includes(m.id)).map((m) => (
              <li key={m.id}>
                <span>
                  <strong>{m.name}</strong>
                  <span className="muted small">{m.desc}</span>
                </span>
                <span className="bl-price">{money(m.priceUsd)}</span>
              </li>
            ))}
          </ul>
          <div className="bl-total">
            <span>Monthly total</span>
            <span>
              {b.discount && <s className="muted">{money(totalUsd(b.modules))}</s>} <strong>{money(payableUsd(state))}</strong>
            </span>
          </div>
          {b.discount && <p className="small muted">{b.discount.percent}% off for {b.discount.months} more invoice{b.discount.months === 1 ? '' : 's'}; then {money(totalUsd(b.modules))}/month.</p>}

          <dl className="bl-facts">
            {b.status === 'active' && <><dt>Next charge</dt><dd>{formatDate(b.periodEnd)} · {money(payableUsd(state, b.scheduled?.modules))}</dd></>}
            {b.status === 'cancellation_scheduled' && <><dt>Access until</dt><dd>{formatDate(b.periodEnd)} · no further charges</dd></>}
            {b.status === 'paused' && <><dt>Paused until</dt><dd>{b.pauseUntil && formatDate(b.pauseUntil)} · then {money(payableUsd(state))}/month</dd></>}
            {b.status === 'ended' && <><dt>Ended</dt><dd>Your data is still available to view and export</dd></>}
            <dt>Prices</dt><dd>Example prices in {state.locale.currency}, excluding tax</dd>
          </dl>

          {b.scheduled && (
            <div className="bl-scheduled">
              <CalendarClock size={18} aria-hidden />
              <span>
                From <strong>{formatDate(b.scheduled.effective)}</strong>: {LISTED.filter((m) => !b.scheduled!.modules.includes(m.id) && b.modules.includes(m.id)).map((m) => m.name).join(', ')} removed. New price {money(totalUsd(b.scheduled.modules))}/month.
              </span>
              <button className="btn btn-sm btn-ghost" onClick={undoScheduled}><Undo2 size={14} /> Undo</button>
            </div>
          )}

          <div className="row gap-sm wrap mt">
            {b.status === 'active' && <button className="btn btn-primary" onClick={() => setChangeOpen([...(b.scheduled?.modules ?? b.modules)])}>Change modules</button>}
            {b.status === 'cancellation_scheduled' && <button className="btn btn-primary" onClick={keepSubscription}><RotateCcw size={16} /> Keep my subscription</button>}
            {b.status === 'paused' && <button className="btn btn-primary" onClick={resumePause}>Resume now</button>}
            {b.status === 'ended' && <button className="btn btn-primary" onClick={() => setReactivate(true)}>Reactivate</button>}
            {(b.status === 'active' || b.status === 'payment_issue') && (
              <button className="btn btn-ghost" onClick={() => navigate('/app/billing/cancel')}>Cancel subscription</button>
            )}
          </div>
        </section>

        <div className="stack">
          <section className="card" aria-labelledby="pm">
            <h2 id="pm">Payment method</h2>
            <p className="row gap-sm"><CreditCard size={18} aria-hidden /> Card ending 4242 <span className="muted small">(demo)</span></p>
            <p className="muted small">Payments go through the billing provider. MAGNET never stores card details.</p>
          </section>

          <section className="card" aria-labelledby="inv">
            <h2 id="inv">Invoices</h2>
            {b.invoices.length === 0 && <p className="muted small">No invoices yet.{b.trialEnd ? ` Your first invoice follows when the trial ends on ${formatDate(b.trialEnd)}.` : ''}</p>}
            <ul className="bl-invoices">
              {b.invoices.map((i) => (
                <li key={i.id}>
                  <span><strong>{formatDate(i.date)}</strong><span className="muted xsmall">{i.id}</span></span>
                  <span>{money(i.amountUsd)}</span>
                  <Badge tone={i.status === 'paid' ? 'green' : 'red'}>{i.status === 'paid' ? 'Paid' : 'Failed'}</Badge>
                  <button className="icon-btn" aria-label={`View invoice ${i.id}`} onClick={() => setInvoice(i.id)}><FileText size={16} /></button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <div className="demo-sim-row bl-demo" aria-label="Demo simulation">
        <span className="muted xsmall">Demo:</span>
        <button className="btn btn-xs btn-ghost" onClick={() => { let m = ''; update((d) => { m = simulateRenewal(d); }); toast(m, 'info'); }}>Jump to renewal date</button>
        {b.status === 'active' && (
          <button className="btn btn-xs btn-ghost" onClick={() => {
            update((d) => {
              d.billing.status = 'payment_issue';
              d.billing.invoices.unshift({ id: `INV-${1000 + d.billing.invoices.length + 1}`, date: d.billing.periodEnd, amountUsd: payableUsd(d), status: 'failed', modules: [...d.billing.modules] });
              logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'setting', action: 'Payment failed for renewal invoice', result: 'failed', error: { code: 'CARD_DECLINED', detail: 'The card was declined by the bank (simulated).' } });
            });
            toast('Simulated a failed payment', 'warning');
          }}>Simulate failed payment</button>
        )}
        <label className="row gap-sm xsmall">
          <input type="checkbox" checked={state.sim.billingDown} onChange={(e) => update((d) => void (d.sim.billingDown = e.target.checked))} />
          Billing provider unavailable
        </label>
      </div>

      {changeOpen && <ChangeModules initial={changeOpen} onClose={() => setChangeOpen(null)} />}
      {inv && (
        <Modal title={`Invoice ${inv.id}`} onClose={() => setInvoice(null)}>
          <dl className="summary-list">
            <dt>Date</dt><dd>{formatDate(inv.date)}</dd>
            <dt>Billed to</dt><dd>{state.business.name}</dd>
            <dt>Modules</dt><dd>{namesOf(inv.modules)}</dd>
            <dt>Amount</dt><dd>{money(inv.amountUsd)} (excl. tax)</dd>
            <dt>Status</dt><dd>{inv.status === 'paid' ? 'Paid' : 'Failed'}</dd>
          </dl>
          <p className="muted xsmall">Sample invoice for the demo.</p>
        </Modal>
      )}
      {reactivate && <ReactivateModal onClose={() => setReactivate(false)} />}
    </>
  );
}

/** Module selector with a full price preview before anything changes (BIL-03, RET-03). */
function ChangeModules({ initial, onClose, onDone }: { initial: ModuleId[]; onClose: () => void; onDone?: (pending: boolean) => void }) {
  const { state, update, toast } = useStore();
  const [sel, setSel] = useState<ModuleId[]>(initial);
  const [busy, setBusy] = useState(false);
  const deps = missingDependencies(sel);
  const q = quote(state, sel);
  const unchanged = q.kind === 'none';

  const toggle = (id: ModuleId) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const confirm = () => {
    if (busy) return; // double-click protection: one change only
    setBusy(true);
    let res = { pending: false, message: '' };
    update((d) => { res = commitChange(d, { apply: 'modules', label: 'Change modules', modules: sel }); });
    toast(res.message, res.pending ? 'warning' : 'success');
    onDone?.(res.pending);
    onClose();
  };

  return (
    <Modal
      title="Change modules"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={unchanged || deps.length > 0 || busy} onClick={confirm}>
            {q.kind === 'upgrade' ? `Add and pay ${money(q.chargeNowUsd)} now` : 'Confirm change'}
          </button>
        </>
      }
    >
      <ul className="bl-picker">
        {LISTED.map((m) => (
          <li key={m.id}>
            <label className={m.locked ? 'locked' : ''}>
              <input type="checkbox" checked={sel.includes(m.id)} disabled={m.locked} onChange={() => toggle(m.id)} />
              <span>
                <strong>{m.name}</strong>
                <span className="muted small">{m.desc}{m.requires ? ` · needs ${namesOf(m.requires)}` : ''}{m.locked ? ' · always included' : ''}</span>
              </span>
              <span className="bl-price">{money(m.priceUsd)}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="row gap-sm">
        <button className="btn btn-xs btn-ghost" onClick={() => setSel([...STARTER])}>Growth only</button>
        <button className="btn btn-xs btn-ghost" onClick={() => setSel([...ALL_MODULES])}>All modules</button>
      </div>
      {deps.map((x) => (
        <p key={x.module} className="field-error">{moduleName(x.module)} needs {moduleName(x.needs)}. Add {moduleName(x.needs)} or remove {moduleName(x.module)}.</p>
      ))}
      {!unchanged && deps.length === 0 && <QuotePreview q={q} />}
    </Modal>
  );
}

function QuotePreview({ q }: { q: Quote }) {
  return (
    <div className="bl-quote" aria-live="polite">
      <div className="bl-quote-row">
        <span>Now<strong>{money(q.currentUsd)}/mo</strong></span>
        <ArrowRight size={18} aria-hidden />
        <span>New<strong>{money(q.nextUsd)}/mo</strong></span>
      </div>
      <ul>
        {q.savingUsd > 0 && <li>You save {money(q.savingUsd)} per month.</li>}
        {q.savingUsd < 0 && <li>Your monthly price goes up by {money(-q.savingUsd)}.</li>}
        {q.added.length > 0 && <li>{namesOf(q.added)} available right away. Charged today for the rest of this period: {money(q.chargeNowUsd)}.</li>}
        {q.removed.length > 0 && <li>{namesOf(q.removed)} stay{q.removed.length === 1 ? 's' : ''} active until {formatDate(q.effective)}, then removed. You can undo this before then.</li>}
        {q.consequences.map((c) => <li key={c} className="bl-conseq">{c}</li>)}
      </ul>
    </div>
  );
}

function ReactivateModal({ onClose }: { onClose: () => void }) {
  const { update, toast } = useStore();
  const [sel, setSel] = useState<ModuleId[]>(['core', 'grow']);
  const deps = missingDependencies(sel);
  return (
    <Modal
      title="Reactivate MAGNET"
      wide
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={deps.length > 0} onClick={() => {
            update((d) => {
              d.billing.status = 'active';
              d.billing.modules = sel;
              d.billing.discount = null; // old discounts are not reapplied
              d.billing.periodEnd = addMonths(new Date().toISOString().slice(0, 10), 1);
              d.billing.invoices.unshift({ id: `INV-${1000 + d.billing.invoices.length + 1}`, date: new Date().toISOString().slice(0, 10), amountUsd: totalUsd(sel), status: 'paid', modules: sel });
              clientLog(d, 'setting', `Reactivated subscription (${namesOf(sel)})`);
            });
            toast('Welcome back. Your campaign and Lead Flows stay paused until you review and turn them on.', 'success');
            onClose();
          }}>Reactivate for {money(totalUsd(sel))}/mo</button>
        </>
      }
    >
      <p className="small">Current prices apply. Earlier discounts are not reapplied. Your audience, conversations, leads and flows were kept.</p>
      <ul className="bl-picker">
        {LISTED.map((m) => (
          <li key={m.id}>
            <label className={m.locked ? 'locked' : ''}>
              <input type="checkbox" checked={sel.includes(m.id)} disabled={m.locked} onChange={() => setSel((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))} />
              <span><strong>{m.name}</strong><span className="muted small">{m.desc}</span></span>
              <span className="bl-price">{money(m.priceUsd)}</span>
            </label>
          </li>
        ))}
      </ul>
      {deps.map((x) => <p key={x.module} className="field-error">{moduleName(x.module)} needs {moduleName(x.needs)}.</p>)}
      <p className="muted small"><Lock size={12} /> Nothing restarts on its own. You review your campaign, flows and scheduled posts first.</p>
    </Modal>
  );
}

/* ---------- Native offboarding ---------- */

type Step = 'reason' | 'offer' | 'confirm' | 'done';

function CancelFlow() {
  const { state, update, toast } = useStore();
  const [step, setStep] = useState<Step>('reason');
  const [reason, setReason] = useState<CancelReason | null>(null);
  const [session] = useState(() => uid('off'));
  const [modulesOpen, setModulesOpen] = useState(false);
  const [preview, setPreview] = useState<null | 'downgrade' | 'discount' | 'pause'>(null);
  const [pauseMonths, setPauseMonths] = useState(1);
  const [result, setResult] = useState('');
  const outcomeRef = useRef<OffboardingSession['outcome']>('abandoned');
  const b = state.billing;
  const offer = offerFor(state, step === 'reason' ? null : reason ?? 'skipped');
  const discOffer = publishedOffer(state, 'discount');
  const disc = { percent: discOffer?.percent ?? 20, months: discOffer?.months ?? 3 };
  const maxPause = publishedOffer(state, 'pause')?.months ?? 3;

  // Record the session; leaving the flow without a decision is "abandoned", not "saved"
  useEffect(() => {
    update((d) => {
      if (d.billing.sessions.some((x) => x.id === session)) return; // one record per visit
      d.billing.sessions.push({ id: session, startedAt: Date.now(), reason: null, offerShown: null, outcome: 'abandoned' });
      clientLog(d, 'setting', 'Started cancellation');
    });
  }, [session, update]);

  const record = (patch: Partial<OffboardingSession>) =>
    update((d) => {
      const s = d.billing.sessions.find((x) => x.id === session);
      if (s) Object.assign(s, patch);
    });

  const goOffer = (r: CancelReason | null) => {
    setReason(r);
    const o = offerFor(state, r ?? 'skipped');
    record({ reason: r ?? 'skipped', offerShown: o.id === 'none' ? null : o.id });
    setStep(o.id === 'none' ? 'confirm' : 'offer');
  };

  const finish = (outcome: OffboardingSession['outcome'], message: string) => {
    outcomeRef.current = outcome;
    record({ outcome });
    setResult(message);
    setStep('done');
  };

  const acceptOffer = () => {
    if (offer.id === 'downgrade' || offer.id === 'discount' || offer.id === 'pause') return setPreview(offer.id);
    if (offer.id === 'modules') return setModulesOpen(true);
    // support / ticket: create a ticket, cancellation stays available
    update((d) => {
      redeemOffer(d, offer.id as 'support' | 'ticket');
      d.support.unshift({ id: uid('sp'), clientId: 'c1', subject: offer.id === 'ticket' ? 'Technical problem reported during cancellation' : reason === 'results' ? 'Setup review requested (cancellation)' : 'Setup help requested (cancellation)', detail: `Raised from the cancellation flow. Reason: ${REASONS.find((r) => r.id === reason)?.label ?? 'not given'}.`, status: 'Open', assignee: null, time: Date.now() });
      clientLog(d, 'support', 'Requested help from the cancellation flow');
    });
    finish('support', 'Request sent. The team will contact you. Your subscription is unchanged and you can still cancel any time.');
  };

  const confirmPreview = () => {
    let res = { pending: false, message: '' };
    if (preview === 'downgrade') update((d) => { redeemOffer(d, 'downgrade'); res = commitChange(d, { apply: 'modules', label: 'Switch to Growth only', modules: [...STARTER] }); });
    if (preview === 'discount') update((d) => { res = commitChange(d, { apply: 'discount', label: `${disc.percent}% off for ${disc.months} months`, percent: disc.percent, months: disc.months }); });
    if (preview === 'pause') update((d) => { redeemOffer(d, 'pause'); res = commitChange(d, { apply: 'pause', label: `Pause for ${pauseMonths} month${pauseMonths > 1 ? 's' : ''}`, months: pauseMonths }); });
    const outcome = preview === 'downgrade' ? 'downgraded' : preview === 'discount' ? 'discount' : 'paused';
    setPreview(null);
    finish(outcome, res.message);
  };

  const cancelNow = () => {
    let res = { pending: false, message: '' };
    update((d) => { res = commitChange(d, { apply: 'cancel', label: 'Cancel subscription' }); });
    toast(res.message, res.pending ? 'warning' : 'success');
    finish('cancelled', res.message);
  };

  return (
    <>
      <a className="back-link" href="#/app/billing"><ArrowLeft size={16} /> Billing</a>
      <PageHeader title="Cancel subscription" subtitle="It only takes a moment. You can stop at any step." />

      <div className="cx-wrap">
        {step === 'reason' && (
          <section className="card cx-card">
            <h2>Why are you leaving? <span className="muted cx-opt">Optional</span></h2>
            <p className="muted small">Your answer helps us improve. You can skip it.</p>
            <div className="cx-reasons" role="radiogroup" aria-label="Reason">
              {REASONS.map((r) => (
                <button key={r.id} role="radio" aria-checked={reason === r.id} className={`cx-reason ${reason === r.id ? 'on' : ''}`} onClick={() => setReason(r.id)}>{r.label}</button>
              ))}
            </div>
            <div className="cx-actions">
              <button className="btn btn-primary" disabled={!reason} onClick={() => goOffer(reason)}>Continue</button>
              <button className="btn btn-ghost" onClick={() => goOffer(null)}>Skip this question</button>
            </div>
          </section>
        )}

        {step === 'offer' && offer.id !== 'none' && (
          <section className="card cx-card">
            <span className="eyebrow">Before you go</span>
            <h2>{offer.title}</h2>
            <p>{offer.body}</p>
            {offer.id === 'modules' && <UsageList state={state} />}
            {offer.id === 'support' && reason === 'results' && <ActivitySummary state={state} />}
            <div className="cx-actions">
              <button className="btn btn-primary" onClick={acceptOffer}>{offer.cta}</button>
              <button className="btn btn-secondary" onClick={() => setStep('confirm')}>Continue cancellation</button>
            </div>
          </section>
        )}

        {step === 'confirm' && (
          <section className="card cx-card">
            <h2>Confirm cancellation</h2>
            <dl className="summary-list">
              <dt>Access until</dt><dd>{formatDate(b.periodEnd)} (already paid)</dd>
              <dt>Charges</dt><dd>No more charges after today</dd>
              <dt>Automations</dt><dd>Growth, Lead Flows, scheduled posts and the comment queue stop on {formatDate(b.periodEnd)}</dd>
              <dt>Your data</dt><dd>Stays available to view and export after that. Deleting it is a separate request.</dd>
            </dl>
            <div className="cx-actions">
              <button className="btn btn-danger" onClick={cancelNow}>Cancel subscription</button>
              <button className="btn btn-ghost" onClick={() => navigate('/app/billing')}>Keep my subscription</button>
            </div>
          </section>
        )}

        {step === 'done' && (
          <section className="card cx-card">
            <span className="cx-done"><Check size={22} aria-hidden /></span>
            <h2>{outcomeRef.current === 'cancelled' ? (state.billing.pending ? 'Request received' : 'Your subscription is cancelled') : 'All set'}</h2>
            <p>{result}</p>
            <div className="cx-actions">
              <button className="btn btn-primary" onClick={() => navigate('/app/billing')}>Back to billing</button>
            </div>
          </section>
        )}
      </div>

      {preview && (
        <Modal
          title={preview === 'downgrade' ? 'Switch to a smaller set' : preview === 'discount' ? `${disc.percent}% off for ${disc.months} months` : 'Pause your subscription'}
          wide
          onClose={() => setPreview(null)}
          footer={<><button className="btn btn-ghost" onClick={() => setPreview(null)}>Back</button><button className="btn btn-primary" onClick={confirmPreview}>Confirm</button></>}
        >
          {preview === 'downgrade' && <QuotePreview q={quote(state, [...STARTER])} />}
          {preview === 'discount' && (
            <dl className="summary-list">
              <dt>Now</dt><dd>{money(totalUsd(b.modules))}/month</dd>
              <dt>Next {disc.months} invoices</dt><dd>{money(Math.round(totalUsd(b.modules) * (1 - disc.percent / 100)))}/month ({disc.percent}% off)</dd>
              <dt>After that</dt><dd>{money(totalUsd(b.modules))}/month from {formatDate(addMonths(b.periodEnd, disc.months))}</dd>
              <dt>Commitment</dt><dd>None. You can still cancel any time.</dd>
            </dl>
          )}
          {preview === 'pause' && (
            <>
              <div className="tab-pills" role="radiogroup" aria-label="Pause length">
                {Array.from({ length: maxPause }, (_, i) => i + 1).map((m) => (
                  <button key={m} role="radio" aria-checked={pauseMonths === m} className={pauseMonths === m ? 'on' : ''} onClick={() => setPauseMonths(m)}>{m} month{m > 1 ? 's' : ''}</button>
                ))}
              </div>
              <dl className="summary-list mt">
                <dt>Charges while paused</dt><dd>None</dd>
                <dt>What stops</dt><dd>Growth campaign, Lead Flows, scheduled posts and the comment queue. Nothing is replayed afterwards.</dd>
                <dt>Resumes on</dt><dd>{formatDate(addMonths(new Date().toISOString().slice(0, 10), pauseMonths))} at {money(payableUsd(state))}/month</dd>
                <dt>Your data</dt><dd>Kept</dd>
              </dl>
            </>
          )}
        </Modal>
      )}
      {modulesOpen && (
        <ChangeModules
          initial={[...b.modules]}
          onClose={() => setModulesOpen(false)}
          onDone={(pending) => { update((d) => void redeemOffer(d, 'modules')); finish('downgraded', pending ? 'Your module change is saved and pending processing.' : `Your module change is scheduled for ${formatDate(b.periodEnd)}.`); }}
        />
      )}
    </>
  );
}

/** Real usage per module in the last 30 days, so "not using everything" is backed by data. */
function UsageList({ state }: { state: State }) {
  const rows: [ModuleId, string][] = [
    ['grow', state.campaign === 'active' ? `${state.interactions.today} interactions today` : 'Campaign paused'],
    ['inbox', `${state.conversations.length} conversations`],
    ['flows', `${state.flows.filter((f) => f.status === 'active').length} active flow(s), ${state.flows.reduce((n, f) => n + f.stats.sent, 0)} sent`],
    ['comments', `${state.commentDrafts.filter((d) => d.state === 'posted_manual').length} posted, ${state.commentDrafts.filter((d) => d.state === 'review').length} waiting`],
    ['planner', `${state.posts.filter((p) => p.status === 'scheduled').length} scheduled post(s)`],
  ];
  return (
    <ul className="bl-usage">
      {rows.filter(([m]) => state.billing.modules.includes(m)).map(([m, use]) => (
        <li key={m}><strong>{moduleName(m)}</strong><span className="muted small">{use}</span></li>
      ))}
    </ul>
  );
}

function ActivitySummary({ state }: { state: State }) {
  return (
    <ul className="bl-usage">
      <li><strong>Interactions</strong><span className="muted small">{state.interactions.last28.toLocaleString()} in 28 days (sample)</span></li>
      <li><strong>New conversations</strong><span className="muted small">{state.conversations.length} in your inbox</span></li>
      <li><strong>Qualified leads</strong><span className="muted small">{state.leads.filter((l) => l.status === 'qualified').length} right now</span></li>
    </ul>
  );
}
