import { useState } from 'react';
import { AlertTriangle, ChevronLeft, ChevronRight, Plus, Workflow, Sparkles } from 'lucide-react';
import { clientLog, navigate, uid, useStore, markActivation } from '../store';
import { can } from '../team';
import OpsBanner from '../components/OpsBanner';

import { t } from '../i18n/locale';
import { matchesKeyword, publishPost } from '../flowEngine';
import { Badge, Field, FlowStatusBadge, Modal, PageHeader, PostBadge, Segmented, formatDate } from '../components/ui';
import type { Post } from '../types';

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export default function Planner({ openId }: { openId?: string }) {
  const { state, update, toast } = useStore();
  const [view, setView] = useState<'week' | 'month'>('week');
  const [anchor, setAnchor] = useState(() => new Date());
  const today = iso(new Date());

  const days: Date[] = [];
  if (view === 'week') {
    const s = startOfWeek(anchor);
    for (let i = 0; i < 7; i++) days.push(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
  } else {
    const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    const s = startOfWeek(first);
    for (let i = 0; i < 35; i++) days.push(new Date(s.getFullYear(), s.getMonth(), s.getDate() + i));
  }
  const move = (dir: number) => {
    const a = new Date(anchor);
    if (view === 'week') a.setDate(a.getDate() + dir * 7);
    else a.setMonth(a.getMonth() + dir);
    setAnchor(a);
  };

  const drafts = state.posts.filter((p) => p.status === 'draft' || (p.status === 'failed' && !p.date));
  const open = state.posts.find((p) => p.id === openId);

  const newDraft = () => {
    const id = uid('p');
    update((d) => {
      d.posts.push({ id, title: 'Untitled post', caption: '', format: 'Post', status: 'draft', date: null, time: null });
      clientLog(d, 'post', 'Created a draft post');
    });
    navigate(`/app/planner/${id}`);
    toast('Draft created');
  };

  const label = view === 'week'
    ? `${days[0].toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} – ${days[6].toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`
    : anchor.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  return (
    <>
      <PageHeader title={t('planner.title')} subtitle={t('planner.sub')} actions={<button className="btn btn-primary" onClick={newDraft}><Plus size={16} /> New draft</button>} />
      <OpsBanner module="planner" />
      <div className="planner">
        <section className="card planner-cal">
          <div className="cal-head">
            <div className="row gap-sm">
              <button className="icon-btn" aria-label="Previous" onClick={() => move(-1)}><ChevronLeft size={18} /></button>
              <button className="icon-btn" aria-label="Next" onClick={() => move(1)}><ChevronRight size={18} /></button>
              <strong>{label}</strong>
              <button className="btn btn-xs btn-ghost" onClick={() => setAnchor(new Date())}>Today</button>
            </div>
            <Segmented label="Calendar view" value={view} onChange={setView} options={[{ id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }]} />
          </div>
          <div className={`cal-grid cal-${view}`}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="cal-dow">{d}</div>)}
            {days.map((d) => {
              const key = iso(d);
              const posts = state.posts.filter((p) => p.date === key && p.status !== 'draft');
              const out = view === 'month' && d.getMonth() !== anchor.getMonth();
              return (
                <div key={key} className={`cal-day ${key === today ? 'today' : ''} ${out ? 'out' : ''}`}>
                  <span className="cal-date">{d.getDate()}</span>
                  {posts.map((p) => (
                    <a key={p.id} href={`#/app/planner/${p.id}`} className={`cal-post st-${p.status}`}>
                      <span className="xsmall">{p.time} · {p.format}</span>
                      <span className="clamp-2">{p.title}</span>
                      {p.flowId && <span className="xsmall cal-flow"><Workflow size={10} /> {state.flows.find((f) => f.id === p.flowId)?.trigger.keyword}</span>}
                      {p.status !== 'scheduled' && <span className="xsmall">{p.status === 'published' ? 'Published' : 'Failed'}</span>}
                    </a>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
        <section className="card planner-drafts" aria-labelledby="drafts">
          <h2 id="drafts">Drafts</h2>
          {drafts.map((p) => (
            <a key={p.id} href={`#/app/planner/${p.id}`} className="draft-item">
              <strong>{p.title}</strong>
              <span className="muted small clamp-2">{p.caption || 'No caption yet'}</span>
              <span className="row gap-sm">
                <Badge>{p.format}</Badge>
                {p.fromConversation && <Badge tone="accent">From Inbox</Badge>}
              </span>
            </a>
          ))}
          {drafts.length === 0 && <p className="muted small">No drafts.</p>}
        </section>
      </div>
      {open && <PostEditor key={open.id} post={open} />}
    </>
  );
}

function PostEditor({ post }: { post: Post }) {
  const { state, update, toast } = useStore();
  const [p, setP] = useState(post);
  const close = () => navigate('/app/planner');
  const flow = state.flows.find((f) => f.id === p.flowId);
  const keywordMissing = flow && !matchesKeyword(p.caption, flow.trigger.keyword);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const save = (patch: Partial<Post>, log: string, msg: string) => {
    const next = { ...p, ...patch };
    update((d) => {
      const i = d.posts.findIndex((x) => x.id === p.id);
      d.posts[i] = next;
      if (next.status === 'scheduled' && post.status !== 'scheduled') markActivation(d, 'post_scheduled');
      // A flow belongs to one post at a time
      d.posts.forEach((x) => {
        if (x.id !== next.id && next.flowId && x.flowId === next.flowId) x.flowId = undefined;
      });
      // Keep the attached flow in sync with the post
      d.flows.forEach((f) => {
        if (f.id === next.flowId) {
          f.trigger = { ...f.trigger, type: 'comment', postId: next.id };
          if (f.status === 'active' && next.status !== 'published') f.status = 'waiting_for_post';
        } else if (f.trigger.postId === next.id && f.id === post.flowId && next.flowId !== f.id) {
          f.trigger.postId = undefined;
          if (f.status === 'waiting_for_post' || f.status === 'active') f.status = 'draft';
        }
      });
      clientLog(d, 'post', log);
    });
    setP(next);
    toast(msg);
  };

  const schedule = () => {
    if (!can(state, 'publish')) return toast('The owner hasn’t allowed you to schedule posts. Save it as a draft instead.', 'warning');
    if (!p.date || !p.time) return toast('Choose a date and time first', 'warning');
    save({ status: 'scheduled', error: undefined }, `Scheduled "${p.title}" for ${p.date} ${p.time}`, `Scheduled for ${formatDate(p.date)} at ${p.time} (demo)`);
    close();
  };

  const simulatePublish = () => {
    const fail = state.sim.failNextPublish;
    let res = { ok: false, message: '' };
    update((d) => {
      const i = d.posts.findIndex((x) => x.id === p.id);
      d.posts[i] = { ...p, status: d.posts[i].status };
      res = publishPost(d, p.id, fail);
      if (fail) d.sim.failNextPublish = false;
    });
    toast(res.message, res.ok ? 'success' : 'error');
    if (res.ok) close();
    else setP({ ...p, status: 'failed', error: 'Publishing failed: the media could not be processed (simulated). Your post and any attached Lead Flow are unchanged.' });
  };

  const insertCta = () => {
    if (!flow) return;
    const cta = `Comment ${flow.trigger.keyword} and I’ll send you ${flow.resource.title.toLowerCase().startsWith('the') ? flow.resource.title.toLowerCase() : `the ${flow.resource.title.toLowerCase()}`}.`;
    setP({ ...p, caption: `${p.caption.trim()}\n\n${cta}`.trim() });
  };

  const commentFlows = state.flows;

  return (
    <Modal
      title={post.status === 'draft' ? 'Edit draft' : 'Edit post'}
      onClose={close}
      wide
      footer={
        <>
          {p.status === 'scheduled' && <button className="btn btn-ghost" onClick={() => { save({ status: 'draft' }, `Moved "${p.title}" back to draft`, 'Moved back to draft'); close(); }}>Move back to draft</button>}
          {p.status === 'failed' && <button className="btn btn-ghost" onClick={() => { save({ status: 'draft', error: undefined }, `Moved "${p.title}" back to draft`, 'Moved back to draft'); close(); }}>Move back to draft</button>}
          <div className="spacer" />
          {p.status !== 'published' && <button className="btn btn-secondary" onClick={() => save({}, `Edited "${p.title}"`, 'Changes saved')}>Save</button>}
          {(p.status === 'draft' || p.status === 'failed') && <button className="btn btn-primary" onClick={schedule}>{p.status === 'failed' ? 'Retry: schedule again' : 'Schedule post'}</button>}
          {p.status === 'scheduled' && <button className="btn btn-primary" onClick={simulatePublish}>Simulate publish</button>}
        </>
      }
    >
      <div className="row gap-sm">
        <PostBadge status={p.status} />
        {p.igPostId && <span className="muted small">Post ID {p.igPostId}</span>}
        {p.fromConversation && <Badge tone="accent">Idea from Inbox</Badge>}
      </div>
      {p.status === 'failed' && (
        <div className="banner banner-red mt">
          <AlertTriangle size={18} aria-hidden />
          <span>{p.error ?? 'Publishing failed.'} You can schedule it again or move it back to draft.</span>
        </div>
      )}
      <div className="grid-2 mt">
        <Field label="Title"><input value={p.title} disabled={p.status === 'published'} onChange={(e) => setP({ ...p, title: e.target.value })} /></Field>
        <Field label="Format">
          <select value={p.format} disabled={p.status === 'published'} onChange={(e) => setP({ ...p, format: e.target.value as Post['format'] })}>
            <option>Post</option><option>Reel</option><option>Carousel</option>
          </select>
        </Field>
      </div>
      <Field label="Caption">
        <textarea rows={5} value={p.caption} disabled={p.status === 'published'} onChange={(e) => setP({ ...p, caption: e.target.value })} />
      </Field>
      {p.fromConversation && <p className="muted xsmall"><Sparkles size={12} /> Written in general terms. No names or details from the conversation are used.</p>}

      <div className="attach-box">
        <div className="row gap-sm wrap">
          <Workflow size={16} aria-hidden />
          <strong>Lead Flow</strong>
          {flow && <FlowStatusBadge status={flow.status} />}
        </div>
        <Field label="Attach Lead Flow">
          <select value={p.flowId ?? ''} disabled={p.status === 'published'} onChange={(e) => setP({ ...p, flowId: e.target.value || undefined })}>
            <option value="">No Lead Flow</option>
            {commentFlows.map((f) => (
              <option key={f.id} value={f.id}>{f.name} · keyword {f.trigger.keyword}</option>
            ))}
          </select>
        </Field>
        {flow && (
          <>
            <p className="small">
              Comment <span className="kw">{flow.trigger.keyword}</span> → sends “{flow.resource.title}”.
              {p.status !== 'published' && ' The flow waits until this post is published and has a post ID.'}
            </p>
            {keywordMissing && p.status !== 'published' && (
              <p className="field-error">The caption doesn’t mention {flow.trigger.keyword}, so people won’t know what to comment.</p>
            )}
            {p.status !== 'published' && <button className="btn btn-sm btn-secondary" onClick={insertCta}>Insert CTA</button>}
          </>
        )}
      </div>

      {p.status !== 'published' && (
        <div className="grid-2 mt">
          <Field label="Date"><input type="date" min={tomorrow} value={p.date ?? ''} onChange={(e) => setP({ ...p, date: e.target.value || null })} /></Field>
          <Field label="Time"><input type="time" value={p.time ?? ''} onChange={(e) => setP({ ...p, time: e.target.value || null })} /></Field>
        </div>
      )}
      {p.status === 'scheduled' && <p className="muted xsmall">“Simulate publish” stands in for the moment Instagram publishes the post. Turn on “Next publish fails” in Demo controls to see the failure state.</p>}
    </Modal>
  );
}

const TILE_STYLES: [string, string, string][] = [
  ['#2855F8', '#7C97FF', '#FFFFFF'],
  ['#15171C', '#3A3F4B', '#FFFFFF'],
  ['#E9E2D4', '#F8F7F4', '#15171C'],
  ['#0F6F78', '#63AFA9', '#FFFFFF'],
  ['#C8D4EA', '#EEF1F6', '#15171C'],
  ['#C9A27A', '#EBD9C3', '#15171C'],
];

/** Visual stand-in for post media in the demo (no real images are loaded). */
export function PostTile({ post }: { post: Post }) {
  let h = 0;
  for (const ch of post.id + post.title) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const [a, b, ink] = TILE_STYLES[h % TILE_STYLES.length];
  return (
    <span className="post-tile" style={{ background: `linear-gradient(140deg, ${a}, ${b})`, color: ink }}>
      <span className="post-tile-format">{post.format}</span>
      <span className="post-tile-title">{post.title}</span>
    </span>
  );
}
