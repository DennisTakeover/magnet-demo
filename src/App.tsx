import { useEffect, useState, type ReactNode } from 'react';
import {
  House, BarChart3, MessageCircle, Link2, Users, CalendarDays, Settings as SettingsIcon, HelpCircle,
  Activity as ActivityIcon, Building2, LifeBuoy, Gauge, Menu, X, CheckCircle2, Info, AlertTriangle, XCircle, WifiOff, Rocket, MessagesSquare, CreditCard, Lock, Handshake, Tags, LineChart,
} from 'lucide-react';
import { useRoute, useStore } from './store';
import { applyStage4Label, Avatar, Skeleton } from './components/ui';
import { t } from './i18n/locale';
import { setActiveLocale } from './i18n/locale';
import DemoControls from './components/DemoControls';
import AccountSwitcher from './components/AccountSwitcher';
import TeamChatWidget from './components/TeamChat';
import Messages from './admin/Messages';
import Entry from './screens/Entry';
import Onboarding from './screens/Onboarding';
import Overview from './screens/Overview';
import Grow from './screens/Grow';
import Inbox from './screens/Inbox';
import LeadFlows from './screens/LeadFlows';
import FlowBuilder from './screens/FlowBuilder';
import FlowDetail from './screens/FlowDetail';
import Leads from './screens/Leads';
import Planner from './screens/Planner';
import Settings from './screens/Settings';
import DoneForYou from './screens/DoneForYou';
import Comments from './screens/Comments';
import Billing from './screens/Billing';
import Partner from './screens/Partner';
import { entitledModules } from './partners';
import { BRAND } from './brand';
import { deniedReason, viewer } from './team';
import LockedModule, { GATED } from './screens/LockedModule';
import Connect from './screens/Connect';
import Help from './screens/Help';
import Operations from './admin/Operations';
import Clients from './admin/Clients';
import ClientDetail from './admin/ClientDetail';
import AdminActivity from './admin/Activity';
import Support from './admin/Support';
import Partners from './admin/Partners';
import PlansOffers from './admin/PlansOffers';
import Analytics from './admin/Analytics';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span className="wordmark" style={{ fontSize: size }}>
      {BRAND.wordmark}
    </span>
  );
}

const CLIENT_NAV = [
  { path: '/app/overview', tkey: 'nav.overview', icon: House },
  { path: '/app/grow', tkey: 'nav.grow', icon: BarChart3 },
  { path: '/app/inbox', tkey: 'nav.inbox', icon: MessageCircle },
  { path: '/app/flows', tkey: 'nav.flows', icon: Link2 },
  { path: '/app/comments', tkey: 'nav.comments', icon: MessagesSquare },
  { path: '/app/leads', tkey: 'nav.leads', icon: Users },
  { path: '/app/planner', tkey: 'nav.planner', icon: CalendarDays },
  { path: '/app/dfy', tkey: 'nav.dfy', icon: Rocket },
];
const CLIENT_NAV_BOTTOM = [
  { path: '/app/settings', tkey: 'nav.settings', icon: SettingsIcon },
  { path: '/app/billing', tkey: 'nav.billing', icon: CreditCard },
  { path: '/app/partner', tkey: 'nav.partner', icon: Handshake },
  { path: '/app/help', tkey: 'nav.help', icon: HelpCircle },
];
const ADMIN_NAV = [
  { path: '/admin/operations', tkey: 'nav.operations', icon: Gauge },
  { path: '/admin/clients', tkey: 'nav.clients', icon: Building2 },
  { path: '/admin/activity', tkey: 'nav.activity', icon: ActivityIcon },
  { path: '/admin/messages', tkey: 'nav.messages', icon: MessageCircle },
  { path: '/admin/support', tkey: 'nav.support', icon: LifeBuoy },
  { path: '/admin/plans', tkey: 'nav.plans', icon: Tags },
  { path: '/admin/partners', tkey: 'nav.partners', icon: Handshake },
  { path: '/admin/analytics', tkey: 'nav.analytics', icon: LineChart },
];

function Toaster() {
  const { toasts, dismissToast } = useStore();
  const icons = { success: CheckCircle2, info: Info, warning: AlertTriangle, error: XCircle };
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = icons[t.tone];
        return (
          <div key={t.id} className={`toast toast-${t.tone}`}>
            <Icon size={18} aria-hidden />
            <span>{t.text}</span>
            {t.action && (
              <a className="toast-action" href={`#${t.action.href}`} onClick={() => dismissToast(t.id)}>
                {t.action.label}
              </a>
            )}
            <button className="icon-btn" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function Shell({ role, path, children }: { role: 'client' | 'admin'; path: string; children: ReactNode }) {
  const { state, update } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const section = path.split('/').slice(0, 3).join('/');

  useEffect(() => setMenuOpen(false), [path]);
  useEffect(() => {
    if (!state.sim.slowLoading) return;
    setLoading(true);
    const t = window.setTimeout(() => setLoading(false), 1200);
    return () => window.clearTimeout(t);
  }, [section, state.sim.slowLoading]);

  const unread = state.sim.emptyInbox ? 0 : state.conversations.filter((c) => c.unread).length;
  const chatUnread = state.teamChat.filter((m) => m.from === 'client' && !m.readByTeam).length;
  const nav = role === 'client' ? CLIENT_NAV : ADMIN_NAV;
  const link = (n: (typeof CLIENT_NAV)[number]) => {
    const active = section === n.path || path.startsWith(n.path + '/');
    const Icon = n.icon;
    return (
      <a key={n.path} href={`#${n.path}`} className={`nav-link ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined}>
        <Icon size={20} aria-hidden />
        <span>{t(n.tkey)}</span>
        {GATED[n.path.split('/')[2]] && !entitledModules(state).includes(GATED[n.path.split('/')[2]]) && <Lock size={14} aria-label="Not in your plan" className="nav-lock" />}
        {role === 'client' && deniedReason(state, n.path.split('/')[2]) && <Lock size={14} aria-label="No access" className="nav-lock" />}
        {n.path === '/app/inbox' && unread > 0 && <span className="nav-count" aria-label={`${unread}`}>{unread}</span>}
        {n.path === '/admin/messages' && chatUnread > 0 && <span className="nav-count" aria-label={`${chatUnread} unread`}>{chatUnread}</span>}
      </a>
    );
  };

  return (
    <div className={`shell shell-${role}`}>
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
        <div className="sidebar-top">
          <a href="#/" className="sidebar-logo" aria-label="MAGNET demo home">
            <Logo />
          </a>
          {role === 'admin' && <span className="admin-tag">Admin</span>}
          <button className="icon-btn mobile-only" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <X size={20} />
          </button>
        </div>
        {role === 'client' ? (
          <AccountSwitcher />
        ) : (
          <div className="user-card">
            <Avatar name="Sophie Laurent" color="#15171C" size={40} />
            <span className="user-card-text">
              <strong>Sophie Laurent</strong>
              <span className="muted xsmall">MAGNET team</span>
            </span>
          </div>
        )}
        <nav className="nav">{nav.map(link)}</nav>
        {role === 'client' && <nav className="nav nav-bottom">{CLIENT_NAV_BOTTOM.map(link)}</nav>}
      </aside>
      {menuOpen && <div className="scrim" onClick={() => setMenuOpen(false)} />}
      <div className="main-col">
        <header className="topbar">
          <button className="icon-btn mobile-only" aria-label="Open menu" onClick={() => setMenuOpen(true)}>
            <Menu size={22} />
          </button>
          <span className="mobile-only">
            <Logo size={22} />
          </span>
          <div className="topbar-spacer" />
          <DemoControls />
        </header>
        {role === 'client' && viewer(state) && (
          <div className="banner preview-banner" role="status">
            <span><strong>Previewing as {viewer(state)!.name}</strong> (team member). You see only what they can see.</span>
            <button className="btn btn-sm" onClick={() => update((d) => { d.viewAs = null; })}>Exit preview</button>
          </div>
        )}
        {role === 'client' && state.connection === 'disconnected' && (
          <div className="banner banner-red" role="alert">
            <WifiOff size={18} aria-hidden />
            <span>
              <strong>Instagram is disconnected.</strong> Grow and Lead Flows are on hold and no messages can be sent until you reconnect.
            </span>
            <a className="btn btn-sm btn-secondary" href="#/app/connect">Reconnect</a>
          </div>
        )}
        <main id="main" className="content" tabIndex={-1}>
          {loading ? <Skeleton /> : children}
        </main>
      </div>
      {role === 'client' && (
        <nav className="bottom-nav" aria-label="Quick navigation">
          {CLIENT_NAV.filter((n) => !['/app/planner', '/app/dfy', '/app/comments'].includes(n.path)).map((n) => {
            const Icon = n.icon;
            const active = section === n.path;
            return (
              <a key={n.path} href={`#${n.path}`} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}>
                <Icon size={20} aria-hidden />
                <span>{n.tkey === 'nav.flows' ? t('inbox.flows') : t(n.tkey)}</span>
                {n.path === '/app/inbox' && unread > 0 && <span className="nav-count">{unread}</span>}
              </a>
            );
          })}
        </nav>
      )}
    </div>
  );
}

function NoAccess({ reason }: { reason: string }) {
  return (
    <section className="card denied" role="alert">
      <Lock size={24} aria-hidden />
      <h1 className="h2">You don’t have access to this page</h1>
      <p className="small muted">{reason} Your other pages keep working.</p>
      <a className="btn btn-secondary" href="#/app/overview">Go to Overview</a>
    </section>
  );
}

export default function App() {
  const { state } = useStore();
  setActiveLocale(state.locale);
  applyStage4Label(state.persona);
  const full = useRoute();
  const path = full.split('?')[0];
  const parts = path.split('/').filter(Boolean);

  let page: ReactNode = null;
  let role: 'client' | 'admin' | null = null;

  if (parts[0] === 'app') {
    role = 'client';
    switch (parts[1]) {
      case 'overview': page = <Overview />; break;
      case 'grow': page = <Grow />; break;
      case 'inbox': page = <Inbox id={parts[2]} />; break;
      case 'flows':
        if (parts[2] === 'new') page = <FlowBuilder />;
        else if (parts[2] && parts[3] === 'edit') page = <FlowBuilder id={parts[2]} />;
        else if (parts[2]) page = <FlowDetail id={parts[2]} />;
        else page = <LeadFlows />;
        break;
      case 'leads': page = <Leads openId={parts[2]} />; break;
      case 'planner': page = <Planner openId={parts[2]} />; break;
      case 'comments': page = <Comments />; break;
      case 'dfy': page = <DoneForYou />; break;
      case 'connect': page = <Connect />; break;
      case 'billing': page = <Billing sub={parts[2]} />; break;
      case 'partner': page = <Partner />; break;
      case 'settings': page = <Settings />; break;
      case 'help': page = <Help />; break;
      default: page = <Overview />;
    }
    // A module that isn't in the plan shows an upgrade preview instead of breaking (saved data is kept)
    const gated = GATED[parts[1]];
    if (gated && !entitledModules(state).includes(gated)) page = <LockedModule module={gated} />;
    const denied = deniedReason(state, parts[1]);
    if (denied) page = <NoAccess reason={denied} />;
  } else if (parts[0] === 'admin') {
    role = 'admin';
    switch (parts[1]) {
      case 'clients': page = parts[2] ? <ClientDetail id={parts[2]} /> : <Clients />; break;
      case 'activity': page = <AdminActivity />; break;
      case 'support': page = <Support />; break;
      case 'messages': page = <Messages clientId={parts[2]} />; break;
      case 'partners': page = <Partners />; break;
      case 'plans': page = <PlansOffers />; break;
      case 'analytics': page = <Analytics />; break;
      default: page = <Operations />;
    }
  } else if (parts[0] === 'onboarding') {
    page = <Onboarding />;
  } else {
    page = <Entry page={parts[0] === 'pricing' ? 'pricing' : parts[0] === 'partners' ? 'partners' : 'home'} />;
  }

  return (
    <>
      {role ? (
        <Shell role={role} path={path}>
          {page}
        </Shell>
      ) : (
        page
      )}
      {role === 'client' && <TeamChatWidget />}
      <Toaster />
    </>
  );
}
