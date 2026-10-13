import type React from "react";
import { useMemo, useState } from "react";
import type { Channel } from "@/lib/catalog";
import type { EpgChannel, Programme } from "@/lib/epg";
import { categorize } from "@/lib/categories";
import { highlightFor, type Video } from "@/lib/highlights";
import { eventKey, isReplay, parseMatch } from "@/lib/sports";
import type { Lang } from "@/lib/i18n";
import { reminderKey, type Reminder } from "@/lib/prefs";

const COPY: Record<Lang, { live: string; soon: string; free: string; paid: string; freeOnly: string; matches: string; none: string; channels: string; ended: string; summary: string; noSummary: string; watchYt: string }> = {
  fr: { live: "En direct", soon: "Prochainement", free: "En clair", paid: "Crypté", freeOnly: "En clair seulement", matches: "Matchs", none: "Aucun événement sportif trouvé dans le guide.", channels: "chaînes", ended: "Terminés", summary: "Résumé", noSummary: "Pas encore de résumé officiel trouvé.", watchYt: "Le diffuseur réserve ce résumé à YouTube — ouvrir la vidéo" },
  en: { live: "Live now", soon: "Coming up", free: "Free-to-air", paid: "Encrypted", freeOnly: "Free-to-air only", matches: "Matches", none: "No sports events found in the guide.", channels: "channels", ended: "Finished", summary: "Highlights", noSummary: "No official highlights found yet.", watchYt: "The rights holder only allows this on YouTube — open the video" },
  ar: { live: "مباشر الآن", soon: "قريبًا", free: "مفتوح", paid: "مشفر", freeOnly: "المفتوح فقط", matches: "مباريات", none: "لا توجد أحداث رياضية في الدليل.", channels: "قنوات", ended: "انتهت", summary: "الملخص", noSummary: "لم يتم العثور على ملخص رسمي بعد.", watchYt: "صاحب الحقوق يسمح بالمشاهدة على يوتيوب فقط — افتح الفيديو" },
  es: { live: "En directo", soon: "Próximamente", free: "En abierto", paid: "Codificado", freeOnly: "Solo en abierto", matches: "Partidos", none: "No hay eventos deportivos en la guía.", channels: "canales", ended: "Finalizados", summary: "Resumen", noSummary: "Aún no hay resumen oficial.", watchYt: "El titular solo lo permite en YouTube — abrir el vídeo" },
  pt: { live: "Ao vivo", soon: "Em breve", free: "Aberto", paid: "Codificado", freeOnly: "Só abertos", matches: "Jogos", none: "Nenhum evento esportivo no guia.", channels: "canais", ended: "Encerrados", summary: "Melhores momentos", noSummary: "Ainda sem resumo oficial.", watchYt: "O detentor só permite no YouTube — abrir o vídeo" },
  de: { live: "Jetzt live", soon: "Demnächst", free: "Frei empfangbar", paid: "Verschlüsselt", freeOnly: "Nur frei", matches: "Spiele", none: "Keine Sportereignisse im Guide.", channels: "Sender", ended: "Beendet", summary: "Highlights", noSummary: "Noch keine offiziellen Highlights.", watchYt: "Nur auf YouTube erlaubt — Video öffnen" },
  tr: { live: "Şimdi canlı", soon: "Yakında", free: "Şifresiz", paid: "Şifreli", freeOnly: "Sadece şifresiz", matches: "Maçlar", none: "Rehberde spor etkinliği yok.", channels: "kanal", ended: "Bitti", summary: "Özet", noSummary: "Henüz resmi özet bulunamadı.", watchYt: "Hak sahibi yalnızca YouTube’da izin veriyor — videoyu aç" },
};

const HL: Record<Lang, string> = {fr: "résumé", en: "highlights", ar: "ملخص", es: "resumen", pt: "melhores momentos", de: "highlights", tr: "özet"};
const SPORT_CH = /sport|bein|ssc|eurosport|arena|espn|dazn|novasport|tivibu|kass|ad sports|abu dhabi sports|dubai sports|arryadia|setanta|sky sport|movistar (?:liga|deportes)|nova sport/i;
interface Event { key: string; p: Programme; match: boolean; airings: Channel[] }

export function SportsView({ channels, guideOf, now, lang, onOpen, hasRem, toggleRem }: {
  channels: Channel[]; guideOf: (c: Channel) => EpgChannel | undefined; now: number; lang: Lang; onOpen: (c: Channel) => void;
  hasRem: (k: string) => boolean; toggleRem: (r: Reminder) => void;
}) {
  const [player, setPlayer] = useState<{ title: string; v: Video | null; embed: boolean; q: string; busy: boolean } | null>(null);
  const openSummary = async (e: Event) => {
    const title = e.p.title.replace(/^\s*(live|direct|en direct|directo|en vivo|ao vivo|canlı|مباشر)\s*[:\-–|]?\s*/i, "");
    const q = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${HL[lang]}`)}`;
    setPlayer({ title, v: null, embed: false, q, busy: true });
    const m = parseMatch(e.p.title);
    const r = m ? await highlightFor(m.home, m.away, e.p.start) : null;
    setPlayer({ title, v: r?.v ?? null, embed: !!r?.embed, q, busy: false });
  };
  const [view, setView] = useState<"live" | "soon" | "ended">("live");
  const t = COPY[lang];
  const [freeOnly, setFreeOnly] = useState(false);
  const [matchOnly, setMatchOnly] = useState(true);

  const events = useMemo(() => {
    const horizon = now + 24 * 3600_000;
    const map = new Map<string, Event>();
    for (const c of channels) {
      for (const p of guideOf(c)?.p ?? []) {
        if (p.stop <= now - 24 * 3600_000 || p.start > horizon) continue;
        
        const sporty = categorize(`${p.cat ?? ""} ${p.title}`) === "sport" || (SPORT_CH.test(c.name) && (!p.cat || categorize(p.cat) === "other"));
        if (!sporty || isReplay(p.title)) continue;
        const match = !!parseMatch(p.title);
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
  const live = shown.filter((e) => e.p.start <= now && e.p.stop > now);
  const ended = shown.filter((e) => e.p.stop <= now).reverse();
  const soon = shown.filter((e) => e.p.start > now);
  const fmt = (ms: number) => new Date(ms).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });

  const Card = ({ e }: { e: Event }) => {
    const pct = Math.min(100, Math.max(0, ((now - e.p.start) / (e.p.stop - e.p.start)) * 100));
    const isEnded = e.p.stop <= now;
    const isLive = e.p.start <= now && !isEnded;
    return (
      <article {...(isEnded ? { role: "button", tabIndex: 0, "data-nav": true, onClick: () => void openSummary(e), onKeyDown: (k: React.KeyboardEvent) => { if (k.key === "Enter") void openSummary(e); } } : {})} className={`rounded-xl border border-border bg-card p-3 ${isEnded ? "cursor-pointer hover:border-primary" : ""}`}>
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className={isLive ? "font-bold text-primary" : "text-muted-foreground"}>{isLive ? `● ${t.live}` : fmt(e.p.start)} – {fmt(e.p.stop)}</span>
          <span className="flex items-center gap-2">
            {e.p.cat && <span className="truncate text-muted-foreground">{e.p.cat}</span>}
            {isEnded && <span className="chip h-8 min-h-8 px-2 text-xs">▶ {t.summary}</span>}
            {!isLive && !isEnded && (() => { const c = e.airings[0]!; const r = { key: reminderKey(c.name, e.p.start), channel: c.name, title: e.p.title, start: e.p.start }; const on = hasRem(r.key);
              return <button data-nav data-on={on} onClick={() => toggleRem(r)} aria-label="🔔" className="chip h-8 min-h-8 px-2 text-xs">🔔{on ? " ✓" : ""}</button>; })()}
          </span>
        </div>
        <h3 className="mt-1 font-semibold leading-snug">{e.p.title}</h3>
        {isLive && <div className="mt-2 h-1 overflow-hidden rounded bg-secondary"><div className="h-full bg-primary" style={{ width: `${pct}%` }} /></div>}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {e.airings.slice(0, 8).map((c) => (
            <button key={c.id} data-nav onClick={(ev) => { ev.stopPropagation(); onOpen(c); }} className="chip h-auto min-h-9 gap-1 px-2 py-1 text-xs">
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
        <button data-nav data-on={view === "ended"} onClick={() => setView("ended")} className="chip text-sm">✓ {t.ended} · {ended.length}</button>
        <button data-nav data-on={matchOnly} onClick={() => setMatchOnly((v) => !v)} className="chip text-sm">⚽ {t.matches}</button>
        <button data-nav data-on={freeOnly} onClick={() => setFreeOnly((v) => !v)} className="chip text-sm">🔓 {t.freeOnly}</button>
      </div>
      {!shown.length && <p className="py-16 text-center text-muted-foreground">{t.none}</p>}
      {shown.length > 0 && <div className="grid gap-2 md:grid-cols-2">{(view === "live" ? live : view === "ended" ? ended.slice(0, 80) : soon.slice(0, 80)).map((e) => <Card key={e.key} e={e} />)}</div>}
      {player && (
        <div role="dialog" aria-modal className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-3" onClick={() => setPlayer(null)}>
          <div className="w-full max-w-3xl space-y-2 rounded-xl border border-border bg-card p-3" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">{player.title}</h3><button data-nav autoFocus onClick={() => setPlayer(null)} className="chip">✕</button></div>
            {player.busy ? <p className="py-10 text-center text-muted-foreground">…</p> : player.v ? (
              <>
                {player.embed ? <div className="aspect-video overflow-hidden rounded-lg bg-secondary"><iframe className="size-full" src={`https://www.youtube-nocookie.com/embed/${player.v.id}?autoplay=1`} title={player.v.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div> : (
                  <a data-nav href={`https://www.youtube.com/watch?v=${player.v.id}`} target="_blank" rel="noopener noreferrer" className="relative block aspect-video overflow-hidden rounded-lg bg-secondary">
                    <img src={`https://i.ytimg.com/vi/${player.v.id}/hqdefault.jpg`} alt={player.v.title} className="size-full object-cover" />
                    <span className="absolute inset-0 grid place-items-center bg-background/50 text-sm font-semibold">▶ {t.watchYt}</span>
                  </a>
                )}
                <p className="text-xs text-muted-foreground">{player.v.channel} · {player.v.title}</p>
              </>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">{t.noSummary}</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
