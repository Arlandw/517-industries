"use client";

import { useEffect, useRef } from "react";
import { ditherImage } from "@/lib/dither";

// The 517 letterforms from public/assets/517-wordmark.svg, nothing else.
// Ordered Bayer via ditherImage so the interior reads as cells, not a solid fill.
const NUMERALS = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0.8 35.65 32.9 8.45">
<path fill="#ffffff" d="m1.04 43.85v-1.39h10.27c0.89 0 1.26-0.53 1.26-1.15 0-0.72-0.48-1.14-1.35-1.14h-10.18v-4.36h12.85v1.41h-11.46v1.53h8.91c1.83 0 2.87 0.99 2.87 2.5 0 1.62-1.14 2.63-2.97 2.63h-10.2v-0.03z"/>
<path fill="#ffffff" d="m18.28 43.85v-6.63h-2.73v-1.4h4.3v8.03h-1.57z"/>
<path fill="#ffffff" d="m23.31 43.85 8.22-6.58h-10.1v-1.45h11.84c0.6 0 0.87 0.32 0.87 0.8 0 0.38-0.15 0.67-0.54 0.97l-7.89 6.26h-2.4z"/>
</svg>`;

const COLS = 172;
const ROWS = 46;
const PAPER: [number, number, number] = [0x12 / 255, 0x12 / 255, 0x12 / 255];
const INK: [number, number, number] = [0xe6 / 255, 0xe1 / 255, 0xd8 / 255];

export function DitherNumerals() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const image = new Image();
    const url = URL.createObjectURL(new Blob([NUMERALS], { type: "image/svg+xml" }));
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (cancelled) return;
      canvas.width = COLS;
      canvas.height = ROWS;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return;
      ctx.clearRect(0, 0, COLS, ROWS);
      ctx.drawImage(image, 0, 0, COLS, ROWS);
      const pixels = ctx.getImageData(0, 0, COLS, ROWS);
      const src = pixels.data;
      for (let y = 0; y < ROWS; y += 1) {
        const lift = 0.5 + 0.18 * (1 - y / ROWS);
        for (let x = 0; x < COLS; x += 1) {
          const i = (y * COLS + x) * 4;
          const alpha = (src[i + 3] ?? 0) / 255;
          if (alpha < 0.08) {
            src[i] = 0;
            src[i + 1] = 0;
            src[i + 2] = 0;
            src[i + 3] = 0;
            continue;
          }
          const tone = Math.round(Math.min(1, alpha * lift) * 255);
          src[i] = tone;
          src[i + 1] = tone;
          src[i + 2] = tone;
          src[i + 3] = 255;
        }
      }
      const dithered = ditherImage(pixels, { method: "bayer4", palette: [PAPER, INK] });
      const out = dithered.data;
      for (let i = 0; i < out.length; i += 4) {
        if ((out[i] ?? 0) < 48) out[i + 3] = 0;
      }
      ctx.putImageData(dithered, 0, 0);
    };
    image.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      className="dither-numerals"
      width={COLS}
      height={ROWS}
      aria-hidden="true"
    />
  );
}
