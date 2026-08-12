export interface PixelSelection {
  /** Path in document coordinates defining the selection boundary. */
  path: Path2D | null;
  /** Optional raster mask; 255 = selected. */
  mask: ImageData | null;
  feather: number;
  mode: 'new' | 'add' | 'subtract' | 'intersect';
}

export function createEmptySelection(): PixelSelection {
  return { path: null, mask: null, feather: 0, mode: 'new' };
}

export function selectionBounds(
  selection: PixelSelection,
): { x: number; y: number; width: number; height: number } | null {
  if (!selection.mask) return null;
  const { data, width, height } = selection.mask;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3]! > 0) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

export function rectSelectionMask(
  canvasW: number,
  canvasH: number,
  x: number,
  y: number,
  w: number,
  h: number,
): ImageData {
  const data = new Uint8ClampedArray(canvasW * canvasH * 4);
  const x0 = Math.max(0, Math.floor(Math.min(x, x + w)));
  const y0 = Math.max(0, Math.floor(Math.min(y, y + h)));
  const x1 = Math.min(canvasW, Math.ceil(Math.max(x, x + w)));
  const y1 = Math.min(canvasH, Math.ceil(Math.max(y, y + h)));
  for (let yy = y0; yy < y1; yy++) {
    for (let xx = x0; xx < x1; xx++) {
      const i = (yy * canvasW + xx) * 4;
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, canvasW, canvasH);
}

export function ellipseSelectionMask(
  canvasW: number,
  canvasH: number,
  x: number,
  y: number,
  w: number,
  h: number,
): ImageData {
  const data = new Uint8ClampedArray(canvasW * canvasH * 4);
  const cx = x + w / 2;
  const cy = y + h / 2;
  const rx = Math.abs(w / 2);
  const ry = Math.abs(h / 2);
  if (rx < 1 || ry < 1) return new ImageData(data, canvasW, canvasH);
  for (let yy = 0; yy < canvasH; yy++) {
    for (let xx = 0; xx < canvasW; xx++) {
      const dx = (xx - cx) / rx;
      const dy = (yy - cy) / ry;
      if (dx * dx + dy * dy <= 1) {
        const i = (yy * canvasW + xx) * 4;
        data[i] = 255;
        data[i + 1] = 255;
        data[i + 2] = 255;
        data[i + 3] = 255;
      }
    }
  }
  return new ImageData(data, canvasW, canvasH);
}

/** Build a selection mask from a freehand polygon (lasso). */
export function pathSelectionMask(
  canvasW: number,
  canvasH: number,
  points: ReadonlyArray<{ x: number; y: number }>,
): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, canvasW, canvasH);
  if (points.length < 3) {
    return ctx.getImageData(0, 0, canvasW, canvasH);
  }
  ctx.beginPath();
  ctx.moveTo(points[0]!.x, points[0]!.y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i]!.x, points[i]!.y);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  const raw = ctx.getImageData(0, 0, canvasW, canvasH);
  // Normalize to opaque white where filled
  for (let i = 0; i < raw.data.length; i += 4) {
    if (raw.data[i + 3]! > 0) {
      raw.data[i] = 255;
      raw.data[i + 1] = 255;
      raw.data[i + 2] = 255;
      raw.data[i + 3] = 255;
    }
  }
  return raw;
}

function colorDistance(
  data: Uint8ClampedArray,
  i: number,
  r: number,
  g: number,
  b: number,
  a: number,
): number {
  return (
    Math.abs(data[i]! - r) +
    Math.abs(data[i + 1]! - g) +
    Math.abs(data[i + 2]! - b) +
    Math.abs(data[i + 3]! - a) * 0.5
  );
}

/** Flood-fill selection from a seed pixel (magic wand). */
export function magicWandSelectionMask(
  source: ImageData,
  seedX: number,
  seedY: number,
  tolerance = 32,
  allowTransparentSeed = false,
): ImageData {
  const { width, height, data } = source;
  const mask = new Uint8ClampedArray(width * height * 4);
  const x0 = Math.max(0, Math.min(width - 1, Math.round(seedX)));
  const y0 = Math.max(0, Math.min(height - 1, Math.round(seedY)));
  const seedI = (y0 * width + x0) * 4;
  const sr = data[seedI]!;
  const sg = data[seedI + 1]!;
  const sb = data[seedI + 2]!;
  const sa = data[seedI + 3]!;
  if (sa === 0 && !allowTransparentSeed) return new ImageData(mask, width, height);

  const visited = new Uint8Array(width * height);
  const stack: number[] = [x0, y0];
  const maxDist = tolerance * 4;

  while (stack.length) {
    const y = stack.pop()!;
    const x = stack.pop()!;
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const idx = y * width + x;
    if (visited[idx]) continue;
    visited[idx] = 1;
    const i = idx * 4;
    if (colorDistance(data, i, sr, sg, sb, sa) > maxDist) continue;
    mask[i] = 255;
    mask[i + 1] = 255;
    mask[i + 2] = 255;
    mask[i + 3] = 255;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }
  return new ImageData(mask, width, height);
}

/** Copy a circular stamp from `src` into `dest` (clone) or blend (heal). */
export function stampCircle(
  dest: ImageData,
  src: ImageData,
  destX: number,
  destY: number,
  srcX: number,
  srcY: number,
  radius: number,
  mode: 'clone' | 'heal' | 'erase',
): void {
  const r = Math.max(1, Math.round(radius));
  const r2 = r * r;
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy > r2) continue;
      const dxp = Math.round(destX + dx);
      const dyp = Math.round(destY + dy);
      const sxp = Math.round(srcX + dx);
      const syp = Math.round(srcY + dy);
      if (dxp < 0 || dyp < 0 || dxp >= dest.width || dyp >= dest.height) continue;
      if (sxp < 0 || syp < 0 || sxp >= src.width || syp >= src.height) continue;
      const di = (dyp * dest.width + dxp) * 4;
      const si = (syp * src.width + sxp) * 4;
      const edge = 1 - Math.sqrt(dx * dx + dy * dy) / r;
      const a = Math.max(0, Math.min(1, edge));
      if (mode === 'erase') {
        dest.data[di + 3] = Math.round(dest.data[di + 3]! * (1 - a));
        continue;
      }
      const sr = src.data[si]!;
      const sg = src.data[si + 1]!;
      const sb = src.data[si + 2]!;
      const sa = (src.data[si + 3]! / 255) * a;
      if (sa <= 0) continue;
      if (mode === 'heal') {
        const dr = dest.data[di]!;
        const dg = dest.data[di + 1]!;
        const db = dest.data[di + 2]!;
        const da = dest.data[di + 3]! / 255;
        if (da <= 0.001) {
          // Empty destination — seed from source then soften
          dest.data[di] = sr;
          dest.data[di + 1] = sg;
          dest.data[di + 2] = sb;
          dest.data[di + 3] = Math.round(sa * 255);
        } else {
          const t = Math.min(1, sa * 0.65);
          dest.data[di] = Math.round(dr * (1 - t) + sr * t);
          dest.data[di + 1] = Math.round(dg * (1 - t) + sg * t);
          dest.data[di + 2] = Math.round(db * (1 - t) + sb * t);
          dest.data[di + 3] = Math.round(Math.min(255, (da + sa * (1 - da)) * 255));
        }
      } else {
        const da = dest.data[di + 3]! / 255;
        const outA = sa + da * (1 - sa);
        if (outA <= 0) continue;
        dest.data[di] = Math.round(
          (sr * sa + dest.data[di]! * da * (1 - sa)) / outA,
        );
        dest.data[di + 1] = Math.round(
          (sg * sa + dest.data[di + 1]! * da * (1 - sa)) / outA,
        );
        dest.data[di + 2] = Math.round(
          (sb * sa + dest.data[di + 2]! * da * (1 - sa)) / outA,
        );
        dest.data[di + 3] = Math.round(outA * 255);
      }
    }
  }
}

export function cloneImageData(src: ImageData): ImageData {
  return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
}

export function emptyImageData(width: number, height: number): ImageData {
  return new ImageData(width, height);
}
