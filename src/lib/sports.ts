/** Multilingual match detection + cross-channel grouping for the Sport tab. */
const PREFIX = /^\s*(?:live|en direct|direct|directo|en vivo|ao vivo|live:|canlı|مباشر|بث مباشر|القمة)\s*[:\-–|]?\s*/i;
const SEP = /\s+(?:vs\.?|v\.?|versus|contre|gegen|contra|x|×|-|–|—|ضد|أمام|مع)\s+/i;
const REPLAY = /\b(?:rediff\w*|replay|resume|highlights?|best of|magazine|repeticion|resumen|melhores momentos|tekrar|ozet|wiederholung|zusammenfassung|resumo|preview|avant-match|pre-?game|studio|sezon|season|jornada|journee|analyse|talk|debrief|ozeti)\b|إعادة|ملخص/i;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, "").replace(/\b(fc|cf|sc|ac|afc|cd|club)\b/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ").trim();

export interface MatchInfo { home: string; away: string }

/** Returns the two teams if the title looks like a live match (not a replay/recap). */
export function parseMatch(title: string): MatchInfo | null {
  if (isReplay(title)) return null;
  const t = title.replace(PREFIX, "").split(/\s*[|:]\s*(?=[^|:]*$)/)[0]!; // drop trailing ": Ligue 1" etc. only if after teams
  const parts = (SEP.test(t) ? t : title.replace(PREFIX, "")).split(SEP);
  if (parts.length !== 2) return null;
  const [home, away] = parts.map((p) => norm(p.replace(/^.*[:|]\s*/, "")));
  if (!home || !away || home.length > 40 || away.length > 40) return null;
  return { home, away };
}

export const isReplay = (title: string) => REPLAY.test(title) || REPLAY.test(title.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

/** Grouping key: same match on different channels (order-insensitive, ±30 min tolerance via hour bucket). */
export function eventKey(title: string, start: number): string {
  const m = parseMatch(title);
  const bucket = Math.round(start / 3_600_000);
  if (m) return `m:${[m.home, m.away].sort().join("|")}|${bucket}`;
  return `t:${norm(title.replace(PREFIX, ""))}|${Math.round(start / 900_000)}`;
}
