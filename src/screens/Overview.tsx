import { useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, CalendarDays, CalendarCheck, ChevronDown, ChevronLeft, ChevronRight, Copy, Info, MessageCircle, UserRound, Users, AlertTriangle, Workflow } from 'lucide-react';
import { usePersona, useStore } from '../store';
import { inAccount } from '../accounts';
import UpgradeHint from '../components/UpgradeHint';
import { fmtDate } from '../billing';
import Checklist from '../components/Checklist';
import { t } from '../i18n/locale';
import { Avatar, FlowStatusBadge, PageHeader, timeAgo } from '../components/ui';
import { PostTile } from './Planner';

type Period = '7' | '28' | '90';

const DEFS = [
  'Difference between follower count at the start and end of the period. Says nothing about the cause.',
  'Unique contacts who started a new conversation in the period.',
  'Contacts who met your qualification criteria in the period.',
];

const SPARKS = [
  [3, 4, 3, 5, 6, 5, 7, 8, 9, 10],
  [2, 3, 3, 4, 3, 5, 6, 6, 8, 9],
  [1, 2, 2, 3, 2, 4, 4, 5, 6, 7],
  [1, 1, 2, 1, 2, 2, 3, 3, 4, 5],
];

function seeded(n: number) {
  let x = 7;
  return Array.from({ length: n }, () => {
    x = (x * 9301 + 49297) % 233280;
    return x / 233280;
  });
}

/** Sample follower counts that end `total` above where they start. */
function followerSeries(days: number, total: number, end: number) {
  const r = seeded(days);
  const raw = r.map((v, i) => i * (total / (days - 1)) + (v - 0.5) * 40);
  const shift = end - raw[raw.length - 1];
  return raw.map((v) => Math.round(v + shift));
}

function Spark({ values }: { values: number[] }) {
  const max = Math.max(...values);
  return (
    <svg className="spark" viewBox="0 0 60 28" aria-hidden>
      {values.map((v, i) => (
        <rect key={i} x={i * 6} y={28 - (v / max) * 26} width="4" height={(v / max) * 26} rx="1.5" className={i === values.length - 1 ? 'spark-last' : ''} />
      ))}
    </svg>
  );
}

function TrendChart({ period }: { period: Period }) {
  const persona = usePersona();
  const days = Number(period);
  const total = persona.metrics[period].growth;
  const end = persona.trendEnd;
  const values = useMemo(() => followerSeries(days, total, end), [days, total, end]);
  const [hover, setHover] = useState<number | null>(null);
  const ref = useRef<SVGSVGElement>(null);
  const W = 640, H = 220, L = 52, R = 16, T = 16, B = 28;
  const min = Math.floor((Math.min(...values) - 30) / 100) * 100;
  const max = Math.ceil((Math.max(...values) + 30) / 100) * 100;
  const x = (i: number) => L + (i / (values.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - min) / (max - min)) * (H - T - B);
  const step = Math.max(100, Math.ceil((max - min) / 4 / 100) * 100);
  const ticks: number[] = [];
  for (let v = min; v <= max; v += step) ticks.push(v);
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `${line} L${x(values.length - 1)},${H - B} L${x(0)},${H - B} Z`;
  const date = (i: number) => {
    const d = new Date();
    d.setDate(d.getDate() - (values.length - 1 - i));
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };
  const labelIdx = [0, Math.round((values.length - 1) / 4), Math.round((values.length - 1) / 2), Math.round(((values.length - 1) * 3) / 4), values.length - 1];
  const hi = hover ?? values.length - 1;

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - L) / (W - L - R)) * (values.length - 1));
    setHover(Math.max(0, Math.min(values.length - 1, i)));
  };

  return (
    <div className="trend">
      <svg
        ref={ref}
        viewBox={`0 0 ${W} ${H}`}
        className="trend-svg"
        role="img"
        aria-label={`Sample follower count over the last ${days} days, from ${values[0].toLocaleString('en-GB')} to ${values[values.length - 1].toLocaleString('en-GB')}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} className="grid" />
            <text x={L - 10} y={y(t) + 4} textAnchor="end" className="axis">{(t / 1000).toFixed(1)}K</text>
          </g>
        ))}
        {labelIdx.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === values.length - 1 ? 'end' : 'middle'} className="axis">{date(i)}</text>
        ))}
        <path d={area} fill="url(#trendFill)" />
        <path d={line} className="trend-line" />
        <line x1={x(hi)} x2={x(hi)} y1={T} y2={H - B} className="crosshair" />
        <circle cx={x(hi)} cy={y(values[hi])} r="5" className="trend-dot" />
      </svg>
      <div className={`trend-tip ${x(hi) / W > 0.8 ? 'flip' : ''}`} style={{ left: `${(x(hi) / W) * 100}%`, top: `${(y(values[hi]) / H) * 100}%` }}>
        <strong>{values[hi].toLocaleString('en-GB')}</strong>
        <span>{date(hi)}</span>
      </div>
    </div>
  );
}

export default function Overview() {
  const { state } = useStore();
  const [period, setPeriod] = useState<Period>('28');
  const [allMoves, setAllMoves] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const persona = usePersona();
  const m = persona.metrics[period];
  const defs = [...DEFS, persona.stage4Definition];

  const convs = state.sim.emptyInbox ? [] : inAccount(state, [...state.conversations]).sort((a, b) => b.lastAt - a.lastAt);
  const waiting = convs.filter((c) => (c.needsYou || c.unread) && !c.takenOver);
  const suggested = state.sources.filter((s) => s.status === 'suggested');
  const toBook = state.leads.filter((l) => l.status === 'qualified');
  const nextPost = state.posts
    .filter((p) => p.status === 'scheduled' && p.date)
    .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`))[0];
  const failedPosts = state.posts.filter((p) => p.status === 'failed');
  const flow = state.flows.find((f) => f.status === 'active') ?? state.flows[0];

  type Move = { icon: typeof Users; tone: string; title: string; sub: string; cta: string; href: string };
  const moves: Move[] = [
    ...(state.billing.status === 'payment_issue' ? [{ icon: AlertTriangle, tone: 'red', title: 'Your last payment failed', sub: 'Update your payment method to keep your modules running.', cta: 'Fix payment', href: '/app/billing' }] : []),
    ...(state.billing.status === 'cancellation_scheduled' ? [{ icon: AlertTriangle, tone: 'orange', title: 'Your subscription ends soon', sub: `Access until ${fmtDate(state.billing.periodEnd)}. You can still keep it.`, cta: 'Review', href: '/app/billing' }] : []),
    ...failedPosts.map((p) => ({ icon: AlertTriangle, tone: 'red', title: `“${p.title}” didn’t publish`, sub: 'Retry or move it back to draft.', cta: 'Fix post', href: `/app/planner/${p.id}` })),
    ...(waiting.length ? [{ icon: MessageCircle, tone: 'orange', title: `${waiting.length} conversation${waiting.length > 1 ? 's' : ''} need${waiting.length > 1 ? '' : 's'} you`, sub: 'People are waiting for your reply.', cta: 'Open inbox', href: '/app/inbox' }] : []),
    ...(suggested.length ? [{ icon: Users, tone: 'blue', title: `Review ${suggested.length} audience suggestion${suggested.length > 1 ? 's' : ''}`, sub: 'Find more people like your best followers.', cta: 'Review', href: '/app/grow' }] : []),
    ...(toBook.length ? [{ icon: UserRound, tone: 'violet', title: `${toBook.length} qualified leads to follow up`, sub: toBook.map((l) => l.name.split(' ')[0]).join(', '), cta: 'View leads', href: '/app/leads' }] : []),
    ...(nextPost ? [{ icon: CalendarCheck, tone: 'green', title: `Check your next post`, sub: `“${nextPost.title}” goes out ${new Date(`${nextPost.date}T12:00`).toLocaleDateString('en-GB', { weekday: 'long' })} at ${nextPost.time}.`, cta: 'View post', href: `/app/planner/${nextPost.id}` }] : []),
    ...(state.campaign !== 'active' ? [{ icon: Workflow, tone: 'orange', title: 'Your Grow campaign is paused', sub: 'No new growth actions run until you resume.', cta: 'Open Grow', href: '/app/grow' }] : []),
  ];

  const tiles = [
    { label: 'Net follower growth', value: `+${m.growth}`, icon: Users, href: '/app/grow' },
    { label: 'New conversations', value: m.conversations, icon: MessageCircle, href: '/app/inbox' },
    { label: 'Qualified leads', value: m.qualified, icon: UserRound, href: '/app/leads' },
    { label: persona.stage4Plural, value: m.goal, icon: CalendarDays, href: '/app/leads' },
  ];

  // Week strip, Monday first
  const monday = new Date();
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset * 7);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { d, iso, post: state.posts.find((p) => p.date === iso && p.status !== 'draft') };
  });
  const fmt = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const TONES = ['lavender', 'blue', 'yellow', 'mint'];

  return (
    <>
      <PageHeader
        eyebrow={<span className="ov-greet">{greet}, {state.business.owner.split(' ')[0]}</span>}
        title={t('ov.title')}
        subtitle={t('ov.sub')}
        actions={
          <label className="select-pill">
            <CalendarDays size={18} aria-hidden />
            <span className="sr-only">Period</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              <option value="7">Last 7 days</option>
              <option value="28">Last 28 days</option>
              <option value="90">Last 90 days</option>
            </select>
            <ChevronDown size={16} aria-hidden />
          </label>
        }
      />

      <Checklist />
      <UpgradeHint
        module="planner"
        context="overview"
        title="Plan your posts a week ahead"
        body="Turn questions from your Inbox into post ideas and schedule them in one calendar."
        example={[{ label: 'This week', value: '3 posts scheduled, 1 draft' }, { label: 'Idea from Inbox', value: '“Most asked: how long does it take?”' }, { label: 'Link a Lead Flow', value: 'Goes live when the post is published' }]}
      />

      <section className="ov-hero" aria-label="Key numbers">
        <div className="card ov-chart-card" aria-labelledby="trend">
          <div className="ov-chart-head">
            <div>
              <h2 id="trend">Followers</h2>
              <span className="ov-big">{persona.trendEnd.toLocaleString('en-GB')}</span>
              <span className="metric-delta">
                {m.deltas[0] > 0 ? <><ArrowUpRight size={14} aria-hidden /> +{m.deltas[0]}%</> : '0%'}
                <span className="muted"> +{m.growth} in {period} days · example data</span>
              </span>
            </div>
            <span className="chip-static">Audience</span>
          </div>
          <TrendChart period={period} />
        </div>
        <div className="ov-tiles">
          {tiles.map((tile, i) => {
            const Icon = tile.icon;
            const d = m.deltas[i];
            return (
              <a key={tile.label} className={`metric ov-tile tone-${TONES[i]}`} href={`#${tile.href}`}>
                <span className="metric-top">
                  <span className="ov-tile-icon"><Icon size={18} aria-hidden /></span>
                  <span className="metric-label">{tile.label}</span>
                  <span className="info" tabIndex={0} aria-label={defs[i]} data-tip={defs[i]}>
                    <Info size={14} aria-hidden />
                  </span>
                </span>
                <span className="metric-row">
                  <span className="metric-value">{tile.value}</span>
                  <Spark values={SPARKS[i]} />
                </span>
                <span className="metric-delta">
                  {d > 0 ? <><ArrowUpRight size={14} aria-hidden /> +{d}%</> : '0%'}
                  <span className="muted"> vs prev. {period} days</span>
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <div className="ov-row">
        <section className="card moves" aria-labelledby="moves">
          <div className="card-head">
            <h2 id="moves">Today’s focus {moves.length > 0 && <span className="title-badge sm">{moves.length}</span>}</h2>
            {moves.length > 3 && (
              <button className="link-btn" onClick={() => setAllMoves(!allMoves)}>
                {allMoves ? 'Show less' : 'View all'} <ArrowRight size={16} />
              </button>
            )}
          </div>
          {moves.length === 0 && <p className="muted">You’re all caught up.</p>}
          <ul className="move-list">
            {(allMoves ? moves : moves.slice(0, 4)).map((mv, i) => {
              const Icon = mv.icon;
              return (
                <li key={mv.title} className="move">
                  <span className={`move-icon tone-${mv.tone}`}><Icon size={22} aria-hidden /></span>
                  <span className="move-text">
                    <strong>{mv.title}</strong>
                    <span className="muted clamp-1">{mv.sub}</span>
                  </span>
                  <a className={`btn btn-sm ${i === 0 ? 'btn-primary' : 'btn-soft'}`} href={`#${mv.href}`}>{mv.cta}</a>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="card" aria-labelledby="recent">
          <div className="card-head">
            <h2 id="recent">Inbox {waiting.length > 0 && <span className="title-badge sm">{waiting.length} to review</span>}</h2>
            <a className="link-btn" href="#/app/inbox">Open <ArrowRight size={16} /></a>
          </div>
          {convs.length === 0 && <p className="muted">No conversations yet.</p>}
          <ul className="recent-list">
            {convs.slice(0, 4).map((c) => {
              const last = [...c.messages].reverse().find((x) => x.from !== 'event');
              return (
                <li key={c.id}>
                  <a href={`#/app/inbox/${c.id}`} className="recent">
                    {c.unread ? <span className="unread-dot" aria-label="Unread" /> : <span className="unread-dot off" aria-hidden />}
                    <Avatar name={c.name} color={c.color} size={42} />
                    <span className="recent-body">
                      <span className="recent-top"><strong>{c.name}</strong><span className="muted xsmall">{timeAgo(c.lastAt)}</span></span>
                      <span className="muted small clamp-1">{last?.text}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <div className="ov-row ov-row-c">
        {flow && (
          <section className="card flow-spot" aria-labelledby="flowspot">
            <div className="card-head">
              <h2 id="flowspot">{flow.name}</h2>
              <FlowStatusBadge status={flow.status} />
            </div>
            <p className="muted small">Lead Flow · turns curious followers into qualified leads.</p>
            <div className="kw-box">
              <span><small>Keyword</small>{flow.trigger.keyword}</span>
              <button
                className="icon-btn"
                aria-label="Copy keyword"
                onClick={() => navigator.clipboard?.writeText(flow.trigger.keyword).catch(() => undefined)}
              >
                <Copy size={16} />
              </button>
            </div>
            <div className="flow-trio">
              <div><strong>{flow.stats.requesters}</strong><span>requests</span></div>
              <div><strong>{flow.stats.sent}</strong><span>sent</span></div>
              <div><strong>{flow.stats.clicks}</strong><span>link clicks</span></div>
            </div>
            <a className="btn btn-secondary btn-block" href={`#/app/flows/${flow.id}`}>View flow <ArrowRight size={16} /></a>
          </section>
        )}

        <section className="card" aria-labelledby="week">
          <div className="card-head">
            <h2 id="week">This week’s content</h2>
            <div className="row gap-sm">
              <span className="muted small">{fmt(week[0].d)} – {fmt(week[6].d)}</span>
              <button className="icon-btn round" aria-label="Previous week" onClick={() => setWeekOffset(weekOffset - 1)}><ChevronLeft size={16} /></button>
              <button className="icon-btn round" aria-label="Next week" onClick={() => setWeekOffset(weekOffset + 1)}><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="week-strip">
            {week.map(({ d, iso, post }) => (
              <div key={iso} className="week-day">
                <span className="week-label">
                  <strong>{d.toLocaleDateString('en-GB', { weekday: 'short' })}</strong>
                  <span className="muted">{fmt(d)}</span>
                </span>
                {post ? (
                  <a href={`#/app/planner/${post.id}`} className="week-tile" aria-label={`${post.title}, ${post.status}`}>
                    <PostTile post={post} />
                  </a>
                ) : (
                  <a href="#/app/planner" className="week-empty" aria-label={`No post on ${fmt(d)}. Open Planner`}>+</a>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
      <p className="sample-note">All numbers are fictional sample data, not MAGNET results. Growth, conversations and leads are separate measures, not a funnel.</p>
    </>
  );
}
