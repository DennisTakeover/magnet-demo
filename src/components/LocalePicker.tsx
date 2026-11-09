import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Globe, X } from 'lucide-react';
import { useStore, useRoute } from '../store';
import { ALL_LANGUAGES, COUNTRIES, USD_RATES, detectLocale, displayName, isTranslated, localeForCountry, t } from '../i18n/locale';
import { UI_LANGUAGES } from '../i18n/strings';

const CURRENCIES = Object.keys(USD_RATES);

export default function LocalePicker() {
  const { state, update } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = useRoute();
  const loc = state.locale;
  const detected = detectLocale();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const setLanguage = (language: string) =>
    update((d) => {
      d.locale.language = language;
      d.locale.auto = false;
    });
  const setCurrency = (currency: string) =>
    update((d) => {
      d.locale.currency = currency;
      d.locale.auto = false;
    });
  const useDetected = () =>
    update((d) => {
      d.locale = { ...detected, auto: true };
    });

  const translated = UI_LANGUAGES.filter((l) => ALL_LANGUAGES.includes(l));
  const others = ALL_LANGUAGES.filter((l) => !isTranslated(l));
  const label = `${loc.language.toUpperCase()} · ${loc.currency}`;

  return (
    <div className="locale-picker" ref={ref}>
      <button className="locale-pill" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={t('loc.title')}>
        <Globe size={16} aria-hidden /> <span>{label}</span> <ChevronDown size={14} aria-hidden />
      </button>
      {open && (
        <div className="locale-panel" role="dialog" aria-label={t('loc.title')}>
          <div className="demo-panel-head">
            <strong>{t('loc.title')}</strong>
            <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
              <X size={16} />
            </button>
          </div>
          <p className="muted small">{t('loc.detected', { country: `${displayName('region', detected.country)} (${detected.country})` })}</p>

          <label className="field">
            <span className="field-label">{t('loc.language')}</span>
            <select value={loc.language} onChange={(e) => setLanguage(e.target.value)}>
              <optgroup label={t('loc.fullUi')}>
                {translated.map((l) => (
                  <option key={l} value={l}>{displayName('language', l)}</option>
                ))}
              </optgroup>
              <optgroup label={t('loc.otherUi')}>
                {others.map((l) => (
                  <option key={l} value={l}>{displayName('language', l)}</option>
                ))}
              </optgroup>
            </select>
          </label>
          {!isTranslated(loc.language) && <p className="field-hint">{t('loc.partial', { language: displayName('language', loc.language) })}</p>}

          <label className="field">
            <span className="field-label">{t('loc.currency')}</span>
            <select value={loc.currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>{c} · {displayName('currency', c)}</option>
              ))}
            </select>
          </label>

          <button className="btn btn-soft btn-block" disabled={loc.auto} onClick={useDetected}>
            {t('loc.useDetected')}
          </button>
          <p className="muted xsmall">{t('loc.note')} {t('loc.rates')}</p>
        </div>
      )}
    </div>
  );
}

export { COUNTRIES, localeForCountry };
