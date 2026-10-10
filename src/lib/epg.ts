import { idbGet, idbSet } from "./storage";
import type { Region } from "./region";

export interface Programme { start: number; stop: number; title: string }
export type EpgIndex = Record<string, Programme[]>; // key = normalised channel name

const BASE = "https://epgshare01.online/epgshare01/";
/** epgshare01 country files used per region. */
export const EPG_FILES: Record<Region, string[]> = {
  MENA: ["epg_ripper_AR1.xml.gz", "epg_ripper_FR1.xml.gz"],
  LATAM: ["epg_ripper_BR1.xml.gz", "epg_ripper_ES1.xml.gz"],
  EUROPE: ["epg_ripper_FR1.xml.gz", "epg_ripper_DE1.xml.gz", "epg_ripper_UK1.xml.gz"],
  TURKEY: ["epg_ripper_TR1.xml.gz"],
  UNKNOWN: ["epg_ripper_UK1.xml.gz"],
};
const TTL = 6 * 3600_000;

export const normName = (s: string) =>
  s.toLowerCase().replace(/\b(hd|fhd|uhd|sd|4k|tv)\b/g, "").replace(/[^\p{L}\p{N}]+/gu, "");

const parseTime = (t: string) => {
  const m = t.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
  if (!m) return 0;
  const off = m[7] ? (Number(m[7]!.slice(0, 3)) * 60 + Math.sign(Number(m[7])) * Number(m[7]!.slice(3))) : 0;
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!) - off * 60_000;
};
const unesc = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

/** Regex-scan XMLTV (much lighter than DOMParser on TV browsers). Keeps only the next 24h. */
export function parseXmltv(xml: string, wanted?: Set<string>): EpgIndex {
  const idToName = new Map<string, string>();
  for (const m of xml.matchAll(/<channel id="([^"]+)"[^>]*>\s*<display-name[^>]*>([^<]+)</g)) {
    const n = normName(unesc(m[2]!));
    if (!wanted || wanted.has(n)) idToName.set(m[1]!, n);
  }
  const now = Date.now(), horizon = now + 24 * 3600_000;
  const out: EpgIndex = {};
  for (const m of xml.matchAll(/<programme start="([^"]+)" stop="([^"]+)" channel="([^"]+)"[^>]*>[\s\S]*?<title[^>]*>([^<]*)</g)) {
    const n = idToName.get(m[3]!);
    if (!n) continue;
    const start = parseTime(m[1]!), stop = parseTime(m[2]!);
    if (stop < now || start > horizon) continue;
    (out[n] ??= []).push({ start, stop, title: unesc(m[4]!) });
  }
  for (const k in out) out[k]!.sort((a, b) => a.start - b.start);
  return out;
}

async function fetchFile(file: string): Promise<string> {
  const res = await fetch(BASE + file);
  if (!res.ok || !res.body) throw new Error(`EPG ${res.status}`);
  if (file.endsWith(".gz") && typeof DecompressionStream !== "undefined") {
    return new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text();
  }
  return res.text();
}

export async function loadEpg(region: Region, wanted: Set<string>, force = false): Promise<EpgIndex> {
  const key = `epg:${region}`;
  const cached = await idbGet<{ at: number; data: EpgIndex }>(key);
  if (!force && cached && Date.now() - cached.at < TTL) return cached.data;
  const data: EpgIndex = {};
  const results = await Promise.allSettled(EPG_FILES[region].map(fetchFile));
  let ok = false;
  for (const r of results) if (r.status === "fulfilled") { ok = true; Object.assign(data, parseXmltv(r.value, wanted)); }
  if (!ok) throw new Error("EPG unreachable");
  await idbSet(key, { at: Date.now(), data });
  return data;
}

export const cachedEpg = async (region: Region) => (await idbGet<{ at: number; data: EpgIndex }>(`epg:${region}`))?.data;

export function nowNext(list: Programme[] | undefined, t = Date.now()) {
  if (!list) return { now: undefined, next: undefined };
  const i = list.findIndex((p) => p.start <= t && p.stop > t);
  return i >= 0 ? { now: list[i], next: list[i + 1] } : { now: undefined, next: list.find((p) => p.start > t) };
}
