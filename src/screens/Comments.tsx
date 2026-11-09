import { useState } from 'react';
import { Check, ClipboardCopy, Lock, Pencil, Plus, SkipForward, Sparkles, Trash2, X } from 'lucide-react';
import { clientLog, markActivation, uid, useStore } from '../store';
import OpsBanner from '../components/OpsBanner';
import { blockedBy } from '../ops';
import { Avatar, Badge, Field, Modal, PageHeader, Segmented, timeAgo } from '../components/ui';
import { PostTile } from './Planner';
import type { CommentDraft, CommentState } from '../types';

type Filter = 'review' | 'approved' | 'posted_manual' | 'skipped';

const STATE_LABEL: Record<CommentState, string> = {
  review: 'Needs review',
  approved: 'Approved · not posted',
  posted_manual: 'Posted manually (user-reported)',
  skipped: 'Skipped',
};

const DAILY_CAP = 15;

export default function Comments() {
  const { state, update, toast } = useStore();
  const [filter, setFilter] = useState<Filter>('review');
  const [editing, setEditing] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [newTarget, setNewTarget] = useState('');

  const drafts = state.commentDrafts;
  const shown = drafts.filter((d) => d.state === filter).sort((a, b) => b.time - a.time);
  const count = (s: CommentState) => drafts.filter((d) => d.state === s).length;
  const postedToday = drafts.filter((d) => d.state === 'posted_manual' && d.postedAt && Date.now() - d.postedAt < 86_400_000).length;

  const change = (id: string, fn: (d: CommentDraft) => void, log: string) =>
    update((s) => {
      const d = s.commentDrafts.find((x) => x.id === id)!;
      fn(d);
      clientLog(s, 'inbox', log);
    });

  const approve = (d: CommentDraft) => {
    if (blockedBy(state, 'comments')) return toast('The comment queue is paused by the MAGNET team. Try again later.', 'warning');
    change(d.id, (x) => { x.state = 'approved'; x.approvedAt = Date.now(); }, `Approved comment for ${d.targetHandle} (revision ${d.revision})`);
    update((s) => markActivation(s, 'comment_approved'));
    toast('Approved. Copy it and post it on Instagram yourself; automatic posting isn’t available.', 'success');
  };

  const saveEdit = (d: CommentDraft) => {
    if (!text.trim()) return;
    const wasApproved = d.state === 'approved';
    change(d.id, (x) => {
      x.draft = text.trim();
      x.revision += 1;
      // An edit invalidates the earlier approval
      x.state = 'review';
      x.approvedAt = undefined;
    }, `Edited comment for ${d.targetHandle} (now revision ${d.revision + 1})`);
    setEditing(null);
    toast(wasApproved ? 'Saved. The earlier approval no longer applies: review it again.' : 'Draft saved', 'info');
  };

  const copy = (d: CommentDraft) => {
    navigator.clipboard?.writeText(d.draft).then(
      () => toast('Comment copied. Paste it under the post on Instagram.', 'info'),
      () => toast('Couldn’t copy automatically. Select the text and copy it yourself.', 'warning'),
    );
  };

  const markPosted = (d: CommentDraft) => {
    change(d.id, (x) => { x.state = 'posted_manual'; x.postedAt = Date.now(); }, `Reported comment on ${d.targetHandle} as posted manually`);
    toast('Marked as posted by you. This is user-reported, not confirmed by Instagram.', 'success');
  };

  const addTarget = () => {
    const h = newTarget.trim().replace(/\s+/g, '');
    if (!h) return;
    const handle = h.startsWith('@') ? h.toLowerCase() : `@${h.toLowerCase()}`;
    if (state.commentTargets.some((t) => t.handle === handle)) return toast('That account is already a target', 'warning');
    update((s) => {
      s.commentTargets.push({ id: uid('ct'), handle, name: handle.slice(1), topic: 'Added by you', reason: 'Added manually by you' });
      clientLog(s, 'setting', `Added comment target ${handle}`);
    });
    setNewTarget('');
    toast(`${handle} added. Add a post from this account to get a draft.`);
  };

  return (
    <>
      <PageHeader
        title="Be seen where your audience already is."
        subtitle="Pick accounts your ideal customers follow. MAGNET drafts a useful comment for their posts; you review every one before it goes out."
        actions={<button className="btn btn-primary" onClick={() => setAddOpen(true)}><Plus size={16} /> Add a post</button>}
      />
      <OpsBanner module="comments" />

      <div className="cm-notice">
        <Lock size={16} aria-hidden />
        <span>
          <strong>Automatic posting is off.</strong> It stays off until posting to other accounts is verified for your account. Approved comments are copied and posted by you.
        </span>
      </div>

      <div className="metric-grid cm-stats">
        <div className="metric"><span className="metric-label">To review</span><span className="metric-value">{count('review')}</span></div>
        <div className="metric"><span className="metric-label">Approved, not posted</span><span className="metric-value">{count('approved')}</span></div>
        <div className="metric"><span className="metric-label">Posted by you today</span><span className="metric-value">{postedToday} <span className="cm-cap">/ {DAILY_CAP}</span></span></div>
        <div className="metric"><span className="metric-label">Skipped</span><span className="metric-value">{count('skipped')}</span></div>
      </div>

      <div className="cm-layout">
        <section className="card cm-queue" aria-labelledby="queue">
          <div className="card-head">
            <h2 id="queue">Comment queue</h2>
            <Segmented
              label="Filter comments"
              value={filter}
              onChange={setFilter}
              options={[
                { id: 'review', label: `Review (${count('review')})` },
                { id: 'approved', label: 'Approved' },
                { id: 'posted_manual', label: 'Posted' },
                { id: 'skipped', label: 'Skipped' },
              ]}
            />
          </div>

          {shown.length === 0 && <p className="muted pad">Nothing here right now.</p>}

          <ul className="cm-list">
            {shown.map((d) => (
              <li key={d.id} className="cm-item">
                <div className="cm-post">
                  <span className="cm-thumb"><PostTile post={{ id: d.id, title: d.postTitle, caption: d.postCaption, format: d.format, status: 'published', date: null, time: null }} /></span>
                  <div className="cm-post-body">
                    <span className="row gap-sm">
                      <Avatar name={d.targetName} color={d.targetColor} size={24} />
                      <strong>{d.targetHandle}</strong>
                      <span className="muted xsmall">{timeAgo(d.time)} · {d.source === 'manual' ? 'added by you' : 'found in your targets'}</span>
                    </span>
                    <p className="cm-caption">{d.postCaption}</p>
                  </div>
                </div>

                <div className="cm-draft">
                  <span className="cm-draft-head">
                    <span className="ai-label"><Sparkles size={14} /> Suggested comment</span>
                    <Badge tone={d.state === 'posted_manual' ? 'green' : d.state === 'approved' ? 'blue' : d.state === 'skipped' ? 'neutral' : 'amber'}>{STATE_LABEL[d.state]}</Badge>
                  </span>
                  {editing === d.id ? (
                    <>
                      <label className="sr-only" htmlFor={`cm-${d.id}`}>Comment text</label>
                      <textarea id={`cm-${d.id}`} rows={3} value={text} onChange={(e) => setText(e.target.value)} />
                      <div className="row gap-sm">
                        <button className="btn btn-primary btn-sm" onClick={() => saveEdit(d)}><Check size={14} /> Save</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}><X size={14} /> Cancel</button>
                      </div>
                    </>
                  ) : (
                    <p className="cm-text">{d.draft || <span className="muted">No draft yet.</span>}</p>
                  )}
                  <span className="muted xsmall">Revision {d.revision}{d.approvedAt ? ` · approved ${timeAgo(d.approvedAt)}` : ''}{d.postedAt ? ` · reported posted ${timeAgo(d.postedAt)}` : ''}</span>

                  {editing !== d.id && (
                    <div className="cm-actions">
                      {d.state === 'review' && (
                        <>
                          <button className="btn btn-primary btn-sm" disabled={!d.draft} onClick={() => approve(d)}><Check size={14} /> Approve</button>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditing(d.id); setText(d.draft); }}><Pencil size={14} /> Edit</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { change(d.id, (x) => { x.state = 'skipped'; }, `Skipped post from ${d.targetHandle}`); toast('Skipped', 'info'); }}><SkipForward size={14} /> Skip</button>
                        </>
                      )}
                      {d.state === 'approved' && (
                        <>
                          <button className="btn btn-primary btn-sm" onClick={() => copy(d)}><ClipboardCopy size={14} /> Copy text</button>
                          <button className="btn btn-secondary btn-sm" disabled={postedToday >= DAILY_CAP} onClick={() => markPosted(d)}><Check size={14} /> I posted it</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => { setEditing(d.id); setText(d.draft); }}><Pencil size={14} /> Edit</button>
                        </>
                      )}
                      {d.state === 'skipped' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => change(d.id, (x) => { x.state = 'review'; }, `Moved post from ${d.targetHandle} back to review`)}>Back to review</button>
                      )}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <aside className="card cm-targets" aria-labelledby="targets">
          <h2 id="targets">Target accounts</h2>
          <p className="muted small">Accounts whose followers match your audience. Their new posts show up in your queue.</p>
          <ul className="cm-target-list">
            {state.commentTargets.map((t) => (
              <li key={t.id}>
                <span>
                  <strong>{t.handle}</strong>
                  <span className="muted xsmall">{t.reason}</span>
                </span>
                <button
                  className="icon-btn"
                  aria-label={`Remove ${t.handle}`}
                  onClick={() => update((s) => {
                    s.commentTargets = s.commentTargets.filter((x) => x.id !== t.id);
                    clientLog(s, 'setting', `Removed comment target ${t.handle}`);
                  })}
                >
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
          <form className="row gap-sm" onSubmit={(e) => { e.preventDefault(); addTarget(); }}>
            <label className="sr-only" htmlFor="cm-target">Add target account</label>
            <input id="cm-target" placeholder="@account" value={newTarget} onChange={(e) => setNewTarget(e.target.value)} />
            <button className="btn btn-secondary" type="submit"><Plus size={16} /> Add</button>
          </form>
          <div className="cm-rules">
            <strong>How drafts are written</strong>
            <ul>
              <li>Adds something useful to the post: a tip or a question</li>
              <li>No made-up personal stories</li>
              <li>No generic praise and no links to your shop</li>
              <li>Never the same comment twice</li>
            </ul>
          </div>
        </aside>
      </div>

      {addOpen && <AddPostModal onClose={() => setAddOpen(false)} />}
    </>
  );
}

function AddPostModal({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useStore();
  const [target, setTarget] = useState(state.commentTargets[0]?.handle ?? '');
  const [link, setLink] = useState('');
  const [caption, setCaption] = useState('');
  const [draft, setDraft] = useState('');

  const generate = () => {
    if (caption.trim().length < 20) {
      setDraft('');
      toast('Add the post text first (at least a sentence), so the draft can respond to what the post actually says.', 'warning');
      return;
    }
    // Demo stand-in for AI: a neutral, specific question rather than praise or promotion
    const firstSentence = caption.trim().split(/(?<=[.!?])\s/)[0].replace(/[.!?]+$/, '');
    setDraft(`Interesting point about “${firstSentence.slice(0, 60)}${firstSentence.length > 60 ? '…' : ''}”. What made the biggest difference for you here?`);
  };

  const save = () => {
    const t = state.commentTargets.find((x) => x.handle === target);
    update((s) => {
      s.commentDrafts.unshift({
        id: uid('cd'),
        targetHandle: target,
        targetName: t?.name ?? target.slice(1),
        targetColor: '#2855f8',
        postTitle: caption.trim().slice(0, 40),
        postCaption: caption.trim(),
        format: 'Post',
        source: 'manual',
        draft: draft.trim(),
        revision: 1,
        state: 'review',
        time: Date.now(),
      });
      clientLog(s, 'inbox', `Added a post from ${target} to the comment queue`);
    });
    toast('Added to your review queue');
    onClose();
  };

  return (
    <Modal
      title="Add a post to comment on"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!target || caption.trim().length < 20} onClick={save}>Add to queue</button>
        </>
      }
    >
      <p className="muted small">Paste the post’s link and text. MAGNET can’t read other accounts’ posts automatically in this demo, so you supply the content.</p>
      <Field label="Account">
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {state.commentTargets.map((t) => <option key={t.id} value={t.handle}>{t.handle}</option>)}
        </select>
      </Field>
      <Field label="Post link (optional)"><input value={link} placeholder="https://www.instagram.com/p/…" onChange={(e) => setLink(e.target.value)} /></Field>
      <Field label="Post text" hint="Paste the caption so the draft responds to what the post says.">
        <textarea rows={3} value={caption} onChange={(e) => setCaption(e.target.value)} />
      </Field>
      <div className="row gap-sm">
        <button className="btn btn-soft" onClick={generate}><Sparkles size={16} /> Draft a comment</button>
      </div>
      {draft && (
        <Field label="Suggested comment" hint="You can still edit and must approve it in the queue.">
          <textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} />
        </Field>
      )}
    </Modal>
  );
}
