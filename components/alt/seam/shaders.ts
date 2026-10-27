// GLSL for the seam composite, the heat trail and the filament field.

export const QUAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const NOISE = /* glsl */ `
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
`;

export const COMPOSITE_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uDpr, uTime;
uniform sampler2D uLeftA, uLeftB, uRightA, uRightB, uCenter, uFullA, uFullB, uParticles, uHeat;
uniform vec4 uRectLA, uRectLB, uRectRA, uRectRB, uRectC, uRectFA, uRectFB;
uniform float uModeLA, uModeLB, uModeFA, uModeFB;
uniform float uLeftMix, uRightMix, uFullMix, uFull, uCenterTex;
uniform float uSeamX, uSeamY, uRotate, uSeamWidth, uBend, uMouseY, uWobble;
uniform float uLineLen, uLineAlpha, uPointY, uHeatAmt;
uniform float uParticleAlpha, uRightDim, uLeftDim, uGrain;
uniform float uProcess, uWorldX, uToolDim;
uniform vec3 uStations;

const vec3 INK = vec3(0.063, 0.071, 0.094);
const vec3 COPPER = vec3(0.757, 0.490, 0.314);
const vec3 PAPER = vec3(0.914, 0.882, 0.839);
const vec3 HAIR = vec3(0.914, 0.882, 0.839);

${NOISE}

vec3 sampleSlot(sampler2D t, vec4 r, float mode, vec2 px) {
  vec2 uv = (px - r.xy) / r.zw;
  if (mode > 1.5) return texture2D(t, vec2(uv.x, 1.0 - clamp(uv.y, 0.0, 1.0))).rgb;
  float inside = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
  vec3 col = mix(INK, texture2D(t, vec2(uv.x, 1.0 - uv.y)).rgb, inside);
  if (mode > 0.5) {
    vec2 e = min(px - r.xy, r.xy + r.zw - px);
    float de = abs(min(e.x, e.y));
    col = mix(col, HAIR, (1.0 - smoothstep(0.0, 1.2, de)) * 0.28);
  }
  return col;
}

// Molten dissolve: noise mixed with a contour height field so every cut follows contour lines.
float contourHeight(vec2 p) { return abs(fract(fbm(p * 2.2) * 6.0) - 0.5) * 2.0; }
vec3 molten(vec3 a, vec3 b, float m, vec2 uv) {
  if (m <= 0.0) return a;
  if (m >= 1.0) return b;
  float n = fbm(uv * 5.0) * 0.7 + contourHeight(uv) * 0.3;
  float th = mix(0.08, 0.92, m) + (m - 0.5) * 0.3;
  float mask = step(n, th);
  float edge = smoothstep(th + 0.022, th, n) * (1.0 - mask);
  return mix(a, b, mask) + COPPER * edge * 1.3 + PAPER * pow(edge, 8.0) * 0.6;
}

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  vec2 suv = px / uRes;

  // Seam geometry: a line that can bend toward the cursor, wobble, widen into a gap and rotate.
  float theta = uRotate * 1.5707963;
  vec2 n = vec2(cos(theta), sin(theta));
  float vert = 1.0 - uRotate;
  float bend = uBend * exp(-pow((px.y - uMouseY) / uRes.y * 3.0, 2.0)) * vert;
  float wob = (fbm(vec2(suv.y * 8.0 + uTime * 0.6, 1.7)) - 0.5) * 0.006 * uRes.x * vert;
  wob += uWobble * sin(suv.y * 14.0 - uTime * 9.0) * 0.02 * uRes.x * vert;
  vec2 c = vec2(uSeamX + bend + wob, mix(uRes.y * 0.5, uSeamY, uRotate));
  float d = dot(px - c, n);
  float along = dot(px - c, vec2(-n.y, n.x));
  float ragged = (fbm(px * 0.018 + vec2(0.0, uTime * 0.4)) - 0.5) * 36.0 * smoothstep(4.0, 60.0, uSeamWidth);
  float hw = max(uSeamWidth * 0.5 + ragged, 0.0);

  // Heat trail relights the metal side.
  float h = texture2D(uHeat, vec2(suv.x, 1.0 - suv.y)).r * uHeatAmt;
  vec2 hpx = px + vec2(h * 1.5);

  vec3 left = molten(sampleSlot(uLeftA, uRectLA, uModeLA, hpx), sampleSlot(uLeftB, uRectLB, uModeLB, hpx), uLeftMix, suv) * uLeftDim;
  left = left * (1.0 + h * 0.6) + COPPER * h * 0.5;
  vec3 right = molten(sampleSlot(uRightA, uRectRA, 0.0, px), sampleSlot(uRightB, uRectRB, 0.0, px), uRightMix, suv) * uRightDim;
  right += texture2D(uParticles, vec2(suv.x, 1.0 - suv.y)).rgb * uParticleAlpha;

  vec3 center;
  if (uCenterTex > 0.5) {
    center = sampleSlot(uCenter, uRectC, 0.0, px);
  } else {
    float f = fbm(suv * vec2(3.0, 5.0) + vec2(uTime * 0.02, -uTime * 0.03));
    float iso = abs(fract(f * 10.0) - 0.5);
    center = INK + COPPER * (1.0 - smoothstep(0.02, 0.06, iso)) * 0.22;
  }

  float aa = 0.75;
  vec3 split = mix(left, center, smoothstep(-hw - aa, -hw + aa, d));
  split = mix(split, right, smoothstep(hw - aa, hw + aa, d));

  vec3 full = molten(sampleSlot(uFullA, uRectFA, uModeFA, px), sampleSlot(uFullB, uRectFB, uModeFB, px), uFullMix, suv);
  vec3 col = molten(split, full, uFull, suv * 1.3 + 0.2);

  // Emission along the seam (or the two gap edges).
  float axisLen = mix(uRes.y, uRes.x, uRotate) * 0.5 + 2.0;
  float lineMask = 1.0 - smoothstep(uLineLen * axisLen - 2.0, uLineLen * axisLen, abs(along));
  float ed = abs(abs(d) - hw);
  float core = exp(-ed * ed / 1.3);
  float glow = exp(-ed / 9.0);
  float e = core * 0.95 + glow * 0.42;

  if (uProcess > 0.0) {
    // CNC toolpath: the line behind the fixed tool point changes character station by station.
    float W = uRes.x;
    float world = uWorldX + px.x / W;
    float dy = px.y - c.y;
    float behind = step(px.x, W * 0.5);
    float pe = exp(-dy * dy / 1.3) * 0.9 + exp(-abs(dy) / 7.0) * 0.3;
    if (world >= uStations.x && world < uStations.y) {
      pe *= step(0.42, fract(world * W / 18.0));
    } else if (world >= uStations.y && world < uStations.z) {
      pe = exp(-pow(max(abs(dy) - 1.6, 0.0), 2.0) / 1.2) * 1.15 + exp(-abs(dy) / 10.0) * 0.35;
      col *= 1.0 - smoothstep(3.0, 6.0, dy) * (1.0 - smoothstep(8.0, 16.0, dy)) * 0.55;
    } else if (world >= uStations.z) {
      float k = world - uStations.z;
      float off = min(k * W * 0.12, 26.0);
      float prune = 1.0 - smoothstep(0.12, 0.3, k);
      float o1 = abs(dy - off), o2 = abs(dy + off);
      pe += (exp(-o1 * o1 / 1.3) * 0.9 + exp(-o1 / 7.0) * 0.25) * prune;
      pe += (exp(-o2 * o2 / 1.3) * 0.9 + exp(-o2 / 7.0) * 0.25) * prune;
    }
    float ahead = exp(-dy * dy / 2.0) * 0.12;
    float pe2 = mix(ahead, pe, behind);
    e = mix(e, pe2, uProcess);
    vec2 tp = px - vec2(W * 0.5, c.y);
    float tool = exp(-dot(tp, tp) / 40.0) * 1.2 + exp(-length(tp) / 26.0) * 0.6;
    e += tool * uProcess * (1.0 - uToolDim * 0.85);
  }

  vec3 hot = mix(COPPER, PAPER, clamp(core * core, 0.0, 1.0));
  col += hot * e * lineMask * uLineAlpha;

  // The closing point, which drifts down toward the office pin.
  vec2 pp = px - vec2(uRes.x * 0.5, uPointY * uRes.y);
  float point = (exp(-dot(pp, pp) / 18.0) * 1.4 + exp(-length(pp) / 30.0) * 0.5) * step(uLineLen, 0.02) * uLineAlpha;
  col += mix(COPPER, PAPER, 0.7) * point;

  float g = h21(floor(px) + floor(uTime * 12.0) * 13.7) - 0.5;
  col += g * uGrain;
  gl_FragColor = vec4(col, 1.0);
}
`;

export const HEAT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPrev;
uniform vec2 uMouse;
uniform float uRadius, uDecay, uAmt, uAspect;
void main() {
  float h = texture2D(uPrev, vUv).r * uDecay;
  vec2 d = vUv - uMouse;
  d.x *= uAspect;
  h += exp(-dot(d, d) / (uRadius * uRadius)) * uAmt;
  gl_FragColor = vec4(min(h, 1.0), 0.0, 0.0, 1.0);
}
`;

const CURL = /* glsl */ `
${NOISE}
vec2 curl(vec2 p) {
  float e = 0.01;
  float n1 = fbm(p + vec2(0.0, e)), n2 = fbm(p - vec2(0.0, e));
  float n3 = fbm(p + vec2(e, 0.0)), n4 = fbm(p - vec2(e, 0.0));
  return vec2(n1 - n2, -(n3 - n4)) / (2.0 * e);
}
`;

export const VEL_FRAG = /* glsl */ `
uniform float uTime, uDt, uMouseOn, uAttract, uSpring, uCurl, uAspect;
uniform vec2 uMouse;
uniform sampler2D tSeed;
${CURL}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  vec2 seed = texture2D(tSeed, uv).xy;
  float f = uDt * 60.0;
  vec2 acc = curl(p.xy * 3.0 + vec2(uTime * 0.05, seed.x * 0.3)) * uCurl * 0.00035;
  vec2 toM = uMouse - p.xy;
  vec2 toMa = toM * vec2(uAspect, 1.0);
  float dm = length(toMa);
  acc += normalize(toM + 1e-5) * uMouseOn * smoothstep(0.22, 0.0, dm) * uAttract * 0.0022;
  acc += (seed - p.xy) * uSpring * 0.05;
  v.xy = (v.xy + acc * f) * pow(0.92, f);
  gl_FragColor = vec4(v.xy, 0.0, 1.0);
}
`;

export const POS_FRAG = /* glsl */ `
uniform float uDt;
void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 p = texture2D(texturePosition, uv);
  vec4 v = texture2D(textureVelocity, uv);
  p.xy += v.xy * uDt * 60.0;
  gl_FragColor = p;
}
`;

export const POINT_VERT = /* glsl */ `
uniform sampler2D tPos;
uniform vec4 uRect;
uniform vec2 uRes;
uniform vec2 uMouse;
uniform float uSize, uDpr;
attribute vec2 ref;
varying float vNear;
varying float vSeed;
void main() {
  vec2 p = texture2D(tPos, ref).xy;
  vec2 px = uRect.xy + p * uRect.zw;
  vec2 m = (uMouse - p) * vec2(uRect.z / uRect.w, 1.0);
  vNear = smoothstep(0.16, 0.0, length(m));
  vSeed = fract(ref.x * 91.7 + ref.y * 37.3);
  gl_Position = vec4(px.x / uRes.x * 2.0 - 1.0, 1.0 - px.y / uRes.y * 2.0, 0.0, 1.0);
  gl_PointSize = (1.0 + 1.5 * vSeed + vNear * 1.2) * uSize * uDpr;
}
`;

export const POINT_FRAG = /* glsl */ `
precision highp float;
varying float vNear;
varying float vSeed;
const vec3 COPPER = vec3(0.757, 0.490, 0.314);
const vec3 PAPER = vec3(0.914, 0.882, 0.839);
void main() {
  vec2 q = gl_PointCoord - 0.5;
  float a = smoothstep(0.5, 0.1, length(q));
  vec3 col = mix(COPPER, PAPER, vNear);
  gl_FragColor = vec4(col * a * (0.32 + 0.3 * vSeed + vNear * 0.5), 1.0);
}
`;
