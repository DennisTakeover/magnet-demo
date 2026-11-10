import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Briefcase, Check, Cpu, Instagram, Lock, Mail, MessageCircle, Pencil, RefreshCw, ShoppingBag, Store, Target, TrendingUp, Users, CalendarDays, X,
} from 'lucide-react';
import { clientLog, logActivity, markActivation, navigate, useStore } from '../store';
import { TRIAL_DAYS } from '../brand';
import { addDays } from '../billing';
import { SiteNav, img } from './Entry';
import MagnetArt from '../components/MagnetArt';
import { createSeed } from '../seed';
import { PERSONAS, PERSONA_ORDER } from '../personas';
import { LISTED, STARTER, addMonths, missingDependencies, moduleName, namesOf, totalUsd } from '../billing';
import { money } from '../i18n/locale';
import { AiTag, Badge, ChipInput, Field, formatDate } from '../components/ui';
import type { AiMode, GoalId, GrowthConnection, ModuleId, PersonaId } from '../types';

const STEPS = ['Workspace', 'Business type', 'Goal', 'Business', 'Offer', 'Connect', 'Audience', 'Voice & AI', 'Plan'];

interface Suggestion {
  id: string;
  topic: string;
  why: string;
  state: 'open' | 'accepted' | 'rejected' | 'editing';
}

const SUGGESTIONS: Record<PersonaId, Omit<Suggestion, 'state'>[]> = {
  coach: [
    { id: 'g1', topic: 'Remote work', why: 'Your offer mentions demanding schedules; many remote founders follow this topic.' },
    { id: 'g2', topic: 'Healthy eating on the go', why: 'Your FAQ answers questions about client dinners and hotels.' },
    { id: 'g3', topic: 'Marathon training', why: 'Related to fitness, but may attract athletes rather than busy entrepreneurs.' },
  ],
  webshop: [
    { id: 'g1', topic: 'Minimal skincare', why: 'Your products are built around short, simple routines.' },
    { id: 'g2', topic: 'Eczema-friendly products', why: 'People with reactive skin often follow this topic. Medical questions still go to you.' },
    { id: 'g3', topic: 'Makeup tutorials', why: 'Large beauty audience, but less focused on sensitive skin.' },
  ],
  store: [
    { id: 'g1', topic: 'Students in Utrecht', why: 'Many students cycle daily and live within your 15 km area.' },
    { id: 'g2', topic: 'Cargo bikes for families', why: 'Your FAQ mentions child seats; families often look for cargo bikes.' },
    { id: 'g3', topic: 'Mountain biking', why: 'Cycling topic, but these riders often travel outside your area.' },
  ],
};

/** Goals per business type; the choice orders the first-value checklist. */
function goals(type: PersonaId): { id: GoalId; title: string; desc: string; icon: typeof Target; modules: ModuleId[] }[] {
  const goal = PERSONAS[type].stage4Plural.toLowerCase();
  return [
    { id: 'conversations', title: 'Get more conversations', desc: 'Turn followers and commenters into DMs you can answer with AI help.', icon: MessageCircle, modules: ['inbox', 'flows'] },
    { id: 'audience', title: 'Grow the right audience', desc: 'Reach people who match your customers, with filters you control.', icon: TrendingUp, modules: ['grow'] },
    { id: 'leads', title: `Get more ${goal}`, desc: 'Qualify interest and move contacts to a booking, order or visit.', icon: Users, modules: ['inbox', 'flows'] },
    { id: 'content', title: 'Post consistently', desc: 'Plan content that feeds your Lead Flows.', icon: CalendarDays, modules: ['planner', 'flows'] },
  ];
}

export default function Onboarding() {
  const { state, update, toast } = useStore();
  // Resuming restores the answers saved at the last step
  const saved = state.activation.onboardingStep > 0 ? state.activation.draft : undefined;
  const [step, setStepRaw] = useState(saved ? state.activation.onboardingStep : 0);
  const [owner, setOwner] = useState(saved?.owner ?? state.business.owner);
  const [email, setEmail] = useState(saved?.email ?? '');
  const [terms, setTerms] = useState(Boolean(saved));
  const [created, setCreated] = useState(Boolean(saved));
  const [type, setType] = useState<PersonaId>(saved?.type ?? state.persona);
  const [goal, setGoal] = useState<GoalId | null>(saved?.goal ?? null);
  const [b, setB] = useState(saved?.business ?? state.business);
  const [aud, setAud] = useState(saved?.audience ?? state.audience);
  const [examples, setExamples] = useState<string[]>(state.sources.filter((x) => x.status === 'accepted').map((x) => x.handle));
  const [handle, setHandle] = useState(state.clients[0].handle);
  const [meta, setMeta] = useState<'disconnected' | 'consent' | 'connected'>('disconnected');
  const [growth, setGrowth] = useState<GrowthConnection>('disconnected');
  const [ai, setAi] = useState<AiMode>(saved?.ai ?? 'assist');
  const [sugs, setSugs] = useState<Suggestion[]>(SUGGESTIONS[saved?.type ?? state.persona].map((x) => ({ ...x, state: 'open' })));
  const [mods, setMods] = useState<ModuleId[]>(saved?.mods ?? [...STARTER]);
  const [paying, setPaying] = useState<'idle' | 'confirming' | 'paid'>('idle');
  const growthTimer = useRef<number>();
  const cfg = PERSONAS[type];
  const deps = missingDependencies(mods);
  const renewDate = addMonths(new Date().toISOString().slice(0, 10), 1);

  useEffect(() => () => window.clearTimeout(growthTimer.current), []);

  // Resumable: remember the step so the owner can come back later
  const setStep = (n: number) => {
    setStepRaw(n);
    update((d) => {
      d.activation.onboardingStep = n;
      d.activation.draft = { type, goal, owner, email, business: b, audience: aud, ai, mods };
    });
  };

  const chooseType = (id: PersonaId) => {
    setType(id);
    const seed = createSeed(id);
    setB({ ...seed.business, owner: owner || seed.business.owner });
    setAud(seed.audience);
    setHandle(seed.clients[0].handle);
    setExamples(seed.sources.filter((x) => x.status === 'accepted').map((x) => x.handle));
    setSugs(SUGGESTIONS[id].map((x) => ({ ...x, state: 'open' })));
  };

  const chooseGoal = (g: GoalId) => {
    setGoal(g);
    // Pre-select the modules this goal needs, on top of the starter set
    const needs = goals(type).find((x) => x.id === g)!.modules;
    setMods((m) => Array.from(new Set([...m, ...needs])));
  };

  const requestGrowth = () => {
    setGrowth('pending');
    // Connected only after the growth service confirms the account mapping
    growthTimer.current = window.setTimeout(() => setGrowth('connected'), 1800);
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canNext: Record<number, boolean> = {
    0: created,
    2: goal !== null,
    3: b.name.trim().length > 0,
    8: paying === 'paid',
  };

  const createWorkspace = () => {
    if (created) return; // duplicate submissions create one workspace
    setCreated(true);
    update((d) => {
      d.business.owner = owner;
      logActivity(d, { actor: `${owner} (client)`, actorRole: 'client', clientId: 'c1', type: 'setting', action: 'Created workspace (demo)', result: 'success' });
    });
    toast('Workspace created. In the demo no email is sent.', 'success');
  };

  const trialEndDate = addDays(new Date().toISOString().slice(0, 10), TRIAL_DAYS);
  const pay = () => {
    if (paying !== 'idle' || deps.length) return;
    setPaying('confirming');
    // Access is granted only after the (simulated) payment provider confirms
    window.setTimeout(() => setPaying('paid'), 1500);
  };

  const finish = () => {
    update((d) => {
      const loc = d.locale;
      Object.assign(d, createSeed(type));
      d.locale = loc;
      d.business = { ...b, owner };
      d.audience = aud;
      d.aiMode = ai;
      d.clients[0].aiMode = ai;
      d.connection = meta === 'connected' ? 'connected' : 'disconnected';
      d.meta.status = d.connection;
      d.clients[0].connection = d.connection;
      d.promoview = growth;
      d.campaign = 'draft';
      d.clients[0].campaign = 'draft';
      d.billing.modules = [...mods];
      d.billing.periodEnd = TRIAL_DAYS ? trialEndDate : renewDate;
      d.billing.trialEnd = TRIAL_DAYS ? trialEndDate : null;
      d.billing.invoices = TRIAL_DAYS ? [] : [{ id: 'INV-1001', date: new Date().toISOString().slice(0, 10), amountUsd: totalUsd(mods), status: 'paid', modules: [...mods] }];
      d.activation = { goal, done: {}, dismissed: false, startedAt: Date.now(), firstValueAt: null, onboardingStep: 0, draft: undefined };
      if (meta === 'connected') markActivation(d, 'connect_meta');
      if (growth === 'connected') markActivation(d, 'connect_growth');
      markActivation(d, 'audience_saved');
      d.onboarded = true;
      clientLog(d, 'setting', `Completed onboarding (${namesOf(mods)})`);
    });
    toast('You’re set up. Follow the checklist to get your first result.', 'success');
    navigate('/app/overview');
  };

  const setSug = (id: string, patch: Partial<Suggestion>) => setSugs((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  return (
    <div className="onboarding m-site">
      <SiteNav active={null} />
      <div className="onb-split">
        <aside className="onb-aside" aria-hidden>
          <h2 className="m-hero-title left onb-aside-title">Make it<br />yours.</h2>
          <p className="onb-aside-sub">Set up your audience, so magnet can help you grow with AI.</p>
          <div className="onb-art">
            <img className="m-photo onb-photo" src={img('man-curly')} alt="" />
            <MagnetArt className="onb-magnet" size={260} rotate={-20} />
          </div>
        </aside>
      <div className="onb-wrap">
        <section className="card onb-card" aria-labelledby="onb-title">
          <div className="onb-steprow">
            <strong>Step {step + 1} of {STEPS.length}</strong>
            <div className="onb-progress" role="progressbar" aria-valuemin={1} aria-valuemax={STEPS.length} aria-valuenow={step + 1} aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}>
              <span style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
            </div>
          </div>
          <p className="onb-stepname">{STEPS[step]}</p>

          {step === 0 && (
            <>
              <h1 id="onb-title">Create your workspace</h1>
              <p className="muted">Free to set up. You choose your modules at the end.</p>
              <Field label="Your name"><input value={owner} onChange={(e) => setOwner(e.target.value)} disabled={created} /></Field>
              <Field label="Work email" hint="We send a sign-in link. No password needed." error={email && !emailOk ? 'Enter a valid email address' : undefined}>
                <input type="email" value={email} placeholder="you@business.com" onChange={(e) => setEmail(e.target.value)} disabled={created} />
              </Field>
              <label className="onb-check">
                <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} disabled={created} />
                <span>I agree to the terms and privacy policy.</span>
              </label>
              {created ? (
                <p className="onb-ok"><Mail size={16} aria-hidden /> Workspace created. In a live product you’d confirm via the link sent to {email}.</p>
              ) : (
                <button className="btn btn-primary mt" disabled={!owner.trim() || !emailOk || !terms} onClick={createWorkspace}>Create workspace</button>
              )}
            </>
          )}

          {step === 1 && (
            <>
              <h1 id="onb-title">What kind of business do you run?</h1>
              <p className="muted">We use this to suggest the right audience, replies and Lead Flows. You can change everything later.</p>
              <div className="type-cards" role="radiogroup" aria-label="Business type">
                {PERSONA_ORDER.map((id) => {
                  const Icon = id === 'coach' ? Briefcase : id === 'webshop' ? ShoppingBag : Store;
                  const pc = PERSONAS[id];
                  return (
                    <button key={id} role="radio" aria-checked={type === id} className={`type-card ${type === id ? 'on' : ''}`} onClick={() => chooseType(id)}>
                      <span className="type-icon"><Icon size={22} aria-hidden /></span>
                      <strong>{pc.label}</strong>
                      <span className="muted small">{id === 'coach' ? 'Coaches, consultants, trainers and other services' : id === 'webshop' ? 'Online shops that sell products' : 'Shops, studios, salons and other local businesses'}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <h1 id="onb-title">What do you want first?</h1>
              <p className="muted">We’ll put the steps for this goal at the top of your checklist.</p>
              <div className="goal-cards" role="radiogroup" aria-label="Goal">
                {goals(type).map((g) => {
                  const Icon = g.icon;
                  return (
                    <button key={g.id} role="radio" aria-checked={goal === g.id} className={`mode-card ${goal === g.id ? 'on' : ''}`} onClick={() => chooseGoal(g.id)}>
                      <span className="type-icon"><Icon size={20} aria-hidden /></span>
                      <strong>{g.title}</strong>
                      <span className="muted small">{g.desc}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h1 id="onb-title">Tell us about your business</h1>
              <Field label="Business name"><input value={b.name} onChange={(e) => setB({ ...b, name: e.target.value })} /></Field>
              <Field label="Website (optional)"><input value={b.website ?? ''} placeholder="https://" onChange={(e) => setB({ ...b, website: e.target.value })} /></Field>
              <Field label="Who do you help?" hint="Used to suggest audiences and to write replies.">
                <textarea rows={3} value={b.whoYouHelp} onChange={(e) => setB({ ...b, whoYouHelp: e.target.value })} />
              </Field>
            </>
          )}

          {step === 4 && (
            <>
              <h1 id="onb-title">What do you offer?</h1>
              <Field label="Your offer"><textarea rows={3} value={b.offer} onChange={(e) => setB({ ...b, offer: e.target.value })} /></Field>
              <Field label="Frequently asked questions" hint="One per line. AI only uses what you write here."><textarea rows={4} value={b.faq} onChange={(e) => setB({ ...b, faq: e.target.value })} /></Field>
              <Field label={cfg.qualifyLabel} hint="These criteria decide when a contact can become Qualified.">
                <textarea rows={2} value={b.qualifyCriteria} onChange={(e) => setB({ ...b, qualifyCriteria: e.target.value })} />
              </Field>
            </>
          )}

          {step === 5 && (
            <>
              <h1 id="onb-title">Connect your accounts</h1>
              <p className="muted">Two separate connections, each with its own status. You can skip this and connect later from the checklist.</p>

              <div className={`onb-conn ${meta === 'connected' ? 'ok' : ''}`}>
                <span className="ig-logo" aria-hidden><Instagram size={22} /></span>
                <div className="onb-conn-text">
                  <strong>Instagram <span className="muted">via Meta</span></strong>
                  <span className="muted small">Content planning and DMs. You approve access on Instagram; MAGNET never sees your password.</span>
                </div>
                {meta === 'connected' ? <Badge tone="green" dot>Connected</Badge> : meta === 'disconnected' && (
                  <button className="btn btn-instagram btn-sm" onClick={() => setMeta('consent')}><Instagram size={14} /> Connect</button>
                )}
              </div>
              {meta === 'consent' && (
                <div className="onb-consent">
                  <p className="small"><strong>Instagram</strong> · MAGNET wants to access <strong>{handle}</strong>: manage content, read and send DMs, read insights.</p>
                  <div className="row gap-sm">
                    <button className="btn btn-instagram btn-sm" onClick={() => setMeta('connected')}>Authorize</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setMeta('disconnected')}>Cancel</button>
                  </div>
                  <p className="muted xsmall"><Lock size={11} /> Simulated Instagram consent screen. No real login happens.</p>
                </div>
              )}

              <div className={`onb-conn ${growth === 'connected' ? 'ok' : ''}`}>
                <span className="pv-logo" aria-hidden><Cpu size={22} /></span>
                <div className="onb-conn-text">
                  <strong>Growth engine</strong>
                  <span className="muted small">
                    {growth === 'pending' ? 'Waiting for the growth service to confirm your account…' : 'Links your account to the growth service. Confirmed by the service, not by this click.'}
                  </span>
                </div>
                {growth === 'connected' && <Badge tone="green" dot>Connected</Badge>}
                {growth === 'pending' && <Badge tone="blue"><RefreshCw size={12} className="spin" /> Pending</Badge>}
                {growth === 'disconnected' && <button className="btn btn-secondary btn-sm" onClick={requestGrowth}>Request connection</button>}
              </div>

              <div className="grid-2 mt">
                <Field label="Account language">
                  <select value={b.language} onChange={(e) => setB({ ...b, language: e.target.value })}>
                    {['English', 'Dutch', 'German', 'Spanish', 'French', 'Portuguese', 'Italian'].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Time zone">
                  <select value={b.timezone} onChange={(e) => setB({ ...b, timezone: e.target.value })}>
                    {['Europe/Amsterdam', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'America/Sao_Paulo', 'Asia/Singapore'].map((l) => <option key={l}>{l}</option>)}
                  </select>
                </Field>
              </div>
            </>
          )}

          {step === 6 && (
            <>
              <h1 id="onb-title">Who do you want to reach?</h1>
              <Field label="Example accounts your ideal clients follow" hint="Press Enter to add. These are search directions, not a promise that their followers become clients.">
                <ChipInput label="Example accounts" values={examples} onChange={setExamples} placeholder="@account" />
              </Field>
              <Field label="Topics"><ChipInput label="Topics" values={aud.topics} onChange={(v) => setAud({ ...aud, topics: v })} placeholder="Add a topic" /></Field>
              <div className="grid-2">
                <Field label="Languages"><ChipInput label="Languages" values={aud.languages} onChange={(v) => setAud({ ...aud, languages: v })} placeholder="Add a language" /></Field>
                <Field label="Regions"><ChipInput label="Regions" values={aud.regions} onChange={(v) => setAud({ ...aud, regions: v })} placeholder="Add a region" /></Field>
              </div>
              <div className="grid-2">
                <Field label="Blocked words" hint="Skip people with these words in their name or bio.">
                  <ChipInput label="Blocked words" values={aud.blockedWords} onChange={(v) => setAud({ ...aud, blockedWords: v.map((w) => w.toLowerCase()) })} placeholder="Add a word" />
                </Field>
                <Field label="Protected accounts" hint="People you always keep, such as partners and customers.">
                  <ChipInput label="Protected accounts" values={aud.protectedAccounts} onChange={(v) => setAud({ ...aud, protectedAccounts: v.map((x) => (x.startsWith('@') ? x : `@${x}`)) })} placeholder="@account" />
                </Field>
              </div>
              <div className="suggest-box">
                <div className="suggest-head"><AiTag>AI suggestions</AiTag><span className="muted small">Based on what you told us</span></div>
                {sugs.filter((s) => s.state !== 'rejected').map((s) => (
                  <div key={s.id} className="suggest-row">
                    {s.state === 'editing' ? (
                      <input aria-label="Adjust topic" value={s.topic} onChange={(e) => setSug(s.id, { topic: e.target.value })} />
                    ) : (
                      <div>
                        <strong>{s.topic}</strong>
                        <div className="muted small">{s.why}</div>
                      </div>
                    )}
                    {s.state === 'accepted' ? (
                      <span className="muted small"><Check size={14} /> Added</span>
                    ) : (
                      <div className="row-actions">
                        <button className="btn btn-sm btn-secondary" onClick={() => { setSug(s.id, { state: 'accepted' }); if (!aud.topics.includes(s.topic)) setAud({ ...aud, topics: [...aud.topics, s.topic] }); }}>
                          <Check size={14} /> Accept
                        </button>
                        {s.state !== 'editing' && <button className="btn btn-sm btn-ghost" onClick={() => setSug(s.id, { state: 'editing' })}><Pencil size={14} /> Adjust</button>}
                        <button className="btn btn-sm btn-ghost" onClick={() => setSug(s.id, { state: 'rejected' })}><X size={14} /> Reject</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {step === 7 && (
            <>
              <h1 id="onb-title">How should replies sound?</h1>
              <Field label="Tone of voice"><textarea rows={2} value={b.tone} onChange={(e) => setB({ ...b, tone: e.target.value })} /></Field>
              <Field label="Topics that always go to you" hint="AI never answers these. The conversation gets the status Needs you.">
                <textarea rows={2} value={b.handoffTopics} onChange={(e) => setB({ ...b, handoffTopics: e.target.value })} />
              </Field>
              <Field label={cfg.linkLabel}><input value={b.bookingLink} onChange={(e) => setB({ ...b, bookingLink: e.target.value })} /></Field>
              <span className="field-label">AI mode</span>
              <div className="mode-cards mt" role="radiogroup" aria-label="AI mode">
                {([
                  ['off', 'Off', 'No AI replies. Active Lead Flows keep sending their approved messages.'],
                  ['assist', 'Assist', 'AI suggests replies. You approve every message. Recommended.'],
                  ['auto', 'Auto', 'AI replies within your rules. Sensitive topics still come to you.'],
                ] as const).map(([id, label, desc]) => (
                  <button key={id} role="radio" aria-checked={ai === id} className={`mode-card ${ai === id ? 'on' : ''}`} onClick={() => setAi(id)}>
                    <strong>{label}</strong>
                    <span className="muted small">{desc}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 8 && (
            <>
              <h1 id="onb-title">Choose your modules</h1>
              <p className="muted">Pay only for what you use. You can add or remove modules any time in Billing.</p>
              <ul className="bl-picker">
                {LISTED.map((m) => (
                  <li key={m.id}>
                    <label className={m.locked ? 'locked' : ''}>
                      <input type="checkbox" checked={mods.includes(m.id)} disabled={m.locked || paying !== 'idle'} onChange={() => setMods((s) => (s.includes(m.id) ? s.filter((x) => x !== m.id) : [...s, m.id]))} />
                      <span><strong>{m.name}</strong><span className="muted small">{m.desc}{m.requires ? ` · needs ${namesOf(m.requires)}` : ''}</span></span>
                      <span className="bl-price">{money(m.priceUsd)}</span>
                    </label>
                  </li>
                ))}
              </ul>
              {deps.map((x) => <p key={x.module} className="field-error">{moduleName(x.module)} needs {moduleName(x.needs)}.</p>)}
              <dl className="summary-list onb-summary">
                <dt>Total</dt><dd><strong>{money(totalUsd(mods))}</strong> per month, excluding tax</dd>
                {TRIAL_DAYS > 0 && <><dt>Free trial</dt><dd><strong>{TRIAL_DAYS} days free.</strong> Nothing is charged today.</dd></>}
                <dt>Billing</dt><dd>{TRIAL_DAYS ? `First payment on ${formatDate(trialEndDate)}, then monthly in ${state.locale.currency}. Cancel before that date and you pay nothing.` : `Monthly in ${state.locale.currency}. Renews on ${formatDate(renewDate)}.`}</dd>
                <dt>Cancel</dt><dd>Any time in Billing, no call needed.</dd>
              </dl>
              {paying === 'idle' && <button className="btn btn-primary" disabled={deps.length > 0} onClick={pay}>{TRIAL_DAYS ? `Start ${TRIAL_DAYS}-day free trial` : `Start subscription · ${money(totalUsd(mods))}/mo`}</button>}
              {paying === 'confirming' && <p className="onb-ok"><RefreshCw size={16} className="spin" aria-hidden /> {TRIAL_DAYS ? 'Starting your trial…' : 'Confirming payment with the billing provider…'}</p>}
              {paying === 'paid' && <p className="onb-ok"><Check size={16} aria-hidden /> {TRIAL_DAYS ? `Trial started (demo). Your modules are ready for ${TRIAL_DAYS} days, free.` : 'Payment confirmed (demo). Your modules are ready.'}</p>}
              <p className="muted xsmall">Demo: no card details are asked and nothing is charged.</p>
            </>
          )}

          <div className="onb-actions">
            <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}><ArrowLeft size={16} /> Back</button>
            <div className="spacer" />
            {step < STEPS.length - 1 ? (
              <button className="btn btn-primary" disabled={canNext[step] === false} onClick={() => setStep(step + 1)}>
                {step === 5 && meta !== 'connected' && growth !== 'connected' ? 'Skip for now' : 'Next'} <ArrowRight size={16} />
              </button>
            ) : (
              <button className="btn btn-primary" disabled={!canNext[8]} onClick={finish}>Go to my workspace <ArrowRight size={16} /></button>
            )}
          </div>
        </section>
        <p className="onb-exit"><a href="#/">Exit setup</a> · Demo data</p>
      </div>
      </div>
    </div>
  );
}
