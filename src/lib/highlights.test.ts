import { describe, expect, it } from "vitest";
import { findHighlight } from "./highlights";
const t = Date.UTC(2026, 9, 11, 19);
const v = (title: string, h: number) => ({ id: "x", title, channel: "c", published: t + h * 3600_000 });
describe("findHighlight", () => {
  it("picks the official highlights of the right match", () => {
    const r = findHighlight("real madrid", "barcelona", t, [v("Atlético vs Sevilla | Highlights", 3), v("Real Madrid vs FC Barcelona | HIGHLIGHTS | LaLiga", 3)]);
    expect(r?.title).toContain("Barcelona");
  });
  it("ignores videos published before kick-off or for one team only", () => {
    expect(findHighlight("psg", "marseille", t, [v("PSG vs Marseille preview", -5), v("PSG 3-0 Lyon highlights", 3)])).toBeNull();
  });
});
