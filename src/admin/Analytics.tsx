import { useState } from 'react';
import { Info } from 'lucide-react';
import { useStore } from '../store';
import { Badge, PageHeader, Segmented } from '../components/ui';
import { MODULES, MODULE_COST_USD } from '../billing';
import { grantedModules, isAccepted } from '../partners';
import type { ModuleId } from '../types';

/**
 * Marketing analytics (MKT-01, MKT-04, PAR-12). Aggregates only: no DM content, no personal data.
 * The base numbers are a labelled demo dataset; actions in this demo workspace are added on top.
 */

type Period = '30' | '90';
type Market = 'all' | 'NL' | 'US' | 'DE' | 'other';

const MARKETS: { id: Market; label: string; share: number }[] = [
  { id: 'NL', label: 'Netherlands', share: 0.38 },
  { id: 'US', label: 'United States', share: 0.27 },
  { id: 'DE', label: 'Germany', share: 0.17 },
  { id: 'other', label: 'Other', share: 0.18 },
];

// 90-day base per channel (all markets)
const CHANNELS = [
  { id: 'Instagram ads', visits: 6200, signups: 248, activated: 141, paid: 52 },
  { id: 'Organic search', visits: 4100, signups: 133, activated: 88, paid: 37 },
  { id: 'Partner referrals', visits: 1420, signups: 71, activated: 52, paid: 26 },
  { id: 'Direct', visits: 2300, signups: 64, activated: 37, paid: 15 },
  { id: 'Unknown', visits: 1900, signups: 58, activated: 26, paid: 9 },
];

// Last month = module MRR (24,037) minus active discounts (187), so the tiles reconcile
const MRR_TREND = [14620, 16130, 18350, 19980, 22010, 23850];
const ACTIVE_DISCOUNTS_USD = 187;

const RETENTION = { starts: 96, offerShown: 81, accepted: 33, applied: 31, cancelled: 52 };
const SAVES: { offer: string; accepted: number; paid30: number | null; paid60: number | null; discountCostUsd: number; retainedUsd: number }[] = [
  { offer: 'Downgrade to Starter', accepted: 11, paid30: 10, paid60: 8, discountCostUsd: 0, retainedUsd: 1067 },
  { offer: 'Temporary discount', accepted: 9, paid30: 8, paid60: null, discountCostUsd: 1604, retainedUsd: 2138 },
  { offer: 'Remove unused modules', accepted: 7, paid30: 7, paid60: 6, discountCostUsd: 0, retainedUsd: 1239 },
  { offer: 'Pause subscription', accepted: 4, paid30: null, paid60: null, discountCostUsd: 0, retainedUsd: 0 },
  { offer: 'Free setup help / review', accepted: 2, paid30: 2, paid60: 1, discountCostUsd: 0, retainedUsd: 494 },
];

const MODULE_CUSTOMERS: Record<ModuleId, number> = { core: 141, grow: 128, inbox: 133, flows: 71, comments: 38, planner: 56 };

export default function Analytics() {
  const { state } = useStore();
  const [period, setPeriod] = useState<Period>('90');
  const [market, setMarket] = useState<Market>('all');
  const f = (period === '30' ? 0.36 : 1) * (market === 'all' ? 1 : MARKETS.find((m) => m.id === market)!.share);
  const sc = (v: number) => Math.round(v * f);
  const scMoney = (v: number) => Math.round(v * (market === 'all' ? 1 : MARKETS.find((m) => m.id === market)!.share));

  // Live additions from this demo workspace
  const sessions = state.billing.sessions;
  const live = {
    starts: sessions.length,
    offerShown: sessions.filter((s) => s.offerShown).length,
    accepted: sessions.filter((s) => ['downgraded', 'discount', 'paused', 'support'].includes(s.outcome)).length,
    cancelled: sessions.filter((s) => s.outcome === 'cancelled').length,
  };

  const channels = CHANNELS.map((c) => ({ ...c, visits: sc(c.visits), signups: sc(c.signups), activated: sc(c.activated), paid: sc(c.paid) }));
  const tot = channels.reduce((a, c) => ({ visits: a.visits + c.visits, signups: a.signups + c.signups, activated: a.activated + c.activated, paid: a.paid + c.paid }), { visits: 0, signups: 0, activated: 0, paid: 0 });

  const complimentary = state.partners.filter((p) => p.program && isAccepted(p) && p.program.status !== 'ended' && grantedModules(p).length).length;
  const mrr = scMoney(MRR_TREND[MRR_TREND.length - 1]);
  const prevMrr = scMoney(MRR_TREND[MRR_TREND.length - 2]);
  const paying = Math.round(MODULE_CUSTOMERS.core * (market === 'all' ? 1 : MARKETS.find((m) => m.id === market)!.share));
  const funnel = [
    { label: 'Signed up', n: tot.signups },
    { label: 'Connected Instagram', n: Math.round(tot.signups * 0.78) },
    { label: 'Growth engine confirmed', n: Math.round(tot.signups * 0.66) },
    { label: 'First value reached', n: tot.activated },
    { label: 'Paid', n: tot.paid },
  ];
  const r = { starts: sc(RETENTION.starts) + live.starts, offerShown: sc(RETENTION.offerShown) + live.offerShown, accepted: sc(RETENTION.accepted) + live.accepted, applied: sc(RETENTION.applied) + live.accepted, cancelled: sc(RETENTION.cancelled) + live.cancelled };
  const maxModule = Math.max(...Object.values(MODULE_CUSTOMERS));
  const maxTrend = Math.max(...MRR_TREND);
  const usd = (v: number) => `$${v.toLocaleString('en-US')}`;
  const pctOf = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '—');

  return (
    <>
      <PageHeader title="Analytics" subtitle="Which channels bring customers who activate, pay and stay. Aggregated, without message content or personal data." />
      <div className="row gap-sm wrap admin-filters">
        <Segmented label="Period" value={period} onChange={setPeriod} options={[{ id: '30', label: 'Last 30 days' }, { id: '90', label: 'Last 90 days' }]} />
        <label><span className="sr-only">Market</span>
          <select aria-label="Market" value={market} onChange={(e) => setMarket(e.target.value as Market)}>
            <option value="all">All markets</option>
            {MARKETS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        <Badge tone="neutral">Demo dataset</Badge>
      </div>

      <div className="metric-grid">
        <div className="metric"><span className="metric-label">MRR</span><span className="metric-value">{usd(mrr)}</span><span className="metric-def">+{usd(mrr - prevMrr)} vs last month · after {usd(scMoney(ACTIVE_DISCOUNTS_USD))} active discounts · excludes {complimentary} complimentary partner account{complimentary === 1 ? '' : 's'}</span></div>
        <div className="metric"><span className="metric-label">Paying customers</span><span className="metric-value">{paying}</span><span className="metric-def">ARPA {usd(Math.round(mrr / Math.max(1, paying)))} / month</span></div>
        <div className="metric"><span className="metric-label">Signup → paid</span><span className="metric-value">{pctOf(tot.paid, tot.signups)}</span><span className="metric-def">{tot.paid} paid of {tot.signups} signups in this period</span></div>
        <div className="metric"><span className="metric-label">Time to first value</span><span className="metric-value">{market === 'US' ? '2.4' : '1.8'} days</span><span className="metric-def">Median, from signup to the first confirmed result</span></div>
      </div>

      <section className="card table-card" aria-labelledby="acq-h">
        <h2 id="acq-h" className="pad">Acquisition by first-touch channel</h2>
        <table className="table">
          <thead><tr><th>Channel</th><th>Visits</th><th>Signups</th><th>Activated</th><th>Paid</th><th>Signup → paid</th></tr></thead>
          <tbody>
            {channels.map((c) => (
              <tr key={c.id}>
                <td><strong>{c.id}</strong>{c.id === 'Unknown' && <div className="muted xsmall">No campaign data or tracking not allowed</div>}{c.id === 'Partner referrals' && <div className="muted xsmall"><a href="#/admin/partners?tab=performance">See per partner</a></div>}</td>
                <td>{c.visits.toLocaleString('en-US')}</td><td>{c.signups}</td><td>{c.activated} <span className="muted xsmall">{pctOf(c.activated, c.signups)}</span></td><td>{c.paid}</td><td><strong>{pctOf(c.paid, c.signups)}</strong></td>
              </tr>
            ))}
            <tr className="total-row"><td><strong>Total</strong></td><td>{tot.visits.toLocaleString('en-US')}</td><td>{tot.signups}</td><td>{tot.activated}</td><td>{tot.paid}</td><td><strong>{pctOf(tot.paid, tot.signups)}</strong></td></tr>
          </tbody>
        </table>
        <p className="muted xsmall pad">Attribution is commercial credit, not proof of extra impact. Visitors without consent or campaign data stay in Unknown instead of being guessed.</p>
      </section>

      <div className="grid-2">
        <section className="card" aria-labelledby="fun-h">
          <h2 id="fun-h">Activation funnel</h2>
          <ul className="hbars wide-label" aria-label="Activation funnel">
            {funnel.map((s) => (
              <li key={s.label} title={`${s.label}: ${s.n} (${pctOf(s.n, funnel[0].n)} of signups)`}>
                <span className="hbar-label">{s.label}</span>
                <span className="hbar-track"><span className="hbar-fill" style={{ width: `${(s.n / Math.max(1, funnel[0].n)) * 100}%` }} /></span>
                <span className="hbar-value">{s.n}<span className="muted xsmall"> · {pctOf(s.n, funnel[0].n)}</span></span>
              </li>
            ))}
          </ul>
          <p className="muted xsmall">A step counts only on a confirmed action, never on a page visit.</p>
        </section>
        <section className="card" aria-labelledby="mrr-h">
          <h2 id="mrr-h">MRR, last 6 months</h2>
          <div className="cols" role="img" aria-label={`MRR per month: ${MRR_TREND.map((v) => usd(scMoney(v))).join(', ')}`}>
            {MRR_TREND.map((v, i) => (
              <div key={i} className="col" title={`${monthLabel(i)}: ${usd(scMoney(v))}`}>
                <span className="col-value">{Math.round(scMoney(v) / 100) / 10}k</span>
                <span className="col-bar" style={{ height: `${(v / maxTrend) * 100}%` }} />
                <span className="col-label">{monthLabel(i)}</span>
              </div>
            ))}
          </div>
          <p className="muted xsmall">Collected subscription revenue, excl. tax, after discounts. Complimentary access counts as zero.</p>
        </section>
      </div>

      <section className="card" aria-labelledby="mod-h">
        <h2 id="mod-h">Module mix</h2>
        <ul className="hbars wide-label" aria-label="Paying customers per module">
          {MODULES.map((m) => {
            const n = Math.round(MODULE_CUSTOMERS[m.id] * (market === 'all' ? 1 : MARKETS.find((x) => x.id === market)!.share));
            return (
              <li key={m.id} title={`${m.name}: ${n} customers, ${usd(n * m.priceUsd)} MRR`}>
                <span className="hbar-label">{m.name}</span>
                <span className="hbar-track"><span className="hbar-fill" style={{ width: `${(MODULE_CUSTOMERS[m.id] / maxModule) * 100}%` }} /></span>
                <span className="hbar-value">{n}<span className="muted xsmall"> · {usd(n * m.priceUsd)}</span></span>
              </li>
            );
          })}
        </ul>
        <p className="muted xsmall">Customers with the module · its MRR at list price (sum minus active discounts = MRR). Estimated cost to serve per module: {MODULES.map((m) => `${m.name} $${MODULE_COST_USD[m.id]}`).join(', ')}.</p>
      </section>

      <section className="card" aria-labelledby="ret-h">
        <h2 id="ret-h">Retention: does a save last?</h2>
        <div className="ret-steps" aria-label="Cancellation funnel">
          {[
            ['Started cancelling', r.starts],
            ['Saw an offer', r.offerShown],
            ['Accepted an offer', r.accepted],
            ['Change applied', r.applied],
            ['Cancelled', r.cancelled],
          ].map(([l, n]) => (
            <div key={l as string} className="ret-step"><span className="metric-value sm">{n}</span><span className="small muted">{l}</span></div>
          ))}
        </div>
        {live.starts > 0 && <p className="small"><Info size={14} aria-hidden /> Includes {live.starts} cancellation visit{live.starts === 1 ? '' : 's'} from this demo workspace. Leaving the flow counts as abandoned, not saved.</p>}
        <table className="table">
          <thead><tr><th>Offer</th><th>Accepted</th><th>Still paying after 30 days</th><th>After 60 days</th><th>Discount cost</th><th>Net retained revenue</th></tr></thead>
          <tbody>
            {SAVES.map((s) => (
              <tr key={s.offer}>
                <td>{s.offer}</td>
                <td>{sc(s.accepted)}</td>
                <td>{s.paid30 == null ? <span className="muted">Too early</span> : `${sc(s.paid30)} (${pctOf(s.paid30, s.accepted)})`}</td>
                <td>{s.paid60 == null ? <span className="muted">Too early</span> : `${sc(s.paid60)} (${pctOf(s.paid60, s.accepted)})`}</td>
                <td>{usd(sc(s.discountCostUsd))}</td>
                <td><strong>{usd(sc(s.retainedUsd - s.discountCostUsd))}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="muted xsmall">An accepted offer alone is not success. We count a save once the customer is still paying after 30 and 60 days, net of discount cost. Pauses count from the moment the customer resumes.</p>
      </section>
    </>
  );
}

function monthLabel(i: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - (5 - i));
  return d.toLocaleDateString('en-GB', { month: 'short' });
}
