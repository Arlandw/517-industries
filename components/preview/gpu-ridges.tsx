"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { hasWebGpu } from "@/components/preview/use-still";

type Instance = { update(id: string, props: Record<string, number>): void; pause(): void; resume(): void; destroy(): void; getFailureReason(): string | null };
type Mode = "pending" | "gpu" | "canvas";

// The same classes and icons the homepage Button renders, so the control looks identical
// without sharing (and so reshaping) the homepage chunks.
const TOGGLE_CLASS = "inline-flex shrink-0 items-center justify-center text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50 h-8 gap-1.5 rounded-md px-3 has-[>svg]:px-2.5 motion-toggle";
const Icon = ({ play }: { play: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={play ? "lucide lucide-play" : "lucide lucide-pause"} aria-hidden="true">
    {play ? <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" /> : <><rect x="14" y="3" width="5" height="18" rx="1" /><rect x="5" y="3" width="5" height="18" rx="1" /></>}
  </svg>
);

// Option C. The same motion logic as components/scroll-ridges.tsx, drawn through a Shaders
// custom shader when WebGPU is available. Without WebGPU it renders the page's own
// ScrollRidges (passed in as fallback), which is exactly today's canvas.
export function GpuRidges({ fallback }: { fallback: ReactNode }) {
  const gpuRef = useRef<HTMLCanvasElement>(null);
  const shader = useRef<Instance | null>(null);
  const motion = useRef({ position: 0, time: 0, x: 0, y: 0 });
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [mode, setMode] = useState<Mode>("pending");

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    let gone = false;
    (async () => {
      document.documentElement.dataset.shaders = "pending";
      const fallback = () => { if (!gone) { document.documentElement.dataset.shaders = "fallback"; setMode("canvas"); } };
      if (!(await hasWebGpu()) || gone || !gpuRef.current) return fallback();
      const { mountRidges } = await import("@/components/preview/gpu-ridges-shader");
      if (gone || !gpuRef.current) return;
      const instance = await mountRidges(gpuRef.current, { pos: 0, px: 0, py: 0, tm: 0, tp: 0 });
      if (gone || instance.getFailureReason()) { instance.destroy(); return fallback(); }
      shader.current = instance;
      document.documentElement.dataset.shaders = "gpu";
      setMode("gpu");
    })();
    return () => { gone = true; shader.current?.destroy(); shader.current = null; };
  }, []);

  useEffect(() => {
    if (mode !== "gpu") return;
    const state = motion.current;
    let width = 0, height = 0, frame = 0, last = 0, settle = 0;
    let anchors = [0, 1, 2], target = state.position, targetX = 0, targetY = 0;
    const still = paused || reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function readPosition() {
      const scroll = window.scrollY;
      const i = scroll < anchors[1] ? 0 : 1;
      target = i + Math.max(0, Math.min(1, (scroll - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i])));
    }
    function draw() {
      const px = reduced ? 0 : state.x, py = reduced ? 0 : state.y, tm = reduced ? 0 : state.time;
      const gpu = shader.current;
      if (!gpu) return;
      const pos = Math.max(0, Math.min(2, state.position));
      gpu.update("ridges", { pos, px, py, tm, tp: reduced ? 0 : pos });
      if (still) {
        // Draw this one frame, then let the GPU rest until something changes.
        gpu.resume();
        cancelAnimationFrame(settle);
        settle = requestAnimationFrame(() => { settle = requestAnimationFrame(() => gpu.pause()); });
      }
    }
    function measure() {
      width = document.documentElement.clientWidth;
      height = window.innerHeight;
      anchors = [0, ...["exploration", "closing"].map(id => {
        const section = document.getElementById(id);
        return section ? section.getBoundingClientRect().top + window.scrollY : document.documentElement.scrollHeight - height;
      })];
      readPosition();
      if (!paused) state.position = reduced ? Math.round(target) : target;
      draw();
    }
    function tick(now: number) {
      frame = 0;
      if (document.hidden || still) return;
      const dt = Math.min(now - last, 80);
      last = now;
      const damping = 1 - Math.exp(-dt / 110);
      state.position += (target - state.position) * damping;
      state.x += (targetX - state.x) * damping;
      state.y += (targetY - state.y) * damping;
      state.time += dt / 1000;
      draw();
      frame = requestAnimationFrame(tick);
    }
    function wake() { if (!frame && !still && !document.hidden) { last = performance.now(); frame = requestAnimationFrame(tick); } }
    function onScroll() {
      readPosition();
      if (reduced) { const chapter = Math.round(target); if (state.position !== chapter) { state.position = chapter; draw(); } }
      else if (still) draw();
      else wake();
    }
    function onPointer(event: PointerEvent) {
      if (still || event.pointerType === "touch") return;
      targetX = event.clientX / width * 2 - 1;
      targetY = event.clientY / height * 2 - 1;
    }
    function resetPointer() { targetX = targetY = 0; }
    function onVisibility() { cancelAnimationFrame(frame); frame = 0; if (!document.hidden) { readPosition(); wake(); } }
    if (!still) shader.current?.resume();
    measure();
    const observer = new ResizeObserver(measure);
    document.querySelectorAll("main > section").forEach(section => observer.observe(section));
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.documentElement.addEventListener("pointerleave", resetPointer);
    document.addEventListener("visibilitychange", onVisibility);
    wake();
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(settle);
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", resetPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [paused, reduced, mode]);

  if (mode === "canvas") return <>{fallback}</>;
  return <>
    <canvas ref={gpuRef} className="scroll-ridges" aria-hidden="true" />
    <button type="button" data-slot="button" data-variant="outline" data-size="sm" className={TOGGLE_CLASS} onClick={() => setPaused(value => !value)} disabled={reduced} aria-pressed={paused || reduced}>
      <Icon play={paused || reduced} />
      {reduced ? "Reduced motion" : paused ? "Resume motion" : "Pause motion"}
    </button>
  </>;
}
