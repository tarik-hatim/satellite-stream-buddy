import { useEffect, useState } from "react";

export type DeviceMode = "mobile" | "android-box" | "android-tv" | "fire-tv" | "desktop";

/** Input capability takes precedence over viewport size for television devices. */
export function detectDevice(userAgent: string, touch: boolean): DeviceMode {
  if (/AFT\w*|Fire\s?TV/i.test(userAgent)) return "fire-tv";
  if (/Android TV|Google TV|BRAVIA|SHIELD|MiTV|SmartTV|Tizen|Web0S/i.test(userAgent)) return "android-tv";
  if (/Android/i.test(userAgent) && (!/Mobile/i.test(userAgent) && !touch || /TV BOX|Android Box|STB/i.test(userAgent))) return "android-box";
  if (touch || /Mobile|iPhone|iPad/i.test(userAgent)) return "mobile";
  return "desktop";
}

export function useDeviceMode() {
  const [detected, setDetected] = useState<DeviceMode>("desktop");
  const [override, setOverride] = useState<DeviceMode | null>(null);
  const [remoteInput, setRemoteInput] = useState(false);
  useEffect(() => {
    setDetected(detectDevice(navigator.userAgent, navigator.maxTouchPoints > 0));
    const onKey = (event: KeyboardEvent) => {
      if (event.key.startsWith("Arrow") && (event.target as HTMLElement)?.tagName !== "INPUT") setRemoteInput(true);
    };
    const onTouch = () => setRemoteInput(false);
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onTouch, { passive: true });
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("touchstart", onTouch); };
  }, []);
  const mode = override ?? detected;
  return { mode, override, setOverride, remote: mode === "android-box" || mode === "android-tv" || mode === "fire-tv" || remoteInput };
}