import type { ActivityItem, AdminClient, Execution, PersonaId, State } from './types';
import { PERSONAS, PERSONA_ORDER, PERSONA_SEEDS } from './personas';
import type { SeedHelpers } from './personas/types';
import { seedPartners } from './partnerSeed';
import { TRIAL_DAYS } from './brand';

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const DEMO_CLIENT_ID = 'c1';
export const ADMIN_ACTOR = 'Sophie Laurent (MAGNET team)';

/** Activity-log name for the account owner of the active demo business. */
export function clientActor(s: Pick<State, 'business'>): string {
  return `${s.business.owner} (client)`;
}

const SECOND_ACCOUNT: Record<PersonaId, { username: string; label: string; color: string }> = {
  coach: { username: 'jordanhale.coach', label: 'Personal brand', color: '#E1622C' },
  webshop: { username: 'noor.studio', label: 'Studio & behind the scenes', color: '#B4235A' },
  store: { username: 'bikecorner.workshop', label: 'Workshop & repairs', color: '#12805C' },
};

export function createSeed(persona: PersonaId = 'coach'): State {
  const now = Date.now();
  const ago = (ms: number) => now - ms;
  const isoDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  };
  const h: SeedHelpers = { ago, isoDate, MIN, HOUR, DAY };
  const cfg = PERSONAS[persona];
  const p = PERSONA_SEEDS[persona](h);
  const [f1, , f3] = p.flows;
  const kw = f1.trigger.keyword;
  const owner = `${p.business.owner} (client)`;
  const flowContact = p.conversations[0].name;
  const awaitingContact = p.conversations[4].name;

  const ex = (e: Partial<Execution> & Pick<Execution, 'id' | 'contactName' | 'status' | 'log'>): Execution => ({
    flowId: 'f1',
    flowVersion: 1,
    eventId: `evt_${e.id}`,
    contactId: `ct_${e.contactName.split(' ')[0].toLowerCase()}`,
    source: 'comment',
    time: ago(DAY),
    ...e,
  });
  const sendLine = `Private reply sent with "${f1.resource.title}"`;
  const executions: Execution[] = [
    ex({ id: 'x1', contactName: flowContact, status: 'Sent', time: ago(2 * DAY), log: [`Comment "${kw}" matched keyword ${kw}`, sendLine, `Public reply posted: "${f1.message.publicReplyText}"`] }),
    ex({ id: 'x2', contactName: awaitingContact, status: 'Sent', time: ago(26 * HOUR), log: [`Comment "${kw.toLowerCase()}!" matched keyword ${kw} (case and punctuation ignored)`, sendLine, 'Awaiting reply: no conversation opened yet'] }),
    ex({ id: 'x3', contactName: awaitingContact, status: 'Suppressed', time: ago(25 * HOUR), log: [`Comment "${kw}" matched keyword ${kw}`, 'Suppressed: resource already sent to this contact for this flow'] }),
    ex({ id: 'x4', contactName: p.failedContact, status: 'Failed', time: ago(10 * HOUR), log: [`Comment "${kw}" matched keyword ${kw}`, 'Send attempt timed out (outcome unknown)', 'Status check: message not delivered. No blind retry.'], error: 'SEND_TIMEOUT: delivery status could not be confirmed. Status check showed the message was not delivered.' }),
    ex({ id: 'x5', contactName: p.blockedContact, status: 'Blocked', time: ago(4 * DAY), log: [`Comment "${kw}" matched keyword ${kw}`, 'Blocked: private reply window for this comment has expired'] }),
    ex({ id: 'x6', flowId: 'f3', contactName: p.leads[9].name, status: 'Sent', time: ago(9 * DAY), log: [`Comment "${f3.trigger.keyword}" matched keyword ${f3.trigger.keyword}`, `Private reply sent with "${f3.resource.title}"`] }),
  ];

  // Admin sees the active business as c1, the other two example businesses as c2/c3,
  // plus one client with problems so Operations has something to show.
  const others = PERSONA_ORDER.filter((id) => id !== persona).map((id) => PERSONA_SEEDS[id](h).admin);
  const clients: AdminClient[] = [
    { id: 'c1', ...p.admin, subscription: 'Trial', lastActivity: ago(25 * MIN), notes: [{ id: 'n1', text: 'Onboarding call done. Prefers Assist mode for now.', author: ADMIN_ACTOR, time: ago(7 * DAY) }], isDemoClient: true },
    { id: 'c2', ...others[0], lastActivity: ago(5 * HOUR), notes: [] },
    { id: 'c3', ...others[1], lastActivity: ago(9 * HOUR), notes: [] },
    {
      id: 'c4', name: 'Bright Path Nutrition', owner: 'Amara Okoye', handle: '@brightpath.nutrition', niche: 'Nutrition coaching for new parents',
      plan: 'Growth', subscription: 'Past due', campaign: 'paused', connection: 'disconnected', aiMode: 'assist', dailyLimit: 80, lastActivity: ago(3 * DAY),
      audienceSummary: 'Nutrition, parenting, meal prep · English · Canada, US',
      flows: [{ id: 'f_c4_1', name: 'Meal plan PDF', status: 'needs_attention' }, { id: 'f_c4_2', name: 'Recipe of the week', status: 'paused' }],
      notes: [{ id: 'n2', text: 'Emailed client about reconnecting Instagram.', author: ADMIN_ACTOR, time: ago(2 * DAY) }],
    },
  ];

  const activity: ActivityItem[] = [
    { id: 'a1', time: ago(10 * HOUR), actor: 'System', actorRole: 'system', clientId: 'c1', type: 'execution', action: `Lead Flow "${f1.name}" send failed for ${p.failedContact}`, result: 'failed', error: { code: 'SEND_TIMEOUT', detail: 'Delivery status could not be confirmed within 30s. Status check: not delivered. Retry was not attempted automatically to avoid a duplicate message.' } },
    { id: 'a2', time: ago(2 * DAY), actor: owner, actorRole: 'client', clientId: 'c1', type: 'flow', action: `Paused Lead Flow "${f3.name}"`, result: 'success' },
    { id: 'a3', time: ago(3 * DAY), actor: ADMIN_ACTOR, actorRole: 'admin', clientId: 'c4', type: 'campaign', action: 'Paused Grow campaign', reason: 'Instagram connection lost; pausing until the client reconnects.', result: 'success' },
    { id: 'a4', time: ago(3 * DAY + HOUR), actor: 'System', actorRole: 'system', clientId: 'c4', type: 'campaign', action: 'Grow interactions failed: account connection lost', result: 'failed', error: { code: 'CONNECTION_LOST', detail: 'The Instagram connection for @brightpath.nutrition is no longer valid. The client needs to reconnect the account.' } },
    { id: 'a5', time: ago(5 * HOUR), actor: `${clients[1].owner} (client)`, actorRole: 'client', clientId: 'c2', type: 'setting', action: 'Changed AI mode from Assist to Auto', result: 'success' },
    { id: 'a6', time: ago(6 * DAY), actor: owner, actorRole: 'client', clientId: 'c1', type: 'campaign', action: 'Started Grow campaign', result: 'success' },
    { id: 'a7', time: ago(25 * HOUR), actor: 'System', actorRole: 'system', clientId: 'c1', type: 'execution', action: `Suppressed duplicate resource for ${awaitingContact} (${f1.name})`, result: 'success' },
  ];

  return {
    version: 16,
    persona,
    onboarded: true,
    business: p.business,
    aiMode: 'assist',
    connection: 'connected',
    meta: { status: 'connected', igUsername: p.admin.handle.replace('@', ''), pageName: p.business.name, scopes: ['Manage content', 'Read and send DMs', 'Read insights'], connectedAt: now - 7 * DAY },
    promoview: 'connected',
    activation: {
      goal: 'conversations',
      done: { connect_meta: ago(7 * DAY), connect_growth: ago(7 * DAY), audience_saved: ago(6 * DAY), campaign_started: ago(6 * DAY), flow_activated: ago(6 * DAY) },
      dismissed: false,
      startedAt: ago(7 * DAY),
      firstValueAt: ago(6 * DAY),
      onboardingStep: 0,
    },
    locale: { language: 'en', currency: 'USD', country: 'US', auto: true },
    audience: p.audience,
    sources: p.sources,
    campaign: 'active',
    interactions: { ...cfg.interactions, breakdown: { ...cfg.interactions.breakdown } },
    conversations: p.conversations.map((c, i) => ({ ...c, accountId: i % 3 === 2 ? 'acc2' : 'acc1' })),
    commentTargets: p.commentTargets,
    commentDrafts: p.commentDrafts,
    leads: p.leads,
    flows: p.flows,
    executions,
    posts: p.posts,
    clients,
    activity,
    support: [
      { id: 'sp1', clientId: 'c4', subject: 'Instagram connection lost', detail: 'Client reports that the account shows "Disconnected" after changing their Instagram password.', status: 'Open', assignee: null, time: ago(3 * DAY) },
      { id: 'sp2', clientId: 'c2', subject: 'Add a blocked word', detail: 'Wants to skip accounts that mention "wholesale" and asks how protected accounts work.', status: 'In progress', assignee: 'Sophie Laurent', time: ago(DAY) },
      { id: 'sp3', clientId: 'c1', subject: 'Invoice address update', detail: 'Asks to update the company address on future invoices.', status: 'Open', assignee: null, time: ago(5 * HOUR) },
    ],
    billing: {
      modules: ['core', 'grow', 'inbox', 'flows', 'comments', 'planner'],
      status: 'active',
      periodEnd: isoDate(18),
      scheduled: null,
      discount: null,
      pauseUntil: null,
      pending: null,
      usedDiscount: false,
      invoices: [
        { id: 'INV-1003', date: isoDate(-12), amountUsd: 297, status: 'paid', modules: ['core', 'grow', 'inbox', 'flows', 'comments', 'planner'] },
        { id: 'INV-1002', date: isoDate(-42), amountUsd: 297, status: 'paid', modules: ['core', 'grow', 'inbox', 'flows', 'comments', 'planner'] },
        { id: 'INV-1001', date: isoDate(-72), amountUsd: 97, status: 'paid', modules: ['core', 'grow', 'inbox'] },
      ],
      sessions: [],
      ...(TRIAL_DAYS ? { trialEnd: isoDate(TRIAL_DAYS - 3), periodEnd: isoDate(TRIAL_DAYS - 3), invoices: [] } : {}),
    },
    dfyBookings: [],
    partners: seedPartners(clients, { ago, isoDate, DAY, HOUR }),
    offers: [
      { kind: 'downgrade', version: 1, status: 'published', reasons: ['price'], limit: null, redeemed: 14, validUntil: null, history: [{ time: ago(40 * DAY), actor: 'Ines Moreau (commercial admin)', action: 'Published v1' }] },
      { kind: 'discount', version: 2, status: 'published', reasons: ['price'], percent: 20, months: 3, limit: 200, redeemed: 37, validUntil: isoDate(80), history: [{ time: ago(60 * DAY), actor: 'Ines Moreau (commercial admin)', action: 'Published v1 (15% for 2 months)' }, { time: ago(30 * DAY), actor: 'Ines Moreau (commercial admin)', action: 'Published v2 (20% for 3 months)', reason: 'v1 accept rate was low; margin still above guardrail.' }] },
      { kind: 'modules', version: 1, status: 'published', reasons: ['unused'], limit: null, redeemed: 22, validUntil: null, history: [{ time: ago(40 * DAY), actor: 'Ines Moreau (commercial admin)', action: 'Published v1' }] },
      { kind: 'support', version: 1, status: 'published', reasons: ['results', 'setup'], limit: null, redeemed: 18, validUntil: null, history: [{ time: ago(40 * DAY), actor: 'Ines Moreau (commercial admin)', action: 'Published v1' }] },
      { kind: 'pause', version: 1, status: 'published', reasons: ['break'], months: 3, limit: null, redeemed: 9, validUntil: null, history: [{ time: ago(40 * DAY), actor: 'Ines Moreau (commercial admin)', action: 'Published v1' }] },
      { kind: 'ticket', version: 1, status: 'published', reasons: ['technical'], limit: null, redeemed: 6, validUntil: null, history: [{ time: ago(40 * DAY), actor: 'Ines Moreau (commercial admin)', action: 'Published v1' }] },
    ],
    priceVersions: [],
    killSwitches: [],
    dismissedHints: [],
    team: [
      { id: 'tm1', name: 'Sara Okafor', email: 'sara@example.com', modules: ['inbox'], permissions: { sendReplies: true, manageFlows: false, publish: false }, status: 'active', invitedAt: ago(12 * DAY) },
    ],
    viewAs: null,
    accounts: [
      { id: 'acc1', username: p.admin.handle.replace('@', ''), label: 'Main business', color: '#5B35F5', status: 'connected', growth: 'connected', connectedAt: ago(7 * DAY), primary: true },
      { id: 'acc2', ...SECOND_ACCOUNT[persona], status: 'connected', growth: 'connected', connectedAt: ago(4 * DAY), primary: false },
    ],
    activeAccount: 'all',
    teamChat: [
      { id: 'tc1', clientId: 'c1', from: 'team', author: 'Sophie Laurent', text: `Hi ${p.business.owner.split(' ')[0]}, I’m Sophie, your contact at MAGNET. Message me here any time you have a question. I’m a real person, not a bot.`, time: ago(7 * DAY), readByClient: true, readByTeam: true },
      { id: 'tc2', clientId: 'c1', from: 'client', author: p.business.owner, text: 'Thanks Sophie! Is my audience set up well enough to start?', time: ago(6 * DAY + 2 * HOUR), readByClient: true, readByTeam: true },
      { id: 'tc3', clientId: 'c1', from: 'team', author: 'Sophie Laurent', text: 'Yes, it looks good. I’d add one or two example accounts when you have a moment, that sharpens who we reach.', time: ago(6 * DAY), readByClient: true, readByTeam: true },
      { id: 'tc4', clientId: 'c1', from: 'team', author: 'Sophie Laurent', text: `Weekly update: your first Lead Flow is live and conversations are coming in. Tip for this week: reply to new conversations within a day, that’s where most of your leads start.`, time: ago(3 * HOUR), update: true, readByClient: false, readByTeam: true },
      { id: 'tc5', clientId: 'c2', from: 'client', author: clients[1].owner, text: 'Can you check if my blocked words are set right? I still see some wholesale accounts.', time: ago(5 * HOUR), readByClient: true, readByTeam: false },
      { id: 'tc6', clientId: 'c3', from: 'team', author: 'Sophie Laurent', text: 'Your campaign is running well this week. Let me know if you want to add a second Lead Flow.', time: ago(2 * DAY), update: true, readByClient: true, readByTeam: true },
      { id: 'tc7', clientId: 'c4', from: 'team', author: 'Sophie Laurent', text: 'Your Instagram connection dropped after the password change. Could you reconnect in MAGNET? I’ll restart your campaign right after.', time: ago(2 * DAY), readByClient: false, readByTeam: true },
    ],
    sim: { emptyInbox: false, missingKnowledge: false, slowLoading: false, failNextPublish: false, billingDown: false },
    processedEvents: executions.map((e) => e.eventId),
    plan: { name: p.admin.plan, status: 'Trial', trialEnds: isoDate(9) },
  };
}
