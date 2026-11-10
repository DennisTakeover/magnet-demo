import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, Search, Sparkles, Send, Hand, Play, AlertTriangle, CalendarPlus, Lightbulb, ListPlus, Link2, MessageSquareDashed, CheckCircle2, Clock,
  Inbox as InboxIcon, Pencil, ArrowUpRight, Check, Megaphone, Tag, MousePointerClick, Target, StickyNote, MoreHorizontal, SquarePen, FileText,
} from 'lucide-react';
import { clientLog, clockTime, markActivation, navigate, uid, usePersona, useStore } from '../store';
import { accountLabel, inAccount } from '../accounts';
import { can } from '../team';
import UpgradeHint from '../components/UpgradeHint';
import OpsBanner from '../components/OpsBanner';
import { blockedBy } from '../ops';
import { t } from '../i18n/locale';
import { contactRepliesToFlow, contactTapsOpening, demoContacts } from '../flowEngine';
import { Avatar, Badge, Empty, ExecBadge, LEAD_STATUSES, LeadBadge, Modal, PageHeader, leadLabel, timeAgo } from '../components/ui';
import type { Conversation, Flow, LeadStatus, Message, State } from '../types';

type Filter = 'all' | 'needs' | 'unread' | 'flows';

function lastText(c: Conversation) {
  const m = [...c.messages].reverse().find((x) => x.from !== 'event') ?? c.messages[c.messages.length - 1];
  const prefix = m.from === 'me' ? 'You: ' : m.from === 'ai' ? 'AI: ' : m.from === 'flow' ? 'Flow: ' : '';
  return prefix + m.text;
}

function knowledgeMissing(s: State) {
  return s.sim.missingKnowledge || !s.business.faq.trim() || !s.business.offer.trim();
}

function originLine(c: Conversation, flow?: Flow) {
  if (flow) return `${flow.name} flow · Keyword ${c.origin.keyword}`;
  if (c.origin.type === 'story_reply') return 'Story reply';
  if (c.origin.type === 'comment') return 'Comment';
  return 'Direct message';
}

export default function Inbox({ id }: { id?: string }) {
  const { state } = useStore();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const all = state.sim.emptyInbox ? [] : inAccount(state, [...state.conversations]).sort((a, b) => b.lastAt - a.lastAt);
  const multi = state.accounts.length > 1 && state.activeAccount === 'all';
  const list = all.filter((c) => {
    if (q && !`${c.name} ${c.handle} ${c.messages.map((m) => m.text).join(' ')}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === 'unread') return c.unread;
    if (filter === 'needs') return c.needsYou || (c.unread && !c.takenOver);
    if (filter === 'flows') return Boolean(c.origin.flowId);
    return true;
  });
  const active = all.find((c) => c.id === id);

  const toReview = inAccount(state, state.conversations).filter((c) => c.unread || c.needsYou).length;
  const header = <><PageHeader title={<>{t('nav.inbox')}{toReview > 0 && <span className="title-badge">{toReview} to review</span>}</>} subtitle={t('inbox.sub')} /><OpsBanner module="ai" /><OpsBanner module="flows" /></>;

  if (all.length === 0) {
    return (
      <>
        {header}
        <div className="inbox-empty card">
          <Empty icon={<InboxIcon size={28} />} title="No conversations yet">
            When someone sends you a DM, replies to a story or requests a Lead Flow resource, the conversation shows up here.
          </Empty>
          <div className="row center gap-sm">
            <a className="btn btn-primary" href="#/app/flows">Set up a Lead Flow</a>
            <a className="btn btn-soft" href="#/app/grow">Review your audience</a>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="inbox-header">{header}</div>
      <UpgradeHint
        module="flows"
        context="inbox"
        title="Send your guide automatically when someone comments a keyword"
        body="Lead Flows reply to a comment or DM keyword with your resource and start the conversation here, so you only step in when it matters."
        limits="each person gets it once per flow"
        example={[{ label: 'Trigger', value: 'Comment “GUIDE” on your latest post' }, { label: 'Sends', value: 'Your PDF with a short message' }, { label: 'Last 30 days (example)', value: '42 requests → 11 conversations' }]}
      />
      <div className={`inbox ${active ? 'has-active' : ''}`}>
        <section className="inbox-list panel" aria-label="Conversations">
          <div className="inbox-list-head">
            <div className="row between">
              <h2>Conversations</h2>
              <a className="icon-btn boxed" href="#/app/flows" aria-label="New Lead Flow" title="New Lead Flow"><SquarePen size={18} /></a>
            </div>
            <div className="search">
              <Search size={18} aria-hidden />
              <label className="sr-only" htmlFor="inbox-q">Search conversations</label>
              <input id="inbox-q" placeholder="Search conversations…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="tab-pills" role="radiogroup" aria-label="Filter conversations">
              {([['all', 'All'], ['needs', 'Needs you'], ['unread', 'Unread'], ['flows', 'Flows']] as const).map(([k, l]) => (
                <button key={k} role="radio" aria-checked={filter === k} className={filter === k ? 'on' : ''} onClick={() => setFilter(k)}>{l}</button>
              ))}
            </div>
          </div>
          <ul>
            {list.map((c) => (
              <li key={c.id}>
                <a href={`#/app/inbox/${c.id}`} className={`conv-item ${c.id === id ? 'active' : ''} ${c.unread ? 'unread' : ''}`} aria-current={c.id === id ? 'true' : undefined}>
                  <Avatar name={c.name} color={c.color} size={52} />
                  <span className="conv-body">
                    <span className="conv-top">
                      <strong>{c.name}</strong>
                      <span className="conv-time">{timeAgo(c.lastAt)}</span>
                    </span>
                    <span className="conv-snippet">{lastText(c)}</span>
                    {multi && <span className="acct-chip"><i style={{ background: state.accounts.find((a) => a.id === (c.accountId ?? 'acc1'))?.color }} />{accountLabel(state, c.accountId)}</span>}
                    {(c.needsYou || c.takenOver || c.awaitingReply) && (
                      <span className="conv-tags">
                        {c.needsYou && <Badge tone="red">Needs you</Badge>}
                        {c.awaitingReply && <Badge tone="blue">Awaiting reply</Badge>}
                        {c.takenOver && <Badge tone="amber">You took over</Badge>}
                      </span>
                    )}
                  </span>
                  {c.unread && <span className="unread-dot" aria-label="Unread" />}
                </a>
              </li>
            ))}
            {list.length === 0 && <li className="muted small pad">No conversations match.</li>}
          </ul>
        </section>
        {active ? (
          <Chat key={active.id} conv={active} />
        ) : (
          <section className="chat panel chat-placeholder">
            <Empty icon={<MessageSquareDashed size={28} />} title="Select a conversation">Pick a conversation on the left to read and reply.</Empty>
          </section>
        )}
      </div>
    </>
  );
}

function ResourceCard({ title, kind, button }: { title: string; kind: 'pdf' | 'link'; button: string }) {
  return (
    <div className="resource-card">
      <span className="resource-thumb" aria-hidden>
        <span>{title}</span>
      </span>
      <span className="resource-body">
        <strong>{title}</strong>
        <span className="muted small">{kind === 'pdf' ? 'Free PDF · delivered as a download link' : 'Link'}</span>
      </span>
      <span className="btn btn-soft btn-sm resource-btn" aria-hidden>
        {button.startsWith('Get') ? 'Open guide' : button} <ArrowUpRight size={14} />
      </span>
    </div>
  );
}

function Chat({ conv }: { conv: Conversation }) {
  const { state, update, toast, queued, cancelQueued, queueAutoReply, simulateContactMessage } = useStore();
  const persona = usePersona();
  const [draft, setDraft] = useState('');
  const [draftIsAi, setDraftIsAi] = useState(false);
  const [review, setReview] = useState<string | null>(null);
  const [taskOpen, setTaskOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const draftRef = useRef<HTMLTextAreaElement>(null);
  const lead = state.leads.find((l) => l.conversationId === conv.id);
  const flow = state.flows.find((f) => f.id === conv.origin.flowId);
  const post = state.posts.find((p) => p.id === conv.origin.postId);
  const execs = state.executions.filter((e) => e.contactId === conv.contactId && e.flowId === conv.origin.flowId);
  const mode = state.aiMode;
  const isQueued = Boolean(queued[conv.id]);
  const lastFromContact = conv.messages[conv.messages.length - 1]?.from === 'contact';

  useEffect(() => {
    if (conv.unread) update((d) => void (d.conversations.find((c) => c.id === conv.id)!.unread = false));
  }, [conv.id, conv.unread, update]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [conv.messages.length, isQueued, draftIsAi]);

  const generate = () => {
    setReview(null);
    if (blockedBy(state, 'ai')) return setReview('AI replies are temporarily paused by the MAGNET team. You can still write and send replies yourself.');
    if (conv.needsYou) return setReview('This conversation needs you: it is a complaint and a request for a person. AI does not draft a reply.');
    if (knowledgeMissing(state)) return setReview('Your business info is incomplete, so AI can’t write a reliable reply. Add your offer and FAQ in Settings, or write the reply yourself.');
    const next = conv.replyScript[0];
    if (!next) {
      const topic = conv.reviewTopic ?? 'this question';
      return setReview(`Needs review: your business knowledge doesn’t cover ${topic}. AI won’t guess. Write the reply yourself or add the information in Settings.`);
    }
    setDraft(next);
    setDraftIsAi(true);
  };

  const send = (text = draft, viaAi = draftIsAi) => {
    if (!text.trim()) return;
    if (!can(state, 'sendReplies')) {
      toast('You can read this conversation, but the owner hasn’t allowed you to send replies.', 'warning');
      return;
    }
    if (state.connection === 'disconnected') {
      toast('Instagram is disconnected. Reconnect to send messages.', 'error');
      return;
    }
    update((d) => {
      const c = d.conversations.find((x) => x.id === conv.id)!;
      // Keep the scripted demo replies in step with the conversation
      c.replyScript.shift();
      c.messages.push({ id: uid('m'), from: 'me', text, time: clockTime(), note: viaAi ? 'AI suggestion, approved by you' : undefined });
      c.lastAt = Date.now();
      c.unread = false;
      clientLog(d, 'inbox', `Replied to ${c.name} (demo)`);
      if (viaAi) markActivation(d, 'ai_reply');
    });
    setDraft('');
    setDraftIsAi(false);
    toast('Demo reply added. Nothing was sent to Instagram.', 'success');
    if (!conv.needsYou) simulateContactMessage(conv.id, 2600);
  };

  const takeOver = () => {
    const hadQueued = cancelQueued(conv.id);
    update((d) => {
      const c = d.conversations.find((x) => x.id === conv.id)!;
      c.takenOver = true;
      if (c.pendingFlowExecId) {
        const ex = d.executions.find((e) => e.id === c.pendingFlowExecId);
        if (ex) {
          ex.status = 'Suppressed';
          ex.log.push('Stopped: you took over the conversation');
        }
        c.pendingFlowExecId = undefined;
      }
      clientLog(d, 'inbox', `Took over conversation with ${c.name}`);
    });
    setDraftIsAi(false);
    toast(hadQueued ? 'You took over. The queued AI reply was removed.' : 'You took over. AI and Lead Flow steps are paused here.', 'info');
  };

  const resume = () => {
    update((d) => {
      const c = d.conversations.find((x) => x.id === conv.id)!;
      c.takenOver = false;
      clientLog(d, 'inbox', `Resumed AI for conversation with ${c.name}`);
    });
    toast('AI resumed for this conversation', 'info');
    if (mode === 'auto' && lastFromContact && !conv.needsYou && conv.replyScript.length) queueAutoReply(conv.id);
  };

  const setLeadStatus = (status: LeadStatus, why?: string) => {
    let leadId = lead?.id;
    update((d) => {
      const c = d.conversations.find((x) => x.id === conv.id)!;
      let l = d.leads.find((x) => x.conversationId === conv.id);
      if (!l) {
        leadId = uid('l');
        l = {
          id: leadId,
          name: c.name,
          handle: c.handle,
          status,
          source: c.origin.flowId ? `Lead Flow · ${d.flows.find((f) => f.id === c.origin.flowId)?.name}` : c.origin.type === 'story_reply' ? 'Story reply' : 'Direct message',
          nextAction: status === 'qualified' ? persona.ctaLabel : 'Follow up',
          tasks: [],
          conversationId: c.id,
          updatedAt: Date.now(),
          createdAt: Date.now(),
        };
        d.leads.unshift(l);
      } else {
        l.status = status;
        l.updatedAt = Date.now();
        if (status === 'qualified') l.nextAction = persona.ctaLabel;
      }
      if (status === 'qualified' && c.origin.flowId) {
        const f = d.flows.find((x) => x.id === c.origin.flowId);
        if (f) f.stats.qualified += 1;
      }
      c.leadSuggestion = null;
      clientLog(d, 'lead', `Set ${c.name} to ${leadLabel(status)}${why ? ` (${why})` : ''}`);
    });
    toast(`${conv.name} is now ${leadLabel(status)}`, 'success', { label: 'Open in Leads', href: `/app/leads/${leadId}` });
  };

  const sendBooking = () => {
    const text = persona.ctaMessage(state.business.bookingLink);
    send(text, false);
    update((d) => {
      const l = d.leads.find((x) => x.conversationId === conv.id);
      if (l) l.nextAction = `${persona.ctaLabel.replace('Send ', '')} sent · waiting for ${persona.stage4.toLowerCase()}`;
    });
  };

  const simulateBooking = () => {
    update((d) => {
      const c = d.conversations.find((x) => x.id === conv.id)!;
      c.messages.push({ id: uid('m'), from: 'event', text: persona.eventText, time: clockTime() });
      const l = d.leads.find((x) => x.conversationId === conv.id);
      if (l) {
        l.status = 'booked';
        l.nextAction = persona.afterEventAction;
        l.updatedAt = Date.now();
      }
      if (c.origin.flowId) {
        const f = d.flows.find((x) => x.id === c.origin.flowId);
        if (f) f.stats.booked += 1;
      }
      clientLog(d, 'lead', `${persona.stage4} for ${c.name} (demo event)`);
    });
    toast(`${persona.eventText.split(':')[0]}. Lead moved to ${persona.stage4}.`, 'success');
  };

  const createIdea = () => {
    const postId = uid('p');
    update((d) => {
      d.posts.push({
        id: postId,
        title: persona.contentIdea.title,
        caption: persona.contentIdea.caption,
        format: persona.contentIdea.format,
        status: 'draft',
        date: null,
        time: null,
        fromConversation: true,
      });
      clientLog(d, 'post', 'Created content idea from a conversation (draft)');
    });
    toast('Content idea saved as a draft in Planner. No personal details were used.', 'success', { label: 'Open draft', href: `/app/planner/${postId}` });
  };

  const contacts = demoContacts(state.persona);
  const contactIndex = contacts.findIndex((c) => c.name === conv.name);
  const canSimReply = conv.awaitingReply && !conv.pendingFlowExecId && (conv.contactScript.length > 0 || contactIndex >= 0);
  const clickedExec = execs.find((e) => e.status === 'Sent');

  const renderMessage = (m: Message) => {
    if (m.from === 'event') return <div key={m.id} className="msg-event">{m.text} · {m.time}</div>;
    if (m.from === 'contact') {
      return (
        <div key={m.id} className="msg msg-in">
          <Avatar name={conv.name} color={conv.color} size={36} />
          <div className="msg-col">
            <div className="bubble">{m.text}</div>
            <span className="msg-meta">{m.time}</span>
          </div>
        </div>
      );
    }
    return (
      <div key={m.id} className={`msg msg-out ${m.from}`}>
        <div className="msg-col">
          {(m.from === 'flow' || m.from === 'ai' || m.note) && (
            <span className="msg-label">{m.from === 'flow' ? <Link2 size={12} /> : <Sparkles size={12} />} {m.note}</span>
          )}
          <div className="bubble">{m.text}</div>
          <span className="msg-meta">{m.time} <Check size={14} aria-label="Delivered (demo)" /></span>
          {m.button && flow && (m.button === flow.resource.buttonText ? (
            <>
              <ResourceCard title={flow.resource.title} kind={flow.resource.kind} button={m.button} />
              <span className="msg-meta">{m.time} <Check size={14} aria-hidden /></span>
            </>
          ) : (
            <span className="bubble-option">{m.button}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <section className="chat panel" aria-label={`Conversation with ${conv.name}`}>
        <header className="chat-head">
          <button className="icon-btn mobile-only" aria-label="Back to conversations" onClick={() => navigate('/app/inbox')}>
            <ArrowLeft size={20} />
          </button>
          <Avatar name={conv.name} color={conv.color} size={56} />
          <div className="chat-title">
            <span className="row gap-sm wrap">
              <strong>{conv.name}</strong>
              {lead ? <LeadBadge status={lead.status} reason={lead.closedReason} /> : conv.needsYou ? <Badge tone="red">Needs you</Badge> : null}
            </span>
            <span className="muted small">{originLine(conv, flow)}</span>
          </div>
          <div className="chat-actions">
            <a className={`ai-pill mode-${conv.takenOver ? 'you' : mode}`} href="#/app/settings?tab=ai" title="Change AI mode">
              <Sparkles size={16} aria-hidden />
              {conv.takenOver ? 'You’re handling this' : mode === 'off' ? 'AI off' : mode === 'assist' ? 'AI Assist' : 'AI Auto'}
            </a>
            {conv.takenOver ? (
              <button className="btn btn-secondary" onClick={resume}><Play size={16} /> Resume AI</button>
            ) : (
              <button className="btn btn-secondary" onClick={takeOver}><Hand size={16} /> Take over</button>
            )}
            <button className="icon-btn panel-toggle" aria-label="Contact details" onClick={() => setPanelOpen(true)}><MoreHorizontal size={20} /></button>
          </div>
        </header>

        {conv.needsYou && (
          <div className="banner banner-red">
            <AlertTriangle size={18} aria-hidden />
            <span><strong>Needs you.</strong> This is a complaint and a request to talk to a person, so AI won’t reply.</span>
            <button className="btn btn-sm btn-secondary" onClick={() => update((d) => void (d.conversations.find((c) => c.id === conv.id)!.needsYou = false))}>Mark as handled</button>
          </div>
        )}
        {conv.takenOver && (
          <div className="banner banner-amber">
            <Hand size={18} aria-hidden />
            <span>You took over. AI replies and Lead Flow follow-ups are paused for this conversation until you resume.</span>
          </div>
        )}

        <div className="messages">
          <div className="day-divider"><span>Today</span></div>
          {conv.followedAt && <div className="msg-event">{conv.followedAt} (separate event)</div>}
          {conv.messages.map(renderMessage)}
          {conv.awaitingReply && (
            <div className="awaiting">
              <Clock size={16} aria-hidden />
              <div>
                <strong>Awaiting reply</strong>
                <p className="small">{conv.pendingFlowExecId ? 'Opening sent. The resource follows once they tap the button.' : 'Private reply sent. A two-way conversation opens once they reply.'}</p>
              </div>
            </div>
          )}
          {isQueued && (
            <div className="queued">
              <Sparkles size={14} /> AI reply queued (Auto mode). Press <strong>Take over</strong> to remove it.
            </div>
          )}
          {conv.leadSuggestion && (
            <div className="lead-suggest">
              <span className="ai-label"><Sparkles size={14} /> Lead suggestion</span>
              <p>
                Suggest status <strong>{leadLabel(conv.leadSuggestion.status)}</strong>. {conv.leadSuggestion.reason}
              </p>
              <blockquote>“{conv.leadSuggestion.quote}”</blockquote>
              <div className="row gap-sm">
                <button className="btn btn-primary btn-sm" onClick={() => setLeadStatus(conv.leadSuggestion!.status, 'confirmed AI suggestion')}>
                  <CheckCircle2 size={16} /> Mark as qualified
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => update((d) => void (d.conversations.find((c) => c.id === conv.id)!.leadSuggestion = null))}>Dismiss</button>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="demo-sim-row" aria-label="Demo simulation">
          <span className="muted xsmall">Demo:</span>
          {conv.pendingFlowExecId && !conv.takenOver && (
            <button className="btn btn-xs btn-ghost" onClick={() => { update((d) => contactTapsOpening(d, conv.id)); toast('Contact tapped the button. Resource sent.', 'info'); }}>
              Contact taps “{flow?.message.openingButton}”
            </button>
          )}
          {canSimReply && (
            <button
              className="btn btn-xs btn-ghost"
              onClick={() => {
                if (contactIndex >= 0 && contacts[contactIndex].reply) {
                  update((d) => contactRepliesToFlow(d, conv.id, contactIndex));
                  if (mode === 'auto' && !conv.takenOver) queueAutoReply(conv.id);
                } else simulateContactMessage(conv.id, 200);
              }}
            >
              Contact replies
            </button>
          )}
          {!conv.awaitingReply && conv.contactScript.length > 0 && (
            <button className="btn btn-xs btn-ghost" onClick={() => simulateContactMessage(conv.id, 200)}>Simulate new message</button>
          )}
          {!canSimReply && !conv.pendingFlowExecId && conv.contactScript.length === 0 && <span className="muted xsmall">no scripted messages left</span>}
        </div>

        {draftIsAi && draft ? (
          <div className="ai-draft">
            <div className="ai-draft-head">
              <span className="ai-label"><Sparkles size={16} /> AI draft</span>
              <span className="muted small">This is a draft, not sent.</span>
            </div>
            <label className="sr-only" htmlFor="composer">AI suggested reply</label>
            <textarea
              id="composer"
              ref={draftRef}
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
              }}
            />
            <div className="ai-draft-actions">
              <button className="link-btn" onClick={() => draftRef.current?.focus()}><Pencil size={16} /> Edit reply</button>
              <button className="link-btn muted-link" onClick={generate}>Regenerate</button>
              <div className="spacer" />
              <button className="btn btn-primary" disabled={!draft.trim()} onClick={() => send()}>
                <Send size={16} /> Approve & send
              </button>
            </div>
          </div>
        ) : (
          <div className="composer">
            {review && (
              <div className="review-note">
                <AlertTriangle size={16} aria-hidden /> <span>{review}</span>
                {review.includes('Settings') && <a href="#/app/settings">Open Settings</a>}
              </div>
            )}
            <label className="sr-only" htmlFor="composer">Reply</label>
            <textarea
              id="composer"
              rows={2}
              placeholder={mode === 'off' ? 'Write a reply… (AI is off)' : 'Write a reply, or let AI suggest one'}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setDraftIsAi(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send();
              }}
            />
            <div className="composer-actions">
              {mode !== 'off' && !conv.takenOver && (
                <button className="btn btn-soft" onClick={generate}>
                  <Sparkles size={16} /> Generate reply
                </button>
              )}
              {mode === 'off' && <span className="muted small">AI is off. Change it in Settings.</span>}
              <div className="spacer" />
              <button className="btn btn-primary" disabled={!draft.trim()} onClick={() => send()}>
                <Send size={16} /> Send (demo)
              </button>
            </div>
          </div>
        )}
      </section>

      <aside className={`contact-panel panel ${panelOpen ? 'open' : ''}`} aria-label="Contact details">
        <div className="panel-mobile-head">
          <strong>Details</strong>
          <button className="btn btn-sm btn-ghost" onClick={() => setPanelOpen(false)}>Close</button>
        </div>
        <Avatar name={conv.name} color={conv.color} size={104} />
        <div className="contact-name">
          <strong>{conv.name}</strong>
          {lead && <LeadBadge status={lead.status} reason={lead.closedReason} />}
        </div>
        <span className="muted">{conv.handle}</span>

        <dl className="info-rows">
          <div>
            <dt><Megaphone size={20} aria-hidden /></dt>
            <dd>
              <span className="muted small">Source</span>
              <strong>{flow ? flow.name : conv.origin.type === 'story_reply' ? 'Story reply' : conv.origin.type === 'comment' ? 'Comment' : 'Direct message'}</strong>
              <span className="muted small">{conv.origin.label}</span>
            </dd>
          </div>
          {flow && (
            <>
              <div>
                <dt><Tag size={20} aria-hidden /></dt>
                <dd>
                  <span className="muted small">Keyword</span>
                  <strong>{conv.origin.keyword}</strong>
                  {post && <span className="muted small">on “{post.title}”</span>}
                </dd>
              </div>
              <div>
                <dt><FileText size={20} aria-hidden /></dt>
                <dd>
                  <span className="muted small">Resource</span>
                  <strong>{conv.origin.resource}</strong>
                  {clickedExec ? <span className="muted small">Sent {timeAgo(clickedExec.time)} · link clicks are tracked per flow</span> : <span className="muted small">Not sent yet</span>}
                </dd>
              </div>
            </>
          )}
          <div>
            <dt><Target size={20} aria-hidden /></dt>
            <dd>
              <span className="muted small">Next action</span>
              {lead ? (
                <>
                  <label className="sr-only" htmlFor="lead-status">Lead status</label>
                  <select id="lead-status" className="bare-select" value={lead.status} onChange={(e) => setLeadStatus(e.target.value as LeadStatus)}>
                    {LEAD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  <strong className="small">{lead.nextAction}</strong>
                </>
              ) : (
                <strong>Understand what they need</strong>
              )}
            </dd>
          </div>
          {execs.length > 0 && (
            <div>
              <dt><MousePointerClick size={20} aria-hidden /></dt>
              <dd>
                <span className="muted small">Flow history</span>
                {execs.map((e) => (
                  <span key={e.id} className="small hist"><ExecBadge status={e.status} /> {e.log[1] ?? e.log[0]}</span>
                ))}
              </dd>
            </div>
          )}
        </dl>

        {!lead && <p className="muted xsmall">Not a lead yet. Requesting a resource or following you doesn’t make someone a lead.</p>}
        {lead?.status !== 'qualified' && lead?.status !== 'booked' && lead?.status !== 'closed' && (
          <button className="btn btn-soft btn-block btn-lg" onClick={() => setLeadStatus('qualified')}><CheckCircle2 size={18} /> Mark as qualified</button>
        )}
        <div className="panel-actions">
          {!lead && <button className="btn btn-sm btn-ghost" onClick={() => setLeadStatus('interested')}>Mark as interested</button>}
          <button className="btn btn-sm btn-ghost" onClick={() => setTaskOpen(true)}><ListPlus size={16} /> Add task</button>
          <button className="btn btn-sm btn-ghost" onClick={sendBooking}><Link2 size={16} /> {persona.ctaLabel}</button>
          {lead && lead.status !== 'booked' && lead.status !== 'closed' && (
            <button className="btn btn-sm btn-ghost" onClick={simulateBooking}><CalendarPlus size={16} /> {persona.eventButton}</button>
          )}
          <button className="btn btn-sm btn-ghost" onClick={createIdea}><Lightbulb size={16} /> Create content idea</button>
        </div>

        <div className="notes-box">
          <label htmlFor="conv-note" className="row gap-sm"><StickyNote size={18} aria-hidden /> Notes</label>
          <textarea
            id="conv-note"
            rows={3}
            placeholder="Add a note…"
            defaultValue={conv.note ?? ''}
            onBlur={(e) => {
              const v = e.target.value;
              if (v !== (conv.note ?? '')) {
                update((d) => void (d.conversations.find((c) => c.id === conv.id)!.note = v));
                toast('Note saved', 'info');
              }
            }}
          />
        </div>
      </aside>
      {panelOpen && <div className="scrim panel-scrim" onClick={() => setPanelOpen(false)} />}

      {taskOpen && <TaskModal convId={conv.id} name={conv.name} onClose={() => setTaskOpen(false)} />}
    </>
  );
}

function TaskModal({ convId, name, onClose }: { convId: string; name: string; onClose: () => void }) {
  const { update, toast } = useStore();
  const [text, setText] = useState(`Follow up with ${name.split(' ')[0]}`);
  const save = () => {
    update((d) => {
      let l = d.leads.find((x) => x.conversationId === convId);
      const c = d.conversations.find((x) => x.id === convId)!;
      if (!l) {
        l = { id: uid('l'), name: c.name, handle: c.handle, status: 'new', source: 'Direct message', nextAction: text, tasks: [], conversationId: convId, updatedAt: Date.now(), createdAt: Date.now() };
        d.leads.unshift(l);
      }
      l.tasks.push({ id: uid('t'), text, done: false });
      l.nextAction = text;
      clientLog(d, 'lead', `Added task for ${c.name}: ${text}`);
    });
    toast('Task added');
    onClose();
  };
  return (
    <Modal title="Add follow-up task" onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={save}>Add task</button></>}>
      <label className="field">
        <span className="field-label">Task</span>
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
      </label>
    </Modal>
  );
}
