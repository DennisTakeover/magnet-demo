import { useState } from 'react';
import { AlertTriangle, ChevronRight, CreditCard, HelpCircle, PauseCircle, Power, WifiOff, Workflow } from 'lucide-react';
import { logActivity, uid, useStore } from '../store';
import { ADMIN_ACTOR } from '../seed';
import { Badge, FLOW_STATUS_LABEL, Modal, PageHeader, Segmented, dateTime, timeAgo } from '../components/ui';
import { ReasonModal, allClients } from './shared';
import { SWITCH_LABEL } from '../ops';
import type { SwitchModule } from '../types';

type Kind = 'failed' | 'paused' | 'connection' | 'billing' | 'reconcile';
type Filter = 'all' | Kind;
const MODULES: SwitchModule[] = ['grow', 'flows', 'ai', 'comments', 'planner'];

export default function Operations() {
  const { state, update, toast } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [mod, setMod] = useState<'all' | SwitchModule>('all');
  const [toggle, setToggle] = useState<{ module: SwitchModule; scope: string; on: boolean } | null>(null);
  const [reconcile, setReconcile] = useState<string | null>(null);
  const [scope, setScope] = useState('global');
  const clients = allClients(state);
  const name = (id: string) => (id === 'global' ? 'All clients' : clients.find((c) => c.id === id)?.name ?? id);

  const failed = state.activity.filter((a) => a.result === 'failed' && Date.now() - a.time < 7 * 86400000 && a.error?.code !== 'SEND_TIMEOUT');
  const uncertain = state.executions.filter((e) => e.error?.startsWith('SEND_TIMEOUT') && !e.reconciled);
  type Alert = { kind: Kind; module?: SwitchModule; clientId: string; text: string; sub: string; time: number; execId?: string };
  const alerts: Alert[] = [
    ...uncertain.map((e) => ({ kind: 'reconcile' as const, module: 'flows' as const, clientId: 'c1', text: `Uncertain send to ${e.contactName}: reconcile before any retry`, sub: 'SEND_TIMEOUT', time: e.time, execId: e.id })),
    ...failed.map((a) => ({ kind: 'failed' as const, module: a.type === 'execution' || a.type === 'flow' ? ('flows' as const) : a.type === 'campaign' ? ('grow' as const) : a.type === 'post' ? ('planner' as const) : undefined, clientId: a.clientId, text: a.action, sub: a.error?.code ?? 'Failed', time: a.time })),
    ...clients.filter((c) => c.subscription === 'Past due').map((c) => ({ kind: 'billing' as const, clientId: c.id, text: 'Payment failed: subscription past due', sub: c.name, time: c.lastActivity })),
    ...clients.filter((c) => c.campaign === 'paused').map((c) => ({ kind: 'paused' as const, module: 'grow' as const, clientId: c.id, text: 'Grow campaign paused', sub: c.name, time: c.lastActivity })),
    ...clients.flatMap((c) => c.flows.filter((f) => f.status === 'paused' || f.status === 'needs_attention').map((f) => ({ kind: 'paused' as const, module: 'flows' as const, clientId: c.id, text: `Lead Flow “${f.name}”: ${FLOW_STATUS_LABEL[f.status]}`, sub: c.name, time: c.lastActivity }))),
    ...clients.filter((c) => c.connection === 'disconnected').map((c) => ({ kind: 'connection' as const, clientId: c.id, text: 'Instagram connection lost', sub: c.name, time: c.lastActivity })),
  ].sort((a, b) => (a.kind === 'reconcile' ? -1 : 0) - (b.kind === 'reconcile' ? -1 : 0) || b.time - a.time);
  const shown = alerts.filter((a) => (filter === 'all' || a.kind === filter) && (mod === 'all' || a.module === mod));
  const icons = { failed: AlertTriangle, paused: PauseCircle, connection: WifiOff, billing: CreditCard, reconcile: HelpCircle };

  const isOn = (module: SwitchModule, sc: string) => state.killSwitches.some((k) => k.module === module && k.scope === sc);
  const applySwitch = (reason: string) => {
    const t = toggle!;
    update((d) => {
      if (t.on) {
        if (!d.killSwitches.some((k) => k.module === t.module && k.scope === t.scope)) d.killSwitches.push({ module: t.module, scope: t.scope, actor: ADMIN_ACTOR, reason, time: Date.now() });
      } else {
        d.killSwitches = d.killSwitches.filter((k) => !(k.module === t.module && k.scope === t.scope));
      }
      logActivity(d, { actor: ADMIN_ACTOR, actorRole: 'admin', clientId: t.scope === 'global' ? 'c1' : t.scope, type: 'setting', action: `${t.on ? 'Paused' : 'Resumed'} ${SWITCH_LABEL[t.module]} for ${name(t.scope)} (kill switch)`, reason, result: 'success' });
    });
    toast(t.on ? `${SWITCH_LABEL[t.module]} paused for ${name(t.scope)}. Workers stop new submissions.` : `${SWITCH_LABEL[t.module]} resumed. Nothing queued is replayed automatically.`, t.on ? 'warning' : 'success');
  };

  const active = state.killSwitches;

  return (
    <>
      <PageHeader title="Operations" subtitle="Execution status across all clients, with switches to stop problems quickly." />
      {active.length > 0 && (
        <div className="banner banner-amber" role="status">
          <Power size={18} aria-hidden />
          <span><strong>{active.length} kill switch{active.length > 1 ? 'es' : ''} on:</strong> {active.map((k) => `${SWITCH_LABEL[k.module]} (${name(k.scope)})`).join(', ')}</span>
        </div>
      )}
      <div className="metric-grid">
        <a className="metric" href="#/admin/clients"><span className="metric-label">Active clients</span><span className="metric-value">{clients.filter((c) => c.campaign === 'active').length}</span><span className="metric-def">of {clients.length} clients</span></a>
        <button className="metric" onClick={() => setFilter('reconcile')}><span className="metric-label">Uncertain outcomes</span><span className="metric-value">{uncertain.length}</span><span className="metric-def">Reconcile before retry</span></button>
        <button className="metric" onClick={() => setFilter('connection')}><span className="metric-label">Connection issues</span><span className="metric-value">{clients.filter((c) => c.connection === 'disconnected').length}</span><span className="metric-def">Accounts to reconnect</span></button>
        <button className="metric" onClick={() => setFilter('failed')}><span className="metric-label">Failed tasks</span><span className="metric-value">{failed.length}</span><span className="metric-def">Last 7 days</span></button>
      </div>

      <section className="card">
        <div className="card-head wrap">
          <h2>Needs attention</h2>
          <div className="row gap-sm wrap">
            <Segmented label="Filter alerts" value={filter} onChange={setFilter} options={[{ id: 'all', label: 'All' }, { id: 'reconcile', label: 'Uncertain' }, { id: 'failed', label: 'Failed' }, { id: 'paused', label: 'Paused' }, { id: 'connection', label: 'Connection' }, { id: 'billing', label: 'Billing' }]} />
            <label><span className="sr-only">Module</span>
              <select aria-label="Filter by module" value={mod} onChange={(e) => setMod(e.target.value as typeof mod)}>
                <option value="all">All modules</option>
                {MODULES.map((m) => <option key={m} value={m}>{SWITCH_LABEL[m]}</option>)}
              </select>
            </label>
          </div>
        </div>
        <ul className="action-list">
          {shown.map((a, i) => {
            const Icon = a.text.startsWith('Lead Flow') ? Workflow : icons[a.kind];
            const client = clients.find((c) => c.id === a.clientId);
            const inner = (
              <>
                <span className="action-icon"><Icon size={18} aria-hidden /></span>
                <span className="action-text">
                  <strong>{a.text}</strong>
                  <span className="muted small">{client?.name} · {a.sub !== client?.name ? `${a.sub} · ` : ''}{timeAgo(a.time)}</span>
                </span>
              </>
            );
            return (
              <li key={i}>
                {a.kind === 'reconcile' ? (
                  <div className="action-item tone-amber">
                    {inner}
                    <button className="btn btn-sm btn-secondary" onClick={() => setReconcile(a.execId!)}>Reconcile</button>
                  </div>
                ) : (
                  <a className={`action-item ${a.kind === 'failed' || a.kind === 'connection' || a.kind === 'billing' ? 'tone-red' : 'tone-amber'}`} href={`#/admin/clients/${a.clientId}`}>
                    {inner}
                    <span className="small">Open client</span>
                    <ChevronRight size={18} aria-hidden />
                  </a>
                )}
              </li>
            );
          })}
          {shown.length === 0 && <li className="muted small pad">Nothing here.</li>}
        </ul>
      </section>

      <section className="card" aria-labelledby="ks-h">
        <div className="card-head wrap">
          <h2 id="ks-h"><Power size={18} aria-hidden /> Kill switches</h2>
          <label><span className="sr-only">Scope</span>
            <select aria-label="Switch scope" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="global">All clients (global)</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
        <p className="muted small">A switch stops new submissions for a module. Workers check it before every action; settings, data and queues are kept, and nothing is replayed automatically when you switch it back.</p>
        <div className="ks-grid">
          {MODULES.map((m) => {
            const own = state.killSwitches.find((k) => k.module === m && k.scope === scope);
            const global = scope !== 'global' && isOn(m, 'global');
            return (
              <div key={m} className={`ks ${own || global ? 'on' : ''}`}>
                <div>
                  <strong>{SWITCH_LABEL[m]}</strong>
                  <div className="muted xsmall">{own ? `Paused ${timeAgo(own.time)} · ${own.reason}` : global ? 'Paused globally' : 'Running'}</div>
                </div>
                <button className={`btn btn-sm ${own ? 'btn-secondary' : 'btn-danger-soft'}`} disabled={global} onClick={() => setToggle({ module: m, scope, on: !own })} aria-label={`${own ? 'Resume' : 'Pause'} ${SWITCH_LABEL[m]} for ${name(scope)}`}>
                  {own ? 'Resume' : 'Pause'}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {toggle && (
        <ReasonModal
          title={`${toggle.on ? 'Pause' : 'Resume'} ${SWITCH_LABEL[toggle.module]} · ${name(toggle.scope)}`}
          description={toggle.on ? 'New submissions stop right away. Customers see a short notice in the affected module.' : 'New submissions are allowed again. Anything that was blocked is not replayed.'}
          confirmLabel={toggle.on ? 'Pause' : 'Resume'}
          onClose={() => setToggle(null)}
          onConfirm={applySwitch}
        />
      )}
      {reconcile && <ReconcileModal execId={reconcile} onClose={() => setReconcile(null)} />}
    </>
  );
}

/** Uncertain external outcome: check status first, then decide. A retry is only offered once "not delivered" is confirmed. */
function ReconcileModal({ execId, onClose }: { execId: string; onClose: () => void }) {
  const { state, update, toast } = useStore();
  const ex = state.executions.find((e) => e.id === execId)!;
  const [checked, setChecked] = useState<null | 'delivered' | 'not_delivered'>(null);
  const finish = (retry: boolean) => {
    update((d) => {
      const e = d.executions.find((x) => x.id === execId)!;
      e.reconciled = checked!;
      e.log.push(`Reconciled by ${ADMIN_ACTOR}: ${checked === 'delivered' ? 'message was delivered' : 'message was not delivered'}`);
      if (checked === 'delivered') e.status = 'Sent';
      logActivity(d, { actor: ADMIN_ACTOR, actorRole: 'admin', clientId: 'c1', type: 'execution', action: `Reconciled uncertain send to ${e.contactName}: ${checked === 'delivered' ? 'delivered' : 'not delivered'}`, result: 'success' });
      if (retry) {
        const flow = d.flows.find((f) => f.id === e.flowId);
        d.executions.unshift({ ...e, id: uid('x'), eventId: `${e.eventId}_retry`, status: 'Sent', time: Date.now(), error: undefined, reconciled: undefined, log: [`Retry after reconciliation (original ${e.id} confirmed not delivered)`, `Private reply sent with "${flow?.resource.title ?? 'resource'}"`] });
        logActivity(d, { actor: ADMIN_ACTOR, actorRole: 'admin', clientId: 'c1', type: 'execution', action: `Retried send to ${e.contactName} after reconciliation`, result: 'success' });
      }
    });
    toast(retry ? 'Retried once. The original stays in the log.' : checked === 'delivered' ? 'Marked as delivered. No retry needed.' : 'Reconciled. No retry sent.', 'success');
    onClose();
  };
  return (
    <Modal title={`Reconcile send · ${ex.contactName}`} onClose={onClose} footer={
      checked === null ? <><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={() => setChecked(ex.log.some((l) => l.includes('not delivered')) ? 'not_delivered' : 'delivered')}>Check delivery status</button></>
        : checked === 'delivered' ? <button className="btn btn-primary" onClick={() => finish(false)}>Mark as delivered</button>
          : <><button className="btn btn-ghost" onClick={() => finish(false)}>Close without retry</button><button className="btn btn-primary" onClick={() => finish(true)}>Retry once</button></>
    }>
      <p className="small">{ex.error}</p>
      <ul className="plain-list small">{ex.log.map((l, i) => <li key={i}>{l}</li>)}</ul>
      <p className="muted xsmall">Started {dateTime(ex.time)}. A retry is only possible after the status check, so the contact never gets the message twice.</p>
      {checked && <p className="small"><Badge tone={checked === 'delivered' ? 'green' : 'amber'}>{checked === 'delivered' ? 'Delivered' : 'Not delivered'}</Badge> Status check result from Instagram (simulated).</p>}
    </Modal>
  );
}
