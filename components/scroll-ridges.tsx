"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DitherShader } from "@/lib/dither";
import type { DitherUniforms } from "@/lib/dither";

// Topo ridge from components/ridge-field.ts, drawn by the dithercn engine
// (https://github.com/opencoredev/dithercn, MIT) as ordered Bayer cells.
// The field returns a tone. The engine owns the matrix, the clock, and the still frame.
const RIDGE_FIELD = `
float ridgeHill(float u, float v, float relief, vec4 h, vec2 a) {
  float dx = u - h.x;
  float dy = v - h.y;
  float c = cos(a.y);
  float s = sin(a.y);
  float ax = (dx * c - dy * s) / h.z;
  float ay = (dx * s + dy * c) / h.w;
  return a.x * exp(-(ax * ax + ay * ay) * relief);
}

float ridgeElevation(float u, float v, float ph) {
  float e = 0.065 * sin(u * 8.0 + v * 5.0) + 0.06 * cos(v * 11.0 - u * 3.0);
  float relief = 1.0 + 0.07 * sin(u * 15.0 + v * 7.0);
  e = e + ridgeHill(u, v, relief, vec4(0.10 + 0.14 * sin(ph * 0.75), 0.30, 0.24 * (1.0 + 0.20 * sin(ph)), 0.43), vec2(1.8 + 0.26 * sin(ph * 0.8), 0.5 + 0.35 * sin(ph * 0.6)));
  e = e + ridgeHill(u, v, relief, vec4(0.54 - 0.17 * sin(ph * 0.58), 0.96 + 0.10 * sin(ph), 0.24, 0.34 * (1.0 + 0.20 * cos(ph * 0.7))), vec2(1.6 + 0.28 * sin(ph * 0.7 + 1.0), 0.45 - 0.45 * sin(ph * 0.6)));
  e = e + ridgeHill(u, v, relief, vec4(-0.33 + 0.10 * sin(ph * 0.8), 1.1, 0.34, 0.21), vec2(1.2 + 0.15 * sin(ph), -0.4));
  e = e + ridgeHill(u, v, relief, vec4(0.04 + 0.16 * sin(ph * 0.5), 1.65, 0.26, 0.42), vec2(1.85, 0.7 - 0.3 * sin(ph * 0.6)));
  e = e + ridgeHill(u, v, relief, vec4(0.53 - 0.12 * sin(ph * 0.7), 2.3, 0.29, 0.38), vec2(1.7, -0.5));
  return e;
}

float ridgeContour(float h, float hx, float hy) {
  float spacing = 0.16;
  float width = 1.45;
  float offset = abs(fract(h / spacing + 0.5) - 0.5);
  float perCell = max(length(vec2(hx - h, hy - h)) / spacing, 0.0001);
  float d = offset / perCell;
  float line = 1.0 - smoothstep(width * 0.5 - 0.5, width * 0.5 + 0.5, d);
  return line * (1.0 - smoothstep(0.06, 0.1, offset));
}

float ridgeClear(vec2 uv, vec2 res, vec4 box, float radius, float feather) {
  vec2 d = abs((uv - box.xy) * res) - box.zw * res + radius;
  float dist = length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - radius;
  return smoothstep(0.0, feather, dist);
}

float field(vec2 uv, vec2 res, float t) {
  float ph = ridgePos * 6.2831853 + sin(t * 0.16) * 0.24;
  float zoom = 1.0 + 0.12 * sin(ph * 0.7);
  float ang = 0.13 * sin(ph * 0.65) + ridgePointer.x * 0.025;
  float ca = cos(ang);
  float sa = sin(ang);
  float aspect = res.x / max(res.y, 1.0);
  float xx = ((uv.x - 0.62) * aspect) / zoom + ridgePointer.x * 0.07;
  float yy = ((1.0 - uv.y) - 0.42) / zoom + ridgePointer.y * 0.055;
  float u = xx * ca - yy * sa;
  float v = xx * sa + yy * ca + 0.5 + ridgePos * 0.48;
  u = u + 0.035 * sin(v * 6.0 - ph * 0.6);
  v = v + 0.025 * sin(u * 7.0 + ph * 0.5);
  float s = 1.0 / max(res.y, 1.0);
  float h = ridgeElevation(u, v, ph);
  float hx = ridgeElevation(u + s, v, ph);
  float hy = ridgeElevation(u, v + s, ph);
  float lines = ridgeContour(h, hx, hy);
  float shade = smoothstep(0.08, 1.45, h);
  float tone = clamp(shade * 0.46 + lines * 0.95, 0.0, 1.0);
  float clear = ridgeClear(uv, res, heroBox, heroRadius, heroFeather);
  clear = clear * ridgeClear(uv, res, footBox, heroRadius, heroFeather);
  clear = clear * ridgeClear(uv, res, markBox, heroRadius, heroFeather);
  float edge = smoothstep(0.0, 0.2, uv.y);
  return tone * clear * edge;
}
`;

type Vec2 = [number, number];
type Vec4 = [number, number, number, number];

type RidgeUniforms = {
  ridgePos: number;
  ridgePointer: Vec2;
  heroBox: Vec4;
  heroFeather: number;
  heroRadius: number;
  footBox: Vec4;
  markBox: Vec4;
};

const setBox = (box: Vec4, host: DOMRect, el: Element, pad: number) => {
  const r = el.getBoundingClientRect();
  if (host.width === 0 || host.height === 0) return;
  box[0] = (r.left - host.left + r.width / 2) / host.width;
  box[1] = 1 - (r.top - host.top + r.height / 2) / host.height;
  box[2] = (r.width / 2 + pad) / host.width;
  box[3] = (r.height / 2 + pad) / host.height;
};

export function ScrollRidges() {
  const hostRef = useRef<HTMLDivElement>(null);
  const uniforms = useRef<RidgeUniforms>({
    ridgePos: 0,
    ridgePointer: [0, 0],
    heroBox: [0.3, 0.55, 0.26, 0.32],
    heroFeather: 16,
    heroRadius: 12,
    footBox: [0.28, 0.08, 0.24, 0.05],
    markBox: [0.78, 0.5, 0.14, 0.08],
  }).current;
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const state = { position: 0, x: 0, y: 0 };
    let target = 0;
    let targetX = 0;
    let targetY = 0;
    let anchors = [0, 1, 2];
    let frame = 0;
    let last = 0;
    const still = paused || reduced;

    const measure = () => {
      const box = host.getBoundingClientRect();
      const copy = document.querySelector(".hero-copy");
      const foot = document.querySelector(".hero-foot");
      const mark = document.querySelector(".dither-numerals");
      if (copy) setBox(uniforms.heroBox, box, copy, 28);
      if (foot) setBox(uniforms.footBox, box, foot, 18);
      if (mark) setBox(uniforms.markBox, box, mark, 20);
      const height = window.innerHeight;
      anchors = [0, ...["exploration", "closing"].map((id) => {
        const section = document.getElementById(id);
        return section ? section.getBoundingClientRect().top + window.scrollY : document.documentElement.scrollHeight - height;
      })];
    };

    const readPosition = () => {
      const scroll = window.scrollY;
      const i = scroll < anchors[1] ? 0 : 1;
      const span = Math.max(1, anchors[i + 1] - anchors[i]);
      target = i + Math.max(0, Math.min(1, (scroll - anchors[i]) / span));
    };

    const tick = (now: number) => {
      frame = 0;
      if (document.hidden || still) return;
      const dt = Math.min(now - last, 80);
      last = now;
      const damping = 1 - Math.exp(-dt / 110);
      state.position += (target - state.position) * damping;
      state.x += (targetX - state.x) * damping;
      state.y += (targetY - state.y) * damping;
      uniforms.ridgePos = state.position;
      uniforms.ridgePointer[0] = state.x;
      uniforms.ridgePointer[1] = state.y;
      const settled = Math.abs(target - state.position) < 0.0008 && Math.abs(targetX - state.x) < 0.0008 && Math.abs(targetY - state.y) < 0.0008;
      if (!settled) frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      if (!frame && !still && !document.hidden) {
        last = performance.now();
        frame = requestAnimationFrame(tick);
      }
    };

    const onScroll = () => {
      readPosition();
      if (!still) wake();
    };

    const onPointer = (event: PointerEvent) => {
      if (still || event.pointerType === "touch") return;
      const box = host.getBoundingClientRect();
      targetX = event.clientX / Math.max(1, box.width) * 2 - 1;
      targetY = event.clientY / Math.max(1, box.height) * 2 - 1;
      wake();
    };

    const resetPointer = () => {
      targetX = 0;
      targetY = 0;
      wake();
    };

    const onVisibility = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (!document.hidden) wake();
    };

    measure();
    readPosition();
    if (!still) {
      uniforms.ridgePos = target;
      state.position = target;
    }
    const observer = new ResizeObserver(() => {
      measure();
      readPosition();
    });
    observer.observe(host);
    document.querySelectorAll(".hero-copy, .hero-foot, .dither-numerals").forEach((el) => observer.observe(el));
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
  }, [paused, reduced, uniforms]);

  return (
    <>
      <div className="scroll-ridges">
        <DitherShader
          ref={hostRef}
          className="absolute inset-0"
          field={RIDGE_FIELD}
          uniforms={uniforms as DitherUniforms}
          matrix="bayer4"
          cell={4}
          palette={["#121212", "#e6e1d8"]}
          stillTime={4.5}
          animate={!paused}
          fps={30}
          fallback={<div className="ridge-fallback" />}
        />
      </div>
      {mounted
        ? createPortal(
            <Button className="motion-toggle" variant="outline" size="sm" onClick={() => setPaused((value) => !value)} disabled={reduced} aria-pressed={paused || reduced}>
              {paused || reduced ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
              {reduced ? "Reduced motion" : paused ? "Resume motion" : "Pause motion"}
            </Button>,
            document.body,
          )
        : null}
    </>
  );
}
