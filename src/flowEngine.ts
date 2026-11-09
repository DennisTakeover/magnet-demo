import type { Conversation, Execution, ExecutionStatus, Flow, PersonaId, State } from './types';
import { PERSONAS, type DemoContact } from './personas';
import { clockTime, logActivity, markActivation, uid } from './store';
import { blockedBy } from './ops';

/** Lower-case words with surrounding punctuation removed: "MAGNET!" -> "magnet". */
export function tokens(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}

export function matchesKeyword(text: string, keyword: string): boolean {
  const k = keyword.trim().toLowerCase();
  return k.length > 0 && tokens(text).includes(k);
}

/** Other live flows on the same account, trigger and post with the same keyword. */
export function findConflicts(flows: Flow[], flow: Flow): Flow[] {
  return flows.filter(
    (f) =>
      f.id !== flow.id &&
      (f.status === 'active' || f.status === 'waiting_for_post') &&
      f.trigger.type === flow.trigger.type &&
      (flow.trigger.type === 'dm' || f.trigger.postId === flow.trigger.postId) &&
      f.trigger.keyword.trim().toLowerCase() === flow.trigger.keyword.trim().toLowerCase(),
  );
}

export function isValidHttps(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

/* ---------- Test simulator (sandbox, changes nothing) ---------- */

export type ScenarioId = 'comment' | 'dm' | 'nomatch' | 'repeat' | 'interaction' | 'linkonly' | 'expired' | 'takeover';

export const SCENARIOS: { id: ScenarioId; label: string }[] = [
  { id: 'comment', label: 'Comment with keyword' },
  { id: 'dm', label: 'Incoming DM with keyword' },
  { id: 'nomatch', label: 'Word that doesn’t match' },
  { id: 'repeat', label: 'Same event twice / repeat request' },
  { id: 'interaction', label: 'Taps the opening button' },
  { id: 'linkonly', label: 'Only clicks the external link' },
  { id: 'expired', label: 'Messaging window expired' },
  { id: 'takeover', label: 'You take over' },
];

export interface TestStep {
  kind: 'ok' | 'skip' | 'wait' | 'stop';
  text: string;
}

export interface TestResult {
  input: string;
  outcome: ExecutionStatus | 'No match';
  steps: TestStep[];
  /** Messages as the contact would see them */
  preview: { from: 'flow' | 'contact'; text: string; button?: string }[];
}

export function runScenario(flow: Flow, id: ScenarioId): TestResult {
  const kw = flow.trigger.keyword || 'KEYWORD';
  const isComment = flow.trigger.type === 'comment';
  const m = flow.message;
  const resourceMsg = { from: 'flow' as const, text: m.text, button: flow.resource.buttonText };
  const steps: TestStep[] = [];
  const preview: TestResult['preview'] = [];

  const deliverFirst = (): ExecutionStatus => {
    if (m.route === 'conversation' && isComment) {
      steps.push({ kind: 'ok', text: `Private reply sent: opening with button "${m.openingButton}"` });
      preview.push({ from: 'flow', text: m.opening, button: m.openingButton });
      if (m.publicReply) steps.push({ kind: 'ok', text: `Public reply posted after successful send: "${m.publicReplyText}"` });
      steps.push({ kind: 'wait', text: 'Waiting for the contact to tap the button before sending the resource' });
      return 'Waiting for interaction';
    }
    steps.push({ kind: 'ok', text: `${isComment ? 'Private reply' : 'Reply'} sent with "${flow.resource.title}" (${flow.resource.kind === 'pdf' ? 'download link' : 'link'})` });
    preview.push(resourceMsg);
    if (isComment && m.publicReply) steps.push({ kind: 'ok', text: `Public reply posted after successful send: "${m.publicReplyText}"` });
    if (isComment) steps.push({ kind: 'stop', text: 'Comment route ends here unless the contact replies' });
    else if (m.followUpQuestion) {
      steps.push({ kind: 'ok', text: 'Follow-up question sent (conversation is open)' });
      preview.push({ from: 'flow', text: m.followUpText });
    }
    return 'Sent';
  };

  const triggerText = (text: string) => {
    preview.push({ from: 'contact', text });
  };

  switch (id) {
    case 'comment': {
      const input = `Comments "${kw}" on the selected post`;
      triggerText(`💬 ${kw}`);
      if (!isComment) {
        steps.push({ kind: 'skip', text: 'This flow listens for DMs, so the comment is ignored' });
        return { input, outcome: 'No match', steps, preview };
      }
      steps.push({ kind: 'ok', text: `"${kw}" matches keyword ${kw}` });
      return { input, outcome: deliverFirst(), steps, preview };
    }
    case 'dm': {
      const text = `${kw.toLowerCase()}!`;
      const input = `Sends a DM "${text}"`;
      triggerText(text);
      if (isComment) {
        steps.push({ kind: 'skip', text: 'This flow listens for comments on one post, so the DM is ignored' });
        return { input, outcome: 'No match', steps, preview };
      }
      steps.push({ kind: 'ok', text: `"${text}" matches keyword ${kw} (case and punctuation ignored)` });
      return { input, outcome: deliverFirst(), steps, preview };
    }
    case 'nomatch': {
      const word = `${kw.toLowerCase()}isch`;
      triggerText(`I love the ${word} vibe`);
      steps.push({ kind: 'skip', text: `"${word}" is not the separate word ${kw}, so nothing is sent` });
      return { input: `Writes "I love the ${word} vibe"`, outcome: 'No match', steps, preview };
    }
    case 'repeat': {
      triggerText(kw);
      steps.push({ kind: 'ok', text: `First event evt_123 processed: "${kw}" matches` });
      const outcome = deliverFirst();
      steps.push({ kind: 'skip', text: 'Same event evt_123 delivered again: ignored (already processed)' });
      triggerText(kw);
      steps.push({ kind: 'skip', text: 'Same contact asks again later: Suppressed, resource already sent once for this flow' });
      return { input: 'Same event arrives twice, then the contact asks again', outcome: outcome === 'Sent' ? 'Suppressed' : outcome, steps, preview };
    }
    case 'interaction': {
      triggerText(kw);
      if (m.route !== 'conversation' || !isComment) {
        steps.push({ kind: 'skip', text: 'Direct delivery has no opening button. Switch the route to "Start a conversation" to test this.' });
        deliverFirst();
        return { input: 'Taps the opening button', outcome: 'Sent', steps, preview };
      }
      deliverFirst();
      preview.push({ from: 'contact', text: `▶ ${m.openingButton}` });
      steps.push({ kind: 'ok', text: `Contact tapped "${m.openingButton}": conversation is now open` });
      steps.push({ kind: 'ok', text: `Resource "${flow.resource.title}" sent` });
      preview.push(resourceMsg);
      if (m.askEmail) {
        steps.push({ kind: 'ok', text: 'Optional email question sent (skipping keeps the resource available)' });
        preview.push({ from: 'flow', text: 'Want me to email it too? Reply with your email, or just skip this.' });
      }
      if (m.followUpQuestion) {
        steps.push({ kind: 'ok', text: 'Follow-up question sent' });
        preview.push({ from: 'flow', text: m.followUpText });
      }
      return { input: `Taps "${m.openingButton}"`, outcome: 'Sent', steps, preview };
    }
    case 'linkonly': {
      triggerText(kw);
      const first = deliverFirst();
      steps.push({ kind: 'ok', text: 'Known link click recorded (this is not a confirmed download)' });
      steps.push({
        kind: 'wait',
        text: first === 'Waiting for interaction' ? 'Opening an external link is not a conversation interaction: still waiting' : 'Link click does not open a conversation: no follow-up sent',
      });
      return { input: 'Only clicks the external link', outcome: first, steps, preview };
    }
    case 'expired': {
      triggerText(kw);
      steps.push({ kind: 'ok', text: `"${kw}" matches keyword ${kw}` });
      steps.push({ kind: 'stop', text: 'Messaging window has expired: no message sent, no delay or schedule can bypass it' });
      steps.push({ kind: 'skip', text: 'No public reply posted, because no private reply was delivered' });
      return { input: 'Event arrives after the messaging window closed', outcome: 'Blocked', steps, preview };
    }
    case 'takeover': {
      triggerText(kw);
      const first = deliverFirst();
      steps.push({ kind: 'stop', text: 'You pressed Take over: pending flow steps and unsent AI replies removed from the queue' });
      steps.push({ kind: 'skip', text: 'Nothing else is sent automatically until you resume' });
      return { input: 'You take over after the first message', outcome: first === 'Sent' ? 'Sent' : 'Suppressed', steps, preview };
    }
  }
}

/* ---------- Live (demo) events that change shared data ---------- */

export function demoContacts(persona: PersonaId): DemoContact[] {
  return PERSONAS[persona].demoContacts;
}

export interface LiveResult {
  status: ExecutionStatus | 'Ignored';
  message: string;
  conversationId?: string;
  willReply?: boolean;
}

export function runLiveEvent(d: State, flowId: string, contactIndex: number, eventId: string): LiveResult {
  const flow = d.flows.find((f) => f.id === flowId);
  if (!flow) return { status: 'Ignored', message: 'Flow not found' };
  const contacts = demoContacts(d.persona);
  const contact = contacts[contactIndex % contacts.length];
  const contactId = `ct_${contact.name.split(' ')[0].toLowerCase()}`;
  const isComment = flow.trigger.type === 'comment';
  const post = d.posts.find((p) => p.id === flow.trigger.postId);
  const kw = flow.trigger.keyword;
  const exec: Execution = {
    id: uid('x'),
    flowId,
    flowVersion: flow.version,
    eventId,
    contactId,
    contactName: contact.name,
    source: isComment ? 'comment' : 'dm',
    status: 'Triggered',
    time: Date.now(),
    log: [`${isComment ? 'Comment' : 'DM'} "${kw}" matched keyword ${kw}`],
  };

  if (d.processedEvents.includes(eventId)) {
    exec.status = 'Suppressed';
    exec.log.push(`Event ${eventId} was already processed: ignored`);
    d.executions.unshift(exec);
    return { status: 'Suppressed', message: 'Duplicate event ignored. No second message sent.' };
  }
  d.processedEvents.push(eventId);

  if (flow.status !== 'active') {
    exec.status = 'Suppressed';
    exec.log.push(`Flow is ${flow.status === 'paused' ? 'paused' : 'not active'}: nothing sent`);
    d.executions.unshift(exec);
    return { status: 'Suppressed', message: `Flow is ${flow.status === 'paused' ? 'paused' : 'not active'}, so nothing was sent.` };
  }

  const ks = blockedBy(d, 'flows');
  if (ks) {
    exec.status = 'Blocked';
    exec.log.push(`Blocked: Lead Flow sends are paused by the MAGNET team (${ks.scope === 'global' ? 'all accounts' : 'this account'}). Nothing was sent.`);
    d.executions.unshift(exec);
    logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'execution', action: `Send blocked by kill switch for ${contact.name} (${flow.name})`, result: 'success' });
    return { status: 'Blocked', message: 'Lead Flow sends are paused by the MAGNET team. Nothing was sent.' };
  }

  const already = d.executions.some((e) => e.flowId === flowId && e.contactId === contactId && (e.status === 'Sent' || e.status === 'Waiting for interaction'));
  flow.stats.requesters += already ? 0 : 1;
  if (already) {
    exec.status = 'Suppressed';
    exec.log.push('Suppressed: resource already sent to this contact for this flow');
    d.executions.unshift(exec);
    logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'execution', action: `Suppressed repeat request from ${contact.name} (${flow.name})`, result: 'success' });
    return { status: 'Suppressed', message: `${contact.name} already received this resource. Repeat suppressed.` };
  }

  const time = clockTime();
  const conv: Conversation = {
    id: uid('cv'),
    contactId,
    name: contact.name,
    handle: contact.handle,
    color: contact.color,
    origin: {
      type: isComment ? 'flow_comment' : 'flow_dm',
      label: isComment ? `Commented ${kw} on "${post?.title ?? 'post'}"` : `Sent a DM with ${kw}`,
      flowId,
      keyword: kw,
      postId: flow.trigger.postId,
      resource: flow.resource.title,
    },
    messages: [{ id: uid('m'), from: 'event', text: isComment ? `Commented "${kw}" on post "${post?.title ?? ''}"` : `Sent DM "${kw}"`, time }],
    needsYou: false,
    unread: true,
    takenOver: false,
    awaitingReply: isComment,
    replyScript: contact.replyScript ?? [`Hi ${contact.name.split(' ')[0]}! Hope the guide helps. What made you interested?`],
    contactScript: contact.contactScript ?? [],
    lastAt: Date.now(),
  };
  const note = `Lead Flow · ${flow.name} · v${flow.version}${isComment ? ' · private reply' : ''}`;

  if (flow.message.route === 'conversation' && isComment) {
    conv.messages.push({ id: uid('m'), from: 'flow', text: flow.message.opening, button: flow.message.openingButton, time, note });
    conv.pendingFlowExecId = exec.id;
    exec.status = 'Waiting for interaction';
    exec.log.push(`Opening sent with button "${flow.message.openingButton}"`, 'Waiting for the contact to tap the button');
  } else {
    conv.messages.push({ id: uid('m'), from: 'flow', text: flow.message.text, button: flow.resource.buttonText, time, note });
    exec.status = 'Sent';
    exec.log.push(`${isComment ? 'Private reply' : 'Reply'} sent with "${flow.resource.title}"`);
    flow.stats.sent += 1;
  }
  if (isComment && flow.message.publicReply) {
    exec.log.push(`Public reply posted: "${flow.message.publicReplyText}"`);
  }
  if (!isComment && flow.message.followUpQuestion) {
    conv.messages.push({ id: uid('m'), from: 'flow', text: flow.message.followUpText, time, note });
    exec.log.push('Follow-up question sent');
  }
  if (isComment && exec.status === 'Sent') exec.log.push('Awaiting reply: comment route ends unless the contact replies');

  d.executions.unshift(exec);
  d.conversations.unshift(conv);
  logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'execution', action: `Lead Flow "${flow.name}" ${exec.status === 'Sent' ? 'sent resource to' : 'opened with'} ${contact.name}`, result: 'success' });

  return {
    status: exec.status,
    message: exec.status === 'Sent' ? `${flow.resource.title} sent to ${contact.name}` : `Opening sent to ${contact.name}. Waiting for interaction.`,
    conversationId: conv.id,
    willReply: Boolean(contact.reply) && exec.status === 'Sent',
  };
}

/** The contact replies to a delivered flow message, opening a normal conversation. */
export function contactRepliesToFlow(d: State, convId: string, contactIndex: number) {
  const contacts = demoContacts(d.persona);
  const contact = contacts[contactIndex % contacts.length];
  const c = d.conversations.find((x) => x.id === convId);
  if (!c || !contact.reply) return;
  c.messages.push({ id: uid('m'), from: 'contact', text: contact.reply, time: clockTime() });
  c.awaitingReply = false;
  c.unread = true;
  c.lastAt = Date.now();
  const flow = d.flows.find((f) => f.id === c.origin.flowId);
  if (flow) flow.stats.replied += 1;
  const ex = d.executions.find((e) => e.contactId === c.contactId && e.flowId === c.origin.flowId && e.status === 'Sent');
  if (ex) ex.log.push('Contact replied: conversation opened in Inbox');
}

/** The contact taps the opening button of a "Start a conversation" flow. */
export function contactTapsOpening(d: State, convId: string) {
  const c = d.conversations.find((x) => x.id === convId);
  if (!c || !c.pendingFlowExecId) return;
  const ex = d.executions.find((e) => e.id === c.pendingFlowExecId);
  const flow = d.flows.find((f) => f.id === c.origin.flowId);
  if (!ex || !flow) return;
  if (blockedBy(d, 'flows')) {
    ex.log.push('Contact tapped the button, but sends are paused by the MAGNET team. Resource not sent yet.');
    return;
  }
  const time = clockTime();
  const note = `Lead Flow · ${flow.name} · v${ex.flowVersion}`;
  c.messages.push({ id: uid('m'), from: 'contact', text: `▶ ${flow.message.openingButton}`, time });
  c.messages.push({ id: uid('m'), from: 'flow', text: flow.message.text, button: flow.resource.buttonText, time, note });
  if (flow.message.askEmail) c.messages.push({ id: uid('m'), from: 'flow', text: 'Want me to email it too? Reply with your email, or just skip this.', time, note });
  if (flow.message.followUpQuestion) c.messages.push({ id: uid('m'), from: 'flow', text: flow.message.followUpText, time, note });
  ex.status = 'Sent';
  ex.log.push(`Contact tapped "${flow.message.openingButton}"`, `Resource "${flow.resource.title}" sent`);
  flow.stats.sent += 1;
  flow.stats.replied += 1;
  c.pendingFlowExecId = undefined;
  c.awaitingReply = false;
  c.lastAt = Date.now();
}

/* ---------- Activation ---------- */

export interface ActivateResult {
  ok: boolean;
  message: string;
}

export function tryActivate(d: State, flowId: string, actor: { name: string; role: 'client' | 'admin' }, reason?: string): ActivateResult {
  const flow = d.flows.find((f) => f.id === flowId);
  if (!flow) return { ok: false, message: 'Flow not found' };
  if (!flow.trigger.keyword.trim()) return { ok: false, message: 'Add a keyword before activating.' };
  if (!flow.tested && actor.role === 'client') return { ok: false, message: 'Test the flow in the preview before activating it.' };
  if (flow.resource.kind === 'link' && !isValidHttps(flow.resource.url ?? '')) return { ok: false, message: 'The resource link must be a valid https:// link.' };
  const conflicts = findConflicts(d.flows, flow);
  if (conflicts.length) {
    return { ok: false, message: `Keyword ${flow.trigger.keyword} is already used by "${conflicts[0].name}" on the same ${flow.trigger.type === 'dm' ? 'DM trigger' : 'post'}. Change one of the keywords first.` };
  }
  let msg: string;
  if (flow.trigger.type === 'comment') {
    const post = d.posts.find((p) => p.id === flow.trigger.postId);
    if (!post) return { ok: false, message: 'Select a post for the comment trigger.' };
    if (post.status === 'published' && post.igPostId) {
      flow.status = 'active';
      msg = `"${flow.name}" is active on "${post.title}"`;
    } else {
      flow.status = 'waiting_for_post';
      msg = `"${flow.name}" is waiting for "${post.title}" to be published`;
    }
  } else {
    flow.status = 'active';
    msg = `"${flow.name}" is active for incoming DMs`;
  }
  logActivity(d, {
    actor: actor.name,
    actorRole: actor.role,
    clientId: 'c1',
    type: 'flow',
    action: `${flow.status === 'active' ? 'Activated' : 'Armed (waiting for post)'} Lead Flow "${flow.name}"`,
    reason,
    result: 'success',
  });
  if (actor.role === 'client') markActivation(d, 'flow_activated');
  return { ok: true, message: msg };
}

export function pauseFlow(d: State, flowId: string, actor: { name: string; role: 'client' | 'admin' }, reason?: string) {
  const flow = d.flows.find((f) => f.id === flowId);
  if (!flow) return;
  flow.status = 'paused';
  // Stop steps that haven't been sent yet
  d.executions
    .filter((e) => e.flowId === flowId && e.status === 'Waiting for interaction')
    .forEach((e) => {
      e.status = 'Suppressed';
      e.log.push('Stopped: flow was paused before this step was sent');
    });
  d.conversations.forEach((c) => {
    if (c.origin.flowId === flowId && c.pendingFlowExecId) c.pendingFlowExecId = undefined;
  });
  logActivity(d, { actor: actor.name, actorRole: actor.role, clientId: 'c1', type: 'flow', action: `Paused Lead Flow "${flow.name}"`, reason, result: 'success' });
}

/** Simulated publish event: on success the post gets an ID and waiting flows go live. */
export function publishPost(d: State, postId: string, fail: boolean): ActivateResult {
  const post = d.posts.find((p) => p.id === postId);
  if (!post) return { ok: false, message: 'Post not found' };
  if (blockedBy(d, 'planner')) return { ok: false, message: 'Publishing is paused by the MAGNET team. The post stays scheduled and nothing was published.' };
  if (fail) {
    post.status = 'failed';
    post.error = 'Publishing failed: the media could not be processed (simulated). Your post and any attached Lead Flow are unchanged.';
    logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'post', action: `Publishing failed for "${post.title}"`, result: 'failed', error: { code: 'PUBLISH_FAILED', detail: post.error } });
    return { ok: false, message: `"${post.title}" failed to publish. Linked Lead Flow keeps waiting.` };
  }
  post.status = 'published';
  post.error = undefined;
  post.igPostId = String(18040000000 + Math.floor(Math.random() * 999999));
  let extra = '';
  const flow = d.flows.find((f) => f.id === post.flowId);
  if (flow && flow.status === 'waiting_for_post') {
    flow.trigger.postId = post.id;
    flow.status = 'active';
    extra = ` Lead Flow "${flow.name}" is now active.`;
  }
  logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'post', action: `Published "${post.title}" (post ID ${post.igPostId})${extra}`, result: 'success' });
  return { ok: true, message: `"${post.title}" published (simulated).${extra}` };
}
