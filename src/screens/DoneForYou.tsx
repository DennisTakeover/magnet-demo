import { useMemo, useState } from 'react';
import { CalendarCheck, CalendarDays, Check, Clock, Rocket, Sparkles, UserRound } from 'lucide-react';
import { clientLog, logActivity, uid, useStore } from '../store';
import { money, t } from '../i18n/locale';
import { Field, Modal, PageHeader, formatDate } from '../components/ui';
import type { DfyBooking, DfyOffer } from '../types';

export const CMO_RATE = 250;
export const FULL_SERVICE_PRICE = 4500;

const OFFERS: Record<DfyOffer, { name: string; callName: string; minutes: number }> = {
  cmo: { name: 'CMO strategy call', callName: 'CMO strategy call', minutes: 60 },
  full: { name: 'Full service', callName: 'Intro call: Full service', minutes: 30 },
};

const TIMES = ['09:00', '10:30', '13:00', '15:30', '17:00'];

/** Next working days with a few slots already taken, so the picker looks realistic. */
function availability() {
  const days: { iso: string; times: { t: string; free: boolean }[] }[] = [];
  const d = new Date();
  while (days.length < 6) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    days.push({ iso, times: TIMES.map((t, i) => ({ t, free: (d.getDate() + i) % 3 !== 0 })) });
  }
  return days;
}

export default function DoneForYou() {
  const { state, update, toast } = useStore();
  const [booking, setBooking] = useState<{ offer: DfyOffer; reschedule?: DfyBooking } | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const upcoming = state.dfyBookings.filter((b) => b.status === 'scheduled').sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));

  const cancel = (b: DfyBooking) => {
    update((d) => {
      const x = d.dfyBookings.find((y) => y.id === b.id)!;
      x.status = 'cancelled';
      clientLog(d, 'support', `Cancelled ${OFFERS[b.offer].callName} on ${b.date} ${b.time}`);
    });
    setCancelId(null);
    toast('Call cancelled', 'info');
  };

  return (
    <>
      <PageHeader title={t('dfy.title')} subtitle={t('dfy.sub')} />

      {upcoming.length > 0 && (
        <section className="card" aria-labelledby="upcoming">
          <div className="card-head">
            <h2 id="upcoming">Your upcoming calls</h2>
          </div>
          <ul className="dfy-calls">
            {upcoming.map((b) => (
              <li key={b.id} className="dfy-call">
                <span className="dfy-call-date">
                  <strong>{new Date(`${b.date}T12:00`).getDate()}</strong>
                  <span>{new Date(`${b.date}T12:00`).toLocaleDateString('en-GB', { month: 'short' })}</span>
                </span>
                <span className="dfy-call-main">
                  <strong>{OFFERS[b.offer].callName}</strong>
                  <span className="muted small">
                    {formatDate(b.date)} at {b.time} · {b.offer === 'cmo' ? `${b.hours} hour${b.hours > 1 ? 's' : ''} · ${money(b.hours * CMO_RATE)}` : '30 minutes · free'} · video call
                  </span>
                  {b.notes && <span className="small clamp-1">“{b.notes}”</span>}
                </span>
                {cancelId === b.id ? (
                  <span className="row gap-sm">
                    <span className="small">Cancel this call?</span>
                    <button className="btn btn-sm btn-danger" onClick={() => cancel(b)}>Yes, cancel</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setCancelId(null)}>Keep</button>
                  </span>
                ) : (
                  <span className="row gap-sm">
                    <button className="btn btn-sm btn-secondary" onClick={() => setBooking({ offer: b.offer, reschedule: b })}>Reschedule</button>
                    <button className="btn btn-sm btn-ghost" onClick={() => setCancelId(b.id)}>Cancel</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="dfy-offers">
        <article className="card dfy-offer">
          <span className="dfy-icon"><UserRound size={22} aria-hidden /></span>
          <span className="persona-label">Advice</span>
          <h2>CMO strategy call</h2>
          <p className="dfy-price"><strong>{money(CMO_RATE)}</strong> <span>per hour</span></p>
          <p className="muted">A 1:1 video call with an experienced CMO. Bring your account, your goals and your questions. Leave with a clear plan you can run yourself in MAGNET.</p>
          <ul className="dfy-list">
            <li><Check size={18} aria-hidden /> Review of your profile, content and Lead Flows</li>
            <li><Check size={18} aria-hidden /> Advice on audience, offer and messaging for {state.business.name}</li>
            <li><Check size={18} aria-hidden /> A written action plan after the call</li>
            <li><Check size={18} aria-hidden /> Book 1 or 2 hours</li>
          </ul>
          <button className="btn btn-secondary btn-lg btn-block" onClick={() => setBooking({ offer: 'cmo' })}>
            <CalendarDays size={18} /> Book a CMO call
          </button>
        </article>

        <article className="card dfy-offer featured">
          <span className="dfy-icon"><Rocket size={22} aria-hidden /></span>
          <span className="persona-label">Done for you</span>
          <h2>Full service</h2>
          <p className="dfy-price"><strong>{money(FULL_SERVICE_PRICE)}</strong> <span>per month</span></p>
          <p className="dfy-desc">Our team runs MAGNET for you: strategy, content, conversations and leads. You set the rules and approve what matters. We do the rest.</p>
          <ul className="dfy-list">
            <li><Check size={18} aria-hidden /> Your own CMO and a monthly strategy session</li>
            <li><Check size={18} aria-hidden /> Content plan, captions and Lead Flows made for you</li>
            <li><Check size={18} aria-hidden /> Inbox handled every working day, within your approval rules</li>
            <li><Check size={18} aria-hidden /> Weekly report with conversations, leads and next steps</li>
          </ul>
          <button className="btn btn-white btn-lg btn-block" onClick={() => setBooking({ offer: 'full' })}>
            <CalendarCheck size={18} /> Plan a free intro call
          </button>
          <span className="dfy-note">30 minutes, free. We’ll see if it’s a fit before anything starts.</span>
        </article>
      </div>

      <section className="card" aria-labelledby="how">
        <h2 id="how">How it works</h2>
        <ol className="dfy-steps">
          <li><span className="hstep-num">1</span><span><strong>Pick a time</strong><span className="muted small">Choose a slot that suits you. Calls are by video.</span></span></li>
          <li><span className="hstep-num">2</span><span><strong>We prepare</strong><span className="muted small">Your CMO looks at your account and MAGNET results before the call.</span></span></li>
          <li><span className="hstep-num">3</span><span><strong>Talk and decide</strong><span className="muted small">You get a clear plan, or a proposal for Full service if you want us to run it.</span></span></li>
        </ol>
        <p className="muted xsmall">{t('dfy.demoNote', { currency: state.locale.currency })}</p>
      </section>

      {booking && (
        <BookingModal
          offer={booking.offer}
          reschedule={booking.reschedule}
          onClose={() => setBooking(null)}
          onBooked={(b) => {
            const isNew = !booking.reschedule;
            update((d) => {
              if (booking.reschedule) {
                const x = d.dfyBookings.find((y) => y.id === booking.reschedule!.id)!;
                Object.assign(x, { date: b.date, time: b.time, hours: b.hours, notes: b.notes });
              } else d.dfyBookings.push(b);
              clientLog(d, 'support', `${isNew ? 'Booked' : 'Rescheduled'} ${OFFERS[b.offer].callName} for ${b.date} ${b.time}`);
              if (isNew) {
                // The MAGNET team picks this up in Support
                d.support.unshift({
                  id: uid('sp'),
                  clientId: 'c1',
                  subject: b.offer === 'cmo' ? `CMO call booked (${b.hours} h, ${money(b.hours * CMO_RATE)})` : 'Full service: intro call requested',
                  detail: `${formatDate(b.date)} at ${b.time}. ${b.notes ? `Topic: “${b.notes}”` : 'No topic given.'}`,
                  status: 'Open',
                  assignee: null,
                  time: Date.now(),
                });
                logActivity(d, { actor: 'System', actorRole: 'system', clientId: 'c1', type: 'support', action: `New Done for you request: ${OFFERS[b.offer].callName}`, result: 'success' });
              }
            });
            setBooking(null);
            toast(`${isNew ? 'Call booked' : 'Call moved'}: ${formatDate(b.date)} at ${b.time} (demo, no invite sent)`, 'success');
          }}
        />
      )}
    </>
  );
}

function BookingModal({ offer, reschedule, onClose, onBooked }: { offer: DfyOffer; reschedule?: DfyBooking; onClose: () => void; onBooked: (b: DfyBooking) => void }) {
  const days = useMemo(availability, []);
  const [date, setDate] = useState(reschedule?.date ?? days[0].iso);
  const [time, setTime] = useState<string | null>(reschedule?.time ?? null);
  const [hours, setHours] = useState(reschedule?.hours && offer === 'cmo' ? reschedule.hours : 1);
  const [notes, setNotes] = useState(reschedule?.notes ?? '');
  const day = days.find((d) => d.iso === date) ?? days[0];
  const info = OFFERS[offer];

  const confirm = () => {
    if (!time) return;
    onBooked({ id: reschedule?.id ?? uid('dfy'), offer, date, time, hours: offer === 'cmo' ? hours : 0.5, notes: notes.trim(), status: 'scheduled', createdAt: Date.now() });
  };

  return (
    <Modal
      title={reschedule ? `Reschedule: ${info.callName}` : offer === 'cmo' ? 'Book a CMO strategy call' : 'Plan a free intro call'}
      onClose={onClose}
      wide
      footer={
        <>
          <span className="spacer muted small">
            {offer === 'cmo' ? <>Total <strong>{money(hours * CMO_RATE)}</strong> · paid after the call (demo)</> : <>Free · {money(FULL_SERVICE_PRICE)}/month only if you decide to start</>}
          </span>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!time} onClick={confirm}>{reschedule ? 'Move call' : 'Book call'}</button>
        </>
      }
    >
      {offer === 'cmo' && (
        <div className="field">
          <span className="field-label">Length</span>
          <div className="tab-pills" role="radiogroup" aria-label="Call length">
            {[1, 2].map((h) => (
              <button key={h} role="radio" aria-checked={hours === h} className={hours === h ? 'on' : ''} onClick={() => setHours(h)}>
                {h} hour{h > 1 ? 's' : ''} · {money(h * CMO_RATE)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="field">
        <span className="field-label">Day</span>
        <div className="day-chips" role="radiogroup" aria-label="Day">
          {days.map((d) => {
            const dt = new Date(`${d.iso}T12:00`);
            return (
              <button key={d.iso} role="radio" aria-checked={date === d.iso} className={`day-chip ${date === d.iso ? 'on' : ''}`} onClick={() => { setDate(d.iso); setTime(null); }}>
                <span>{dt.toLocaleDateString('en-GB', { weekday: 'short' })}</span>
                <strong>{dt.getDate()}</strong>
                <span>{dt.toLocaleDateString('en-GB', { month: 'short' })}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="field">
        <span className="field-label">Time <span className="muted">({info.minutes * (offer === 'cmo' ? hours : 1)} min · your time zone)</span></span>
        <div className="time-chips" role="radiogroup" aria-label="Time">
          {day.times.map(({ t, free }) => (
            <button key={t} role="radio" aria-checked={time === t} disabled={!free} className={`chip-btn ${time === t ? 'on' : ''}`} onClick={() => setTime(t)}>
              <Clock size={14} aria-hidden /> {t}{!free && ' · taken'}
            </button>
          ))}
        </div>
      </div>
      <Field label={offer === 'cmo' ? 'What would you like to discuss?' : 'What would you like help with? (optional)'}>
        <textarea rows={3} value={notes} placeholder={offer === 'cmo' ? 'For example: my Lead Flows get requests but few bookings.' : 'For example: I don’t have time to post and reply every day.'} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <p className="muted xsmall"><Sparkles size={12} aria-hidden /> Your CMO sees your MAGNET account before the call, so you don’t need to prepare anything.</p>
    </Modal>
  );
}
