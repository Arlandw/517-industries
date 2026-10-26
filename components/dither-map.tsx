"use client";

import { useEffect, useRef } from "react";
import { isInked } from "@/lib/dither";

const COLS = 400;
const ROWS = 280;
const PAPER = [0x1c, 0x1c, 0x1c] as const;
const INK = [0xe6, 0xe1, 0xd8] as const;
const ROAD_TONE = 0.82;

const ALT = "Street map of the Legacy area of Plano, Texas, with a pin at 7250 Dallas Parkway, beside the Dallas North Tollway and Legacy Drive.";

// The office map's minor lanes are thinner than a cell, so only the street grid
// and the tollway are kept. Strokes are in viewBox units (the source uses
// non-scaling strokes, which blow up into a solid field at this size). Each
// road pixel is a mid tone, then Bayer-inked with the dithercn matrix. The
// card stays paper, so the dither sits on the roads.
const prepareMap = (source: string) =>
  source.replace(/<path\b[^>]*\/>/g, (path) => {
    const opacity = Number(/stroke-opacity="([0-9.]+)"/.exec(path)?.[1] ?? "0");
    if (opacity < 0.52) return "";
    const weight = opacity >= 0.75 ? 11 : 6;
    return path
      .replace(/\svector-effect="non-scaling-stroke"/g, "")
      .replace(/fill="[^"]*"/, 'fill="none"')
      .replace(/stroke="#[0-9A-Fa-f]+"/, 'stroke="#e6e1d8"')
      .replace(/stroke-opacity="[0-9.]+"/, 'stroke-opacity="1"')
      .replace(/stroke-width="[0-9.]+"/, `stroke-width="${weight}"`);
  });

export function DitherMap() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const draw = async () => {
      const response = await fetch("/assets/office-map.svg");
      const source = await response.text();
      if (cancelled) return;
      const url = URL.createObjectURL(new Blob([prepareMap(source)], { type: "image/svg+xml" }));
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        if (cancelled) return;
        canvas.width = COLS;
        canvas.height = ROWS;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.fillStyle = "#1c1c1c";
        ctx.fillRect(0, 0, COLS, ROWS);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(image, 0, 0, COLS, ROWS);
        const pixels = ctx.getImageData(0, 0, COLS, ROWS);
        const data = pixels.data;
        for (let y = 0; y < ROWS; y += 1) {
          for (let x = 0; x < COLS; x += 1) {
            const offset = (y * COLS + x) * 4;
            const luma = (data[offset] ?? 0) * 0.299 + (data[offset + 1] ?? 0) * 0.587 + (data[offset + 2] ?? 0) * 0.114;
            const tone = luma > 56 ? ROAD_TONE : 0;
            const ink = isInked("bayer4", x, y, tone);
            data[offset] = ink ? INK[0] : PAPER[0];
            data[offset + 1] = ink ? INK[1] : PAPER[1];
            data[offset + 2] = ink ? INK[2] : PAPER[2];
            data[offset + 3] = 255;
          }
        }
        ctx.putImageData(pixels, 0, 0);
      };
      image.onerror = () => URL.revokeObjectURL(url);
      image.src = url;
    };
    void draw();
    return () => {
      cancelled = true;
    };
  }, []);

  return <canvas ref={ref} className="dither-map" width={COLS} height={ROWS} role="img" aria-label={ALT} />;
}
