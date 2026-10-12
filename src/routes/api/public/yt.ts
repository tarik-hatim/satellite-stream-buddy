import { createFileRoute } from "@tanstack/react-router";
import { CHANNEL_IDS, type Video } from "@/lib/highlights";

const unesc = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");

async function feed(id: string): Promise<Video[]> {
  try {
    const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${id}`, { headers: { "user-agent": "Mozilla/5.0 PulseEPG" } });
    if (!r.ok) return [];
    const xml = await r.text();
    const channel = unesc(xml.match(/<title>([^<]*)<\/title>/)?.[1] ?? "");
    return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
      const e = m[1]!;
      return {
        id: e.match(/<yt:videoId>([^<]+)</)?.[1] ?? "",
        title: unesc(e.match(/<title>([^<]*)</)?.[1] ?? ""),
        channel,
        published: Date.parse(e.match(/<published>([^<]+)</)?.[1] ?? "") || 0,
        thumb: e.match(/<media:thumbnail url="([^"]+)"/)?.[1],
      };
    }).filter((v) => /^[\w-]{11}$/.test(v.id));
  } catch { return []; }
}

/** Read-only relay: latest videos of a fixed allowlist of official channels (no user input reaches upstream). */
export const Route = createFileRoute("/api/public/yt")({
  server: {
    handlers: {
      GET: async () => {
        const all = (await Promise.all(CHANNEL_IDS.map(feed))).flat();
        return Response.json(all, { headers: { "cache-control": "public, max-age=1800" } });
      },
    },
  },
});
