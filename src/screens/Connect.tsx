import { useState } from 'react';
import { Check, Cpu, Instagram, Lock, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';
import { clientLog, logActivity, markActivation, navigate, useStore } from '../store';
import { Badge, Modal, PageHeader, dateTime } from '../components/ui';

/**
 * Connection screen. The Instagram link uses an OAuth-style flow: the person authorises
 * on an Instagram-hosted step and MAGNET never sees their password. The demo simulates
 * that step; production swaps it for Meta's real Facebook Login. No password is ever collected.
 */
export default function Connect() {
  const { state, update, toast } = useStore();
  const [authOpen, setAuthOpen] = useState(false);
  const meta = state.meta;

  const connectMeta = (username: string) => {
    update((d) => {
      d.meta = {
        status: 'connected',
        igUsername: username,
        pageName: d.business.name,
        scopes: ['Manage content', 'Read and send DMs', 'Read insights'],
        connectedAt: Date.now(),
      };
      d.connection = 'connected';
      d.clients[0].connection = 'connected';
      clientLog(d, 'setting', 'Connected Instagram via Meta (demo)');
      markActivation(d, 'connect_meta');
    });
    setAuthOpen(false);
    toast('Instagram connected. MAGNET never saw your password.', 'success');
  };

  const requestGrowth = () => {
    update((d) => {
      d.promoview = 'pending';
      clientLog(d, 'setting', 'Requested growth engine connection');
    });
    // The growth service confirms the account mapping; only then is it Connected (ACC-03)
    window.setTimeout(() => {
      update((d) => {
        if (d.promoview !== 'pending') return;
        d.promoview = 'connected';
        markActivation(d, 'connect_growth');
        logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'setting', action: 'Growth service confirmed the account connection', result: 'success' });
      });
      toast('The growth service confirmed your account.', 'success');
    }, 1800);
  };

  const disconnectMeta = () => {
    update((d) => {
      d.meta.status = 'disconnected';
      d.meta.connectedAt = null;
      d.connection = 'disconnected';
      d.clients[0].connection = 'disconnected';
      clientLog(d, 'setting', 'Disconnected Instagram (demo)');
    });
    toast('Instagram disconnected', 'info');
  };

  return (
    <>
      <PageHeader title="Connect your accounts" subtitle="MAGNET works through secure, official connections. You approve access on the platform itself." />

      <section className={`card connect-card ${meta.status}`} aria-labelledby="meta">
        <div className="connect-head">
          <span className="ig-logo" aria-hidden><Instagram size={26} /></span>
          <div className="connect-head-text">
            <h2 id="meta">Instagram <span className="muted">via Meta</span></h2>
            <p className="muted small">For content planning and direct messages. Powered by the official Instagram API.</p>
          </div>
          {meta.status === 'connected' ? <Badge tone="green" dot>Connected</Badge> : <Badge tone="red" dot>Not connected</Badge>}
        </div>

        {meta.status === 'connected' ? (
          <>
            <dl className="connect-info">
              <div><dt>Account</dt><dd>@{meta.igUsername}</dd></div>
              <div><dt>Facebook page</dt><dd>{meta.pageName}</dd></div>
              <div><dt>Connected</dt><dd>{meta.connectedAt ? dateTime(meta.connectedAt) : '—'}</dd></div>
            </dl>
            <div className="scope-list">
              {meta.scopes.map((sc) => (
                <span key={sc} className="scope"><Check size={14} aria-hidden /> {sc}</span>
              ))}
            </div>
            <div className="row gap-sm wrap">
              <button className="btn btn-secondary" onClick={() => setAuthOpen(true)}><RefreshCw size={16} /> Reconnect</button>
              <button className="btn btn-ghost" onClick={disconnectMeta}><Unplug size={16} /> Disconnect</button>
            </div>
          </>
        ) : (
          <>
            <ul className="scope-list stacked">
              <li><Check size={16} aria-hidden /> Plan and schedule content</li>
              <li><Check size={16} aria-hidden /> Read and reply to direct messages</li>
              <li><Check size={16} aria-hidden /> Read account insights</li>
            </ul>
            <button className="btn btn-instagram btn-lg" onClick={() => setAuthOpen(true)}>
              <Instagram size={18} /> Connect with Instagram
            </button>
            <p className="trust-line"><Lock size={14} aria-hidden /> You sign in on Instagram. MAGNET never sees or stores your password.</p>
          </>
        )}
      </section>

      <section className={`card connect-card ${state.promoview === 'connected' ? 'connected' : state.promoview === 'pending' ? '' : 'disconnected'}`} aria-labelledby="pv">
        <div className="connect-head">
          <span className="pv-logo" aria-hidden><Cpu size={24} /></span>
          <div className="connect-head-text">
            <h2 id="pv">Growth engine</h2>
            <p className="muted small">Runs your interactions within your daily limit. You stay in control through your <a href="#/app/grow">audience and filters</a>.</p>
          </div>
          {state.promoview === 'connected' && <Badge tone="green" dot>Connected</Badge>}
          {state.promoview === 'pending' && <Badge tone="blue" dot>Pending</Badge>}
          {state.promoview === 'needs_action' && <Badge tone="amber" dot>Needs action</Badge>}
          {state.promoview === 'disconnected' && <Badge tone="red" dot>Not connected</Badge>}
        </div>
        {state.promoview === 'pending' && <p className="small"><RefreshCw size={14} className="spin" aria-hidden /> Waiting for the growth service to confirm your account. This shows Connected only after it confirms.</p>}
        {state.promoview === 'needs_action' && <p className="small">The growth service can’t reach your account right now. Reconnect to continue; your campaign is paused until then.</p>}
        {state.promoview === 'connected' && <p className="small muted">Confirmed by the growth service. No login is shared with MAGNET.</p>}
        <div className="row gap-sm wrap">
          {(state.promoview === 'disconnected' || state.promoview === 'needs_action') && (
            <button className="btn btn-primary" onClick={requestGrowth}>{state.promoview === 'needs_action' ? 'Reconnect' : 'Request connection'}</button>
          )}
          {state.promoview === 'connected' && (
            <button className="btn btn-ghost" onClick={() => update((d) => {
              d.promoview = 'needs_action';
              // Only a running campaign is paused; a draft stays a draft
              if (d.campaign === 'active') {
                d.campaign = 'paused';
                d.clients[0].campaign = 'paused';
              }
              clientLog(d, 'setting', 'Growth engine needs action (simulated)');
            })}>Simulate a connection problem</button>
          )}
        </div>
      </section>

      <section className="card trust-explainer" aria-labelledby="why">
        <h2 id="why"><ShieldCheck size={18} aria-hidden /> Why we never ask for your password</h2>
        <p className="small muted">
          A trustworthy tool never asks for your Instagram password. You log in on Instagram’s own screen and choose what to allow, exactly like
          “Log in with Google”. If any app asks you to type your Instagram password into its own form, that’s a red flag. In this demo the Instagram
          step is simulated; nothing is sent to Instagram and no real login happens.
        </p>
      </section>

      {authOpen && <AuthModal defaultUser={meta.igUsername || state.clients[0].handle.replace('@', '')} onClose={() => setAuthOpen(false)} onAuthorize={connectMeta} />}
    </>
  );
}

/**
 * Simulated Instagram authorisation. This is deliberately NOT a password form:
 * it stands in for the OAuth consent screen the person would see on instagram.com.
 */
function AuthModal({ defaultUser, onClose, onAuthorize }: { defaultUser: string; onClose: () => void; onAuthorize: (username: string) => void }) {
  const [step, setStep] = useState<'consent' | 'loading'>('consent');
  const [username, setUsername] = useState(defaultUser);

  const authorize = () => {
    setStep('loading');
    window.setTimeout(() => onAuthorize(username.replace(/^@/, '') || 'yourbusiness'), 900);
  };

  return (
    <Modal title="" onClose={onClose}>
      <div className="ig-auth">
        <div className="ig-auth-brand">
          <span className="ig-logo lg" aria-hidden><Instagram size={30} /></span>
          <strong>Instagram</strong>
          <span className="muted small">instagram.com</span>
        </div>
        {step === 'loading' ? (
          <div className="ig-auth-loading">
            <RefreshCw className="spin" size={28} aria-hidden />
            <p>Connecting MAGNET…</p>
          </div>
        ) : (
          <>
            <p className="ig-auth-lead"><strong>MAGNET</strong> wants to access your Instagram professional account.</p>
            <label className="field">
              <span className="field-label">Which account?</span>
              <div className="ig-account">
                <span className="at">@</span>
                <input aria-label="Instagram username" value={username.replace(/^@/, '')} onChange={(e) => setUsername(e.target.value)} />
              </div>
            </label>
            <ul className="scope-list stacked">
              <li><Check size={16} aria-hidden /> Manage content and scheduling</li>
              <li><Check size={16} aria-hidden /> Read and send direct messages</li>
              <li><Check size={16} aria-hidden /> Read insights</li>
            </ul>
            <p className="ig-auth-note"><Lock size={13} aria-hidden /> You’re signing in on Instagram. You can remove MAGNET’s access any time in your Instagram settings.</p>
            <div className="ig-auth-actions">
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-instagram" onClick={authorize}>Authorize</button>
            </div>
            <p className="muted xsmall center">Simulated for the demo. No real Instagram login happens and no password is entered.</p>
          </>
        )}
      </div>
    </Modal>
  );
}

export function goConnect() {
  navigate('/app/connect');
}
