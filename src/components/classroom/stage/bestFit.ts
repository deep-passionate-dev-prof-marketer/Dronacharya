/**
 * Google Meet-style tile sizing: try every column count and keep the one that gives the largest
 * tile while fitting `count` tiles of the given aspect ratio inside the container.
 */
export interface GridFit {
  cols: number;
  rows: number;
  tileW: number;
  tileH: number;
}

export function bestFit(count: number, width: number, height: number, aspect = 16 / 9, gap = 8): GridFit {
  const n = Math.max(1, count);
  let best: GridFit = { cols: 1, rows: n, tileW: 0, tileH: 0 };
  for (let cols = 1; cols <= n; cols++) {
    const rows = Math.ceil(n / cols);
    let tileW = (width - gap * (cols - 1)) / cols;
    let tileH = tileW / aspect;
    if (tileH * rows + gap * (rows - 1) > height) {
      tileH = (height - gap * (rows - 1)) / rows;
      tileW = tileH * aspect;
    }
    if (tileW > best.tileW) best = { cols, rows, tileW: Math.floor(tileW), tileH: Math.floor(tileH) };
  }
  return best;
}

/** How many tiles fit per page before they get too small to be useful (min ~160px wide). */
export function tilesPerPage(width: number, height: number, aspect = 16 / 9, gap = 8, minW = 160, cap = 25): number {
  let n = cap;
  while (n > 1 && bestFit(n, width, height, aspect, gap).tileW < minW) n--;
  return n;
}
