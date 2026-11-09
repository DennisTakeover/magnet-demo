import { useState } from 'react';
import { AlertTriangle, Instagram } from 'lucide-react';
import { clientLog, navigate, routeQuery, usePersona, useStore } from '../store';
import { Badge, Field, PageHeader } from '../components/ui';
import type { AiMode } from '../types';
import TeamTab, { OwnerOnly } from './Team';
import { viewer } from '../team';

type Tab = 'business' | 'ai' | 'account' | 'team' | 'subscription';
const TABS: { id: Tab; label: string }[] = [
  { id: 'business', label: 'Business knowledge' },
  { id: 'ai', label: 'AI behaviour' },
  { id: 'account', label: 'Account' },
  { id: 'team', label: 'Team' },
  { id: 'subscription', label: 'Subscription' },
];

export default function Settings() {
  const { state, update, toast } = useStore();
  const persona = usePersona();
  const tab = (routeQuery().get('tab') as Tab) || 'business';
  const [b, setB] = useState(state.business);
  const missing = state.sim.missingKnowledge || !state.business.faq.trim() || !state.business.offer.trim();

  const saveBusiness = (label: string) => {
    update((d) => {
      d.business = b;
      clientLog(d, 'setting', `Updated ${label}`);
    });
    toast('Settings saved');
  };

  const setMode = (m: AiMode) => {
    update((d) => {
      const from = d.aiMode;
      d.aiMode = m;
      d.clients[0].aiMode = m;
      clientLog(d, 'setting', `Changed AI mode from ${cap(from)} to ${cap(m)}`);
    });
    toast(`AI mode set to ${cap(m)}`);
  };

  return (
    <>
      <PageHeader title="Settings" />
      <div className="tabs" role="tablist" aria-label="Settings sections">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => navigate(`/app/settings?tab=${t.id}`)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'business' && (
        <section className="card settings-card" role="tabpanel">
          {missing && (
            <div className="banner banner-amber">
              <AlertTriangle size={18} aria-hidden />
              <span>Some business info is missing{state.sim.missingKnowledge ? ' (simulated)' : ''}. AI will ask you to review instead of guessing.</span>
            </div>
          )}
          <p className="muted small">AI only uses what you write here. It never invents prices, availability or guarantees.</p>
          <Field label="Your offer"><textarea rows={3} value={b.offer} onChange={(e) => setB({ ...b, offer: e.target.value })} /></Field>
          <Field label="Approved pricing info"><textarea rows={2} value={b.pricing} onChange={(e) => setB({ ...b, pricing: e.target.value })} /></Field>
          <Field label="FAQ" hint="One question and answer per line"><textarea rows={4} value={b.faq} onChange={(e) => setB({ ...b, faq: e.target.value })} /></Field>
          <Field label="Qualification criteria"><textarea rows={2} value={b.qualifyCriteria} onChange={(e) => setB({ ...b, qualifyCriteria: e.target.value })} /></Field>
          <Field label="Tone of voice"><input value={b.tone} onChange={(e) => setB({ ...b, tone: e.target.value })} /></Field>
          <Field label={persona.linkLabel}><input value={b.bookingLink} onChange={(e) => setB({ ...b, bookingLink: e.target.value })} /></Field>
          <Field label="Always hand over to you" hint="These conversations get the status Needs you"><input value={b.handoffTopics} onChange={(e) => setB({ ...b, handoffTopics: e.target.value })} /></Field>
          <div className="row end">
            {state.sim.missingKnowledge && (
              <button className="btn btn-ghost" onClick={() => update((d) => void (d.sim.missingKnowledge = false))}>Clear simulated gap</button>
            )}
            <button className="btn btn-primary" onClick={() => saveBusiness('business knowledge')}>Save</button>
          </div>
        </section>
      )}

      {tab === 'ai' && (
        <section className="card settings-card" role="tabpanel">
          <h2>AI mode</h2>
          <div className="mode-cards" role="radiogroup" aria-label="AI mode">
            {([
              ['off', 'Off', 'No AI replies. Active Lead Flows can still send their approved messages.'],
              ['assist', 'Assist', 'AI suggests replies and you approve every message. Default.'],
              ['auto', 'Auto', 'AI replies within your rules (simulated in the demo). Complaints and requests for a person always come to you.'],
            ] as const).map(([id, label, desc]) => (
              <button key={id} role="radio" aria-checked={state.aiMode === id} className={`mode-card ${state.aiMode === id ? 'on' : ''}`} onClick={() => setMode(id)}>
                <strong>{label}</strong>
                <span className="muted small">{desc}</span>
              </button>
            ))}
          </div>
          <h3 className="mt">Take over</h3>
          <p className="small muted">Pressing Take over in a conversation pauses AI and Lead Flow follow-ups for that conversation and removes replies that haven’t been sent yet. You resume with a visible choice.</p>
          <p className="small muted">The demo uses pre-written reply variants to show how this works. It is not a trained live AI agent.</p>
        </section>
      )}

      {tab === 'account' && (
        <section className="card settings-card" role="tabpanel">
          <a className="connect-box" href="#/app/connect">
            <Instagram size={22} aria-hidden />
            <div>
              <strong>{state.clients[0].handle}</strong>
              <div className="small">{state.meta.status === 'connected' ? <Badge tone="green" dot>Connected</Badge> : <Badge tone="red" dot>Not connected</Badge>}</div>
            </div>
            <span className="btn btn-secondary">Manage connection</span>
          </a>
          <p className="muted xsmall">One Instagram account per workspace in this demo. No real login happens.</p>
          <div className="grid-2">
            <Field label="Account language">
              <select value={b.language} onChange={(e) => setB({ ...b, language: e.target.value })}>
                {['English', 'Dutch', 'German', 'Spanish', 'French'].map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Time zone">
              <select value={b.timezone} onChange={(e) => setB({ ...b, timezone: e.target.value })}>
                {['Europe/Amsterdam', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Asia/Singapore'].map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          <div className="row end"><button className="btn btn-primary" onClick={() => saveBusiness('language and time zone')}>Save</button></div>
        </section>
      )}

      {tab === 'team' && (viewer(state) ? <OwnerOnly /> : <TeamTab />)}

      {tab === 'subscription' && (
        <section className="card settings-card" role="tabpanel">
          <h2>Subscription</h2>
          <p className="small">Your modules, invoices, plan changes and cancellation are all in Billing.</p>
          <a className="btn btn-primary" href="#/app/billing">Open Billing</a>
        </section>
      )}

    </>
  );
}

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
