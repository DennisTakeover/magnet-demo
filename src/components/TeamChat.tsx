import { useEffect, useRef, useState } from 'react';
import { Megaphone, MessageCircleHeart, Send, X } from 'lucide-react';
import { logActivity, uid, useStore } from '../store';
import { Avatar, dateTime } from './ui';
import { viewer } from '../team';
import type { State, TeamChatMessage } from '../types';

export const TEAM_CONTACT = 'Sophie Laurent';

export function ChatBubbles({ msgs, side }: { msgs: TeamChatMessage[]; side: 'client' | 'team' }) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ block: 'nearest' }), [msgs.length]);
  return (
    <div className="tc-log" aria-live="polite">
      {msgs.length === 0 && <p className="muted small center">No messages yet. Say hello.</p>}
      {msgs.map((m) => (
        <div key={m.id} className={`tc-msg ${m.from === side ? 'mine' : 'theirs'} ${m.update ? 'update' : ''}`}>
          {m.update && <span className="tc-update-tag"><Megaphone size={12} aria-hidden /> Update</span>}
          <p>{m.text}</p>
          <span className="tc-meta">{m.from === side ? 'You' : m.author.split(' ')[0]} · {dateTime(m.time)}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

export function sendChat(d: State, clientId: string, from: 'team' | 'client', author: string, text: string, update = false) {
  d.teamChat.push({ id: uid('tc'), clientId, from, author, text, time: Date.now(), update: update || undefined, readByClient: from === 'client', readByTeam: from === 'team' });
}

/** Client side: a floating chat with their human contact at MAGNET. No AI writes or reads these messages. */
export default function TeamChatWidget() {
  const { state, update } = useStore();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const msgs = state.teamChat.filter((m) => m.clientId === 'c1').sort((a, b) => a.time - b.time);
  const unread = msgs.filter((m) => m.from === 'team' && !m.readByClient).length;
  const me = viewer(state)?.name ?? state.business.owner;

  useEffect(() => {
    if (!open || unread === 0) return;
    update((d) => d.teamChat.forEach((m) => { if (m.clientId === 'c1' && m.from === 'team') m.readByClient = true; }));
  }, [open, unread, update]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    update((d) => {
      sendChat(d, 'c1', 'client', me, t);
      logActivity(d, { actor: `${me} (client)`, actorRole: 'client', clientId: 'c1', type: 'support', action: 'Sent a message to the MAGNET team', result: 'success' });
    });
    setText('');
  };

  return (
    <div className="tc-widget">
      {open && (
        <section className="tc-panel" role="dialog" aria-label="Chat with your MAGNET contact">
          <header className="tc-head">
            <Avatar name={TEAM_CONTACT} color="#15171C" size={38} />
            <div>
              <strong>{TEAM_CONTACT.split(' ')[0]} from MAGNET</strong>
              <span>A real person · usually replies within a few hours on workdays</span>
            </div>
            <button className="icon-btn" aria-label="Close chat" onClick={() => setOpen(false)}><X size={18} /></button>
          </header>
          <ChatBubbles msgs={msgs} side="client" />
          <form className="tc-form" onSubmit={(e) => { e.preventDefault(); send(); }}>
            <label className="sr-only" htmlFor="tc-input">Message to your MAGNET contact</label>
            <input id="tc-input" placeholder="Write a message…" value={text} onChange={(e) => setText(e.target.value)} autoFocus />
            <button className="btn btn-primary" type="submit" aria-label="Send message" disabled={!text.trim()}><Send size={16} /></button>
          </form>
        </section>
      )}
      <button className="tc-fab" aria-label={open ? 'Close chat' : `Chat with your MAGNET contact${unread ? `, ${unread} new` : ''}`} aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? <X size={22} /> : <MessageCircleHeart size={24} />}
        {!open && unread > 0 && <span className="tc-badge">{unread}</span>}
      </button>
    </div>
  );
}
