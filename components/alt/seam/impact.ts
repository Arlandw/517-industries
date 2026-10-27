// Load bang: a raw WebGL fullscreen pass that runs before three.js arrives.
// Draws the falling bead, the strike, the heat glow, sparks and the scorched contour etch.

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const FRAG = `precision highp float;
uniform vec2 uRes;
uniform float uTime, uDrop, uLine, uHeat, uRip, uEtch, uBloom, uHoriz, uSeamPos, uFade;
const vec3 COPPER = vec3(0.757, 0.490, 0.314);
const vec3 PAPER = vec3(0.914, 0.882, 0.839);
float hash(float n){return fract(sin(n*91.345)*47453.5453);}
float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(h2(i),h2(i+vec2(1,0)),f.x),mix(h2(i+vec2(0,1)),h2(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*noise(p);p*=2.03;a*=.5;}return v;}
float segDist(vec2 p, vec2 a, vec2 b){vec2 pa=p-a, ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
void main(){
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 q = px / uRes;
  vec2 c = uRes * vec2(.5, 0.);
  float beadY = uDrop * uRes.y;
  vec3 L = vec3(0.);

  // falling bead, stretched by velocity
  float stretch = 6. + 70. * smoothstep(.05, .5, uDrop) * step(uLine, .001);
  float dBead = segDist(px, vec2(c.x, beadY - stretch), vec2(c.x, beadY)) - 2.5;
  float beadOn = step(.0001, uDrop) * (1. - step(.999, uHeat));
  L += (PAPER * exp(-max(dBead, 0.) * .9) + COPPER * exp(-max(dBead, 0.) / 9.) * .7) * beadOn;

  // trail hairline from the top edge to the bead
  float dTrail = abs(px.x - c.x);
  float trailMask = step(px.y, beadY) * (1. - uHoriz * smoothstep(.0, .4, uHeat));
  L += COPPER * exp(-dTrail * 1.4) * trailMask * .9;

  // seam line after the strike
  float d;
  float along;
  if (uHoriz < .5) {
    d = abs(px.x - c.x);
    along = step(px.y, mix(beadY, uRes.y, uLine)) ;
  } else {
    float sy = uSeamPos * uRes.y;
    d = abs(px.y - sy);
    along = step(abs(px.x - c.x), uLine * uRes.x * .5 + 1.);
  }
  float core = exp(-d * d / 1.6);
  float glow = exp(-d / (5. + 36. * uHeat));
  vec3 hot = mix(COPPER, PAPER, clamp(uHeat * 1.2, 0., 1.));
  L += along * (hot * core * (.6 + uHeat) + COPPER * glow * uHeat * .85);

  // molten edges riding the cover halves
  float across = uHoriz < .5 ? abs(px.x - c.x) : abs(px.y - uSeamPos * uRes.y);
  float span = uHoriz < .5 ? uRes.x : uRes.y;
  float edge = uRip * span;
  float ripping = step(.001, uRip) * (1. - smoothstep(.45, .5, uRip));
  L += COPPER * exp(-abs(across - edge) / 7.) * ripping * .9;

  // scorched contour etch in the wake of the rip
  float r = across / (span * .5);
  float f = fbm(q * vec2(3.2, 4.4) + vec2(0., uTime * .03));
  float iso = abs(fract(f * 9.) - .5);
  float lines = 1. - smoothstep(.02, .07, iso);
  float front = smoothstep(uEtch * .5, uEtch * .5 - .22, r);
  float inWake = step(across, edge);
  float cool = 1. - smoothstep(.9, 1.6, uTime);
  L += mix(COPPER, PAPER, front * .4) * lines * front * inWake * .32 * cool;

  // sparks shed off the line
  for (int i = 0; i < 70; i++) {
    float fi = float(i);
    float t0 = .48 + hash(fi) * .32;
    float age = uTime - t0;
    if (age < 0. || age > .9) continue;
    float a0 = hash(fi + 3.1);
    float side = hash(fi + 7.7) > .5 ? 1. : -1.;
    vec2 o, v;
    if (uHoriz < .5) { o = vec2(c.x, a0 * uRes.y); v = vec2(side * (90. + 420. * hash(fi + 1.3)), -160. + 260. * hash(fi + 5.2)); }
    else { o = vec2(c.x + (a0 - .5) * uRes.x, uSeamPos * uRes.y); v = vec2(-160. + 320. * hash(fi + 5.2), side * (90. + 380. * hash(fi + 1.3))); }
    vec2 pos = o + v * age + vec2(0., 620.) * age * age;
    float dd = length(px - pos);
    float life = 1. - age / .9;
    L += mix(COPPER, PAPER, life) * exp(-dd * dd / 3.) * life * 1.4;
  }

  L += COPPER * uBloom * .25;
  L *= uFade;
  float a = clamp(max(max(L.r, L.g), L.b), 0., 1.);
  gl_FragColor = vec4(min(L, vec3(1.)), a);
}`;

const expoIn = (t: number) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10));
// Close to the CSS --ease-forge curve so the shader edges track the DOM cover halves.
const forge = (t: number) => {
  const s = Math.min(1, Math.max(0, t));
  return s < 0.5 ? 4 * s * s * s : 1 - Math.pow(-2 * s + 2, 3) / 2;
};
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

type BangOpts = {
  root: HTMLElement;
  narrow: boolean;
  onHandoff: () => void;
  onDone: () => void;
};

export function runBang({ root, narrow, onHandoff, onDone }: BangOpts) {
  const canvas = root.querySelector<HTMLCanvasElement>(".seam-impact")!;
  const pin = root.querySelector<HTMLElement>(".ch-hero .pin")!;
  const h1 = root.querySelector<HTMLElement>(".ch-hero .h1")!;
  const q = (s: string) => root.querySelector<HTMLElement>(s);
  const marks: [number, () => void][] = [
    [560, () => (root.dataset.bang = "rip")],
    [700, () => h1.classList.add("is-in")],
    [1050, () => q(".seam-top")?.classList.add("is-in")],
    [1150, () => q(".hero-label")?.classList.add("is-in")],
    [1220, () => pin.classList.add("is-shake")],
    [1300, () => { q(".hero-sub")?.classList.add("is-in"); q(".hero-vert")?.classList.add("is-in"); }],
    [1500, () => { q(".seam-controls")?.classList.add("is-in"); q(".seam-scrollcue")?.classList.add("is-in"); }],
    [1600, onHandoff],
  ];
  root.dataset.bang = "drop";
  delete root.dataset.prebang;

  const gl = canvas.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
  let prog: WebGLProgram | null = null;
  const U: Record<string, WebGLUniformLocation | null> = {};
  if (gl) {
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) prog = null;
  }
  if (gl && prog) {
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ["uRes", "uTime", "uDrop", "uLine", "uHeat", "uRip", "uEtch", "uBloom", "uHoriz", "uSeamPos", "uFade"]) {
      U[n] = gl.getUniformLocation(prog, n);
    }
  }

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, narrow ? 1 : 1.5);
    canvas.width = Math.round(innerWidth * dpr);
    canvas.height = Math.round(innerHeight * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
  };
  resize();
  window.addEventListener("resize", resize);

  const seamPos = narrow ? 0.54 : 0.5;
  const start = performance.now();
  let next = 0;
  let raf = 0;
  let stopped = false;

  const frame = (now: number) => {
    const ms = now - start;
    while (next < marks.length && ms >= marks[next][0]) marks[next++][1]();
    const t = ms / 1000;
    const drop = t < 0.1 ? 0 : t < 0.12 ? 0.0001 : t < 0.48 ? expoIn(clamp01((t - 0.12) / 0.36)) * seamPos : seamPos;
    const line = narrow ? clamp01((t - 0.48) / 0.12) : clamp01((t - 0.48) / 0.08);
    const heat = t < 0.48 ? 0 : t < 0.56 ? (t - 0.48) / 0.08 : 1 - 0.65 * clamp01((t - 0.56) / 1.1);
    const rip = 0.5 * forge(clamp01((t - 0.56) / 0.42));
    const etch = 1.4 * clamp01((t - 0.56) / 0.7);
    const bloom = t > 0.48 && t < 0.56 ? 1 : 0;
    const fade = 1 - clamp01((t - 1.9) / 0.7);
    if (gl && prog) {
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, t);
      gl.uniform1f(U.uDrop, drop);
      gl.uniform1f(U.uLine, line);
      gl.uniform1f(U.uHeat, heat);
      gl.uniform1f(U.uRip, rip);
      gl.uniform1f(U.uEtch, etch);
      gl.uniform1f(U.uBloom, bloom);
      gl.uniform1f(U.uHoriz, narrow ? 1 : 0);
      gl.uniform1f(U.uSeamPos, seamPos);
      gl.uniform1f(U.uFade, fade);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    if (ms >= 2600) return finish();
    raf = requestAnimationFrame(frame);
  };

  const finish = () => {
    if (stopped) return;
    stopped = true;
    while (next < marks.length) marks[next++][1]();
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    root.dataset.bang = "done";
    pin.classList.remove("is-shake");
    gl?.getExtension("WEBGL_lose_context")?.loseContext();
    onDone();
  };

  raf = requestAnimationFrame(frame);
  return { cancel: finish };
}
