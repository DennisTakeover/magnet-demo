export type AiMode = 'off' | 'assist' | 'auto';
export type PersonaId = 'coach' | 'webshop' | 'store';
export type CampaignStatus = 'draft' | 'active' | 'paused';

export type LeadStatus = 'new' | 'interested' | 'qualified' | 'booked' | 'closed';
export type ClosedReason = 'won' | 'lost' | 'not_a_fit';

export type FlowStatus = 'draft' | 'waiting_for_post' | 'active' | 'paused' | 'needs_attention';
export type ExecutionStatus = 'Triggered' | 'Waiting for interaction' | 'Sent' | 'Suppressed' | 'Failed' | 'Blocked';

export interface Business {
  name: string;
  website?: string;
  owner: string;
  offer: string;
  whoYouHelp: string;
  pricing: string;
  faq: string;
  qualifyCriteria: string;
  tone: string;
  bookingLink: string;
  handoffTopics: string;
  language: string;
  timezone: string;
}

export interface Audience {
  topics: string[];
  languages: string[];
  regions: string[];
  exclusions: string[];
  /** People whose name or bio contains one of these words are skipped entirely */
  blockedWords: string[];
  /** Accounts that are always kept and never removed from interactions */
  protectedAccounts: string[];
}

/** Interactions are shown to clients as one total; the breakdown is internal (admin only). */
export interface InteractionStats {
  dailyLimit: number;
  today: number;
  last28: number;
  breakdown: { follows: number; unfollows: number; likes: number; storyLikes: number };
  skippedByBlockedWords: number;
}

export interface Source {
  id: string;
  handle: string;
  name: string;
  topic: string;
  reason: string;
  status: 'suggested' | 'accepted' | 'excluded';
}

export interface Message {
  id: string;
  from: 'contact' | 'me' | 'ai' | 'flow' | 'event';
  text: string;
  time: string;
  /** e.g. button label attached to a flow message */
  button?: string;
  note?: string;
}

export interface Origin {
  type: 'flow_comment' | 'flow_dm' | 'story_reply' | 'dm' | 'comment';
  label: string;
  flowId?: string;
  keyword?: string;
  postId?: string;
  resource?: string;
}

export interface Conversation {
  id: string;
  contactId: string;
  name: string;
  handle: string;
  color: string;
  origin: Origin;
  messages: Message[];
  needsYou: boolean;
  unread: boolean;
  takenOver: boolean;
  awaitingReply?: boolean;
  /** Pre-written AI reply variants for the demo, consumed in order */
  replyScript: string[];
  /** Scripted next messages from the contact, consumed in order */
  contactScript: { text: string; leadSignal?: { status: LeadStatus; reason: string } }[];
  leadSuggestion?: { status: LeadStatus; reason: string; quote: string } | null;
  followedAt?: string;
  /** Lead Flow execution waiting for the contact to tap the opening button */
  pendingFlowExecId?: string;
  /** The Instagram account that received this conversation */
  accountId?: string;
  /** What AI can't answer from business knowledge, shown when it asks for review */
  reviewTopic?: string;
  note?: string;
  lastAt: number;
}

export interface Lead {
  id: string;
  name: string;
  handle: string;
  status: LeadStatus;
  closedReason?: ClosedReason;
  source: string;
  nextAction: string;
  tasks: { id: string; text: string; done: boolean }[];
  conversationId?: string;
  updatedAt: number;
  /** When the contact became a lead */
  createdAt?: number;
  /** Private note about the lead */
  note?: string;
}

export interface FlowStats {
  requesters: number;
  sent: number;
  replied: number;
  clicks: number;
  emails: number | null;
  qualified: number;
  booked: number;
}

export interface Flow {
  id: string;
  name: string;
  status: FlowStatus;
  version: number;
  trigger: { type: 'comment' | 'dm'; keyword: string; postId?: string };
  resource: { kind: 'pdf' | 'link'; title: string; fileName?: string; url?: string; buttonText: string };
  message: {
    route: 'direct' | 'conversation';
    text: string;
    opening: string;
    openingButton: string;
    publicReply: boolean;
    publicReplyText: string;
    followUpQuestion: boolean;
    followUpText: string;
    askEmail: boolean;
  };
  stats: FlowStats;
  tested: boolean;
  updatedAt: number;
}

export interface Execution {
  id: string;
  flowId: string;
  flowVersion: number;
  eventId: string;
  contactId: string;
  contactName: string;
  source: 'comment' | 'dm';
  status: ExecutionStatus;
  time: number;
  log: string[];
  error?: string;
  /** Outcome of a status check after an uncertain send */
  reconciled?: 'delivered' | 'not_delivered';
}

export type PostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface Post {
  id: string;
  title: string;
  caption: string;
  format: 'Post' | 'Reel' | 'Carousel';
  status: PostStatus;
  date: string | null; // ISO date yyyy-mm-dd
  time: string | null; // HH:MM
  flowId?: string;
  igPostId?: string;
  fromConversation?: boolean;
  error?: string;
}

export interface AdminNote {
  id: string;
  text: string;
  author: string;
  time: number;
}

export interface AdminClient {
  id: string;
  name: string;
  owner: string;
  handle: string;
  niche: string;
  plan: string;
  subscription: 'Trial' | 'Active' | 'Past due';
  campaign: CampaignStatus;
  connection: 'connected' | 'disconnected';
  aiMode: AiMode;
  dailyLimit: number;
  lastActivity: number;
  audienceSummary: string;
  flows: { id: string; name: string; status: FlowStatus }[];
  notes: AdminNote[];
  isDemoClient?: boolean;
}

export interface ActivityItem {
  id: string;
  time: number;
  actor: string;
  actorRole: 'client' | 'admin' | 'system';
  clientId: string;
  type: 'campaign' | 'flow' | 'lead' | 'setting' | 'execution' | 'post' | 'support' | 'inbox' | 'partner' | 'billing';
  action: string;
  reason?: string;
  result: 'success' | 'failed';
  error?: { code: string; detail: string };
}

export interface SupportTicket {
  id: string;
  clientId: string;
  subject: string;
  detail: string;
  status: 'Open' | 'In progress' | 'Resolved';
  assignee: string | null;
  time: number;
}

export interface SimFlags {
  emptyInbox: boolean;
  missingKnowledge: boolean;
  slowLoading: boolean;
  failNextPublish: boolean;
  /** Billing provider unavailable: changes are stored as Pending processing */
  billingDown: boolean;
}

export type CommentState = 'review' | 'approved' | 'posted_manual' | 'skipped';

export interface CommentTarget {
  id: string;
  handle: string;
  name: string;
  topic: string;
  reason: string;
}

/** A post we could add a relevant comment to. Posting is capability-gated; the demo uses the manual fallback. */
export interface CommentDraft {
  id: string;
  targetHandle: string;
  targetName: string;
  targetColor: string;
  postTitle: string;
  postCaption: string;
  format: 'Post' | 'Reel' | 'Carousel';
  /** How the post entered the queue: imported from a verified source, or added by the user */
  source: 'imported' | 'manual';
  draft: string;
  revision: number;
  state: CommentState;
  /** Set when approved; a later edit invalidates the approval */
  approvedAt?: number;
  /** Set when the user reports they posted it manually (not API-confirmed) */
  postedAt?: number;
  time: number;
}



/** Growth connection is only Connected after the growth service confirms it (ACC-03). */
export type GrowthConnection = 'pending' | 'connected' | 'needs_action' | 'disconnected';

export type GoalId = 'conversations' | 'audience' | 'leads' | 'content';

export type ActivationKey =
  | 'connect_meta' | 'connect_growth' | 'audience_saved' | 'campaign_started'
  | 'ai_reply' | 'flow_activated' | 'comment_approved' | 'post_scheduled';

/** First-value checklist: items complete only on a confirmed action, never on a page visit (ACC-05). */
export interface ActivationState {
  goal: GoalId | null;
  done: Partial<Record<ActivationKey, number>>;
  dismissed: boolean;
  startedAt: number;
  firstValueAt: number | null;
  /** Resume onboarding where the owner left off */
  onboardingStep: number;
  /** Answers so far, so a resumed onboarding keeps them */
  draft?: { type: PersonaId; goal: GoalId | null; owner: string; email: string; business: Business; audience: Audience; ai: AiMode; mods: ModuleId[] };
}

export type ModuleId = 'core' | 'grow' | 'inbox' | 'flows' | 'comments' | 'planner';

export type SubscriptionStatus = 'active' | 'payment_issue' | 'cancellation_scheduled' | 'paused' | 'ended';

export type CancelReason = 'price' | 'unused' | 'results' | 'setup' | 'break' | 'technical' | 'other';

export interface Invoice {
  id: string;
  date: string; // yyyy-mm-dd
  amountUsd: number;
  status: 'paid' | 'failed';
  modules: ModuleId[];
}

/** One visit to the cancellation flow. Leaving the flow counts as abandoned, not saved. */
export interface OffboardingSession {
  id: string;
  startedAt: number;
  reason: CancelReason | 'skipped' | null;
  offerShown: string | null;
  outcome: 'abandoned' | 'downgraded' | 'discount' | 'paused' | 'cancelled' | 'support';
}

export interface BillingState {
  modules: ModuleId[];
  status: SubscriptionStatus;
  /** Next charge / end of the paid period */
  periodEnd: string;
  /** A change that takes effect at periodEnd (downgrades) */
  scheduled: { modules: ModuleId[]; effective: string } | null;
  discount: { percent: number; months: number; until: string; offerVersion?: number } | null;
  pauseUntil: string | null;
  /** Change waiting for the billing provider (shown as Pending processing) */
  pending: { label: string; requestedAt: number; apply: 'cancel' | 'modules' | 'pause' | 'discount'; modules?: ModuleId[]; months?: number; percent?: number } | null;
  usedDiscount: boolean;
  invoices: Invoice[];
  sessions: OffboardingSession[];
}

export type DfyOffer = 'cmo' | 'full';

/** A call booked through Done for you (simulated: no payment or calendar invite). */
export interface DfyBooking {
  id: string;
  offer: DfyOffer;
  date: string; // yyyy-mm-dd
  time: string; // HH:MM
  hours: number; // CMO call length; intro calls are 0.5
  notes: string;
  status: 'scheduled' | 'cancelled';
  createdAt: number;
}

export interface MetaConnection {
  status: 'connected' | 'disconnected';
  igUsername: string;
  pageName: string;
  scopes: string[];
  connectedAt: number | null;
}

export interface LocaleState {
  language: string;
  currency: string;
  country: string;
  auto: boolean;
}

export interface State {
  version: number;
  persona: PersonaId;
  onboarded: boolean;
  business: Business;
  aiMode: AiMode;
  connection: 'connected' | 'disconnected';
  /** Meta (Instagram via Facebook) connection details */
  meta: MetaConnection;
  /** Growth engine (PromoView phone farm) connection, managed by the MAGNET team */
  promoview: GrowthConnection;
  activation: ActivationState;
  locale: LocaleState;
  audience: Audience;
  sources: Source[];
  campaign: CampaignStatus;
  interactions: InteractionStats;
  conversations: Conversation[];
  leads: Lead[];
  flows: Flow[];
  executions: Execution[];
  posts: Post[];
  clients: AdminClient[];
  activity: ActivityItem[];
  support: SupportTicket[];
  billing: BillingState;
  commentTargets: CommentTarget[];
  commentDrafts: CommentDraft[];
  dfyBookings: DfyBooking[];
  partners: PartnerRecord[];
  offers: RetentionOffer[];
  killSwitches: KillSwitch[];
  /** Upgrade hints the owner dismissed ("module:context") */
  dismissedHints: string[];
  team: TeamMember[];
  accounts: IgAccount[];
  teamChat: TeamChatMessage[];
  /** Which account the workspace is filtered to ('all' shows everything) */
  activeAccount: string;
  /** Demo: preview the app as this team member (null = owner) */
  viewAs: string | null;
  priceVersions: PriceVersion[];
  sim: SimFlags;
  processedEvents: string[];
  plan: { name: string; status: 'Trial' | 'Active' | 'Cancelled at trial end'; trialEnds: string };
}

/* ───────────── Partner Program (spec §18) ───────────── */

export type PartnerAppStatus = 'draft' | 'submitted' | 'under_review' | 'more_info' | 'approved' | 'declined';

export interface PartnerHistory {
  time: number;
  actor: string;
  action: string;
  reason?: string;
}

export interface PartnerApplicationForm {
  business: string;
  role: string;
  profileLinks: string;
  country: string;
  language: string;
  niche: string;
  reachEvidence: string;
  audienceFit: string;
  promotion: string;
  contactEmail: string;
}

/** Commercial terms. Fields stay null until set by the team: earnings cannot activate while any is unset. */
export interface PartnerAgreement {
  version: number;
  basis: 'contribution_profit' | 'revenue_share' | null;
  ratePercent: number | null;
  durationMonths: number | null;
  /** Commission continues for as long as the referred customer keeps paying (program standard) */
  whilePaying?: boolean;
  attributionDays: number;
  payoutMinimumUsd: number | null;
  holdDays: number;
  /** Agreed attributable costs deducted before the rate is applied (profit basis only) */
  costs: { paymentFeePercent: number; serviceCostUsd: number };
  grantModules: ModuleId[];
  grantUntil: string | null;
  reviewDate: string | null;
  proposedAt: number;
  acceptedAt: number | null;
}

export type CommitmentStatus = 'todo' | 'submitted' | 'verified' | 'needs_changes' | 'rejected' | 'overdue';

export interface PartnerCommitment {
  id: string;
  channel: string;
  format: string;
  deadline: string;
  status: CommitmentStatus;
  evidenceUrl?: string;
  reviewNote?: string;
  history: PartnerHistory[];
}

export type ReferralStatus = 'clicked' | 'signed_up' | 'trial' | 'paying' | 'cancelled' | 'needs_review';

/** Pseudonymous: partners never see the referred customer's name, DMs or workspace. */
export interface PartnerReferral {
  id: string;
  ref: string;
  segment: string;
  status: ReferralStatus;
  via: 'code' | 'link' | 'unknown';
  signedUpAt: number;
  /** Attribution locks on the first qualifying paid conversion */
  lockedAt: number | null;
  mrrUsd: number;
  flag?: string;
}

export type LedgerState = 'provisional' | 'pending_hold' | 'approved' | 'scheduled' | 'paid' | 'reversed' | 'on_hold' | 'failed';

/** Append-only. Corrections are new linked entries; history is never overwritten. */
export interface LedgerEntry {
  id: string;
  referralRef: string;
  invoiceLine: string;
  period: string;
  kind: 'accrual' | 'reversal';
  revenueUsd: number;
  costsUsd: number;
  basisUsd: number;
  amountUsd: number;
  agreementVersion: number;
  state: LedgerState;
  costsFinal: boolean;
  holdUntil: string | null;
  reversesId?: string;
  payoutId?: string;
  time: number;
}

export type PayoutState = 'draft' | 'approved' | 'sent' | 'uncertain' | 'paid' | 'failed';

export interface PartnerPayout {
  id: string;
  entryIds: string[];
  amountUsd: number;
  state: PayoutState;
  createdAt: number;
  approvedBy?: string;
  evidence?: string;
  attempt: number;
  history: PartnerHistory[];
}

export type PartnerStatus = 'active' | 'paused' | 'ended';

export interface PartnerRecord {
  id: string;
  clientId: string;
  name: string;
  handle: string;
  application: { form: PartnerApplicationForm; status: PartnerAppStatus; infoRequest?: string; submittedAt: number | null; history: PartnerHistory[] };
  /** Present once approved */
  program?: {
    status: PartnerStatus;
    newReferralsPaused: boolean;
    code: string;
    link: string;
    agreements: PartnerAgreement[];
    commitments: PartnerCommitment[];
    referrals: PartnerReferral[];
    ledger: LedgerEntry[];
    payouts: PartnerPayout[];
    payoutDetails: boolean;
    /** Monthly service cost MAGNET carries for the complimentary modules */
    grantCostUsd: number;
    funnel: { visits: number; signups: number; activated: number };
    retention: { d30: number | null; d60: number | null; d90: number | null };
    processedInvoices: string[];
    endedAt?: number;
  };
}

/* ───────────── Plans & Offers (RET-09) ───────────── */

export type OfferKind = 'downgrade' | 'discount' | 'modules' | 'support' | 'pause' | 'ticket';

/** A retention offer the cancellation flow may show. Versioned; accepted terms never change afterwards. */
export interface RetentionOffer {
  kind: OfferKind;
  version: number;
  status: 'published' | 'draft' | 'retired';
  reasons: CancelReason[];
  percent?: number;
  months?: number;
  /** Maximum redemptions across all customers in this version; null = unlimited */
  limit: number | null;
  redeemed: number;
  validUntil: string | null;
  history: { time: number; actor: string; action: string; reason?: string }[];
}

/** A price change for new subscriptions. Existing customers keep their price until notified separately. */
export interface PriceVersion {
  id: string;
  module: ModuleId;
  fromUsd: number;
  toUsd: number;
  effective: string;
  status: 'draft' | 'published';
  actor: string;
  reason: string;
  time: number;
}

/* ───────────── Operations kill switches (ADM-02) ───────────── */

export type SwitchModule = 'grow' | 'flows' | 'ai' | 'comments' | 'planner';

export interface KillSwitch {
  module: SwitchModule;
  /** 'global' or a client id */
  scope: string;
  actor: string;
  reason: string;
  time: number;
}

/* ───────────── Team members ───────────── */

export interface MemberPermissions {
  /** Send replies in the Inbox (otherwise read-only) */
  sendReplies: boolean;
  /** Create, edit and switch Lead Flows on or off */
  manageFlows: boolean;
  /** Schedule and publish posts */
  publish: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  modules: ModuleId[];
  permissions: MemberPermissions;
  status: 'invited' | 'active';
  invitedAt: number;
}

/* ───────────── Multiple Instagram accounts ───────────── */

export interface IgAccount {
  id: string;
  username: string;
  /** What the owner uses this account for, e.g. "Main business" */
  label: string;
  color: string;
  status: 'connected' | 'disconnected';
  /** Growth engine mapping for this account (confirmed per account) */
  growth: GrowthConnection;
  connectedAt: number | null;
  primary: boolean;
}

/* ───────────── Team ↔ client chat (human contact, no AI) ───────────── */

export interface TeamChatMessage {
  id: string;
  clientId: string;
  from: 'team' | 'client';
  author: string;
  text: string;
  time: number;
  /** A highlighted update from the team (e.g. weekly progress) rather than a normal chat line */
  update?: boolean;
  readByClient: boolean;
  readByTeam: boolean;
}
