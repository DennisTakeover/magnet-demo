import { useMemo, useState } from 'react';
import {
  AlertCircle, ArrowRight, CalendarPlus, CheckCircle2, Clock, Inbox as InboxIcon, MessageCircle, Plus, Search, Sparkles, Target, Trophy, Users,
} from 'lucide-react';
import { clientLog, navigate, uid, usePersona, useStore } from '../store';
import UpgradeHint from '../components/UpgradeHint';
import { t } from '../i18n/locale';
import { Avatar, CLOSED_REASONS, Field, LEAD_STATUSES, LeadBadge, Modal, PageHeader, Segmented, dateTime, leadLabel, timeAgo } from '../components/ui';
import type { ClosedReason, Lead, LeadStatus, State } from '../types';

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const COLORS = ['#2855F8', '#12805C', '#6A3FC4', '#E1622C', '#0E7490', '#A35A00', '#B4235A'];
const colorFor = (name: string) => COLORS[[...name].reduce((t, c) => t + c.charCodeAt(0), 0) % COLORS.length];
const created = (l: Lead) => l.createdAt ?? l.updatedAt;
const isOpen = (l: Lead) => l.status !== 'closed';
const sourceGroup = (s: string) => {
  const head = s.split('·')[0].trim();
  if (/^Lead Flow/i.test(head)) return 'Lead Flow';
  if (/^Grow/i.test(head)) return 'Grow';
  if (/Story/i.test(head)) return 'Story reply';
  if (/Comment/i.test(head)) return 'Comment';
  if (/Referral/i.test(head)) return 'Referral';
  return 'Direct message';
};

export interface Attention {
  lead: Lead;
  reason: string;
  tone: 'red' | 'amber' | 'blue';
  rank: number;
}

/** Why a lead needs you now. Rules are simple and visible, so the owner can trust the list. */
export function attentionFor(l: Lead, now = Date.now()): Attention | null {
  if (!isOpen(l)) return null;
  const idle = now - l.updatedAt;
  const openTask = l.tasks.find((x) => !x.done);
  if (idle > 3 * DAY) return { lead: l, reason: `No update in ${Math.floor(idle / DAY)} days`, tone: 'red', rank: 0 };
  if (l.status === 'new') return { lead: l, reason: 'New: reply first', tone: 'blue', rank: 1 };
  if (openTask) return { lead: l, reason: `Open task: ${openTask.text}`, tone: 'amber', rank: 2 };
  if (l.status === 'qualified' && idle > DAY) return { lead: l, reason: 'Qualified: waiting for the next step', tone: 'amber', rank: 3 };
  return null;
}

export default function Leads({ openId }: { openId?: string }) {
  const { state } = useStore();
  const persona = usePersona();
  const [q, setQ] = useState('');
  const [view, setView] = useState<'board' | 'list'>('board');
  const [source, setSource] = useState('all');
  const [onlyAttention, setOnlyAttention] = useState(false);
  const now = Date.now();
  const attention = useMemo(() => state.leads.map((l) => attentionFor(l, now)).filter(Boolean) as Attention[], [state.leads, now]);
  const attnIds = new Set(attention.map((a) => a.lead.id));
  const sources = Array.from(new Set(state.leads.map((l) => sourceGroup(l.source))));
  const leads = state.leads.filter((l) =>
    (!q || `${l.name} ${l.handle} ${l.source} ${l.nextAction}`.toLowerCase().includes(q.toLowerCase())) &&
    (source === 'all' || sourceGroup(l.source) === source) &&
    (!onlyAttention || attnIds.has(l.id)));
  const open = state.leads.find((l) => l.id === openId);

  return (
    <>
      <PageHeader title={t('leads.title')} subtitle={t('leads.sub')} />

      <LeadDashboard state={state} attention={attention} stage4Plural={persona.stage4Plural} />
      <UpgradeHint
        module="comments"
        context="leads"
        title="Be seen where your next leads already are"
        body="Comments drafts a useful comment for posts on accounts your ideal customers follow. You approve every comment."
        limits="up to 15 a day"
        caveat="Automatic posting isn’t available yet: you copy an approved comment and post it yourself."
        example={[{ label: 'Target account', value: '@example.studio (similar audience)' }, { label: 'Draft', value: '“Great point on pricing. Do you test it with a small group first?”' }, { label: 'Status', value: 'Approved · post it yourself' }]}
      />

      <div className="leads-toolbar" role="toolbar" aria-label="Lead view options">
        <Segmented label="View" value={view} onChange={setView} options={[{ id: 'board', label: 'Board' }, { id: 'list', label: 'List' }]} />
        <div className="search">
          <Search size={18} aria-hidden />
          <label className="sr-only" htmlFor="lead-q">Search leads</label>
          <input id="lead-q" placeholder="Search leads" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <label>
          <span className="sr-only">Source</span>
          <select aria-label="Filter by source" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="all">All sources</option>
            {sources.map((s) => <option key={s}>{s}</option>)}
          </select>
        </label>
        <label className="check attn-toggle">
          <input type="checkbox" checked={onlyAttention} onChange={(e) => setOnlyAttention(e.target.checked)} /> Needs attention only
        </label>
        <span className="muted small leads-count">{leads.length} of {state.leads.length} leads</span>
      </div>

      {view === 'board' ? <Board leads={leads} attnIds={attnIds} /> : <LeadList leads={leads} attention={attention} />}
      {open && <LeadDrawer key={open.id} id={open.id} />}
    </>
  );
}

/* ───────────── Dashboard ───────────── */

function LeadDashboard({ state, attention, stage4Plural }: { state: State; attention: Attention[]; stage4Plural: string }) {
  const now = Date.now();
  const all = state.leads;
  const openLeads = all.filter(isOpen);
  const newWeek = all.filter((l) => now - created(l) < 7 * DAY).length;
  const newPrevWeek = all.filter((l) => now - created(l) >= 7 * DAY && now - created(l) < 14 * DAY).length;
  const booked = all.filter((l) => l.status === 'booked').length;
  const won = all.filter((l) => l.status === 'closed' && l.closedReason === 'won').length;
  const closed = all.filter((l) => l.status === 'closed').length;
  const qualifiedPlus = all.filter((l) => l.status === 'qualified' || l.status === 'booked' || (l.status === 'closed' && l.closedReason === 'won')).length;
  const ages = openLeads.map((l) => (now - created(l)) / DAY).sort((a, b) => a - b);
  const medianAge = ages.length ? ages[Math.floor(ages.length / 2)] : null;

  const stages = LEAD_STATUSES.map((s) => ({ ...s, n: all.filter((l) => l.status === s.id).length }));
  const maxStage = Math.max(1, ...stages.map((s) => s.n));

  const bySource = Object.entries(all.reduce<Record<string, { n: number; won: number; q: number }>>((acc, l) => {
    const g = sourceGroup(l.source);
    acc[g] ??= { n: 0, won: 0, q: 0 };
    acc[g].n++;
    if (l.status === 'closed' && l.closedReason === 'won') acc[g].won++;
    if (['qualified', 'booked'].includes(l.status) || (l.status === 'closed' && l.closedReason === 'won')) acc[g].q++;
    return acc;
  }, {})).sort((a, b) => b[1].n - a[1].n);
  const maxSource = Math.max(1, ...bySource.map(([, v]) => v.n));

  const weeks = Array.from({ length: 6 }, (_, i) => {
    const end = now - (5 - i) * 7 * DAY;
    const n = all.filter((l) => created(l) <= end && created(l) > end - 7 * DAY).length;
    return { label: i === 5 ? 'This week' : `${5 - i}w ago`, n };
  });
  const maxWeek = Math.max(1, ...weeks.map((w) => w.n));
  const focus = [...attention].sort((a, b) => a.rank - b.rank || a.lead.updatedAt - b.lead.updatedAt).slice(0, 5);
  const delta = newWeek - newPrevWeek;

  return (
    <section className="lead-dash" aria-label="Lead overview">
      <div className="metric-grid">
        <div className="metric">
          <div className="metric-top"><Users size={18} className="metric-icon" aria-hidden /><span className="metric-label">Open leads</span></div>
          <span className="metric-value">{openLeads.length}</span>
          <span className="metric-def">{newWeek} new this week{delta !== 0 && <> · <span className={delta > 0 ? 'up' : 'down'}>{delta > 0 ? '+' : ''}{delta} vs last week</span></>}</span>
        </div>
        <div className="metric">
          <div className="metric-top"><AlertCircle size={18} className="metric-icon" aria-hidden /><span className="metric-label">Need your attention</span></div>
          <span className="metric-value">{attention.length}</span>
          <span className="metric-def">New, waiting on a task or quiet for 3+ days</span>
        </div>
        <div className="metric">
          <div className="metric-top"><Target size={18} className="metric-icon" aria-hidden /><span className="metric-label">{stage4Plural}</span></div>
          <span className="metric-value">{booked}</span>
          <span className="metric-def">{all.length ? Math.round((qualifiedPlus / all.length) * 100) : 0}% of all leads reached Qualified or further</span>
        </div>
        <div className="metric">
          <div className="metric-top"><Trophy size={18} className="metric-icon" aria-hidden /><span className="metric-label">Won</span></div>
          <span className="metric-value">{won}</span>
          <span className="metric-def">{closed ? `${Math.round((won / closed) * 100)}% of ${closed} closed leads` : 'No closed leads yet'}{medianAge != null ? ` · open leads are ${medianAge < 1 ? '<1' : Math.round(medianAge)} days old (median)` : ''}</span>
        </div>
      </div>

      <div className="lead-dash-grid">
        <section className="card focus-card" aria-labelledby="focus-h">
          <div className="card-head">
            <h2 id="focus-h"><Sparkles size={18} aria-hidden /> Today’s focus</h2>
            <span className="muted small">{attention.length} need you</span>
          </div>
          {focus.length === 0 ? (
            <p className="muted small"><CheckCircle2 size={14} aria-hidden /> You’re up to date. Nothing waiting on you.</p>
          ) : (
            <ul className="focus-list">
              {focus.map((a) => (
                <li key={a.lead.id}>
                  <Avatar name={a.lead.name} color={colorFor(a.lead.name)} size={34} />
                  <div className="focus-text">
                    <a href={`#/app/leads/${a.lead.id}`}><strong>{a.lead.name}</strong></a>
                    <span className={`reason reason-${a.tone}`}>{a.reason}</span>
                    <span className="muted xsmall">Next: {a.lead.nextAction}</span>
                  </div>
                  <div className="focus-actions">
                    {a.lead.conversationId && <a className="btn btn-sm btn-secondary" href={`#/app/inbox/${a.lead.conversationId}`} aria-label={`Reply to ${a.lead.name}`}><MessageCircle size={14} /> Reply</a>}
                    <a className="btn btn-sm btn-ghost" href={`#/app/leads/${a.lead.id}`} aria-label={`Open ${a.lead.name}`}><ArrowRight size={14} /></a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card" aria-labelledby="stage-h">
          <h2 id="stage-h">Pipeline by stage</h2>
          <ul className="hbars" aria-label="Number of leads per stage">
            {stages.map((s) => (
              <li key={s.id} title={`${s.label}: ${s.n} lead${s.n === 1 ? '' : 's'}`}>
                <span className="hbar-label">{s.label}</span>
                <span className="hbar-track"><span className="hbar-fill" style={{ width: `${(s.n / maxStage) * 100}%` }} /></span>
                <span className="hbar-value">{s.n}</span>
              </li>
            ))}
          </ul>
          <p className="muted xsmall">Current stage of every lead. A link sent is not a booking; only confirmed events count.</p>
        </section>

        <section className="card" aria-labelledby="src-h">
          <h2 id="src-h">Where leads come from</h2>
          <ul className="hbars" aria-label="Leads per source">
            {bySource.map(([name, v]) => (
              <li key={name} title={`${name}: ${v.n} leads, ${v.q} qualified or further, ${v.won} won`}>
                <span className="hbar-label">{name}</span>
                <span className="hbar-track"><span className="hbar-fill" style={{ width: `${(v.n / maxSource) * 100}%` }} /></span>
                <span className="hbar-value">{v.n}<span className="muted xsmall"> · {v.q} qual.</span></span>
              </li>
            ))}
          </ul>
          <p className="muted xsmall">“qual.” = reached Qualified or further.</p>
        </section>

        <section className="card trend-card" aria-labelledby="trend-h">
          <h2 id="trend-h">New leads per week</h2>
          <div className="cols" role="img" aria-label={`New leads per week: ${weeks.map((w) => `${w.label} ${w.n}`).join(', ')}`}>
            {weeks.map((w) => (
              <div key={w.label} className="col" title={`${w.label}: ${w.n} new lead${w.n === 1 ? '' : 's'}`}>
                <span className="col-value">{w.n}</span>
                <span className="col-bar" style={{ height: `${Math.max(3, (w.n / maxWeek) * 100)}%` }} />
                <span className="col-label">{w.label}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </section>
  );
}

/* ───────────── Board & list ───────────── */

function LeadCard({ l, flagged }: { l: Lead; flagged: boolean }) {
  const openTasks = l.tasks.filter((x) => !x.done).length;
  return (
    <a href={`#/app/leads/${l.id}`} className={`lead-card ${flagged ? 'flagged' : ''}`}>
      <span className="lead-card-top">
        <Avatar name={l.name} color={colorFor(l.name)} size={28} />
        <strong>{l.name}</strong>
        {flagged && <span className="attn-dot" title="Needs your attention" aria-label="Needs your attention" />}
      </span>
      <span className="source-chip">{l.source}</span>
      {l.closedReason && <LeadBadge status={l.status} reason={l.closedReason} />}
      <span className="lead-next small">Next: {l.nextAction}</span>
      <span className="muted xsmall">Updated {timeAgo(l.updatedAt)}{openTasks ? ` · ${openTasks} open task${openTasks > 1 ? 's' : ''}` : ''}</span>
    </a>
  );
}

function Board({ leads, attnIds }: { leads: Lead[]; attnIds: Set<string> }) {
  return (
    <div className="pipeline">
      {LEAD_STATUSES.map((s) => {
        const col = leads.filter((l) => l.status === s.id).sort((a, b) => b.updatedAt - a.updatedAt);
        return (
          <section key={s.id} className="pipe-col" aria-labelledby={`col-${s.id}`}>
            <h2 id={`col-${s.id}`}>{s.label} <span className="muted">{col.length}</span></h2>
            {col.map((l) => <LeadCard key={l.id} l={l} flagged={attnIds.has(l.id)} />)}
            {col.length === 0 && <p className="muted small pad">No leads</p>}
          </section>
        );
      })}
    </div>
  );
}

type SortKey = 'updated' | 'created' | 'name' | 'stage';

function LeadList({ leads, attention }: { leads: Lead[]; attention: Attention[] }) {
  const [sort, setSort] = useState<SortKey>('updated');
  const order = LEAD_STATUSES.map((s) => s.id);
  const rows = [...leads].sort((a, b) =>
    sort === 'name' ? a.name.localeCompare(b.name) : sort === 'stage' ? order.indexOf(a.status) - order.indexOf(b.status) : sort === 'created' ? created(b) - created(a) : b.updatedAt - a.updatedAt);
  const attn = new Map(attention.map((a) => [a.lead.id, a]));
  const th = (k: SortKey, label: string) => (
    <th aria-sort={sort === k ? 'descending' : 'none'}><button className="th-sort" onClick={() => setSort(k)}>{label}{sort === k ? ' ↓' : ''}</button></th>
  );
  return (
    <section className="card table-card">
      <table className="table lead-table">
        <thead><tr>{th('name', 'Lead')}{th('stage', 'Stage')}<th>Source</th><th>Next action</th><th>Attention</th>{th('created', 'Became lead')}{th('updated', 'Last update')}</tr></thead>
        <tbody>
          {rows.map((l) => {
            const a = attn.get(l.id);
            return (
              <tr key={l.id} className="clickable" onClick={() => navigate(`/app/leads/${l.id}`)}>
                <td><span className="row gap-sm"><Avatar name={l.name} color={colorFor(l.name)} size={28} /><span><a href={`#/app/leads/${l.id}`} onClick={(e) => e.stopPropagation()}><strong>{l.name}</strong></a><div className="muted xsmall">{l.handle}</div></span></span></td>
                <td><LeadBadge status={l.status} reason={l.closedReason} /></td>
                <td className="small">{l.source}</td>
                <td className="small">{l.nextAction}</td>
                <td>{a ? <span className={`reason reason-${a.tone}`}>{a.reason}</span> : <span className="muted small">—</span>}</td>
                <td className="small">{timeAgo(created(l))}</td>
                <td className="small">{timeAgo(l.updatedAt)}</td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><td colSpan={7} className="muted">No leads match these filters.</td></tr>}
        </tbody>
      </table>
    </section>
  );
}

/* ───────────── Lead detail ───────────── */

function LeadDrawer({ id }: { id: string }) {
  const { state, update, toast } = useStore();
  const persona = usePersona();
  const lead = state.leads.find((l) => l.id === id)!;
  const [task, setTask] = useState('');
  const [note, setNote] = useState(lead.note ?? '');
  const close = () => navigate('/app/leads');
  const conv = state.conversations.find((c) => c.id === lead.conversationId);
  const lastMsg = conv ? [...conv.messages].reverse().find((m) => m.from === 'contact') : undefined;
  const timeline = state.activity.filter((a) => a.clientId === 'c1' && a.action.includes(lead.name)).sort((a, b) => b.time - a.time).slice(0, 8);
  const attn = attentionFor(lead);

  const change = (fn: (l: typeof lead) => void, log: string) =>
    update((d) => {
      const l = d.leads.find((x) => x.id === id)!;
      fn(l);
      l.updatedAt = Date.now();
      clientLog(d, 'lead', log);
    });

  const setStatus = (status: LeadStatus) => {
    if (status === lead.status) return;
    change((l) => {
      l.status = status;
      if (status !== 'closed') l.closedReason = undefined;
      else l.closedReason = l.closedReason ?? 'won';
    }, `Set ${lead.name} to ${leadLabel(status)}`);
    toast(`${lead.name} moved to ${leadLabel(status)}`);
  };
  const stageIdx = LEAD_STATUSES.findIndex((s) => s.id === lead.status);

  return (
    <Modal title={lead.name} onClose={close} wide>
      <div className="lead-detail">
        <div className="lead-head">
          <Avatar name={lead.name} color={colorFor(lead.name)} size={44} />
          <div>
            <p className="muted small">{lead.handle} · {lead.source}</p>
            {attn && <span className={`reason reason-${attn.tone}`}>{attn.reason}</span>}
          </div>
        </div>

        <ol className="stage-stepper" aria-label="Stage">
          {LEAD_STATUSES.map((s, i) => (
            <li key={s.id}>
              <button className={i < stageIdx ? 'done' : i === stageIdx ? 'now' : ''} aria-current={i === stageIdx ? 'step' : undefined} onClick={() => setStatus(s.id)}>
                {s.label}
              </button>
            </li>
          ))}
        </ol>

        <div className="lead-detail-grid">
          <div>
            <div className="grid-2">
              <Field label="Status">
                <select value={lead.status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
                  {LEAD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </Field>
              {lead.status === 'closed' && (
                <Field label="Outcome">
                  <select value={lead.closedReason} onChange={(e) => change((l) => void (l.closedReason = e.target.value as ClosedReason), `Set outcome for ${lead.name}`)}>
                    {CLOSED_REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </Field>
              )}
            </div>
            <Field label="Next action">
              <input defaultValue={lead.nextAction} onBlur={(e) => e.target.value !== lead.nextAction && change((l) => void (l.nextAction = e.target.value), `Updated next action for ${lead.name}`)} />
            </Field>

            <h3>Tasks</h3>
            <ul className="task-list">
              {lead.tasks.map((t) => (
                <li key={t.id}>
                  <label>
                    <input type="checkbox" checked={t.done} onChange={() => change((l) => { const x = l.tasks.find((y) => y.id === t.id)!; x.done = !x.done; }, `Updated task for ${lead.name}`)} />
                    <span className={t.done ? 'done' : ''}>{t.text}</span>
                  </label>
                </li>
              ))}
              {lead.tasks.length === 0 && <li className="muted small">No tasks yet.</li>}
            </ul>
            <form
              className="row gap-sm"
              onSubmit={(e) => {
                e.preventDefault();
                if (!task.trim()) return;
                change((l) => void l.tasks.push({ id: uid('t'), text: task.trim(), done: false }), `Added task for ${lead.name}`);
                setTask('');
                toast('Task added');
              }}
            >
              <label className="sr-only" htmlFor="newtask">New task</label>
              <input id="newtask" placeholder="Add a task" value={task} onChange={(e) => setTask(e.target.value)} />
              <button className="btn btn-secondary" type="submit"><Plus size={16} /> Add task</button>
            </form>

            <Field label="Private note" hint="Only visible to you and your team">
              <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (lead.note ?? '') && change((l) => void (l.note = note), `Updated note for ${lead.name}`)} />
            </Field>
          </div>

          <aside className="lead-side">
            <dl className="kv compact">
              <dt>Became lead</dt><dd>{dateTime(created(lead))}</dd>
              <dt>Last update</dt><dd>{timeAgo(lead.updatedAt)}</dd>
              <dt>Source</dt><dd>{lead.source}</dd>
            </dl>
            {lastMsg && (
              <div className="last-msg">
                <span className="muted xsmall"><InboxIcon size={12} aria-hidden /> Last message from {lead.name.split(' ')[0]} · {lastMsg.time}</span>
                <p className="small">“{lastMsg.text.length > 140 ? lastMsg.text.slice(0, 140) + '…' : lastMsg.text}”</p>
              </div>
            )}
            <h3 className="small">Timeline</h3>
            <ul className="timeline">
              {timeline.map((a) => <li key={a.id}><Clock size={12} aria-hidden /> <span className="small">{a.action}</span><span className="muted xsmall"> · {timeAgo(a.time)}</span></li>)}
              <li><Clock size={12} aria-hidden /> <span className="small">Became a lead via {lead.source}</span><span className="muted xsmall"> · {timeAgo(created(lead))}</span></li>
            </ul>
          </aside>
        </div>

        <div className="row gap-sm wrap mt">
          {lead.conversationId && (
            <a className="btn btn-primary" href={`#/app/inbox/${lead.conversationId}`}><MessageCircle size={16} /> Open conversation</a>
          )}
          {lead.status !== 'booked' && lead.status !== 'closed' && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                change((l) => {
                  l.status = 'booked';
                  l.nextAction = persona.afterEventAction;
                }, `${persona.stage4} for ${lead.name} (demo event)`);
                toast(`${persona.stage4} (demo event). Moved to ${persona.stage4}.`);
              }}
            >
              <CalendarPlus size={16} /> {persona.eventButton}
            </button>
          )}
        </div>
        <p className="muted xsmall mt">Sending a link is not the same as {persona.stage4.toLowerCase()}. Only a confirmed event moves a lead to {persona.stage4}.</p>
      </div>
    </Modal>
  );
}

