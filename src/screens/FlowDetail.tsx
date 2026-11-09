import { Fragment, useState } from 'react';
import { ArrowLeft, Pause, Pencil, Play, Repeat, UserRoundCheck, Zap } from 'lucide-react';
import { usePersona, useStore } from '../store';
import { can } from '../team';
import { clientActor } from '../seed';
import { contactRepliesToFlow, demoContacts, pauseFlow, runLiveEvent, tryActivate } from '../flowEngine';
import { Empty, ExecBadge, FlowStatusBadge, PageHeader, Segmented, dateTime } from '../components/ui';
import type { ExecutionStatus } from '../types';

export default function FlowDetail({ id }: { id: string }) {
  const { state, update, toast, queueAutoReply } = useStore();
  const [lastEvent, setLastEvent] = useState<{ eventId: string; contactIndex: number } | null>(null);
  const [filter, setFilter] = useState<'all' | ExecutionStatus>('all');
  const [openExec, setOpenExec] = useState<string | null>(null);
  const flow = state.flows.find((f) => f.id === id);
  const contacts = demoContacts(state.persona);
  const persona = usePersona();
  if (!flow) return <Empty title="Flow not found" action={<a href="#/app/flows">Back to Lead Flows</a>} />;

  const post = state.posts.find((p) => p.id === flow.trigger.postId);
  const execs = state.executions.filter((e) => e.flowId === id);
  const shown = filter === 'all' ? execs : execs.filter((e) => e.status === filter);
  const s = flow.stats;
  const live = flow.status === 'active' || flow.status === 'waiting_for_post';

  const fire = (contactIndex: number, eventId: string) => {
    let res: ReturnType<typeof runLiveEvent> = { status: 'Ignored', message: '' };
    update((d) => {
      res = runLiveEvent(d, id, contactIndex, eventId);
    });
    setLastEvent({ eventId, contactIndex });
    const tone = res.status === 'Sent' || res.status === 'Waiting for interaction' ? 'success' : 'info';
    toast(res.message, tone, res.conversationId ? { label: 'Open in Inbox', href: `/app/inbox/${res.conversationId}` } : undefined);
    if (res.willReply && res.conversationId) {
      const convId = res.conversationId;
      window.setTimeout(() => {
        update((d) => contactRepliesToFlow(d, convId, contactIndex));
        toast(`${contacts[contactIndex].name} replied in Inbox`, 'info', { label: 'Open', href: `/app/inbox/${convId}` });
        if (state.aiMode === 'auto') queueAutoReply(convId);
      }, 3000);
    }
  };

  const demoContactsUsed = new Set(execs.map((e) => e.contactName));
  const nextIndex = Math.max(0, contacts.findIndex((c) => !demoContactsUsed.has(c.name)));
  const kwLabel = flow.trigger.keyword;

  const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : '—');

  return (
    <>
      <a href="#/app/flows" className="back-link"><ArrowLeft size={16} /> Lead Flows</a>
      <PageHeader
        title={flow.name}
        subtitle={
          <>
            <FlowStatusBadge status={flow.status} /> <span className="muted small">Version {flow.version} · {flow.trigger.type === 'comment' ? `Comment “${kwLabel}” on “${post?.title}”` : `DM “${kwLabel}”`}</span>
          </>
        }
        actions={
          <>
            <a className="btn btn-secondary" href={`#/app/flows/${id}/edit`}><Pencil size={16} /> Edit</a>
            {live ? (
              <button className="btn btn-secondary" onClick={() => { update((d) => pauseFlow(d, id, { name: clientActor(d), role: 'client' })); toast(`"${flow.name}" paused. Pending steps were stopped.`, 'info'); }}>
                <Pause size={16} /> Pause
              </button>
            ) : (
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (!can(state, 'manageFlows')) return toast('Only people with Lead Flow access can switch flows on or off.', 'warning');
                  let res = { ok: false, message: '' };
                  update((d) => { res = tryActivate(d, id, { name: clientActor(d), role: 'client' }); });
                  toast(res.message, res.ok ? 'success' : 'warning');
                }}
              >
                <Play size={16} /> Activate
              </button>
            )}
          </>
        }
      />

      {flow.status === 'waiting_for_post' && (
        <div className="banner banner-blue">This flow becomes active once “{post?.title}” is published and has a post ID. <a href={`#/app/planner/${post?.id}`}>Open in Planner</a></div>
      )}

      <section className="card" aria-labelledby="results">
        <div className="card-head">
          <h2 id="results">Results</h2>
          <span className="muted small">Sample data, all time</span>
        </div>
        <div className="stat-grid">
          <div className="stat"><span className="stat-value">{s.requesters}</span><span className="stat-label">Unique requesters</span></div>
          <div className="stat"><span className="stat-value">{s.sent}</span><span className="stat-label">Successful sends</span><span className="stat-sub">{s.sent} / {s.requesters} requesters</span></div>
          <div className="stat"><span className="stat-value">{s.replied}</span><span className="stat-label">Contacts who replied</span><span className="stat-sub">{pct(s.replied, s.sent)} · {s.replied} / {s.sent} sent</span></div>
          <div className="stat"><span className="stat-value">{s.clicks}</span><span className="stat-label">Known link clickers</span><span className="stat-sub">{pct(s.clicks, s.sent)} · {s.clicks} / {s.sent} sent. Not downloads.</span></div>
          <div className="stat"><span className="stat-value">{s.emails ?? '—'}</span><span className="stat-label">Emails given</span><span className="stat-sub">{s.emails === null ? 'Not collected in this flow' : `${s.emails} / ${s.replied} replied`}</span></div>
          <div className="stat"><span className="stat-value">{s.qualified}</span><span className="stat-label">Qualified leads</span></div>
          <div className="stat"><span className="stat-value">{s.booked}</span><span className="stat-label">{persona.stage4Plural}</span></div>
        </div>
        <p className="muted small">Sent, delivered, clicked and qualified are different events. Unknown delivery status is shown as unknown.</p>
      </section>

      <section className="card live-demo" aria-labelledby="livedemo">
        <div className="card-head">
          <h2 id="livedemo"><Zap size={18} aria-hidden /> Try it live (demo)</h2>
        </div>
        <p className="muted small">Simulate what happens when someone uses your keyword. The result appears in the log below and in Inbox.</p>
        <div className="row gap-sm wrap">
          <button className="btn btn-primary" onClick={() => fire(nextIndex, `evt_${Date.now()}`)}>
            Simulate {flow.trigger.type === 'comment' ? 'comment' : 'DM'} “{kwLabel}” from {contacts[nextIndex].name}
          </button>
          <button className="btn btn-secondary" disabled={!lastEvent} onClick={() => lastEvent && fire(lastEvent.contactIndex, lastEvent.eventId)}>
            <Repeat size={16} /> Deliver the same event again
          </button>
          <button className="btn btn-secondary" disabled={!lastEvent} onClick={() => lastEvent && fire(lastEvent.contactIndex, `evt_${Date.now()}`)}>
            <UserRoundCheck size={16} /> Same person asks again
          </button>
        </div>
      </section>

      <section className="card" aria-labelledby="log">
        <div className="card-head">
          <h2 id="log">Execution log</h2>
          <Segmented label="Filter log" value={filter} onChange={setFilter} options={[{ id: 'all', label: 'All' }, { id: 'Sent', label: 'Sent' }, { id: 'Waiting for interaction', label: 'Waiting' }, { id: 'Suppressed', label: 'Suppressed' }, { id: 'Failed', label: 'Failed' }, { id: 'Blocked', label: 'Blocked' }]} />
        </div>
        {shown.length === 0 ? (
          <p className="muted small">No executions yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Contact</th><th>Source</th><th>Status</th><th>Version</th><th>Time</th><th /></tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <Fragment key={e.id}>
                  <tr>
                    <td>{e.contactName}</td>
                    <td>{e.source === 'comment' ? 'Comment' : 'DM'}</td>
                    <td><ExecBadge status={e.status} /></td>
                    <td>v{e.flowVersion}</td>
                    <td>{dateTime(e.time)}</td>
                    <td><button className="btn btn-xs btn-ghost" aria-expanded={openExec === e.id} onClick={() => setOpenExec(openExec === e.id ? null : e.id)}>{openExec === e.id ? 'Hide' : 'Details'}</button></td>
                  </tr>
                  {openExec === e.id && (
                    <tr className="detail-row">
                      <td colSpan={6}>
                        <ol className="log-steps">{e.log.map((l, i) => <li key={i}>{l}</li>)}</ol>
                        {e.error && <p className="error-detail">{e.error}</p>}
                        <span className="muted small">Event {e.eventId}</span>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
