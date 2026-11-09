import type { AdminClient, Audience, Business, CommentDraft, CommentTarget, Conversation, Flow, InteractionStats, Lead, LeadStatus, PersonaId, Post, Source } from '../types';

export interface SeedHelpers {
  ago: (ms: number) => number;
  isoDate: (offsetDays: number) => string;
  MIN: number;
  HOUR: number;
  DAY: number;
}

export interface DemoContact {
  name: string;
  handle: string;
  color: string;
  /** First reply after receiving the flow resource; opens the conversation */
  reply?: string;
  replyScript?: string[];
  contactScript?: { text: string; leadSignal?: { status: LeadStatus; reason: string } }[];
}

export interface PeriodMetrics {
  growth: number;
  conversations: number;
  qualified: number;
  goal: number;
  deltas: [number, number, number, number];
}

export interface PersonaConfig {
  id: PersonaId;
  /** Business type as the owner would describe it */
  label: string;
  example: string;
  blurb: string;
  /** Lead stage between Qualified and Closed */
  stage4: string;
  stage4Plural: string;
  stage4Definition: string;
  /** Demo event that moves a lead to stage 4 */
  eventText: string;
  eventButton: string;
  afterEventAction: string;
  ctaLabel: string;
  ctaMessage: (link: string) => string;
  linkLabel: string;
  qualifyLabel: string;
  contentIdea: { title: string; caption: string; format: Post['format'] };
  metrics: Record<'7' | '28' | '90', PeriodMetrics>;
  trendEnd: number;
  interactions: InteractionStats;
  demoContacts: DemoContact[];
}

export interface PersonaSeed {
  business: Business;
  audience: Audience;
  sources: Source[];
  conversations: Conversation[];
  commentTargets: CommentTarget[];
  commentDrafts: CommentDraft[];
  leads: Lead[];
  posts: Post[];
  flows: [Flow, Flow, Flow];
  /** Names used in the seeded execution log */
  failedContact: string;
  blockedContact: string;
  admin: Omit<AdminClient, 'id' | 'lastActivity' | 'notes' | 'isDemoClient'>;
}

export function lead(h: SeedHelpers, l: Omit<Lead, 'tasks' | 'updatedAt'> & { tasks?: Lead['tasks']; updatedAt?: number }): Lead {
  const updatedAt = l.updatedAt ?? h.ago(h.DAY);
  // Deterministic age: a lead was created 0-30 days before its last update
  const spread = (([...l.id].reduce((t, c) => t + c.charCodeAt(0), 0) * 7) % 31) * h.DAY;
  return { tasks: [], createdAt: updatedAt - spread, ...l, updatedAt };
}

export const emptyStats = { requesters: 0, sent: 0, replied: 0, clicks: 0, emails: null, qualified: 0, booked: 0 };
