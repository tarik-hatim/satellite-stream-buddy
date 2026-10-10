import { SATELLITES } from "./satellites";
import { isSupportedLang, type Lang } from "./i18n";

export type Region = "MENA" | "LATAM" | "EUROPE" | "TURKEY" | "UNKNOWN";

const MENA = new Set("MA DZ TN LY EG SD MR EH SA AE QA KW BH OM YE IQ SY JO LB PS IL IR".split(" "));
const LATAM = new Set("MX GT HN SV NI CR PA CU DO PR CO VE EC PE BO CL AR UY PY BR".split(" "));
const EUROPE = new Set("FR DE AT CH BE NL LU GB IE IT ES PT PL CZ SK HU RO BG GR DK SE NO FI".split(" "));

const MENA_TZ = /^(Africa\/(Casablanca|Algiers|Tunis|Tripoli|Cairo|Khartoum|Nouakchott|El_Aaiun)|Asia\/(Riyadh|Dubai|Qatar|Kuwait|Bahrain|Muscat|Aden|Baghdad|Damascus|Amman|Beirut|Gaza|Hebron|Tehran))$/;
const LATAM_TZ = /^America\/(?!New_York|Chicago|Denver|Los_Angeles|Phoenix|Anchorage|Toronto|Vancouver|Edmonton|Winnipeg|Halifax|Detroit)/;

/** Region from locale country code first, then time zone. */
export function detectRegion(locale?: string, timeZone?: string): Region {
  const country = locale?.split(/[-_]/)[1]?.toUpperCase();
  if (country) {
    if (MENA.has(country)) return "MENA";
    if (LATAM.has(country)) return "LATAM";
    if (country === "TR") return "TURKEY";
    if (EUROPE.has(country)) return "EUROPE";
  }
  if (timeZone) {
    if (MENA_TZ.test(timeZone)) return "MENA";
    if (LATAM_TZ.test(timeZone)) return "LATAM";
    if (timeZone === "Europe/Istanbul") return "TURKEY";
    if (timeZone.startsWith("Europe/")) return "EUROPE";
  }
  return "UNKNOWN";
}

export const PRESETS = {
  MENA: [11, 1, 2, 0, 3],
  LATAM: [8, 6, 12, 10],
  EUROPE: [0, 2, 5, 8],
  TURKEY: [7, 2],
  FALLBACK: [2, 0],
} as const;

const AMERICAS_UNAVAILABLE = new Set(
  SATELLITES.filter((s) => !s.coverage.some((c) => c === "LATAM" || c === "NA")).map((s) => s.index),
);

export interface InitialSetup {
  lang: Lang;
  satellites: number[];
  region: Region;
}

/**
 * First-launch auto-selection. Region (country/time zone) wins over language
 * so a French speaker in Morocco gets the MENA bouquet, and a Spanish speaker
 * in Spain gets the European one.
 */
export function initialSetup(locale?: string, timeZone?: string): InitialSetup {
  const base = locale?.toLowerCase().split(/[-_]/)[0] ?? "";
  const region = detectRegion(locale, timeZone);
  const lang: Lang = isSupportedLang(base) ? base : "en";

  let sats: readonly number[];
  if (region === "MENA" || (region === "UNKNOWN" && base === "ar")) sats = PRESETS.MENA;
  else if (region === "LATAM" || (region === "UNKNOWN" && (base === "es" || base === "pt"))) sats = PRESETS.LATAM;
  else if (region === "TURKEY" || (region === "UNKNOWN" && base === "tr")) sats = PRESETS.TURKEY;
  else if (region === "EUROPE" || ["fr", "de", "en", "it", "es", "pt"].includes(base)) sats = PRESETS.EUROPE;
  else sats = PRESETS.FALLBACK;

  let satellites = [...sats];
  if (sats === PRESETS.LATAM) satellites = satellites.filter((i) => !AMERICAS_UNAVAILABLE.has(i));

  return { lang, satellites, region };
}
