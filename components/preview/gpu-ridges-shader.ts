import { createShader } from "shaders/js";
import { defineShader, wgsl, ctx } from "shaders/std";

// Option C: components/ridge-field.ts on the GPU. Same height function, 28 levels at 0.08,
// every fifth line major, the light band, the copper, cobalt and patina blend, and the left fade.
// Lines are drawn per pixel from the field and its screen derivative instead of marching squares.
const RidgeContours = defineShader({
  name: "RidgeContours517",
  props: {
    pos: { default: 0 },
    px: { default: 0 },
    py: { default: 0 },
    tm: { default: 0 },
    tp: { default: 0 },
  },
  paint: wgsl({
    inputs: { lv: ctx.logicalViewportSize },
    body: `
      let W = lv.x; let H = lv.y;
      let x = uv.x * W; let y = uv.y * H;
      let ph = tp * 6.2831853 + sin(tm * 0.16) * 0.24;
      let zoom = 1.0 + 0.12 * sin(ph * 0.7);
      let ang = 0.13 * sin(ph * 0.65) + px * 0.025;
      let ca = cos(ang); let sa = sin(ang);
      let xx = ((x - W * 0.67) / H) / zoom + px * 0.07;
      let yy = (y / H - 0.5) / zoom + py * 0.055;
      var u = xx * ca - yy * sa;
      var v = xx * sa + yy * ca + 0.5 + tp * 0.48;
      u = u + 0.035 * sin(v * 6.0 - ph * 0.6);
      v = v + 0.025 * sin(u * 7.0 + ph * 0.5);
      var e = 0.065 * sin(u * 8.0 + v * 5.0) + 0.06 * cos(v * 11.0 - u * 3.0);
      let relief = 1.0 + 0.07 * sin(u * 15.0 + v * 7.0);
      var hp = array<vec4f, 5>(
        vec4f(0.10 + 0.14 * sin(ph * 0.75), 0.30, 0.24 * (1.0 + 0.20 * sin(ph)), 0.43),
        vec4f(0.54 - 0.17 * sin(ph * 0.58), 0.96 + 0.10 * sin(ph), 0.24, 0.34 * (1.0 + 0.20 * cos(ph * 0.7))),
        vec4f(-0.33 + 0.10 * sin(ph * 0.8), 1.1, 0.34, 0.21),
        vec4f(0.04 + 0.16 * sin(ph * 0.5), 1.65, 0.26, 0.42),
        vec4f(0.53 - 0.12 * sin(ph * 0.7), 2.3, 0.29, 0.38));
      var ha = array<vec2f, 5>(
        vec2f(1.8 + 0.26 * sin(ph * 0.8), 0.5 + 0.35 * sin(ph * 0.6)),
        vec2f(1.6 + 0.28 * sin(ph * 0.7 + 1.0), 0.45 - 0.45 * sin(ph * 0.6)),
        vec2f(1.2 + 0.15 * sin(ph), -0.4),
        vec2f(1.85, 0.7 - 0.3 * sin(ph * 0.6)),
        vec2f(1.7, -0.5));
      for (var i = 0; i < 5; i++) {
        let h = hp[i]; let a = ha[i];
        let dx = u - h.x; let dy = v - h.y;
        let c = cos(a.y); let s = sin(a.y);
        let ax = (dx * c - dy * s) / h.z; let ay = (dx * s + dy * c) / h.w;
        e = e + a.x * exp(-(ax * ax + ay * ay) * relief);
      }
      let dpr = max(viewport.x / W, 0.5);
      let fw = max(fwidth(e), 0.000001);
      let lvl = clamp(round(e / 0.08), 1.0, 28.0);
      let d = abs(e - lvl * 0.08) / fw / dpr;
      let major = select(0.0, 1.0, abs(lvl - 5.0 * round(lvl / 5.0)) < 0.5);
      let lt = exp(-pow((lvl - (6.0 + tp * 9.0)) / 2.2, 2.0));
      let w = mix(0.78, 1.2, major) + lt * 0.22;
      let wd = w * dpr;
      var cov = clamp((w * 0.5 - d) * dpr + 0.5, 0.0, 1.0);
      cov = cov * min(1.0, wd) / min(1.0, wd * 0.5 + 0.5);
      let p = clamp(pos, 0.0, 2.0);
      let idx = min(1.0, floor(p)); let t = p - idx; let b = t * t * (3.0 - 2.0 * t);
      let c0 = vec3f(193.0, 125.0, 80.0); let c1 = vec3f(100.0, 149.0, 208.0); let c2 = vec3f(99.0, 179.0, 157.0);
      let col = select(mix(c1, c2, b), mix(c0, c1, b), idx < 0.5);
      let line = mix(col, vec3f(255.0), lt * 0.26) / 255.0;
      let alpha = min(1.0, mix(0.39, 0.78, major) + lt * 0.24);
      let bg = vec3f(16.0, 18.0, 24.0) / 255.0;
      var o = mix(bg, line, alpha * cov);
      let sx = x / (W * 0.8);
      var fade = 0.0941;
      if (sx < 0.58) { fade = mix(0.9098, 0.5647, max(sx, 0.0) / 0.58); }
      else if (sx < 1.0) { fade = mix(0.5647, 0.0941, (sx - 0.58) / 0.42); }
      o = mix(o, bg, fade);
      let lo = select(pow((o + 0.055) / 1.055, vec3f(2.4)), o / 12.92, o <= vec3f(0.04045));
      return vec4f(lo, 1.0);
    `,
  }),
});

export type RidgeUniforms = { pos: number; px: number; py: number; tm: number; tp: number };

export function mountRidges(canvas: HTMLCanvasElement, props: RidgeUniforms) {
  return createShader(canvas, { components: [{ type: "RidgeContours517", id: "ridges", props }] },
    { components: [RidgeContours], disableTelemetry: true, colorSpace: "srgb" });
}
