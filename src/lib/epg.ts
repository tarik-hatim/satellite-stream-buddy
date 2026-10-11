import { idbGet, idbSet } from "./storage";
import type { Region } from "./region";

export interface Programme { start: number; stop: number; title: string; desc?: string; cat?: string; img?: string }
export interface EpgChannel { z: string; p: Programme[] }
/** key = normalised channel name, or "ZONE|name" for a bouquet-specific feed */
export type EpgIndex = Record<string, EpgChannel>;

/** epgshare01 zones (country / network files). */
export const ZONES: Record<string, { label: string; flag: string }> = {
  SA1: { label: "Saudi Arabia", flag: "🇸🇦" },
  SA2: { label: "Saudi Arabia 2", flag: "🇸🇦" },
  AE1: { label: "UAE", flag: "🇦🇪" },
  EG1: { label: "Egypt", flag: "🇪🇬" },
  IL1: { label: "Israel", flag: "🇮🇱" },
  BEIN1: { label: "beIN", flag: "⚽" },
  ALJAZEERA1: { label: "Al Jazeera", flag: "📰" },
  PK1: { label: "Pakistan", flag: "🇵🇰" },
  IN1: { label: "India", flag: "🇮🇳" },
  FR1: { label: "France", flag: "🇫🇷" },
  BE2: { label: "Belgium", flag: "🇧🇪" },
  CH1: { label: "Switzerland", flag: "🇨🇭" },
  LU1: { label: "Luxembourg", flag: "🇱🇺" },
  UK1: { label: "United Kingdom", flag: "🇬🇧" },
  IE1: { label: "Ireland", flag: "🇮🇪" },
  DE1: { label: "Germany", flag: "🇩🇪" },
  AT1: { label: "Austria", flag: "🇦🇹" },
  IT1: { label: "Italy", flag: "🇮🇹" },
  ES1: { label: "Spain", flag: "🇪🇸" },
  PT1: { label: "Portugal", flag: "🇵🇹" },
  NL1: { label: "Netherlands", flag: "🇳🇱" },
  PL1: { label: "Poland", flag: "🇵🇱" },
  CZ1: { label: "Czechia", flag: "🇨🇿" },
  SK1: { label: "Slovakia", flag: "🇸🇰" },
  HU1: { label: "Hungary", flag: "🇭🇺" },
  RO1: { label: "Romania", flag: "🇷🇴" },
  BG1: { label: "Bulgaria", flag: "🇧🇬" },
  GR1: { label: "Greece", flag: "🇬🇷" },
  CY1: { label: "Cyprus", flag: "🇨🇾" },
  HR1: { label: "Croatia", flag: "🇭🇷" },
  RS1: { label: "Serbia", flag: "🇷🇸" },
  BA1: { label: "Bosnia", flag: "🇧🇦" },
  AL1: { label: "Albania", flag: "🇦🇱" },
  UA1: { label: "Ukraine", flag: "🇺🇦" },
  KZ1: { label: "Kazakhstan", flag: "🇰🇿" },
  DK1: { label: "Denmark", flag: "🇩🇰" },
  SE1: { label: "Sweden", flag: "🇸🇪" },
  NO1: { label: "Norway", flag: "🇳🇴" },
  FI1: { label: "Finland", flag: "🇫🇮" },
  TR1: { label: "Türkiye", flag: "🇹🇷" },
  TR3: { label: "Türkiye 2", flag: "🇹🇷" },
  BR1: { label: "Brazil", flag: "🇧🇷" },
  BR2: { label: "Brazil 2", flag: "🇧🇷" },
  MX1: { label: "Mexico", flag: "🇲🇽" },
  AR1: { label: "Argentina", flag: "🇦🇷" },
  CO1: { label: "Colombia", flag: "🇨🇴" },
  CL1: { label: "Chile", flag: "🇨🇱" },
  PE1: { label: "Peru", flag: "🇵🇪" },
  UY1: { label: "Uruguay", flag: "🇺🇾" },
  EC1: { label: "Ecuador", flag: "🇪🇨" },
  US2: { label: "USA", flag: "🇺🇸" },
};

const MENA_Z = ["SA1", "SA2", "AE1", "EG1", "BEIN1", "ALJAZEERA1", "FR1", "UK1", "IT1", "ES1", "DE1", "TR1"];
const EU_Z = ["FR1", "BE2", "CH1", "LU1", "UK1", "IE1", "DE1", "AT1", "IT1", "ES1", "PT1", "NL1", "PL1", "CZ1", "SK1", "HU1", "RO1", "BG1", "GR1", "HR1", "RS1", "DK1", "SE1", "NO1", "FI1", "TR1", "SA1", "BEIN1"];
const LATAM_Z = ["BR1", "BR2", "MX1", "AR1", "CO1", "CL1", "PE1", "UY1", "EC1", "US2", "ES1", "PT1"];

/** Broad default: every country file whose channels are receivable on the region's satellites. */
export const DEFAULT_ZONES: Record<Region, string[]> = {
  MENA: MENA_Z,
  LATAM: LATAM_Z,
  EUROPE: EU_Z,
  TURKEY: ["TR1", "TR3", "DE1", "UK1", "FR1", "SA1", "AE1"],
  UNKNOWN: [...new Set([...EU_Z, ...MENA_Z])],
};
const TTL = 6 * 3600_000;
const DAY = 86_400_000;
const CACHE_VERSION = 3;

export function programmeImage(raw: string | undefined): string | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(unesc(raw));
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    if (url.protocol === "http:") url.protocol = "https:";
    return url.href;
  } catch { return undefined; }
}

export const normName = (s: string) =>
  s.toLowerCase().replace(/\.[a-z]{2,3}$/, "").replace(/\b(hd|fhd|uhd|sd|4k|8k|hevc|h265|tv|channel|television)\b/g, "").replace(/[^\p{L}\p{N}]+/gu, "");

const parseTime = (t: string) => {
  const m = t.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-])?(\d{2})?(\d{2})?/);
  if (!m) return 0;
  const off = m[7] ? (m[7] === "-" ? -1 : 1) * (Number(m[8]) * 60 + Number(m[9])) : 0;
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!) - off * 60_000;
};
const unesc = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#39;/g, "'");

/** Regex-scan XMLTV (lighter than DOMParser on TV browsers). Keeps yesterday → +7 days. */
export function parseXmltv(xml: string, zone: string, wanted?: Set<string>): EpgIndex {
  // A channel may carry several display-names; index it under every one the catalog uses.
  const idToNames = new Map<string, string[]>();
  for (const m of xml.matchAll(/<channel id="([^"]+)"[^>]*>([\s\S]*?)<\/channel>/g)) {
    const names = new Set<string>([normName(m[1]!.replace(/\.[a-z]{2,3}$/i, ""))]);
    for (const d of m[2]!.matchAll(/<display-name[^>]*>([^<]+)</g)) names.add(normName(unesc(d[1]!)));
    const keep = [...names].filter((n) => n && (!wanted || wanted.has(n)));
    if (keep.length) idToNames.set(m[1]!, keep);
  }
  const from = new Date().setHours(0, 0, 0, 0) - DAY, to = from + 8 * DAY;
  const out: EpgIndex = {};
  for (const m of xml.matchAll(/<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g)) {
    const ns = idToNames.get(m[3]!);
    if (!ns) continue;
    const start = parseTime(m[1]!), stop = parseTime(m[2]!);
    if (stop < from || start > to) continue;
    const body = m[4]!;
    const title = body.match(/<title[^>]*>([^<]*)</)?.[1];
    if (!title) continue;
    const desc = body.match(/<desc[^>]*>([^<]*)</)?.[1];
    const cat = body.match(/<category[^>]*>([^<]*)</)?.[1];
    const img = programmeImage(body.match(/<icon\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1]);
    const prog: Programme = {
      start, stop, title: unesc(title),
      ...(desc ? { desc: unesc(desc).slice(0, 400) } : {}),
      ...(cat ? { cat: unesc(cat) } : {}),
      ...(img ? { img } : {}),
    };
    for (const n of ns) (out[n] ??= { z: zone, p: [] }).p.push(prog);
  }
  for (const k in out) out[k]!.p.sort((a, b) => a.start - b.start);
  return out;
}

async function fetchZone(zone: string): Promise<string> {
  const res = await fetch(`/api/public/epg?file=epg_ripper_${zone}.xml.gz`);
  if (!res.ok) throw new Error(`EPG ${res.status}`);
  const buf = new Uint8Array(await res.arrayBuffer());
  const gz = buf[0] === 0x1f && buf[1] === 0x8b;
  if (!gz) return new TextDecoder().decode(buf);
  return new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).text();
}

export async function loadZone(zone: string, wanted: Set<string>, force = false): Promise<EpgIndex> {
  const key = `epgz:${zone}`;
  const cached = await idbGet<{ at: number; version?: number; data: EpgIndex }>(key);
  if (!force && cached?.version === CACHE_VERSION && Date.now() - cached.at < TTL) return cached.data;
  const data = parseXmltv(await fetchZone(zone), zone, wanted);
  await idbSet(key, { at: Date.now(), version: CACHE_VERSION, data });
  return data;
}

export async function cachedZones(zones: string[]): Promise<EpgIndex> {
  const out: EpgIndex = {};
  for (const z of zones) {
    const c = await idbGet<{ data: EpgIndex }>(`epgz:${z}`);
    if (c) for (const k in c.data) { out[`${z}|${k}`] = c.data[k]!; out[k] ??= c.data[k]!; }
  }
  return out;
}

export function nowNext(list: Programme[] | undefined, t = Date.now()) {
  if (!list) return { now: undefined, next: undefined };
  const i = list.findIndex((p) => p.start <= t && p.stop > t);
  return i >= 0 ? { now: list[i], next: list[i + 1] } : { now: undefined, next: list.find((p) => p.start > t) };
}

export const dayRange = (offset: number) => {
  const s = new Date().setHours(0, 0, 0, 0) + offset * DAY;
  return [s, s + DAY] as const;
};
export const inRange = (p: Programme, [a, b]: readonly [number, number]) => p.stop > a && p.start < b;
