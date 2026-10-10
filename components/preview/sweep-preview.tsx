"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { hasWebGpu, useStill } from "@/components/preview/use-still";

type Instance = { pause(): void; resume(): void; destroy(): void; getFailureReason(): string | null };
const MASK = "url(/assets/517-wordmark.svg)";

// Option B. A slow light sweep across the header wordmark, masked to the letterforms.
// With no WebGPU, under reduced motion, or while paused, the wordmark is exactly today's.
export function SweepPreview() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const instance = useRef<Instance | null>(null);
  const [ready, setReady] = useState(false);
  const still = useStill();

  useEffect(() => {
    const link = document.querySelector<HTMLElement>(".site-header .brand-link");
    if (!link) return;
    const previous = link.style.position;
    link.style.position = "relative";
    setHost(link);
    return () => { link.style.position = previous; };
  }, []);

  useEffect(() => {
    if (!host) return;
    let gone = false;
    (async () => {
      document.documentElement.dataset.shaders = "pending";
      if (!(await hasWebGpu()) || gone || !ref.current) { document.documentElement.dataset.shaders = "fallback"; return; }
      const { mountSweep } = await import("@/components/preview/gpu-sweep");
      if (gone || !ref.current) return;
      const shader = await mountSweep(ref.current);
      if (gone || shader.getFailureReason()) { shader.destroy(); document.documentElement.dataset.shaders = "fallback"; return; }
      instance.current = shader;
      document.documentElement.dataset.shaders = "gpu";
      setReady(true);
    })();
    return () => { gone = true; instance.current?.destroy(); instance.current = null; };
  }, [host]);

  useEffect(() => {
    const shader = instance.current;
    if (!shader) return;
    if (still) shader.pause(); else shader.resume();
  }, [still, ready]);

  if (!host) return null;
  return createPortal(
    <canvas ref={ref} aria-hidden="true" style={{
      position: "absolute", left: 0, top: 6, width: "100%", height: "calc(100% - 12px)", pointerEvents: "none",
      mixBlendMode: "screen", opacity: ready && !still ? 1 : 0, transition: "opacity 600ms ease",
      maskImage: MASK, WebkitMaskImage: MASK, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
    }} />,
    host,
  );
}
