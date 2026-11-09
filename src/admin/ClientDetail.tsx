import { useState } from 'react';
import { ArrowLeft, Pause, Play, StickyNote } from 'lucide-react';
import { logActivity, uid, useStore } from '../store';
import { ADMIN_ACTOR } from '../seed';
import { pauseFlow, tryActivate } from '../flowEngine';
import { Badge, CampaignBadge, Empty, Field, FlowStatusBadge, PageHeader, dateTime, timeAgo } from '../components/ui';
import { ReasonModal, clientView } from './shared';
import type { AiMode } from '../types';

type Pending =
  | { kind: 'campaign'; to: 'active' | 'paused' }
  | { kind: 'flow'; flowId: string; to: 'active' | 'paused' }
  | { kind: 'ai'; to: AiMode }
  | { kind: 'limit'; to: number };

const ADMIN = { name: ADMIN_ACTOR, role: 'admin' as const };

export default function ClientDetail({ id }: { id: string }) {
  const { state, update, toast } = useStore();
  const raw = state.clients.find((c) => c.id === id);
  const [pending, setPending] = useState<Pending | null>(null);
  const [note, setNote] = useState('');
  const [limit, setLimit] = useState(raw?.dailyLimit ?? 0);
  const [openErr, setOpenErr] = useState<string | null>(null);
  if (!raw) return <Empty title="Client not found" action={<a href="#/admin/clients">Back to clients</a>} />;
  const c = clientView(state, raw);
  // Demo client uses live numbers; other clients get a proportional sample
  const scale = raw.dailyLimit / 80;
  const br = raw.isDemoClient
    ? state.interactions.breakdown
    : { follows: Math.round(610 * scale), unfollows: Math.round(540 * scale), likes: Math.round(520 * scale), storyLikes: Math.round(220 * scale) };
  const skipped = raw.isDemoClient ? state.interactions.skippedByBlockedWords : Math.round(30 * scale);
  const protectedCount = raw.isDemoClient ? state.audience.protectedAccounts.length : null;
  const blockedCount = state.audience.blockedWords.length;

  const log = (action: string, reason: string, type: 'campaign' | 'flow' | 'setting' | 'support') =>
    (d: typeof state) => logActivity(d, { actor: ADMIN_ACTOR, actorRole: 'admin', clientId: id, type, action, reason, result: 'success' });

  const apply = (reason: string) => {
    if (!pending) return;
    let msg = '';
    update((d) => {
      const cl = d.clients.find((x) => x.id === id)!;
      if (pending.kind === 'campaign') {
        cl.campaign = pending.to;
        if (cl.isDemoClient) d.campaign = pending.to;
        log(`${pending.to === 'paused' ? 'Paused' : 'Resumed'} Grow campaign`, reason, 'campaign')(d);
        msg = `Campaign ${pending.to === 'paused' ? 'paused' : 'resumed'} for ${cl.name}`;
      } else if (pending.kind === 'flow') {
        if (cl.isDemoClient) {
          if (pending.to === 'paused') pauseFlow(d, pending.flowId, ADMIN, reason);
          else {
            const r = tryActivate(d, pending.flowId, ADMIN, reason);
            msg = r.message;
            if (!r.ok) return;
          }
        } else {
          const f = cl.flows.find((x) => x.id === pending.flowId)!;
          f.status = pending.to;
          log(`${pending.to === 'paused' ? 'Paused' : 'Resumed'} Lead Flow "${f.name}"`, reason, 'flow')(d);
        }
        msg ||= `Lead Flow ${pending.to === 'paused' ? 'paused' : 'resumed'}`;
      } else if (pending.kind === 'ai') {
        const from = cl.isDemoClient ? d.aiMode : cl.aiMode;
        cl.aiMode = pending.to;
        if (cl.isDemoClient) d.aiMode = pending.to;
        log(`Changed AI mode from ${from} to ${pending.to}`, reason, 'setting')(d);
        msg = 'AI mode updated';
      } else {
        const from = cl.dailyLimit;
        cl.dailyLimit = pending.to;
        if (cl.isDemoClient) d.interactions.dailyLimit = pending.to;
        log(`Changed daily interaction limit from ${from} to ${pending.to}`, reason, 'setting')(d);
        msg = 'Daily interaction limit updated';
      }
    });
    toast(msg || 'Saved', 'success', { label: 'View in Activity', href: '/admin/activity' });
    setPending(null);
  };

  const errors = [
    ...state.activity.filter((a) => a.clientId === id && a.result === 'failed').map((a) => ({ id: a.id, title: a.action, code: a.error?.code ?? 'ERROR', detail: a.error?.detail ?? '', time: a.time })),
  ];
  const recent = state.activity.filter((a) => a.clientId === id).slice(0, 6);

  return (
    <>
      <a href="#/admin/clients" className="back-link"><ArrowLeft size={16} /> Clients</a>
      <PageHeader
        title={c.name}
        subtitle={<>{c.owner} · {c.handle} · {c.niche}{c.isDemoClient && <> · <a href="#/app/overview">open client view</a></>}</>}
      />

      <div className="grid-2 grid-top">
        <section className="card">
          <div className="card-head">
            <h2>Growth</h2>
            <CampaignBadge status={c.campaign} />
          </div>
          <dl className="kv">
            <dt>Audience</dt><dd>{c.audienceSummary}</dd>
            <dt>Connection</dt><dd>{c.connection === 'connected' ? <Badge tone="green" dot>Connected</Badge> : <Badge tone="red" dot>Disconnected</Badge>}</dd>
            <dt>Subscription</dt><dd>{c.plan} · {c.subscription}</dd>
          </dl>
          {c.campaign === 'active' ? (
            <button className="btn btn-secondary" onClick={() => setPending({ kind: 'campaign', to: 'paused' })}><Pause size={16} /> Pause campaign</button>
          ) : (
            <button className="btn btn-primary" disabled={c.connection === 'disconnected'} onClick={() => setPending({ kind: 'campaign', to: 'active' })}><Play size={16} /> Resume campaign</button>
          )}
          {c.connection === 'disconnected' && c.campaign !== 'active' && <p className="muted xsmall">Can’t resume until the client reconnects Instagram.</p>}
        </section>

        <section className="card">
          <h2>Settings</h2>
          <Field label="AI mode">
            <select value={c.aiMode} onChange={(e) => setPending({ kind: 'ai', to: e.target.value as AiMode })}>
              <option value="off">Off</option>
              <option value="assist">Assist</option>
              <option value="auto">Auto</option>
            </select>
          </Field>
          <Field label="Daily interaction limit" hint="Maximum interactions per day. The client sees the new limit in Grow.">
            <div className="row gap-sm">
              <input type="number" min={0} max={200} value={limit} onChange={(e) => setLimit(Number(e.target.value))} />
              <button className="btn btn-secondary" disabled={limit === raw.dailyLimit} onClick={() => setPending({ kind: 'limit', to: limit })}>Save</button>
            </div>
          </Field>
        </section>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>Interactions</h2>
          <Badge tone="violet">Internal · not shown to the client</Badge>
        </div>
        <div className="stat-grid">
          {([
            ['Follows', br.follows],
            ['Unfollows', br.unfollows],
            ['Likes', br.likes],
            ['Story likes', br.storyLikes],
            ['Skipped by blocked words', skipped],
          ] as const).map(([label, v]) => (
            <div key={label} className="stat"><span className="stat-value">{v.toLocaleString('en-GB')}</span><span className="stat-label">{label}</span><span className="stat-sub">Last 28 days (sample)</span></div>
          ))}
        </div>
        <p className="muted small">
          The client only sees the total ({(br.follows + br.unfollows + br.likes + br.storyLikes).toLocaleString('en-GB')} interactions) and the daily limit.
          {protectedCount !== null && ` Protected accounts: ${protectedCount}. Blocked words: ${blockedCount}.`}
        </p>
      </section>

      <section className="card">
        <h2>Lead Flows</h2>
        {c.flows.length === 0 ? <p className="muted small">No flows.</p> : (
          <ul className="flow-admin-list">
            {c.flows.map((f) => (
              <li key={f.id}>
                <strong>{f.name}</strong>
                <FlowStatusBadge status={f.status} />
                <div className="spacer" />
                {f.status === 'active' || f.status === 'waiting_for_post' ? (
                  <button className="btn btn-sm btn-secondary" onClick={() => setPending({ kind: 'flow', flowId: f.id, to: 'paused' })}><Pause size={14} /> Pause</button>
                ) : f.status === 'paused' ? (
                  <button className="btn btn-sm btn-ghost" onClick={() => setPending({ kind: 'flow', flowId: f.id, to: 'active' })}><Play size={14} /> Resume</button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid-2 grid-top">
        <section className="card">
          <h2>Execution errors</h2>
          {errors.length === 0 ? <p className="muted small">No errors.</p> : (
            <ul className="err-list">
              {errors.map((e) => (
                <li key={e.id}>
                  <button className="err-btn" aria-expanded={openErr === e.id} onClick={() => setOpenErr(openErr === e.id ? null : e.id)}>
                    <Badge tone="red">{e.code}</Badge> <span>{e.title}</span> <span className="muted xsmall">{timeAgo(e.time)}</span>
                  </button>
                  {openErr === e.id && <p className="error-detail">{e.detail}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card">
          <h2><StickyNote size={18} aria-hidden /> Internal notes</h2>
          <ul className="notes">
            {raw.notes.map((n) => (
              <li key={n.id}><p>{n.text}</p><span className="muted xsmall">{n.author} · {dateTime(n.time)}</span></li>
            ))}
            {raw.notes.length === 0 && <li className="muted small">No notes yet.</li>}
          </ul>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!note.trim()) return;
              update((d) => {
                d.clients.find((x) => x.id === id)!.notes.push({ id: uid('n'), text: note.trim(), author: ADMIN_ACTOR, time: Date.now() });
                log('Added support note', note.trim(), 'support')(d);
              });
              setNote('');
              toast('Note added');
            }}
          >
            <Field label="Add a support note"><textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></Field>
            <button className="btn btn-secondary" type="submit">Add note</button>
          </form>
        </section>
      </div>

      <section className="card">
        <div className="card-head"><h2>Recent activity</h2><a href="#/admin/activity" className="small">All activity</a></div>
        <ul className="mini-activity">
          {recent.map((a) => (
            <li key={a.id}>
              <span className={a.result === 'failed' ? 'text-red' : ''}>{a.action}</span>
              <span className="muted xsmall">{a.actor} · {timeAgo(a.time)}{a.reason ? ` · “${a.reason}”` : ''}</span>
            </li>
          ))}
        </ul>
      </section>

      {pending && (
        <ReasonModal
          title={
            pending.kind === 'campaign' ? `${pending.to === 'paused' ? 'Pause' : 'Resume'} campaign for ${c.name}` :
            pending.kind === 'flow' ? `${pending.to === 'paused' ? 'Pause' : 'Resume'} Lead Flow` :
            pending.kind === 'ai' ? `Change AI mode to ${pending.to}` : `Change daily interaction limit to ${pending.to}`
          }
          description="The client sees the result in their workspace. Your name, the time and the reason are logged."
          confirmLabel="Confirm"
          onConfirm={apply}
          onClose={() => setPending(null)}
        />
      )}
    </>
  );
}
