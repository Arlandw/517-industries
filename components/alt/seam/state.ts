export type SeamState = {
  paused: boolean;
  reduced: boolean;
  narrow: boolean;
  saveData: boolean;
  /** Seam slider value, 20 (manufacturing) to 80 (artificial intelligence), kept for the session. */
  value: number;
};

/** Positive leans toward manufacturing: the seam moves right and the metal side widens. */
export const bias = (value: number) => Math.min(0.6, Math.max(-0.6, (value - 50) / 50));

export function readValue() {
  const raw = Number(sessionStorage.getItem("seam-bias"));
  return raw >= 20 && raw <= 80 ? raw : 50;
}
