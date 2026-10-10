import { describe, expect, it } from "vitest";
import { detectDevice } from "./device";

describe("device interaction profiles", () => {
  it("keeps Android phones touch-first", () => expect(detectDevice("Android 14 Mobile", true)).toBe("mobile"));
  it("distinguishes an Android TV box", () => expect(detectDevice("Android 12 TV BOX", false)).toBe("android-box"));
  it("distinguishes Android TV", () => expect(detectDevice("Android TV BRAVIA", false)).toBe("android-tv"));
  it("distinguishes Fire TV Stick even with a mobile browser token", () => expect(detectDevice("Android AFTMM Mobile", false)).toBe("fire-tv"));
  it("does not treat a touch tablet as a TV box", () => expect(detectDevice("Android 14", true)).toBe("mobile"));
});