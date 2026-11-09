import { useEffect, useRef, useState } from 'react';
import { BookOpen, Bot, LifeBuoy, Search, Send, UserRound } from 'lucide-react';
import { Badge, Field, Modal, PageHeader, timeAgo } from '../components/ui';
import { clientLog, uid, useStore } from '../store';
import { t } from '../i18n/locale';
import { money } from '../i18n/locale';
import { moduleName, payableUsd, fmtDate } from '../billing';
import { SWITCH_LABEL } from '../ops';
import type { State } from '../types';

interface Article { id: string; title: string; keywords: string[]; body: string; link?: [string, string] }

/** Approved help content. The assistant answers only from these articles and the account status. */
export const ARTICLES: Article[] = [
  { id: 'connect', title: 'Connecting Instagram safely', keywords: ['connect', 'instagram', 'disconnected', 'reconnect', 'login', 'meta', 'facebook'], body: 'MAGNET connects through Instagram’s official login. You approve access on Instagram’s own screen; MAGNET never sees your password. If the connection drops, open Connect and choose Reconnect.', link: ['Open Connect', '/app/connect'] },
  { id: 'password', title: 'Why we never ask for your password', keywords: ['password', 'wachtwoord', 'credentials', 'safe', 'security', 'hacked'], body: 'A trustworthy tool never asks for your Instagram password. If anyone asks you to type it into their own form, don’t. MAGNET support will never ask for it either.', link: ['Read more on Connect', '/app/connect'] },
  { id: 'grow', title: 'How Grow works', keywords: ['grow', 'campaign', 'followers', 'audience', 'interactions', 'growth', 'limit', 'sources'], body: 'Grow runs interactions with people who match your audience, within your daily limit. You choose topics, sources, blocked words and protected accounts. You can pause the campaign any time.', link: ['Open Grow', '/app/grow'] },
  { id: 'flows', title: 'Lead Flows and keywords', keywords: ['lead flow', 'flow', 'keyword', 'comment', 'pdf', 'guide', 'resource', 'trigger'], body: 'A Lead Flow sends your resource when someone comments or DMs a keyword. Each person gets it once per flow. Test a flow before switching it on.', link: ['Open Lead Flows', '/app/flows'] },
  { id: 'ai', title: 'AI replies in the Inbox', keywords: ['ai', 'reply', 'inbox', 'dm', 'message', 'assist', 'auto', 'draft'], body: 'In Assist mode AI drafts replies and you approve them. AI only uses your business info; if something isn’t covered, it asks you instead of guessing. Complaints and requests for a person always go to you.', link: ['Open Inbox', '/app/inbox'] },
  { id: 'leads', title: 'When is someone a lead?', keywords: ['lead', 'leads', 'qualified', 'pipeline', 'booked', 'appointment'], body: 'A follower or resource request isn’t a lead by itself. Contacts become Qualified when they meet your criteria, and Booked only after a confirmed booking or order.', link: ['Open Leads', '/app/leads'] },
  { id: 'billing', title: 'Modules, invoices and changing your plan', keywords: ['billing', 'invoice', 'price', 'pay', 'payment', 'charge', 'plan', 'module', 'upgrade', 'downgrade', 'factuur'], body: 'Your plan is a set of modules. Adding a module starts now; removing one takes effect at your next renewal, and your data is kept. You see the exact price before you confirm.', link: ['Open Billing', '/app/billing'] },
  { id: 'cancel', title: 'Cancelling or pausing', keywords: ['cancel', 'opzeggen', 'stop', 'pause', 'quit', 'end subscription'], body: 'You can cancel yourself in Billing. You keep access until the end of the paid period. You’ll see any alternative once, and you can always continue to cancel.', link: ['Go to Billing', '/app/billing'] },
  { id: 'partner', title: 'Partner Program', keywords: ['partner', 'affiliate', 'referral', 'commission', 'influencer'], body: 'Customers can apply to promote MAGNET. Approved partners get an agreement with complimentary modules and commission on referred paying customers. It’s not guaranteed income.', link: ['Open Partner Program', '/app/partner'] },
  { id: 'team', title: 'Inviting team members', keywords: ['team', 'member', 'invite', 'colleague', 'assistant', 'access', 'role', 'permission'], body: 'Invite people in Settings → Team. You choose which modules they can use. Members never get billing or deletion rights by default.', link: ['Open Team settings', '/app/settings?tab=team'] },
];

const SUGGESTED = ['Is my Instagram connected?', 'When is my next payment?', 'How do I cancel?', 'Why is AI not replying?', 'Can you give me a refund?'];

type Msg = { id: string; from: 'you' | 'bot'; text: string; link?: [string, string]; source?: string; escalate?: boolean };

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

/** Rule-based stand-in for the support AI: account status + approved articles, never invented fixes. */
export function answer(s: State, q: string): Omit<Msg, 'id' | 'from'> {
  const w = words(q);
  const has = (...k: string[]) => k.some((x) => w.includes(x));
  const paused = s.killSwitches.filter((k) => k.scope === 'global' || k.scope === 'c1');

  if (has('refund', 'money back', 'terugbetal', 'chargeback')) {
    return { text: 'I can’t give refunds or change billing. A person on our team handles that. Want me to open a request with your question?', escalate: true, source: 'Policy: support AI can’t change billing' };
  }
  if (has('cancel', 'opzeg', 'quit') && has('for me', 'please cancel', 'cancel my', 'do it')) {
    return { text: 'I can’t cancel for you, but you can do it yourself in a few steps. You keep access until the end of your paid period.', link: ['Go to Billing', '/app/billing'], source: ARTICLES.find((a) => a.id === 'cancel')!.title };
  }
  if (has('connected', 'connection', 'disconnect', 'reconnect')) {
    const ig = s.meta.status === 'connected' ? `Instagram is connected as @${s.meta.igUsername}.` : 'Instagram is not connected right now. Grow and Lead Flows are on hold until you reconnect.';
    const gr = s.promoview === 'connected' ? 'The growth engine is connected.' : s.promoview === 'pending' ? 'The growth engine is waiting for confirmation.' : 'The growth engine needs attention.';
    return { text: `${ig} ${gr}`, link: ['Open Connect', '/app/connect'], source: 'Your account status' };
  }
  if (has('next payment', 'next charge', 'pay next', 'when do i pay', 'renew', 'invoice')) {
    const b = s.billing;
    const text = b.status === 'cancellation_scheduled' ? `Your subscription ends on ${fmtDate(b.periodEnd)}. There are no more charges.` : b.status === 'paused' ? `Your subscription is paused until ${b.pauseUntil ? fmtDate(b.pauseUntil) : 'the date you chose'}. No charges while paused.` : `Your next charge is ${money(payableUsd(s))} on ${fmtDate(b.periodEnd)} for ${b.modules.map(moduleName).join(', ')}.`;
    return { text, link: ['Open Billing', '/app/billing'], source: 'Your billing status' };
  }
  if (has('ai', 'reply', 'replying', 'draft') && paused.some((k) => k.module === 'ai')) {
    return { text: 'AI replies are temporarily paused by our team while we look into a problem. You can still reply yourself. Nothing is lost.', source: 'Your account status' };
  }
  if (paused.length && has('not working', 'broken', 'paused', 'stopped', 'why')) {
    return { text: `Our team has temporarily paused: ${paused.map((k) => SWITCH_LABEL[k.module]).join(', ')}. Your settings and data are kept, and it resumes once the problem is fixed.`, source: 'Your account status' };
  }
  const scored = ARTICLES.map((a) => ({ a, score: a.keywords.filter((k) => w.includes(k)).length })).filter((x) => x.score > 0).sort((x, y) => y.score - x.score);
  if (scored.length) {
    const a = scored[0].a;
    return { text: a.body, link: a.link, source: a.title };
  }
  return { text: 'I don’t have an answer for that in our help content, and I won’t guess. Want me to pass it to a person on our team?', escalate: true };
}

export default function Help() {
  const { state, update, toast } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 'm0', from: 'bot', text: `Hi ${state.business.owner.split(' ')[0]}, I’m the MAGNET help assistant. I answer from our help articles and your account status. I can’t change billing, cancel or touch your login, but I can pass anything to a person.` }]);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [ticket, setTicket] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const mine = state.support.filter((s) => s.clientId === 'c1').sort((a, b) => b.time - a.time);
  const f1 = state.flows[0];
  const articles = ARTICLES.filter((a) => !search || `${a.title} ${a.body} ${a.keywords.join(' ')}`.toLowerCase().includes(search.toLowerCase()));

  useEffect(() => endRef.current?.scrollIntoView({ block: 'nearest' }), [msgs.length]);

  const ask = (text: string) => {
    if (!text.trim()) return;
    const a = answer(state, text);
    setMsgs((m) => [...m, { id: uid('m'), from: 'you', text: text.trim() }, { id: uid('m'), from: 'bot', ...a }]);
    setQ('');
  };

  const createTicket = (subject: string, detail: string) => {
    update((d) => {
      // Minimum necessary context: the question, module and connection status. No messages or contacts.
      d.support.unshift({ id: uid('sp'), clientId: 'c1', subject, detail: `${detail}\n\nContext: Instagram ${d.meta.status}, growth engine ${d.promoview}, plan ${d.billing.modules.length} modules.`, status: 'Open', assignee: null, time: Date.now() });
      clientLog(d, 'support', `Opened support request: ${subject}`);
    });
    setMsgs((m) => [...m, { id: uid('m'), from: 'bot', text: 'Done. I’ve opened a request for our team. You can follow its status below under “Your requests”.' }]);
    toast('Request sent to the MAGNET team', 'success');
  };

  return (
    <>
      <PageHeader title={t('nav.help')} subtitle="Ask a question, read an article or reach a person on our team." />
      <div className="help-grid">
        <section className="card help-chat" aria-labelledby="chat-h">
          <div className="card-head">
            <h2 id="chat-h"><Bot size={18} aria-hidden /> Help assistant</h2>
            <button className="btn btn-sm btn-ghost" onClick={() => setTicket('')}><UserRound size={14} /> Talk to a person</button>
          </div>
          <div className="chat-log" aria-live="polite">
            {msgs.map((m) => (
              <div key={m.id} className={`chat-msg ${m.from}`}>
                <p>{m.text}</p>
                {m.link && <a className="btn btn-sm btn-secondary" href={`#${m.link[1]}`}>{m.link[0]}</a>}
                {m.escalate && <button className="btn btn-sm btn-primary" onClick={() => setTicket(msgs[msgs.indexOf(m) - 1]?.text ?? '')}>Send to a person</button>}
                {m.source && <span className="muted xsmall">Source: {m.source}</span>}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="chips suggest">
            {SUGGESTED.map((s) => <button key={s} className="chip-btn" onClick={() => ask(s)}>{s}</button>)}
          </div>
          <form className="row gap-sm" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
            <label className="sr-only" htmlFor="help-q">Ask a question</label>
            <input id="help-q" className="grow" placeholder="Ask a question" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn btn-primary" type="submit" aria-label="Ask"><Send size={16} /></button>
          </form>
          <p className="muted xsmall">Demo: answers come from fixed rules, not a live AI. The assistant never changes billing, cancels or asks for passwords.</p>
        </section>

        <div className="help-side">
          <section className="card" aria-labelledby="req-h">
            <h2 id="req-h"><LifeBuoy size={18} aria-hidden /> Your requests</h2>
            {mine.length === 0 ? <p className="muted small">No open requests.</p> : (
              <ul className="plain-list req-list">
                {mine.map((s) => (
                  <li key={s.id}>
                    <div><strong className="small">{s.subject}</strong><div className="muted xsmall">{timeAgo(s.time)}{s.assignee ? ` · ${s.assignee.split(' ')[0]} is on it` : ''}</div></div>
                    <Badge tone={s.status === 'Open' ? 'blue' : s.status === 'In progress' ? 'amber' : 'green'}>{s.status}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="card" aria-labelledby="art-h">
            <h2 id="art-h"><BookOpen size={18} aria-hidden /> Help articles</h2>
            <div className="search"><Search size={16} aria-hidden /><input aria-label="Search help articles" placeholder="Search articles" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
            <div className="article-list">
              {articles.map((a) => (
                <details key={a.id}>
                  <summary>{a.title}</summary>
                  <p className="small">{a.body}</p>
                  {a.link && <a className="small" href={`#${a.link[1]}`}>{a.link[0]} →</a>}
                </details>
              ))}
              {articles.length === 0 && <p className="muted small">No articles match. Ask the assistant or talk to a person.</p>}
            </div>
          </section>
        </div>
      </div>

      <section className="card">
        <h2>Demo tour</h2>
        <ol className="tour">
          {[
            ['Overview', 'See what needs attention today.', '/app/overview'],
            ['Grow', 'Review a suggested source and start or pause the campaign.', '/app/grow'],
            ['Lead Flow', `Open “${f1.name}” and simulate a ${f1.trigger.keyword} comment.`, '/app/flows/f1'],
            ['Inbox', 'Open the new conversation, generate a reply and send it.', '/app/inbox'],
            ['Leads', 'Check the dashboard and today’s focus.', '/app/leads'],
            ['Admin', 'Pause a module with a kill switch and see the notice here.', '/admin/operations'],
          ].map(([title, d, href], i) => (
            <li key={title}>
              <span className="step-num">{i + 1}</span>
              <div>
                <a href={`#${href}`}><strong>{title}</strong></a>
                <p className="muted small">{d}</p>
              </div>
            </li>
          ))}
        </ol>
        <p className="small muted">All people, messages and numbers are fictional. The demo doesn’t log in to Instagram, send DMs, publish posts or take payments. Use <strong>Demo workspace</strong> at the top right to simulate states or reset everything.</p>
      </section>

      {ticket !== null && <TicketModal initial={ticket} onClose={() => setTicket(null)} onSend={createTicket} />}
    </>
  );
}

function TicketModal({ initial, onClose, onSend }: { initial: string; onClose: () => void; onSend: (subject: string, detail: string) => void }) {
  const [subject, setSubject] = useState(initial.slice(0, 80));
  const [detail, setDetail] = useState(initial);
  const [touched, setTouched] = useState(false);
  const send = () => {
    setTouched(true);
    if (subject.trim().length < 3) return;
    onSend(subject.trim(), detail.trim() || subject.trim());
    onClose();
  };
  return (
    <Modal title="Ask a person" onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" onClick={send}>Send request</button></>}>
      <Field label="Subject" error={touched && subject.trim().length < 3 ? 'Add a short subject' : undefined}><input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
      <Field label="What do you need help with?" hint="We add your connection and plan status. We never include your messages or contacts."><textarea rows={4} value={detail} onChange={(e) => setDetail(e.target.value)} /></Field>
    </Modal>
  );
}
