const PALETTE = [[193, 125, 80], [100, 149, 208], [99, 179, 157]];
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const EDGES = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 2], [0, 1]], [[0, 2]], [[3, 2]], [[2, 3]], [[0, 2]], [[0, 3], [1, 2]], [[1, 2]], [[1, 3]], [[0, 1]], [[3, 0]], []];
const CORNER_X = [0, 1, 1, 0], CORNER_Y = [0, 0, 1, 1];

// The same contour field as the approved Broad ridges study. Grid resolution is
// independent of device pixel ratio, keeping the geometry bounded on big screens.
export function createRidgeField(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const step = Math.max(6, width / 132, height / 140);
  const nx = Math.ceil(width / step) + 1, ny = Math.ceil(height / step) + 1;
  const field = new Float32Array(nx * ny);
  const levels = 28, interval = .08;
  // Reuse scratch storage instead of allocating arrays for every grid cell.
  const paths: number[][] = Array.from({ length: levels + 1 }, () => []);
  const values = [0, 0, 0, 0];
  const baseX = Float64Array.from({ length: nx }, (_, x) => (x * step - width * .67) / height);
  const baseY = Float64Array.from({ length: ny }, (_, y) => y * step / height - .5);
  const shade = ctx.createLinearGradient(0, 0, width * .80, 0);
  shade.addColorStop(0, "#101218e8");
  shade.addColorStop(.58, "#10121890");
  shade.addColorStop(1, "#10121818");

  return (position: number, pointerX = 0, pointerY = 0, time = 0, still = false) => {
    const p = Math.max(0, Math.min(2, position));
    const terrainPosition = still ? 0 : p;
    // Ambient movement is bounded: it changes relief without advancing chapters.
    const phase = terrainPosition * Math.PI * 2 + Math.sin(time * .16) * .24;
    const zoom = 1 + .12 * Math.sin(phase * .7);
    const angle = .13 * Math.sin(phase * .65) + pointerX * .025;
    const ca = Math.cos(angle), sa = Math.sin(angle), travel = terrainPosition * .48;
    const hills = [
      [.10 + .14 * Math.sin(phase * .75), .30, .24 * (1 + .20 * Math.sin(phase)), .43, 1.8 + .26 * Math.sin(phase * .8), .5 + .35 * Math.sin(phase * .6)],
      [.54 - .17 * Math.sin(phase * .58), .96 + .10 * Math.sin(phase), .24, .34 * (1 + .20 * Math.cos(phase * .7)), 1.6 + .28 * Math.sin(phase * .7 + 1), .45 - .45 * Math.sin(phase * .6)],
      [-.33 + .10 * Math.sin(phase * .8), 1.1, .34, .21, 1.2 + .15 * Math.sin(phase), -.4],
      [.04 + .16 * Math.sin(phase * .5), 1.65, .26, .42, 1.85, .7 - .3 * Math.sin(phase * .6)],
      [.53 - .12 * Math.sin(phase * .7), 2.3, .29, .38, 1.7, -.5],
    ].map(([x, y, rx, ry, a, r]) => ({ x, y, rx, ry, a, cos: Math.cos(r), sin: Math.sin(r) }));

    for (let y = 0; y < ny; y++) {
      const yy = baseY[y] / zoom + pointerY * .055;
      for (let x = 0; x < nx; x++) {
        const xx = baseX[x] / zoom + pointerX * .07;
        let u = xx * ca - yy * sa, v = xx * sa + yy * ca + .5 + travel;
        u += .035 * Math.sin(v * 6 - phase * .6);
        v += .025 * Math.sin(u * 7 + phase * .5);
        let elevation = .065 * Math.sin(u * 8 + v * 5) + .06 * Math.cos(v * 11 - u * 3);
        const relief = 1 + .07 * Math.sin(u * 15 + v * 7);
        for (const hill of hills) {
          const dx = u - hill.x, dy = v - hill.y;
          const ax = (dx * hill.cos - dy * hill.sin) / hill.rx, ay = (dx * hill.sin + dy * hill.cos) / hill.ry;
          elevation += hill.a * Math.exp(-(ax * ax + ay * ay) * relief);
        }
        field[y * nx + x] = elevation;
      }
    }

    for (const path of paths) path.length = 0;
    for (let y = 0; y < ny - 1; y++) for (let x = 0; x < nx - 1; x++) {
      const id = y * nx + x;
      values[0] = field[id]; values[1] = field[id + 1];
      values[2] = field[id + nx + 1]; values[3] = field[id + nx];
      const lo = Math.max(1, Math.ceil(Math.min(values[0], values[1], values[2], values[3]) / interval));
      const hi = Math.min(levels, Math.floor(Math.max(values[0], values[1], values[2], values[3]) / interval));
      if (lo > hi) continue;
      const px = x * step, py = y * step;
      for (let l = lo; l <= hi; l++) {
        const threshold = l * interval;
        const mask = (values[0] >= threshold ? 1 : 0) | (values[1] >= threshold ? 2 : 0) | (values[2] >= threshold ? 4 : 0) | (values[3] >= threshold ? 8 : 0);
        for (const [a, b] of EDGES[mask]) {
          const a2 = (a + 1) % 4, b2 = (b + 1) % 4;
          const ta = (threshold - values[a]) / (values[a2] - values[a]), tb = (threshold - values[b]) / (values[b2] - values[b]);
          paths[l].push(
            px + step * mix(CORNER_X[a], CORNER_X[a2], ta),
            py + step * mix(CORNER_Y[a], CORNER_Y[a2], ta),
            px + step * mix(CORNER_X[b], CORNER_X[b2], tb),
            py + step * mix(CORNER_Y[b], CORNER_Y[b2], tb),
          );
        }
      }
    }

    const index = Math.min(1, Math.floor(p)), t = p - index, blend = t * t * (3 - 2 * t);
    const color = PALETTE[index].map((v, k) => mix(v, PALETTE[index + 1][k], blend));
    ctx.fillStyle = "#101218";
    ctx.fillRect(0, 0, width, height);
    for (let l = 1; l <= levels; l++) {
      const points = paths[l], major = l % 5 === 0;
      const light = Math.exp(-Math.pow((l - (6 + terrainPosition * 9)) / 2.2, 2));
      ctx.beginPath();
      for (let k = 0; k < points.length; k += 4) { ctx.moveTo(points[k], points[k + 1]); ctx.lineTo(points[k + 2], points[k + 3]); }
      ctx.strokeStyle = `rgba(${color.map(v => Math.round(mix(v, 255, light * .26))).join(",")},${Math.min(1, (major ? .78 : .39) + light * .24)})`;
      ctx.lineWidth = (major ? 1.2 : .78) + light * .22;
      ctx.stroke();
    }
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, width, height);
  };
}
