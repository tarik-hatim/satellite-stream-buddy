import { idbGet, idbSet } from "./storage";
import type { Region } from "./region";

export interface Programme { start: number; stop: number; title: string; desc?: string; cat?: string }
export interface EpgChannel { z: string; p: Programme[] }
/** key = normalised channel name */
export type EpgIndex = Record<string, EpgChannel>;

/** epgshare01 zones (country / network files). */
export const ZONES: Record<string, { label: string; flag: string }> = {
  SA1: { label: "Saudi Arabia", flag: "🇸🇦" }, AE1: { label: "UAE", flag: "🇦🇪" }, EG1: { label: "Egypt", flag: "🇪🇬" },
  BEIN1: { label: "beIN", flag: "⚽" }, ALJAZEERA1: { label: "Al Jazeera", flag: "📰" },
  FR1: { label: "France", flag: "🇫🇷" }, UK1: { label: "United Kingdom", flag: "🇬🇧" }, DE1: { label: "Germany", flag: "🇩🇪" },
  IT1: { label: "Italy", flag: "🇮🇹" }, ES1: { label: "Spain", flag: "🇪🇸" }, PT1: { label: "Portugal", flag: "🇵🇹" },
  NL1: { label: "Netherlands", flag: "🇳🇱" }, PL1: { label: "Poland", flag: "🇵🇱" }, TR1: { label: "Türkiye", flag: "🇹🇷" },
  BR1: { label: "Brazil", flag: "🇧🇷" }, MX1: { label: "Mexico", flag: "🇲🇽" }, AR1: { label: "Argentina", flag: "🇦🇷" },
  CO1: { label: "Colombia", flag: "🇨🇴" }, US2: { label: "USA", flag: "🇺🇸" },
};

export const DEFAULT_ZONES: Record<Region, string[]> = {
  MENA: ["SA1", "BEIN1", "FR1"],
  LATAM: ["BR1", "MX1", "ES1"],
  EUROPE: ["FR1", "UK1", "DE1"],
  TURKEY: ["TR1"],
  UNKNOWN: ["UK1", "FR1"],
};
const TTL = 6 * 3600_000;
const DAY = 86_400_000;

export const normName = (s: string) =>
  s.toLowerCase().replace(/\b(hd|fhd|uhd|sd|4k|tv|\.[a-z]{2})\b/g, "").replace(/[^\p{L}\p{N}]+/gu, "");

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
  const idToName = new Map<string, string>();
  for (const m of xml.matchAll(/<channel id="([^"]+)"[^>]*>\s*<display-name[^>]*>([^<]+)</g)) {
    const n = normName(unesc(m[2]!));
    if (n && (!wanted || wanted.has(n))) idToName.set(m[1]!, n);
  }
  const from = new Date().setHours(0, 0, 0, 0) - DAY, to = from + 8 * DAY;
  const out: EpgIndex = {};
  for (const m of xml.matchAll(/<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)"[^>]*>([\s\S]*?)<\/programme>/g)) {
    const n = idToName.get(m[3]!);
    if (!n) continue;
    const start = parseTime(m[1]!), stop = parseTime(m[2]!);
    if (stop < from || start > to) continue;
    const body = m[4]!;
    const title = body.match(/<title[^>]*>([^<]*)</)?.[1];
    if (!title) continue;
    const desc = body.match(/<desc[^>]*>([^<]*)</)?.[1];
    const cat = body.match(/<category[^>]*>([^<]*)</)?.[1];
    (out[n] ??= { z: zone, p: [] }).p.push({
      start, stop, title: unesc(title),
      ...(desc ? { desc: unesc(desc).slice(0, 400) } : {}),
      ...(cat ? { cat: unesc(cat) } : {}),
    });
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
  const cached = await idbGet<{ at: number; data: EpgIndex }>(key);
  if (!force && cached && Date.now() - cached.at < TTL) return cached.data;
  const data = parseXmltv(await fetchZone(zone), zone, wanted);
  await idbSet(key, { at: Date.now(), data });
  return data;
}

export async function cachedZones(zones: string[]): Promise<EpgIndex> {
  const out: EpgIndex = {};
  for (const z of zones) {
    const c = await idbGet<{ data: EpgIndex }>(`epgz:${z}`);
    if (c) for (const k in c.data) out[k] ??= c.data[k]!;
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
