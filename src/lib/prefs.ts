import { useCallback, useEffect, useState } from "react";

function useStored<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(initial);
  useEffect(() => {
    try { const r = localStorage.getItem(key); if (r) setV(JSON.parse(r) as T); } catch { /* ignore */ }
  }, [key]);
  const set = useCallback((fn: (p: T) => T) => setV((p) => {
    const n = fn(p); localStorage.setItem(key, JSON.stringify(n)); return n;
  }), [key]);
  return [v, set] as const;
}

export function useFavorites() {
  const [favs, set] = useStored<string[]>("pulseepg:favs", []);
  const toggle = (id: string) => set((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  return { favs, toggle };
}

export interface Reminder { key: string; channel: string; title: string; start: number }
export const reminderKey = (channel: string, start: number) => `${channel}|${start}`;

export function useReminders(onFire: (r: Reminder) => void) {
  const [list, set] = useStored<Reminder[]>("pulseepg:reminders", []);
  const toggle = (r: Reminder) => {
    set((p) => (p.some((x) => x.key === r.key) ? p.filter((x) => x.key !== r.key) : [...p, r]));
    if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission();
  };
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      const due = list.filter((r) => r.start - now <= 60_000);
      if (!due.length) return;
      due.forEach((r) => {
        if (r.start > now - 10 * 60_000) {
          onFire(r);
          if (typeof Notification !== "undefined" && Notification.permission === "granted") new Notification(r.channel, { body: r.title });
        }
      });
      set((p) => p.filter((x) => !due.some((d) => d.key === x.key)));
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [list, onFire, set]);
  return { reminders: list, toggle, has: (k: string) => list.some((r) => r.key === k) };
}
