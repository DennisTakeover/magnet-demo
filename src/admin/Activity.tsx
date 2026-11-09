import { Fragment, useState } from 'react';
import { useStore } from '../store';
import { Badge, PageHeader, dateTime } from '../components/ui';
import type { ActivityItem } from '../types';

const TYPES: { id: ActivityItem['type'] | 'all'; label: string }[] = [
  { id: 'all', label: 'All actions' },
  { id: 'campaign', label: 'Campaign' },
  { id: 'flow', label: 'Lead Flow' },
  { id: 'execution', label: 'Flow execution' },
  { id: 'lead', label: 'Lead' },
  { id: 'inbox', label: 'Inbox' },
  { id: 'post', label: 'Planner' },
  { id: 'setting', label: 'Setting' },
  { id: 'support', label: 'Support' },
  { id: 'partner', label: 'Partner Program' },
];

export default function AdminActivity() {
  const { state } = useStore();
  const [client, setClient] = useState('all');
  const [type, setType] = useState<string>('all');
  const [result, setResult] = useState('all');
  const [open, setOpen] = useState<string | null>(null);
  const rows = state.activity
    .filter((a) => (client === 'all' || a.clientId === client) && (type === 'all' || a.type === type) && (result === 'all' || a.result === result))
    .sort((a, b) => b.time - a.time);

  return (
    <>
      <PageHeader title="Activity" subtitle="Every action by clients, the MAGNET team and the system, with time and reason." />
      <div className="filters">
        <label>
          <span className="sr-only">Client</span>
          <select value={client} onChange={(e) => setClient(e.target.value)}>
            <option value="all">All clients</option>
            {state.clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Action type</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Result</span>
          <select value={result} onChange={(e) => setResult(e.target.value)}>
            <option value="all">All results</option>
            <option value="success">Succeeded</option>
            <option value="failed">Failed</option>
          </select>
        </label>
      </div>
      <section className="card table-card">
        <table className="table">
          <thead>
            <tr><th>Time</th><th>Client</th><th>Action</th><th>By</th><th>Reason</th><th>Result</th></tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <Fragment key={a.id}>
                <tr>
                  <td className="nowrap">{dateTime(a.time)}</td>
                  <td>{state.clients.find((c) => c.id === a.clientId)?.name}</td>
                  <td>{a.action}</td>
                  <td>
                    {a.actor}
                    {a.actorRole === 'admin' && <> <Badge tone="violet">Admin</Badge></>}
                  </td>
                  <td>{a.reason ?? <span className="muted">—</span>}</td>
                  <td>
                    {a.result === 'failed' ? (
                      <button className="btn btn-xs btn-ghost text-red" aria-expanded={open === a.id} onClick={() => setOpen(open === a.id ? null : a.id)}>Failed · details</button>
                    ) : (
                      <Badge tone="green">OK</Badge>
                    )}
                  </td>
                </tr>
                {open === a.id && a.error && (
                  <tr className="detail-row">
                    <td colSpan={6}>
                      <strong>{a.error.code}</strong>
                      <p className="error-detail">{a.error.detail}</p>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
            {rows.length === 0 && <tr><td colSpan={6} className="muted">No activity matches these filters.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
