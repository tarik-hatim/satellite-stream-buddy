import { createFileRoute } from "@tanstack/react-router";

/** Allowed public XMLTV sources (none send CORS headers). Only these exact file shapes are relayed. */
function upstreamUrl(file: string): string | null {
  if (/^epg_ripper_[A-Z0-9_]+\.xml\.gz$/.test(file)) return `https://epgshare01.online/epgshare01/${file}`;
  let m = file.match(/^oe:([a-z]+[0-9])\.xml$/);
  if (m) return `https://www.open-epg.com/app/download.php?file=${m[1]}.xml`;
  m = file.match(/^pw:(epg_[A-Z]{2}\.xml\.gz)$/);
  if (m) return `https://epg.pw/xmltv/${m[1]}`;
  return null;
}

/** Read-only relay for public guide files. */
export const Route = createFileRoute("/api/public/epg")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = upstreamUrl(new URL(request.url).searchParams.get("file") ?? "");
        if (!url) return new Response("Bad file", { status: 400 });
        const upstream = await fetch(url, { redirect: "follow", headers: { "user-agent": "Mozilla/5.0 PulseEPG" } });
        if (!upstream.ok || !upstream.body) return new Response("Upstream error", { status: 502 });
        return new Response(upstream.body, {
          headers: {
            "content-type": "application/octet-stream",
            "cache-control": "public, max-age=3600",
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
