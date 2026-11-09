import { useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BatteryFull, Camera, Check, ChevronLeft, ChevronRight, CircleCheck, CircleSlash, Clock, FileText, Image, Instagram, Link2, MessageCircle, Mic, OctagonX, Phone, Signal, Upload, Video, Wifi } from 'lucide-react';
import { navigate, uid, useStore, clientLog } from '../store';
import { clientActor } from '../seed';
import { demoContacts, findConflicts, isValidHttps, matchesKeyword, runScenario, SCENARIOS, tryActivate, type ScenarioId, type TestResult } from '../flowEngine';
import { Avatar, Badge, Field, FlowStatusBadge, PageHeader, Toggle, ExecBadge, formatDate } from '../components/ui';
import { PostTile } from './Planner';
import type { Flow } from '../types';

const STEPS = ['Trigger', 'Resource', 'Message', 'Preview'];
const STEP_SUBS = ['When to send', 'What to share', 'Write your message', 'Review and confirm'];

function blankFlow(): Flow {
  return {
    id: uid('f'),
    name: 'New Lead Flow',
    status: 'draft',
    version: 1,
    trigger: { type: 'comment', keyword: 'MAGNET', postId: undefined },
    resource: { kind: 'pdf', title: 'Free guide', fileName: undefined, buttonText: 'Get the free guide' },
    message: {
      route: 'direct',
      text: 'Here’s the free guide you asked for. Enjoy!',
      opening: 'Hey! Thanks for your comment. Want me to send you the free guide?',
      openingButton: 'Send me the guide',
      publicReply: false,
      publicReplyText: 'Sent you the guide — check your DMs.',
      followUpQuestion: false,
      followUpText: 'What would you like help with most: reaching the right people or turning conversations into clients?',
      askEmail: false,
    },
    stats: { requesters: 0, sent: 0, replied: 0, clicks: 0, emails: null, qualified: 0, booked: 0 },
    tested: false,
    updatedAt: Date.now(),
  };
}

export default function FlowBuilder({ id }: { id?: string }) {
  const { state, update, toast } = useStore();
  const existing = state.flows.find((f) => f.id === id);
  const contact = demoContacts(state.persona)[0];
  const [flow, setFlow] = useState<Flow>(() => (existing ? { ...structuredClone(existing), tested: false } : blankFlow()));
  const [step, setStep] = useState(0);
  const [testText, setTestText] = useState('magnet!');
  const [result, setResult] = useState<TestResult | null>(null);
  const [scenario, setScenario] = useState<ScenarioId>('comment');
  const [testedNow, setTestedNow] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  const posts = state.posts.filter((p) => p.status !== 'failed');
  const post = posts.find((p) => p.id === flow.trigger.postId);
  const conflicts = useMemo(() => findConflicts(state.flows, { ...flow, status: 'active' }), [state.flows, flow]);
  const isComment = flow.trigger.type === 'comment';
  const linkInvalid = flow.resource.kind === 'link' && !isValidHttps(flow.resource.url ?? '');

  const set = (patch: Partial<Flow>) => {
    setFlow((f) => ({ ...f, ...patch }));
    setTestedNow(false);
  };
  const setMsg = (patch: Partial<Flow['message']>) => set({ message: { ...flow.message, ...patch } });
  const setRes = (patch: Partial<Flow['resource']>) => set({ resource: { ...flow.resource, ...patch } });

  const stepErrors = [
    !flow.trigger.keyword.trim() ? 'Add a keyword.' : isComment && !flow.trigger.postId ? 'Select a post or reel.' : '',
    !flow.resource.title.trim() ? 'Add a title.' : flow.resource.kind === 'pdf' && !flow.resource.fileName ? 'Choose a PDF.' : linkInvalid ? 'Enter a valid https:// link.' : '',
    !flow.message.text.trim() ? 'Write the message.' : '',
    '',
  ];

  const persist = (activate: boolean) => {
    let res = { ok: true, message: '' };
    const keywordChanged = existing && existing.trigger.keyword !== flow.trigger.keyword;
    update((d) => {
      const idx = d.flows.findIndex((f) => f.id === flow.id);
      const saved: Flow = {
        ...flow,
        tested: testedNow,
        version: existing ? existing.version + 1 : 1,
        status: existing ? existing.status : 'draft',
        updatedAt: Date.now(),
      };
      if (idx >= 0) d.flows[idx] = saved;
      else d.flows.push(saved);
      if (isComment && flow.trigger.postId) {
        d.posts.forEach((p) => {
          if (p.flowId === flow.id && p.id !== flow.trigger.postId) p.flowId = undefined;
        });
        const p = d.posts.find((x) => x.id === flow.trigger.postId);
        if (p) p.flowId = flow.id;
      }
      clientLog(d, 'flow', existing ? `Saved Lead Flow "${flow.name}" as version ${saved.version}` : `Created Lead Flow "${flow.name}"`);
      if (activate) res = tryActivate(d, flow.id, { name: clientActor(d), role: 'client' });
    });
    if (activate) toast(res.message, res.ok ? 'success' : 'warning');
    else toast(existing ? `Saved as version ${existing.version + 1}. Running executions keep their version.` : 'Saved as draft');
    if (keywordChanged && post && post.caption.toLowerCase().includes(existing!.trigger.keyword.toLowerCase()) && !matchesKeyword(post.caption, flow.trigger.keyword)) {
      toast(`The caption of “${post.title}” still mentions ${existing!.trigger.keyword}. Update it in Planner.`, 'warning', { label: 'Open post', href: `/app/planner/${post.id}` });
    }
    if (res.ok) navigate(`/app/flows/${flow.id}`);
  };

  const runTest = (id: ScenarioId) => {
    setScenario(id);
    setResult(runScenario(flow, id));
    setTestedNow(true);
  };

  const matchNow = matchesKeyword(testText, flow.trigger.keyword);

  return (
    <>
      <a href={existing ? `#/app/flows/${existing.id}` : '#/app/flows'} className="back-link"><ArrowLeft size={16} /> {existing ? existing.name : 'Lead Flows'}</a>
      <PageHeader
        title={isComment ? 'Turn comments into conversations.' : 'Turn DMs into conversations.'}
        subtitle="Share your free guide. Start the next conversation."
        actions={<button className="btn btn-secondary" onClick={() => persist(false)}>Save draft</button>}
      />

      <ol className="hstepper" aria-label="Flow steps">
        {STEPS.map((s, i) => (
          <li key={s} className={i === step ? 'current' : i < step ? 'done' : ''}>
            <button onClick={() => setStep(i)} aria-current={i === step ? 'step' : undefined}>
              <span className="hstep-num">{i < step ? <Check size={18} strokeWidth={3} /> : i + 1}</span>
              <span className="hstep-text">
                <strong>{i + 1}. {s}</strong>
                <span>{STEP_SUBS[i]}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <div className="builder">
        <section className="card builder-form">
          <div className="builder-head">
            <label className="sr-only" htmlFor="flowname">Flow name</label>
            <input id="flowname" className="title-input" value={flow.name} onChange={(e) => set({ name: e.target.value })} />
            <FlowStatusBadge status={existing?.status ?? 'draft'} />
          </div>
          {existing && <p className="muted xsmall">Saving creates version {existing.version + 1}. Running executions keep version {existing.version}.</p>}
          {step >= 2 && (
            <div className="summary-rows">
              <button className="summary-row" onClick={() => setStep(0)}>
                {post ? <span className="summary-thumb"><PostTile post={post} /></span> : <span className="summary-icon"><MessageCircle size={22} /></span>}
                <span className="summary-main">
                  <span className="muted small row gap-sm"><Instagram size={14} aria-hidden /> {isComment ? 'Post or reel comment' : 'Incoming DM'}</span>
                  <strong>{isComment ? post?.title ?? 'No post selected' : 'Any direct message'}</strong>
                  {post?.date && <span className="muted small">{post.status === 'published' ? 'Posted' : 'Scheduled for'} {formatDate(post.date)}</span>}
                </span>
                <span className="summary-kw">
                  <span className="muted small">Keyword</span>
                  <span className="kw-chip">{flow.trigger.keyword || '—'}</span>
                </span>
                <ChevronRight size={18} aria-hidden className="muted" />
              </button>
              <button className="summary-row" onClick={() => setStep(1)}>
                <span className="summary-icon blue">{flow.resource.kind === 'pdf' ? <FileText size={22} /> : <Link2 size={22} />}</span>
                <span className="summary-main">
                  <strong>{flow.resource.kind === 'pdf' ? flow.resource.fileName ?? flow.resource.title : flow.resource.title}</strong>
                  <span className="muted small">{flow.resource.kind === 'pdf' ? 'Download link' : flow.resource.url}</span>
                </span>
                <ChevronRight size={18} aria-hidden className="muted" />
              </button>
            </div>
          )}
          {step === 0 && (
            <>
              <h2 className="step-title">When to send</h2>
              <div className="radio-cards" role="radiogroup" aria-label="Trigger type">
                <button role="radio" aria-checked={isComment} className={isComment ? 'on' : ''} onClick={() => set({ trigger: { ...flow.trigger, type: 'comment' } })}>
                  <strong>Comment on a post or reel</strong>
                  <span className="muted small">Someone comments your keyword on one selected post.</span>
                </button>
                <button role="radio" aria-checked={!isComment} className={!isComment ? 'on' : ''} onClick={() => set({ trigger: { ...flow.trigger, type: 'dm', postId: undefined }, message: { ...flow.message, route: 'direct', publicReply: false } })}>
                  <strong>Incoming DM</strong>
                  <span className="muted small">Someone sends your keyword in a direct message.</span>
                </button>
              </div>
              <Field label="Keyword" hint="Case doesn’t matter and it must be a separate word. MAGNET and magnet! match; magnetic doesn’t.">
                <input value={flow.trigger.keyword} onChange={(e) => set({ trigger: { ...flow.trigger, keyword: e.target.value.replace(/\s/g, '').toUpperCase() } })} />
              </Field>
              {isComment && (
                <Field label="Post or reel" hint="Scheduled posts get the status Waiting for post until they’re published.">
                  <select value={flow.trigger.postId ?? ''} onChange={(e) => set({ trigger: { ...flow.trigger, postId: e.target.value || undefined } })}>
                    <option value="">Select a post…</option>
                    {posts.filter((p) => p.status !== 'draft').map((p) => (
                      <option key={p.id} value={p.id}>{p.title} · {p.status === 'published' ? 'Published' : 'Scheduled'}</option>
                    ))}
                  </select>
                </Field>
              )}
              <div className="tester">
                <Field label="Test the keyword">
                  <input value={testText} onChange={(e) => setTestText(e.target.value)} />
                </Field>
                <span className={`match ${matchNow ? 'yes' : 'no'}`}>{matchNow ? <><CircleCheck size={16} /> Matches</> : <><CircleSlash size={16} /> No match</>}</span>
              </div>
              {conflicts.length > 0 && (
                <p className="field-error">Keyword {flow.trigger.keyword} is already used by “{conflicts[0].name}” on the same {isComment ? 'post' : 'DM trigger'}. You can save, but activation is blocked until you change one of them.</p>
              )}
            </>
          )}
          {step === 1 && (
            <>
              <h2 className="step-title">What to share</h2>
              <div className="radio-cards" role="radiogroup" aria-label="Resource type">
                <button role="radio" aria-checked={flow.resource.kind === 'pdf'} className={flow.resource.kind === 'pdf' ? 'on' : ''} onClick={() => setRes({ kind: 'pdf' })}>
                  <strong><FileText size={16} /> PDF</strong>
                  <span className="muted small">Delivered as a download link, not as an attachment.</span>
                </button>
                <button role="radio" aria-checked={flow.resource.kind === 'link'} className={flow.resource.kind === 'link' ? 'on' : ''} onClick={() => setRes({ kind: 'link' })}>
                  <strong><Link2 size={16} /> Link</strong>
                  <span className="muted small">Any https:// page, such as a booking page.</span>
                </button>
              </div>
              {flow.resource.kind === 'pdf' ? (
                <div className="field">
                  <span className="field-label">PDF file</span>
                  <label className="file-drop">
                    <Upload size={18} aria-hidden />
                    <span>{flow.resource.fileName ?? 'Choose a PDF from your computer'}</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setRes({ fileName: f.name });
                          setLocalPreview(`${(f.size / 1024).toFixed(0)} KB · stays on this device in the demo`);
                        }
                      }}
                    />
                  </label>
                  <span className="field-hint">{localPreview ?? 'In the demo the file is not uploaded anywhere.'}</span>
                </div>
              ) : (
                <Field label="Link" error={flow.resource.url && linkInvalid ? 'Enter a valid https:// link' : undefined}>
                  <input value={flow.resource.url ?? ''} placeholder="https://" onChange={(e) => setRes({ url: e.target.value })} />
                </Field>
              )}
              <Field label="Title"><input value={flow.resource.title} onChange={(e) => setRes({ title: e.target.value })} /></Field>
              <Field label="Button text"><input value={flow.resource.buttonText} onChange={(e) => setRes({ buttonText: e.target.value })} /></Field>
            </>
          )}
          {step === 2 && (
            <>
              <h2 className="step-title">Your message</h2>
              <p className="muted small">This is the message we’ll send in a direct message when someone {isComment ? 'comments' : 'DMs you'} with your keyword. A fixed, approved text: AI doesn’t change it.</p>
              <div className="counted">
                <label className="sr-only" htmlFor="msgtext">Message</label>
                <textarea id="msgtext" rows={3} maxLength={1000} value={flow.message.text} onChange={(e) => setMsg({ text: e.target.value })} />
                <span className="counter">{flow.message.text.length}/1000</span>
              </div>
              <div className="inline-field">
                <span>
                  <strong>Button label</strong>
                  <span className="muted small">Text for the button in your message.</span>
                </span>
                <span className="counted-input">
                  <label className="sr-only" htmlFor="btnlabel">Button label</label>
                  <input id="btnlabel" maxLength={30} value={flow.resource.buttonText} onChange={(e) => setRes({ buttonText: e.target.value })} />
                  <span className="counter">{flow.resource.buttonText.length}/30</span>
                </span>
              </div>
              <hr className="sep" />
              {isComment && (
                <>
                  <Toggle label="Public reply" description="Reply to the original comment so others can see it too. Only posted after the private reply was sent." checked={flow.message.publicReply} onChange={(v) => setMsg({ publicReply: v })} />
                  {flow.message.publicReply && (
                    <span className="counted-input indent">
                      <label className="sr-only" htmlFor="pubreply">Public reply</label>
                      <input id="pubreply" maxLength={220} value={flow.message.publicReplyText} onChange={(e) => setMsg({ publicReplyText: e.target.value })} />
                      <span className="counter">{flow.message.publicReplyText.length}/220</span>
                    </span>
                  )}
                  <Toggle
                    label="Continue the conversation"
                    description="Start with a short opening and a button. The guide follows after they tap it."
                    checked={flow.message.route === 'conversation'}
                    onChange={(v) => setMsg({ route: v ? 'conversation' : 'direct', askEmail: v ? flow.message.askEmail : false })}
                  />
                  {flow.message.route === 'conversation' && (
                    <div className="grid-2 indent">
                      <Field label="Opening message"><textarea rows={2} value={flow.message.opening} onChange={(e) => setMsg({ opening: e.target.value })} /></Field>
                      <Field label="Opening button" hint="Tapping it counts as interaction. Opening an external link does not."><input value={flow.message.openingButton} onChange={(e) => setMsg({ openingButton: e.target.value })} /></Field>
                    </div>
                  )}
                </>
              )}
              <Toggle
                label="Ask a follow-up question"
                description={isComment ? 'Only after the conversation is open (they replied or tapped the button).' : 'Sent after the resource.'}
                checked={flow.message.followUpQuestion}
                onChange={(v) => setMsg({ followUpQuestion: v })}
              />
              {flow.message.followUpQuestion && <Field label="Follow-up question"><input value={flow.message.followUpText} onChange={(e) => setMsg({ followUpText: e.target.value })} /></Field>}
              {flow.message.route === 'conversation' && (
                <Toggle label="Ask for email (optional for them)" description="Skipping is always possible and the resource stays available. Not a marketing opt-in." checked={flow.message.askEmail} onChange={(v) => setMsg({ askEmail: v })} />
              )}
            </>
          )}
          {step === 3 && (
            <>
              <h2 className="step-title">Review and confirm</h2>
              <dl className="summary-list">
                <dt>Trigger</dt><dd>{isComment ? `Comment “${flow.trigger.keyword}” on “${post?.title ?? '—'}”` : `DM “${flow.trigger.keyword}”`}</dd>
                <dt>Resource</dt><dd>{flow.resource.title} ({flow.resource.kind === 'pdf' ? flow.resource.fileName ?? 'no file' : flow.resource.url})</dd>
                <dt>Route</dt><dd>{flow.message.route === 'direct' ? 'Direct delivery' : 'Start a conversation'}</dd>
                <dt>Extras</dt><dd>{[flow.message.publicReply && 'public reply', flow.message.followUpQuestion && 'follow-up question', flow.message.askEmail && 'email question'].filter(Boolean).join(', ') || 'None'}</dd>
              </dl>
              <h3 className="mt">Test simulator</h3>
              <p className="muted small">Pick a situation to see what happens and why. Nothing is saved or sent.</p>
              <div className="scenario-list">
                {SCENARIOS.map((s) => (
                  <button key={s.id} className={`chip-btn ${scenario === s.id && result ? 'on' : ''}`} onClick={() => runTest(s.id)}>{s.label}</button>
                ))}
              </div>
              {result && (
                <div className="test-log" aria-live="polite">
                  <div className="row gap-sm"><strong>{result.input}</strong>{result.outcome === 'No match' ? <Badge>No match</Badge> : <ExecBadge status={result.outcome} />}</div>
                  <ol>
                    {result.steps.map((s, i) => (
                      <li key={i} className={`step-${s.kind}`}>
                        {s.kind === 'ok' && <CircleCheck size={14} aria-label="Done" />}
                        {s.kind === 'skip' && <CircleSlash size={14} aria-label="Skipped" />}
                        {s.kind === 'wait' && <Clock size={14} aria-label="Waiting" />}
                        {s.kind === 'stop' && <OctagonX size={14} aria-label="Stopped" />}
                        <span>{s.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {conflicts.length > 0 && <p className="field-error">Activation blocked: keyword conflict with “{conflicts[0].name}”.</p>}
            </>
          )}

          {stepErrors[step] && <p className="field-error">{stepErrors[step]}</p>}
          <div className="builder-actions">
            <button className="btn btn-secondary btn-lg" disabled={step === 0} onClick={() => setStep(step - 1)}>Back</button>
            {step < 3 ? (
              <button className="btn btn-primary btn-lg btn-grow" disabled={Boolean(stepErrors[step])} onClick={() => setStep(step + 1)}>
                {step === 2 ? 'Preview flow' : 'Next'} <ArrowRight size={18} />
              </button>
            ) : (
              <button className="btn btn-primary btn-lg btn-grow" disabled={!testedNow || conflicts.length > 0 || stepErrors.some(Boolean)} title={!testedNow ? 'Run at least one test first' : undefined} onClick={() => persist(true)}>
                Activate
              </button>
            )}
          </div>
          {step === 3 && !testedNow && <p className="muted small right">Run at least one test before activating.</p>}
        </section>

        <aside className="preview-card" aria-label="Live preview">
          <h2>Live preview</h2>
          <p className="muted small">See how this looks for someone who {isComment ? 'comments' : 'DMs you'} with your keyword.</p>
          <div className="phone">
            <div className="phone-status" aria-hidden>
              <span>9:41</span>
              <span className="phone-island" />
              <span className="phone-icons"><Signal size={14} /><Wifi size={14} /><BatteryFull size={16} /></span>
            </div>
            <div className="phone-top">
              <ChevronLeft size={22} aria-hidden />
              <Avatar name={contact.name} color={contact.color} size={34} />
              <span className="phone-contact">
                <strong>{contact.name}</strong>
                <span>Active now</span>
              </span>
              <Phone size={20} aria-hidden />
              <Video size={22} aria-hidden />
            </div>
            <div className="phone-body">
              {(result?.preview ?? defaultPreview(flow)).map((m, i) =>
                m.from === 'contact' ? (
                  <div key={i} className="pmsg in">
                    <Avatar name={contact.name} color={contact.color} size={28} />
                    <div>
                      <div className="pbubble">
                        <span className="pname">{contact.name} <span>5m</span></span>
                        {m.text.replace('💬 ', '')}
                      </div>
                      {isComment && i === 0 && <span className="pmeta">Reply · Hide</span>}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="pmsg out">
                    <div className="pbubble">
                      {m.text}
                      {m.button && <span className="pbtn"><FileText size={16} aria-hidden /> {m.button}</span>}
                    </div>
                  </div>
                ),
              )}
            </div>
            <div className="phone-compose" aria-hidden>
              <span className="phone-cam"><Camera size={16} /></span>
              <span className="phone-input">Message…</span>
              <Mic size={18} />
              <Image size={18} />
            </div>
          </div>
          <p className="preview-caption">
            <strong>Example interaction</strong>
            When someone {isComment ? 'comments' : 'sends'} “{flow.trigger.keyword}”, they’ll receive this message in their DMs with a link to your {flow.resource.kind === 'pdf' ? 'guide' : 'page'}.
          </p>
        </aside>
      </div>
    </>
  );
}

function defaultPreview(flow: Flow): TestResult['preview'] {
  const out: TestResult['preview'] = [{ from: 'contact', text: flow.trigger.type === 'comment' ? `💬 ${flow.trigger.keyword}` : flow.trigger.keyword }];
  if (flow.message.route === 'conversation' && flow.trigger.type === 'comment') {
    out.push({ from: 'flow', text: flow.message.opening, button: flow.message.openingButton });
  } else {
    out.push({ from: 'flow', text: flow.message.text, button: flow.resource.buttonText });
  }
  return out;
}
