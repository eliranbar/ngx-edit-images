import type { Tool, ToolContext, PointerEventData } from './tool';
import {
  AddLayerCommand,
  UpdateLayerPropsCommand,
  SetSelectionCommand,
  AddStrokeCommand,
  SetRasterCommand,
  SetImagePixelsCommand,
} from '../commands';
import {
  createTextLayer,
  createShapeLayer,
  createDrawingLayer,
  defaultTransform,
  type DrawingStroke,
  type DrawingLayer,
  type ShapeLayer,
  type TextLayer,
  type ImageLayer,
  type AnyLayer,
} from '../layers/types';
import {
  rectSelectionMask,
  ellipseSelectionMask,
  createEmptySelection,
  pathSelectionMask,
  magicWandSelectionMask,
  stampCircle,
  cloneImageData,
  emptyImageData,
} from '../selection';
import { renderDocument } from '../renderer';
import type { PixelSelection } from '../selection';

export class TextTool implements Tool {
  readonly id = 'text' as const;
  readonly cursor = 'text';

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    const hit = ctx.doc.hitTest(e.x, e.y);
    if (hit?.type === 'text') {
      ctx.doc.setActiveLayer(hit.id);
      if (!(hit as TextLayer).editing) {
        ctx.doc.updateLayer(hit.id, { editing: true } as never);
      }
      ctx.requestRender();
      return;
    }
    for (const layer of ctx.doc.getLayers()) {
      if (layer.type === 'text' && layer.editing) {
        ctx.doc.updateLayer(layer.id, { editing: false } as never);
      }
    }
    const layer = createTextLayer({
      name: 'Text',
      text: 'Double-click to edit',
      editing: true,
      transform: defaultTransform({ x: e.x, y: e.y - 12, width: 240, height: 48 }),
    });
    ctx.history.execute(new AddLayerCommand(ctx.doc, layer));
    ctx.requestRender();
  }

  pointerMove(): void {}
  pointerUp(): void {}

  doubleClick(e: PointerEventData, ctx: ToolContext): void {
    const hit = ctx.doc.hitTest(e.x, e.y);
    if (hit?.type === 'text') {
      ctx.doc.setActiveLayer(hit.id);
      ctx.doc.updateLayer(hit.id, { editing: true } as never);
      ctx.requestRender();
    }
  }
}

export class ShapeTool implements Tool {
  readonly id = 'shape' as const;
  readonly cursor = 'crosshair';
  private startX = 0;
  private startY = 0;
  private dragging = false;
  private layerId: string | null = null;

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    this.startX = e.x;
    this.startY = e.y;
    this.dragging = true;
    const layer = createShapeLayer({
      name: ctx.shapeKind,
      shape: ctx.shapeKind,
      fill: ctx.fillColor,
      transform: defaultTransform({ x: e.x, y: e.y, width: 1, height: 1 }),
    });
    this.layerId = layer.id;
    ctx.history.execute(new AddLayerCommand(ctx.doc, layer));
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging || !this.layerId) return;
    const x = Math.min(this.startX, e.x);
    const y = Math.min(this.startY, e.y);
    let w = Math.abs(e.x - this.startX);
    let h = Math.abs(e.y - this.startY);
    if (e.shiftKey) {
      const s = Math.max(w, h);
      w = s;
      h = s;
    }
    ctx.doc.setTransform(this.layerId, { x, y, width: Math.max(1, w), height: Math.max(1, h) });
    ctx.requestRender();
  }

  pointerUp(_e: PointerEventData, ctx: ToolContext): void {
    if (this.dragging && this.layerId) {
      const layer = ctx.doc.getLayer(this.layerId);
      if (layer && (layer.transform.width < 4 || layer.transform.height < 4)) {
        ctx.doc.setTransform(this.layerId, {
          x: this.startX,
          y: this.startY,
          width: 120,
          height: 80,
        });
      }
    }
    this.dragging = false;
    this.layerId = null;
    ctx.requestRender();
  }
}

function beginStroke(
  e: PointerEventData,
  ctx: ToolContext,
  erase: boolean,
): { stroke: DrawingStroke; layerId: string } | null {
  if (!ctx.isFeatureEnabled(erase ? 'eraser' : 'brush')) return null;
  let layer = ctx.doc.getActiveLayer();
  if (!layer || layer.type !== 'drawing') {
    const created = createDrawingLayer({
      name: erase ? 'Eraser' : 'Drawing',
      transform: defaultTransform({
        x: 0,
        y: 0,
        width: ctx.doc.width,
        height: ctx.doc.height,
      }),
    });
    ctx.history.execute(new AddLayerCommand(ctx.doc, created));
    layer = created;
  }
  const stroke: DrawingStroke = {
    points: [{ x: e.x, y: e.y, pressure: e.pressure }],
    color: ctx.brush.color,
    size: ctx.brush.size,
    opacity: ctx.brush.opacity,
    erase,
  };
  (layer as DrawingLayer).strokes.push(stroke);
  ctx.doc.notify();
  ctx.requestRender();
  return { stroke, layerId: layer.id };
}

function ensureNamedRasterLayer(
  ctx: ToolContext,
  name: string,
): DrawingLayer {
  const existing = ctx.doc
    .getLayers()
    .find((l) => l.type === 'drawing' && l.name === name) as DrawingLayer | undefined;
  if (existing) {
    if (
      !existing.raster ||
      existing.raster.width !== ctx.doc.width ||
      existing.raster.height !== ctx.doc.height
    ) {
      existing.raster = emptyImageData(ctx.doc.width, ctx.doc.height);
      ctx.doc.notify();
    }
    ctx.doc.setActiveLayer(existing.id);
    return existing;
  }
  const created = createDrawingLayer({
    name,
    transform: defaultTransform({
      x: 0,
      y: 0,
      width: ctx.doc.width,
      height: ctx.doc.height,
    }),
    raster: emptyImageData(ctx.doc.width, ctx.doc.height),
  });
  ctx.history.execute(new AddLayerCommand(ctx.doc, created));
  return created;
}

function captureComposite(ctx: ToolContext): ImageData {
  const canvas = renderDocument(ctx.doc, undefined, {
    showOverlay: false,
    showGrid: false,
    showGuides: false,
  });
  return canvas.getContext('2d')!.getImageData(0, 0, ctx.doc.width, ctx.doc.height);
}

function sourceSize(source: CanvasImageSource): { w: number; h: number } {
  if (source instanceof HTMLImageElement) {
    return {
      w: source.naturalWidth || source.width,
      h: source.naturalHeight || source.height,
    };
  }
  if (source instanceof HTMLCanvasElement) {
    return { w: source.width, h: source.height };
  }
  if (typeof ImageBitmap !== 'undefined' && source instanceof ImageBitmap) {
    return { w: source.width, h: source.height };
  }
  const anySrc = source as { width?: number; height?: number };
  return { w: anySrc.width || 1, h: anySrc.height || 1 };
}

/** Ensure an image layer has a mutable canvas source (in place). */
function ensureImageCanvas(layer: ImageLayer): HTMLCanvasElement | null {
  if (!layer.source) return null;
  if (layer.source instanceof HTMLCanvasElement) return layer.source;
  const { w, h } = sourceSize(layer.source);
  if (w < 1 || h < 1) return null;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')!.drawImage(layer.source, 0, 0, w, h);
  layer.source = canvas;
  return canvas;
}

/** Map document coordinates into image-layer pixel space. */
function docToImagePixels(
  layer: ImageLayer,
  docX: number,
  docY: number,
): { canvas: HTMLCanvasElement; x: number; y: number; scale: number } | null {
  const canvas = ensureImageCanvas(layer);
  if (!canvas) return null;
  const t = layer.transform;
  const cx = t.x + t.width / 2;
  const cy = t.y + t.height / 2;
  const dx = docX - cx;
  const dy = docY - cy;
  const rad = (-t.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const localX = (dx * cos - dy * sin) / (t.scaleX || 1) + t.width / 2;
  const localY = (dx * sin + dy * cos) / (t.scaleY || 1) + t.height / 2;
  const sx = canvas.width / Math.max(1, t.width);
  const sy = canvas.height / Math.max(1, t.height);
  return {
    canvas,
    x: localX * sx,
    y: localY * sy,
    scale: (sx + sy) / 2,
  };
}

function eraseCircleOnCanvas(
  canvas: HTMLCanvasElement,
  x: number,
  y: number,
  radius: number,
): void {
  const c = canvas.getContext('2d')!;
  c.save();
  c.globalCompositeOperation = 'destination-out';
  c.beginPath();
  c.arc(x, y, Math.max(1, radius), 0, Math.PI * 2);
  c.fill();
  c.restore();
}

function resolveEraseTarget(ctx: ToolContext, e: PointerEventData): AnyLayer | null {
  const hit = ctx.doc.hitTest(e.x, e.y);
  if (hit && (hit.type === 'image' || hit.type === 'drawing')) return hit;
  const active = ctx.doc.getActiveLayer();
  if (active && (active.type === 'image' || active.type === 'drawing')) return active;
  const images = ctx.doc.getLayers().filter((l) => l.type === 'image');
  return images.length ? images[images.length - 1]! : null;
}

function parseCssColor(color: string): [number, number, number] {
  if (color.startsWith('#') && (color.length === 7 || color.length === 4)) {
    if (color.length === 4) {
      return [
        parseInt(color[1]! + color[1]!, 16),
        parseInt(color[2]! + color[2]!, 16),
        parseInt(color[3]! + color[3]!, 16),
      ];
    }
    return [
      parseInt(color.slice(1, 3), 16),
      parseInt(color.slice(3, 5), 16),
      parseInt(color.slice(5, 7), 16),
    ];
  }
  return [26, 31, 46];
}

export class BrushTool implements Tool {
  readonly id = 'brush' as const;
  readonly cursor = 'crosshair';
  private stroke: DrawingStroke | null = null;
  private layerId: string | null = null;

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    const started = beginStroke(e, ctx, false);
    if (!started) return;
    this.stroke = started.stroke;
    this.layerId = started.layerId;
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (!this.stroke) return;
    this.stroke.points.push({ x: e.x, y: e.y, pressure: e.pressure });
    ctx.doc.notify();
    ctx.requestRender();
  }

  pointerUp(_e: PointerEventData, ctx: ToolContext): void {
    if (this.stroke && this.layerId) {
      const layer = ctx.doc.getLayer(this.layerId) as DrawingLayer | undefined;
      if (layer) {
        const idx = layer.strokes.indexOf(this.stroke);
        if (idx >= 0) layer.strokes.splice(idx, 1);
      }
      ctx.history.execute(new AddStrokeCommand(ctx.doc, this.layerId, this.stroke));
    }
    this.stroke = null;
    this.layerId = null;
    ctx.requestRender();
  }
}

export class EraserTool implements Tool {
  readonly id = 'eraser' as const;
  readonly cursor = 'crosshair';
  private stroke: DrawingStroke | null = null;
  private layerId: string | null = null;
  private mode: 'image' | 'drawing' | null = null;
  private imageCanvas: HTMLCanvasElement | null = null;
  private beforePixels: ImageData | null = null;
  private lastX = 0;
  private lastY = 0;

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    if (!ctx.isFeatureEnabled('eraser')) return;

    const target = resolveEraseTarget(ctx, e);

    if (e.altKey) {
      this.magicErase(e, ctx, target);
      return;
    }

    if (target?.type === 'image') {
      const mapped = docToImagePixels(target as ImageLayer, e.x, e.y);
      if (!mapped) return;
      ctx.doc.setActiveLayer(target.id);
      this.mode = 'image';
      this.layerId = target.id;
      this.imageCanvas = mapped.canvas;
      this.beforePixels = mapped.canvas
        .getContext('2d')!
        .getImageData(0, 0, mapped.canvas.width, mapped.canvas.height);
      this.lastX = mapped.x;
      this.lastY = mapped.y;
      eraseCircleOnCanvas(mapped.canvas, mapped.x, mapped.y, (ctx.brush.size / 2) * mapped.scale);
      ctx.doc.notify();
      ctx.requestRender();
      return;
    }

    if (target?.type === 'drawing') {
      ctx.doc.setActiveLayer(target.id);
    }
    const started = beginStroke(e, ctx, true);
    if (!started) return;
    this.mode = 'drawing';
    this.stroke = started.stroke;
    this.layerId = started.layerId;
  }

  private magicErase(
    e: PointerEventData,
    ctx: ToolContext,
    target: AnyLayer | null,
  ): void {
    try {
      if (target?.type === 'image') {
        const mapped = docToImagePixels(target as ImageLayer, e.x, e.y);
        if (!mapped) return;
        const { canvas } = mapped;
        const c2d = canvas.getContext('2d')!;
        const before = c2d.getImageData(0, 0, canvas.width, canvas.height);
        const seedX = Math.max(0, Math.min(canvas.width - 1, Math.round(mapped.x)));
        const seedY = Math.max(0, Math.min(canvas.height - 1, Math.round(mapped.y)));
        const mask = magicWandSelectionMask(before, seedX, seedY, 40);
        const after = cloneImageData(before);
        for (let i = 0; i < mask.data.length; i += 4) {
          if (mask.data[i + 3]! > 0) after.data[i + 3] = 0;
        }
        c2d.putImageData(after, 0, 0);
        ctx.doc.setActiveLayer(target.id);
        ctx.history.execute(
          new SetImagePixelsCommand(ctx.doc, target.id, canvas, after, before),
        );
        ctx.requestRender();
        return;
      }

      const composite = captureComposite(ctx);
      const mask = magicWandSelectionMask(composite, e.x, e.y, 40);
      const layer = ensureNamedRasterLayer(ctx, 'Magic erase');
      const before = layer.raster
        ? cloneImageData(layer.raster)
        : emptyImageData(ctx.doc.width, ctx.doc.height);
      const after = cloneImageData(before);
      const bg = parseCssColor(ctx.doc.background);
      for (let i = 0; i < mask.data.length; i += 4) {
        if (mask.data[i + 3]! === 0) continue;
        after.data[i] = bg[0]!;
        after.data[i + 1] = bg[1]!;
        after.data[i + 2] = bg[2]!;
        after.data[i + 3] = 255;
      }
      layer.raster = after;
      ctx.history.execute(new SetRasterCommand(ctx.doc, layer.id, after, before));
      ctx.requestRender();
    } catch {
      // Canvas unavailable
    }
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (this.mode === 'image' && this.imageCanvas && this.layerId) {
      const layer = ctx.doc.getLayer(this.layerId);
      if (!layer || layer.type !== 'image') return;
      const mapped = docToImagePixels(layer, e.x, e.y);
      if (!mapped) return;
      const dist = Math.hypot(mapped.x - this.lastX, mapped.y - this.lastY);
      const step = Math.max(1, ctx.brush.size * mapped.scale * 0.35);
      const radius = (ctx.brush.size / 2) * mapped.scale;
      if (dist < step) {
        eraseCircleOnCanvas(mapped.canvas, mapped.x, mapped.y, radius);
      } else {
        const steps = Math.ceil(dist / step);
        for (let i = 1; i <= steps; i++) {
          const t = i / steps;
          eraseCircleOnCanvas(
            mapped.canvas,
            this.lastX + (mapped.x - this.lastX) * t,
            this.lastY + (mapped.y - this.lastY) * t,
            radius,
          );
        }
      }
      this.lastX = mapped.x;
      this.lastY = mapped.y;
      ctx.doc.notify();
      ctx.requestRender();
      return;
    }

    if (!this.stroke) return;
    this.stroke.points.push({ x: e.x, y: e.y, pressure: e.pressure });
    ctx.doc.notify();
    ctx.requestRender();
  }

  pointerUp(_e: PointerEventData, ctx: ToolContext): void {
    if (this.mode === 'image' && this.imageCanvas && this.layerId && this.beforePixels) {
      const after = this.imageCanvas
        .getContext('2d')!
        .getImageData(0, 0, this.imageCanvas.width, this.imageCanvas.height);
      ctx.history.execute(
        new SetImagePixelsCommand(
          ctx.doc,
          this.layerId,
          this.imageCanvas,
          after,
          this.beforePixels,
        ),
      );
    } else if (this.stroke && this.layerId) {
      const layer = ctx.doc.getLayer(this.layerId) as DrawingLayer | undefined;
      if (layer) {
        const idx = layer.strokes.indexOf(this.stroke);
        if (idx >= 0) layer.strokes.splice(idx, 1);
      }
      ctx.history.execute(new AddStrokeCommand(ctx.doc, this.layerId, this.stroke));
    }
    this.stroke = null;
    this.layerId = null;
    this.mode = null;
    this.imageCanvas = null;
    this.beforePixels = null;
    ctx.requestRender();
  }
}

export class SelectRectTool implements Tool {
  readonly id = 'select-rect' as const;
  readonly cursor = 'crosshair';
  private startX = 0;
  private startY = 0;
  private dragging = false;
  private before: PixelSelection = createEmptySelection();

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    this.startX = e.x;
    this.startY = e.y;
    this.dragging = true;
    this.before = ctx.doc.selection;
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging) return;
    const mask = rectSelectionMask(
      ctx.doc.width,
      ctx.doc.height,
      this.startX,
      this.startY,
      e.x - this.startX,
      e.y - this.startY,
    );
    ctx.doc.setSelection({ path: null, mask, feather: 0, mode: 'new' });
    ctx.requestRender();
  }

  pointerUp(_e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging) return;
    this.dragging = false;
    ctx.history.execute(new SetSelectionCommand(ctx.doc, ctx.doc.selection, this.before));
    ctx.requestRender();
  }
}

export class SelectEllipseTool implements Tool {
  readonly id = 'select-ellipse' as const;
  readonly cursor = 'crosshair';
  private startX = 0;
  private startY = 0;
  private dragging = false;
  private before: PixelSelection = createEmptySelection();

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    this.startX = e.x;
    this.startY = e.y;
    this.dragging = true;
    this.before = ctx.doc.selection;
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging) return;
    const mask = ellipseSelectionMask(
      ctx.doc.width,
      ctx.doc.height,
      this.startX,
      this.startY,
      e.x - this.startX,
      e.y - this.startY,
    );
    ctx.doc.setSelection({ path: null, mask, feather: 0, mode: 'new' });
    ctx.requestRender();
  }

  pointerUp(_e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging) return;
    this.dragging = false;
    ctx.history.execute(new SetSelectionCommand(ctx.doc, ctx.doc.selection, this.before));
    ctx.requestRender();
  }
}

export class EyedropperTool implements Tool {
  readonly id = 'eyedropper' as const;
  readonly cursor = 'crosshair';

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    const hit = ctx.doc.hitTest(e.x, e.y);
    if (hit?.type === 'shape') {
      const hex = (hit as ShapeLayer).fill;
      ctx.brush.color = hex;
      ctx.fillColor = hex;
      ctx.requestRender();
      return;
    }
    if (hit?.type === 'text') {
      const hex = (hit as TextLayer).color;
      ctx.brush.color = hex;
      ctx.fillColor = hex;
      ctx.requestRender();
      return;
    }

    const x = Math.max(0, Math.min(ctx.doc.width - 1, Math.round(e.x)));
    const y = Math.max(0, Math.min(ctx.doc.height - 1, Math.round(e.y)));
    try {
      const canvas = renderDocument(ctx.doc, undefined, {
        showOverlay: false,
        showGrid: false,
        showGuides: false,
      });
      const pixel = canvas.getContext('2d')?.getImageData(x, y, 1, 1).data;
      if (pixel && pixel[3]! > 0) {
        const hex =
          '#' +
          [pixel[0], pixel[1], pixel[2]]
            .map((v) => v!.toString(16).padStart(2, '0'))
            .join('');
        ctx.brush.color = hex;
        ctx.fillColor = hex;
      }
    } catch {
      // Canvas unavailable in some environments
    }
    ctx.requestRender();
  }
  pointerMove(): void {}
  pointerUp(): void {}
}

export class FillTool implements Tool {
  readonly id = 'fill' as const;
  readonly cursor = 'cell';

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    const hit = ctx.doc.hitTest(e.x, e.y);
    const target =
      hit?.type === 'shape'
        ? hit
        : ctx.doc.getActiveLayer()?.type === 'shape'
          ? ctx.doc.getActiveLayer()
          : null;
    if (!target || target.type !== 'shape') return;
    const shape = target as ShapeLayer;
    if (shape.fill === ctx.fillColor) return;
    ctx.doc.setActiveLayer(shape.id);
    ctx.history.execute(
      new UpdateLayerPropsCommand(ctx.doc, shape.id, { fill: ctx.fillColor }),
    );
    ctx.requestRender();
  }
  pointerMove(): void {}
  pointerUp(): void {}
}

export class LassoTool implements Tool {
  readonly id = 'lasso' as const;
  readonly cursor = 'crosshair';
  private points: { x: number; y: number }[] = [];
  private dragging = false;
  private before: PixelSelection = createEmptySelection();

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    if (!ctx.isFeatureEnabled('advancedSelection')) return;
    this.dragging = true;
    this.before = ctx.doc.selection;
    this.points = [{ x: e.x, y: e.y }];
    ctx.requestRender();
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging) return;
    const last = this.points[this.points.length - 1]!;
    if (Math.hypot(e.x - last.x, e.y - last.y) < 2) return;
    this.points.push({ x: e.x, y: e.y });
    if (this.points.length >= 3) {
      const mask = pathSelectionMask(ctx.doc.width, ctx.doc.height, this.points);
      ctx.doc.setSelection({ path: null, mask, feather: 0, mode: 'new' });
    }
    ctx.requestRender();
  }

  pointerUp(_e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging) return;
    this.dragging = false;
    if (this.points.length >= 3) {
      const mask = pathSelectionMask(ctx.doc.width, ctx.doc.height, this.points);
      const selection = { path: null, mask, feather: 0, mode: 'new' as const };
      ctx.doc.setSelection(selection);
      ctx.history.execute(new SetSelectionCommand(ctx.doc, selection, this.before));
    } else {
      ctx.doc.setSelection(this.before);
    }
    this.points = [];
    ctx.requestRender();
  }

  drawOverlay(canvasCtx: CanvasRenderingContext2D): void {
    if (!this.dragging || this.points.length < 2) return;
    canvasCtx.save();
    canvasCtx.strokeStyle = '#5b8def';
    canvasCtx.lineWidth = 1.5;
    canvasCtx.setLineDash([4, 4]);
    canvasCtx.beginPath();
    canvasCtx.moveTo(this.points[0]!.x, this.points[0]!.y);
    for (let i = 1; i < this.points.length; i++) {
      canvasCtx.lineTo(this.points[i]!.x, this.points[i]!.y);
    }
    canvasCtx.stroke();
    canvasCtx.restore();
  }
}

export class MagicWandTool implements Tool {
  readonly id = 'magic-wand' as const;
  readonly cursor = 'crosshair';

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    if (!ctx.isFeatureEnabled('advancedSelection')) return;
    try {
      const composite = captureComposite(ctx);
      const mask = magicWandSelectionMask(composite, e.x, e.y, e.shiftKey ? 64 : 32);
      const before = ctx.doc.selection;
      const selection = { path: null, mask, feather: 0, mode: 'new' as const };
      ctx.history.execute(new SetSelectionCommand(ctx.doc, selection, before));
    } catch {
      // ignore
    }
    ctx.requestRender();
  }
  pointerMove(): void {}
  pointerUp(): void {}
}

class StampRetouchToolBase {
  protected source: { x: number; y: number } | null = null;
  protected snapshot: ImageData | null = null;
  protected dragging = false;
  protected layerId: string | null = null;
  protected beforeRaster: ImageData | null = null;
  protected originDest: { x: number; y: number } | null = null;
  protected lastX = 0;
  protected lastY = 0;
  protected mode: 'clone' | 'heal' = 'clone';
  protected feature = 'cloneStamp';

  protected pointerDownImpl(e: PointerEventData, ctx: ToolContext): void {
    if (!ctx.isFeatureEnabled(this.feature)) return;

    if (e.altKey) {
      this.source = { x: e.x, y: e.y };
      try {
        this.snapshot = captureComposite(ctx);
      } catch {
        this.snapshot = null;
      }
      ctx.requestRender();
      return;
    }

    if (!this.source) return;
    try {
      this.snapshot = this.snapshot ?? captureComposite(ctx);
    } catch {
      return;
    }

    const layer = ensureNamedRasterLayer(ctx, this.mode === 'heal' ? 'Healing' : 'Clone');
    this.layerId = layer.id;
    this.beforeRaster = layer.raster
      ? cloneImageData(layer.raster)
      : emptyImageData(ctx.doc.width, ctx.doc.height);
    if (!layer.raster) layer.raster = emptyImageData(ctx.doc.width, ctx.doc.height);
    this.originDest = { x: e.x, y: e.y };
    this.dragging = true;
    this.lastX = e.x;
    this.lastY = e.y;
    this.stampAt(e.x, e.y, ctx);
  }

  protected stampAt(x: number, y: number, ctx: ToolContext): void {
    if (!this.source || !this.snapshot || !this.layerId || !this.originDest) return;
    const layer = ctx.doc.getLayer(this.layerId) as DrawingLayer | undefined;
    if (!layer?.raster) return;
    const dx = this.source.x - this.originDest.x;
    const dy = this.source.y - this.originDest.y;
    stampCircle(
      layer.raster,
      this.snapshot,
      x,
      y,
      x + dx,
      y + dy,
      ctx.brush.size / 2,
      this.mode,
    );
    ctx.doc.notify();
    ctx.requestRender();
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging) return;
    const dist = Math.hypot(e.x - this.lastX, e.y - this.lastY);
    const step = Math.max(1, ctx.brush.size * 0.35);
    if (dist < step) return;
    const steps = Math.ceil(dist / step);
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.stampAt(
        this.lastX + (e.x - this.lastX) * t,
        this.lastY + (e.y - this.lastY) * t,
        ctx,
      );
    }
    this.lastX = e.x;
    this.lastY = e.y;
  }

  pointerUp(_e: PointerEventData, ctx: ToolContext): void {
    if (this.dragging && this.layerId) {
      const layer = ctx.doc.getLayer(this.layerId) as DrawingLayer | undefined;
      if (layer?.raster) {
        ctx.history.execute(
          new SetRasterCommand(
            ctx.doc,
            this.layerId,
            cloneImageData(layer.raster),
            this.beforeRaster,
          ),
        );
      }
    }
    this.dragging = false;
    this.layerId = null;
    this.beforeRaster = null;
    this.originDest = null;
    ctx.requestRender();
  }

  drawOverlay(canvasCtx: CanvasRenderingContext2D, ctx: ToolContext): void {
    if (!this.source) return;
    canvasCtx.save();
    canvasCtx.strokeStyle = '#a855f7';
    canvasCtx.lineWidth = 1.5;
    canvasCtx.beginPath();
    canvasCtx.arc(
      this.source.x,
      this.source.y,
      Math.max(4, ctx.brush.size / 2),
      0,
      Math.PI * 2,
    );
    canvasCtx.stroke();
    canvasCtx.restore();
  }
}

export class CloneTool extends StampRetouchToolBase implements Tool {
  readonly id = 'clone' as const;
  readonly cursor = 'crosshair';
  protected override mode: 'clone' | 'heal' = 'clone';
  protected override feature = 'cloneStamp';

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    this.pointerDownImpl(e, ctx);
  }
}

export class HealingTool extends StampRetouchToolBase implements Tool {
  readonly id = 'healing' as const;
  readonly cursor = 'crosshair';
  protected override mode: 'clone' | 'heal' = 'heal';
  protected override feature = 'healing';

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    this.pointerDownImpl(e, ctx);
  }
}

export type { TextLayer };
