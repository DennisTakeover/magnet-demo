import { Fragment, useState } from 'react';
import { CalendarPlus, Clock, Info, Lightbulb, MapPin, MessageCircle, Plus, ShieldCheck, Sparkles, Target, TrendingUp, Users, Workflow } from 'lucide-react';
import { clientLog, navigate, uid, useStore } from '../store';
import { Badge, PageHeader } from '../components/ui';
import { DAYS, INSIGHTS, SLOTS, type AudiencePersona, type Recommendation } from '../insights';

const pct = (v: number) => `${v}%`;
const fmtNum = (v: number) => v.toLocaleString('en-GB');

/**
 * Audience insights: who the audience is, what works, and AI personas.
 * Built from aggregated Instagram Insights plus MAGNET's own results. No individual profiling.
 */
export default function Audience() {
  const { state, update, toast } = useStore();
  const data = INSIGHTS[state.persona];
  const [open, setOpen] = useState<string | null>(data.personas[0].id);
  const maxAge = Math.max(...data.ages.flatMap((a) => [a.women, a.men]));
  const women = data.ages.reduce((t, a) => t + a.women, 0);
  const men = data.ages.reduce((t, a) => t + a.men, 0);
  const flat = data.activity.flatMap((row, d) => row.map((v, s) => ({ v, d, s })));
  const best = [...flat].sort((a, b) => b.v - a.v).slice(0, 2);

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

  return (
    <>
      <PageHeader
        title="Know your audience."
        subtitle="Who follows you, what they respond to, and the groups of people behind the numbers."
        actions={<span className="chip-static">Last 28 days</span>}
      />

      <div className="metric-grid">
        <div className="metric"><span className="metric-top"><Users size={18} className="metric-icon" aria-hidden /><span className="metric-label">Followers</span></span><span className="metric-value">{fmtNum(data.followers)}</span><span className="metric-def">Across your connected account</span></div>
        <div className="metric"><span className="metric-top"><TrendingUp size={18} className="metric-icon" aria-hidden /><span className="metric-label">Accounts reached</span></span><span className="metric-value">{fmtNum(data.reach28)}</span><span className="metric-def">Unique accounts, last 28 days</span></div>
        <div className="metric"><span className="metric-top"><Sparkles size={18} className="metric-icon" aria-hidden /><span className="metric-label">Engagement rate</span></span><span className="metric-value">{data.engagementRate}%</span><span className="metric-def">Likes, comments, saves and shares per reach</span></div>
        <div className="metric"><span className="metric-top"><Target size={18} className="metric-icon" aria-hidden /><span className="metric-label">Matches your target</span></span><span className="metric-value">{data.matchShare}%</span><span className="metric-def">Of new followers fit your Grow audience</span></div>
      </div>

      <section className="card au-personas" aria-labelledby="au-p">
        <div className="card-head">
          <h2 id="au-p"><Sparkles size={18} aria-hidden /> Your audience personas</h2>
          <Badge tone="accent">AI estimate</Badge>
        </div>
        <p className="muted small">Groups of followers who behave alike, based on what they engage with and ask you. They describe groups, not individual people.</p>
        <div className="au-share" aria-label="Share of your audience per persona">
          {data.personas.map((p) => <span key={p.id} style={{ width: `${p.share}%`, background: p.color }} title={`${p.name}: ${p.share}%`} />)}
          <span className="rest" style={{ width: `${100 - data.personas.reduce((t, p) => t + p.share, 0)}%` }} title="Other" />
        </div>
        <div className="au-persona-grid">
          {data.personas.map((p) => (
            <article key={p.id} className={`au-persona ${open === p.id ? 'open' : ''}`}>
              <div className="au-persona-head">
                <span className="au-dot" style={{ background: p.color }} aria-hidden />
                <div>
                  <strong>{p.name}</strong>
                  <span className="muted small">{p.share}% of your audience · {p.age} · {p.where}</span>
                </div>
              </div>
              <p className="small">{p.summary}</p>
              <dl className="au-facts">
                <div><dt><Lightbulb size={14} aria-hidden /> Best content</dt><dd>{p.bestContent}</dd></div>
                <div><dt><Clock size={14} aria-hidden /> Most active</dt><dd>{p.bestTime}</dd></div>
              </dl>
              {open === p.id ? (
                <>
                  <h3 className="au-sub">What they care about</h3>
                  <ul className="au-list">{p.cares.map((c) => <li key={c}>{c}</li>)}</ul>
                  <h3 className="au-sub"><MessageCircle size={14} aria-hidden /> What they ask you</h3>
                  <ul className="au-list quotes">{p.asks.map((c) => <li key={c}>{c}</li>)}</ul>
                </>
              ) : (
                <button className="link-btn" onClick={() => setOpen(p.id)}>Show details</button>
              )}
              <div className="row gap-sm wrap au-actions">
                <button className="btn btn-sm btn-primary" onClick={() => planPost(p)}><CalendarPlus size={14} /> Plan a post for them</button>
                <button className="btn btn-sm btn-secondary" onClick={() => addTopic(p.topic)}><Plus size={14} /> Add “{p.topic}” to Grow</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <div className="au-grid">
        <section className="card" aria-labelledby="au-age">
          <div className="card-head">
            <h2 id="au-age">Age and gender</h2>
            <span className="au-legend"><i className="w" /> Women {women}% <i className="m" /> Men {men}%</span>
          </div>
          <div className="au-ages" role="table" aria-label="Followers by age and gender">
            {data.ages.map((a) => (
              <div key={a.band} className="au-age" role="row">
                <span className="au-age-label" role="rowheader">{a.band}</span>
                <span className="au-bars" role="cell">
                  <span className="w" style={{ width: `${(a.women / maxAge) * 100}%` }} title={`${a.band}, women: ${a.women}%`}><em>{a.women}%</em></span>
                  <span className="m" style={{ width: `${(a.men / maxAge) * 100}%` }} title={`${a.band}, men: ${a.men}%`}><em>{a.men}%</em></span>
                </span>
              </div>
            ))}
          </div>
          <p className="muted xsmall">Share of followers. Instagram shows these groups only; people who didn’t share an age or gender aren’t counted.</p>
        </section>

        <section className="card" aria-labelledby="au-loc">
          <h2 id="au-loc"><MapPin size={18} aria-hidden /> Where they are</h2>
          <h3 className="au-sub">Top cities</h3>
          <ul className="hbars">
            {data.cities.map((c) => (
              <li key={c.name} title={`${c.name}: ${c.share}%`}>
                <span className="hbar-label">{c.name}</span>
                <span className="hbar-track"><span className="hbar-fill" style={{ width: `${(c.share / data.cities[0].share) * 100}%` }} /></span>
                <span className="hbar-value">{pct(c.share)}</span>
              </li>
            ))}
          </ul>
          <h3 className="au-sub">Top countries</h3>
          <div className="au-chips">{data.countries.map((c) => <span key={c.name} className="chip-static">{c.name} · {c.share}%</span>)}</div>
        </section>
      </div>

      <section className="card" aria-labelledby="au-time">
        <div className="card-head">
          <h2 id="au-time"><Clock size={18} aria-hidden /> When they’re online</h2>
          <span className="small">Best moments: <strong>{DAYS[best[0].d]} {SLOTS[best[0].s]}</strong> and <strong>{DAYS[best[1].d]} {SLOTS[best[1].s]}</strong></span>
        </div>
        <div className="au-heat" role="table" aria-label="Follower activity by day and time">
          <span />
          {SLOTS.map((s) => <span key={s} className="au-heat-h" role="columnheader">{s}</span>)}
          {data.activity.map((row, d) => (
            <Fragment key={DAYS[d]}>
              <span className="au-heat-h left" role="rowheader">{DAYS[d]}</span>
              {row.map((v, s) => (
                <span key={s} role="cell" className="au-cell" style={{ ['--a' as string]: (0.08 + (v / 100) * 0.92).toFixed(2) }} title={`${DAYS[d]} ${SLOTS[s]}: ${v}% of peak activity`} aria-label={`${DAYS[d]} ${SLOTS[s]}: ${v}% of peak`} />
              ))}
            </Fragment>
          ))}
        </div>
        <p className="muted xsmall">Darker means more of your followers are online. Relative to your busiest moment.</p>
      </section>

      <div className="au-grid">
        <section className="card" aria-labelledby="au-fmt">
          <h2 id="au-fmt">What works: formats</h2>
          <div className="au-table-wrap"><table className="table au-table">
            <thead><tr><th scope="col">Format</th><th scope="col">Reach</th><th scope="col">Saves</th><th scope="col">Starts DMs</th></tr></thead>
            <tbody>
              {data.formats.map((f) => (
                <tr key={f.format}>
                  <th scope="row">{f.format}</th>
                  {[f.reach, f.saves, f.dms].map((v, i) => (
                    <td key={i}>{f.format === 'Story' && i === 1 ? <span className="muted xsmall">n/a</span> : <span className={`au-mini ${v === 100 ? 'best' : ''}`} title={v === 100 ? 'Best' : `${v}`}><span style={{ width: `${v}%` }} /></span>}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table></div>
          <p className="muted xsmall">Compared with your best format per column (= 100). Green = best.</p>
        </section>

        <section className="card" aria-labelledby="au-top">
          <div className="card-head">
            <h2 id="au-top">What works: topics</h2>
            <span className="au-legend"><i className="eng" /> Engagement <i className="lead" /> Leads</span>
          </div>
          <div className="au-topics">
            {data.topics.map((t) => (
              <div key={t.topic} className="au-topic" title={`${t.topic}: engagement ${t.engagement}, leads ${t.leads} (best = 100)`}>
                <span className="au-topic-label">{t.topic}</span>
                <span className="au-pair">
                  <span className="eng" style={{ width: `${t.engagement}%` }} />
                  <span className="lead" style={{ width: `${t.leads}%` }} />
                </span>
              </div>
            ))}
          </div>
          <p className="muted xsmall">Leads = conversations that reached Qualified. Compared with your best topic (= 100).</p>
        </section>
      </div>

      <div className="au-grid">
        <section className="card" aria-labelledby="au-posts">
          <h2 id="au-posts">Top posts</h2>
          <ul className="au-posts">
            {data.topPosts.map((p, i) => (
              <li key={p.title}>
                <span className="au-rank">{i + 1}</span>
                <div><strong>{p.title}</strong><span className="muted xsmall">{p.format}</span></div>
                <dl>
                  <div><dt>Reach</dt><dd>{fmtNum(p.reach)}</dd></div>
                  <div><dt>Saves</dt><dd>{fmtNum(p.saves)}</dd></div>
                  <div><dt>Conversations</dt><dd>{p.conversations}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
        </section>

        <section className="card au-recs" aria-labelledby="au-recs">
          <h2 id="au-recs"><Lightbulb size={18} aria-hidden /> What to do next</h2>
          <ul>
            {data.recommendations.map((r) => (
              <li key={r.title}>
                <span className="au-rec-icon" aria-hidden>{r.action === 'flow' ? <Workflow size={18} /> : r.action === 'topic' ? <Target size={18} /> : <Clock size={18} />}</span>
                <div>
                  <strong>{r.title}</strong>
                  <p className="small muted">{r.body}</p>
                  <button className="btn btn-sm btn-soft" onClick={() => runRec(r)}>{r.action === 'flow' ? 'Create Lead Flow' : r.action === 'topic' ? 'Add to Grow' : 'Open Planner'}</button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="au-note"><ShieldCheck size={16} aria-hidden /> Based on Instagram Insights (aggregated, available from 100 followers), your conversations and your Grow results. We never profile individual people or guess sensitive traits. <Info size={14} aria-hidden /> Demo data.</p>
    </>
  );
}
