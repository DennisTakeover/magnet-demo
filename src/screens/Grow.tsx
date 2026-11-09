import { useState } from 'react';
import { Check, Pause, Play, Plus, Ban, Undo2, ShieldCheck, CircleSlash, CircleCheck } from 'lucide-react';
import { clientLog, markActivation, uid, usePersona, useStore } from '../store';
import OpsBanner from '../components/OpsBanner';
import { blockedBy } from '../ops';
import { t } from '../i18n/locale';
import { AiTag, Badge, CampaignBadge, ChipInput, Field, Modal, PageHeader, Segmented, timeAgo } from '../components/ui';
import type { Source } from '../types';

type Filter = 'all' | Source['status'];

export default function Grow() {
  const { state, update, toast } = useStore();
  const persona = usePersona();
  const inter = state.interactions;
  const [aud, setAud] = useState(state.audience);
  const [dirty, setDirty] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmStart, setConfirmStart] = useState(false);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [newSource, setNewSource] = useState('');

  const disconnected = state.connection === 'disconnected';
  const growthReady = state.promoview === 'connected';
  const accepted = state.sources.filter((s) => s.status === 'accepted');
  const suggested = state.sources.filter((s) => s.status === 'suggested');
  const shown = filter === 'all' ? state.sources : state.sources.filter((s) => s.status === filter);
  const adminPause = state.activity.find((a) => a.clientId === 'c1' && a.type === 'campaign' && a.actorRole === 'admin');
  const pausedByAdmin = state.campaign === 'paused' && adminPause?.action.startsWith('Paused');

  const editAud = (patch: Partial<typeof aud>) => {
    setAud({ ...aud, ...patch });
    setDirty(true);
  };

  const saveAudience = () => {
    update((d) => {
      // Filters are saved separately, so only take the audience fields from this form
      d.audience = { ...d.audience, topics: aud.topics, languages: aud.languages, regions: aud.regions, exclusions: aud.exclusions };
      clientLog(d, 'setting', 'Saved audience criteria');
      markActivation(d, 'audience_saved');
    });
    setDirty(false);
    toast('Audience saved');
  };

  const setCampaign = (status: 'active' | 'paused') => {
    update((d) => {
      d.campaign = status;
      d.clients[0].campaign = status;
      if (status === 'active') markActivation(d, 'campaign_started');
      clientLog(d, 'campaign', status === 'active' ? (d.activity.some((a) => a.clientId === 'c1' && a.type === 'campaign') ? 'Resumed Grow campaign' : 'Started Grow campaign') : 'Paused Grow campaign');
    });
    toast(status === 'active' ? 'Campaign is active. You can pause it at any time.' : 'Campaign paused. No new interactions will run.', status === 'active' ? 'success' : 'info');
  };

  const setSource = (id: string, status: Source['status']) => {
    update((d) => {
      const s = d.sources.find((x) => x.id === id)!;
      s.status = status;
      clientLog(d, 'setting', `${status === 'accepted' ? 'Accepted' : status === 'excluded' ? 'Excluded' : 'Reset'} source ${s.handle}`);
    });
    setReviewing(null);
    toast(status === 'accepted' ? 'Source accepted' : status === 'excluded' ? 'Source excluded' : 'Source moved back to suggestions', 'info');
  };

  const addSource = () => {
    const h = newSource.trim();
    if (!h) return;
    const handle = h.startsWith('@') ? h : `@${h}`;
    update((d) => {
      d.sources.push({ id: uid('s'), handle, name: handle.slice(1), topic: 'Added by you', reason: 'Added manually by you', status: 'accepted' });
    });
    setNewSource('');
    toast(`${handle} added as a source`);
  };

  return (
    <>
      <PageHeader title={t('grow.title')} subtitle={t('grow.sub')} />
      <OpsBanner module="grow" />

      <section className={`card campaign-card ${state.campaign}`} aria-labelledby="camp">
        <div className="campaign-main">
          <div>
            <div className="row gap-sm">
              <h2 id="camp">Growth campaign</h2>
              <CampaignBadge status={state.campaign} />
            </div>
            <p className="muted small">
              {state.campaign === 'active' && `Running with ${accepted.length} sources and ${aud.topics.length} topics.`}
              {state.campaign === 'paused' && (pausedByAdmin ? `Paused by the MAGNET team ${timeAgo(adminPause!.time)}: “${adminPause!.reason}”` : 'Paused. No new interactions run until you resume.')}
              {state.campaign === 'draft' && 'Not started yet.'}
            </p>
          </div>
          <div className="row gap-sm">
            {state.campaign === 'active' ? (
              <button className="btn btn-secondary" onClick={() => setCampaign('paused')}><Pause size={16} /> Pause campaign</button>
            ) : (
              <button className="btn btn-primary" disabled={disconnected || !growthReady || !!blockedBy(state, 'grow')} onClick={() => setConfirmStart(true)}>
                <Play size={16} /> {state.campaign === 'paused' ? 'Resume campaign' : 'Start campaign'}
              </button>
            )}
          </div>
        </div>
        {state.campaign !== 'active' && (disconnected || !growthReady) && (
          <p className="field-error">
            {disconnected ? 'Reconnect Instagram' : state.promoview === 'pending' ? 'Wait until the growth service confirms your account' : 'Connect the growth engine'} before starting the campaign. <a href="#/app/connect">Go to connections</a>
          </p>
        )}
        <div className="campaign-stats">
          <div className="interactions-stat">
            <span className="row between">
              <span className="muted small">Interactions today</span>
              <span className="small"><strong>{inter.today}</strong> / {inter.dailyLimit}</span>
            </span>
            <span className="meter" role="meter" aria-valuemin={0} aria-valuemax={inter.dailyLimit} aria-valuenow={inter.today} aria-label="Interactions today">
              <span style={{ width: `${Math.min(100, (inter.today / inter.dailyLimit) * 100)}%` }} />
            </span>
            <span className="muted xsmall">MAGNET engages with people in your audience on your behalf, within a safe daily limit.</span>
          </div>
          <div><span className="metric-value sm">+{persona.metrics['28'].growth.toLocaleString('en-GB')}</span><span className="muted small">Net follower growth, 28 days (sample)</span></div>
          <div><span className="metric-value sm">{accepted.length}</span><span className="muted small">Active sources · {suggested.length} to review</span></div>
        </div>
      </section>

      <div className="grid-2 grid-top">
        <section className="card" aria-labelledby="crit">
          <div className="card-head">
            <h2 id="crit">Audience</h2>
            {dirty && <Badge tone="amber">Unsaved changes</Badge>}
          </div>
          <Field label="Topics"><ChipInput label="Topics" values={aud.topics} onChange={(v) => editAud({ topics: v })} placeholder="Add a topic and press Enter" /></Field>
          <Field label="Languages"><ChipInput label="Languages" values={aud.languages} onChange={(v) => editAud({ languages: v })} placeholder="Add a language" /></Field>
          <Field label="Regions"><ChipInput label="Regions" values={aud.regions} onChange={(v) => editAud({ regions: v })} placeholder="Add a region" /></Field>
          <Field label="Exclude"><ChipInput label="Exclusions" values={aud.exclusions} onChange={(v) => editAud({ exclusions: v })} placeholder="Add an exclusion" /></Field>
          <div className="row end">
            {dirty && <button className="btn btn-ghost" onClick={() => { setAud(state.audience); setDirty(false); }}>Discard</button>}
            <button className="btn btn-primary" onClick={saveAudience} disabled={!dirty}>Save audience</button>
          </div>
        </section>

        <section className="card" aria-labelledby="src">
          <div className="card-head">
            <h2 id="src">Source accounts</h2>
            <Segmented label="Filter sources" value={filter} onChange={setFilter} options={[{ id: 'all', label: 'All' }, { id: 'suggested', label: 'To review' }, { id: 'accepted', label: 'Accepted' }, { id: 'excluded', label: 'Excluded' }]} />
          </div>
          <p className="muted small">Sources are search directions: we look for people with similar interests. Their followers won’t automatically become clients.</p>
          <ul className="source-list">
            {shown.map((s) => (
              <li key={s.id} className={`source ${s.status}`}>
                <div className="source-main">
                  <div>
                    <strong>{s.handle}</strong> <span className="muted small">{s.name}</span>
                    <div className="small source-reason">
                      {s.status === 'suggested' && <AiTag>Why suggested</AiTag>} {s.reason}
                    </div>
                  </div>
                  <div className="row gap-sm">
                    {s.status === 'suggested' && reviewing !== s.id && (
                      <button className="btn btn-sm btn-secondary" onClick={() => setReviewing(s.id)}>Review suggestion</button>
                    )}
                    {s.status === 'accepted' && <Badge tone="green">Accepted</Badge>}
                    {s.status === 'excluded' && <Badge>Excluded</Badge>}
                    {s.status !== 'suggested' && (
                      <button className="icon-btn" aria-label={`Move ${s.handle} back to review`} title="Move back to review" onClick={() => setSource(s.id, 'suggested')}>
                        <Undo2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
                {reviewing === s.id && (
                  <div className="review-box">
                    <p className="small">
                      Topic: <strong>{s.topic}</strong>. Accepting adds it as a search direction for the campaign.
                    </p>
                    <div className="row gap-sm">
                      <button className="btn btn-sm btn-primary" onClick={() => setSource(s.id, 'accepted')}><Check size={14} /> Accept</button>
                      <button className="btn btn-sm btn-secondary" onClick={() => setSource(s.id, 'excluded')}><Ban size={14} /> Exclude</button>
                      <button className="btn btn-sm btn-ghost" onClick={() => setReviewing(null)}>Later</button>
                    </div>
                  </div>
                )}
              </li>
            ))}
            {shown.length === 0 && <li className="muted small">Nothing here.</li>}
          </ul>
          <form
            className="row gap-sm add-source"
            onSubmit={(e) => {
              e.preventDefault();
              addSource();
            }}
          >
            <label className="sr-only" htmlFor="newsrc">Add source account</label>
            <input id="newsrc" placeholder="@account" value={newSource} onChange={(e) => setNewSource(e.target.value)} />
            <button className="btn btn-secondary" type="submit"><Plus size={16} /> Add</button>
          </form>
        </section>
      </div>

      <Filters />

      {confirmStart && (
        <Modal
          title={state.campaign === 'paused' ? 'Resume campaign?' : 'Start campaign?'}
          onClose={() => setConfirmStart(false)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setConfirmStart(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  if (dirty) saveAudience();
                  setCampaign('active');
                  setConfirmStart(false);
                }}
              >
                {state.campaign === 'paused' ? 'Resume campaign' : 'Start campaign'}
              </button>
            </>
          }
        >
          <p>Your campaign will look for people interested in:</p>
          <dl className="summary-list">
            <dt>Topics</dt><dd>{aud.topics.join(', ') || '—'}</dd>
            <dt>Languages</dt><dd>{aud.languages.join(', ') || '—'}</dd>
            <dt>Regions</dt><dd>{aud.regions.join(', ') || '—'}</dd>
            <dt>Excluding</dt><dd>{aud.exclusions.join(', ') || '—'}</dd>
            <dt>Sources</dt><dd>{accepted.map((s) => s.handle).join(', ') || '—'}</dd>
            <dt>Filters</dt><dd>{state.audience.blockedWords.length} blocked words · {state.audience.protectedAccounts.length} protected accounts</dd>
          </dl>
          <p className="muted small">This is a simulation. No actions run on Instagram in the demo.</p>
        </Modal>
      )}
    </>
  );
}

function normalizeHandle(h: string) {
  const t = h.trim().toLowerCase().replace(/\s+/g, '');
  return t.startsWith('@') ? t : `@${t}`;
}

function Filters() {
  const { state, update, toast } = useStore();
  const [words, setWords] = useState(state.audience.blockedWords);
  const [keep, setKeep] = useState(state.audience.protectedAccounts);
  const [sample, setSample] = useState('Giveaway every Friday 🎁 DM me for promo deals');
  const dirty = words.join() !== state.audience.blockedWords.join() || keep.join() !== state.audience.protectedAccounts.join();
  const hit = words.find((w) => sample.toLowerCase().includes(w.toLowerCase()));

  const save = () => {
    update((d) => {
      d.audience.blockedWords = words;
      d.audience.protectedAccounts = keep;
      clientLog(d, 'setting', `Updated blocked words (${words.length}) and protected accounts (${keep.length})`);
    });
    toast('Filters saved. They apply to all interactions from now on.');
  };

  return (
    <section className="card" aria-labelledby="filters">
      <div className="card-head">
        <h2 id="filters">Filters</h2>
        <span className="muted small">Skipped by blocked words in the last 28 days: <strong>{state.interactions.skippedByBlockedWords}</strong> (sample)</span>
      </div>
      <div className="grid-2">
        <div className="filter-col">
          <span className="filter-title"><CircleSlash size={18} aria-hidden /> Blocked words</span>
          <p className="muted small">People with one of these words in their name or bio are skipped. MAGNET never interacts with them.</p>
          <ChipInput label="Blocked words" values={words} onChange={(v) => setWords(v.map((w) => w.toLowerCase()))} placeholder="Add a word and press Enter" />
          <div className="tester mt">
            <Field label="Try a name or bio">
              <input value={sample} onChange={(e) => setSample(e.target.value)} />
            </Field>
            <span className={`match ${hit ? 'no' : 'yes'}`}>
              {hit ? <><CircleSlash size={16} /> Skipped (“{hit}”)</> : <><CircleCheck size={16} /> Included</>}
            </span>
          </div>
        </div>
        <div className="filter-col">
          <span className="filter-title"><ShieldCheck size={18} aria-hidden /> Protected accounts</span>
          <p className="muted small">Friends, partners and customers you always want to keep. MAGNET never removes them from your interactions.</p>
          <ChipInput label="Protected accounts" values={keep} onChange={(v) => setKeep([...new Set(v.map(normalizeHandle))])} placeholder="@account and press Enter" />
          <p className="muted xsmall mt">Tip: add your team, your partners and your best customers.</p>
        </div>
      </div>
      <div className="row end">
        {dirty && (
          <button className="btn btn-ghost" onClick={() => { setWords(state.audience.blockedWords); setKeep(state.audience.protectedAccounts); }}>Discard</button>
        )}
        <button className="btn btn-primary" disabled={!dirty} onClick={save}>Save filters</button>
      </div>
    </section>
  );
}
