import { useMemo, useState } from "react";
import type { Channel } from "@/lib/catalog";
import type { EpgChannel, Programme } from "@/lib/epg";
import { categorize } from "@/lib/categories";
import { eventKey, isReplay, parseMatch } from "@/lib/sports";
import type { Lang } from "@/lib/i18n";
import { reminderKey, type Reminder } from "@/lib/prefs";

const COPY: Record<Lang, { live: string; soon: string; free: string; paid: string; freeOnly: string; matches: string; none: string; channels: string }> = {
  fr: { live: "En direct", soon: "Prochainement", free: "En clair", paid: "Crypté", freeOnly: "En clair seulement", matches: "Matchs", none: "Aucun événement sportif trouvé dans le guide.", channels: "chaînes" },
  en: { live: "Live now", soon: "Coming up", free: "Free-to-air", paid: "Encrypted", freeOnly: "Free-to-air only", matches: "Matches", none: "No sports events found in the guide.", channels: "channels" },
  ar: { live: "مباشر الآن", soon: "قريبًا", free: "مفتوح", paid: "مشفر", freeOnly: "المفتوح فقط", matches: "مباريات", none: "لا توجد أحداث رياضية في الدليل.", channels: "قنوات" },
  es: { live: "En directo", soon: "Próximamente", free: "En abierto", paid: "Codificado", freeOnly: "Solo en abierto", matches: "Partidos", none: "No hay eventos deportivos en la guía.", channels: "canales" },
  pt: { live: "Ao vivo", soon: "Em breve", free: "Aberto", paid: "Codificado", freeOnly: "Só abertos", matches: "Jogos", none: "Nenhum evento esportivo no guia.", channels: "canais" },
  de: { live: "Jetzt live", soon: "Demnächst", free: "Frei empfangbar", paid: "Verschlüsselt", freeOnly: "Nur frei", matches: "Spiele", none: "Keine Sportereignisse im Guide.", channels: "Sender" },
  tr: { live: "Şimdi canlı", soon: "Yakında", free: "Şifresiz", paid: "Şifreli", freeOnly: "Sadece şifresiz", matches: "Maçlar", none: "Rehberde spor etkinliği yok.", channels: "kanal" },
};

interface Event { key: string; p: Programme; match: boolean; airings: Channel[] }

export function SportsView({ channels, guideOf, now, lang, onOpen, hasRem, toggleRem }: {
  channels: Channel[]; guideOf: (c: Channel) => EpgChannel | undefined; now: number; lang: Lang; onOpen: (c: Channel) => void;
  hasRem: (k: string) => boolean; toggleRem: (r: Reminder) => void;
}) {
  const [view, setView] = useState<"live" | "soon">("live");
  const t = COPY[lang];
  const [freeOnly, setFreeOnly] = useState(false);
  const [matchOnly, setMatchOnly] = useState(true);

  const events = useMemo(() => {
    const horizon = now + 24 * 3600_000;
    const map = new Map<string, Event>();
    for (const c of channels) {
      for (const p of guideOf(c)?.p ?? []) {
        if (p.stop <= now || p.start > horizon) continue;
        const match = !!parseMatch(p.title);
        if (!match && (isReplay(p.title) || categorize(`${p.cat ?? ""} ${p.title}`) !== "sport")) continue;
        if (match && p.cat && categorize(p.cat) !== "sport" && categorize(p.cat) !== "other") continue;
        const key = eventKey(p.title, p.start);
        const e = map.get(key) ?? { key, p, match, airings: [] };
        if (!e.airings.some((x) => x.id === c.id)) e.airings.push(c);
        map.set(key, e);
      }
    }
    return [...map.values()].sort((a, b) => a.p.start - b.p.start);
  }, [channels, guideOf, now]);

  const shown = events
    .filter((e) => !matchOnly || e.match)
    .map((e) => ({ ...e, airings: freeOnly ? e.airings.filter((c) => !c.ca) : e.airings }))
    .filter((e) => e.airings.length);
  const live = shown.filter((e) => e.p.start <= now);
  const soon = shown.filter((e) => e.p.start > now);
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });

  const Card = ({ e }: { e: Event }) => {
    const pct = Math.min(100, Math.max(0, ((now - e.p.start) / (e.p.stop - e.p.start)) * 100));
    const isLive = e.p.start <= now;
    return (
      <article className="rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={isLive ? "font-bold text-primary" : "text-muted-foreground"}>{isLive ? `● ${t.live}` : fmt(e.p.start)} – {fmt(e.p.stop)}</span>
          <span className="flex items-center gap-2">
            {e.p.cat && <span className="truncate text-muted-foreground">{e.p.cat}</span>}
            {!isLive && (() => { const c = e.airings[0]!; const r = { key: reminderKey(c.name, e.p.start), channel: c.name, title: e.p.title, start: e.p.start }; const on = hasRem(r.key);
              return <button data-nav data-on={on} onClick={() => toggleRem(r)} aria-label="🔔" className="chip h-8 min-h-8 px-2 text-xs">🔔{on ? " ✓" : ""}</button>; })()}
          </span>
        </div>
        <h3 className="mt-1 font-semibold leading-snug">{e.p.title}</h3>
        {isLive && <div className="mt-2 h-1 overflow-hidden rounded bg-secondary"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {e.airings.slice(0, 8).map((c) => (
            <button key={c.id} data-nav onClick={() => onOpen(c)} className="chip h-auto min-h-9 gap-1 px-2 py-1 text-xs">
              <span className={`size-2 rounded-full ${c.ca ? "bg-destructive" : "bg-primary"}`} aria-hidden />
              {c.name}<span className="text-muted-foreground">· {c.ca ? t.paid : t.free}</span>
            </button>
          ))}
          {e.airings.length > 8 && <span className="self-center text-xs text-muted-foreground">+{e.airings.length - 8} {t.channels}</span>}
        </div>
      </article>
    );
  };

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <button data-nav data-on={view === "live"} onClick={() => setView("live")} className="chip text-sm">● {t.live} · {live.length}</button>
        <button data-nav data-on={view === "soon"} onClick={() => setView("soon")} className="chip text-sm">🕒 {t.soon} (24h) · {soon.length}</button>
        <button data-nav data-on={matchOnly} onClick={() => setMatchOnly((v) => !v)} className="chip text-sm">⚽ {t.matches}</button>
        <button data-nav data-on={freeOnly} onClick={() => setFreeOnly((v) => !v)} className="chip text-sm">🔓 {t.freeOnly}</button>
      </div>
      {!shown.length && <p className="py-16 text-center text-muted-foreground">{t.none}</p>}
      {shown.length > 0 && <div className="grid gap-2 md:grid-cols-2">{(view === "live" ? live : soon.slice(0, 80)).map((e) => <Card key={e.key} e={e} />)}</div>}
    </section>
  );
}
