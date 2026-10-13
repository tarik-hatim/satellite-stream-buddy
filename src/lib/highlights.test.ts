import { describe, expect, it } from "vitest";
import { findHighlight, type Video } from "./highlights";

const now = Date.UTC(2026, 9, 13, 1);
const start = now - 30 * 3600_000; // match kicked off 30 h ago
const v = (title: string, channel: string, ageH: number, extra: Partial<Video> = {}): Video => ({
  id: title.slice(0, 11), title, channel, channelId: "", verified: true, ageMs: ageH * 3600_000, dur: 200, streamed: false, ...extra,
});

describe("findHighlight", () => {
  it("prefers the official league channel over fan and media uploads", () => {
    const r = findHighlight("real betis", "osasuna", start, [
      v("Doblete De Isco Real Betis vs Osasuna 5-2 All Highlights", "Mr. Juanlu", 10),
      v("REAL BETIS 5 - 2 CA OSASUNA | RESUMEN LALIGA EA SPORTS", "LALIGA EA SPORTS", 24, { channelId: "UCTv-XvfzLX3i4IGWAm4sbmA" }),
    ], now);
    expect(r?.channel).toBe("LALIGA EA SPORTS");
  });
  it("accepts an official club channel", () => {
    expect(findHighlight("betis", "osasuna", start, [v("Real Betis 5-2 Osasuna | Resumen", "Club Atlético Osasuna", 17)], now)?.channel).toBe("Club Atlético Osasuna");
  });
  it("rejects old meetings, unverified channels, full replays and one-team videos", () => {
    expect(findHighlight("real betis", "osasuna", start, [
      v("REAL BETIS 2 - 0 CA OSASUNA | HIGHLIGHTS", "LALIGA EA SPORTS", 8760),
      v("Betis Osasuna resumen", "LaLiga fan", 5, { verified: false }),
      v("Betis Osasuna partido completo", "LALIGA EA SPORTS", 20, { streamed: true, dur: 6000 }),
      v("Betis 3-0 Sevilla resumen", "LALIGA EA SPORTS", 5),
      v("LIVE: Press Conference: Betis vs Osasuna", "LALIGA EA SPORTS", 26),
    ], now)).toBeNull();
  });
});
