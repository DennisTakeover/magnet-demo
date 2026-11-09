import { useState } from 'react';
import { AlertTriangle, Lock, ShieldCheck } from 'lucide-react';
import { logActivity, navigate, routeQuery, uid, useStore } from '../store';
import { Badge, Field, Modal, PageHeader, Segmented, dateTime } from '../components/ui';
import { ReasonModal } from './shared';
import { MIN_MARGIN, MODULES, MODULE_COST_USD, REASONS, STARTER, addDays, fmtDate, moduleName } from '../billing';
import type { ModuleId, OfferKind, RetentionOffer } from '../types';

export const COMMERCIAL_ACTOR = 'Ines Moreau (commercial admin)';

const TABS = [
  { id: 'pricing', label: 'Modules & pricing' },
  { id: 'offers', label: 'Retention offers' },
  { id: 'log', label: 'Change log' },
] as const;

export const OFFER_LABEL: Record<OfferKind, string> = {
  downgrade: 'Downgrade to Starter',
  discount: 'Temporary discount',
  modules: 'Remove unused modules',
  support: 'Free setup help / review',
  pause: 'Pause subscription',
  ticket: 'Report a problem',
};

const usd = (v: number) => `$${v.toFixed(v % 1 ? 2 : 0)}`;
const costOf = (mods: ModuleId[]) => mods.reduce((t, m) => t + MODULE_COST_USD[m], 0);
const priceOf = (mods: ModuleId[]) => MODULES.filter((m) => mods.includes(m.id)).reduce((t, m) => t + m.priceUsd, 0);
/** Margin as a share of what the customer actually pays. */
export const marginAt = (priceUsd: number, costUsd: number) => (priceUsd <= 0 ? -1 : (priceUsd - costUsd) / priceUsd);
const pct = (v: number) => `${Math.round(v * 100)}%`;
const ALL: ModuleId[] = MODULES.map((m) => m.id);

/** Largest discount that keeps both packages above the margin guardrail. */
export function maxDiscount(): number {
  const limits = [STARTER, ALL].map((mods) => {
    const p = priceOf(mods);
    const c = costOf(mods);
    // (p(1-d) - c) / (p(1-d)) >= M  →  d <= 1 - c / (p(1-M))
    return 1 - c / (p * (1 - MIN_MARGIN));
  });
  return Math.floor(Math.min(...limits) * 100);
}

export default function PlansOffers() {
  const tab = routeQuery().get('tab') ?? 'pricing';
  const [role, setRole] = useState<'commercial' | 'support'>('commercial');
  const canEdit = role === 'commercial';
  return (
    <>
      <PageHeader title="Plans & Offers" subtitle="Module prices and the retention offers customers can see when they cancel. Every change is versioned and logged." />
      <div className="row gap-sm wrap admin-filters">
        <Segmented label="Acting as" value={role} onChange={setRole} options={[{ id: 'commercial', label: 'Commercial admin' }, { id: 'support', label: 'Support operator' }]} />
        {!canEdit && <span className="small muted"><Lock size={14} aria-hidden /> Read only. Changing prices or offers needs the commercial admin role.</span>}
      </div>
      <div className="tabs" role="tablist" aria-label="Plans and offers sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => navigate(`/admin/plans?tab=${t.id}`)}>{t.label}</button>
        ))}
      </div>
      {tab === 'pricing' && <Pricing canEdit={canEdit} />}
      {tab === 'offers' && <Offers canEdit={canEdit} />}
      {tab === 'log' && <ChangeLog />}
    </>
  );
}

/* ───────────── Pricing ───────────── */

function Pricing({ canEdit }: { canEdit: boolean }) {
  const { state, update, toast } = useStore();
  const [edit, setEdit] = useState<ModuleId | null>(null);
  const packages = [
    { name: 'Starter', mods: STARTER },
    { name: 'Growth (all modules)', mods: ALL },
  ];
  const publish = (id: string) => {
    update((d) => {
      const v = d.priceVersions.find((x) => x.id === id)!;
      v.status = 'published';
      logActivity(d, { actor: COMMERCIAL_ACTOR, actorRole: 'admin', clientId: 'c1', type: 'billing', action: `Published price for ${moduleName(v.module)}: ${usd(v.fromUsd)} → ${usd(v.toUsd)} for new subscriptions from ${v.effective}`, reason: v.reason, result: 'success' });
    });
    toast('Published. Applies to new subscriptions from the effective date.', 'success');
  };
  const discard = (id: string) => update((d) => { d.priceVersions = d.priceVersions.filter((x) => x.id !== id); });
  return (
    <>
      <section className="card table-card">
        <h2 className="pad">Modules</h2>
        <table className="table">
          <thead><tr><th>Module</th><th>Price / month</th><th>Cost to serve</th><th>Margin</th><th>Next version</th><th></th></tr></thead>
          <tbody>
            {MODULES.map((m) => {
              const pv = [...state.priceVersions].reverse().find((v) => v.module === m.id);
              const margin = marginAt(m.priceUsd, MODULE_COST_USD[m.id]);
              return (
                <tr key={m.id}>
                  <td><strong>{m.name}</strong><div className="muted xsmall">{m.desc}{m.requires ? ` · needs ${m.requires.map(moduleName).join(', ')}` : ''}{m.locked ? ' · always included' : ''}</div></td>
                  <td>{usd(m.priceUsd)}</td>
                  <td>{usd(MODULE_COST_USD[m.id])} <span className="muted xsmall">est.</span></td>
                  <td><Badge tone={margin >= MIN_MARGIN ? 'green' : 'red'}>{pct(margin)}</Badge></td>
                  <td className="small">
                    {pv ? <>{usd(pv.toUsd)} from {fmtDate(pv.effective)} <Badge tone={pv.status === 'published' ? 'blue' : 'neutral'}>{pv.status === 'published' ? 'Scheduled' : 'Draft'}</Badge></> : <span className="muted">—</span>}
                    {pv?.status === 'draft' && canEdit && (
                      <div className="row gap-sm mt-xs">
                        <button className="btn btn-sm btn-primary" onClick={() => publish(pv.id)}>Publish</button>
                        <button className="btn btn-sm btn-ghost" onClick={() => discard(pv.id)}>Discard</button>
                      </div>
                    )}
                  </td>
                  <td><button className="btn btn-sm btn-secondary" disabled={!canEdit} onClick={() => setEdit(m.id)}>Propose new price</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="muted xsmall pad">A new price applies to new subscriptions from its effective date. Existing customers keep their current price until they get a separate notice. Guardrail: margin at least {pct(MIN_MARGIN)} of the price paid.</p>
      </section>
      <div className="grid-2">
        {packages.map((p) => (
          <section key={p.name} className="card">
            <h2>{p.name}</h2>
            <p className="metric-value sm">{usd(priceOf(p.mods))}<span className="muted small"> / month</span></p>
            <p className="small muted">{p.mods.map(moduleName).join(' · ')}</p>
            <p className="small">Cost to serve {usd(costOf(p.mods))} · margin {pct(marginAt(priceOf(p.mods), costOf(p.mods)))}</p>
            <p className="muted xsmall">A package is the sum of its modules. No bundle discount, so a downgrade always saves real money.</p>
          </section>
        ))}
      </div>
      {edit && <PriceModal module={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function PriceModal({ module, onClose }: { module: ModuleId; onClose: () => void }) {
  const { update, toast } = useStore();
  const m = MODULES.find((x) => x.id === module)!;
  const [price, setPrice] = useState(String(m.priceUsd));
  const [effective, setEffective] = useState(addDays(new Date().toISOString().slice(0, 10), 30));
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const p = Number(price);
  const margin = marginAt(p, MODULE_COST_USD[module]);
  const minPrice = Math.ceil(MODULE_COST_USD[module] / (1 - MIN_MARGIN));
  const errors: string[] = [];
  if (!p || p <= 0) errors.push('Enter a price above zero.');
  else if (margin < MIN_MARGIN) errors.push(`Below the margin guardrail. The lowest allowed price is ${usd(minPrice)}.`);
  if (p === m.priceUsd) errors.push('That’s the current price.');
  if (effective < new Date().toISOString().slice(0, 10)) errors.push('The effective date can’t be in the past.');
  if (reason.trim().length < 5) errors.push('Add a short reason.');
  const save = () => {
    setTouched(true);
    if (errors.length) return;
    update((d) => {
      d.priceVersions = d.priceVersions.filter((v) => !(v.module === module && v.status === 'draft'));
      d.priceVersions.push({ id: uid('pv'), module, fromUsd: m.priceUsd, toUsd: p, effective, status: 'draft', actor: COMMERCIAL_ACTOR, reason: reason.trim(), time: Date.now() });
      logActivity(d, { actor: COMMERCIAL_ACTOR, actorRole: 'admin', clientId: 'c1', type: 'billing', action: `Drafted new price for ${m.name}: ${usd(m.priceUsd)} → ${usd(p)}`, reason: reason.trim(), result: 'success' });
    });
    toast('Draft saved. Publish it when it’s approved.', 'success');
    onClose();
  };
  return (
    <Modal title={`New price · ${m.name}`} onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Save draft</button></>}>
      <div className="form-grid">
        <Field label="New price (USD / month)"><input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value)} /></Field>
        <Field label="Effective for new subscriptions from"><input type="date" value={effective} onChange={(e) => setEffective(e.target.value)} /></Field>
      </div>
      <p className="small">Cost to serve {usd(MODULE_COST_USD[module])} · margin at this price <strong>{p > 0 ? pct(margin) : '—'}</strong> (minimum {pct(MIN_MARGIN)})</p>
      <Field label="Reason (logged)"><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      {touched && errors.length > 0 && <ul className="plain-list small field-error" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
      <p className="muted xsmall">Existing customers are not affected by this change.</p>
    </Modal>
  );
}

/* ───────────── Retention offers ───────────── */

function Offers({ canEdit }: { canEdit: boolean }) {
  const { state, update, toast } = useStore();
  const [edit, setEdit] = useState<OfferKind | null>(null);
  const [retire, setRetire] = useState<OfferKind | null>(null);
  const activeDiscounts = state.billing.discount ? 1 : 0;
  const setStatus = (kind: OfferKind, status: RetentionOffer['status'], reason: string) => {
    update((d) => {
      const o = d.offers.find((x) => x.kind === kind)!;
      o.status = status;
      o.history.push({ time: Date.now(), actor: COMMERCIAL_ACTOR, action: status === 'retired' ? `Retired v${o.version}` : `Republished v${o.version}`, reason });
      logActivity(d, { actor: COMMERCIAL_ACTOR, actorRole: 'admin', clientId: 'c1', type: 'billing', action: `${status === 'retired' ? 'Retired' : 'Republished'} retention offer “${OFFER_LABEL[kind]}” v${o.version}`, reason, result: 'success' });
    });
    toast(status === 'retired' ? 'Offer retired. Customers who cancel no longer see it.' : 'Offer is live again.', 'success');
  };
  return (
    <>
      <div className="notice notice-neutral small"><ShieldCheck size={16} aria-hidden /> The cancellation flow shows at most one offer per reason, and only offers that are published, valid and under their redemption limit. Customers who accepted an offer keep those terms, even if you change or retire it.</div>
      <div className="offer-grid">
        {state.offers.map((o) => {
          const limitReached = o.limit != null && o.redeemed >= o.limit;
          const expired = !!o.validUntil && o.validUntil < new Date().toISOString().slice(0, 10);
          const live = o.status === 'published' && !limitReached && !expired;
          return (
            <article key={o.kind} className="card offer-card">
              <div className="card-head">
                <h2>{OFFER_LABEL[o.kind]}</h2>
                {live ? <Badge tone="green" dot>Live</Badge> : o.status === 'retired' ? <Badge tone="neutral" dot>Retired</Badge> : limitReached ? <Badge tone="amber" dot>Limit reached</Badge> : expired ? <Badge tone="amber" dot>Expired</Badge> : <Badge tone="neutral" dot>Draft</Badge>}
              </div>
              <dl className="kv compact">
                <dt>Version</dt><dd>v{o.version}</dd>
                <dt>Shown for</dt><dd>{o.reasons.map((r) => REASONS.find((x) => x.id === r)?.label).join(', ')}</dd>
                {o.kind === 'discount' && <><dt>Terms</dt><dd>{o.percent}% off for {o.months} months, once per customer</dd></>}
                {o.kind === 'pause' && <><dt>Terms</dt><dd>Pause up to {o.months} months, no charges</dd></>}
                <dt>Redemptions</dt><dd>{o.redeemed}{o.limit != null ? ` of ${o.limit}` : ''}</dd>
                <dt>Valid until</dt><dd>{o.validUntil ? fmtDate(o.validUntil) : 'No end date'}</dd>
              </dl>
              {o.kind === 'discount' && <p className="muted xsmall">{activeDiscounts} customer in this demo currently has an accepted discount on its original terms.</p>}
              <div className="row gap-sm wrap">
                {(o.kind === 'discount' || o.kind === 'pause') && <button className="btn btn-sm btn-secondary" disabled={!canEdit} onClick={() => setEdit(o.kind)}>Edit terms…</button>}
                {o.status === 'published'
                  ? <button className="btn btn-sm btn-ghost" disabled={!canEdit} onClick={() => setRetire(o.kind)}>Retire…</button>
                  : <button className="btn btn-sm btn-ghost" disabled={!canEdit} onClick={() => setStatus(o.kind, 'published', 'Republished from Plans & Offers')}>Republish</button>}
              </div>
            </article>
          );
        })}
      </div>
      {edit && <OfferModal kind={edit} onClose={() => setEdit(null)} />}
      {retire && <ReasonModal title={`Retire “${OFFER_LABEL[retire]}”`} description="Customers who cancel will no longer see this offer. People who already accepted it keep their terms." confirmLabel="Retire offer" onClose={() => setRetire(null)} onConfirm={(r) => setStatus(retire, 'retired', r)} />}
    </>
  );
}

function OfferModal({ kind, onClose }: { kind: OfferKind; onClose: () => void }) {
  const { state, update, toast } = useStore();
  const o = state.offers.find((x) => x.kind === kind)!;
  const [percent, setPercent] = useState(String(o.percent ?? ''));
  const [months, setMonths] = useState(String(o.months ?? ''));
  const [limit, setLimit] = useState(o.limit == null ? '' : String(o.limit));
  const [until, setUntil] = useState(o.validUntil ?? '');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const max = maxDiscount();
  const p = Number(percent);
  const mo = Number(months);
  const errors: string[] = [];
  if (kind === 'discount' && (!p || p <= 0)) errors.push('Enter a discount percentage.');
  if (kind === 'discount' && p > max) errors.push(`Above the margin guardrail. The maximum is ${max}%.`);
  if (!mo || mo < 1 || mo > (kind === 'pause' ? 6 : 12)) errors.push(kind === 'pause' ? 'Pause length must be 1–6 months.' : 'Duration must be 1–12 months.');
  if (limit && Number(limit) < o.redeemed) errors.push(`Limit can’t be below the ${o.redeemed} redemptions so far.`);
  if (reason.trim().length < 5) errors.push('Add a short reason.');
  const starter = priceOf(STARTER);
  const save = () => {
    setTouched(true);
    if (errors.length) return;
    update((d) => {
      const x = d.offers.find((y) => y.kind === kind)!;
      x.version += 1;
      if (kind === 'discount') x.percent = p;
      x.months = mo;
      x.limit = limit ? Number(limit) : null;
      x.validUntil = until || null;
      x.status = 'published';
      x.history.push({ time: Date.now(), actor: COMMERCIAL_ACTOR, action: `Published v${x.version}${kind === 'discount' ? ` (${p}% for ${mo} months)` : ` (up to ${mo} months)`}`, reason: reason.trim() });
      logActivity(d, { actor: COMMERCIAL_ACTOR, actorRole: 'admin', clientId: 'c1', type: 'billing', action: `Published retention offer “${OFFER_LABEL[kind]}” v${x.version}`, reason: reason.trim(), result: 'success' });
    });
    toast('New version published. Accepted offers keep their old terms.', 'success');
    onClose();
  };
  return (
    <Modal title={`Edit · ${OFFER_LABEL[kind]}`} onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Publish v{o.version + 1}</button></>}>
      <div className="form-grid">
        {kind === 'discount' && <Field label="Discount (%)" hint={`Max ${max}% to stay above the ${pct(MIN_MARGIN)} margin guardrail`}><input type="number" value={percent} onChange={(e) => setPercent(e.target.value)} /></Field>}
        <Field label={kind === 'pause' ? 'Max pause (months)' : 'Duration (months)'}><input type="number" value={months} onChange={(e) => setMonths(e.target.value)} /></Field>
        <Field label="Redemption limit" hint="Leave empty for no limit"><input type="number" value={limit} onChange={(e) => setLimit(e.target.value)} /></Field>
        <Field label="Valid until" hint="Leave empty for no end date"><input type="date" value={until} onChange={(e) => setUntil(e.target.value)} /></Field>
      </div>
      {kind === 'discount' && p > 0 && (
        <p className="small">Starter during the discount: {usd(Math.round(starter * (1 - p / 100) * 100) / 100)} · margin {pct(marginAt(starter * (1 - p / 100), costOf(STARTER)))} {p > max && <span className="field-error"><AlertTriangle size={12} aria-hidden /> below guardrail</span>}</p>
      )}
      <Field label="Reason (logged)"><textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
      {touched && errors.length > 0 && <ul className="plain-list small field-error" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
    </Modal>
  );
}

/* ───────────── Change log ───────────── */

function ChangeLog() {
  const { state } = useStore();
  const rows = [
    ...state.offers.flatMap((o) => o.history.map((h) => ({ ...h, what: OFFER_LABEL[o.kind] }))),
    ...state.priceVersions.map((v) => ({ time: v.time, actor: v.actor, action: `${v.status === 'published' ? 'Published' : 'Drafted'} ${usd(v.fromUsd)} → ${usd(v.toUsd)} from ${v.effective}`, reason: v.reason, what: moduleName(v.module) })),
  ].sort((a, b) => b.time - a.time);
  return (
    <section className="card table-card">
      <table className="table">
        <thead><tr><th>When</th><th>What</th><th>Change</th><th>By</th><th>Reason</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}><td className="small">{dateTime(r.time)}</td><td>{r.what}</td><td className="small">{r.action}</td><td className="small">{r.actor}</td><td className="small muted">{r.reason ?? '—'}</td></tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
