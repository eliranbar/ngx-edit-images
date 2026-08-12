import type { EditorDocument } from './document';
import type {
  AnyLayer,
  DrawingLayer,
  ImageLayer,
  ShapeLayer,
  TextLayer,
} from './layers/types';
import { filterCanvasSource } from './filters/apply';

/**
 * Build a marching-ants outline of the selection mask edge (not its bounding
 * box), so ellipse / lasso / magic-wand selections show their real shape.
 */
function selectionOutlineCanvas(mask: ImageData): HTMLCanvasElement | null {
  const { width, height, data } = mask;
  const out = new Uint8ClampedArray(width * height * 4);
  const selected = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < width && y < height && data[(y * width + x) * 4 + 3]! > 0;
  let any = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!selected(x, y)) continue;
      if (selected(x - 1, y) && selected(x + 1, y) && selected(x, y - 1) && selected(x, y + 1)) {
        continue;
      }
      any = true;
      const i = (y * width + x) * 4;
      // 4px alternating dashes for the classic marching-ants look.
      if (((x + y) >> 2) & 1) {
        out[i] = 255;
        out[i + 1] = 255;
        out[i + 2] = 255;
      } else {
        out[i] = 15;
        out[i + 1] = 23;
        out[i + 2] = 42;
      }
      out[i + 3] = 255;
    }
  }
  if (!any) return null;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.putImageData(new ImageData(out, width, height), 0, 0);
  return canvas;
}

function drawShape(ctx: CanvasRenderingContext2D, layer: ShapeLayer): void {
  const { width, height, shape, fill, stroke, strokeWidth, sides } = {
    ...layer.transform,
    shape: layer.shape,
    fill: layer.fill,
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth,
    sides: layer.sides,
  };
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.beginPath();
  switch (shape) {
    case 'rect':
      ctx.rect(0, 0, width, height);
      break;
    case 'ellipse':
      ctx.ellipse(width / 2, height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      break;
    case 'line':
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      break;
    case 'arrow':
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width - 16, height / 2);
      ctx.moveTo(width - 16, height / 2 - 8);
      ctx.lineTo(width, height / 2);
      ctx.lineTo(width - 16, height / 2 + 8);
      break;
    case 'polygon': {
      const n = sides ?? 5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const x = width / 2 + (Math.cos(a) * width) / 2;
        const y = height / 2 + (Math.sin(a) * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case 'star': {
      const n = sides ?? 5;
      for (let i = 0; i < n * 2; i++) {
        const r = i % 2 === 0 ? 0.5 : 0.22;
        const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
        const x = width / 2 + Math.cos(a) * width * r;
        const y = height / 2 + Math.sin(a) * height * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
  }
  if (shape !== 'line' && shape !== 'arrow') ctx.fill();
  ctx.stroke();
}

function drawText(ctx: CanvasRenderingContext2D, layer: TextLayer): void {
  ctx.fillStyle = layer.color;
  ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
  ctx.textAlign = layer.align;
  ctx.textBaseline = 'top';
  const x =
    layer.align === 'center'
      ? layer.transform.width / 2
      : layer.align === 'right'
        ? layer.transform.width
        : 0;
  const lines = layer.text.split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, x, i * layer.fontSize * 1.25);
  });
}

function drawDrawing(ctx: CanvasRenderingContext2D, layer: DrawingLayer): void {
  if (layer.raster) {
    ctx.putImageData(layer.raster, 0, 0);
  }
  for (const stroke of layer.strokes) {
    if (stroke.points.length === 0) continue;
    ctx.save();
    ctx.globalAlpha = stroke.opacity;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.size;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (stroke.erase) {
      ctx.globalCompositeOperation = 'destination-out';
    }
    ctx.beginPath();
    stroke.points.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
    ctx.restore();
  }
}

function renderLayerToCanvas(layer: AnyLayer, docW: number, docH: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const t = layer.transform;
  if (layer.type === 'drawing') {
    canvas.width = docW;
    canvas.height = docH;
  } else {
    canvas.width = Math.max(1, Math.ceil(t.width));
    canvas.height = Math.max(1, Math.ceil(t.height));
  }
  const ctx = canvas.getContext('2d')!;

  if (layer.type === 'image' && (layer as ImageLayer).source) {
    ctx.drawImage((layer as ImageLayer).source!, 0, 0, canvas.width, canvas.height);
  } else if (layer.type === 'text') {
    drawText(ctx, layer);
  } else if (layer.type === 'shape') {
    drawShape(ctx, layer);
  } else if (layer.type === 'drawing') {
    drawDrawing(ctx, layer);
  }

  if (layer.filters.length > 0 && layer.type !== 'adjustment') {
    return filterCanvasSource(canvas, canvas.width, canvas.height, layer.filters);
  }
  return canvas;
}

function applyMask(ctx: CanvasRenderingContext2D, layer: AnyLayer): void {
  if (!layer.mask?.enabled || !layer.mask.imageData) return;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-in';
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = layer.mask.imageData.width;
  maskCanvas.height = layer.mask.imageData.height;
  maskCanvas.getContext('2d')!.putImageData(layer.mask.imageData, 0, 0);
  ctx.drawImage(maskCanvas, 0, 0);
  ctx.restore();
}

export interface RenderOptions {
  /** Scale factor for export. */
  scale?: number;
  /** Draw selection marching ants / handles. */
  showOverlay?: boolean;
  /** Draw grid. */
  showGrid?: boolean;
  /** Draw guides. */
  showGuides?: boolean;
}

/** Composite the document onto a target canvas (or return a new one). */
export function renderDocument(
  doc: EditorDocument,
  target?: HTMLCanvasElement,
  options: RenderOptions = {},
): HTMLCanvasElement {
  const scale = options.scale ?? 1;
  const canvas = target ?? document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(doc.width * scale));
  canvas.height = Math.max(1, Math.floor(doc.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return canvas;
  }
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  ctx.fillStyle = doc.background;
  ctx.fillRect(0, 0, doc.width, doc.height);

  // Checkerboard for transparency feel when background is transparent-ish
  if (doc.background === 'transparent') {
    const size = 12;
    for (let y = 0; y < doc.height; y += size) {
      for (let x = 0; x < doc.width; x += size) {
        ctx.fillStyle = (x / size + y / size) % 2 === 0 ? '#ccc' : '#fff';
        ctx.fillRect(x, y, size, size);
      }
    }
  }

  let below: HTMLCanvasElement | null = null;

  for (const layer of doc.getPaintOrder()) {
    if (layer.type === 'adjustment') {
      // Re-read the composite so far and apply adjustment filters
      if (layer.adjustmentFilters.length > 0) {
        const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        // Work in unscaled space is complex; apply on the scaled buffer via filterCanvasSource
        const tmp = document.createElement('canvas');
        tmp.width = canvas.width;
        tmp.height = canvas.height;
        tmp.getContext('2d')!.putImageData(current, 0, 0);
        const filtered = filterCanvasSource(
          tmp,
          canvas.width,
          canvas.height,
          layer.adjustmentFilters,
        );
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(filtered, 0, 0);
        ctx.setTransform(scale, 0, 0, scale, 0, 0);
      }
      continue;
    }

    const layerCanvas = renderLayerToCanvas(layer, doc.width, doc.height);
    applyMask(
      (() => {
        const c = layerCanvas.getContext('2d')!;
        return c;
      })(),
      layer,
    );

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode;
    const t = layer.transform;
    if (layer.type === 'drawing') {
      ctx.drawImage(layerCanvas, 0, 0);
    } else {
      ctx.translate(t.x + t.width / 2, t.y + t.height / 2);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.scale(t.scaleX, t.scaleY);
      ctx.drawImage(layerCanvas, -t.width / 2, -t.height / 2, t.width, t.height);
    }
    ctx.restore();
    below = layerCanvas;
  }

  void below;

  if (options.showGrid ?? doc.snap.showGrid) {
    ctx.save();
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 1 / scale;
    const g = doc.snap.gridSize;
    for (let x = 0; x <= doc.width; x += g) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, doc.height);
      ctx.stroke();
    }
    for (let y = 0; y <= doc.height; y += g) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(doc.width, y);
      ctx.stroke();
    }
    ctx.restore();
  }

  if (options.showGuides ?? doc.snap.showGuides) {
    ctx.save();
    ctx.strokeStyle = '#a855f7';
    ctx.lineWidth = 1 / scale;
    for (const guide of doc.guides) {
      ctx.beginPath();
      if (guide.orientation === 'vertical') {
        ctx.moveTo(guide.position, 0);
        ctx.lineTo(guide.position, doc.height);
      } else {
        ctx.moveTo(0, guide.position);
        ctx.lineTo(doc.width, guide.position);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  if (options.showOverlay) {
    if (doc.selection.mask) {
      const outline = selectionOutlineCanvas(doc.selection.mask);
      if (outline) {
        ctx.drawImage(outline, 0, 0);
      }
    }

    const active = doc.getActiveLayer();
    if (active && active.type !== 'drawing' && active.type !== 'adjustment') {
      const t = active.transform;
      ctx.save();
      ctx.strokeStyle = '#5b8def';
      ctx.lineWidth = 1.5 / scale;
      ctx.setLineDash([6 / scale, 4 / scale]);
      ctx.translate(t.x + t.width / 2, t.y + t.height / 2);
      ctx.rotate((t.rotation * Math.PI) / 180);
      ctx.strokeRect(-t.width / 2, -t.height / 2, t.width, t.height);
      // Handles
      ctx.setLineDash([]);
      ctx.fillStyle = '#5b8def';
      const hs = 6 / scale;
      const corners = [
        [-t.width / 2, -t.height / 2],
        [t.width / 2, -t.height / 2],
        [t.width / 2, t.height / 2],
        [-t.width / 2, t.height / 2],
      ];
      for (const [hx, hy] of corners) {
        ctx.fillRect(hx! - hs / 2, hy! - hs / 2, hs, hs);
      }
      ctx.restore();
    }
  }

  return canvas;
}
