import { ArrowRight, Check, ChevronRight, Instagram, Lock, MessageCircle, Play, ShieldCheck, Sparkles, Target, Users, X } from 'lucide-react';
import MagnetArt from '../components/MagnetArt';
import { useEffect, useRef, useState } from 'react';
import { PlanBuilder, ProductMock, VideoSection, img } from './Entry';
import { PV_REVIEWS } from './promoviewReviews';
import { TRIAL_DAYS } from '../brand';

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const TRUSTPILOT_URL = 'https://nl.trustpilot.com/review/promo-view.io';

/** Case results as published on promo-view.io. */
const CASES = [
  { handle: '@alpacababycareofficial', what: 'Brand met 100% natuurlijke verzorging voor baby’s', result: '+1587 volgers in 30 dagen' },
  { handle: '@suuskuytenhorses', what: 'Paardentrainer op het hoogste niveau', result: '+832 volgers in 30 dagen' },
  { handle: '@genesis.ink', what: 'Tattoo studio in Nederland', result: '+618 volgers in 30 dagen' },
  { handle: '@area8eight', what: 'Brand in handgemaakte meubels van natuursteen', result: '+610 volgers in 30 dagen' },
];

function TpStar({ lg }: { lg?: boolean }) {
  return <span className={`tp-star ${lg ? 'lg' : ''}`} aria-hidden><svg viewBox="0 0 24 24" width={lg ? 22 : 16} height={lg ? 22 : 16}><path fill="#fff" d="M12 2.5l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.7l7.1-.6z" /></svg></span>;
}

/** Scroll reveal: elements fade up the first time they enter the viewport. Skipped for reduced motion. */
function useReveal(root: React.RefObject<HTMLElement>) {
  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    el.classList.add('pv-anim');
    const SEL = '.m-section-head, .m-trust, .pv-case, .m-step, .tp-card, .tp-summary, .pv-compare, .m-control > div, .m-vsl-frame, .m-builder, .lfaq-item, .m-final-band';
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    const seen = new WeakSet<Element>();
    const scan = () => el.querySelectorAll(SEL).forEach((n) => {
      if (seen.has(n)) return;
      seen.add(n);
      const sibs = n.parentElement ? Array.from(n.parentElement.children).filter((c) => c.matches(SEL)) : [];
      (n as HTMLElement).style.setProperty('--d', `${Math.min(sibs.indexOf(n), 6) * 70}ms`);
      n.classList.add('rv');
      io.observe(n);
    });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(el, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); };
  }, [root]);
}

/** Counts a number up once it scrolls into view, e.g. "+1587 volgers in 30 dagen". */
function CountUp({ text }: { text: string }) {
  const m = text.match(/^(\D*)(\d+)(.*)$/);
  const target = m ? Number(m[2]) : 0;
  const [n, setN] = useState(target);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || !m || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / 1400);
        setN(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  if (!m) return <span>{text}</span>;
  return <span ref={ref} aria-label={text}><span aria-hidden>{m[1]}{n}{m[3]}</span></span>;
}

function ReviewsBlock() {
  const [all, setAll] = useState(false);
  const shown = all ? PV_REVIEWS : PV_REVIEWS.slice(0, 9);
  return (
    <section className="m-section m-reviews" id="reviews">
      <div className="m-section-head">
        <span className="m-kicker">Reviews</span>
        <h2 className="m-h2">Wat klanten zeggen.</h2>
      </div>
      <div className="tp-summary">
        <span className="tp-brand"><TpStar lg /> Trustpilot</span>
        <span className="muted">{PV_REVIEWS.length} reviews van klanten</span>
        <a className="btn btn-secondary" href={TRUSTPILOT_URL} target="_blank" rel="noreferrer">Bekijk op Trustpilot <ArrowRight size={16} /></a>
      </div>
      <div className="tp-grid">
        {shown.map((r) => (
          <a key={r.name} className="tp-card" href={TRUSTPILOT_URL} target="_blank" rel="noreferrer" aria-label={`Review van ${r.name}, ${r.stars} van 5 sterren. Open op Trustpilot`}>
            <span className="tp-author">
              <img className="tp-logo" src={r.logo} alt="" />
              <span><b>{r.name}</b><span className="tp-stars" aria-hidden>{Array.from({ length: r.stars }, (_, i) => <TpStar key={i} />)}</span></span>
            </span>
            <p>{r.text}</p>
          </a>
        ))}
      </div>
      {!all && <div className="m-ctas center-cta"><button className="btn btn-secondary btn-lg" onClick={() => setAll(true)}>Toon alle {PV_REVIEWS.length} reviews</button></div>}
    </section>
  );
}

export default function PromoviewHome() {
  const root = useRef<HTMLElement>(null);
  useReveal(root);
  return (
    <main className="m-home pv-home" lang="nl" ref={root}>
      <section className="m-hero">
        <span className="m-pill"><Sparkles size={14} aria-hidden /> Aangedreven door AI-technologie</span>
        <h1 className="m-hero-title">Groei je Instagram<br /><span className="pv-grad">met AI.</span></h1>
        <p className="m-hero-lead">Een volger is niks waard zolang het geen potentiële klant is.</p>
        <p className="m-hero-sub">Bereik de juiste mensen, beantwoord elke DM en maak van interesse klanten. Voor ondernemers in Nederland en België.</p>
        <div className="m-ctas">
          <a className="btn btn-primary btn-lg" href="#/onboarding" data-cta="hero-start">Probeer {TRIAL_DAYS} dagen gratis</a>
          <a className="btn btn-secondary btn-lg" href="#vsl" onClick={scrollTo('vsl')} data-cta="hero-video"><Play size={16} fill="currentColor" /> Bekijk de demo</a>
        </div>
        <ul className="m-reassure" aria-label="Goed om te weten">
          <li><Check size={15} aria-hidden /> {TRIAL_DAYS} dagen gratis proberen</li>
          <li><Check size={15} aria-hidden /> Binnen 24 uur live</li>
          <li><Lock size={15} aria-hidden /> Geen wachtwoord nodig</li>
                  </ul>
        <div className="m-hero-stage">
          <img className="m-photo m-photo-a" src={img('man-curly')} alt="" />
          <img className="m-photo m-photo-b" src={img('woman-sweater')} alt="" />
          <MagnetArt className="m-hero-magnet" size={420} rotate={-24} />
          <ProductMock />
          <span className="m-demo-tag">Demodata</span>
        </div>
      </section>

      <section className="m-trust" aria-label="Waarom Promoview">
        <span><Instagram size={18} aria-hidden /> Officiële Instagram-koppeling</span>
        <span><ShieldCheck size={18} aria-hidden /> Jij keurt elke AI-reactie goed</span>
        <span><Target size={18} aria-hidden /> Lokale volgers (optioneel)</span>
        <span><MessageCircle size={18} aria-hidden /> Direct contact met ons team</span>
      </section>

      <VideoSection title="Zie Promoview in 2 minuten." sub="Van een reactie onder je post tot een nieuwe klant, stap voor stap." cta="Begin direct" demo="Bekijk de live demo" caption="Bekijk de uitleg van 2 minuten" />

      <section className="m-section" id="resultaten">
        <div className="m-section-head">
          <span className="m-kicker">Resultaten</span>
          <h2 className="m-h2">Echte cijfers. Echte resultaten.</h2>
          <p className="m-sub">Zo groeiden klanten van Promoview. Resultaten verschillen per account en zijn geen garantie.</p>
        </div>
        <div className="pv-cases">
          {CASES.map((c) => (
            <article key={c.handle} className="pv-case">
              <strong className="pv-case-result"><CountUp text={c.result} /></strong>
              <span className="pv-case-handle">{c.handle}</span>
              <span className="muted small">{c.what}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="m-section" id="hoe">
        <div className="m-section-head">
          <span className="m-kicker">Hoe werkt het?</span>
          <h2 className="m-h2">Binnen 24 uur live.</h2>
          <p className="m-sub">Wij zorgen voor een snelle start, zonder gedoe.</p>
        </div>
        <div className="m-steps">
          {[
            [Users, 'Aanmelden en doelen', 'Meld je aan en deel je groeidoelen, zodat we alles afstemmen op wat jij wilt bereiken.'],
            [Target, 'Doelgroeponderzoek', 'We brengen in kaart wie jouw ideale volgers zijn: de mensen die klant kunnen worden.'],
            [Instagram, 'Instellen en koppelen', 'Je koppelt je Instagram via de officiële login. Wij stellen de groei voor je in.'],
            [MessageCircle, 'Optimalisatie en groei', 'Je ziet je groei, gesprekken en leads in één dashboard, en wij blijven bijsturen.'],
          ].map(([Icon, t, d], i) => {
            const I = Icon as typeof Users;
            return (
              <div key={t as string} className="m-step">
                <span className={`m-icon tone-${i}`}><I size={22} aria-hidden /></span>
                <div><span className="m-step-n">Stap {i + 1}</span><strong>{t as string}</strong><p>{d as string}</p></div>
                {i < 3 && <ChevronRight className="m-step-arrow" size={20} aria-hidden />}
              </div>
            );
          })}
        </div>
        <div className="m-ctas center-cta"><a className="btn btn-primary btn-lg" href="#/onboarding" data-cta="steps-start">Probeer {TRIAL_DAYS} dagen gratis <ArrowRight size={18} /></a></div>
      </section>

      <section className="m-section m-control">
        <div>
          <span className="m-kicker">Waarom Promoview</span>
          <h2 className="m-h2">Promoview vs anderen.</h2>
          <p className="m-sub">Je verdient de beste service als het gaat om jouw Instagram-groei.</p>
          <a className="btn btn-secondary btn-lg" href="#/app/overview">Bekijk het dashboard <ArrowRight size={18} /></a>
        </div>
        <table className="pv-compare">
          <thead><tr><th scope="col"><span className="sr-only">Voordeel</span></th><th scope="col">Promoview</th><th scope="col">Anderen</th></tr></thead>
          <tbody>
            {['Op maat gemaakt', 'Lokale volgers (optioneel)', 'Op basis van AI', 'Jij keurt elke AI-reactie goed', 'Direct contact met het team', 'Zelf opzeggen in je account'].map((r) => (
              <tr key={r}><th scope="row">{r}</th><td><Check size={18} aria-label="Ja" /></td><td><X size={18} aria-label="Nee" /></td></tr>
            ))}
          </tbody>
        </table>
      </section>

      <ReviewsBlock />

      <section className="m-section" id="pricing-preview">
        <div className="m-section-head">
          <span className="m-kicker">Prijzen</span>
          <h2 className="m-h2">Stel je eigen abonnement samen.</h2>
          <p className="m-sub">Zet modules aan of uit en zie direct je prijs per maand. De eerste {TRIAL_DAYS} dagen zijn gratis.</p>
        </div>
        <PlanBuilder />
        <p className="m-plan-more"><a href="#/app/dfy">Liever dat wij alles doen? Bekijk Done for you <ArrowRight size={14} /></a></p>
      </section>

      <section className="m-section lfaq" id="faq">
        <div className="m-section-head">
          <span className="m-kicker">FAQ</span>
          <h2 className="m-h2">Heb je nog vragen?</h2>
        </div>
        <div className="lfaq-list">
          {[
            ['Kan ik nog steeds mijn account gebruiken?', 'Ja. Je blijft je account gewoon zelf gebruiken: posten, reageren en DM’s sturen. Promoview werkt daarnaast.'],
            ['Moet ik mijn accountgegevens delen?', 'Nee. Je koppelt je account via de officiële Instagram-login en geeft daar zelf toestemming. Wij zien en bewaren je wachtwoord nooit.'],
            ['Wat voor volgers krijg ik?', 'Mensen die passen bij jouw doelgroep: jij kiest onderwerpen, regio’s en voorbeeldaccounts. Je kunt je ook richten op lokale volgers in Nederland en België.'],
            ['Hoe vaak moet ik posten?', 'Dat bepaal je zelf. Regelmatig posten helpt, en in de Planner kun je je content vooruit klaarzetten.'],
            ['Stuurt AI berichten zonder mij?', 'Alleen als jij daarvoor kiest. Standaard keur je elke reactie zelf goed, en klachten of vragen om een persoon komen altijd bij jou.'],
            [`Hoe werkt de proefperiode van ${TRIAL_DAYS} dagen?`, `Je gebruikt alle gekozen modules ${TRIAL_DAYS} dagen gratis. Pas daarna volgt de eerste betaling. Zeg je binnen die ${TRIAL_DAYS} dagen op, dan betaal je niets.`],
            ['Kan ik opzeggen?', 'Ja, zelf in je account onder Billing. Je houdt toegang tot het einde van de betaalde periode.'],
          ].map(([q, a]) => (
            <details key={q} className="lfaq-item"><summary>{q}</summary><p>{a}</p></details>
          ))}
        </div>
      </section>

      <section className="m-section">
        <div className="m-final-band">
          <MagnetArt className="m-final-magnet" size={220} rotate={-20} />
          <h2 className="m-hero-title sm">Wil jij ook zulke resultaten?</h2>
          <p>Probeer het {TRIAL_DAYS} dagen gratis. Binnen 24 uur live.</p>
          <div className="m-ctas">
            <a className="btn btn-white btn-lg" href="#/onboarding" data-cta="final-start">Start gratis proefperiode <ArrowRight size={18} /></a>
            <a className="btn btn-outline-white btn-lg" href="#/app/overview" data-cta="final-demo">Bekijk de demo</a>
          </div>
        </div>
      </section>

      <div className="m-sticky-cta" role="complementary" aria-label="Begin direct">
        <span><strong>Promoview</strong> · {TRIAL_DAYS} dagen gratis</span>
        <a className="btn btn-primary" href="#/onboarding" data-cta="sticky-start">Probeer gratis</a>
      </div>
    </main>
  );
}
