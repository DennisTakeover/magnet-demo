import { ArrowRight, Check, ChevronRight, Instagram, Lock, MessageCircle, Play, ShieldCheck, Target, Users, X } from 'lucide-react';
import MagnetArt from '../components/MagnetArt';
import { PlanBuilder, ProductMock, VideoSection, img } from './Entry';

const scrollTo = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

export const TRUSTPILOT_URL = 'https://nl.trustpilot.com/review/promo-view.io';

/** Real customer reviews, quoted verbatim from promo-view.io (collected there under "Trustpilot Reviews"). */
export const PV_REVIEWS: { name: string; text: string }[] = [
  { name: 'Afservices.io', text: 'Promoview is een totale game-changer voor mijn Instagram. Van 1200 naar 4500 volgers in 4 maanden. Mijn posts krijgen nu veel meer engagement als voorheen. Ook hebben wij er maandelijks veel leads en klanten uitgehaald.' },
  { name: 'Noviofit.pt', text: 'Voor mijn fitnessclub had ik meer publiek nodig. Door Promoview zijn we van 850 naar 3200 volgers gegaan in een tijdsbestek van 3 maanden. Ik heb hier tientallen nieuwe klanten uitgehaald. Zeker een aanrader.' },
  { name: 'lureparts.nl', text: 'Prima ervaring met Promoview. Was eerst wat sceptisch, maar het heeft nu wel echt toegevoegde waarde. In een maand tijd plusminus 700 volgers erbij. En geen bots, maar veel potentiele klanten, waarvan er een aantal reeds hebben besteld in mijn webshop. Communicatie met promoview is ook goed. Kortom tevreden.' },
  { name: 'Jordy.schilten', text: 'Mijn broer en ik geven bol.com cursussen en zochten naar nieuwe studenten. Op het begin was ik skeptisch, maar wat een wereld van verschil heeft Promoview weten te brengen. Meer dan 850 kwalitatieve volgers gestegen in 1,5 maand, en een een aantal nieuwe studenten.' },
  { name: 'Byroyalsinteriors', text: 'Het team heeft de beloften die ze vooraf hebben gedaan, nagekomen. De communicatie is helder en bij vragen krijg je binnen 24 uur een reactie. Daarnaast streven ze ernaar om elke maand te verbeteren en betrekken ze je bij dit proces. De maandelijkse groei is zichtbaar en dit is top!' },
  { name: 'Alleskidsindrenthe', text: 'Echt helemaal te gek!! Was eerst best wel sceptisch maar nu 3 weken onderweg en heel stabiel groeien per week de volgers. Geen gekke profielen met plaatjes van een poes of kip als profielfoto, echte volgers die matchen met het profiel wat we als volgers zouden willen. Complimenten voor het team van promoview en zeker een aanrader om de hulp van in te schakelen' },
  { name: 'Danielschotman', text: 'Betrouwbare partij, in 3 maanden tijd erg veel volgers bijgekregen waarvan sommige klant zijn geworden binnen mijn bedrijf! Zeker een aanrader!' },
  { name: 'Rachel_spier', text: 'Ik heb een maandje Promoview afgenomen. De samenwerking met Promoview heb ik als super goed ervaren. Kundigheid en expertise maakte onze samenwerking tot een succes. Mijn volgers gingen van 120 naar 402 na 1 maand.' },
  { name: 'N1gloves', text: 'Benaderd door de mannen van Promoview en ik kan niks anders zeggen dan dat ik het iedereen aanraad, hoge kwalitatieve volgers erbij gekregen die daardoor weer tot conversie leiden. Al met al, super tevreden over het werk van Promoview' },
];

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

export default function PromoviewHome() {
  return (
    <main className="m-home" lang="nl">
      <section className="m-hero">
        <span className="m-pill"><Check size={14} aria-hidden /> Sluit je aan bij 500+ bedrijven</span>
        <h1 className="m-hero-title">Groei je Instagram<br />met AI.</h1>
        <p className="m-hero-lead">Een volger is niks waard zolang het geen potentiële klant is.</p>
        <p className="m-hero-sub">Bereik de juiste mensen, beantwoord elke DM en maak van interesse klanten. Voor ondernemers in Nederland en België.</p>
        <div className="m-ctas">
          <a className="btn btn-primary btn-lg" href="#/onboarding" data-cta="hero-start">Begin direct</a>
          <a className="btn btn-secondary btn-lg" href="#vsl" onClick={scrollTo('vsl')} data-cta="hero-video"><Play size={16} fill="currentColor" /> Bekijk de demo</a>
        </div>
        <ul className="m-reassure" aria-label="Goed om te weten">
          <li><Check size={15} aria-hidden /> Binnen 24 uur live</li>
          <li><Lock size={15} aria-hidden /> Geen wachtwoord nodig</li>
          <li><Check size={15} aria-hidden /> Nederlands team</li>
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
              <strong className="pv-case-result">{c.result}</strong>
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
        <div className="m-ctas center-cta"><a className="btn btn-primary btn-lg" href="#/onboarding" data-cta="steps-start">Begin direct <ArrowRight size={18} /></a></div>
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

      <section className="m-section m-reviews" id="reviews">
        <div className="m-section-head">
          <span className="m-kicker">Reviews</span>
          <h2 className="m-h2">Wat klanten zeggen.</h2>
        </div>
        <div className="tp-summary">
          <span className="tp-brand"><TpStar lg /> Trustpilot</span>
          <a className="btn btn-secondary" href={TRUSTPILOT_URL} target="_blank" rel="noreferrer">Lees alle reviews op Trustpilot <ArrowRight size={16} /></a>
        </div>
        <div className="tp-grid">
          {PV_REVIEWS.map((r) => (
            <article key={r.name} className="tp-card">
              <p>{r.text}</p>
              <span className="tp-author"><span className="tp-avatar" aria-hidden>{r.name[0].toUpperCase()}</span> <span><b>{r.name}</b><small>Klant van Promoview</small></span></span>
            </article>
          ))}
        </div>
      </section>

      <section className="m-section" id="pricing-preview">
        <div className="m-section-head">
          <span className="m-kicker">Prijzen</span>
          <h2 className="m-h2">Stel je eigen abonnement samen.</h2>
          <p className="m-sub">Zet modules aan of uit en zie direct je prijs per maand. Altijd aan te passen.</p>
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
          <p>Kijk of wij een match zijn. Binnen 24 uur live.</p>
          <div className="m-ctas">
            <a className="btn btn-white btn-lg" href="#/onboarding" data-cta="final-start">Begin direct <ArrowRight size={18} /></a>
            <a className="btn btn-outline-white btn-lg" href="#/app/overview" data-cta="final-demo">Bekijk de demo</a>
          </div>
        </div>
      </section>

      <div className="m-sticky-cta" role="complementary" aria-label="Begin direct">
        <span><strong>promoview</strong> · binnen 24 uur live</span>
        <a className="btn btn-primary" href="#/onboarding" data-cta="sticky-start">Begin direct</a>
      </div>
    </main>
  );
}
