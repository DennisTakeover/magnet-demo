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
              <dl className="kv">
                <dt>Trigger</dt>
                <dd>
                  {f.trigger.type === 'comment' ? <MessagesSquare size={14} aria-hidden /> : <MessageCircle size={14} aria-hidden />}{' '}
                  {f.trigger.type === 'comment' ? `Comment on “${post?.title ?? 'no post selected'}”` : 'Incoming DM'}
                </dd>
                <dt>Keyword</dt>
                <dd><span className="kw">{f.trigger.keyword || '—'}</span></dd>
                <dt>Resource</dt>
                <dd>{f.resource.kind === 'pdf' ? <FileText size={14} aria-hidden /> : <Link2 size={14} aria-hidden />} {f.resource.title}</dd>
              </dl>
              <div className="flow-stats">
                <div><strong>{f.stats.requesters}</strong><span>unique requests</span></div>
                <div><strong>{f.stats.sent}</strong><span>sent</span></div>
                <div><strong>{f.stats.replied}</strong><span>replied</span></div>
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
