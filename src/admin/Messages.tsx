import { useEffect, useState } from 'react';
import { Megaphone, Send, Users } from 'lucide-react';
import { logActivity, navigate, useStore } from '../store';
import { ADMIN_ACTOR } from '../seed';
import { Avatar, Modal, PageHeader, timeAgo } from '../components/ui';
import { ChatBubbles, TEAM_CONTACT, sendChat } from '../components/TeamChat';

const QUICK = [
  ['Weekly update', 'Weekly update: your campaign ran every day this week and new conversations came in. Next step: '],
  ['Check-in', 'Hi! Just checking in. Is everything working the way you want? Anything I can help with?'],
  ['Action needed', 'A quick heads-up: we need one thing from you to keep everything running: '],
];

/** Admin side of the human chat: pick a client, read the thread, reply or post an update. */
export default function Messages({ clientId }: { clientId?: string }) {
  const { state, update, toast } = useStore();
  const [text, setText] = useState('');
  const [asUpdate, setAsUpdate] = useState(false);
  const [broadcast, setBroadcast] = useState(false);
  const clients = state.clients.map((c) => {
    const msgs = state.teamChat.filter((m) => m.clientId === c.id).sort((a, b) => a.time - b.time);
    return { c, msgs, last: msgs[msgs.length - 1], unread: msgs.filter((m) => m.from === 'client' && !m.readByTeam).length };
  }).sort((a, b) => b.unread - a.unread || (b.last?.time ?? 0) - (a.last?.time ?? 0));
  const sel = clients.find((x) => x.c.id === clientId) ?? clients[0];

  useEffect(() => {
    if (!sel || sel.unread === 0) return;
    update((d) => d.teamChat.forEach((m) => { if (m.clientId === sel.c.id && m.from === 'client') m.readByTeam = true; }));
  }, [sel?.c.id, sel?.unread, update]);

  const send = () => {
    const t = text.trim();
    if (!t || !sel) return;
    update((d) => {
      sendChat(d, sel.c.id, 'team', TEAM_CONTACT, t, asUpdate);
      logActivity(d, { actor: ADMIN_ACTOR, actorRole: 'admin', clientId: sel.c.id, type: 'support', action: asUpdate ? 'Posted an update to the client' : 'Sent a chat message to the client', result: 'success' });
    });
    setText(''); setAsUpdate(false);
    toast(asUpdate ? 'Update posted' : 'Message sent');
  };

  return (
    <>
      <PageHeader title="Messages" subtitle="Talk to your clients directly and post updates. Person to person, no AI." actions={<button className="btn btn-secondary" onClick={() => setBroadcast(true)}><Users size={16} /> Update to all clients</button>} />
      <div className="tc-admin">
        <section className="card tc-clients" aria-label="Clients">
          <ul>
            {clients.map(({ c, last, unread }) => (
              <li key={c.id}>
                <button className={`tc-client ${sel?.c.id === c.id ? 'on' : ''}`} onClick={() => navigate(`/admin/messages/${c.id}`)} aria-current={sel?.c.id === c.id ? 'true' : undefined}>
                  <Avatar name={c.owner} color="#5B35F5" size={40} />
                  <span className="tc-client-text">
                    <strong>{c.owner}</strong>
                    <span className="muted xsmall">{c.name}</span>
                    <span className="muted small clamp-1">{last ? `${last.from === 'team' ? 'You: ' : ''}${last.text}` : 'No messages yet'}</span>
                  </span>
                  <span className="tc-client-side">
                    {last && <span className="muted xsmall">{timeAgo(last.time)}</span>}
                    {unread > 0 && <span className="tc-badge static">{unread}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
        {sel && (
          <section className="card tc-thread" aria-label={`Chat with ${sel.c.owner}`}>
            <header className="tc-thread-head">
              <div><strong>{sel.c.owner}</strong><span className="muted small"> · {sel.c.name} · {sel.c.handle}</span></div>
              <a className="btn btn-sm btn-ghost" href={`#/admin/clients/${sel.c.id}`}>Open client</a>
            </header>
            <ChatBubbles msgs={sel.msgs} side="team" />
            <div className="tc-quick" aria-label="Quick messages">
              {QUICK.map(([label, body]) => <button key={label} className="chip-btn" onClick={() => { setText(body); setAsUpdate(label === 'Weekly update'); }}>{label}</button>)}
            </div>
            <form className="tc-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
              <label className="sr-only" htmlFor="tc-admin-input">Message to {sel.c.owner}</label>
              <textarea id="tc-admin-input" rows={2} placeholder={`Message ${sel.c.owner.split(' ')[0]}…`} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) send(); }} />
              <div className="tc-form-actions">
                <label className="check"><input type="checkbox" checked={asUpdate} onChange={(e) => setAsUpdate(e.target.checked)} /> <Megaphone size={14} aria-hidden /> Post as update</label>
                <button className="btn btn-primary" type="submit" disabled={!text.trim()}><Send size={16} /> Send</button>
              </div>
            </form>
          </section>
        )}
      </div>
      {broadcast && <BroadcastModal onClose={() => setBroadcast(false)} />}
    </>
  );
}

function BroadcastModal({ onClose }: { onClose: () => void }) {
  const { state, update, toast } = useStore();
  const [text, setText] = useState('');
  const send = () => {
    const t = text.trim();
    if (t.length < 5) return;
    update((d) => {
      d.clients.forEach((c) => sendChat(d, c.id, 'team', TEAM_CONTACT, t, true));
      logActivity(d, { actor: ADMIN_ACTOR, actorRole: 'admin', clientId: 'c1', type: 'support', action: `Posted an update to all ${d.clients.length} clients`, result: 'success' });
    });
    toast(`Update posted to ${state.clients.length} clients`, 'success');
    onClose();
  };
  return (
    <Modal title="Update to all clients" onClose={onClose} footer={<><button className="btn btn-ghost" onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={text.trim().length < 5} onClick={send}>Post to {state.clients.length} clients</button></>}>
      <p className="small muted">Each client sees this as an update in their own chat and can reply to you privately. Good for product news or planned maintenance.</p>
      <label className="sr-only" htmlFor="tc-broadcast">Update text</label>
      <textarea id="tc-broadcast" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="What’s new?" />
    </Modal>
  );
}
