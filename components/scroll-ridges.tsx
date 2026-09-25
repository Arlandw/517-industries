"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createRidgeField } from "@/components/ridge-field";

export function ScrollRidges() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motion = useRef({ position: 0, time: 0, x: 0, y: 0 });
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d", { alpha: false });
    if (!canvas || !ctx) return;
    const state = motion.current;
    let width = 0, height = 0, frame = 0, last = 0;
    let anchors = [0, 1, 2], target = state.position, targetX = 0, targetY = 0;
    let render: ReturnType<typeof createRidgeField> | undefined;
    const still = paused || reduced || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function readPosition() {
      const scroll = window.scrollY;
      const i = scroll < anchors[1] ? 0 : 1;
      target = i + Math.max(0, Math.min(1, (scroll - anchors[i]) / Math.max(1, anchors[i + 1] - anchors[i])));
    }
    function draw() { render?.(state.position, reduced ? 0 : state.x, reduced ? 0 : state.y, reduced ? 0 : state.time, reduced); }
    function measure() {
      if (!canvas || !ctx) return;
      width = document.documentElement.clientWidth;
      height = window.innerHeight;
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      anchors = [0, ...["exploration", "closing"].map(id => {
        const section = document.getElementById(id);
        return section ? section.getBoundingClientRect().top + window.scrollY : document.documentElement.scrollHeight - height;
      })];
      readPosition();
      if (!paused) state.position = reduced ? Math.round(target) : target;
      render = createRidgeField(ctx, width, height);
      draw();
    }
    function tick(now: number) {
      frame = 0;
      if (document.hidden || still) return;
      // Draw on every display frame; elapsed-time damping keeps the same
      // motion speed on 60Hz, 120Hz, and higher-refresh displays.
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
      else wake();
    }
    function onPointer(event: PointerEvent) {
      if (still || event.pointerType === "touch") return;
      targetX = event.clientX / width * 2 - 1;
      targetY = event.clientY / height * 2 - 1;
    }
    function resetPointer() { targetX = targetY = 0; }
    function onVisibility() { cancelAnimationFrame(frame); frame = 0; if (!document.hidden) { readPosition(); wake(); } }
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
      observer.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointer);
      document.documentElement.removeEventListener("pointerleave", resetPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [paused, reduced]);

  return <>
    <canvas ref={canvasRef} className="scroll-ridges" aria-hidden="true" />
    <Button className="motion-toggle" variant="outline" size="sm" onClick={() => setPaused(value => !value)} disabled={reduced} aria-pressed={paused || reduced}>
      {paused || reduced ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
      {reduced ? "Reduced motion" : paused ? "Resume motion" : "Pause motion"}
    </Button>
  </>;
}
