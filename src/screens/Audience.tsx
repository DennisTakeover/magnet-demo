import { Fragment, useState, type ReactNode } from 'react';
import {
  Baby, Bike, Bookmark, Briefcase, CalendarPlus, ChevronDown, Clock, Eye, Film, Gift, GalleryHorizontal, Heart, Image as ImageIcon,
  Lightbulb, MapPin, MessageCircle, Mountain, Plane, Plus, Repeat, ScanSearch, ShieldCheck, Sparkles, Star, Target, TrendingUp, Trophy,
  Users, Workflow, type LucideIcon,
} from 'lucide-react';
import { clientLog, navigate, uid, useStore } from '../store';
import { PageHeader } from '../components/ui';
import { DAYS, INSIGHTS, SLOTS, type AudiencePersona, type FormatStat, type Recommendation } from '../insights';

const PERSONA_ICON: Record<AudiencePersona['icon'], LucideIcon> = {
  briefcase: Briefcase, plane: Plane, heart: Heart, repeat: Repeat, search: ScanSearch, gift: Gift, bike: Bike, mountain: Mountain, baby: Baby,
};
const FORMAT_ICON: Record<FormatStat['format'], LucideIcon> = { Reel: Film, Carousel: GalleryHorizontal, Post: ImageIcon, Story: Sparkles };
const FLAG: Record<string, string> = { Netherlands: '🇳🇱', Belgium: '🇧🇪', Germany: '🇩🇪', France: '🇫🇷', 'United Kingdom': '🇬🇧', Other: '🌍' };
/** Series colours come from CSS so each brand gets its own validated palette. */
const C = ['var(--au-c1)', 'var(--au-c2)', 'var(--au-c3)'];
const fmt = (v: number) => (v >= 10000 ? `${(v / 1000).toFixed(1).replace('.0', '')}k` : v.toLocaleString('en-GB'));

/** SVG donut. Segments keep a small surface gap. */
export function Donut({ parts, size = 132, stroke = 16, children }: { parts: { value: number; color: string; label: string }[]; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  return (
    <div className="au-donut" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" aria-label={parts.map((p) => `${p.label} ${p.value}%`).join(', ')}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--au-track)" strokeWidth={stroke} />
        {parts.map((p) => {
          const len = (p.value / 100) * circ;
          const seg = (
            <circle key={p.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={p.color} strokeWidth={stroke}
              strokeDasharray={`${Math.max(len - 3, 0)} ${circ}`} strokeDashoffset={-offset} transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              <title>{`${p.label}: ${p.value}%`}</title>
            </circle>
          );
          offset += len;
          return seg;
        })}
      </svg>
      <div className="au-donut-center">{children}</div>
    </div>
  );
}

export default function Audience() {
  const { state, update, toast } = useStore();
  const data = INSIGHTS[state.persona];
  const [open, setOpen] = useState<string | null>(null);
  const maxAge = Math.max(...data.ages.flatMap((a) => [a.women, a.men]));
  const women = data.ages.reduce((t, a) => t + a.women, 0);
  const men = data.ages.reduce((t, a) => t + a.men, 0);
  const flat = data.activity.flatMap((row, d) => row.map((v, s) => ({ v, d, s })));
  const best = [...flat].sort((a, b) => b.v - a.v).slice(0, 2);
  const isBest = (d: number, s: number) => best.some((b) => b.d === d && b.s === s);
  const topFormat = [...data.formats].sort((a, b) => b.reach + b.saves + b.dms - (a.reach + a.saves + a.dms))[0].format;
  const other = 100 - data.personas.reduce((t, p) => t + p.share, 0);

  const planPost = (p: AudiencePersona) => {
    update((d) => {
      d.posts.push({ id: uid('p'), title: p.postIdea.title, caption: p.postIdea.caption, format: p.postIdea.format, status: 'draft', date: null, time: null });
      clientLog(d, 'post', `Created a post idea for persona “${p.name}”`);
    });
    toast(`Draft “${p.postIdea.title}” added to your Planner`, 'success', { label: 'Open Planner', href: '/app/planner' });
  };

  const addTopic = (topic: string) => {
    let added = false;
    update((d) => {
      if (d.audience.topics.some((t) => t.toLowerCase() === topic.toLowerCase())) return;
      d.audience.topics.push(topic);
      added = true;
      clientLog(d, 'setting', `Added Grow topic “${topic}” from Audience insights`);
    });
    toast(added ? `“${topic}” added to your Grow topics` : `“${topic}” is already one of your Grow topics`, added ? 'success' : 'info', { label: 'Open Grow', href: '/app/grow' });
  };

  const runRec = (r: Recommendation) => {
    const persona = data.personas.find((x) => x.id === r.persona);
    if (r.action === 'topic' && persona) return addTopic(persona.topic);
    if (r.action === 'flow') return navigate('/app/flows/new');
    if (r.action === 'post' && persona) return planPost(persona);
    navigate('/app/planner');
  };

  const kpis: [LucideIcon, string, string][] = [
    [Users, fmt(data.followers), 'Followers'],
    [TrendingUp, fmt(data.reach28), 'Reached · 28 days'],
    [Sparkles, `${data.engagementRate}%`, 'Engagement'],
    [Target, `${data.matchShare}%`, 'Fit your target'],
  ];

  return (
    <div className="au">
      <PageHeader title="Know your audience." subtitle="Who they are, when they’re online and what makes them act." actions={<span className="chip-static">Last 28 days</span>} />

      <section className="card au-hero" aria-label="Audience at a glance">
        <Donut parts={[...data.personas.map((p, i) => ({ value: p.share, color: C[i], label: p.name })), { value: other, color: 'var(--au-other)', label: 'Other' }]} size={168} stroke={20}>
          <strong>3</strong><span>personas</span>
        </Donut>
        <ul className="au-hero-legend">
          {data.personas.map((p, i) => {
            const Icon = PERSONA_ICON[p.icon];
            return (
              <li key={p.id}>
                <span className="au-avatar sm" style={{ ['--c' as string]: C[i] }}><Icon size={16} aria-hidden /></span>
                <span className="au-hero-name">{p.name}</span>
                <strong>{p.share}%</strong>
              </li>
            );
          })}
          <li className="other"><span className="au-avatar sm" style={{ ['--c' as string]: 'var(--au-other)' }} /><span className="au-hero-name">Other</span><strong>{other}%</strong></li>
        </ul>
        <div className="au-kpis">
          {kpis.map(([Icon, value, label]) => (
            <div key={label} className="au-kpi"><Icon size={18} aria-hidden /><strong>{value}</strong><span>{label}</span></div>
          ))}
        </div>
      </section>

      <div className="au-persona-grid">
        {data.personas.map((p, i) => {
          const Icon = PERSONA_ICON[p.icon];
          const expanded = open === p.id;
          return (
            <article key={p.id} className="au-persona" style={{ ['--c' as string]: C[i] }}>
              <div className="au-persona-top">
                <span className="au-avatar"><Icon size={26} aria-hidden /></span>
                <span className="au-persona-share"><strong>{p.share}%</strong><span>of audience</span></span>
              </div>
              <h2>{p.name}</h2>
              <div className="au-tags">
                <span><Users size={13} aria-hidden /> {p.age}</span>
                <span><MapPin size={13} aria-hidden /> {p.where.split(',')[0]}</span>
              </div>
              <div className="au-tiles">
                <div><Lightbulb size={16} aria-hidden /><span>{p.bestContent}</span></div>
                <div><Clock size={16} aria-hidden /><span>{p.bestTime}</span></div>
              </div>
              <div className="au-cares">{p.cares.map((c) => <span key={c}>{c}</span>)}</div>
              <div className="au-bubble" aria-label="Typical question in your DMs"><MessageCircle size={14} aria-hidden /> {p.asks[0]}</div>
              {expanded && (
                <div className="au-more">
                  <p>{p.summary}</p>
                  {p.asks.slice(1).map((a) => <div key={a} className="au-bubble"><MessageCircle size={14} aria-hidden /> {a}</div>)}
                </div>
              )}
              <button className="au-toggle" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : p.id)}>
                {expanded ? 'Less' : 'More about them'} <ChevronDown size={14} aria-hidden />
              </button>
              <div className="au-persona-actions">
                <button className="btn btn-sm btn-primary" onClick={() => planPost(p)}><CalendarPlus size={14} /> Plan a post for them</button>
                <button className="btn btn-sm btn-secondary" onClick={() => addTopic(p.topic)} title={`Add “${p.topic}” to your Grow topics`}><Plus size={14} /> Add “{p.topic}” to Grow</button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="au-grid">
        <section className="card" aria-labelledby="au-age">
          <div className="card-head">
            <h2 id="au-age">Age & gender</h2>
            <span className="au-legend"><i style={{ background: C[0] }} /> Women <i style={{ background: C[1] }} /> Men</span>
          </div>
          <div className="au-agewrap">
            <div className="au-cols" role="table" aria-label="Followers by age and gender">
              {data.ages.map((a) => (
                <div key={a.band} className="au-col" role="row">
                  <div className="au-col-bars">
                    <span role="cell" style={{ height: `${(a.women / maxAge) * 100}%`, background: C[0] }} title={`${a.band}, women: ${a.women}%`} />
                    <span role="cell" style={{ height: `${(a.men / maxAge) * 100}%`, background: C[1] }} title={`${a.band}, men: ${a.men}%`} />
                  </div>
                  <span className="au-col-label" role="rowheader">{a.band}</span>
                </div>
              ))}
            </div>
            <Donut parts={[{ value: women, color: C[0], label: 'Women' }, { value: men, color: C[1], label: 'Men' }]} size={112} stroke={14}>
              <strong>{women}%</strong><span>women</span>
            </Donut>
          </div>
        </section>

        <section className="card" aria-labelledby="au-loc">
          <h2 id="au-loc">Where they live</h2>
          <div className="au-flags">
            {data.countries.map((c) => (
              <div key={c.name} title={`${c.name}: ${c.share}%`}><span className="au-flag" aria-hidden>{FLAG[c.name] ?? '🌍'}</span><strong>{c.share}%</strong><span>{c.name}</span></div>
            ))}
          </div>
          <ul className="au-cities">
            {data.cities.map((c) => (
              <li key={c.name} title={`${c.name}: ${c.share}%`}>
                <MapPin size={14} aria-hidden />
                <span className="au-city">{c.name}</span>
                <span className="au-track"><span style={{ width: `${(c.share / data.cities[0].share) * 100}%` }} /></span>
                <strong>{c.share}%</strong>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="card" aria-labelledby="au-time">
        <div className="card-head">
          <h2 id="au-time">When they’re online</h2>
          <div className="au-besttime">
            {best.map((b) => <span key={`${b.d}-${b.s}`}><Star size={14} aria-hidden /> {DAYS[b.d]} {SLOTS[b.s]}</span>)}
          </div>
        </div>
        <div className="au-heat" role="table" aria-label="Follower activity by day and time">
          <span />
          {SLOTS.map((s) => <span key={s} className="au-heat-h" role="columnheader">{s}</span>)}
          {data.activity.map((row, d) => (
            <Fragment key={DAYS[d]}>
              <span className="au-heat-h left" role="rowheader">{DAYS[d]}</span>
              {row.map((v, s) => (
                <span key={s} role="cell" className={`au-cell ${isBest(d, s) ? 'best' : ''}`} style={{ ['--a' as string]: (0.1 + (v / 100) * 0.9).toFixed(2) }}
                  title={`${DAYS[d]} ${SLOTS[s]}: ${v}% of peak`} aria-label={`${DAYS[d]} ${SLOTS[s]}: ${v}% of peak`}>
                  {isBest(d, s) && <Star size={14} aria-hidden />}
                </span>
              ))}
            </Fragment>
          ))}
        </div>
        <div className="au-scale" aria-hidden><span>Quiet</span><i /><span>Busy</span></div>
      </section>

      <section className="card" aria-labelledby="au-fmt">
        <div className="card-head">
          <h2 id="au-fmt">Which formats work</h2>
          <span className="au-legend"><Eye size={14} aria-hidden /> Reach <Bookmark size={14} aria-hidden /> Saves <MessageCircle size={14} aria-hidden /> DMs</span>
        </div>
        <div className="au-formats">
          {data.formats.map((f) => {
            const Icon = FORMAT_ICON[f.format];
            const win = f.format === topFormat;
            const rows: [LucideIcon, string, number | null][] = [[Eye, 'Reach', f.reach], [Bookmark, 'Saves', f.format === 'Story' ? null : f.saves], [MessageCircle, 'DMs', f.dms]];
            return (
              <div key={f.format} className={`au-format ${win ? 'win' : ''}`}>
                {win && <span className="au-win"><Trophy size={12} aria-hidden /> Best</span>}
                <span className="au-format-icon"><Icon size={22} aria-hidden /></span>
                <strong>{f.format}</strong>
                {rows.map(([RIcon, label, v]) => (
                  <div key={label} className="au-meter" title={v === null ? `${label}: not available` : `${label}: ${v} (best = 100)`}>
                    <RIcon size={13} aria-label={label} />
                    <span className="au-track"><span style={{ width: `${v ?? 0}%` }} /></span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <div className="au-grid">
        <section className="card" aria-labelledby="au-top">
          <div className="card-head">
            <h2 id="au-top">Which topics work</h2>
            <span className="au-legend"><i style={{ background: C[0] }} /> Engagement <i style={{ background: C[2] }} /> Leads</span>
          </div>
          <div className="au-topics">
            {data.topics.map((t) => (
              <div key={t.topic} className="au-topic" title={`${t.topic}: engagement ${t.engagement}, leads ${t.leads} (best = 100)`}>
                <span className="au-topic-label">{t.topic}</span>
                <span className="au-pair">
                  <span style={{ width: `${t.engagement}%`, background: C[0] }} />
                  <span style={{ width: `${t.leads}%`, background: C[2] }} />
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card" aria-labelledby="au-posts">
          <h2 id="au-posts">Top posts</h2>
          <div className="au-posts">
            {data.topPosts.map((p, i) => {
              const Icon = FORMAT_ICON[p.format];
              return (
                <div key={p.title} className={`au-post g${i}`}>
                  <span className="au-post-rank">#{i + 1}</span>
                  <Icon size={16} className="au-post-format" aria-label={p.format} />
                  <strong>{p.title}</strong>
                  <div className="au-post-stats">
                    <span title="Reach"><Eye size={12} aria-label="Reach" /> {fmt(p.reach)}</span>
                    <span title="Saves"><Bookmark size={12} aria-label="Saves" /> {fmt(p.saves)}</span>
                    <span title="Conversations"><MessageCircle size={12} aria-label="Conversations" /> {p.conversations}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <section aria-labelledby="au-recs">
        <h2 id="au-recs" className="au-section-title"><Lightbulb size={18} aria-hidden /> Do this next</h2>
        <div className="au-recs">
          {data.recommendations.map((r) => {
            const Icon = r.action === 'flow' ? Workflow : r.action === 'topic' ? Target : Clock;
            return (
              <button key={r.title} className="au-rec" onClick={() => runRec(r)} title={r.body}>
                <span className="au-rec-icon"><Icon size={20} aria-hidden /></span>
                <strong>{r.title}</strong>
                <span className="au-rec-cta">{r.action === 'flow' ? 'Create Lead Flow' : r.action === 'topic' ? 'Add to Grow' : 'Open Planner'} →</span>
              </button>
            );
          })}
        </div>
      </section>

      <p className="au-note"><ShieldCheck size={15} aria-hidden /> Aggregated Instagram Insights + your own results. Personas are AI estimates of groups, never individuals. Demo data.</p>
    </div>
  );
}
