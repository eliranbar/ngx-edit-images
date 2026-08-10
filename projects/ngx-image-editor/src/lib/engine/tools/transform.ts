import type { Tool, ToolContext, PointerEventData } from './tool';
import { TransformLayerCommand } from '../commands';
import type { Transform2D } from '../layers/types';

type Handle = 'nw' | 'ne' | 'se' | 'sw' | 'rotate' | 'move';

function transformsEqual(a: Transform2D, b: Transform2D): boolean {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height &&
    a.rotation === b.rotation &&
    a.scaleX === b.scaleX &&
    a.scaleY === b.scaleY
  );
}

export class TransformTool implements Tool {
  readonly id = 'transform' as const;
  readonly cursor = 'default';
  private mode: Handle | null = null;
  private startX = 0;
  private startY = 0;
  private origin: Transform2D | null = null;
  private layerId: string | null = null;

  private pickHandle(e: PointerEventData, t: Transform2D): Handle | null {
    const hs = 10 / Math.max(0.001, 1); // doc-space; caller may refine with zoom later
    const corners: [Handle, number, number][] = [
      ['nw', t.x, t.y],
      ['ne', t.x + t.width, t.y],
      ['se', t.x + t.width, t.y + t.height],
      ['sw', t.x, t.y + t.height],
    ];
    for (const [h, x, y] of corners) {
      if (Math.abs(e.x - x) <= hs && Math.abs(e.y - y) <= hs) return h;
    }
    const rx = t.x + t.width / 2;
    const ry = t.y - 24;
    if (Math.abs(e.x - rx) <= hs && Math.abs(e.y - ry) <= hs) return 'rotate';
    if (
      e.x >= t.x &&
      e.x <= t.x + t.width &&
      e.y >= t.y &&
      e.y <= t.y + t.height
    ) {
      return 'move';
    }
    return null;
  }

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    let layer = ctx.doc.getActiveLayer();
    if (!layer) {
      layer = ctx.doc.hitTest(e.x, e.y) ?? undefined;
      if (layer) ctx.doc.setActiveLayer(layer.id);
    }
    if (!layer || layer.locked) return;
    this.mode = this.pickHandle(e, layer.transform) ?? 'move';
    this.origin = { ...layer.transform };
    this.layerId = layer.id;
    this.startX = e.x;
    this.startY = e.y;
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (!this.mode || !this.origin || !this.layerId) return;
    const dx = e.x - this.startX;
    const dy = e.y - this.startY;
    const o = this.origin;
    let next: Transform2D = { ...o };

    if (this.mode === 'move') {
      next.x = o.x + dx;
      next.y = o.y + dy;
    } else if (this.mode === 'rotate') {
      const cx = o.x + o.width / 2;
      const cy = o.y + o.height / 2;
      const angle = (Math.atan2(e.y - cy, e.x - cx) * 180) / Math.PI + 90;
      next.rotation = e.shiftKey ? Math.round(angle / 15) * 15 : angle;
    } else {
      let w = o.width;
      let h = o.height;
      let x = o.x;
      let y = o.y;
      if (this.mode.includes('e')) w = Math.max(8, o.width + dx);
      if (this.mode.includes('s')) h = Math.max(8, o.height + dy);
      if (this.mode.includes('w')) {
        w = Math.max(8, o.width - dx);
        x = o.x + dx;
      }
      if (this.mode.includes('n')) {
        h = Math.max(8, o.height - dy);
        y = o.y + dy;
      }
      if (e.shiftKey) {
        const ratio = o.width / Math.max(1, o.height);
        h = w / ratio;
      }
      next = { ...o, x, y, width: w, height: h };
    }
    ctx.doc.setTransform(this.layerId, next);
    ctx.requestRender();
  }

  pointerUp(_e: PointerEventData, ctx: ToolContext): void {
    if (!this.origin || !this.layerId) {
      this.mode = null;
      return;
    }
    const layer = ctx.doc.getLayer(this.layerId);
    if (layer) {
      const after = { ...layer.transform };
      if (!transformsEqual(this.origin, after)) {
        ctx.history.execute(
          new TransformLayerCommand(ctx.doc, this.layerId, after, this.origin),
        );
      }
    }
    this.mode = null;
    this.origin = null;
    this.layerId = null;
    ctx.requestRender();
  }
}
