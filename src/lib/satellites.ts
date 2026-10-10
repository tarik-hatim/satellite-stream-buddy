export type Coverage = "EU" | "MENA" | "GULF" | "AFRICA" | "CASIA" | "UK" | "TR" | "LATAM" | "NA";

export interface Satellite {
  index: number;
  name: string;
  /** Orbital position in degrees, positive = East, negative = West */
  position: number;
  coverage: Coverage[];
}

/** The 13 satellites, indexed exactly like the CHMAX/MetaMango export. */
export const SATELLITES: readonly Satellite[] = [
  { index: 0, name: "Astra 1", position: 19.2, coverage: ["EU", "MENA"] },
  { index: 1, name: "Badr 4/5/6/7", position: 26.0, coverage: ["MENA", "GULF"] },
  { index: 2, name: "Hotbird", position: 13.0, coverage: ["EU", "MENA"] },
  { index: 3, name: "Eutelsat 7B/7C", position: 7.0, coverage: ["EU", "MENA", "AFRICA"] },
  { index: 4, name: "TurkmenÄlem/MonacoSat", position: 52.0, coverage: ["MENA", "EU", "CASIA"] },
  { index: 5, name: "Astra 2", position: 28.2, coverage: ["UK", "EU"] },
  { index: 6, name: "Star One D2", position: -70.0, coverage: ["LATAM"] },
  { index: 7, name: "Türksat 3A/4A", position: 42.0, coverage: ["TR", "EU", "MENA"] },
  { index: 8, name: "Hispasat 30W-5/30W-6", position: -30.0, coverage: ["EU", "LATAM"] },
  { index: 9, name: "Astra 3B", position: 23.5, coverage: ["EU"] },
  { index: 10, name: "SES 6", position: -40.5, coverage: ["LATAM", "NA"] },
  { index: 11, name: "Nilesat 201", position: -7.0, coverage: ["MENA", "AFRICA"] },
  { index: 12, name: "Amazonas 2", position: -61.0, coverage: ["LATAM"] },
] as const;

export const formatPosition = (p: number) =>
  `${Math.abs(p).toFixed(1)}°${p >= 0 ? "E" : "W"}`;

/** CHMAX "Angle" field: tenths of degree, West stored as 3600 - x. */
export const angleToPosition = (angle: string | number) => {
  const a = Number(angle);
  return a > 1800 ? -(3600 - a) / 10 : a / 10;
};
