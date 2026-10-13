import { createFileRoute } from "@tanstack/react-router";
import type { Video } from "@/lib/highlights";

const UNIT: Record<string, number> = { second: 1e3, minute: 6e4, hour: 36e5, day: 864e5, week: 6048e5, month: 2592e6, year: 31536e6 };
const SHORT: Record<string, string> = { s: "second", m: "minute", min: "minute", h: "hour", d: "day", w: "week", mo: "month", y: "year" };
const age = (t = "") => {
  const m = t.match(/(\d+)\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?|mo|min|[smhdwy])\b/i);
  if (!m) return 0;
  const u = m[2]!.toLowerCase(), unit = SHORT[u] ?? u.replace(/s$/, "");
  return +m[1]! * (UNIT[unit] ?? 0);
};
const dur = (t = "") => t.split(":").reduce((s, x) => s * 60 + Number(x), 0) || 0;
type Run = { text: string; navigationEndpoint?: { browseEndpoint?: { browseId?: string } } };
type VR = {
  videoId: string; title?: { runs?: Run[] }; ownerText?: { runs?: Run[] };
  ownerBadges?: { metadataBadgeRenderer?: { style?: string } }[];
  publishedTimeText?: { simpleText?: string }; lengthText?: { simpleText?: string };
};

function collect(o: unknown, out: VR[]) {
  if (Array.isArray(o)) { for (const x of o) collect(x, out); return; }
  if (o && typeof o === "object") {
    const r = (o as Record<string, unknown>)["videoRenderer"] as VR | undefined;
    if (r?.videoId) out.push(r);
    for (const v of Object.values(o)) collect(v, out);
  }
}

/** Searches YouTube (videos only) and returns compact results. Query is sanitised and length-capped. */
export const Route = createFileRoute("/api/public/yt")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const embed = new URL(request.url).searchParams.get("embed");
        if (embed) {
          if (!/^[\w-]{11}$/.test(embed)) return new Response("Bad id", { status: 400 });
          const o = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${embed}`);
          return Response.json({ ok: o.ok }, { headers: { "cache-control": "public, max-age=86400" } });
        }
        const q = (new URL(request.url).searchParams.get("q") ?? "").replace(/[^\p{L}\p{N}\s.'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, 100);
        if (q.length < 3) return new Response("Bad query", { status: 400 });
        const r = await fetch(`https://www.youtube.com/results?hl=en&gl=US&sp=EgIQAQ%253D%253D&search_query=${encodeURIComponent(q)}`, {
          headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "accept-language": "en-US,en" },
        });
        if (!r.ok) return new Response("Upstream error", { status: 502 });
        const html = await r.text();
        const m = html.match(/var ytInitialData = (\{.*?\});<\/script>/s);
        const raw: VR[] = [];
        if (m) { try { collect(JSON.parse(m[1]!), raw); } catch { /* layout change */ } }
        const seen = new Set<string>();
        const out: Video[] = raw.filter((v) => !seen.has(v.videoId) && seen.add(v.videoId)).map((v) => {
          const owner = v.ownerText?.runs?.[0];
          const pub = v.publishedTimeText?.simpleText ?? "";
          return {
            id: v.videoId,
            title: (v.title?.runs ?? []).map((x) => x.text).join(""),
            channel: owner?.text ?? "",
            channelId: owner?.navigationEndpoint?.browseEndpoint?.browseId ?? "",
            verified: (v.ownerBadges ?? []).some((b) => /VERIFIED/.test(b.metadataBadgeRenderer?.style ?? "")),
            ageMs: age(pub), dur: dur(v.lengthText?.simpleText), streamed: /stream/i.test(pub),
          };
        });
        return Response.json(out, { headers: { "cache-control": "public, max-age=3600" } });
      },
    },
  },
});
