import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { SATELLITES, formatPosition } from "@/lib/satellites";
import { CHANNEL_LANGS, DICTS, LANGS, LANG_NAMES, isRtl, type Lang } from "@/lib/i18n";
import { filterChannels, importChmax, loadCatalog, type Channel } from "@/lib/catalog";
import { cachedEpg, loadEpg, normName, nowNext, type EpgIndex } from "@/lib/epg";
import { useSettings } from "@/lib/settings";
import { moveFocus } from "@/lib/dpad";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PulseEPG — Satellite TV guide" },
      { name: "description", content: "Browse 8,800+ channels across 13 satellites with live TV guide, in your language." },
      { property: "og:title", content: "PulseEPG — Satellite TV guide" },
      { property: "og:description", content: "Browse 8,800+ channels across 13 satellites with live TV guide." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const PAGE = 60;
const fmtTime = (t: number, lang: Lang) =>
  new Date(t).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });

function Index() {
  const { settings, update, reset } = useSettings();
  const [catalog, setCatalog] = useState<Channel[] | null>(null);
  const [tv, setTv] = useState<boolean | null>(true);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const [panel, setPanel] = useState<"settings" | "exit" | null>(null);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [epg, setEpg] = useState<EpgIndex | null>(null);
  const [epgState, setEpgState] = useState<"idle" | "loading" | "error">("idle");
  const fileRef = useRef<HTMLInputElement>(null);

  const lang = settings?.lang ?? "en";
  const t = DICTS[lang];

  useEffect(() => { loadCatalog().then(setCatalog); }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang]);
  useEffect(() => { if (settings) cachedEpg(settings.region).then((d) => d && setEpg(d)); }, [settings?.region]);

  // D-pad + Back key handling
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Backspace" && (e.target as HTMLElement).tagName !== "INPUT" || e.key === "GoBack" || e.keyCode === 10009 || e.keyCode === 461) {
        e.preventDefault();
        if (selected) setSelected(null);
        else setPanel((p) => (p ? null : "exit"));
        return;
      }
      if (moveFocus(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // Android/mobile hardware back → exit modal
  useEffect(() => {
    history.pushState({ pulse: 1 }, "");
    const onPop = () => { history.pushState({ pulse: 1 }, ""); setPanel("exit"); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const filtered = useMemo(
    () => catalog && settings
      ? filterChannels(catalog, { satellites: settings.satellites, tv, lang: settings.channelLang, freeOnly: settings.freeOnly, query })
      : [],
    [catalog, settings, tv, query],
  );
  useEffect(() => setLimit(PAGE), [filtered]);

  if (!settings) return <div className="min-h-screen" />;

  const toggleSat = (i: number) =>
    update((s) => ({ satellites: s.satellites.includes(i) ? s.satellites.filter((x) => x !== i) : [...s.satellites, i].sort((a, b) => a - b) }));

  const fetchGuide = async () => {
    if (!catalog) return;
    setEpgState("loading");
    try {
      const wanted = new Set(filtered.map((c) => normName(c.name)));
      setEpg(await loadEpg(settings.region, wanted, true));
      setEpgState("idle");
    } catch { setEpgState("error"); }
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setCatalog(await importChmax(await f.text()));
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-5 md:px-8">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            Pulse<span className="text-primary">EPG</span>
          </h1>
          <p className="text-xs text-muted-foreground">{t.tagline} · {t[`region_${settings.region}`]}</p>
        </div>
        <button data-nav onClick={() => setPanel("settings")} className="chip" aria-label={t.settings}>
          ⚙ <span className="hidden sm:inline">{t.settings}</span>
        </button>
      </header>

      <input
        data-nav value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search}
        className="w-full rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:border-ring"
      />

      <section aria-label={t.satellites} className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {SATELLITES.map((s) => (
          <button key={s.index} data-nav data-on={settings.satellites.includes(s.index)} onClick={() => toggleSat(s.index)} className="chip">
            <span className="font-semibold">{formatPosition(s.position)}</span>
            <span className="opacity-80">{s.name}</span>
          </button>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {([[true, t.tv], [false, t.radio], [null, t.all]] as const).map(([v, label]) => (
          <button key={String(v)} data-nav data-on={tv === v} onClick={() => setTv(v)} className="chip">{label}</button>
        ))}
        <span className="ms-auto text-sm text-muted-foreground">
          {catalog ? `${filtered.length.toLocaleString(lang)} ${t.channels}` : t.loading}
        </span>
        <button data-nav onClick={fetchGuide} disabled={epgState === "loading"} className="chip">
          {epgState === "loading" ? t.epgLoading : t.loadEpg}
        </button>
      </div>
      {epgState === "error" && <p className="text-sm text-destructive">{t.epgError}</p>}

      {catalog && filtered.length === 0 && <p className="py-16 text-center text-muted-foreground">{t.noResults}</p>}

      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, limit).map((c) => {
          const nn = epg ? nowNext(epg[normName(c.name)]) : null;
          return (
            <li key={c.id}>
              <button data-nav onClick={() => setSelected(c)}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-start transition hover:border-primary/60">
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold text-primary">
                  {c.name.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {nn?.now ? `${t.now}: ${nn.now.title}` : c.provider || "—"}
                  </span>
                </span>
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${c.ca ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground"}`}>
                  {c.ca ? t.encrypted : t.fta}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {filtered.length > limit && (
        <button data-nav onClick={() => setLimit((l) => l + PAGE)} className="chip mx-auto">{t.showMore}</button>
      )}

      {selected && (
        <Modal onClose={() => setSelected(null)}>
          <h2 className="text-xl font-bold">{selected.name}</h2>
          <p className="text-sm text-muted-foreground">{selected.provider}</p>
          <p className="mt-2 text-sm">
            {t.frequency}: {selected.freq} {selected.pol} {selected.sr} ·{" "}
            {SATELLITES.filter((s) => selected.satMask & (1 << s.index)).map((s) => formatPosition(s.position)).join(", ")}
          </p>
          {selected.langs.length > 0 && <p className="mt-1 text-xs uppercase text-muted-foreground">{selected.langs.join(" · ")}</p>}
          <div className="mt-4 space-y-2">
            {(() => {
              const nn = epg ? nowNext(epg[normName(selected.name)]) : null;
              if (!nn?.now && !nn?.next) return <p className="text-sm text-muted-foreground">{t.noEpg}</p>;
              return [[t.now, nn.now], [t.next, nn.next]].map(([label, p]) => p && typeof p === "object" && (
                <div key={label as string} className="rounded-lg bg-secondary p-3">
                  <span className="text-xs text-primary">{label as string} · {fmtTime(p.start, lang)}–{fmtTime(p.stop, lang)}</span>
                  <p className="font-semibold">{p.title}</p>
                </div>
              ));
            })()}
          </div>
          <button data-nav autoFocus onClick={() => setSelected(null)} className="chip mt-4">{t.close}</button>
        </Modal>
      )}

      {panel === "settings" && (
        <Modal onClose={() => setPanel(null)}>
          <h2 className="text-xl font-bold">{t.settings}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t.detected}: {t[`region_${settings.region}`]}</p>

          <h3 className="mt-5 font-semibold">{t.language}</h3>
          <p className="text-xs text-muted-foreground">{t.languageHint}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGS.map((l) => (
              <button key={l} data-nav autoFocus={l === lang} data-on={l === lang} onClick={() => update({ lang: l, langForced: true })} className="chip">{LANG_NAMES[l]}</button>
            ))}
          </div>

          <h3 className="mt-5 font-semibold">{t.satellites}</h3>
          <p className="text-xs text-muted-foreground">{t.satellitesHint}</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {SATELLITES.map((s) => (
              <button key={s.index} data-nav data-on={settings.satellites.includes(s.index)} onClick={() => toggleSat(s.index)} className="chip justify-between">
                <span>{s.name}</span><span className="font-semibold">{formatPosition(s.position)}</span>
              </button>
            ))}
          </div>

          <h3 className="mt-5 font-semibold">{t.channelLang}</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            <button data-nav data-on={settings.channelLang === null} onClick={() => update({ channelLang: null })} className="chip">{t.anyLang}</button>
            {CHANNEL_LANGS.map((l) => (
              <button key={l} data-nav data-on={settings.channelLang === l} onClick={() => update({ channelLang: l })} className="chip uppercase">{l}</button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button data-nav data-on={settings.freeOnly} onClick={() => update((s) => ({ freeOnly: !s.freeOnly }))} className="chip">{t.freeOnly}</button>
            <button data-nav onClick={() => fileRef.current?.click()} className="chip">{t.importFile}</button>
            <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={onImport} />
            <button data-nav onClick={reset} className="chip">{t.resetAuto}</button>
            <button data-nav onClick={() => setPanel(null)} className="chip" data-on>{t.close}</button>
          </div>
        </Modal>
      )}

      {panel === "exit" && (
        <Modal onClose={() => setPanel(null)}>
          <h2 className="text-xl font-bold">{t.exitTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t.exitBody}</p>
          <div className="mt-5 flex gap-2">
            <button data-nav autoFocus data-on onClick={() => setPanel(null)} className="chip">{t.stay}</button>
            <button data-nav onClick={() => { window.close(); history.go(-(history.length - 1)); }} className="chip">{t.exit}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur-sm" onClick={onClose}>
      <div data-nav-scope role="dialog" aria-modal onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-2xl">
        {children}
      </div>
    </div>
  );
}
