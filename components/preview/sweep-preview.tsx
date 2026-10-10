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
  const [box, setBox] = useState({ left: 0, top: 0, width: 0, height: 0 });
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
    // Track the wordmark image box so the mask always sits exactly on the letterforms.
    const image = link.querySelector("img");
    const place = () => { if (image) setBox({ left: image.offsetLeft, top: image.offsetTop, width: image.offsetWidth, height: image.offsetHeight }); };
    place();
    const observer = new ResizeObserver(place);
    if (image) observer.observe(image);
    return () => { observer.disconnect(); link.style.position = previous; };
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
    <span aria-hidden="true" style={{
      position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height, overflow: "hidden", pointerEvents: "none",
      mixBlendMode: "screen", opacity: ready && !still ? 1 : 0, transition: "opacity 600ms ease",
      maskImage: MASK, WebkitMaskImage: MASK, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
    }}>
      <canvas ref={ref} style={{ display: "block", width: "100%", height: "100%" }} />
    </span>,
    host,
  );
}
