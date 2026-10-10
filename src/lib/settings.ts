import { useCallback, useEffect, useState } from "react";
import type { Lang } from "./i18n";
import { initialSetup, type Region } from "./region";

export interface Settings {
  lang: Lang;
  langForced: boolean;
  satellites: number[];
  region: Region;
  channelLang: string | null;
  freeOnly: boolean;
}

const KEY = "pulseepg:settings:v2";

export function detectSettings(): Settings {
  const locale = typeof navigator !== "undefined" ? navigator.languages?.[0] ?? navigator.language : undefined;
  let tz: string | undefined;
  try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* ignore */ }
  const s = initialSetup(locale, tz);
  return { lang: s.lang, langForced: false, satellites: s.satellites, region: s.region, channelLang: null, freeOnly: false };
}

/** Settings persisted in localStorage; detected on first launch (client only). */
export function useSettings() {
  const [settings, setState] = useState<Settings | null>(null);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Settings;
        if (!saved.langForced) saved.lang = detectSettings().lang; // follow phone language unless forced
        return setState(saved);
      }
    } catch { /* ignore */ }
    const s = detectSettings();
    localStorage.setItem(KEY, JSON.stringify(s));
    setState(s);
  }, []);
  const update = useCallback((patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => {
    setState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...(typeof patch === "function" ? patch(prev) : patch) };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const reset = useCallback(() => {
    const s = detectSettings();
    localStorage.setItem(KEY, JSON.stringify(s));
    setState(s);
  }, []);
  return { settings, update, reset };
}
