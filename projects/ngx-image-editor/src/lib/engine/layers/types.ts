import type { FilterDescriptor } from '../filters/types';

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion'
  | 'hue'
  | 'saturation'
  | 'color'
  | 'luminosity';

export type LayerType =
  | 'image'
  | 'text'
  | 'shape'
  | 'drawing'
  | 'group'
  | 'adjustment';

export type ShapeKind =
  | 'rect'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'polygon'
  | 'star';

export interface Transform2D {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

export interface LayerStyle {
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  stroke?: { color: string; width: number };
  glow?: { color: string; blur: number };
}

export interface LayerMask {
  /** Alpha mask stored as ImageData (or null if empty). */
  imageData: ImageData | null;
  enabled: boolean;
  inverted: boolean;
}

export interface StrokePoint {
  x: number;
  y: number;
  pressure?: number;
}

export interface DrawingStroke {
  points: StrokePoint[];
  color: string;
  size: number;
  opacity: number;
  erase: boolean;
}

let nextId = 1;
export function createLayerId(prefix = 'layer'): string {
  return `${prefix}_${nextId++}`;
}

export function resetLayerIdCounter(value = 1): void {
  nextId = value;
}

export interface BaseLayer {
  id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: BlendMode;
  transform: Transform2D;
  filters: FilterDescriptor[];
  mask: LayerMask | null;
  styles: LayerStyle | null;
  parentId: string | null;
}

export interface ImageLayer extends BaseLayer {
  type: 'image';
  /** HTMLImageElement or HTMLCanvasElement used as source. */
  source: CanvasImageSource | null;
  objectUrl?: string;
}

export interface TextLayer extends BaseLayer {
  type: 'text';
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  color: string;
  align: CanvasTextAlign;
  editing: boolean;
}

export interface ShapeLayer extends BaseLayer {
  type: 'shape';
  shape: ShapeKind;
  fill: string;
  stroke: string;
  strokeWidth: number;
  sides?: number;
}

export interface DrawingLayer extends BaseLayer {
  type: 'drawing';
  strokes: DrawingStroke[];
  /** Optional full-document raster for clone / heal / magic-erase stamps. */
  raster?: ImageData | null;
}

export interface GroupLayer extends BaseLayer {
  type: 'group';
  childIds: string[];
}

export interface AdjustmentLayer extends BaseLayer {
  type: 'adjustment';
  /** Filters applied to everything below this layer. */
  adjustmentFilters: FilterDescriptor[];
}

export type AnyLayer =
  | ImageLayer
  | TextLayer
  | ShapeLayer
  | DrawingLayer
  | GroupLayer
  | AdjustmentLayer;

export function defaultTransform(
  partial: Partial<Transform2D> = {},
): Transform2D {
  return {
    x: 0,
    y: 0,
    width: 200,
    height: 200,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    ...partial,
  };
}

export function createImageLayer(
  partial: Partial<ImageLayer> & Pick<ImageLayer, 'source' | 'name'> & Partial<Pick<ImageLayer, 'id'>>,
): ImageLayer {
  return {
    id: partial.id ?? createLayerId('img'),
    name: partial.name,
    type: 'image',
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    opacity: partial.opacity ?? 1,
    blendMode: partial.blendMode ?? 'source-over',
    transform: partial.transform ?? defaultTransform(),
    filters: partial.filters ?? [],
    mask: partial.mask ?? null,
    styles: partial.styles ?? null,
    parentId: partial.parentId ?? null,
    source: partial.source,
    objectUrl: partial.objectUrl,
  };
}

export function createTextLayer(
  partial: Partial<TextLayer> & Pick<TextLayer, 'text' | 'name'> = {
    text: 'Text',
    name: 'Text',
  },
): TextLayer {
  return {
    id: partial.id ?? createLayerId('txt'),
    name: partial.name,
    type: 'text',
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    opacity: partial.opacity ?? 1,
    blendMode: partial.blendMode ?? 'source-over',
    transform: partial.transform ?? defaultTransform({ width: 240, height: 48 }),
    filters: partial.filters ?? [],
    mask: partial.mask ?? null,
    styles: partial.styles ?? null,
    parentId: partial.parentId ?? null,
    text: partial.text,
    fontFamily: partial.fontFamily ?? 'Manrope, sans-serif',
    fontSize: partial.fontSize ?? 32,
    fontWeight: partial.fontWeight ?? '600',
    color: partial.color ?? '#ffffff',
    align: partial.align ?? 'left',
    editing: partial.editing ?? false,
  };
}

export function createShapeLayer(
  partial: Partial<ShapeLayer> & Pick<ShapeLayer, 'shape' | 'name'>,
): ShapeLayer {
  return {
    id: partial.id ?? createLayerId('shp'),
    name: partial.name,
    type: 'shape',
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    opacity: partial.opacity ?? 1,
    blendMode: partial.blendMode ?? 'source-over',
    transform: partial.transform ?? defaultTransform(),
    filters: partial.filters ?? [],
    mask: partial.mask ?? null,
    styles: partial.styles ?? null,
    parentId: partial.parentId ?? null,
    shape: partial.shape,
    fill: partial.fill ?? '#5b8def',
    stroke: partial.stroke ?? '#ffffff',
    strokeWidth: partial.strokeWidth ?? 2,
    sides: partial.sides,
  };
}

export function createDrawingLayer(
  partial: Partial<DrawingLayer> & Pick<DrawingLayer, 'name'> = { name: 'Drawing' },
): DrawingLayer {
  return {
    id: partial.id ?? createLayerId('draw'),
    name: partial.name,
    type: 'drawing',
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    opacity: partial.opacity ?? 1,
    blendMode: partial.blendMode ?? 'source-over',
    transform: partial.transform ?? defaultTransform({ x: 0, y: 0, width: 1, height: 1 }),
    filters: partial.filters ?? [],
    mask: partial.mask ?? null,
    styles: partial.styles ?? null,
    parentId: partial.parentId ?? null,
    strokes: partial.strokes ?? [],
    raster: partial.raster ?? null,
  };
}

export function createGroupLayer(
  partial: Partial<GroupLayer> & Pick<GroupLayer, 'name' | 'childIds'>,
): GroupLayer {
  return {
    id: partial.id ?? createLayerId('grp'),
    name: partial.name,
    type: 'group',
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    opacity: partial.opacity ?? 1,
    blendMode: partial.blendMode ?? 'source-over',
    transform: partial.transform ?? defaultTransform({ width: 0, height: 0 }),
    filters: partial.filters ?? [],
    mask: partial.mask ?? null,
    styles: partial.styles ?? null,
    parentId: partial.parentId ?? null,
    childIds: [...partial.childIds],
  };
}

export function createAdjustmentLayer(
  partial: Partial<AdjustmentLayer> & Pick<AdjustmentLayer, 'name'>,
): AdjustmentLayer {
  return {
    id: partial.id ?? createLayerId('adj'),
    name: partial.name,
    type: 'adjustment',
    visible: partial.visible ?? true,
    locked: partial.locked ?? false,
    opacity: partial.opacity ?? 1,
    blendMode: partial.blendMode ?? 'source-over',
    transform: partial.transform ?? defaultTransform({ width: 0, height: 0 }),
    filters: partial.filters ?? [],
    mask: partial.mask ?? null,
    styles: partial.styles ?? null,
    parentId: partial.parentId ?? null,
    adjustmentFilters: partial.adjustmentFilters ?? [],
  };
}

export function cloneLayer(layer: AnyLayer): AnyLayer {
  const base = {
    ...layer,
    id: createLayerId(layer.type.slice(0, 3)),
    name: `${layer.name} copy`,
  };
  if (base.type === 'image') {
    // DOM nodes (img / canvas sources) cannot pass through structuredClone.
    (base as Partial<ImageLayer>).source = null;
    delete (base as Partial<ImageLayer>).objectUrl;
  }
  const copy = structuredClone(base) as AnyLayer;
  if (layer.type === 'image' && layer.source) {
    // Deep-copy the pixels so the duplicate can be edited independently.
    const src = layer.source;
    const w =
      src instanceof HTMLImageElement
        ? src.naturalWidth || src.width
        : (src as { width: number }).width;
    const h =
      src instanceof HTMLImageElement
        ? src.naturalHeight || src.height
        : (src as { height: number }).height;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Number(w));
    canvas.height = Math.max(1, Number(h));
    canvas.getContext('2d')!.drawImage(src, 0, 0);
    (copy as ImageLayer).source = canvas;
  }
  return copy;
}
