import { describe, expect, it } from "vitest";
import { initialSetup } from "./region";

describe("first-launch auto-select", () => {
  it("Arabic / MENA → Nilesat, Badr, Hotbird, Astra 19.2, Eutelsat 7E", () => {
    expect(initialSetup("ar-MA").satellites).toEqual([11, 1, 2, 0, 3]);
    expect(initialSetup("ar").lang).toBe("ar");
  });
  it("French speaker in Morocco gets MENA satellites with French UI", () => {
    const s = initialSetup("fr-MA");
    expect(s.lang).toBe("fr");
    expect(s.satellites).toEqual([11, 1, 2, 0, 3]);
  });
  it("time zone decides MENA when locale has no country", () => {
    expect(initialSetup("fr", "Africa/Casablanca").satellites).toEqual([11, 1, 2, 0, 3]);
  });
  it("LATAM → Hispasat, Star One, Amazonas, SES-6, never Astra 19.2 or Badr", () => {
    const s = initialSetup("pt-BR");
    expect(s.satellites).toEqual([8, 6, 12, 10]);
    expect(s.satellites).not.toContain(0);
    expect(s.satellites).not.toContain(1);
  });
  it("European languages → Astra 19.2, Hotbird, Astra 28.2, Hispasat", () => {
    expect(initialSetup("de-DE").satellites).toEqual([0, 2, 5, 8]);
    expect(initialSetup("es-ES").satellites).toEqual([0, 2, 5, 8]);
  });
  it("Turkish → Türksat 42E + Hotbird", () => {
    expect(initialSetup("tr-TR").satellites).toEqual([7, 2]);
  });
  it("unknown → English + Hotbird / Astra 19.2", () => {
    const s = initialSetup(undefined);
    expect(s.lang).toBe("en");
    expect(s.satellites).toEqual([2, 0]);
  });
});
