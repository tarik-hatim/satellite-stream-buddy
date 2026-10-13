import { describe, expect, it } from "vitest";
import { eventKey, parseMatch } from "./sports";

describe("sports match detection", () => {
  it("detects multilingual separators", () => {
    expect(parseMatch("PSG vs Marseille")).not.toBeNull();
    expect(parseMatch("Real Madrid - Barcelona")).not.toBeNull();
    expect(parseMatch("Flamengo x Palmeiras")).not.toBeNull();
    expect(parseMatch("الهلال ضد النصر")).not.toBeNull();
    expect(parseMatch("France contre Italie")).not.toBeNull();
  });
  it("extracts teams from the last segment of prefixed guide titles", () => {
    expect(parseMatch("EFL 26/27: West Ham Utd v QPR")).toEqual({ home: "west ham utd", away: "qpr" });
    expect(parseMatch("Liga niemiecka - mecz: SC Freiburg - FC Schalke 04")).toEqual({ home: "freiburg", away: "schalke 04" });
    expect(parseMatch("MNF: Coventry v Newcastle Hlts")).toEqual({ home: "coventry", away: "newcastle" });
    expect(parseMatch("Classic Match : Everton - Liverpool (2007/08)")).toBeNull();
  });
  it("rejects replays and recaps", () => {
    expect(parseMatch("Rediffusion : PSG vs Marseille")).toBeNull();
    expect(parseMatch("Résumé PSG - OM")).toBeNull();
    expect(parseMatch("إعادة الهلال ضد النصر")).toBeNull();
  });
  it("groups the same match across channels regardless of wording", () => {
    const t = Date.UTC(2026, 9, 12, 19, 0);
    expect(eventKey("LIVE: PSG vs Marseille", t)).toBe(eventKey("Marseille - PSG", t + 10 * 60_000));
  });
});
