import type { Tool, ToolContext, PointerEventData } from './tool';
import { CropCommand } from '../commands';
import { isAltModifier } from '../platform';

export class CropTool implements Tool {
  readonly id = 'crop' as const;
  readonly cursor = 'crosshair';
  private startX = 0;
  private startY = 0;
  private dragging = false;
  private curX = 0;
  private curY = 0;

  pointerDown(e: PointerEventData): void {
    this.startX = e.x;
    this.startY = e.y;
    this.curX = e.x;
    this.curY = e.y;
    this.dragging = true;
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging) return;
    this.curX = e.x;
    this.curY = e.y;
    ctx.requestRender();
  }

  pointerUp(_e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging) return;
    this.dragging = false;
    const x = Math.max(0, Math.min(this.startX, this.curX));
    const y = Math.max(0, Math.min(this.startY, this.curY));
    const w = Math.min(ctx.doc.width - x, Math.abs(this.curX - this.startX));
    const h = Math.min(ctx.doc.height - y, Math.abs(this.curY - this.startY));
    if (w < 4 || h < 4) {
      ctx.requestRender();
      return;
    }
    ctx.history.execute(
      new CropCommand(ctx.doc, Math.round(w), Math.round(h), x, y),
    );
    ctx.requestRender();
  }

  drawOverlay(canvasCtx: CanvasRenderingContext2D, ctx: ToolContext): void {
    if (!this.dragging) return;
    const x = Math.min(this.startX, this.curX);
    const y = Math.min(this.startY, this.curY);
    const w = Math.abs(this.curX - this.startX);
    const h = Math.abs(this.curY - this.startY);
    const { width: dw, height: dh } = ctx.doc;
    canvasCtx.save();
    canvasCtx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    canvasCtx.fillRect(0, 0, dw, Math.max(0, y));
    canvasCtx.fillRect(0, y, Math.max(0, x), h);
    canvasCtx.fillRect(x + w, y, Math.max(0, dw - x - w), h);
    canvasCtx.fillRect(0, y + h, dw, Math.max(0, dh - y - h));
    canvasCtx.strokeStyle = '#5b8def';
    canvasCtx.lineWidth = 1.5;
    canvasCtx.setLineDash([6, 4]);
    canvasCtx.strokeRect(x, y, w, h);
    canvasCtx.restore();
  }
}

export class PanTool implements Tool {
  readonly id = 'pan' as const;
  readonly cursor = 'grab';
  private dragging = false;
  private startScreenX = 0;
  private startScreenY = 0;
  private originPanX = 0;
  private originPanY = 0;

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    this.dragging = true;
    this.startScreenX = e.screenX;
    this.startScreenY = e.screenY;
    this.originPanX = ctx.doc.viewport.panX;
    this.originPanY = ctx.doc.viewport.panY;
  }

  pointerMove(e: PointerEventData, ctx: ToolContext): void {
    if (!this.dragging) return;
    ctx.doc.setViewport({
      panX: this.originPanX + (e.screenX - this.startScreenX),
      panY: this.originPanY + (e.screenY - this.startScreenY),
    });
    ctx.requestRender();
  }

  pointerUp(): void {
    this.dragging = false;
  }
}

export class ZoomTool implements Tool {
  readonly id = 'zoom' as const;
  readonly cursor = 'zoom-in';

  pointerDown(e: PointerEventData, ctx: ToolContext): void {
    const factor = isAltModifier(e) ? 1 / 1.25 : 1.25;
    const zoom = Math.max(0.1, Math.min(8, ctx.doc.viewport.zoom * factor));
    ctx.doc.setViewport({ zoom });
    ctx.requestRender();
  }

  pointerMove(): void {}
  pointerUp(): void {}
}
