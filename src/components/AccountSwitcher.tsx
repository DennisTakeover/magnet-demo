import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Layers, Plus, Settings2 } from 'lucide-react';
import { navigate, useStore } from '../store';
import { Avatar } from './ui';
import { accountStatus, activeAccountObj } from '../accounts';
import { viewer } from '../team';

/** Sidebar control: shows the owner and the selected Instagram account, and switches between accounts. */
export default function AccountSwitcher() {
  const { state, update } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = activeAccountObj(state);
  const v = viewer(state);
  const name = v?.name ?? state.business.owner;
  const disconnected = state.accounts.some((a) => accountStatus(state, a) === 'disconnected');

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  const pick = (id: string) => {
    update((d) => { d.activeAccount = id; });
    setOpen(false);
  };

  return (
    <div className="acct" ref={ref}>
      <button className="user-card" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)}>
        <Avatar name={name} color={v ? '#12805C' : active?.color ?? '#5B35F5'} size={40} />
        <span className="user-card-text">
          <strong>{name}</strong>
          <span className={`conn ${disconnected ? 'disconnected' : 'connected'}`}>
            <span className="badge-dot" aria-hidden />
            {active ? `@${active.username}` : `All accounts (${state.accounts.length})`}
            {disconnected ? ' · needs attention' : ''}
          </span>
        </span>
        <ChevronDown size={16} aria-hidden />
      </button>
      {open && (
        <div className="acct-menu" role="menu" aria-label="Instagram accounts">
          <span className="acct-title">Instagram accounts</span>
          <button role="menuitemradio" aria-checked={state.activeAccount === 'all'} className="acct-item" onClick={() => pick('all')}>
            <span className="acct-all"><Layers size={16} aria-hidden /></span>
            <span className="acct-text"><strong>All accounts</strong><small>Combined inbox and leads</small></span>
            {state.activeAccount === 'all' && <Check size={16} aria-hidden />}
          </button>
          {state.accounts.map((a) => {
            const st = accountStatus(state, a);
            return (
              <button key={a.id} role="menuitemradio" aria-checked={state.activeAccount === a.id} className="acct-item" onClick={() => pick(a.id)}>
                <Avatar name={a.username.replace(/[._]/g, ' ')} color={a.color} size={32} />
                <span className="acct-text">
                  <strong>@{a.username}</strong>
                  <small><span className={`dot ${st}`} aria-hidden /> {a.label}{st === 'disconnected' ? ' · disconnected' : ''}</small>
                </span>
                {state.activeAccount === a.id && <Check size={16} aria-hidden />}
              </button>
            );
          })}
          {!v && (
            <>
              <hr />
              <button className="acct-item small" onClick={() => { setOpen(false); navigate('/app/connect?add=1'); }}><Plus size={16} aria-hidden /> Add an Instagram account</button>
              <button className="acct-item small" onClick={() => { setOpen(false); navigate('/app/connect'); }}><Settings2 size={16} aria-hidden /> Manage connections</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
