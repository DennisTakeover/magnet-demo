import { STRINGS, UI_LANGUAGES, type UiLanguage } from './strings';

export interface LocaleSettings {
  language: string; // BCP 47 base language, e.g. "nl"
  currency: string; // ISO 4217, e.g. "EUR"
  country: string; // ISO 3166-1 alpha-2, e.g. "NL"
  auto: boolean; // follow detection instead of a manual choice
}

/** Default currency and language per country (subset; unknown countries fall back to USD/English). */
export const COUNTRIES: Record<string, { currency: string; language: string }> = {
  US: { currency: 'USD', language: 'en' }, GB: { currency: 'GBP', language: 'en' }, IE: { currency: 'EUR', language: 'en' },
  NL: { currency: 'EUR', language: 'nl' }, BE: { currency: 'EUR', language: 'nl' }, DE: { currency: 'EUR', language: 'de' },
  AT: { currency: 'EUR', language: 'de' }, CH: { currency: 'CHF', language: 'de' }, FR: { currency: 'EUR', language: 'fr' },
  LU: { currency: 'EUR', language: 'fr' }, ES: { currency: 'EUR', language: 'es' }, PT: { currency: 'EUR', language: 'pt' },
  IT: { currency: 'EUR', language: 'it' }, DK: { currency: 'DKK', language: 'da' }, SE: { currency: 'SEK', language: 'sv' },
  NO: { currency: 'NOK', language: 'nb' }, FI: { currency: 'EUR', language: 'fi' }, PL: { currency: 'PLN', language: 'pl' },
  CZ: { currency: 'CZK', language: 'cs' }, HU: { currency: 'HUF', language: 'hu' }, RO: { currency: 'RON', language: 'ro' },
  GR: { currency: 'EUR', language: 'el' }, TR: { currency: 'TRY', language: 'tr' }, UA: { currency: 'UAH', language: 'uk' },
  AE: { currency: 'AED', language: 'ar' }, SA: { currency: 'SAR', language: 'ar' }, IL: { currency: 'ILS', language: 'he' },
  EG: { currency: 'EGP', language: 'ar' }, MA: { currency: 'MAD', language: 'ar' }, ZA: { currency: 'ZAR', language: 'en' },
  NG: { currency: 'NGN', language: 'en' }, KE: { currency: 'KES', language: 'en' }, IN: { currency: 'INR', language: 'hi' },
  PK: { currency: 'PKR', language: 'ur' }, ID: { currency: 'IDR', language: 'id' }, MY: { currency: 'MYR', language: 'ms' },
  SG: { currency: 'SGD', language: 'en' }, TH: { currency: 'THB', language: 'th' }, VN: { currency: 'VND', language: 'vi' },
  PH: { currency: 'PHP', language: 'en' }, JP: { currency: 'JPY', language: 'ja' }, KR: { currency: 'KRW', language: 'ko' },
  CN: { currency: 'CNY', language: 'zh' }, HK: { currency: 'HKD', language: 'zh' }, TW: { currency: 'TWD', language: 'zh' },
  AU: { currency: 'AUD', language: 'en' }, NZ: { currency: 'NZD', language: 'en' }, CA: { currency: 'CAD', language: 'en' },
  MX: { currency: 'MXN', language: 'es' }, BR: { currency: 'BRL', language: 'pt' }, AR: { currency: 'ARS', language: 'es' },
  CL: { currency: 'CLP', language: 'es' }, CO: { currency: 'COP', language: 'es' }, PE: { currency: 'PEN', language: 'es' },
};

/** Sample exchange rates per 1 USD, for the demo only. Production would use a live rates feed or set prices per currency. */
export const USD_RATES: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.78, CHF: 0.88, DKK: 6.9, SEK: 10.6, NOK: 10.8, PLN: 3.95, CZK: 23, HUF: 365, RON: 4.6,
  TRY: 34, UAH: 41, AED: 3.67, SAR: 3.75, ILS: 3.7, EGP: 49, MAD: 9.9, ZAR: 18, NGN: 1600, KES: 129, INR: 84, PKR: 278,
  IDR: 15800, MYR: 4.4, SGD: 1.33, THB: 34, VND: 25300, PHP: 58, JPY: 150, KRW: 1380, CNY: 7.2, HKD: 7.8, TWD: 32,
  AUD: 1.52, NZD: 1.66, CAD: 1.37, MXN: 19.5, BRL: 5.6, ARS: 980, CLP: 940, COP: 4300, PEN: 3.75,
};

/** Languages offered in the picker. Languages without a UI translation keep an English interface. */
export const ALL_LANGUAGES = [
  'en', 'nl', 'de', 'fr', 'es', 'pt', 'it', 'da', 'sv', 'nb', 'fi', 'pl', 'cs', 'hu', 'ro', 'el', 'tr', 'uk', 'ru',
  'ar', 'he', 'fa', 'hi', 'ur', 'bn', 'id', 'ms', 'th', 'vi', 'tl', 'ja', 'ko', 'zh', 'sw',
];

const TZ_COUNTRY: Record<string, string> = {
  'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Berlin': 'DE', 'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH',
  'Europe/Paris': 'FR', 'Europe/Luxembourg': 'LU', 'Europe/Madrid': 'ES', 'Europe/Lisbon': 'PT', 'Europe/Rome': 'IT',
  'Europe/London': 'GB', 'Europe/Dublin': 'IE', 'Europe/Copenhagen': 'DK', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
  'Europe/Helsinki': 'FI', 'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO',
  'Europe/Athens': 'GR', 'Europe/Istanbul': 'TR', 'Europe/Kyiv': 'UA', 'Europe/Kiev': 'UA', 'Asia/Dubai': 'AE',
  'Asia/Riyadh': 'SA', 'Asia/Jerusalem': 'IL', 'Africa/Cairo': 'EG', 'Africa/Casablanca': 'MA', 'Africa/Johannesburg': 'ZA',
  'Africa/Lagos': 'NG', 'Africa/Nairobi': 'KE', 'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Karachi': 'PK',
  'Asia/Jakarta': 'ID', 'Asia/Kuala_Lumpur': 'MY', 'Asia/Singapore': 'SG', 'Asia/Bangkok': 'TH', 'Asia/Ho_Chi_Minh': 'VN',
  'Asia/Manila': 'PH', 'Asia/Tokyo': 'JP', 'Asia/Seoul': 'KR', 'Asia/Shanghai': 'CN', 'Asia/Hong_Kong': 'HK', 'Asia/Taipei': 'TW',
  'Australia/Sydney': 'AU', 'Australia/Melbourne': 'AU', 'Australia/Brisbane': 'AU', 'Australia/Perth': 'AU', 'Pacific/Auckland': 'NZ',
  'America/Toronto': 'CA', 'America/Vancouver': 'CA', 'America/Mexico_City': 'MX', 'America/Sao_Paulo': 'BR',
  'America/Argentina/Buenos_Aires': 'AR', 'America/Santiago': 'CL', 'America/Bogota': 'CO', 'America/Lima': 'PE',
};

export function localeForCountry(country: string, auto = true): LocaleSettings {
  const c = COUNTRIES[country] ?? { currency: 'USD', language: 'en' };
  return { country, currency: c.currency, language: c.language, auto };
}

/**
 * Best guess of the visitor's country, language and currency.
 * In this demo it uses the browser (language region, then time zone) because a static page can't look up an IP address.
 * In production the server sets the country from the request IP (e.g. a CDN country header) and passes it in.
 */
export function detectLocale(): LocaleSettings {
  let country = '';
  let language = 'en';
  try {
    const langs = navigator.languages?.length ? navigator.languages : [navigator.language];
    language = (langs[0] ?? 'en').split('-')[0].toLowerCase();
    const withRegion = langs.find((l) => /-[A-Za-z]{2}$/.test(l));
    if (withRegion) country = withRegion.slice(-2).toUpperCase();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (TZ_COUNTRY[tz]) country = TZ_COUNTRY[tz];
    else if (!country && tz?.startsWith('America/')) country = 'US';
  } catch {
    /* fall through to defaults */
  }
  if (!COUNTRIES[country]) country = 'US';
  return { country, language: language || COUNTRIES[country].language, currency: COUNTRIES[country].currency, auto: true };
}

/* ---------- Active locale (set by App on every render) ---------- */

let active: LocaleSettings = { language: 'en', currency: 'USD', country: 'US', auto: true };

export function setActiveLocale(l: LocaleSettings) {
  active = l;
  try {
    document.documentElement.lang = l.language;
  } catch {
    /* no document in tests */
  }
}

export function activeLocale(): LocaleSettings {
  return active;
}

export function isTranslated(language: string): language is UiLanguage {
  return (UI_LANGUAGES as readonly string[]).includes(language);
}

/** Locale tag for Intl formatting, e.g. "pt-BR". */
export function localeTag(l: LocaleSettings = active): string {
  try {
    return Intl.getCanonicalLocales(`${l.language}-${l.country}`)[0];
  } catch {
    return 'en-US';
  }
}

/** Translate a UI string; untranslated languages fall back to English. */
export function t(key: string, vars?: Record<string, string | number>): string {
  const row = STRINGS[key];
  if (!row) return key;
  const idx = isTranslated(active.language) ? UI_LANGUAGES.indexOf(active.language) : 0;
  let s = row[idx] ?? row[0];
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}

/** Round converted prices to 3 significant digits so they read like real price points. */
function niceRound(v: number) {
  if (v === 0) return 0;
  const mag = 10 ** (Math.floor(Math.log10(Math.abs(v))) - 2);
  return Math.round(v / mag) * mag;
}

/** Format a USD amount in the active currency. */
export function money(usd: number, l: LocaleSettings = active): string {
  const rate = USD_RATES[l.currency] ?? 1;
  const value = l.currency === 'USD' ? usd : niceRound(usd * rate);
  try {
    return new Intl.NumberFormat(localeTag(l), { style: 'currency', currency: l.currency, maximumFractionDigits: 0 }).format(value);
  } catch {
    return `${l.currency} ${Math.round(value)}`;
  }
}

export function displayName(type: 'language' | 'currency' | 'region', code: string, inLanguage = active.language): string {
  try {
    return new Intl.DisplayNames([inLanguage, 'en'], { type }).of(code) ?? code;
  } catch {
    return code;
  }
}
