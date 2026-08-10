import {
  AnyLayer,
  BlendMode,
  Transform2D,
  cloneLayer,
  createGroupLayer,
} from './layers/types';
import { PixelSelection, createEmptySelection } from './selection';
import { Guide, SnapSettings, DEFAULT_SNAP_SETTINGS } from './snapping';
import type { FilterDescriptor } from './filters/types';

export interface ViewportState {
  zoom: number;
  panX: number;
  panY: number;
}

export interface EditorDocumentSnapshot {
  width: number;
  height: number;
  background: string;
  layers: AnyLayer[];
  rootOrder: string[];
  activeLayerId: string | null;
  selection: PixelSelection;
  guides: Guide[];
  snap: SnapSettings;
  viewport: ViewportState;
}

export type DocumentListener = () => void;

export class EditorDocument {
  width: number;
  height: number;
  background: string;
  private layers = new Map<string, AnyLayer>();
  /** Top-level layer order, bottom → top. */
  rootOrder: string[] = [];
  activeLayerId: string | null = null;
  selection: PixelSelection = createEmptySelection();
  guides: Guide[] = [];
  snap: SnapSettings = { ...DEFAULT_SNAP_SETTINGS };
  viewport: ViewportState = { zoom: 1, panX: 0, panY: 0 };
  private listeners = new Set<DocumentListener>();
  private revision = 0;

  constructor(width = 1200, height = 800, background = '#1a1f2e') {
    this.width = width;
    this.height = height;
    this.background = background;
  }

  getRevision(): number {
    return this.revision;
  }

  subscribe(listener: DocumentListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify(): void {
    this.revision++;
    for (const l of this.listeners) l();
  }

  getLayer(id: string): AnyLayer | undefined {
    return this.layers.get(id);
  }

  getLayers(): AnyLayer[] {
    return this.rootOrder
      .map((id) => this.layers.get(id))
      .filter((l): l is AnyLayer => !!l);
  }

  /** Flattened paint order (bottom → top), expanding groups. */
  getPaintOrder(): AnyLayer[] {
    const out: AnyLayer[] = [];
    const walk = (ids: string[]) => {
      for (const id of ids) {
        const layer = this.layers.get(id);
        if (!layer || !layer.visible) continue;
        if (layer.type === 'group') {
          walk(layer.childIds);
        } else {
          out.push(layer);
        }
      }
    };
    walk(this.rootOrder);
    return out;
  }

  getActiveLayer(): AnyLayer | undefined {
    return this.activeLayerId ? this.layers.get(this.activeLayerId) : undefined;
  }

  addLayer(layer: AnyLayer, index?: number): void {
    this.layers.set(layer.id, layer);
    if (layer.parentId) {
      const parent = this.layers.get(layer.parentId);
      if (parent?.type === 'group') {
        parent.childIds.push(layer.id);
      }
    } else if (typeof index === 'number') {
      this.rootOrder.splice(index, 0, layer.id);
    } else {
      this.rootOrder.push(layer.id);
    }
    this.activeLayerId = layer.id;
    this.notify();
  }

  removeLayer(id: string): AnyLayer | undefined {
    const layer = this.layers.get(id);
    if (!layer) return undefined;
    this.layers.delete(id);
    this.rootOrder = this.rootOrder.filter((x) => x !== id);
    for (const l of this.layers.values()) {
      if (l.type === 'group') {
        l.childIds = l.childIds.filter((c) => c !== id);
      }
    }
    if (this.activeLayerId === id) {
      this.activeLayerId = this.rootOrder[this.rootOrder.length - 1] ?? null;
    }
    this.notify();
    return layer;
  }

  duplicateActiveLayer(): AnyLayer | null {
    const active = this.getActiveLayer();
    if (!active) return null;
    const copy = cloneLayer(active);
    const idx = this.rootOrder.indexOf(active.id);
    this.addLayer(copy, idx >= 0 ? idx + 1 : undefined);
    return copy;
  }

  setActiveLayer(id: string | null): void {
    this.activeLayerId = id;
    this.notify();
  }

  updateLayer(id: string, patch: Partial<AnyLayer>): void {
    const layer = this.layers.get(id);
    if (!layer) return;
    Object.assign(layer, patch);
    this.notify();
  }

  setTransform(id: string, transform: Partial<Transform2D>): void {
    const layer = this.layers.get(id);
    if (!layer) return;
    layer.transform = { ...layer.transform, ...transform };
    this.notify();
  }

  setOpacity(id: string, opacity: number): void {
    this.updateLayer(id, { opacity: Math.max(0, Math.min(1, opacity)) });
  }

  setBlendMode(id: string, blendMode: BlendMode): void {
    this.updateLayer(id, { blendMode });
  }

  setFilters(id: string, filters: FilterDescriptor[]): void {
    this.updateLayer(id, { filters });
  }

  reorderLayer(id: string, toIndex: number): void {
    const from = this.rootOrder.indexOf(id);
    if (from < 0) return;
    this.rootOrder.splice(from, 1);
    this.rootOrder.splice(Math.max(0, Math.min(toIndex, this.rootOrder.length)), 0, id);
    this.notify();
  }

  bringForward(id: string): void {
    const i = this.rootOrder.indexOf(id);
    if (i < 0 || i >= this.rootOrder.length - 1) return;
    this.reorderLayer(id, i + 1);
  }

  sendBackward(id: string): void {
    const i = this.rootOrder.indexOf(id);
    if (i <= 0) return;
    this.reorderLayer(id, i - 1);
  }

  bringToFront(id: string): void {
    this.reorderLayer(id, this.rootOrder.length - 1);
  }

  sendToBack(id: string): void {
    this.reorderLayer(id, 0);
  }

  groupSelected(ids: string[]): string | null {
    if (ids.length < 2) return null;
    const indices = ids
      .map((id) => this.rootOrder.indexOf(id))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);
    if (indices.length < 2) return null;
    const insertAt = indices[0]!;
    for (const id of ids) {
      this.rootOrder = this.rootOrder.filter((x) => x !== id);
    }
    const group = createGroupLayer({ name: 'Group', childIds: ids });
    for (const id of ids) {
      const layer = this.layers.get(id);
      if (layer) layer.parentId = group.id;
    }
    this.layers.set(group.id, group);
    this.rootOrder.splice(insertAt, 0, group.id);
    this.activeLayerId = group.id;
    this.notify();
    return group.id;
  }

  ungroup(id: string): void {
    const group = this.layers.get(id);
    if (!group || group.type !== 'group') return;
    const idx = this.rootOrder.indexOf(id);
    this.rootOrder = this.rootOrder.filter((x) => x !== id);
    for (const childId of group.childIds) {
      const child = this.layers.get(childId);
      if (child) child.parentId = null;
    }
    this.rootOrder.splice(idx >= 0 ? idx : this.rootOrder.length, 0, ...group.childIds);
    this.layers.delete(id);
    this.activeLayerId = group.childIds[0] ?? null;
    this.notify();
  }

  setViewport(patch: Partial<ViewportState>): void {
    this.viewport = { ...this.viewport, ...patch };
    this.notify();
  }

  setSelection(selection: PixelSelection): void {
    this.selection = selection;
    this.notify();
  }

  clearSelection(): void {
    this.selection = createEmptySelection();
    this.notify();
  }

  addGuide(guide: Guide): void {
    this.guides.push(guide);
    this.notify();
  }

  removeGuide(id: string): void {
    this.guides = this.guides.filter((g) => g.id !== id);
    this.notify();
  }

  updateSnap(patch: Partial<SnapSettings>): void {
    this.snap = { ...this.snap, ...patch };
    this.notify();
  }

  hitTest(docX: number, docY: number): AnyLayer | null {
    const order = [...this.getPaintOrder()].reverse();
    for (const layer of order) {
      if (layer.locked) continue;
      const t = layer.transform;
      const cos = Math.cos((-t.rotation * Math.PI) / 180);
      const sin = Math.sin((-t.rotation * Math.PI) / 180);
      const cx = t.x + t.width / 2;
      const cy = t.y + t.height / 2;
      const dx = docX - cx;
      const dy = docY - cy;
      const lx = dx * cos - dy * sin + t.width / 2;
      const ly = dx * sin + dy * cos + t.height / 2;
      if (lx >= 0 && ly >= 0 && lx <= t.width && ly <= t.height) {
        return layer;
      }
    }
    return null;
  }

  toSnapshot(): EditorDocumentSnapshot {
    return {
      width: this.width,
      height: this.height,
      background: this.background,
      layers: Array.from(this.layers.values()).map((l) => ({ ...l })),
      rootOrder: [...this.rootOrder],
      activeLayerId: this.activeLayerId,
      selection: this.selection,
      guides: [...this.guides],
      snap: { ...this.snap },
      viewport: { ...this.viewport },
    };
  }
}
