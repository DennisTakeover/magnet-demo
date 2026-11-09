import { useEffect, useState } from 'react';
import {
  ArrowRight, BarChart3, Briefcase, CalendarDays, Check, CheckCircle2, ChevronDown, ChevronRight, Copy, FileText, Inbox as InboxIcon, Instagram, Layers,
  Link2, Lock, MessageCircle, MessagesSquare, Play, Rocket, RotateCcw, Search, Settings as SettingsIcon, Share2, ShieldCheck, ShoppingBag, SlidersHorizontal,
  Sparkles, SquarePen, Sprout, Store, User, Users, Workflow, LayoutGrid, Wallet,
} from 'lucide-react';
import { PERSONAS, PERSONA_ORDER } from '../personas';
import { navigate, useStore } from '../store';
import { money } from '../i18n/locale';
import { MODULES, STARTER } from '../billing';
import { PROGRAM_RATE, usd } from '../partners';
import MagnetArt from '../components/MagnetArt';
import { EarningsCalculator } from './Partner';
import type { ModuleId } from '../types';

const IMAGES = import.meta.glob('../assets/img/*.jpg', { eager: true, import: 'default' }) as Record<string, string>;
export const img = (name: string) => IMAGES[`../assets/img/${name}.jpg`] ?? '';

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export type PublicPage = 'home' | 'pricing' | 'partners';

export function SiteNav({ active }: { active: PublicPage | null }) {
  return (
    <header className="m-nav-wrap">
      <nav className="m-nav" aria-label="Site">
        <a href="#/" className="m-logo" aria-label="magnet home">magnet</a>
        <div className="m-nav-links">
          <a href="#/" className={active === 'home' ? 'on' : ''}>Product</a>
          <a href="#/partners" className={active === 'partners' ? 'on' : ''}>Partners</a>
          <a href="#/pricing" className={active === 'pricing' ? 'on' : ''}>Pricing</a>
        </div>
        <span className="m-nav-sep" aria-hidden />
        <a className="m-nav-login" href="#/app/overview">Log in</a>
        <a className="btn btn-dark" href="#/onboarding">Get started</a>
      </nav>
    </header>
  );
}

function DemoTag() {
  return <span className="m-demo-tag">Demo data</span>;
}

export default function Entry({ page = 'home' }: { page?: PublicPage }) {
  useEffect(() => window.scrollTo(0, 0), [page]);
  return (
    <div className="m-site">
      <SiteNav active={page} />
      {page === 'home' && <Home />}
      {page === 'pricing' && <Pricing />}
      {page === 'partners' && <PartnersPage />}
      <Footer />
    </div>
  );
}

/* ───────────── Home ───────────── */

function Home() {
  const { state, reset } = useStore();
  return (
    <main>
      <section className="m-hero">
        <h1 className="m-hero-title">Grow your audience<br />with AI.</h1>
        <p className="m-hero-lead">Turn conversations into opportunities.</p>
        <p className="m-hero-sub">Your audience, conversations and next customers. Together.</p>
        <div className="m-ctas">
          <a className="btn btn-primary btn-lg" href="#/onboarding">Get started</a>
          <a className="btn btn-secondary btn-lg" href="#/app/overview"><Play size={16} fill="currentColor" /> Explore the demo</a>
        </div>

        <div className="m-hero-stage">
          <img className="m-photo m-photo-a" src={img('man-curly')} alt="" />
          <img className="m-photo m-photo-b" src={img('woman-sweater')} alt="" />
          <MagnetArt className="m-hero-magnet" size={420} rotate={-24} />
          <ProductMock />
          <DemoTag />
        </div>
      </section>

      <section className="m-section" id="how">
        <div className="m-section-head">
          <span className="m-kicker">How it works</span>
          <h2 className="m-h2">From follower to customer, in one place.</h2>
        </div>
        <div className="m-steps">
          {[
            [Users, 'Choose your audience', 'Topics, regions and example accounts. You stay in control with blocked words and protected accounts.'],
            [BarChart3, 'Grow within your limit', 'MAGNET reaches people who match your audience, within a daily limit you set.'],
            [MessageCircle, 'Reply with AI', 'Every DM gets a suggested reply in your tone. You approve, edit or take over.'],
            [Workflow, 'Turn interest into leads', 'Lead Flows deliver your guide on a keyword. Qualified contacts land in your pipeline.'],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof Users;
            return (
              <div key={t as string} className="m-step">
                <span className={`m-icon tone-${i}`}><I size={22} aria-hidden /></span>
                <div><strong>{t as string}</strong><p>{d as string}</p></div>
                {i < 3 && <ChevronRight className="m-step-arrow" size={20} aria-hidden />}
              </div>
            );
          })}
        </div>
      </section>

      <section className="m-section m-features">
        {[
          [InboxIcon, 'AI Inbox', 'Stay on top of what matters. AI drafts replies from your business info; complaints and “talk to a person” always come to you.', '/app/inbox'],
          [Workflow, 'Lead Flows', 'A keyword comment becomes a delivered guide and a conversation. Each person gets it once.', '/app/flows'],
          [Users, 'Leads', 'One pipeline with a clear next step: a booking, an order or a store visit.', '/app/leads'],
          [CalendarDays, 'Planner', 'Plan posts and attach a Lead Flow, so your content feeds your pipeline.', '/app/planner'],
          [MessagesSquare, 'Comments', 'Useful comment drafts for posts your audience already reads. You approve each one.', '/app/comments'],
          [ShieldCheck, 'Secure by design', 'Connect with Instagram’s own login. We never see or store your password.', '/app/connect'],
        ].map(([Icon, t, d, href]) => {
          const I = Icon as typeof Users;
          return (
            <a key={t as string} className="m-feature" href={`#${href}`}>
              <span className="m-icon"><I size={20} aria-hidden /></span>
              <strong>{t as string}</strong>
              <p>{d as string}</p>
              <span className="m-more">Open in demo <ArrowRight size={14} /></span>
            </a>
          );
        })}
      </section>

      <section className="m-section">
        <div className="m-section-head">
          <span className="m-kicker">Made for your business</span>
          <h2 className="m-h2">See it with your kind of business.</h2>
          <p className="m-sub">Pick an example. Conversations, Lead Flows, goals and numbers all match that business.</p>
        </div>
        <div className="persona-cards">
          {PERSONA_ORDER.map((id) => {
            const pc = PERSONAS[id];
            const Icon = id === 'coach' ? Briefcase : id === 'webshop' ? ShoppingBag : Store;
            return (
              <button key={id} className={`persona-card ${state.persona === id ? 'current' : ''}`} onClick={() => { reset(id); navigate('/app/overview'); }}>
                <span className="persona-top">
                  <span className="persona-tile"><Icon size={22} aria-hidden /></span>
                  <span className="persona-label">{pc.label}</span>
                </span>
                <strong className="persona-name">{pc.example}</strong>
                <span className="persona-blurb">{pc.blurb}</span>
                <span className="persona-goal">Goal: {pc.stage4Plural.toLowerCase()} <ArrowRight size={16} aria-hidden /></span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="m-section m-split">
        <div>
          <span className="m-kicker">Pricing</span>
          <h2 className="m-h2">Your business.<br />Your setup.</h2>
          <p className="m-sub">Pick only the modules you need. Starter from {money(97)} a month, everything for {money(297)}.</p>
          <a className="btn btn-primary btn-lg" href="#/pricing">Build your plan <ArrowRight size={18} /></a>
        </div>
        <div>
          <span className="m-kicker">Partners</span>
          <h2 className="m-h2">Your network.<br />Shared growth.</h2>
          <p className="m-sub">Introduce MAGNET to your audience and earn {PROGRAM_RATE}% of what the customers you refer pay.</p>
          <a className="btn btn-secondary btn-lg" href="#/partners">Become a partner <ArrowRight size={18} /></a>
        </div>
      </section>

      <section className="m-section lfaq" id="faq">
        <div className="m-section-head">
          <span className="m-kicker">FAQ</span>
          <h2 className="m-h2">Questions, answered.</h2>
        </div>
        <div className="lfaq-list">
          {[
            ['Does MAGNET need my Instagram password?', 'No. You connect through Instagram’s own login and approve access there, just like “Log in with Google”. MAGNET never sees or stores your password.'],
            ['Will AI send messages without me?', 'Only if you choose Auto mode. The default is Assist, where you approve every message. Complaints and requests for a person always come to you.'],
            ['What counts as a lead?', 'A new follower or a guide request is not a lead by itself. Contacts become Qualified when they meet your criteria; only a confirmed booking, order or visit moves them to the final stage.'],
            ['Can I change my plan later?', 'Yes. Add a module and it starts right away; remove one and it stops at your next renewal. Your data is kept.'],
            ['Is this a live product?', 'This is an interactive demo with fictional people and sample numbers. It does not connect to Instagram and never sends real messages, posts or payments.'],
          ].map(([q, a]) => (
            <details key={q} className="lfaq-item">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="m-section m-final">
        <h2 className="m-hero-title sm">Ready when you are.</h2>
        <p className="m-hero-sub">Explore the full workspace with example data. No sign-up, nothing sent to Instagram.</p>
        <div className="m-ctas">
          <a className="btn btn-primary btn-lg" href="#/onboarding">Get started</a>
          <a className="btn btn-secondary btn-lg" href="#/app/overview">Explore the demo</a>
        </div>
        <button className="link-btn cta-reset" onClick={() => { reset(); navigate('/'); }}><RotateCcw size={14} /> Reset demo</button>
      </section>
    </main>
  );
}

/** The hero product shot: a small, static rendition of the real app. */
function ProductMock() {
  const msgs = [
    ['woman-portrait', '@luciaromero', 'Love this! Do you have a guide?', '5m', true],
    ['man-glasses', '@marcoklein', 'When is the next workshop?', '12m', true],
    ['woman-sweater', '@an.na.studio', 'Can you share more details?', '18m', false],
    ['man-smile', '@jamespark', 'Is it available internationally?', '24m', false],
  ] as const;
  return (
    <div className="m-mock" aria-hidden>
      <div className="m-mock-side">
        <span className="m-logo sm">magnet</span>
        <span className="m-mock-nav on"><InboxIcon size={15} /> Inbox <b>12</b></span>
        <span className="m-mock-nav"><Sparkles size={15} /> AI replies</span>
        <span className="m-mock-nav"><Users size={15} /> Audience</span>
        <span className="m-mock-nav"><Layers size={15} /> Lead Flows</span>
        <span className="m-mock-nav"><SettingsIcon size={15} /> Settings</span>
      </div>
      <div className="m-mock-inbox">
        <div className="m-mock-head"><strong>Inbox</strong><span><Search size={14} /><SquarePen size={14} /></span></div>
        <div className="m-mock-tabs"><span className="on">All</span><span>Messages</span><span>Comments</span><span>Mentions</span></div>
        {msgs.map(([p, h, t, time, unread]) => (
          <div key={h} className="m-mock-msg">
            <i className={unread ? 'dot' : 'dot off'} />
            <img src={img(p)} alt="" />
            <span><b>{h}</b><em>{t}</em></span>
            <small>{time}</small>
          </div>
        ))}
      </div>
      <div className="m-mock-ov">
        <div className="m-mock-head"><strong>Overview</strong><span className="m-mock-pill">Last 7 days <ChevronDown size={12} /></span></div>
        <svg viewBox="0 0 240 90" className="m-mock-chart">
          <defs>
            <linearGradient id="mockfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7b5cff" stopOpacity="0.35" /><stop offset="100%" stopColor="#7b5cff" stopOpacity="0" /></linearGradient>
          </defs>
          <path d="M0 74 C20 62 30 70 48 60 S80 66 96 50 S124 52 140 40 S170 46 186 30 S214 22 240 8 L240 90 L0 90 Z" fill="url(#mockfill)" />
          <path d="M0 74 C20 62 30 70 48 60 S80 66 96 50 S124 52 140 40 S170 46 186 30 S214 22 240 8" fill="none" stroke="#6a46ff" strokeWidth="2.5" />
        </svg>
        <div className="m-mock-tiles">
          <span className="blue"><small>New conversations</small><b>+1,892</b></span>
          <span className="yellow"><small>Qualified leads</small><b>214</b></span>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Pricing ───────────── */

const MOD_ICON: Record<ModuleId, typeof BarChart3> = { core: LayoutGrid, grow: BarChart3, inbox: InboxIcon, flows: Workflow, comments: MessageCircle, planner: CalendarDays };
const MOD_TAG: Record<ModuleId, string> = {
  core: 'Overview, Leads, settings and support. Always included.',
  grow: 'Reach people who match your audience.',
  inbox: 'Stay on top of what matters, with AI replies.',
  flows: 'Turn a keyword into a delivered guide and a lead.',
  comments: 'Useful comment drafts you approve.',
  planner: 'Plan posts that feed your Lead Flows.',
};

function Pricing() {
  const [sel, setSel] = useState<ModuleId[]>(['core', 'grow', 'inbox', 'flows']);
  const toggle = (m: ModuleId, on: boolean) => {
    let next = on ? [...sel, m] : sel.filter((x) => x !== m);
    if (on && m === 'flows' && !next.includes('inbox')) next = [...next, 'inbox'];
    if (!on && m === 'inbox') next = next.filter((x) => x !== 'flows');
    setSel(next);
  };
  const total = MODULES.filter((m) => sel.includes(m.id)).reduce((t, m) => t + m.priceUsd, 0);
  const preset = (mods: ModuleId[]) => setSel(mods);
  return (
    <main>
      <section className="m-hero m-hero-tight">
        <h1 className="m-hero-title">Your business. Your setup.</h1>
        <p className="m-hero-lead">Choose the tools that fit the way you grow.</p>
        <span className="m-yellow-pill">Plan builder</span>
      </section>
      <section className="m-builder-wrap">
        <img className="m-photo m-photo-c" src={img('woman-sweater')} alt="" />
        <MagnetArt className="m-corner-magnet" size={130} rotate={-30} />
        <div className="m-builder">
          <div className="m-builder-list" role="group" aria-label="Modules">
            {MODULES.map((m) => {
              const I = MOD_ICON[m.id];
              const on = sel.includes(m.id);
              return (
                <label key={m.id} className={`m-mod ${on ? 'on' : ''}`}>
                  <span className="m-icon"><I size={20} aria-hidden /></span>
                  <span className="m-mod-text"><strong>{m.name}</strong><span>{MOD_TAG[m.id]}{m.requires ? ` Needs ${MODULES.find((x) => x.id === m.requires![0])!.name}.` : ''}</span></span>
                  <span className="m-mod-price">{money(m.priceUsd)}<small>/mo</small></span>
                  <input type="checkbox" role="switch" className="switch" checked={on} disabled={m.locked} onChange={(e) => toggle(m.id, e.target.checked)} aria-label={m.name} />
                </label>
              );
            })}
          </div>
          <aside className="m-selection" aria-live="polite">
            <h2>Your selection</h2>
            <ul>
              {MODULES.filter((m) => sel.includes(m.id)).map((m) => {
                const I = MOD_ICON[m.id];
                return <li key={m.id}><span className="m-icon sm"><I size={16} aria-hidden /></span>{m.name}</li>;
              })}
            </ul>
            <div className="m-total">
              <span>Per month</span>
              <strong data-testid="plan-total">{money(total)}</strong>
              <small>No bundle discount, so removing a module always saves money.</small>
            </div>
            <div className="m-presets">
              <button className="btn btn-sm btn-secondary" onClick={() => preset([...STARTER])}>Starter · {money(97)}</button>
              <button className="btn btn-sm btn-secondary" onClick={() => preset(MODULES.map((m) => m.id))}>Everything · {money(297)}</button>
            </div>
            <a className="btn btn-primary btn-lg btn-block" href="#/onboarding">Start with this setup <ArrowRight size={18} /></a>
          </aside>
        </div>
      </section>
      <section className="m-section m-tiles">
        {[
          [Layers, 'Clear module choices', 'Pick only what you need, nothing more.'],
          [SlidersHorizontal, 'Manage your subscription', 'Add or remove modules yourself as your needs change.'],
          [Sprout, 'Built to grow with you', 'Add more tools when the time is right.'],
        ].map(([Icon, t, d]) => {
          const I = Icon as typeof Layers;
          return <div key={t as string} className="m-tile"><span className="m-icon"><I size={20} aria-hidden /></span><div><strong>{t as string}</strong><p>{d as string}</p></div></div>;
        })}
      </section>
      <section className="m-section m-dfy">
        <div>
          <span className="m-kicker">Done for you</span>
          <h2 className="m-h2">Rather have us run it?</h2>
          <p className="m-sub">Book a CMO strategy call from {money(250)} an hour, or let our team run your Instagram growth end to end.</p>
        </div>
        <a className="btn btn-secondary btn-lg" href="#/app/dfy"><Rocket size={18} /> See Done for you</a>
      </section>
      <DemoTagRow />
    </main>
  );
}

function DemoTagRow() {
  return <p className="m-demo-row">Prices in your currency · Demo data</p>;
}

/* ───────────── Partners ───────────── */

function PartnersPage() {
  return (
    <main>
      <section className="m-partner-hero">
        <div className="m-partner-copy">
          <h1 className="m-hero-title left">Your network.<br />Shared growth.</h1>
          <p className="m-hero-lead left">Introduce MAGNET to your audience and build a recurring partnership.</p>
          <div className="m-ctas left">
            <a className="btn btn-primary btn-lg" href="#/app/partner">Apply to partner</a>
            <a className="btn btn-secondary btn-lg" href="#steps" onClick={scrollTo('steps')}><Play size={16} fill="currentColor" /> How it works</a>
          </div>
        </div>
        <div className="m-partner-photos" aria-hidden>
          <img className="m-photo p1" src={img('woman-portrait')} alt="" />
          <img className="m-photo p2" src={img('man-smile')} alt="" />
          <img className="m-photo p3" src={img('man-glasses')} alt="" />
          <MagnetArt className="m-partner-magnet" size={260} rotate={-28} />
        </div>
      </section>

      <section className="m-section m-steps" id="steps">
        {[
          [FileText, 'Apply', 'Tell us about you and your audience.'],
          [CheckCircle2, 'Get approved', 'We review your application and agree clear terms.'],
          [Share2, 'Share MAGNET', 'Use your personal link or code.'],
          [Wallet, `Earn ${PROGRAM_RATE}%`, 'Of what the customers you refer pay, every month.'],
        ].map(([Icon, t, d], i) => {
          const I = Icon as typeof FileText;
          return (
            <div key={t as string} className="m-step">
              <span className={`m-icon tone-${i}`}><I size={22} aria-hidden /></span>
              <div><strong>{t as string}</strong><p>{d as string}</p></div>
              {i < 3 && <ChevronRight className="m-step-arrow" size={20} aria-hidden />}
            </div>
          );
        })}
      </section>

      <section className="m-section m-partner-detail">
        <div>
          <h2 className="m-hero-title sm left">Product access.<br />A personal link.<br />Clear earnings.</h2>
          <p className="m-sub">Complimentary access to the modules you promote and {PROGRAM_RATE}% of what your referred customers pay, under a clear written agreement. A Starter customer ({usd(97)}/month) earns you {usd(97 * PROGRAM_RATE / 100)} a month; a Growth customer ({usd(297)}) earns you {usd(297 * PROGRAM_RATE / 100)}. Amounts in USD.</p>
          <ul className="m-checks">
            <li><Check size={16} /> Earnings, payouts and every referral in one dashboard</li>
            <li><Check size={16} /> Paid after a short hold, once confirmed</li>
            <li><Check size={16} /> Not guaranteed income: it depends on what customers pay</li>
          </ul>
        </div>
        <div className="m-partner-mock" aria-hidden>
          <div className="m-mock-side">
            <span className="m-logo sm">magnet</span>
            <span className="m-mock-nav on"><User size={15} /> Partner</span>
            <span className="m-mock-nav"><LayoutGrid size={15} /> Overview</span>
            <span className="m-mock-nav"><Link2 size={15} /> Referrals</span>
            <span className="m-mock-nav"><BarChart3 size={15} /> Earnings</span>
            <span className="m-mock-nav"><SettingsIcon size={15} /> Settings</span>
          </div>
          <div className="m-pm-main">
            <div className="m-mock-head"><strong>Partner dashboard</strong><span className="m-mock-pill"><CalendarDays size={12} /> Last 30 days</span></div>
            <div className="m-pm-grid">
              <div className="m-pm-approved"><CheckCircle2 size={22} /><span><b>Application approved</b><small>You’re in the partner program.</small></span></div>
              <div className="m-pm-earn">
                <b>Earnings overview</b>
                <svg viewBox="0 0 200 70"><path d="M0 60 C20 50 30 56 48 44 S80 48 96 36 S124 40 140 26 S176 10 200 6" fill="none" stroke="#6a46ff" strokeWidth="2.5" /></svg>
              </div>
              <div className="m-pm-link"><b>Your referral link</b><span><Link2 size={13} /> magnet.app/r/your-link <Copy size={13} /></span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="m-section">
        <EarningsCalculator rate={PROGRAM_RATE} duration={12} />
        <div className="m-ctas left"><a className="btn btn-primary btn-lg" href="#/app/partner">Apply to partner <ArrowRight size={18} /></a></div>
      </section>
      <DemoTagRow />
    </main>
  );
}

function Footer() {
  return (
    <footer className="m-footer">
      <div className="m-footer-inner">
        <div>
          <span className="m-logo">magnet</span>
          <p className="muted small">Grow your audience with AI. Turn conversations into opportunities.</p>
          <span className="m-footer-connect"><Instagram size={16} /> Connects securely via Meta · <Lock size={14} /> we never see your password</span>
        </div>
        <nav className="m-footer-cols" aria-label="Footer">
          <div><h3>Product</h3><a href="#/app/grow">Grow</a><a href="#/app/inbox">Inbox</a><a href="#/app/flows">Lead Flows</a><a href="#/app/planner">Planner</a></div>
          <div><h3>Company</h3><a href="#/pricing">Pricing</a><a href="#/partners">Partners</a><a href="#/app/dfy">Done for you</a></div>
          <div><h3>Demo</h3><a href="#/app/overview">Open workspace</a><a href="#/onboarding">Onboarding</a><a href="#/admin/operations">Admin view</a></div>
        </nav>
      </div>
      <p className="m-footer-note">Interactive demo with fictional people and sample numbers. Not affiliated with Instagram or Meta. Nothing is sent to Instagram and no payments are taken.</p>
    </footer>
  );
}

