"use client";

import { useEffect, useState } from "react";

// True while motion should stand still: the reader prefers reduced motion,
// or the Pause motion control is pressed.
export function useStill() {
  const [still, setStill] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let observer: MutationObserver | undefined;
    let toggle: Element | null = null;
    const update = () => setStill(media.matches || toggle?.getAttribute("aria-pressed") === "true");
    const attach = () => {
      const found = document.querySelector(".motion-toggle");
      if (found && found !== toggle) {
        toggle = found;
        observer?.disconnect();
        observer = new MutationObserver(update);
        observer.observe(found, { attributes: true, attributeFilter: ["aria-pressed"] });
      }
      update();
    };
    attach();
    const retry = window.setTimeout(attach, 400);
    media.addEventListener("change", update);
    return () => { observer?.disconnect(); window.clearTimeout(retry); media.removeEventListener("change", update); };
  }, []);
  return still;
}

type GpuNavigator = Navigator & { gpu?: { requestAdapter(): Promise<unknown> } };

// Resolves true only when a WebGPU adapter exists. Without one every preview keeps today's look.
export async function hasWebGpu() {
  const gpu = (navigator as GpuNavigator).gpu;
  if (!gpu) return false;
  try { return Boolean(await gpu.requestAdapter()); } catch { return false; }
}
