import { createFileRoute } from "@tanstack/react-router";

const ALLOWED = /^epg_ripper_[A-Z0-9_]+\.xml\.gz$/;

/** Read-only relay for epgshare01 public XMLTV files (the source sends no CORS headers). */
export const Route = createFileRoute("/api/public/epg")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const file = new URL(request.url).searchParams.get("file") ?? "";
        if (!ALLOWED.test(file)) return new Response("Bad file", { status: 400 });
        const upstream = await fetch(`https://epgshare01.online/epgshare01/${file}`);
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
