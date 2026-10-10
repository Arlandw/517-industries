import { createShader } from "shaders/js";
import { defineShader, wgsl } from "shaders/std";

// Option B: a slow, soft band of light that crosses the wordmark once every nine seconds,
// then rests. The canvas is masked to the letterforms, so only the mark catches the light.
const WordmarkSweep = defineShader({
  name: "WordmarkSweep517",
  props: { strength: { default: 0.42 } },
  paint: wgsl(`
    let phase = fract(time / 9.0);
    let centre = phase * 1.9 - 0.45;
    let x = uv.x + (uv.y - 0.5) * 0.08;
    let k = exp(-pow((x - centre) / 0.06, 2.0)) * strength;
    return vec4f(vec3f(1.0), k);
  `),
});

export function mountSweep(canvas: HTMLCanvasElement) {
  return createShader(canvas, { components: [{ type: "WordmarkSweep517", id: "sweep", props: {} }] },
    { components: [WordmarkSweep], disableTelemetry: true, colorSpace: "srgb" });
}
