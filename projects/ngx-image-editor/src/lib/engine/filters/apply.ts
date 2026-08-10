import type { FilterDescriptor } from './types';

function clamp(v: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, v));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const hue2rgb = (p: number, q: number, t: number) => {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

function boxBlur(data: Uint8ClampedArray, w: number, h: number, radius: number): void {
  if (radius < 1) return;
  const tmp = new Uint8ClampedArray(data);
  const r = Math.floor(radius);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rSum = 0;
      let gSum = 0;
      let bSum = 0;
      let aSum = 0;
      let count = 0;
      for (let ky = -r; ky <= r; ky++) {
        const yy = Math.min(h - 1, Math.max(0, y + ky));
        for (let kx = -r; kx <= r; kx++) {
          const xx = Math.min(w - 1, Math.max(0, x + kx));
          const i = (yy * w + xx) * 4;
          rSum += tmp[i]!;
          gSum += tmp[i + 1]!;
          bSum += tmp[i + 2]!;
          aSum += tmp[i + 3]!;
          count++;
        }
      }
      const i = (y * w + x) * 4;
      data[i] = rSum / count;
      data[i + 1] = gSum / count;
      data[i + 2] = bSum / count;
      data[i + 3] = aSum / count;
    }
  }
}

function applyOne(imageData: ImageData, filter: FilterDescriptor): void {
  if (!filter.enabled) return;
  const { data, width, height } = imageData;
  const amount = filter.amount;

  switch (filter.type) {
    case 'brightness': {
      const delta = amount; // -100..100
      for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i]! + delta);
        data[i + 1] = clamp(data[i + 1]! + delta);
        data[i + 2] = clamp(data[i + 2]! + delta);
      }
      break;
    }
    case 'contrast': {
      const c = (amount + 100) / 100;
      const intercept = 128 * (1 - c);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i]! * c + intercept);
        data[i + 1] = clamp(data[i + 1]! * c + intercept);
        data[i + 2] = clamp(data[i + 2]! * c + intercept);
      }
      break;
    }
    case 'saturation': {
      const s = (amount + 100) / 100;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        data[i] = clamp(gray + (r - gray) * s);
        data[i + 1] = clamp(gray + (g - gray) * s);
        data[i + 2] = clamp(gray + (b - gray) * s);
      }
      break;
    }
    case 'hue': {
      const shift = (amount % 360) / 360;
      for (let i = 0; i < data.length; i += 4) {
        const [h, s, l] = rgbToHsl(data[i]!, data[i + 1]!, data[i + 2]!);
        const [r, g, b] = hslToRgb((h + shift + 1) % 1, s, l);
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
      break;
    }
    case 'blur': {
      boxBlur(data, width, height, Math.max(0, amount / 10));
      break;
    }
    case 'sharpen': {
      const strength = amount / 50;
      const src = new Uint8ClampedArray(data);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          const i = (y * width + x) * 4;
          for (let c = 0; c < 3; c++) {
            const center = src[i + c]!;
            const neighbors =
              src[i - 4 + c]! +
              src[i + 4 + c]! +
              src[i - width * 4 + c]! +
              src[i + width * 4 + c]!;
            data[i + c] = clamp(center + strength * (center * 4 - neighbors));
          }
        }
      }
      break;
    }
    case 'grayscale': {
      const t = Math.min(1, Math.max(0, amount / 100));
      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!;
        data[i] = data[i]! + (gray - data[i]!) * t;
        data[i + 1] = data[i + 1]! + (gray - data[i + 1]!) * t;
        data[i + 2] = data[i + 2]! + (gray - data[i + 2]!) * t;
      }
      break;
    }
    case 'sepia': {
      const t = Math.min(1, Math.max(0, amount / 100));
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]!;
        const g = data[i + 1]!;
        const b = data[i + 2]!;
        const sr = 0.393 * r + 0.769 * g + 0.189 * b;
        const sg = 0.349 * r + 0.686 * g + 0.168 * b;
        const sb = 0.272 * r + 0.534 * g + 0.131 * b;
        data[i] = clamp(r + (sr - r) * t);
        data[i + 1] = clamp(g + (sg - g) * t);
        data[i + 2] = clamp(b + (sb - b) * t);
      }
      break;
    }
    case 'invert': {
      const t = Math.min(1, Math.max(0, amount / 100));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = data[i]! + (255 - data[i]! - data[i]!) * t;
        data[i + 1] = data[i + 1]! + (255 - data[i + 1]! - data[i + 1]!) * t;
        data[i + 2] = data[i + 2]! + (255 - data[i + 2]! - data[i + 2]!) * t;
      }
      break;
    }
    case 'exposure': {
      const factor = Math.pow(2, amount / 100);
      for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i]! * factor);
        data[i + 1] = clamp(data[i + 1]! * factor);
        data[i + 2] = clamp(data[i + 2]! * factor);
      }
      break;
    }
    case 'temperature': {
      for (let i = 0; i < data.length; i += 4) {
        data[i] = clamp(data[i]! + amount);
        data[i + 2] = clamp(data[i + 2]! - amount);
      }
      break;
    }
    case 'noise': {
      const intensity = amount;
      for (let i = 0; i < data.length; i += 4) {
        const n = (Math.random() - 0.5) * intensity;
        data[i] = clamp(data[i]! + n);
        data[i + 1] = clamp(data[i + 1]! + n);
        data[i + 2] = clamp(data[i + 2]! + n);
      }
      break;
    }
    case 'vignette': {
      const strength = amount / 100;
      const cx = width / 2;
      const cy = height / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2) / maxDist;
          const factor = 1 - strength * d * d;
          const i = (y * width + x) * 4;
          data[i] = clamp(data[i]! * factor);
          data[i + 1] = clamp(data[i + 1]! * factor);
          data[i + 2] = clamp(data[i + 2]! * factor);
        }
      }
      break;
    }
    case 'pixelate': {
      const block = Math.max(1, Math.floor(amount));
      const src = new Uint8ClampedArray(data);
      for (let y = 0; y < height; y += block) {
        for (let x = 0; x < width; x += block) {
          const i = (y * width + x) * 4;
          const r = src[i]!;
          const g = src[i + 1]!;
          const b = src[i + 2]!;
          const a = src[i + 3]!;
          for (let by = 0; by < block && y + by < height; by++) {
            for (let bx = 0; bx < block && x + bx < width; bx++) {
              const j = ((y + by) * width + (x + bx)) * 4;
              data[j] = r;
              data[j + 1] = g;
              data[j + 2] = b;
              data[j + 3] = a;
            }
          }
        }
      }
      break;
    }
    case 'duotone': {
      const c1 = String(filter.options?.['color1'] ?? '#000080');
      const c2 = String(filter.options?.['color2'] ?? '#ffff00');
      const parse = (hex: string) => {
        const h = hex.replace('#', '');
        return [
          parseInt(h.slice(0, 2), 16),
          parseInt(h.slice(2, 4), 16),
          parseInt(h.slice(4, 6), 16),
        ] as const;
      };
      const [r1, g1, b1] = parse(c1);
      const [r2, g2, b2] = parse(c2);
      for (let i = 0; i < data.length; i += 4) {
        const t =
          (0.2126 * data[i]! + 0.7152 * data[i + 1]! + 0.0722 * data[i + 2]!) / 255;
        data[i] = Math.round(r1 + (r2 - r1) * t);
        data[i + 1] = Math.round(g1 + (g2 - g1) * t);
        data[i + 2] = Math.round(b1 + (b2 - b1) * t);
      }
      break;
    }
  }
}

/** Apply a stack of filters to ImageData in place and return it. */
export function applyFilters(
  imageData: ImageData,
  filters: readonly FilterDescriptor[],
): ImageData {
  for (const filter of filters) {
    applyOne(imageData, filter);
  }
  return imageData;
}

/** Convenience: draw a source to an offscreen canvas, apply filters, return canvas. */
export function filterCanvasSource(
  source: CanvasImageSource,
  width: number,
  height: number,
  filters: readonly FilterDescriptor[],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width));
  canvas.height = Math.max(1, Math.floor(height));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (filters.length > 0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyFilters(imageData, filters);
    ctx.putImageData(imageData, 0, 0);
  }
  return canvas;
}
