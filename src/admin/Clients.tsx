import { useState } from 'react';
import { Search } from 'lucide-react';
import { navigate, useStore } from '../store';
import { Badge, CampaignBadge, PageHeader, timeAgo } from '../components/ui';
import { allClients } from './shared';

export default function Clients() {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const clients = allClients(state).filter((c) => !q || `${c.name} ${c.owner} ${c.handle}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <>
      <PageHeader
        title="Clients"
        actions={
          <div className="search">
            <Search size={16} aria-hidden />
            <label className="sr-only" htmlFor="client-q">Search clients</label>
            <input id="client-q" placeholder="Search clients" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        }
      />
      <section className="card table-card">
        <table className="table">
          <thead>
            <tr><th>Client</th><th>Account</th><th>Service</th><th>Last activity</th><th>Status</th></tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="clickable" onClick={() => navigate(`/admin/clients/${c.id}`)}>
                <td>
                  <a href={`#/admin/clients/${c.id}`}><strong>{c.name}</strong></a>
                  <div className="muted xsmall">{c.owner}{c.isDemoClient ? ' · demo client' : ''}</div>
                </td>
                <td>{c.handle}</td>
                <td>{c.plan} · {c.subscription}</td>
                <td>{timeAgo(c.lastActivity)}</td>
                <td>
                  <div className="row gap-sm wrap">
                    <CampaignBadge status={c.campaign} />
                    {c.connection === 'disconnected' && <Badge tone="red" dot>Disconnected</Badge>}
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && <tr><td colSpan={5} className="muted">No clients match.</td></tr>}
          </tbody>
        </table>
      </section>
    </>
  );
}
