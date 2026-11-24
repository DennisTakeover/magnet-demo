import { Bot, CalendarClock, Check, Cpu, Instagram, MessageSquareText, Rocket, Target, Workflow, X, type LucideIcon } from 'lucide-react';
import { useStore } from '../store';
import { Badge } from './ui';
import type { ActivationKey, GoalId, ModuleId, State } from '../types';

interface Item {
  key: ActivationKey;
  title: string;
  why: string;
  href: string;
  module: ModuleId | null;
}

const ICON: Record<ActivationKey, LucideIcon> = {
  connect_meta: Instagram, connect_growth: Cpu, audience_saved: Target, campaign_started: Rocket,
  ai_reply: Bot, flow_activated: Workflow, comment_approved: MessageSquareText, post_scheduled: CalendarClock,
} as Record<ActivationKey, LucideIcon>;

const ITEMS: Item[] = [
  { key: 'connect_meta', title: 'Connect Instagram', why: 'Needed for DMs, Lead Flows and publishing.', href: '/app/connect', module: null },
  { key: 'connect_growth', title: 'Connect the growth engine', why: 'Confirmed by the growth service before growth can start.', href: '/app/connect', module: 'grow' },
  { key: 'audience_saved', title: 'Save your audience', why: 'Topics, regions and filters decide who you reach.', href: '/app/grow', module: 'grow' },
  { key: 'campaign_started', title: 'Start your growth campaign', why: 'Begins interactions within your daily limit.', href: '/app/grow', module: 'grow' },
  { key: 'ai_reply', title: 'Approve your first AI reply', why: 'Open a conversation, review the suggestion and send it.', href: '/app/inbox', module: 'inbox' },
  { key: 'flow_activated', title: 'Test and activate a Lead Flow', why: 'Deliver a guide or link when someone uses your keyword.', href: '/app/flows', module: 'flows' },
  { key: 'comment_approved', title: 'Approve your first comment', why: 'Be visible on accounts your audience follows.', href: '/app/comments', module: 'comments' },
  { key: 'post_scheduled', title: 'Schedule your first post', why: 'Plan content that feeds your Lead Flows.', href: '/app/planner', module: 'planner' },
];

/** Which steps come first for each goal */
const GOAL_ORDER: Record<GoalId, ActivationKey[]> = {
  conversations: ['ai_reply', 'flow_activated'],
  audience: ['audience_saved', 'campaign_started'],
  leads: ['flow_activated', 'ai_reply'],
  content: ['post_scheduled', 'flow_activated'],
};

export function checklistItems(s: State): Item[] {
  const items = ITEMS.filter((i) => !i.module || s.billing.modules.includes(i.module));
  const first = s.activation.goal ? GOAL_ORDER[s.activation.goal] : [];
  // Connections stay first; then goal steps; then the rest
  const rank = (i: Item) => (i.key.startsWith('connect') ? 0 : first.includes(i.key) ? 1 + first.indexOf(i.key) : 10);
  return [...items].sort((a, b) => rank(a) - rank(b));
}

function minutes(ms: number) {
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h} h` : `${Math.round(h / 24)} days`;
}

export default function Checklist() {
  const { state, update } = useStore();
  const a = state.activation;
  const items = checklistItems(state);
  const done = items.filter((i) => a.done[i.key]).length;
  const growth = state.promoview;

  return (
    <>
      <div className="conn-strip" aria-label="Connection health">
        <a href="#/app/connect" className="conn-chip">
          <Instagram size={15} aria-hidden /> Instagram
          {state.meta.status === 'connected' ? <Badge tone="green" dot>Connected</Badge> : <Badge tone="red" dot>Not connected</Badge>}
        </a>
        {state.billing.modules.includes('grow') && (
          <a href="#/app/connect" className="conn-chip">
            <Cpu size={15} aria-hidden /> Growth engine
            {growth === 'connected' && <Badge tone="green" dot>Connected</Badge>}
            {growth === 'pending' && <Badge tone="blue" dot>Pending</Badge>}
            {growth === 'needs_action' && <Badge tone="amber" dot>Needs action</Badge>}
            {growth === 'disconnected' && <Badge tone="red" dot>Not connected</Badge>}
          </a>
        )}
      </div>

      {!a.dismissed && done < items.length && (
        <section className="card checklist" aria-labelledby="getstarted">
          <div className="card-head">
            <div>
              <h2 id="getstarted">Get your first result</h2>
              <p className="muted small">{done} of {items.length} done{a.firstValueAt ? ` · first result after ${minutes(a.firstValueAt - a.startedAt)}` : ''}</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => update((d) => void (d.activation.dismissed = true))}><X size={14} /> Hide</button>
          </div>
          <div className="ck-body">
            <div className="ck-ring" role="img" aria-label={`${done} of ${items.length} steps done`} style={{ ['--p' as string]: `${(done / items.length) * 360}deg` }}>
              <span><strong>{done}</strong>/{items.length}</span>
            </div>
            <ul className="ck-steps">
              {items.map((i) => {
                const ok = Boolean(a.done[i.key]);
                const Icon = ICON[i.key] ?? Check;
                const inner = (
                  <>
                    <span className="ck-icon" aria-hidden>{ok ? <Check size={18} /> : <Icon size={18} />}</span>
                    <span className="ck-title">{i.title}</span>
                    <span className="ck-state">{ok ? 'Done' : 'Start →'}</span>
                  </>
                );
                return (
                  <li key={i.key} className={ok ? 'ok' : ''} title={i.why}>
                    {ok ? <div className="ck-step">{inner}</div> : <a className="ck-step" href={`#${i.href}`}>{inner}</a>}
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </>
  );
}
