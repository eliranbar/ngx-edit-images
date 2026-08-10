import type { Tool, ToolContext, PointerEventData } from './tool';
import { TransformLayerCommand } from '../commands';
import type { Transform2D } from '../layers/types';
import { gridTargets, snapValue } from '../snapping';

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

export class MoveTool implements Tool {
  readonly id = 'move' as const;
  readonly cursor = 'move';
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private origin: Transform2D | null = null;
  private layerId: string | null = null;

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    const hit = ctx.doc.hitTest(e.x, e.y);
    if (hit) {
      ctx.doc.setActiveLayer(hit.id);
      this.layerId = hit.id;
      this.origin = { ...hit.transform };
      this.startX = e.x;
      this.startY = e.y;
      this.dragging = true;
    } else {
      ctx.doc.setActiveLayer(null);
    }
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging || !this.origin || !this.layerId) return;
    let nx = this.origin.x + (e.x - this.startX);
    let ny = this.origin.y + (e.y - this.startY);
    if (ctx.doc.snap.enabled && ctx.doc.snap.snapToGrid) {
      const xs = gridTargets(ctx.doc.snap.gridSize, ctx.doc.width);
      const ys = gridTargets(ctx.doc.snap.gridSize, ctx.doc.height);
      nx = snapValue(nx, xs, ctx.doc.snap.threshold).value;
      ny = snapValue(ny, ys, ctx.doc.snap.threshold).value;
    }
    ctx.doc.setTransform(this.layerId, { x: nx, y: ny });
    ctx.requestRender();
  }

  pointerUp(_e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging || !this.origin || !this.layerId) {
      this.dragging = false;
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
    this.dragging = false;
    this.origin = null;
    this.layerId = null;
    ctx.requestRender();
  }
}
