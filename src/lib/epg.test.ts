import { describe, expect, it } from "vitest";
import { parseXmltv, programmeImage } from "./epg";

describe("authentic programme artwork", () => {
  it("retains the programme icon supplied by XMLTV", () => {
    const stamp = (date: Date) => date.toISOString().replace(/[-:T]/g, "").slice(0, 14) + " +0000";
    const start = stamp(new Date());
    const stop = stamp(new Date(Date.now() + 3600000));
    const xml = `<tv><channel id="demo"><display-name>Demo HD</display-name></channel><programme start="${start}" stop="${stop}" channel="demo"><title>Film</title><icon src="https://images.example.org/film.jpg?a=1&amp;b=2" /></programme></tv>`;
    expect(parseXmltv(xml, "FR1")["demo"]?.p[0]?.img).toBe("https://images.example.org/film.jpg?a=1&b=2");
  });
  it("never renders a script URL as programme artwork", () => expect(programmeImage("javascript:alert(1)")).toBeUndefined());
  it("upgrades insecure artwork URLs", () => expect(programmeImage("http://images.example.org/film.jpg")).toBe("https://images.example.org/film.jpg"));
});
import { zoneFile } from "./epg";
describe("guide sources", () => {
  it("maps zone ids to the right source file", () => {
    expect(zoneFile("FR1")).toBe("epg_ripper_FR1.xml.gz");
    expect(zoneFile("OE_turkey1")).toBe("oe:turkey1.xml");
    expect(zoneFile("PW_GB")).toBe("pw:epg_GB.xml.gz");
  });
});

describe("attribute order", () => {
  it("parses programmes whose channel attribute comes first", () => {
    const now = new Date(); const p = (d: Date) => d.toISOString().replace(/[-:T]/g, "").slice(0, 14) + " +0000";
    const a = new Date(now.getTime() - 3600_000), b = new Date(now.getTime() + 3600_000);
    const xml = `<channel id="9"><display-name>Kanshi</display-name></channel><programme channel="9" start="${p(a)}" stop="${p(b)}"><title>Show</title></programme>`;
    expect(parseXmltv(xml, "PW_GB")["kanshi"]?.p[0]?.title).toBe("Show");
  });
});
