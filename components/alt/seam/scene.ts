import * as THREE from "three";
import { GPUComputationRenderer, type Variable } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { COMPOSITE_FRAG, HEAT_FRAG, POINT_FRAG, POINT_VERT, POS_FRAG, QUAD_VERT, VEL_FRAG } from "./shaders";
import { type SeamState, bias } from "./state";

gsap.registerPlugin(ScrollTrigger);

const IMG = "/alt/seam/img/";
const VID = "/alt/seam/video/";
const SIM = 256;
const FULL_COUNT = SIM * SIM;

type Rect = [number, number, number, number];
type Clip = {
  id: string;
  el: HTMLVideoElement;
  tex: THREE.VideoTexture;
  loop: boolean;
  loaded: boolean;
  aspect: number;
  cur: number;
  target: number;
  pending: boolean;
};

export type Stage = {
  handoff(): void;
  setPaused(p: boolean): void;
  setBias(): void;
  destroy(): void;
};

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ramp = (v: number, a: number, b: number) => clamp((v - a) / (b - a));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const elastic = gsap.parseEase("elastic.out(1, 0.45)");

function coverRect(rx: number, ry: number, rw: number, rh: number, aspect: number, ax: number, ay: number, contain = false): Rect {
  const ra = rw / rh;
  const byWidth = contain ? ra < aspect : ra > aspect;
  const w = byWidth ? rw : rh * aspect;
  const h = byWidth ? rw / aspect : rh;
  return [rx + (rw - w) * ax, ry + (rh - h) * ay, w, h];
}

export async function createStage(root: HTMLElement, st: SeamState, onLost: () => void): Promise<Stage> {
  const canvas = root.querySelector<HTMLCanvasElement>(".seam-gl")!;
  const handle = root.querySelector<HTMLElement>(".seam-handle")!;
  const cursor = root.querySelector<HTMLElement>(".seam-cursor")!;
  const fixedQuality = new URLSearchParams(location.search).get("quality") === "max";

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "high-performance" });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.autoClear = true;
  let dirty = true;
  let dprCap = 1.5;
  let dpr = Math.min(window.devicePixelRatio || 1, dprCap);
  let W = innerWidth;
  let H = innerHeight;

  const onContextLost = (e: Event) => {
    e.preventDefault();
    onLost();
  };
  canvas.addEventListener("webglcontextlost", onContextLost);

  // ---------- textures ----------
  const avif = await new Promise<boolean>((res) => {
    const i = new Image();
    i.onload = () => res(i.width > 0);
    i.onerror = () => res(false);
    i.src = "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAIAAAACAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQ0MAAAAABNjb2xybmNseAACAAIAAYAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAACVtZGF0EgAKCBgANogQEAwgMg8f8D///8WfhwB8+ErK42A=";
  });
  const ext = avif ? "avif" : "webp";
  const blank = new THREE.DataTexture(new Uint8Array([16, 18, 24, 255]), 1, 1);
  blank.needsUpdate = true;
  const posters: Record<string, { tex: THREE.Texture; aspect: number; img?: HTMLImageElement }> = {};
  const loadPoster = (id: string, wrap = false) =>
    new Promise<void>((res) => {
      if (posters[id]) return res();
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        const tex = new THREE.Texture(img);
        tex.colorSpace = THREE.NoColorSpace;
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        if (wrap) tex.wrapS = THREE.MirroredRepeatWrapping;
        tex.needsUpdate = true;
        posters[id] = { tex, aspect: img.naturalWidth / img.naturalHeight, img };
        dirty = true;
        res();
      };
      img.onerror = () => res();
      img.src = `${IMG}${id}.${ext}`;
    });
  await Promise.all([loadPoster("s1"), loadPoster("s2")]);

  const clips: Record<string, Clip> = {};
  const makeClip = (id: string, file: string, loop: boolean, aspect: number) => {
    const el = document.createElement("video");
    el.muted = true;
    el.playsInline = true;
    el.loop = loop;
    el.preload = "none";
    el.setAttribute("aria-hidden", "true");
    el.crossOrigin = "anonymous";
    el.dataset.src = VID + file;
    const tex = new THREE.VideoTexture(el);
    tex.colorSpace = THREE.NoColorSpace;
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    const c: Clip = { id, el, tex, loop, loaded: false, aspect, cur: 0, target: 0, pending: false };
    el.addEventListener("seeked", () => {
      c.pending = false;
      tex.needsUpdate = true;
      dirty = true;
    });
    el.addEventListener("loadeddata", () => {
      tex.needsUpdate = true;
      dirty = true;
    });
    clips[id] = c;
    return c;
  };
  if (!st.saveData) {
    makeClip("s1", "s1-loop.h264.mp4", true, 768 / 1024);
    makeClip("s3", "s3-scrub.h264.mp4", false, 576 / 1024);
    makeClip("s4", "s4-scrub.h264.mp4", false, 688 / 864);
    makeClip("s5", "s5-scrub.h264.mp4", false, 688 / 864);
    makeClip("s6", "s6-loop.h264.mp4", true, 1536 / 672);
    makeClip("s8", "s8-scrub.h264.mp4", false, 1280 / 720);
  }
  const ensureClip = (id: string) => {
    const c = clips[id];
    if (!c || c.loaded) return;
    c.loaded = true;
    c.el.src = c.el.dataset.src!;
    c.el.preload = "auto";
    c.el.load();
  };
  const ready = (c?: Clip) => !!c && c.loaded && c.el.readyState >= 2;
  // A slot shows the video once it has a frame, the poster until then.
  const pick = (id: string): { tex: THREE.Texture; aspect: number } => {
    const c = clips[id];
    if (ready(c)) return { tex: c.tex, aspect: c.aspect };
    const p = posters[id];
    return p ? { tex: p.tex, aspect: p.aspect } : { tex: blank, aspect: 1 };
  };
  const poster = (id: string) => posters[id] ?? { tex: blank, aspect: 1 };

  // ---------- heat trail ----------
  const rtOpts = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
  let heatA = new THREE.WebGLRenderTarget(256, 256, rtOpts);
  let heatB = new THREE.WebGLRenderTarget(256, 256, rtOpts);
  const quadGeo = new THREE.PlaneGeometry(2, 2);
  const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const heatMat = new THREE.ShaderMaterial({
    vertexShader: QUAD_VERT,
    fragmentShader: HEAT_FRAG,
    uniforms: {
      uPrev: { value: heatA.texture },
      uMouse: { value: new THREE.Vector2(-1, -1) },
      uRadius: { value: 0.03 },
      uDecay: { value: 0.965 },
      uAmt: { value: 0 },
      uAspect: { value: W / H },
    },
    depthTest: false,
  });
  const heatScene = new THREE.Scene();
  heatScene.add(new THREE.Mesh(quadGeo, heatMat));

  // ---------- filament field ----------
  let particlesOK = true;
  let gpu: GPUComputationRenderer | null = null;
  let posVar: Variable | null = null;
  let velVar: Variable | null = null;
  const seedTex = await buildSeeds(posters.s2?.img);
  const pointsRT = new THREE.WebGLRenderTarget(1, 1, { type: THREE.UnsignedByteType, depthBuffer: false });
  const pointScene = new THREE.Scene();
  const pointGeo = new THREE.BufferGeometry();
  const pointMat = new THREE.ShaderMaterial({
    vertexShader: POINT_VERT,
    fragmentShader: POINT_FRAG,
    uniforms: {
      tPos: { value: null },
      uRect: { value: new THREE.Vector4() },
      uRes: { value: new THREE.Vector2(W, H) },
      uMouse: { value: new THREE.Vector2(-9, -9) },
      uSize: { value: 1 },
      uDpr: { value: dpr },
    },
    blending: THREE.AdditiveBlending,
    depthTest: false,
    transparent: true,
  });
  if (seedTex) {
    try {
      gpu = new GPUComputationRenderer(SIM, SIM, renderer);
      const p0 = gpu.createTexture();
      const v0 = gpu.createTexture();
      (p0.image.data as unknown as Float32Array).set(seedTex.image.data as unknown as Float32Array);
      posVar = gpu.addVariable("texturePosition", POS_FRAG, p0);
      velVar = gpu.addVariable("textureVelocity", VEL_FRAG, v0);
      gpu.setVariableDependencies(posVar, [posVar, velVar]);
      gpu.setVariableDependencies(velVar, [posVar, velVar]);
      Object.assign(posVar.material.uniforms, { uDt: { value: 1 / 60 } });
      Object.assign(velVar.material.uniforms, {
        uTime: { value: 0 },
        uDt: { value: 1 / 60 },
        uMouse: { value: new THREE.Vector2(-9, -9) },
        uMouseOn: { value: 0 },
        uAttract: { value: 0.22 },
        uSpring: { value: 0.04 },
        uCurl: { value: 0.35 },
        uAspect: { value: 0.75 },
        tSeed: { value: seedTex },
      });
      const err = gpu.init();
      if (err) throw new Error(err);
      const refs = new Float32Array(FULL_COUNT * 2);
      for (let i = 0; i < FULL_COUNT; i++) {
        refs[i * 2] = ((i % SIM) + 0.5) / SIM;
        refs[i * 2 + 1] = (Math.floor(i / SIM) + 0.5) / SIM;
      }
      pointGeo.setAttribute("ref", new THREE.BufferAttribute(refs, 2));
      pointGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(FULL_COUNT * 3), 3));
      const pts = new THREE.Points(pointGeo, pointMat);
      pts.frustumCulled = false;
      pointScene.add(pts);
    } catch {
      particlesOK = false;
    }
  } else {
    particlesOK = false;
  }

  // ---------- composite ----------
  const v4 = () => new THREE.Vector4(0, 0, 1, 1);
  const U = {
    uRes: { value: new THREE.Vector2(W, H) },
    uDpr: { value: dpr },
    uTime: { value: 0 },
    uLeftA: { value: blank as THREE.Texture },
    uLeftB: { value: blank as THREE.Texture },
    uRightA: { value: blank as THREE.Texture },
    uRightB: { value: blank as THREE.Texture },
    uCenter: { value: blank as THREE.Texture },
    uFullA: { value: blank as THREE.Texture },
    uFullB: { value: blank as THREE.Texture },
    uParticles: { value: pointsRT.texture },
    uHeat: { value: heatA.texture },
    uRectLA: { value: v4() },
    uRectLB: { value: v4() },
    uRectRA: { value: v4() },
    uRectRB: { value: v4() },
    uRectC: { value: v4() },
    uRectFA: { value: v4() },
    uRectFB: { value: v4() },
    uModeLA: { value: 0 },
    uModeLB: { value: 0 },
    uModeFA: { value: 0 },
    uModeFB: { value: 0 },
    uLeftMix: { value: 0 },
    uRightMix: { value: 0 },
    uFullMix: { value: 0 },
    uFull: { value: 0 },
    uCenterTex: { value: 0 },
    uSeamX: { value: W / 2 },
    uSeamY: { value: H * 0.62 },
    uRotate: { value: 0 },
    uSeamWidth: { value: 0 },
    uBend: { value: 0 },
    uMouseY: { value: H / 2 },
    uWobble: { value: 0 },
    uLineLen: { value: 1 },
    uLineAlpha: { value: 1 },
    uPointY: { value: 0.5 },
    uHeatAmt: { value: 1 },
    uParticleAlpha: { value: 0 },
    uRightDim: { value: 1 },
    uLeftDim: { value: 1 },
    uGrain: { value: 0.035 },
    uProcess: { value: 0 },
    uWorldX: { value: 0 },
    uToolDim: { value: 0 },
    uStations: { value: new THREE.Vector3(9, 9, 9) },
  };
  const compMat = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: COMPOSITE_FRAG, uniforms: U, depthTest: false });
  const compScene = new THREE.Scene();
  compScene.add(new THREE.Mesh(quadGeo, compMat));

  // ---------- scroll ----------
  const lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
  lenis.on("scroll", ScrollTrigger.update);
  const lenisRaf = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(lenisRaf);
  gsap.ticker.lagSmoothing(0);

  const sections = Array.from(root.querySelectorAll<HTMLElement>(".ch[data-ch]")).slice(0, 5);
  const extra = ["+=30%", "+=180%", "+=350%", "+=300%", "+=100%"];
  const triggers = sections.map((sec, i) =>
    ScrollTrigger.create({
      trigger: sec,
      pin: sec.querySelector<HTMLElement>(".pin")!,
      start: "top top",
      end: extra[i],
      pinSpacing: true,
      anticipatePin: 1,
    }),
  );
  const footer = root.querySelector<HTMLElement>(".ch-foot")!;
  const track = root.querySelector<HTMLElement>(".track")!;
  const stations = Array.from(root.querySelectorAll<HTMLElement>(".station"));
  ScrollTrigger.refresh();

  // ---------- DOM bindings ----------
  const q = (s: string) => root.querySelector<HTMLElement>(s)!;
  const el = {
    h1l: q(".ch-hero .h1 .l"),
    h1r: q(".ch-hero .h1 .r"),
    heroLabel: q(".hero-label"),
    heroVert: q(".hero-vert"),
    heroSub: q(".hero-sub"),
    coord: q(".seam-coord"),
    c1h2: q("#company-title"),
    c1label: q(".ch-company .ch-label"),
    plateR: q(".plate-r"),
    plateL: q(".plate-l"),
    gapLine: q(".gap-line"),
    intro: q(".fields-intro"),
    f1: q(".field-1"),
    f2: q(".field-2"),
    between: q(".between"),
    closeL: q(".converge .l"),
    closeR: q(".converge .r"),
    closeSub: q(".closer-sub"),
    trackEnd: q(".track-end"),
  };
  const styled = new Set<HTMLElement>();
  const css = (e: HTMLElement, prop: string, val: string) => {
    if (e.style.getPropertyValue(prop) !== val) {
      e.style.setProperty(prop, val);
      styled.add(e);
    }
  };
  const vis = (e: HTMLElement, o: number) => {
    css(e, "opacity", o.toFixed(3));
    css(e, "visibility", o <= 0.001 ? "hidden" : "visible");
  };
  const wipe = (e: HTMLElement, p: number) => {
    const m = `linear-gradient(180deg, #000 calc(${(p * 100).toFixed(1)}% - 1.4em), transparent calc(${(p * 100).toFixed(1)}% + 0.2em))`;
    css(e, "-webkit-mask-image", m);
    css(e, "mask-image", m);
  };

  // ---------- input ----------
  const mouse = { x: -1, y: -1, sx: -1, sy: -1, on: false, vx: 0, vy: 0, lastT: 0 };
  const finePointer = matchMedia("(pointer: fine)").matches;
  if (finePointer) root.dataset.cursor = "on";
  const onMove = (e: PointerEvent) => {
    const now = performance.now();
    const dt = Math.max(1, now - mouse.lastT);
    if (mouse.on) {
      mouse.vx = (e.clientX - mouse.x) / dt;
      mouse.vy = (e.clientY - mouse.y) / dt;
    }
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    if (!mouse.on) {
      mouse.sx = mouse.x;
      mouse.sy = mouse.y;
    }
    mouse.on = true;
    mouse.lastT = now;
    if (dragging) setValue(((e.clientX / W) * 100));
    dirty = true;
  };
  const onLeave = () => {
    mouse.on = false;
    dirty = true;
  };
  window.addEventListener("pointermove", onMove, { passive: true });
  document.addEventListener("pointerleave", onLeave);

  // Seam slider: drag or keys set a value 20..80 that becomes the session bias.
  let dragging = false;
  let dragEnabled = true;
  const setValue = (v: number) => {
    const val = clamp(Math.round(v), 20, 80);
    st.value = val;
    sessionStorage.setItem("seam-bias", String(val));
    handle.setAttribute("aria-valuenow", String(val));
    dirty = true;
  };
  setValue(st.value);
  const onDown = (e: PointerEvent) => {
    if (!dragEnabled) return;
    dragging = true;
    handle.setPointerCapture(e.pointerId);
    setValue((e.clientX / W) * 100);
  };
  const onUp = () => (dragging = false);
  const onKey = (e: KeyboardEvent) => {
    const map: Record<string, number> = { ArrowLeft: -5, ArrowDown: -5, ArrowRight: 5, ArrowUp: 5 };
    if (e.key in map) setValue(st.value + map[e.key]);
    else if (e.key === "Home") setValue(20);
    else if (e.key === "End") setValue(80);
    else return;
    e.preventDefault();
  };
  handle.addEventListener("pointerdown", onDown);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
  handle.addEventListener("keydown", onKey);

  const onScroll = () => (dirty = true);
  window.addEventListener("scroll", onScroll, { passive: true });

  // ---------- springs ----------
  const seam = { x: 0.5, v: 0, target: 0.5 };
  const bendS = { x: 0, v: 0, target: 0 };
  const spring = (s: { x: number; v: number; target: number }, k: number, c: number, dt: number) => {
    if (st.paused) {
      s.x = s.target;
      s.v = 0;
      return;
    }
    const steps = Math.ceil(dt / (1 / 120));
    const h = dt / steps;
    for (let i = 0; i < steps; i++) {
      const a = -k * (s.x - s.target) - c * s.v;
      s.v += a * h;
      s.x += s.v * h;
    }
  };

  // ---------- quality ladder ----------
  let ladder = 0;
  let particleCount = FULL_COUNT;
  let heatOn = true;
  let frameAvg = 16;
  let ladderClock = 0;
  const applyLadder = (step: number) => {
    if (fixedQuality || step <= ladder) return;
    ladder = step;
    if (ladder >= 1) {
      dprCap = 1;
      U.uGrain.value = 0;
      resize();
    }
    if (ladder >= 2) {
      particleCount = 16384;
      heatOn = false;
    }
    if (ladder >= 3) particlesOK = false;
  };

  // ---------- resize ----------
  const resize = () => {
    W = innerWidth;
    H = innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, dprCap);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    pointsRT.setSize(Math.round(W * dpr), Math.round(H * dpr));
    U.uRes.value.set(W, H);
    U.uDpr.value = dpr;
    pointMat.uniforms.uRes.value.set(W, H);
    pointMat.uniforms.uDpr.value = dpr;
    heatMat.uniforms.uAspect.value = W / H;
    dirty = true;
  };
  resize();
  const onResize = () => {
    resize();
    ScrollTrigger.refresh();
  };
  window.addEventListener("resize", onResize);

  // ---------- state per frame ----------
  let handT = -1; // handoff clock, -1 until the bang hands over
  let time = 0;
  let running = true;
  const smooth = { track: 0 };

  const chapter = () => {
    const y = window.scrollY;
    let i = 0;
    for (let k = triggers.length - 1; k >= 0; k--) {
      if (y >= triggers[k].start - 1) {
        i = k;
        break;
      }
    }
    const t = triggers[i];
    const p = clamp(t.progress);
    const nextStart = i < triggers.length - 1 ? triggers[i + 1].start : footer.offsetTop;
    const tr = y > t.end ? clamp((y - t.end) / Math.max(1, nextStart - t.end)) : 0;
    return { i, p, tr };
  };

  const scrubClip = (id: string, t: number) => {
    const c = clips[id];
    if (!c || !c.loaded) return;
    const dur = c.el.duration;
    if (!dur || !isFinite(dur)) return;
    c.target = clamp(t) * (dur - 0.05);
    c.cur += (c.target - c.cur) * 0.18;
    if (Math.abs(c.target - c.cur) < 1 / 48) c.cur = c.target;
    if (!c.pending && !c.el.seeking && Math.abs(c.el.currentTime - c.cur) > 1 / 96) {
      c.pending = true;
      c.el.currentTime = c.cur;
    }
  };
  const playing = new Set<string>();
  const wantPlay = (ids: string[]) => {
    for (const id of Object.keys(clips)) {
      const c = clips[id];
      if (!c.loop) continue;
      const want = ids.includes(id) && !st.paused && running;
      if (want && c.loaded && c.el.paused) {
        c.el.play().catch(() => {});
        playing.add(id);
      } else if (!want && !c.el.paused) {
        c.el.pause();
        playing.delete(id);
      }
    }
  };

  const setRect = (u: THREE.Vector4, r: Rect) => u.set(r[0], r[1], r[2], r[3]);

  const update = (dt: number) => {
    const { i, p, tr } = chapter();
    const b = bias(st.value);
    const seamPx = seam.x * W;
    // poster and clip loading one chapter ahead
    if (i >= 0) ensureClip("s3");
    if (i >= 1) { ensureClip("s4"); ensureClip("s5"); loadPoster("s4"); loadPoster("s5"); loadPoster("s6"); }
    if (i >= 2) { ensureClip("s6"); loadPoster("s7", true); loadPoster("s8"); }
    if (i >= 3) ensureClip("s8");

    // defaults
    let target = 0.5 + b * 0.2;
    let width = 0;
    let rotate = 0;
    const seamY = 0.62;
    let lineLen = 1;
    let pointY = 0.5;
    let full = 0;
    let fullMix = 0;
    let leftMix = 0;
    let rightMix = 0;
    let centerTex = 0;
    let process = 0;
    let wobble = 0;
    let partA = 1;
    let rightDim = 0.3;
    let lineAlpha = 1;
    let toolDim = 0;
    let R: [string, string] = ["s2", "s2"];
    let F: [string, string] = ["s6", "s7"];
    let LA = pick("s1");
    let LB = pick("s1");
    let modeL: [number, number] = [0, 0];
    dragEnabled = false;
    let coordO = 1;

    // hero handoff: S1 poster melts into the video, the S2 still into live filaments
    const hand = handT < 0 ? 0 : clamp(handT / 1);
    if (i === 0) {
      dragEnabled = true;
      target = st.value / 100;
      const s1 = pick("s1");
      LA = handT < 0 || s1.tex === poster("s1").tex ? poster("s1") : s1;
      LB = s1;
      leftMix = handT < 0 ? 0 : hand;
      if (hand >= 1) LA = s1;
      partA = particlesOK ? hand : 0;
      rightDim = lerp(1, 0.32, particlesOK ? hand : 0);
      // dissolve into the S3 aperture across the pinned stretch
      if (p > 0) {
        LA = s1;
        LB = pick("s3");
        modeL = [0, 1];
        leftMix = p;
      }
      partA *= lerp(1, 0.6, p);
    } else if (i === 1) {
      dragEnabled = p < 0.7;
      LA = pick("s3");
      LB = pick("s4");
      modeL = [1, 0];
      partA = 0.6;
      width = ramp(p, 0.72, 0.92) * 0.34;
      if (tr > 0) {
        const e = elastic(ramp(tr, 0, 0.45));
        width = 0.34 * (1 - Math.min(e, 1));
        wobble = Math.max(0, e - 1) * 4 * (1 - ramp(tr, 0.3, 0.6));
        leftMix = ramp(tr, 0.25, 0.9);
      }
    } else if (i === 2) {
      LA = pick("s4");
      LB = pick("s4");
      dragEnabled = p < 0.62;
      partA = 0.6;
      if (p < 0.14) target = 0.5 + b * 0.2;
      else if (p < 0.4) target = 0.72 + b * 0.2;
      else if (p < 0.64) target = 0.28 + b * 0.2;
      else target = 0.5;
      if (p >= 0.38) {
        R = ["s2", "s5"];
        rightMix = ramp(p, 0.38, 0.45);
        rightDim = lerp(0.32, 0.9, rightMix);
      }
      if (p >= 0.4 && p < 0.64) partA = 0.6 * (1 - ramp(p, 0.6, 0.64));
      width = ramp(p, 0.7, 0.86);
      centerTex = 1;
      if (p > 0.64) partA = 0.6 * (1 - ramp(p, 0.64, 0.7));
      if (tr > 0) {
        // the gap compresses and the seam turns into the toolpath
        full = 1;
        F = ["s6", "s7"];
        fullMix = ramp(tr, 0.1, 0.75);
        rotate = ramp(tr, 0.0, 0.6);
        width = 1 - ramp(tr, 0.0, 0.5);
        target = 0.5;
        coordO = 1 - ramp(tr, 0, 0.3);
      }
    } else if (i === 3) {
      full = 1;
      F = ["s7", "s8"];
      process = 1;
      rotate = 1;
      target = 0.5;
      coordO = 0;
      toolDim = ramp(p, 0.9, 1);
      if (tr > 0) {
        process = 1 - ramp(tr, 0, 0.35);
        rotate = 1 - ramp(tr, 0.05, 0.65);
        fullMix = ramp(tr, 0.15, 0.85);
      }
    } else {
      full = 1;
      F = ["s8", "s8"];
      target = 0.5;
      coordO = 0;
      lineLen = 1 - ramp(p, 0.45, 0.85);
      pointY = 0.5 + ramp(tr, 0, 1) * 0.65;
      lineAlpha = 1;
    }
    if (i >= 3) partA = 0;

    // scrubbed clips
    if (i === 1 || (i === 0 && p > 0)) scrubClip("s3", i === 0 ? 0 : ramp(p, 0.08, 0.75));
    if (i === 2 || (i === 1 && tr > 0)) scrubClip("s4", i === 1 ? 0 : ramp(p, 0.12, 0.4));
    if (i === 2) scrubClip("s5", ramp(p, 0.4, 0.64));
    if (i === 4 || (i === 3 && tr > 0)) scrubClip("s8", i === 3 ? tr * 0.2 : 0.2 + ramp(p, 0, 0.9) * 0.8);
    wantPlay(i === 0 ? ["s1"] : i === 2 && p > 0.6 ? ["s6"] : []);

    // seam spring and cursor bend
    seam.target = clamp(target, 0.1, 0.9);
    if (dragging && dragEnabled) seam.target = st.value / 100;
    spring(seam, 140, 15, dt);
    const dx = mouse.on ? mouse.x - seamPx : 9999;
    const reach = 0.18 * W;
    bendS.target = dragEnabled && Math.abs(dx) < reach ? clamp(dx, -0.06 * W, 0.06 * W) * (1 - Math.abs(dx) / reach) : 0;
    spring(bendS, 60, 9, dt);

    // slots
    const sx = seam.x * W;
    // S3 sits in a tall framed aperture inside the left half; everything else covers the half.
    const leftRect = (aspect: number, mode: number): Rect => {
      if (mode !== 1) return coverRect(0, 0, Math.max(sx, 1), H, aspect, 1, 0.5);
      const h = H * 0.84;
      const w = h * aspect;
      return [Math.max(sx * 0.5 - w / 2, 24), H * 0.08, w, h];
    };
    U.uLeftA.value = LA.tex;
    U.uLeftB.value = LB.tex;
    setRect(U.uRectLA.value, leftRect(LA.aspect, modeL[0]));
    setRect(U.uRectLB.value, leftRect(LB.aspect, modeL[1]));
    U.uModeLA.value = modeL[0];
    U.uModeLB.value = modeL[1];
    U.uLeftMix.value = leftMix;

    const RA = R[0] === "s2" ? poster("s2") : pick(R[0]);
    const RB = R[1] === "s2" ? poster("s2") : pick(R[1]);
    const seedRect = coverRect(sx, 0, Math.max(W - sx, 1), H, poster("s2").aspect, 0, 0.5);
    U.uRightA.value = RA.tex;
    U.uRightB.value = RB.tex;
    setRect(U.uRectRA.value, seedRect);
    setRect(U.uRectRB.value, coverRect(sx, 0, Math.max(W - sx, 1), H, RB.aspect, 0, 0.5));
    U.uRightMix.value = rightMix;
    U.uRightDim.value = particlesOK ? rightDim : Math.max(rightDim, 0.9);

    const C = pick("s6");
    U.uCenter.value = C.tex;
    setRect(U.uRectC.value, coverRect(0, 0, W, H, C.aspect, 0.5, 0.62));
    U.uCenterTex.value = centerTex;

    const plate = (id: string): { tex: THREE.Texture; rect: Rect; mode: number } => {
      if (id === "s7") {
        const pt = poster("s7");
        const ph = H * 1.3;
        const pw = ph * pt.aspect;
        return { tex: pt.tex, rect: [-smooth.track * 0.6, H * 0.62 - 0.505 * ph, pw, ph], mode: 2 };
      }
      const s = pick(id);
      return { tex: s.tex, rect: id === "s6" ? coverRect(0, 0, W, H, s.aspect, 0.5, 0.62) : coverRect(0, 0, W, H, s.aspect, 0.5, 0.5), mode: 0 };
    };
    const fa = plate(F[0]);
    const fb = plate(F[1]);
    U.uFullA.value = fa.tex;
    U.uFullB.value = fb.tex;
    setRect(U.uRectFA.value, fa.rect);
    setRect(U.uRectFB.value, fb.rect);
    U.uModeFA.value = fa.mode;
    U.uModeFB.value = fb.mode;
    U.uFullMix.value = fullMix;
    U.uFull.value = full;

    U.uSeamX.value = sx;
    U.uSeamY.value = seamY * H;
    U.uRotate.value = rotate;
    U.uSeamWidth.value = width * W * 1.06;
    U.uBend.value = bendS.x;
    U.uMouseY.value = mouse.on ? mouse.y : H / 2;
    U.uWobble.value = wobble;
    U.uLineLen.value = lineLen;
    U.uLineAlpha.value = lineAlpha;
    U.uPointY.value = pointY;
    U.uProcess.value = process;
    U.uToolDim.value = toolDim;
    U.uParticleAlpha.value = particlesOK ? partA : 0;
    U.uHeatAmt.value = heatOn ? 1 : 0;

    // process track
    const trackW = track.scrollWidth;
    const shiftTarget = i === 3 ? p * Math.max(0, trackW - W) : i > 3 ? Math.max(0, trackW - W) : 0;
    smooth.track = st.paused ? shiftTarget : smooth.track + (shiftTarget - smooth.track) * Math.min(1, dt * 9);
    css(track, "transform", `translate3d(${(-smooth.track).toFixed(1)}px,0,0)`);
    U.uWorldX.value = smooth.track / W;
    if (stations.length === 3) {
      U.uStations.value.set(stations[0].offsetLeft / W + 0.1, stations[1].offsetLeft / W + 0.1, stations[2].offsetLeft / W + 0.1);
    }
    vis(el.trackEnd, i === 3 ? 0.4 + 0.6 * ramp(p, 0.8, 0.95) : 1);

    // CSS seam position for the DOM halves
    const sxv = (seam.x * 100).toFixed(2);
    if (root.style.getPropertyValue("--sx") !== sxv) root.style.setProperty("--sx", sxv);
    root.dataset.drag = dragEnabled ? "on" : "off";
    vis(el.coord, coordO);

    // hero
    const heroOut = i === 0 ? p : 1;
    css(el.h1l, "translate", `0 ${(-heroOut * 10).toFixed(2)}vh`);
    css(el.h1r, "translate", `0 ${(heroOut * 10).toFixed(2)}vh`);
    const lab = 1 - ramp(heroOut, 0, 0.6);
    if (handT >= 0) {
      vis(el.heroLabel, lab);
      vis(el.heroVert, lab);
      vis(el.heroSub, 1 - ramp(heroOut, 0, 0.4));
    }

    // company
    if (i === 1) {
      css(el.c1h2, "opacity", (1 - 0.85 * ramp(p, 0.16, 0.3) - 0.15 * ramp(p, 0.7, 0.75)).toFixed(3));
      css(el.c1h2, "translate", `0 ${(-ramp(p, 0.16, 0.3) * 8).toFixed(2)}vh`);
      const pr = ramp(p, 0.2, 0.38);
      const pl = ramp(p, 0.32, 0.5);
      const out = 1 - ramp(p, 0.68, 0.74);
      wipe(el.plateR.firstElementChild as HTMLElement, pr);
      wipe(el.plateL.firstElementChild as HTMLElement, pl);
      vis(el.plateR, Math.min(ramp(p, 0.18, 0.22), out));
      vis(el.plateL, Math.min(ramp(p, 0.3, 0.34), out));
      vis(el.gapLine, Math.min(ramp(p, 0.82, 0.92), 1 - ramp(tr, 0, 0.15)));
    } else if (i === 0) {
      vis(el.plateR, 0);
      vis(el.plateL, 0);
      vis(el.gapLine, 0);
      css(el.c1h2, "opacity", "1");
      css(el.c1h2, "translate", "0 0");
    }

    // fields
    if (i <= 2) {
      const pp = i === 2 ? p : 0;
      vis(el.intro, 1 - ramp(pp, 0.1, 0.15));
      vis(el.f1, Math.min(ramp(pp, 0.16, 0.2), 1 - ramp(pp, 0.36, 0.4)));
      vis(el.f2, Math.min(ramp(pp, 0.43, 0.47), 1 - ramp(pp, 0.6, 0.64)));
      vis(el.between, i === 2 ? Math.min(ramp(pp, 0.82, 0.88), 1 - ramp(tr, 0, 0.25)) : 0);
    }

    // closer convergence
    {
      const cp = i === 4 ? ramp(p, 0, 0.8) : i > 4 ? 1 : 0;
      const e = 1 - Math.pow(1 - cp, 3);
      const gap = (1 - e) * 6;
      css(el.closeL, "translate", `${(-gap).toFixed(2)}vw 0`);
      css(el.closeR, "translate", `${gap.toFixed(2)}vw 0`);
      const ls = lerp(0.08, -0.035, e).toFixed(3) + "em";
      css(el.closeL, "letter-spacing", ls);
      css(el.closeR, "letter-spacing", ls);
      css(el.closeL, "font-variation-settings", `"wdth" ${lerp(72, 100, e).toFixed(1)}, "wght" ${lerp(800, 600, e).toFixed(0)}`);
      css(el.closeR, "font-variation-settings", `"wdth" ${lerp(110, 100, e).toFixed(1)}, "wght" ${lerp(300, 600, e).toFixed(0)}`);
      css(el.closeR, "color", e > 0.98 ? "var(--paper)" : "var(--alloy)");
      vis(el.closeSub, i === 4 ? ramp(p, 0.75, 0.9) : i > 4 ? 1 : 0);
    }

    // cursor swap
    if (finePointer && mouse.on) {
      mouse.sx += (mouse.x - mouse.sx) * (st.paused ? 1 : 0.2);
      mouse.sy += (mouse.y - mouse.sy) * (st.paused ? 1 : 0.2);
      css(cursor, "transform", `translate3d(${mouse.sx.toFixed(1)}px,${mouse.sy.toFixed(1)}px,0)`);
      const side = rotate > 0.5 || full > 0.5 ? "l" : mouse.x < sx ? "l" : "r";
      if (root.dataset.side !== side) root.dataset.side = side;
    }

    return { i, p, tr };
  };

  // ---------- frame loop ----------
  let last = performance.now();
  let visible = true;
  const onVis = () => {
    visible = !document.hidden;
    dirty = true;
  };
  document.addEventListener("visibilitychange", onVis);

  const tick = () => {
    if (!running) return;
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!visible) return;
    const animate = !st.paused;
    if (!animate && !dirty && !dragging) return;
    if (handT >= 0 && animate) handT += dt;
    if (animate) time += dt;
    update(dt);
    dirty = false;

    // canvas is fully covered once the footer reaches the top
    if (footer.getBoundingClientRect().top <= 0) return;

    U.uTime.value = time;
    const mx = mouse.on ? mouse.x / W : -1;
    const my = mouse.on ? mouse.y / H : -1;

    if (animate && heatOn) {
      const speed = Math.hypot(mouse.vx, mouse.vy);
      heatMat.uniforms.uPrev.value = heatA.texture;
      heatMat.uniforms.uMouse.value.set(mx, 1 - my);
      heatMat.uniforms.uRadius.value = 0.03 + Math.min(speed, 3) * 0.02;
      heatMat.uniforms.uAmt.value = mouse.on && mx < seam.x ? Math.min(0.08 + speed * 0.12, 0.5) : 0;
      renderer.setRenderTarget(heatB);
      renderer.render(heatScene, cam);
      [heatA, heatB] = [heatB, heatA];
      U.uHeat.value = heatA.texture;
      mouse.vx *= 0.85;
      mouse.vy *= 0.85;
    }

    if (particlesOK && gpu && posVar && velVar && U.uParticleAlpha.value > 0.001) {
      const seedRect = U.uRectRA.value;
      const imx = mouse.on ? (mouse.x - seedRect.x) / seedRect.z : -9;
      const imy = mouse.on ? (mouse.y - seedRect.y) / seedRect.w : -9;
      if (animate) {
        const vu = velVar.material.uniforms;
        vu.uTime.value = time;
        vu.uDt.value = dt;
        vu.uMouse.value.set(imx, imy);
        vu.uMouseOn.value = mouse.on && mouse.x > seam.x * W ? 1 : 0;
        vu.uAspect.value = seedRect.z / seedRect.w;
        posVar.material.uniforms.uDt.value = dt;
        gpu.compute();
      }
      const bcount = Math.round(lerp(particleCount, Math.min(particleCount, 24000), clamp(bias(st.value) / 0.6)));
      pointGeo.setDrawRange(0, bcount);
      pointMat.uniforms.tPos.value = gpu.getCurrentRenderTarget(posVar).texture;
      pointMat.uniforms.uRect.value.copy(seedRect);
      pointMat.uniforms.uMouse.value.set(imx, imy);
      renderer.setRenderTarget(pointsRT);
      renderer.setClearColor(0x000000, 1);
      renderer.clear();
      renderer.render(pointScene, cam);
    }

    renderer.setRenderTarget(null);
    renderer.render(compScene, cam);

    if (animate && handT >= 0 && !fixedQuality) {
      frameAvg = lerp(frameAvg, dt * 1000, 0.05);
      ladderClock += dt;
      if (ladderClock > 2) {
        ladderClock = 0;
        if (frameAvg > 24) applyLadder(3);
        else if (frameAvg > 20) applyLadder(2);
        else if (frameAvg > 18) applyLadder(1);
      }
    }
  };
  gsap.ticker.add(tick);

  ensureClip("s1");

  const stage: Stage = {
    handoff() {
      if (handT >= 0) return;
      handT = 0;
      root.dataset.gl = "on";
      dirty = true;
      // everything else streams in behind the hero
      ["s3", "s4", "s5", "s6", "s8"].forEach((id) => loadPoster(id));
      loadPoster("s7", true);
    },
    setPaused(p: boolean) {
      st.paused = p;
      if (p) Object.values(clips).forEach((c) => c.el.pause());
      dirty = true;
    },
    setBias() {
      dirty = true;
    },
    destroy() {
      running = false;
      gsap.ticker.remove(tick);
      gsap.ticker.remove(lenisRaf);
      lenis.destroy();
      triggers.forEach((t) => t.kill(true));
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVis);
      handle.removeEventListener("pointerdown", onDown);
      handle.removeEventListener("pointerup", onUp);
      handle.removeEventListener("pointercancel", onUp);
      handle.removeEventListener("keydown", onKey);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      Object.values(clips).forEach((c) => {
        c.el.pause();
        c.el.removeAttribute("src");
        c.el.load();
        c.tex.dispose();
      });
      Object.values(posters).forEach((p) => p.tex.dispose());
      styled.forEach((e) => e.removeAttribute("style"));
      root.style.removeProperty("--sx");
      delete root.dataset.gl;
      delete root.dataset.drag;
      delete root.dataset.side;
      delete root.dataset.cursor;
      heatA.dispose();
      heatB.dispose();
      pointsRT.dispose();
      gpu?.dispose();
      compMat.dispose();
      heatMat.dispose();
      pointMat.dispose();
      pointGeo.dispose();
      renderer.dispose();
    },
  };
  return stage;
}

// Seeds the filament field from the S2 still: every particle starts on a bright filament or node.
async function buildSeeds(img?: HTMLImageElement): Promise<THREE.DataTexture | null> {
  if (!img) return null;
  const w = 192;
  const h = Math.round(w / (img.naturalWidth / img.naturalHeight));
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const bright: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const k = (y * w + x) * 4;
      const lum = (0.2126 * px[k] + 0.7152 * px[k + 1] + 0.0722 * px[k + 2]) / 255;
      if (lum > 0.35) bright.push(x, y);
    }
  }
  if (bright.length < 200) return null;
  const n = bright.length / 2;
  const data = new Float32Array(FULL_COUNT * 4);
  for (let i = 0; i < FULL_COUNT; i++) {
    const j = Math.floor(Math.random() * n);
    data[i * 4] = (bright[j * 2] + Math.random()) / w;
    data[i * 4 + 1] = (bright[j * 2 + 1] + Math.random()) / h;
    data[i * 4 + 2] = 0;
    data[i * 4 + 3] = 1;
  }
  const tex = new THREE.DataTexture(data, SIM, SIM, THREE.RGBAFormat, THREE.FloatType);
  tex.needsUpdate = true;
  return tex;
}
