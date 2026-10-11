import { idbGet, idbSet } from "./storage";
import { normalizeAudioLang } from "./i18n";

export interface Channel {
  id: string;
  name: string;
  tv: boolean;
  provider: string;
  ca: boolean;
  langs: string[];
  /** Bitmask of satellite indices (bit i = satellite i) — O(1) filtering on TVs. */
  satMask: number;
  freq: string;
  pol: string;
  sr: string;
  /** epgshare01 country file that carries this channel's guide (resolved at catalog build). */
  zone?: string;
  /** Pre-lowercased name for fast search */
  key: string;
}

type Row = [string, string, number, string, number, string[], number[], string, string, string, string?];
const CACHE_KEY = "catalog:v6-footprint";

function fromRows(rows: Row[]): Channel[] {
  return rows.map(([id, name, tv, provider, ca, langs, sats, freq, pol, sr, zone]) => ({
    id, name, tv: !!tv, provider, ca: !!ca,
    langs: [...new Set(langs.map(normalizeAudioLang).filter((x): x is string => !!x))],
    satMask: sats.reduce((m, i) => m | (1 << i), 0),
    freq, pol, sr, key: name.toLowerCase(), ...(zone ? { zone } : {}),
  }));
}

export async function loadCatalog(): Promise<Channel[]> {
  const cached = await idbGet<Row[]>(CACHE_KEY);
  if (cached?.length) return fromRows(cached);
  const res = await fetch("/data/catalog.json");
  const json = (await res.json()) as { c: Row[] };
  await idbSet(CACHE_KEY, json.c);
  return fromRows(json.c);
}

/** Parses a full CHMAX / MetaMango JSON export and replaces the cached catalog. */
export async function importChmax(text: string): Promise<Channel[]> {
  const d = JSON.parse(text) as {
    channels: Array<{
      id?: string; SID?: string; Name?: string; TVType?: string; Provider?: string; CA?: number;
      Audio?: Array<{ Lang?: string }>;
      receptions?: Array<{ satelliteIndex: number; frequency?: string; polarization?: string; symbolRate?: string }>;
    }>;
  };
  const rows: Row[] = d.channels.filter((c) => c.TVType === "TV").map((c, i) => {
    const r = c.receptions?.[0];
    return [
      c.id ?? `ch_${i}`, (c.Name ?? "?").trim(), 1, (c.Provider ?? "").trim(), c.CA ? 1 : 0,
      [...new Set((c.Audio ?? []).map((a) => (a.Lang ?? "").toLowerCase().slice(0, 3)).filter(Boolean))],
      [...new Set((c.receptions ?? []).map((x) => x.satelliteIndex))],
      r?.frequency ?? "", r?.polarization ?? "", r?.symbolRate ?? "",
    ];
  });
  await idbSet(CACHE_KEY, rows);
  return fromRows(rows);
}

export interface Filter {
  satellites: number[];
  tv: boolean | null;
  lang: string | null;
  freeOnly: boolean;
  query: string;
}

export function filterChannels(list: Channel[], f: Filter): Channel[] {
  const mask = f.satellites.reduce((m, i) => m | (1 << i), 0);
  const q = f.query.trim().toLowerCase();
  return list.filter(
    (c) =>
      (c.satMask & mask) !== 0 &&
      (f.tv === null || c.tv === f.tv) &&
      (!f.freeOnly || !c.ca) &&
      (!f.lang || c.langs.includes(f.lang)) &&
      (!q || c.key.includes(q)),
  );
}
