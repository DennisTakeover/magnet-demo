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
import { BRAND, IS_PROMOVIEW, TRIAL_DAYS } from '../brand';
import PromoviewHome from './PromoviewHome';
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
        <a href="#/" className="m-logo" aria-label={`${BRAND.wordmark} home`}>{BRAND.wordmark}</a>
        <div className="m-nav-links">
          <a href="#/" className={active === 'home' ? 'on' : ''}>Product</a>
          <a href="#/partners" className={active === 'partners' ? 'on' : ''}>Partners</a>
          <a href="#/pricing" className={active === 'pricing' ? 'on' : ''}>{IS_PROMOVIEW ? 'Prijzen' : 'Pricing'}</a>
        </div>
        <span className="m-nav-sep" aria-hidden />
        <a className="m-nav-login" href="#/app/overview">{IS_PROMOVIEW ? 'Inloggen' : 'Log in'}</a>
        <a className="btn btn-dark" href="#/onboarding">{IS_PROMOVIEW ? 'Begin direct' : 'Get started'}</a>
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
      {page === 'home' && (IS_PROMOVIEW ? <PromoviewHome /> : <Home />)}
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
    <main className="m-home">
      <section className="m-hero">
        <h1 className="m-hero-title">Grow your audience<br />with AI.</h1>
        <p className="m-hero-lead">Turn conversations into opportunities.</p>
        <p className="m-hero-sub">Your audience, conversations and next customers. Together.</p>
        <div className="m-ctas">
          <a className="btn btn-primary btn-lg" href="#/onboarding" data-cta="hero-start">Get started</a>
          <a className="btn btn-secondary btn-lg" href="#vsl" onClick={scrollTo('vsl')} data-cta="hero-video"><Play size={16} fill="currentColor" /> Watch demo</a>
        </div>
        <ul className="m-reassure" aria-label="Good to know">
          <li><Check size={15} aria-hidden /> Free to set up</li>
          <li><Lock size={15} aria-hidden /> No password needed</li>
          <li><Check size={15} aria-hidden /> Cancel any time</li>
        </ul>

        <div className="m-hero-stage">
          <img className="m-photo m-photo-a" src={img('man-curly')} alt="" />
          <img className="m-photo m-photo-b" src={img('woman-sweater')} alt="" />
          <MagnetArt className="m-hero-magnet" size={420} rotate={-24} />
          <ProductMock />
          <DemoTag />
        </div>
      </section>

      <section className="m-trust" aria-label="Why owners trust it">
        <span><Instagram size={18} aria-hidden /> Official Instagram login</span>
        <span><ShieldCheck size={18} aria-hidden /> You approve every AI reply</span>
        <span><SlidersHorizontal size={18} aria-hidden /> Daily limits you control</span>
        <span><Layers size={18} aria-hidden /> Only pay for the modules you use</span>
      </section>

      <VideoSection />

      <section className="m-section">
        <div className="m-section-head">
          <span className="m-kicker">Sound familiar?</span>
          <h2 className="m-h2">Instagram works. Keeping up with it doesn’t.</h2>
        </div>
        <div className="m-pains">
          {[
            ['DMs pile up', 'Questions wait for days, and warm leads go cold before you answer.', 'Every DM gets a suggested reply in your tone. You approve it in seconds.'],
            ['Comments go nowhere', 'People comment “interested” under a post, and nothing happens next.', 'A Lead Flow sends your guide the moment they use your keyword.'],
            ['Growth is guesswork', 'You post and hope the right people find you.', 'Grow reaches people who match your audience, within your daily limit.'],
          ].map(([t, pain, fix]) => (
            <article key={t} className="m-pain">
              <strong>{t}</strong>
              <p className="m-pain-q">{pain}</p>
              <p className="m-pain-a"><ArrowRight size={16} aria-hidden /> {fix}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="m-section" id="how">
        <div className="m-section-head">
          <span className="m-kicker">How it works</span>
          <h2 className="m-h2">Live in three steps.</h2>
          <p className="m-sub">Most owners finish setup in one sitting.</p>
        </div>
        <div className="m-steps three">
          {[
            [Instagram, 'Connect Instagram', 'Log in on Instagram’s own screen and approve access. About 2 minutes.'],
            [Users, 'Describe your audience', 'Topics, regions and example accounts. MAGNET suggests the rest. About 5 minutes.'],
            [MessageCircle, 'Approve your first reply', 'Open a conversation, check the AI draft and send. That’s your first result.'],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof Users;
            return (
              <div key={t as string} className="m-step">
                <span className={`m-icon tone-${i}`}><I size={22} aria-hidden /></span>
                <div><span className="m-step-n">Step {i + 1}</span><strong>{t as string}</strong><p>{d as string}</p></div>
                {i < 2 && <ChevronRight className="m-step-arrow" size={20} aria-hidden />}
              </div>
            );
          })}
        </div>
        <div className="m-ctas center-cta"><a className="btn btn-primary btn-lg" href="#/onboarding" data-cta="steps-start">Start free setup <ArrowRight size={18} /></a></div>
      </section>

      <section className="m-section m-features">
        {[
          [InboxIcon, 'AI Inbox', 'Stay on top of what matters. AI drafts replies from your business info; complaints and “talk to a person” always come to you.', '/app/inbox'],
          [Workflow, 'Lead Flows', 'A keyword comment becomes a delivered guide and a conversation. Each person gets it once.', '/app/flows'],
          [Users, 'Leads', 'One pipeline with a clear next step: a booking, an order or a store visit.', '/app/leads'],
          [CalendarDays, 'Planner', 'Plan posts and attach a Lead Flow, so your content feeds your pipeline.', '/app/planner'],
          [MessagesSquare, 'Comments', 'Useful comment drafts for posts your audience already reads. You approve each one.', '/app/comments'],
          [Layers, 'Multiple accounts', 'Run your business and personal brand, or several shops, from one workspace.', '/app/connect'],
        ].map(([Icon, t, d, href]) => {
          const I = Icon as typeof Users;
          return (
            <a key={t as string} className="m-feature" href={`#${href}`}>
              <span className="m-icon"><I size={20} aria-hidden /></span>
              <strong>{t as string}</strong>
              <p>{d as string}</p>
              <span className="m-more">See it in the demo <ArrowRight size={14} /></span>
            </a>
          );
        })}
      </section>

      <section className="m-section m-control">
        <div>
          <span className="m-kicker">You stay in control</span>
          <h2 className="m-h2">Automation that never acts behind your back.</h2>
          <ul className="m-checks big">
            <li><Check size={18} /> Assist mode by default: you approve every AI reply</li>
            <li><Check size={18} /> Complaints and requests for a person always come to you</li>
            <li><Check size={18} /> Daily limits, blocked words and protected accounts you set</li>
            <li><Check size={18} /> Pause everything in one click, any time</li>
            <li><Check size={18} /> We never ask for or store your Instagram password</li>
          </ul>
        </div>
        <div className="m-control-art" aria-hidden>
          <img className="m-photo" src={img('woman-portrait')} alt="" />
          <div className="m-approve-card">
            <span className="ai-label"><Sparkles size={14} /> AI draft</span>
            <p>Yes, we can fit it around your travel. What’s the biggest challenge right now?</p>
            <span className="m-approve-actions"><span className="btn btn-sm btn-secondary">Edit</span><span className="btn btn-sm btn-primary">Approve &amp; send</span></span>
          </div>
        </div>
      </section>

      <section className="m-section">
        <div className="m-section-head">
          <span className="m-kicker">Built for businesses like yours</span>
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

      <ReviewsSection />

      <section className="m-section" id="pricing-preview">
        <div className="m-section-head">
          <span className="m-kicker">Pricing</span>
          <h2 className="m-h2">Build your own subscription.</h2>
          <p className="m-sub">Switch modules on or off and see your price right away. Change it any time. Prices in {state.locale.currency}.</p>
        </div>
        <PlanBuilder />
        <p className="m-plan-more"><a href="#/app/dfy">Prefer we run it for you? See Done for you <ArrowRight size={14} /></a></p>
      </section>

      <section className="m-section lfaq" id="faq">
        <div className="m-section-head">
          <span className="m-kicker">FAQ</span>
          <h2 className="m-h2">Questions, answered.</h2>
        </div>
        <div className="lfaq-list">
          {[
            ['Does MAGNET need my Instagram password?', 'No. You connect through Instagram’s own login and approve access there, just like “Log in with Google”. MAGNET never sees or stores your password.'],
            ['Is it safe for my Instagram account?', 'MAGNET uses the official Instagram connection for messages and content, and growth runs within a daily limit you set. You can pause everything in one click.'],
            ['Will AI send messages without me?', 'Only if you choose Auto mode. The default is Assist, where you approve every message. Complaints and requests for a person always come to you.'],
            ['How much time does it take?', 'Setup takes one sitting. After that, most days are a few minutes of approving replies and checking your leads.'],
            ['Can I connect more than one account?', 'Yes. Connect several Instagram accounts, for example your business and your personal brand, and switch between them or see everything together.'],
            ['Can I change my plan or cancel?', 'Yes, yourself, in Billing. Adding a module starts right away; removing one or cancelling takes effect at your next renewal. Your data is kept.'],
            ['What counts as a lead?', 'A new follower or a guide request is not a lead by itself. Contacts become Qualified when they meet your criteria; only a confirmed booking, order or visit moves them to the final stage.'],
            ['Is this a live product?', 'This is an interactive demo with fictional people and sample numbers. It does not connect to Instagram and never sends real messages, posts or payments.'],
          ].map(([q, a]) => (
            <details key={q} className="lfaq-item">
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="m-section">
        <div className="m-final-band">
          <MagnetArt className="m-final-magnet" size={220} rotate={-20} />
          <h2 className="m-hero-title sm">Ready to turn followers into customers?</h2>
          <p>Set up in one sitting. Free to start, no password needed.</p>
          <div className="m-ctas">
            <a className="btn btn-white btn-lg" href="#/onboarding" data-cta="final-start">Start free setup <ArrowRight size={18} /></a>
            <a className="btn btn-outline-white btn-lg" href="#/app/overview" data-cta="final-demo">Explore the demo</a>
          </div>
        </div>
        <p className="center"><button className="link-btn cta-reset" onClick={() => { reset(); navigate('/'); }}><RotateCcw size={14} /> Reset demo</button></p>
      </section>

      <div className="m-sticky-cta" role="complementary" aria-label="Get started">
        <span><strong>magnet</strong> · free to set up</span>
        <a className="btn btn-primary" href="#/onboarding" data-cta="sticky-start">Start free</a>
      </div>
    </main>
  );
}

/**
 * Video sales letter slot. Set VSL_URL to an embeddable video link (YouTube, Vimeo, Wistia)
 * and the placeholder becomes the real player.
 */
export const VSL_URL = '';

export function VideoSection({ title = 'See magnet in 2 minutes.', sub = 'From a comment on your post to a booked customer, step by step.', cta = 'Get started', demo = 'Explore the live demo', caption = 'Watch the 2-minute walkthrough' }: { title?: string; sub?: string; cta?: string; demo?: string; caption?: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <section className="m-section m-vsl" id="vsl">
      <div className="m-section-head">
        <span className="m-kicker">Watch</span>
        <h2 className="m-h2">{title}</h2>
        <p className="m-sub">{sub}</p>
      </div>
      <div className="m-vsl-frame">
        {VSL_URL && playing ? (
          <iframe src={VSL_URL} title="magnet video" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
        ) : (
          <button className="m-vsl-poster" onClick={() => setPlaying(true)} aria-label="Play video">
            <MagnetArt className="m-vsl-magnet" size={300} rotate={-18} />
            <span className="m-vsl-play"><Play size={34} fill="currentColor" /></span>
            <span className="m-vsl-caption">{playing && !VSL_URL ? 'Video placeholder: your sales video goes here' : caption}</span>
          </button>
        )}
      </div>
      <div className="m-ctas center-cta">
        <a className="btn btn-primary btn-lg" href="#/onboarding" data-cta="vsl-start">{cta} <ArrowRight size={18} /></a>
        <a className="btn btn-secondary btn-lg" href="#/app/overview" data-cta="vsl-demo">{demo}</a>
      </div>
    </section>
  );
}

/**
 * Review slots in Trustpilot's visual style. These are empty placeholders: real reviews and the
 * real score come from the official Trustpilot widget once the business profile exists.
 */
function Stars({ empty }: { empty?: boolean }) {
  return (
    <span className={`tp-stars ${empty ? 'tp-none' : ''}`} aria-hidden>
      {[0, 1, 2, 3, 4].map((i) => <span key={i} className="tp-star"><svg viewBox="0 0 24 24" width="16" height="16"><path fill="#fff" d="M12 2.5l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.7l7.1-.6z" /></svg></span>)}
    </span>
  );
}

function ReviewsSection() {
  return (
    <section className="m-section m-reviews" id="reviews">
      <div className="m-section-head">
        <span className="m-kicker">Reviews</span>
        <h2 className="m-h2">What customers say.</h2>
      </div>
      <div className="tp-summary">
        <span className="tp-brand"><span className="tp-star lg"><svg viewBox="0 0 24 24" width="22" height="22"><path fill="#fff" d="M12 2.5l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.7l7.1-.6z" /></svg></span> Trustpilot</span>
        <Stars empty />
        <span className="muted">Score and review count appear here once the Trustpilot widget is connected.</span>
      </div>
      <div className="tp-grid">
        {['Coach', 'Webshop', 'Local shop'].map((who) => (
          <article key={who} className="tp-card placeholder">
            <Stars empty />
            <strong>Review title</strong>
            <p>A real customer review will be shown here, pulled from Trustpilot.</p>
            <span className="tp-author"><span className="tp-avatar" aria-hidden /> <span><b>Customer name</b><small>{who} · verified review</small></span></span>
          </article>
        ))}
      </div>
      <p className="m-demo-row">Placeholder. No reviews are shown until real, verified ones exist.</p>
    </section>
  );
}

/** The hero product shot: a small, static rendition of the real app. */
export function ProductMock() {
  const msgs = [
    ['woman-portrait', '@luciaromero', 'Love this! Do you have a guide?', '5m', true],
    ['man-glasses', '@marcoklein', 'When is the next workshop?', '12m', true],
    ['woman-sweater', '@an.na.studio', 'Can you share more details?', '18m', false],
    ['man-smile', '@jamespark', 'Is it available internationally?', '24m', false],
  ] as const;
  return (
    <div className="m-mock" aria-hidden>
      <div className="m-mock-side">
        <span className="m-logo sm">{BRAND.wordmark}</span>
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

/** Price calculator: toggle modules and see the monthly total. Used on the home and pricing pages. */
export function PlanBuilder() {
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
        <a className="btn btn-primary btn-lg btn-block" href="#/onboarding">{TRIAL_DAYS ? `Start ${TRIAL_DAYS} dagen gratis` : 'Start with this setup'} <ArrowRight size={18} /></a>
            {TRIAL_DAYS > 0 && <small className="m-trial-note">Eerste betaling pas na {TRIAL_DAYS} dagen. Binnen die tijd opzeggen kost niets.</small>}
      </aside>
    </div>
  );
}

function Pricing() {
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
        <PlanBuilder />
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
            <span className="m-logo sm">{BRAND.wordmark}</span>
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
          <span className="m-logo">{BRAND.wordmark}</span>
          <p className="muted small">{IS_PROMOVIEW ? 'Groei je Instagram met AI. Maak van volgers klanten.' : 'Grow your audience with AI. Turn conversations into opportunities.'}</p>
          {IS_PROMOVIEW && <p className="muted xsmall">De Nieuwe Erven 3, 5431NV Cuijk · KVK 81663285 · Btw NL004430239B63 · Tel 0685888134 · info@promo-view.nl</p>}
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

