/** Official highlight finder (browser-safe scoring). The server relay searches YouTube for "home away";
 * here we keep only videos from official verified channels (league, federation, broadcaster or one of the
 * two clubs) whose title names both teams and whose age fits the match. */

/** Known official league channels — strongest signal. */
export const LEAGUE_CHANNEL_IDS = new Set([
  "UCTv-XvfzLX3i4IGWAm4sbmA", "UCG5qGWdu8nIRZqJ_GgDwQ-w", "UCBJeMCIeLQos7wacox4hmLQ", "UC6UL29enLNe4mqwTfAyeNuw",
  "UCyGa1YEx9ST66rYrJTGIKOw", "UCJUCcJUeh0Cz2xyKwkw5Q1w", "UCfj4kQ6_mYO5r4hzX5KloVw", "UC_ZMGMdEVWKGWhwMaWKP4Xg",
  "UCshfmlozZdHI8cHajMkCLyA", "UCfYNqluOf8EbQkL44otydMw", "UC6c1z7bA__85CIWZ_jpCK-Q", "UCZ7wY7MRDSygp63HIEfdQZA",
]);

/** Official competitions / federations / rights holders, recognised by channel name (all sports). */
const OFFICIAL = /laliga|premier league|serie a|bundesliga|ligue ?1|ligue de football|uefa|fifa|\bcaf\b|conmebol|concacaf|afc\b|eredivisie|liga portugal|s[uü]per lig|roshn|saudi pro|\bspl\b|botola|frmf|\bfrmf\b|egyptian|liga mx|brasileir|\bcbf\b|mls\b|j\.?league|scottish|belgian pro|jupiler|bein|dazn|espn|sky sports|tnt sports|canal\+|movistar|eurosport|ssc|ad sports|abu dhabi sports|trt spor|cbs sports|tudn|univision|globo|\bge\b|sportv|rai sport|mediaset|prime video sport|\bnba\b|euroleague|fiba|\bnfl\b|\bnhl\b|\bmlb\b|world rugby|six nations|top 14|\batp\b|\bwta\b|roland|wimbledon|formula 1|\bf1\b|motogp|\bufc\b|world athletics|uci|olympics/i;

export interface Video {
  id: string; title: string; channel: string; channelId: string;
  verified: boolean; ageMs: number; dur: number; streamed: boolean;
}

const HL = /highlight|resume|resumen|resumo|melhores|ozet|ملخص|اهداف|goals?|buts|goles|golleri|extended|zusammenfassung|sintesi|samenvatting|skrot|σταθμ|στιγμιοτυπα/i;
const NOT_HL = /press conference|conference de presse|rueda de prensa|conferencia|pressekonferenz|preview|live:|\blive\b|watchalong|reaction|interview|training|entrainement|podcast|مؤتمر/i;
const STOP = new Set(["the", "and", "les", "fc", "cf", "sc", "ac", "afc", "club", "de", "del", "la", "le", "real", "united", "city", "sport", "sporting", "deportivo", "atletico"]);
export const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[إأآ]/g, "ا").replace(/ة/g, "ه");
const tokens = (s: string) => fold(s).split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 3 && !STOP.has(w));

function teamHit(team: string, words: string[]): number {
  const t = tokens(team).length ? tokens(team) : fold(team).split(/\s+/).filter(Boolean);
  if (!t.length) return 0;
  const hit = t.filter((w) => words.some((x) => x === w || (w.length >= 5 && x.startsWith(w.slice(0, 5))) || (x.length >= 5 && w.startsWith(x.slice(0, 5))))).length;
  return hit / t.length;
}

/** Best official video for a match, or null. `now` = time of the search (video ages are relative). */
export function findHighlight(home: string, away: string, start: number, videos: Video[], now = Date.now()): Video | null {
  const sinceKickoff = now - start;
  const homeT = tokens(home), awayT = tokens(away);
  let best: Video | null = null, bestScore = 0;
  for (const v of videos) {
    if (!v.verified || v.streamed || NOT_HL.test(fold(v.title))) continue;
    // Guide airings are often delayed re-broadcasts: accept videos up to 5 days before the airing, reject older meetings.
    if (v.ageMs > sinceKickoff + 5 * 86_400_000) continue;
    if (v.dur && (v.dur < 45 || v.dur > 25 * 60)) continue; // shorts / full replays
    const words = tokens(v.title);
    const h = teamHit(home, words), a = teamHit(away, words);
    if (h < 0.5 || a < 0.5) continue;
    const ch = tokens(v.channel);
    const league = LEAGUE_CHANNEL_IDS.has(v.channelId);
    const official = league || OFFICIAL.test(v.channel);
    const club = [...homeT, ...awayT].some((w) => ch.includes(w));
    if (!official && !club) continue;
    const score = h + a + (league ? 3 : official ? 2 : 1.5) + (HL.test(fold(v.title)) ? 1 : 0) - v.ageMs / (7 * 86_400_000);
    if (score > bestScore) { bestScore = score; best = v; }
  }
  return best;
}

const memo = new Map<string, Promise<Video[]>>();
/** Server-side YouTube search (cached per query for the session). */
export function searchVideos(q: string): Promise<Video[]> {
  const key = fold(q).trim();
  if (!memo.has(key)) {
    memo.set(key, fetch(`/api/public/yt?q=${encodeURIComponent(key)}`).then((r) => (r.ok ? (r.json() as Promise<Video[]>) : [])).catch(() => []));
  }
  return memo.get(key)!;
}

export async function highlightFor(home: string, away: string, start: number): Promise<Video | null> {
  return findHighlight(home, away, start, await searchVideos(`${home} ${away}`));
}
