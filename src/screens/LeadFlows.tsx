import { FileText, Link2, MessageCircle, MessagesSquare, Pause, Play, Plus } from 'lucide-react';
import { useStore } from '../store';
import { can } from '../team';
import OpsBanner from '../components/OpsBanner';

import { t } from '../i18n/locale';
import { clientActor } from '../seed';
import { pauseFlow, tryActivate } from '../flowEngine';
import { FlowStatusBadge, PageHeader } from '../components/ui';

export default function LeadFlows() {
  const { state, update, toast } = useStore();

  const activate = (id: string) => {
    if (!can(state, 'manageFlows')) return toast('Only people with Lead Flow access can switch flows on or off.', 'warning');
    let res = { ok: false, message: '' };
    update((d) => {
      res = tryActivate(d, id, { name: clientActor(d), role: 'client' });
    });
    toast(res.message, res.ok ? 'success' : 'warning');
  };

  return (
    <>
      <PageHeader
        title={t('flows.title')}
        subtitle={t('flows.sub')}
        actions={<a className="btn btn-primary" href="#/app/flows/new"><Plus size={16} /> Create Lead Flow</a>}
      />
      <OpsBanner module="flows" />
      <div className="flow-grid">
        {state.flows.map((f) => {
          const post = state.posts.find((p) => p.id === f.trigger.postId);
          return (
            <article key={f.id} className="card flow-card">
              <div className="card-head">
                <h2><a href={`#/app/flows/${f.id}`}>{f.name}</a></h2>
                <FlowStatusBadge status={f.status} />
              </div>
              <div className="flow-pipe" aria-label="How this flow works">
                <span className="fp-node" title={f.trigger.type === 'comment' ? `Comment on “${post?.title ?? 'no post selected'}”` : 'Incoming DM'}>
                  <span className="fp-icon">{f.trigger.type === 'comment' ? <MessagesSquare size={20} aria-hidden /> : <MessageCircle size={20} aria-hidden />}</span>
                  <span className="fp-label">{f.trigger.type === 'comment' ? 'Comment' : 'DM'}</span>
                </span>
                <span className="fp-arrow" aria-hidden />
                <span className="fp-node kwnode">
                  <span className="kw fp-kw">{f.trigger.keyword || '—'}</span>
                  <span className="fp-label">Keyword</span>
                </span>
                <span className="fp-arrow" aria-hidden />
                <span className="fp-node" title={f.resource.title}>
                  <span className="fp-icon accent">{f.resource.kind === 'pdf' ? <FileText size={20} aria-hidden /> : <Link2 size={20} aria-hidden />}</span>
                  <span className="fp-label">{f.resource.kind === 'pdf' ? 'Guide' : 'Link'}</span>
                </span>
              </div>
              <p className="fp-resource">{f.resource.title}</p>
              <div className="flow-bars" aria-label="Results">
                {([['Requests', f.stats.requesters], ['Sent', f.stats.sent], ['Replied', f.stats.replied]] as const).map(([label, n]) => (
                  <div key={label} className="fb-row" title={`${label}: ${n}`}>
                    <span className="fb-label">{label}</span>
                    <span className="fb-track"><span style={{ width: `${f.stats.requesters ? (n / f.stats.requesters) * 100 : 0}%` }} /></span>
                    <strong>{n}</strong>
                  </div>
                ))}
              </div>
              <div className="row gap-sm">
                <a className="btn btn-sm btn-secondary" href={`#/app/flows/${f.id}`}>View results</a>
                {f.status === 'active' || f.status === 'waiting_for_post' ? (
                  <button className="btn btn-sm btn-ghost" onClick={() => { update((d) => pauseFlow(d, f.id, { name: clientActor(d), role: 'client' })); toast(`"${f.name}" paused`, 'info'); }}>
                    <Pause size={14} /> Pause
                  </button>
                ) : (
                  <button className="btn btn-sm btn-ghost" onClick={() => activate(f.id)}><Play size={14} /> Activate</button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
