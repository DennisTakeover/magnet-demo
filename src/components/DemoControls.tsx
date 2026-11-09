import { useEffect, useRef, useState } from 'react';
import { ArrowLeftRight, ChevronDown, RotateCcw, X } from 'lucide-react';
import { navigate, useRoute, useStore } from '../store';
import { PERSONAS, PERSONA_ORDER } from '../personas';
import type { PersonaId } from '../types';
import { Toggle } from './ui';

export default function DemoControls() {
  const { state, update, reset } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = useRoute();
  const role = path.startsWith('/admin') ? 'admin' : 'client';
  const sim = state.sim;

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);
  const set = (k: keyof typeof sim, v: boolean) => update((d) => void (d.sim[k] = v));

  return (
    <div className="demo-controls" ref={ref}>
      <button className="demo-pill" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="live-dot" aria-hidden /> Demo workspace <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div className="demo-panel" role="dialog" aria-label="Demo controls">
          <div className="demo-panel-head">
            <strong>Demo controls</strong>
            <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <p className="muted small">All data is fictional. Nothing is sent to Instagram or any other service.</p>
          <a className="btn btn-soft btn-block" href={role === 'client' ? '#/admin/operations' : '#/app/overview'} onClick={() => setOpen(false)}>
            <ArrowLeftRight size={16} /> Switch to {role === 'client' ? 'admin' : 'client'} view
          </a>
          <label className="field">
            <span className="field-label">Example business</span>
            <select
              value={state.persona}
              onChange={(e) => {
                reset(e.target.value as PersonaId);
                setOpen(false);
                if (role === 'client') navigate('/app/overview');
              }}
            >
              {PERSONA_ORDER.map((id) => (
                <option key={id} value={id}>{PERSONAS[id].label} · {PERSONAS[id].example}</option>
              ))}
            </select>
            <span className="field-hint">Switching loads that business’s example data.</span>
          </label>
          <div className="demo-section-title">Simulate states</div>
          <Toggle label="Empty inbox" checked={sim.emptyInbox} onChange={(v) => set('emptyInbox', v)} />
          <Toggle label="Missing business info" checked={sim.missingKnowledge} onChange={(v) => set('missingKnowledge', v)} />
          <Toggle
            label="Instagram disconnected"
            checked={state.connection === 'disconnected'}
            onChange={(v) =>
              update((d) => {
                d.connection = v ? 'disconnected' : 'connected';
                d.meta.status = d.connection;
                d.clients[0].connection = d.connection;
              })
            }
          />
          <Toggle label="Slow loading" checked={sim.slowLoading} onChange={(v) => set('slowLoading', v)} />
          <Toggle label="Next publish fails" checked={sim.failNextPublish} onChange={(v) => set('failNextPublish', v)} />
          <button
            className="btn btn-ghost btn-block"
            onClick={() => {
              reset();
              setOpen(false);
              navigate('/');
            }}
          >
            <RotateCcw size={16} /> Reset demo
          </button>
        </div>
      )}
    </div>
  );
}
