import { runBang } from "./impact";
import { initFlow } from "./flow";
import { initMap } from "./map";
import type { Stage } from "./scene";
import { type SeamState, readValue } from "./state";

type Mode = { setPaused(p: boolean): void; destroy(): void };

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!c.getContext("webgl2");
  } catch {
    return false;
  }
}

// Each split heading half has to fit its side of a centered seam.
function fitSplits(root: HTMLElement) {
  const stage = root.dataset.layout === "stage";
  const narrow = root.dataset.narrow === "1";
  root.querySelectorAll<HTMLElement>(".split").forEach((h) => {
    const isH1 = h.classList.contains("h1");
    if (h.classList.contains("converge")) return;
    if (!stage && !(isH1 && !narrow)) {
      if (isH1) root.style.setProperty("--fit-h1", "1");
      else h.style.removeProperty("--fit");
      return;
    }
    const prop = isH1 ? "--fit-h1" : "--fit";
    const target = isH1 ? root : h;
    target.style.setProperty(prop, "1");
    const avail = innerWidth * 0.5 - 40;
    const widest = Math.max(...Array.from(h.querySelectorAll<HTMLElement>(".l, .r")).map((s) => s.offsetWidth));
    const fit = widest > avail ? avail / widest : 1;
    target.style.setProperty(prop, fit.toFixed(4));
  });
  const closer = root.querySelector<HTMLElement>(".converge");
  if (closer && stage) {
    closer.style.removeProperty("font-size");
    const w = closer.scrollWidth;
    if (w > innerWidth * 0.92) closer.style.fontSize = `calc(var(--t-giga) * ${((innerWidth * 0.92) / w).toFixed(4)})`;
  }
}

export function boot(root: HTMLElement) {
  const ds = root.dataset;
  document.documentElement.style.scrollBehavior = "auto";
  const st: SeamState = {
    reduced: ds.reduced === "1",
    narrow: ds.narrow === "1",
    saveData: ds.saveData === "1",
    paused: ds.reduced === "1",
    value: readValue(),
  };
  const pauseBtn = root.querySelector<HTMLButtonElement>('[data-ctl="pause"]')!;
  const reduceBtn = root.querySelector<HTMLButtonElement>('[data-ctl="reduce"]')!;

  let mode: Mode | null = null;
  let alive = true;
  let generation = 0;
  let bang: { cancel(): void } | null = null;

  const renderControls = () => {
    pauseBtn.textContent = st.paused ? "play" : "pause";
    pauseBtn.setAttribute("aria-pressed", String(st.paused));
    reduceBtn.setAttribute("aria-pressed", String(st.reduced));
    ds.paused = st.paused ? "1" : "0";
  };

  const map = initMap(root, () => st.reduced);

  const startFlow = () => {
    ds.layout = "flow";
    fitSplits(root);
    mode = initFlow(root, st);
  };

  const startStage = (withBang: boolean) => {
    ds.layout = "stage";
    fitSplits(root);
    const gen = ++generation;
    let ready: Stage | null = null;
    let wantHandoff = !withBang;
    const holder: Mode = {
      setPaused: (p) => {
        st.paused = p;
        ready?.setPaused(p);
      },
      destroy: () => {
        ready?.destroy();
        ready = null;
      },
    };
    mode = holder;
    import("./scene")
      .then(({ createStage }) => createStage(root, st, () => fallBack()))
      .then((s) => {
        if (!alive || gen !== generation) return s.destroy();
        ready = s;
        if (wantHandoff) s.handoff();
      })
      .catch(() => fallBack());
    if (withBang) {
      bang = runBang({
        root,
        narrow: false,
        onHandoff: () => {
          wantHandoff = true;
          ready?.handoff();
        },
        onDone: () => (bang = null),
      });
    }
  };

  // WebGL lost or unavailable: the CSS seam and posters carry the page.
  const fallBack = () => {
    if (!alive || ds.layout === "flow") return;
    generation++;
    mode?.destroy();
    startFlow();
  };

  const wantsStage = () => !st.reduced && !st.narrow && hasWebGL();

  if (wantsStage()) {
    startStage(ds.prebang === "1");
  } else {
    startFlow();
    if (ds.prebang === "1" && !st.reduced) {
      bang = runBang({ root, narrow: st.narrow, onHandoff: () => {}, onDone: () => (bang = null) });
    }
  }
  renderControls();

  const onPause = () => {
    st.paused = !st.paused;
    mode?.setPaused(st.paused);
    renderControls();
  };
  const onReduce = () => {
    st.reduced = !st.reduced;
    localStorage.setItem("seam-reduced", st.reduced ? "1" : "0");
    ds.reduced = st.reduced ? "1" : "0";
    bang?.cancel();
    generation++;
    mode?.destroy();
    st.paused = st.reduced;
    if (wantsStage()) startStage(false);
    else startFlow();
    renderControls();
    map.redraw();
  };
  pauseBtn.addEventListener("click", onPause);
  reduceBtn.addEventListener("click", onReduce);

  const onFonts = () => fitSplits(root);
  document.fonts?.ready.then(() => alive && onFonts());
  let rz = 0;
  const onResize = () => {
    cancelAnimationFrame(rz);
    rz = requestAnimationFrame(() => fitSplits(root));
  };
  window.addEventListener("resize", onResize);

  return {
    destroy() {
      alive = false;
      bang?.cancel();
      mode?.destroy();
      map.destroy();
      pauseBtn.removeEventListener("click", onPause);
      reduceBtn.removeEventListener("click", onReduce);
      window.removeEventListener("resize", onResize);
    },
  };
}
