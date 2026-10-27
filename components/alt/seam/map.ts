// Footer map: the prebaked OSM street SVG is inlined so its roads can draw in as copper hairlines.
// The Dallas North Tollway (the last road path in the file) draws last and brightest; it is the seam's final position.

export function initMap(root: HTMLElement, reduced: () => boolean) {
  const host = root.querySelector<HTMLElement>(".foot-map-svg");
  const footer = root.querySelector<HTMLElement>(".ch-foot");
  if (!host || !footer) return { redraw() {}, destroy() {} };
  let paths: SVGPathElement[] = [];
  let alive = true;

  fetch("/assets/office-map.svg")
    .then((r) => r.text())
    .then((txt) => {
      if (!alive) return;
      const doc = new DOMParser().parseFromString(txt, "image/svg+xml");
      const svg = doc.documentElement;
      if (svg.nodeName.toLowerCase() !== "svg") return;
      svg.setAttribute("aria-hidden", "true");
      svg.setAttribute("focusable", "false");
      svg.setAttribute("preserveAspectRatio", "xMidYMid slice");
      svg.removeAttribute("width");
      svg.removeAttribute("height");
      host.replaceChildren(document.importNode(svg, true));
      paths = Array.from(host.querySelectorAll<SVGPathElement>("path")).filter((p) => p.getAttribute("fill") === "none");
      paths.forEach((p, i, all) => {
        p.setAttribute("pathLength", "1");
        p.style.strokeDasharray = "1 1";
        if (i === all.length - 1) {
          p.style.stroke = "#C17D50";
          p.style.strokeOpacity = "1";
          p.style.strokeWidth = "2.2";
          p.style.filter = "drop-shadow(0 0 4px rgba(193,125,80,.8))";
        }
      });
      draw();
    })
    .catch(() => {});

  const draw = () => {
    if (!paths.length) return;
    const r = footer.getBoundingClientRect();
    const vh = innerHeight;
    const p = reduced() ? 1 : Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.95)));
    paths.forEach((path, i) => {
      const isTollway = i === paths.length - 1;
      const start = isTollway ? 0.55 : i * 0.08;
      const span = isTollway ? 0.45 : 0.5;
      const local = Math.min(1, Math.max(0, (p - start) / span));
      path.style.strokeDashoffset = String(1 - local);
    });
  };
  window.addEventListener("scroll", draw, { passive: true });
  window.addEventListener("resize", draw);
  return {
    redraw: draw,
    destroy() {
      alive = false;
      window.removeEventListener("scroll", draw);
      window.removeEventListener("resize", draw);
    },
  };
}
