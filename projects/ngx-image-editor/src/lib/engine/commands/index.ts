import type { Command } from '../history';
import type { EditorDocument } from '../document';
import type { AnyLayer, BlendMode, Transform2D, DrawingStroke } from '../layers/types';
import type { FilterDescriptor } from '../filters/types';
import type { PixelSelection } from '../selection';

export class AddLayerCommand implements Command {
  readonly name = 'addLayer';
  constructor(
    private doc: EditorDocument,
    private layer: AnyLayer,
    private index?: number,
  ) {}
  do(): void {
    this.doc.addLayer(this.layer, this.index);
  }
  undo(): void {
    this.doc.removeLayer(this.layer.id);
  }
}

export class RemoveLayerCommand implements Command {
  readonly name = 'removeLayer';
  private layer: AnyLayer | undefined;
  private index = -1;
  private prevActive: string | null = null;
  constructor(
    private doc: EditorDocument,
    private id: string,
  ) {}
  do(): void {
    this.prevActive = this.doc.activeLayerId;
    this.index = this.doc.rootOrder.indexOf(this.id);
    this.layer = this.doc.removeLayer(this.id);
  }
  undo(): void {
    if (!this.layer) return;
    this.doc.addLayer(this.layer, this.index >= 0 ? this.index : undefined);
    this.doc.setActiveLayer(this.prevActive);
  }
}

export class TransformLayerCommand implements Command {
  readonly name = 'transformLayer';
  private before: Transform2D;
  constructor(
    private doc: EditorDocument,
    private id: string,
    private after: Transform2D,
    before?: Transform2D,
  ) {
    const layer = doc.getLayer(id);
    this.before = before ? { ...before } : { ...(layer?.transform ?? after) };
  }
  do(): void {
    this.doc.setTransform(this.id, this.after);
  }
  undo(): void {
    this.doc.setTransform(this.id, this.before);
  }
}

export class SetOpacityCommand implements Command {
  readonly name = 'setOpacity';
  private before: number;
  constructor(
    private doc: EditorDocument,
    private id: string,
    private after: number,
  ) {
    this.before = doc.getLayer(id)?.opacity ?? 1;
  }
  do(): void {
    this.doc.setOpacity(this.id, this.after);
  }
  undo(): void {
    this.doc.setOpacity(this.id, this.before);
  }
}

export class SetBlendModeCommand implements Command {
  readonly name = 'setBlendMode';
  private before: BlendMode;
  constructor(
    private doc: EditorDocument,
    private id: string,
    private after: BlendMode,
  ) {
    this.before = doc.getLayer(id)?.blendMode ?? 'source-over';
  }
  do(): void {
    this.doc.setBlendMode(this.id, this.after);
  }
  undo(): void {
    this.doc.setBlendMode(this.id, this.before);
  }
}

export class SetFiltersCommand implements Command {
  readonly name = 'setFilters';
  private before: FilterDescriptor[];
  constructor(
    private doc: EditorDocument,
    private id: string,
    private after: FilterDescriptor[],
  ) {
    this.before = [...(doc.getLayer(id)?.filters ?? [])];
  }
  do(): void {
    this.doc.setFilters(this.id, this.after);
  }
  undo(): void {
    this.doc.setFilters(this.id, this.before);
  }
}

export class ReorderLayerCommand implements Command {
  readonly name = 'reorderLayer';
  private beforeIndex: number;
  constructor(
    private doc: EditorDocument,
    private id: string,
    private afterIndex: number,
  ) {
    this.beforeIndex = doc.rootOrder.indexOf(id);
  }
  do(): void {
    this.doc.reorderLayer(this.id, this.afterIndex);
  }
  undo(): void {
    this.doc.reorderLayer(this.id, this.beforeIndex);
  }
}

export class DuplicateLayerCommand implements Command {
  readonly name = 'duplicateLayer';
  private createdId: string | null = null;
  constructor(private doc: EditorDocument) {}
  do(): void {
    const copy = this.doc.duplicateActiveLayer();
    this.createdId = copy?.id ?? null;
  }
  undo(): void {
    if (this.createdId) this.doc.removeLayer(this.createdId);
  }
}

export class SetSelectionCommand implements Command {
  readonly name = 'setSelection';
  constructor(
    private doc: EditorDocument,
    private after: PixelSelection,
    private before: PixelSelection = doc.selection,
  ) {}
  do(): void {
    this.doc.setSelection(this.after);
  }
  undo(): void {
    this.doc.setSelection(this.before);
  }
}

export class UpdateLayerPropsCommand implements Command {
  readonly name = 'updateLayerProps';
  private before: Record<string, unknown>;
  private after: Record<string, unknown>;
  constructor(
    private doc: EditorDocument,
    private id: string,
    after: Record<string, unknown>,
  ) {
    const layer = doc.getLayer(id) as unknown as Record<string, unknown> | undefined;
    this.after = { ...after };
    this.before = {};
    for (const key of Object.keys(after)) {
      this.before[key] = layer ? layer[key] : undefined;
    }
  }
  do(): void {
    this.doc.updateLayer(this.id, this.after as Partial<AnyLayer>);
  }
  undo(): void {
    this.doc.updateLayer(this.id, this.before as Partial<AnyLayer>);
  }
}

export class AddStrokeCommand implements Command {
  readonly name = 'addStroke';
  constructor(
    private doc: EditorDocument,
    private layerId: string,
    private stroke: DrawingStroke,
  ) {}
  do(): void {
    const layer = this.doc.getLayer(this.layerId);
    if (layer?.type === 'drawing') {
      if (!layer.strokes.includes(this.stroke)) {
        layer.strokes.push(this.stroke);
        this.doc.notify();
      }
    }
  }
  undo(): void {
    const layer = this.doc.getLayer(this.layerId);
    if (layer?.type === 'drawing') {
      const idx = layer.strokes.indexOf(this.stroke);
      if (idx >= 0) {
        layer.strokes.splice(idx, 1);
        this.doc.notify();
      }
    }
  }
}

export class SetRasterCommand implements Command {
  readonly name = 'setRaster';
  constructor(
    private doc: EditorDocument,
    private layerId: string,
    private after: ImageData,
    private before: ImageData | null,
  ) {}
  do(): void {
    const layer = this.doc.getLayer(this.layerId);
    if (layer?.type === 'drawing') {
      layer.raster = this.after;
      this.doc.notify();
    }
  }
  undo(): void {
    const layer = this.doc.getLayer(this.layerId);
    if (layer?.type === 'drawing') {
      layer.raster = this.before;
      this.doc.notify();
    }
  }
}

/** Undoable pixel patch for an image layer whose source is a canvas. */
export class SetImagePixelsCommand implements Command {
  readonly name = 'setImagePixels';
  constructor(
    private doc: EditorDocument,
    private layerId: string,
    private canvas: HTMLCanvasElement,
    private after: ImageData,
    private before: ImageData,
  ) {}
  do(): void {
    this.canvas.getContext('2d')!.putImageData(this.after, 0, 0);
    this.doc.notify();
  }
  undo(): void {
    this.canvas.getContext('2d')!.putImageData(this.before, 0, 0);
    this.doc.notify();
  }
}

export class CropCommand implements Command {
  readonly name = 'crop';
  private beforeTransforms = new Map<string, Transform2D>();
  private beforeWidth: number;
  private beforeHeight: number;

  constructor(
    private doc: EditorDocument,
    private afterWidth: number,
    private afterHeight: number,
    private offsetX: number,
    private offsetY: number,
  ) {
    this.beforeWidth = doc.width;
    this.beforeHeight = doc.height;
    for (const layer of doc.getLayers()) {
      this.beforeTransforms.set(layer.id, { ...layer.transform });
    }
  }

  do(): void {
    for (const layer of this.doc.getLayers()) {
      const before = this.beforeTransforms.get(layer.id);
      if (!before) continue;
      this.doc.setTransform(layer.id, {
        x: before.x - this.offsetX,
        y: before.y - this.offsetY,
      });
    }
    this.doc.width = this.afterWidth;
    this.doc.height = this.afterHeight;
    this.doc.notify();
  }

  undo(): void {
    this.doc.width = this.beforeWidth;
    this.doc.height = this.beforeHeight;
    for (const [id, transform] of this.beforeTransforms) {
      this.doc.setTransform(id, transform);
    }
    this.doc.notify();
  }
}
