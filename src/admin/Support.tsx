import { CheckCircle2 } from 'lucide-react';
import { logActivity, useStore } from '../store';
import { ADMIN_ACTOR } from '../seed';
import { Badge, PageHeader, timeAgo } from '../components/ui';
import type { SupportTicket } from '../types';

export default function Support() {
  const { state, update, toast } = useStore();

  const set = (id: string, patch: Partial<SupportTicket>, action: string) => {
    update((d) => {
      const t = d.support.find((x) => x.id === id)!;
      Object.assign(t, patch);
      logActivity(d, { actor: ADMIN_ACTOR, actorRole: 'admin', clientId: t.clientId, type: 'support', action: `${action}: “${t.subject}”`, result: 'success' });
    });
    toast(action);
  };

  const order = { Open: 0, 'In progress': 1, Resolved: 2 };
  const tickets = [...state.support].sort((a, b) => order[a.status] - order[b.status] || b.time - a.time);

  return (
    <>
      <PageHeader title="Support" subtitle="Open questions and account problems." />
      <div className="ticket-list">
        {tickets.map((t) => {
          const client = state.clients.find((c) => c.id === t.clientId);
          return (
            <article key={t.id} className={`card ticket ${t.status === 'Resolved' ? 'resolved' : ''}`}>
              <div className="card-head">
                <h2>{t.subject}</h2>
                <Badge tone={t.status === 'Open' ? 'red' : t.status === 'In progress' ? 'amber' : 'green'}>{t.status}</Badge>
              </div>
              <p className="small">{t.detail}</p>
              <p className="muted xsmall">
                <a href={`#/admin/clients/${t.clientId}`}>{client?.name}</a> · {timeAgo(t.time)} · {t.assignee ? `Assigned to ${t.assignee}` : 'Unassigned'}
              </p>
              <div className="row gap-sm wrap">
                <label>
                  <span className="sr-only">Status</span>
                  <select value={t.status} onChange={(e) => set(t.id, { status: e.target.value as SupportTicket['status'] }, `Set status to ${e.target.value}`)}>
                    <option>Open</option>
                    <option>In progress</option>
                    <option>Resolved</option>
                  </select>
                </label>
                {!t.assignee && <button className="btn btn-sm btn-secondary" onClick={() => set(t.id, { assignee: 'Sophie Laurent', status: t.status === 'Open' ? 'In progress' : t.status }, 'Assigned to me')}>Assign to me</button>}
                {t.status !== 'Resolved' && <button className="btn btn-sm btn-ghost" onClick={() => set(t.id, { status: 'Resolved' }, 'Marked as resolved')}><CheckCircle2 size={14} /> Mark as resolved</button>}
                <a className="btn btn-sm btn-ghost" href={`#/admin/clients/${t.clientId}`}>Go to client</a>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
