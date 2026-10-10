import { useState } from "react";
import { ImageOff } from "lucide-react";
import type { Programme } from "@/lib/epg";
import type { Lang } from "@/lib/i18n";
import { UX_COPY } from "@/lib/ux-copy";

export function ProgrammePoster({ p, lang }: { p: Programme; lang: Lang }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="aspect-[2/3] w-full self-start overflow-hidden rounded-md border border-border bg-secondary">
      {p.img && !failed ? <img src={p.img} alt={p.title} onError={() => setFailed(true)} referrerPolicy="no-referrer" decoding="async" className="h-full w-full object-contain" /> : (
        <div className="flex h-full flex-col items-center justify-center gap-2 p-2 text-center text-muted-foreground">
          <ImageOff className="size-7" />
          <span className="text-[10px] sm:text-xs">{UX_COPY[lang].poster}</span>
        </div>
      )}
    </div>
  );
}