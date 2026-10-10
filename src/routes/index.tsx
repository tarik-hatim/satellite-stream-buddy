import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { SATELLITES, formatPosition } from "@/lib/satellites";
import { CHANNEL_LANGS, DICTS, LANGS, LANG_NAMES, isRtl, type FullDict, type Lang } from "@/lib/i18n";
import { filterChannels, importChmax, loadCatalog, type Channel } from "@/lib/catalog";
import { ZONES, cachedZones, dayRange, inRange, loadZone, normName, nowNext, type EpgChannel, type EpgIndex, type Programme } from "@/lib/epg";
import { CATEGORY_ICON, CATEGORY_LABEL, categorize, type Category } from "@/lib/categories";
import { useSettings } from "@/lib/settings";
import { useFavorites, useReminders, reminderKey, type Reminder } from "@/lib/prefs";
import { moveFocus } from "@/lib/dpad";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X, RotateCcw, ChevronDown, ImageOff } from "lucide-react";
import { useDeviceMode, type DeviceMode } from "@/lib/device";
import { UX_COPY } from "@/lib/ux-copy";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PulseEPG — Satellite TV guide" },
      { name: "description", content: "Live TV guide for 8,800+ channels across 13 satellites, with reminders and favorites, in your language." },
      { property: "og:title", content: "PulseEPG — Satellite TV guide" },
      { property: "og:description", content: "Live TV guide for 8,800+ channels across 13 satellites, with reminders and favorites." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "live" | "grid" | "favorites" | "reminders";
type Slot = "all" | "morning" | "afternoon" | "evening" | "night";
const PAGE = 40;
const SLOTS: Record<Exclude<Slot, "all">, [number, number]> = { morning: [5, 12], afternoon: [12, 18], evening: [18, 24], night: [0, 5] };

const fmtT = (t: number, l: Lang) => new Date(t).toLocaleTimeString(l, { hour: "2-digit", minute: "2-digit" });
const fmtDur = (ms: number, t: FullDict) => {
  const m = Math.max(0, Math.round(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}` : `${m} ${t.min}`;
};

function useNow(ms = 30_000) {
  const [n, setN] = useState(() => Date.now());
  useEffect(() => { const i = setInterval(() => setN(Date.now()), ms); return () => clearInterval(i); }, [ms]);
  return n;
}

function Index() {
  const { settings, update, reset } = useSettings();
  const { favs, toggle: toggleFav } = useFavorites();
  const [banner, setBanner] = useState<Reminder | null>(null);
  const onFire = useCallback((r: Reminder) => setBanner(r), []);
  const { reminders, toggle: toggleRem, has: hasRem } = useReminders(onFire);
  const now = useNow();

  const [catalog, setCatalog] = useState<Channel[] | null>(null);
  const [epg, setEpg] = useState<EpgIndex>({});
  const [epgState, setEpgState] = useState<"idle" | "loading" | "error">("idle");
  const [tab, setTab] = useState<Tab>("live");
  const [tv, setTv] = useState<boolean | null>(true);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Category | null>(null);
  const [sat, setSat] = useState<number | null>(null);
  const [bouquet, setBouquet] = useState<string | null>(null);
  const [zone, setZone] = useState<string | null>(null);
  const [genre, setGenre] = useState<string | null>(null);
  const [day, setDay] = useState(0);
  const [onlyGuide, setOnlyGuide] = useState(true);
  const [limit, setLimit] = useState(PAGE);
  const [panel, setPanel] = useState<"settings" | "exit" | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const device = useDeviceMode();
  const [selected, setSelected] = useState<Channel | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const lang = settings?.lang ?? "en";
  const t = DICTS[lang];
  const cl = CATEGORY_LABEL[lang];
  const ux = UX_COPY[lang];

  useEffect(() => { loadCatalog().then(setCatalog); }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = isRtl(lang) ? "rtl" : "ltr";
  }, [lang]);

  const zonesKey = settings?.zones.join(",");
  const fetchGuide = useCallback(async (force = false) => {
    if (!catalog || !settings) return;
    setEpgState("loading");
    const wanted = new Set(catalog.map((c) => normName(c.name)));
    let ok = 0;
    for (const z of settings.zones) {
      try {
        const d = await loadZone(z, wanted, force);
        ok++;
        setEpg((p) => { const n = { ...p }; for (const k in d) n[k] ??= d[k]!; return n; });
      } catch { /* zone unreachable */ }
    }
    setEpgState(ok ? "idle" : "error");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, zonesKey]);

  useEffect(() => {
    if (!catalog || !settings) return;
    setEpg({});
    cachedZones(settings.zones).then((c) => { setEpg(c); void fetchGuide(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [catalog, zonesKey]);

  // D-pad + Back
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const inInput = (e.target as HTMLElement).tagName === "INPUT";
      if (e.key === "Escape" || (e.key === "Backspace" && !inInput) || e.key === "GoBack" || e.keyCode === 10009 || e.keyCode === 461) {
        e.preventDefault();
        if (selected) setSelected(null);
        else if (filtersOpen) setFiltersOpen(false);
        else setPanel((p) => (p ? null : "exit"));
        return;
      }
      if (moveFocus(e.key)) e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, filtersOpen]);
  useEffect(() => {
    history.pushState({ pulse: 1 }, "");
    const onPop = () => { history.pushState({ pulse: 1 }, ""); if (selected) setSelected(null); else if (filtersOpen) setFiltersOpen(false); else setPanel((p) => p ? null : "exit"); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [selected, filtersOpen]);

  const range = useMemo(() => dayRange(day), [day, Math.floor(now / 3600_000)]);
  const guideOf = useCallback((c: Channel): EpgChannel | undefined => epg[normName(c.name)], [epg]);

  // Base list: satellites enabled in settings + search + TV/radio + language + free
  const base = useMemo(() => {
    if (!catalog || !settings) return [];
    let l = filterChannels(catalog, { satellites: settings.satellites, tv, lang: settings.channelLang, freeOnly: settings.freeOnly, query });
    if (tab === "favorites") l = l.filter((c) => favs.includes(c.id));
    else if (onlyGuide) l = l.filter((c) => guideOf(c));
    return l;
  }, [catalog, settings, tv, query, tab, favs, onlyGuide, guideOf]);

  const dayProgs = useCallback((c: Channel) => guideOf(c)?.p.filter((p) => inRange(p, range)) ?? [], [guideOf, range]);
  const mainCat = useCallback((c: Channel): Category => {
    const p = guideOf(c)?.p;
    const cur = p && nowNext(p, now).now;
    return categorize(cur?.cat ?? p?.[0]?.cat ?? c.name);
  }, [guideOf, now]);

  const passes = (c: Channel, skip: string) =>
    (skip === "cat" || !cat || mainCat(c) === cat) &&
    (skip === "sat" || sat === null || (c.satMask & (1 << sat)) !== 0) &&
    (skip === "bouquet" || !bouquet || c.provider === bouquet) &&
    (skip === "zone" || !zone || guideOf(c)?.z === zone) &&
    (skip === "genre" || !genre || dayProgs(c).some((p) => p.cat === genre));

  const filtered = useMemo(() => base.filter((c) => passes(c, "")),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, cat, sat, bouquet, zone, genre, dayProgs, mainCat]);
  useEffect(() => setLimit(PAGE), [filtered]);

  const counts = useMemo(() => {
    const count = <K extends string | number>(skip: string, key: (c: Channel) => K[]) => {
      const m = new Map<K, number>();
      for (const c of base) if (passes(c, skip)) for (const k of key(c)) m.set(k, (m.get(k) ?? 0) + 1);
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    return {
      cat: count("cat", (c) => [mainCat(c)]),
      sat: count("sat", (c) => SATELLITES.filter((s) => c.satMask & (1 << s.index)).map((s) => s.index)),
      bouquet: count("bouquet", (c) => (c.provider ? [c.provider] : [])).slice(0, 15),
      zone: count("zone", (c) => { const z = guideOf(c)?.z; return z ? [z] : []; }),
      genre: count("genre", (c) => [...new Set(dayProgs(c).map((p) => p.cat).filter((x): x is string => !!x))]).slice(0, 15),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, cat, sat, bouquet, zone, genre, dayProgs, mainCat]);

  const activeProgs = useMemo(() => filtered.reduce((n, c) => n + dayProgs(c).length, 0), [filtered, dayProgs]);

  if (!settings) return <div className="min-h-screen" />;

  const toggleSat = (i: number) =>
    update((s) => ({ satellites: s.satellites.includes(i) ? s.satellites.filter((x) => x !== i) : [...s.satellites, i].sort((a, b) => a - b) }));
  const toggleZone = (z: string) =>
    update((s) => ({ zones: s.zones.includes(z) ? s.zones.filter((x) => x !== z) : [...s.zones, z] }));
  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) setCatalog(await importChmax(await f.text()));
  };

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const off = -new Date().getTimezoneOffset() / 60;
  const tabs: [Tab, string, string][] = [
    ["live", "●", t.liveNow], ["grid", "▦", t.grid], ["favorites", "♡", t.favorites], ["reminders", "🔔", `${t.remindMe.split(" ")[0]} ${reminders.length || ""}`],
  ];
  const sats = SATELLITES.filter((s) => settings.satellites.includes(s.index));
  const activeFilters = [cat, sat, bouquet, zone, genre, settings.channelLang].filter((v) => v !== null).length + Number(tv !== true) + Number(settings.freeOnly);
  const clearFilters = () => { setCat(null); setSat(null); setBouquet(null); setZone(null); setGenre(null); setTv(true); update({ channelLang: null, freeOnly: false }); };

  return (
    <div data-device={device.mode} data-remote={device.remote} className="app-shell mx-auto flex min-h-screen max-w-6xl flex-col gap-3 px-3 py-3 md:px-8">
      {banner && (
        <div role="alert" className="fixed inset-x-3 top-3 z-[60] mx-auto flex max-w-xl items-center gap-3 rounded-2xl border border-primary bg-card p-4 shadow-2xl">
          <span className="text-2xl">🔔</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-primary">{banner.start > Date.now() ? `${t.startingNow} · ${fmtT(banner.start, lang)}` : t.live}</p>
            <p className="truncate font-semibold">{banner.channel} — {banner.title}</p>
          </div>
          <button data-nav autoFocus onClick={() => setBanner(null)} className="chip">{t.close}</button>
        </div>
      )}

      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">P</span>
          <div className="min-w-0">
            <h1 className="text-lg font-bold md:text-2xl">Pulse<span className="text-primary">EPG</span></h1>
            <p className="truncate text-[10px] text-muted-foreground">{t.tagline} · {t[`region_${settings.region}`]}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button data-nav onClick={() => fetchGuide(true)} disabled={epgState === "loading"} className="chip" aria-label={t.refreshEpg}>
            <span className={epgState === "loading" ? "animate-spin" : ""}>⟳</span>
          </button>
          <button data-nav onClick={() => setPanel("settings")} className="chip" aria-label={t.settings}>⚙</button>
        </div>
      </header>

      <nav className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
        {tabs.map(([k, icon, label]) => (
          <button key={k} data-nav data-on={tab === k} onClick={() => setTab(k)} className="chip shrink-0 text-sm">
            <span>{icon}</span>{label}
          </button>
        ))}
      </nav>

      {tab === "reminders" ? (
        <RemindersView reminders={reminders} t={t} lang={lang} onRemove={toggleRem} now={now} />
      ) : (
        <>
          <section aria-label={ux.filters} className="space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <input data-nav aria-label={t.search} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search}
                className="h-11 min-w-0 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus:border-ring" />
              <Button data-nav variant={activeFilters ? "default" : "outline"} className="h-11 px-3" onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen}>
                <SlidersHorizontal /> {ux.filters}{activeFilters > 0 && <span className="font-bold">{activeFilters}</span>}
              </Button>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <p className="min-w-0 text-xs text-muted-foreground"><b className="text-foreground">{filtered.length.toLocaleString(lang)}</b> {t.channels} · {activeProgs.toLocaleString(lang)} {t.activeProgs}</p>
              <select data-nav aria-label={t.schedule} value={day} onChange={(e) => setDay(Number(e.target.value))} className="h-9 max-w-36 rounded-md border border-input bg-card px-2 text-xs">
                {[-1, 0, 1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{d === -1 ? t.catchup : d === 0 ? t.today : new Date(dayRange(d)[0]).toLocaleDateString(lang, { weekday: "short", day: "numeric" })}</option>)}
              </select>
            </div>
            {epgState === "loading" && <p className="text-xs text-accent">{t.epgLoading}</p>}
            {epgState === "error" && <p className="text-xs text-destructive">{t.epgError}</p>}
          </section>

          {filtersOpen && (
            <Modal onClose={() => setFiltersOpen(false)} filter>
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-card pb-3">
                <h2 className="text-lg font-bold">{ux.filters} {activeFilters > 0 && <span className="text-primary">· {activeFilters}</span>}</h2>
                <Button data-nav autoFocus size="icon" variant="ghost" aria-label={t.close} onClick={() => setFiltersOpen(false)}><X /></Button>
              </div>
              <div className="my-3 flex gap-2">
                {([[true, t.tv], [false, t.radio], [null, t.all]] as const).map(([v, label]) => <Button key={String(v)} data-nav variant={tv === v ? "default" : "outline"} aria-pressed={tv === v} onClick={() => setTv(v)} className="h-11 flex-1">{label}</Button>)}
              </div>
            <FilterRow label={`🎞 ${t.category}`} all={t.all} total={base.length} value={cat} onChange={setCat}
              items={counts.cat.map(([k, n]) => [k, `${CATEGORY_ICON[k]} ${cl?.[k] ?? k}`, n])} />
            <FilterRow label={`🛰 ${t.sat}`} all={t.all} total={base.length} value={sat} onChange={setSat}
              items={counts.sat.map(([k, n]) => [k, `${SATELLITES[k]?.name.split(" ")[0]} ${formatPosition(SATELLITES[k]?.position ?? 0)}`, n])} />
            <FilterRow label={t.bouquet} all={t.all} total={base.length} value={bouquet} onChange={setBouquet}
              items={counts.bouquet.map(([k, n]) => [k, k, n])} />
            <FilterRow label={`🌐 ${t.zone}`} all={`🌍 ${t.all}`} total={base.length} value={zone} onChange={setZone}
              items={counts.zone.map(([k, n]) => [k, `${ZONES[k]?.flag ?? ""} ${ZONES[k]?.label ?? k}`, n])} />
            <FilterRow label={`✦ ${t.genre}`} all={t.allGenres} total={base.length} value={genre} onChange={setGenre}
              items={counts.genre.map(([k, n]) => [k, k, n])} />


              <FilterRow label={t.channelLang} all={t.anyLang} total={base.length} value={settings.channelLang} onChange={(v) => update({ channelLang: v })} items={CHANNEL_LANGS.map((l) => [l, l.toUpperCase(), 0])} />
              <div className="space-y-3 border-t border-border py-3 text-sm">
                <label className="flex min-h-11 items-center justify-between gap-3">{t.freeOnly}<input data-nav type="checkbox" checked={settings.freeOnly} onChange={(e) => update({ freeOnly: e.target.checked })} className="size-5 accent-primary" /></label>
                {tab !== "favorites" && <label className="flex min-h-11 items-center justify-between gap-3">{t.all} {t.channels}<input data-nav type="checkbox" checked={!onlyGuide} onChange={(e) => setOnlyGuide(!e.target.checked)} className="size-5 accent-primary" /></label>}
              </div>
              <div className="sticky bottom-0 grid grid-cols-[auto_minmax(0,1fr)] gap-2 border-t border-border bg-card pt-3">
                <Button data-nav variant="outline" className="h-11" onClick={clearFilters}><RotateCcw />{ux.clear}</Button>
                <Button data-nav className="h-11 min-w-0 whitespace-normal" onClick={() => setFiltersOpen(false)}>{ux.results} · {filtered.length.toLocaleString(lang)}</Button>
              </div>
            </Modal>
          )}

          {!catalog && <p className="py-10 text-center text-muted-foreground">{t.loading}</p>}
          {catalog && filtered.length === 0 && (
            <p className="py-16 text-center text-muted-foreground">{tab === "favorites" ? t.noFavorites : epgState === "loading" ? t.epgLoading : t.noResults}</p>
          )}

          {tab === "grid" ? (
            <GridView channels={filtered.slice(0, limit)} dayProgs={dayProgs} range={range} now={now} lang={lang} onOpen={setSelected} />
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {filtered.slice(0, limit).map((c) => (
                <ChannelCard key={c.id} c={c} g={guideOf(c)} now={now} day={day} range={range} t={t} lang={lang}
                  fav={favs.includes(c.id)} onFav={() => toggleFav(c.id)} onOpen={() => setSelected(c)} />
              ))}
            </ul>
          )}
          {filtered.length > limit && (
            <button data-nav onClick={() => setLimit((l) => l + PAGE)} className="chip mx-auto">{t.showMore}</button>
          )}
        </>
      )}

      {selected && (
        <ChannelDetail c={selected} g={guideOf(selected)} progs={dayProgs(selected)} now={now} t={t} lang={lang}
          fav={favs.includes(selected.id)} onFav={() => toggleFav(selected.id)} onClose={() => setSelected(null)}
          hasRem={hasRem} toggleRem={toggleRem} />
      )}

      {panel === "settings" && (
        <Modal onClose={() => setPanel(null)}>
          <h2 className="text-xl font-bold">{t.settings}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t.detected}: {t[`region_${settings.region}`]}</p>

          <h3 className="mt-5 font-semibold">{ux.device}</h3>
          <select data-nav aria-label={ux.device} value={device.override ?? "auto"} onChange={(e) => device.setOverride(e.target.value === "auto" ? null : e.target.value as DeviceMode)} className="mt-2 h-11 w-full rounded-md border border-input bg-background px-3 text-sm">
            <option value="auto">{ux.auto}</option><option value="mobile">{ux.mobile}</option><option value="android-box">Android TV Box</option><option value="android-tv">Android TV</option><option value="fire-tv">Fire TV Stick</option><option value="desktop">Desktop</option>
          </select>
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

          <h3 className="mt-5 font-semibold">{t.epgZones}</h3>
          <p className="text-xs text-muted-foreground">{t.zonesHint}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {Object.entries(ZONES).map(([k, z]) => (
              <button key={k} data-nav data-on={settings.zones.includes(k)} onClick={() => toggleZone(k)} className="chip">{z.flag} {z.label}</button>
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
          <p className="mt-4 text-xs text-muted-foreground">{t.satellites}: {sats.map((s) => formatPosition(s.position)).join(" · ")}</p>
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

function FilterRow<K extends string | number>({ label, all, total, value, onChange, items }: {
  label: string; all: string; total: number; value: K | null; onChange: (v: K | null) => void; items: [K, string, number][];
}) {
  if (items.length === 0) return null;
  return (
    <details className="filter-group border-t border-border py-1">
      <summary data-nav className="grid min-h-11 cursor-pointer list-none grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-sm">
        <span className="min-w-0">{label}<span className="ms-2 text-xs text-primary">{value === null ? all : items.find(([k]) => k === value)?.[1] ?? String(value)}</span></span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </summary>
      <div className="grid grid-cols-2 gap-2 pb-3">
        <Button data-nav variant={value === null ? "default" : "outline"} aria-pressed={value === null} onClick={() => onChange(null)} className="min-h-11 h-auto justify-between whitespace-normal px-3 py-2 text-start">
          {all} <Count n={total} />
        </Button>
        {items.map(([k, l, n]) => (
          <Button key={String(k)} data-nav variant={value === k ? "default" : "outline"} aria-pressed={value === k} onClick={() => onChange(value === k ? null : k)} className="min-h-11 h-auto min-w-0 justify-between whitespace-normal px-3 py-2 text-start">
            <span className="min-w-0 break-words">{l}</span> {n > 0 && <Count n={n} />}
          </Button>
        ))}
      </div>
    </details>
  );
}
const Count = ({ n }: { n: number }) => <span className="rounded-full bg-background/70 px-2 text-xs font-semibold text-foreground">{n}</span>;

function Progress({ p, now }: { p: Programme; now: number }) {
  const pct = Math.min(100, Math.max(0, ((now - p.start) / (p.stop - p.start)) * 100));
  return <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${pct}%` }} /></div>;
}

function Logo({ name }: { name: string }) {
  return <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-secondary text-sm font-bold text-primary">{name.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 3).toUpperCase()}</span>;
}

function ChannelCard({ c, g, now, day, range, t, lang, fav, onFav, onOpen }: {
  c: Channel; g?: EpgChannel | undefined; now: number; day: number; range: readonly [number, number]; t: FullDict; lang: Lang; fav: boolean; onFav: () => void; onOpen: () => void;
}) {
  const nn = g ? nowNext(g.p, now) : null;
  const firstOfDay = day !== 0 ? g?.p.find((p) => inRange(p, range)) : undefined;
  const shown = day === 0 ? nn?.now ?? nn?.next : firstOfDay;
  const live = shown && shown.start <= now && shown.stop > now;
  const sats = SATELLITES.filter((s) => c.satMask & (1 << s.index));
  return (
    <li className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start gap-3">
        <Logo name={c.name} />
        <button data-nav onClick={onOpen} className="min-w-0 flex-1 text-start">
          <span className="block truncate text-lg font-semibold">{c.name}</span>
          <span className="mt-1 flex flex-wrap gap-1 text-[11px]">
            {sats.slice(0, 2).map((s) => <span key={s.index} className="rounded-md border border-accent/50 px-1.5 py-0.5 uppercase text-accent">{s.name.split(" ")[0]} {formatPosition(s.position)}</span>)}
            {c.provider && <span className="rounded-md border border-primary/50 px-1.5 py-0.5 text-primary">{c.provider}</span>}
            {c.langs.length > 0 && <span className="rounded-md border border-border px-1.5 py-0.5 uppercase text-muted-foreground">🔊 {c.langs.slice(0, 3).join(" + ")}</span>}
            <span className={`rounded-md px-1.5 py-0.5 ${c.ca ? "bg-muted text-muted-foreground" : "bg-accent text-accent-foreground"}`}>{c.ca ? t.encrypted : t.fta}</span>
          </span>
        </button>
        <button data-nav onClick={onFav} aria-label={t.favorites} className="chip text-lg" data-on={fav}>{fav ? "♥" : "♡"}</button>
      </div>
      {shown && (
        <button data-nav onClick={onOpen} className="mt-3 block w-full space-y-1.5 text-start">
          <span className="flex items-center gap-2 text-sm">
            {live ? <span className="rounded-md bg-destructive px-2 py-0.5 text-xs font-bold text-destructive-foreground">● {t.live}</span>
              : <span className="rounded-md bg-secondary px-2 py-0.5 text-xs">{t.upcoming}</span>}
            <span className="font-mono">{fmtT(shown.start, lang)} – {fmtT(shown.stop, lang)}</span>
            {live && <span className="ms-auto text-xs text-muted-foreground">{fmtDur(shown.stop - now, t)} {t.left}</span>}
          </span>
          <span className="block truncate font-semibold">{shown.title}</span>
          {shown.desc && <span className="line-clamp-1 block text-sm text-muted-foreground">{shown.desc}</span>}
          {live && <Progress p={shown} now={now} />}
          {day === 0 && nn?.next && live && <span className="block truncate text-xs text-muted-foreground">{t.next}: {fmtT(nn.next.start, lang)} {nn.next.title}</span>}
        </button>
      )}
    </li>
  );
}

function GridView({ channels, dayProgs, range, now, lang, onOpen }: {
  channels: Channel[]; dayProgs: (c: Channel) => Programme[]; range: readonly [number, number]; now: number; lang: Lang; onOpen: (c: Channel) => void;
}) {
  const PX = 4; // px per minute
  const ref = useRef<HTMLDivElement>(null);
  const width = 24 * 60 * PX;
  const x = (ts: number) => ((Math.max(range[0], Math.min(range[1], ts)) - range[0]) / 60000) * PX;
  useEffect(() => { if (ref.current && now > range[0] && now < range[1]) ref.current.scrollLeft = Math.abs(x(now) - 120) * (document.dir === "rtl" ? -1 : 1); }, [range[0]]);
  return (
    <div ref={ref} dir="ltr" className="overflow-x-auto rounded-2xl border border-border bg-card">
      <div style={{ width: width + 140 }} className="relative">
        <div className="sticky top-0 flex h-8 border-b border-border ps-[140px] text-xs text-muted-foreground">
          {Array.from({ length: 24 }, (_, h) => <span key={h} style={{ width: 60 * PX }} className="border-s border-border/60 ps-1">{fmtT(range[0] + h * 3600_000, lang)}</span>)}
        </div>
        {now > range[0] && now < range[1] && <div className="absolute top-0 bottom-0 z-10 w-0.5 bg-destructive" style={{ left: 140 + x(now) }} />}
        {channels.map((c) => (
          <div key={c.id} className="flex h-14 border-b border-border/60">
            <button data-nav onClick={() => onOpen(c)} className="sticky left-0 z-20 w-[140px] shrink-0 truncate border-e border-border bg-card px-2 text-start text-sm font-semibold">{c.name}</button>
            <div className="relative flex-1">
              {dayProgs(c).map((p) => {
                const live = p.start <= now && p.stop > now;
                return (
                  <button key={p.start} data-nav onClick={() => onOpen(c)} title={p.title}
                    style={{ left: x(p.start), width: Math.max(8, x(p.stop) - x(p.start) - 2) }}
                    className={`absolute top-1 bottom-1 overflow-hidden rounded-md px-2 text-start text-xs ${live ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    <span className="block truncate font-semibold">{p.title}</span>
                    <span className="block truncate opacity-75">{fmtT(p.start, lang)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelDetail({ c, g, progs, now, t, lang, fav, onFav, onClose, hasRem, toggleRem }: {
  c: Channel; g?: EpgChannel | undefined; progs: Programme[]; now: number; t: FullDict; lang: Lang; fav: boolean; onFav: () => void; onClose: () => void;
  hasRem: (k: string) => boolean; toggleRem: (r: Reminder) => void;
}) {
  const [slot, setSlot] = useState<Slot>("all");
  const [chosen, setChosen] = useState<Programme | null>(null);
  const nn = g ? nowNext(g.p, now) : null;
  const focus = chosen ?? nn?.now ?? nn?.next ?? progs[0];
  const sats = SATELLITES.filter((s) => c.satMask & (1 << s.index));
  const list = slot === "all" ? progs : progs.filter((p) => {
    const h = new Date(p.start).getHours(); const [a, b] = SLOTS[slot]; return h >= a && h < b;
  });
  const rem = (p: Programme) => ({ key: reminderKey(c.name, p.start), channel: c.name, title: p.title, start: p.start });
  const cl = CATEGORY_LABEL[lang]!;
  return (
    <Modal onClose={onClose} wide>
      <div className="flex items-start gap-3">
        <Logo name={c.name} />
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-bold">{c.name}</h2>
          <div className="mt-1 flex flex-wrap gap-1 text-xs">
            {sats.map((s) => <span key={s.index} className="rounded-md border border-accent/50 px-1.5 py-0.5 uppercase text-accent">{s.name} {formatPosition(s.position)}</span>)}
            {c.provider && <span className="rounded-md border border-primary/50 px-1.5 py-0.5 text-primary">{c.provider}</span>}
          </div>
        </div>
        <button data-nav onClick={onFav} data-on={fav} className="chip text-lg">{fav ? "♥" : "♡"}</button>
        <button data-nav autoFocus onClick={onClose} className="chip text-lg" aria-label={t.close}>✕</button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {t.frequency}: {c.freq} {c.pol} {c.sr}{c.langs.length > 0 && ` · ${t.audio}: ${c.langs.join(" + ").toUpperCase()}`}{g && ` · ${ZONES[g.z]?.flag ?? ""} ${ZONES[g.z]?.label ?? g.z}`}
      </p>

      {focus ? (
        <div className="mt-4 grid grid-cols-[100px_minmax(0,1fr)] gap-3 border-y border-border py-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-5">
          <ProgrammePoster key={focus.img ?? focus.title} p={focus} lang={lang} />
          <div className="min-w-0 space-y-3">
          {focus.start <= now && focus.stop > now ? (
            <span className="inline-block rounded-lg bg-destructive px-3 py-1 text-sm font-bold text-destructive-foreground">
              ● {t.live} · {fmtT(focus.start, lang)} → {fmtT(focus.stop, lang)} ({fmtDur(focus.stop - now, t)} {t.left})
            </span>
          ) : (
            <span className="inline-block rounded-lg border border-accent px-3 py-1 text-sm">🕒 {fmtT(focus.start, lang)} → {fmtT(focus.stop, lang)} ({fmtDur(focus.stop - focus.start, t)})</span>
          )}
          {focus.start <= now && focus.stop > now && <Progress p={focus} now={now} />}
          <h3 className="break-words text-lg font-bold sm:text-2xl">{focus.title}</h3>
          {focus.cat && <p className="text-sm"><span className="text-muted-foreground">{t.genre}: </span><b>{focus.cat}</b> · {CATEGORY_ICON[categorize(focus.cat)]} {cl[categorize(focus.cat)]}</p>}
          {focus.start > now && (
            <button data-nav data-on={hasRem(rem(focus).key)} onClick={() => toggleRem(rem(focus))} className="chip">
              🔔 {hasRem(rem(focus).key) ? t.reminderSet : t.remindMe}
            </button>
          )}
          </div>
          {focus.desc && (
            <div className="col-span-2 border-t border-border pt-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t.synopsis}</p>
              <p className="mt-1 text-sm leading-relaxed">{focus.desc}</p>
            </div>
          )}
        </div>
      ) : <p className="mt-4 text-sm text-muted-foreground">{t.noEpg}</p>}

      {progs.length > 0 && (
        <>
          <h3 className="mt-5 font-semibold">{t.schedule}</h3>
          <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
            {(["all", "morning", "afternoon", "evening", "night"] as Slot[]).map((s) => (
              <button key={s} data-nav data-on={slot === s} onClick={() => setSlot(s)} className="chip">
                {s === "all" ? t.allDay : `${t[s]} (${String(SLOTS[s][0]).padStart(2, "0")}–${String(SLOTS[s][1]).padStart(2, "0")})`}
              </button>
            ))}
          </div>
          <ul className="mt-3 space-y-2">
            {list.map((p) => {
              const live = p.start <= now && p.stop > now, past = p.stop <= now, r = rem(p), on = hasRem(r.key);
              return (
                <li key={p.start} className={`flex gap-3 rounded-xl border p-3 ${live ? "border-primary bg-primary/10" : on ? "border-accent" : "border-border"} ${past ? "opacity-55" : ""}`}>
                  <span className="w-14 shrink-0 font-mono text-sm">{fmtT(p.start, lang)}<br /><span className="text-muted-foreground">→ {fmtT(p.stop, lang)}</span></span>
                  <div className="min-w-0 flex-1">
                    <Button data-nav variant="ghost" onClick={() => { setChosen(p); document.querySelector('[data-nav-scope]')?.scrollTo({ top: 0, behavior: "smooth" }); }} className="h-auto w-full justify-start whitespace-normal p-0 text-start font-semibold">{p.title}</Button>
                    {p.cat && <span className="mt-1 inline-block rounded-md border border-accent/50 px-1.5 py-0.5 text-xs text-accent">{p.cat}</span>}
                    {on && <span className="ms-1 mt-1 inline-block rounded-md bg-accent px-1.5 py-0.5 text-xs font-bold text-accent-foreground">🔔 {t.reminderSet}</span>}
                    {p.desc && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.desc}</p>}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <span className="font-mono text-xs text-muted-foreground">{fmtDur(p.stop - p.start, t)}</span>
                    {!past && !live && (
                      <button data-nav data-on={on} onClick={() => toggleRem(r)} aria-label={t.remindMe} className="chip">🔔</button>
                    )}
                    {live && <span className="rounded-md bg-destructive px-1.5 text-xs font-bold text-destructive-foreground">{t.live}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Modal>
  );
}

function RemindersView({ reminders, t, lang, onRemove, now }: { reminders: Reminder[]; t: FullDict; lang: Lang; onRemove: (r: Reminder) => void; now: number }) {
  const sorted = [...reminders].sort((a, b) => a.start - b.start);
  return (
    <section className="space-y-3">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h2 className="text-lg font-bold">🔔 {t.remindMe} · {reminders.length}</h2>
        <p className="mt-1 text-sm text-muted-foreground">5 {t.min} · {t.startingNow}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button data-nav onClick={() => {
            if (typeof Notification !== "undefined") {
              if (Notification.permission === "granted") new Notification("PulseEPG", { body: t.reminderSet });
              else void Notification.requestPermission();
            }
          }} className="chip" data-on>🔔 Test</button>
          {reminders.length > 0 && <button data-nav onClick={() => reminders.forEach(onRemove)} className="chip">🗑 {t.all}</button>}
        </div>
      </div>
      {sorted.length === 0 && <p className="py-10 text-center text-muted-foreground">—</p>}
      {sorted.map((r) => (
        <div key={r.key} className="flex items-center gap-3 rounded-2xl border border-accent/60 bg-card p-3">
          <Logo name={r.channel} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{r.channel}</p>
            <p className="truncate text-sm">{r.title}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {new Date(r.start).toLocaleDateString(lang, { weekday: "short", day: "numeric", month: "short" })} · {fmtT(r.start, lang)} · {fmtDur(r.start - now, t)}
            </p>
          </div>
          <button data-nav onClick={() => onRemove(r)} className="chip" aria-label={t.close}>✕</button>
        </div>
      ))}
    </section>
  );
}

function Modal({ children, onClose, wide, filter }: { children: ReactNode; onClose: () => void; wide?: boolean; filter?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("[autofocus], [data-nav]")?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = Array.from(ref.current?.querySelectorAll<HTMLElement>("button, input, select, summary, [tabindex='0']") ?? []).filter((el) => el.offsetParent !== null && !el.hasAttribute("disabled"));
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    window.addEventListener("keydown", trap);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", trap); previous?.focus(); };
  }, []);
  return (
    <div className={`fixed inset-0 z-50 grid bg-background/80 backdrop-blur-sm ${filter ? "filter-overlay items-end justify-items-center p-0 sm:place-items-center sm:p-4" : "place-items-center p-3"}`} onClick={onClose}>
      <div ref={ref} data-nav-scope role="dialog" aria-modal onClick={(e) => e.stopPropagation()}
        className={`max-h-[88dvh] w-full overflow-y-auto rounded-lg border border-border bg-card p-4 shadow-2xl ${filter ? "filter-dialog max-w-xl" : wide ? "max-w-2xl" : "max-w-xl"}`}>
        {children}
      </div>
    </div>
  );
}
