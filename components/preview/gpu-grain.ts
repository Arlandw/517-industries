import { createShader } from "shaders/js";
import { defineShader, wgsl } from "shaders/std";

// Option A: a very faint paper grain over the charcoal ground. Straight alpha, linear color.
const PaperGrain = defineShader({
  name: "PaperGrain517",
  props: { amount: { default: 0.05 } },
  paint: wgsl(`
    let cell = floor(uv * viewport);
    let frame = floor(time * 8.0);
    let n = fract(sin(dot(cell + vec2f(frame * 17.0, frame * 59.0), vec2f(12.9898, 78.233))) * 43758.5453);
    let fiber = 0.5 + 0.5 * sin(uv.y * viewport.y * 0.21 + sin(uv.x * 9.0) * 3.0);
    let g = (n - 0.5) * (0.8 + 0.4 * fiber);
    let a = abs(g) * amount;
    let paper = vec3f(0.807, 0.745, 0.672);
    return vec4f(select(vec3f(0.0), paper, g > 0.0), a);
  `),
});

export function mountGrain(canvas: HTMLCanvasElement) {
  return createShader(canvas, { components: [{ type: "PaperGrain517", id: "grain", props: {} }] },
    { components: [PaperGrain], disableTelemetry: true, colorSpace: "srgb" });
}
