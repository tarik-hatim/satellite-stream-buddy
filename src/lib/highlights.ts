/** Official highlight finder: reads the public YouTube RSS feeds of official league/broadcaster channels
 * (no API key, no quota) and scores each video against a finished match. Browser-safe. */
export const OFFICIAL_CHANNELS: Record<string, string> = {
  UCTv_XvfzLX3i4IGWAm4sbmA: "LaLiga",
  UCG5qGWdu8nIRZqJ_GgDwQ_w: "Premier League",
  UCBJeMCIeLQos7wacox4hmLQ: "Serie A",
  UC6UL29enLNe4mqwTfAyeNuw: "Bundesliga",
  UCyGa1YEx9ST66rYrJTGIKOw: "UEFA",
  UCJUCcJUeh0Cz2xyKwkw5Q1w: "beIN SPORTS",
  UCfj4kQ6_mYO5r4hzX5KloVw: "beIN SPORTS France",
  UC_ZMGMdEVWKGWhwMaWKP4Xg: "FRMF",
  UCshfmlozZdHI8cHajMkCLyA: "CAF",
  UCfYNqluOf8EbQkL44otydMw: "TRT Spor",
  UC6c1z7bA__85CIWZ_jpCK_Q: "ESPN FC",
  UCZ7wY7MRDSygp63HIEfdQZA: "Sky Sports Football",
};
// Real ids contain "-" — stored with "_" above only where they differ is error-prone, so keep exact ids here:
export const CHANNEL_IDS = [
  "UCTv-XvfzLX3i4IGWAm4sbmA", "UCG5qGWdu8nIRZqJ_GgDwQ-w", "UCBJeMCIeLQos7wacox4hmLQ", "UC6UL29enLNe4mqwTfAyeNuw",
  "UCyGa1YEx9ST66rYrJTGIKOw", "UCJUCcJUeh0Cz2xyKwkw5Q1w", "UCfj4kQ6_mYO5r4hzX5KloVw", "UC_ZMGMdEVWKGWhwMaWKP4Xg",
  "UCshfmlozZdHI8cHajMkCLyA", "UCfYNqluOf8EbQkL44otydMw", "UC6c1z7bA__85CIWZ_jpCK-Q", "UCZ7wY7MRDSygp63HIEfdQZA",
];

export interface Video { id: string; title: string; channel: string; published: number; thumb?: string }

const HL = /highlight|resume|resumen|resumo|melhores|ozet|ملخص|اهداف|أهداف|goals?|buts|goles|golleri|extended|all goals/i;
const STOP = new Set(["the", "and", "les", "fc", "cf", "sc", "ac", "afc", "club", "de", "del", "la", "le", "real", "united", "city", "sport", "sporting"]);
const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[إأآ]/g, "ا").replace(/ة/g, "ه");
const tokens = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOP.has(w));

/** Share of a team's significant words (or 5-letter prefixes) found in the video title. */
function teamHit(team: string, title: string[]): number {
  const t = tokens(team);
  if (!t.length) return 0;
  const hit = t.filter((w) => title.some((x) => x === w || (w.length >= 5 && x.startsWith(w.slice(0, 5))))).length;
  return hit / t.length;
}

/** Best official video for a match, or null. Requires both teams + a publish time after kick-off. */
export function findHighlight(home: string, away: string, start: number, videos: Video[]): Video | null {
  let best: Video | null = null, bestScore = 0;
  for (const v of videos) {
    if (v.published < start || v.published > start + 4 * 86_400_000) continue;
    const words = tokens(v.title);
    const h = teamHit(home, words), a = teamHit(away, words);
    if (h < 0.5 || a < 0.5) continue;
    const score = h + a + (HL.test(fold(v.title)) ? 1 : 0) - (v.published - start) / (7 * 86_400_000);
    if (score > bestScore) { bestScore = score; best = v; }
  }
  return best;
}

let memo: { at: number; p: Promise<Video[]> } | null = null;
/** All official feeds in one cached request (30 min). */
export function loadOfficialVideos(): Promise<Video[]> {
  if (memo && Date.now() - memo.at < 30 * 60_000) return memo.p;
  const p = fetch("/api/public/yt").then((r) => (r.ok ? (r.json() as Promise<Video[]>) : [])).catch(() => []);
  memo = { at: Date.now(), p };
  return p;
}
