"use client";

import { useEffect, useRef, useState } from "react";
import { hasWebGpu, useStill } from "@/components/preview/use-still";

type Instance = { pause(): void; resume(): void; destroy(): void; getFailureReason(): string | null };

// Option A. Shaders loads only after a WebGPU adapter is found; otherwise the page is today's look.
export function GrainPreview() {
  const ref = useRef<HTMLCanvasElement>(null);
  const instance = useRef<Instance | null>(null);
  const [ready, setReady] = useState(false);
  const still = useStill();

  useEffect(() => {
    let gone = false;
    (async () => {
      document.documentElement.dataset.shaders = "pending";
      if (!(await hasWebGpu()) || gone || !ref.current) { document.documentElement.dataset.shaders = "fallback"; return; }
      const { mountGrain } = await import("@/components/preview/gpu-grain");
      if (gone || !ref.current) return;
      const shader = await mountGrain(ref.current);
      if (gone || shader.getFailureReason()) { shader.destroy(); document.documentElement.dataset.shaders = "fallback"; return; }
      instance.current = shader;
      document.documentElement.dataset.shaders = "gpu";
      setReady(true);
    })();
    return () => { gone = true; instance.current?.destroy(); instance.current = null; };
  }, []);

  useEffect(() => {
    const shader = instance.current;
    if (!shader) return;
    if (!still) { shader.resume(); return; }
    // Keep one settled frame of grain on screen, then stop drawing.
    const timer = window.setTimeout(() => shader.pause(), 250);
    return () => window.clearTimeout(timer);
  }, [still, ready]);

  return <canvas ref={ref} aria-hidden="true" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", zIndex: 0, pointerEvents: "none", opacity: ready ? 1 : 0 }} />;
}
