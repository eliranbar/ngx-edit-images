import { EditorDocument } from './document';
import { HistoryStack } from './history';
import { createToolRegistry, type Tool, type ToolContext, type PointerEventData } from './tools';
import { ShortcutRegistry, type ShortcutAction, type ShortcutOverrides } from './shortcuts';
import {
  RemoveLayerCommand,
  DuplicateLayerCommand,
  TransformLayerCommand,
  AddLayerCommand,
  ClearAllLayersCommand,
} from './commands';
import {
  createImageLayer,
  createDrawingLayer,
  defaultTransform,
  type AnyLayer,
  type ShapeKind,
} from './layers/types';
import { exportDocument, downloadExport, type ExportOptions, type ExportResult } from './export';
import { renderDocument } from './renderer';
import type { NieToolId } from '../config/tokens';
import { createEmptySelection } from './selection';

export interface EngineOptions {
  width?: number;
  height?: number;
  background?: string;
  shortcuts?: ShortcutOverrides;
  isFeatureEnabled?: (feature: string) => boolean;
}

/**
 * High-level facade that owns the document, history, tools and shortcuts.
 * Angular components wrap this with signals.
 */
export class ImageEditorEngine {
  readonly doc: EditorDocument;
  readonly history: HistoryStack;
  readonly shortcuts: ShortcutRegistry;
  private readonly tools = createToolRegistry();
  private activeToolId: NieToolId = 'move';
  private renderListeners = new Set<() => void>();
  private spacePan = false;
  private prevTool: NieToolId | null = null;
  brush = { color: '#5b8def', size: 12, opacity: 1 };
  shapeKind: ShapeKind = 'rect';
  fillColor = '#5b8def';
  private clipboard: AnyLayer | null = null;
  private isFeatureEnabled: (feature: string) => boolean;

  openFilePicker?: () => void;
  openExport?: () => void;

  constructor(options: EngineOptions = {}) {
    this.doc = new EditorDocument(
      options.width ?? 1200,
      options.height ?? 800,
      options.background ?? '#1a1f2e',
    );
    this.history = new HistoryStack();
    this.shortcuts = new ShortcutRegistry(options.shortcuts ?? {});
    this.isFeatureEnabled = options.isFeatureEnabled ?? (() => true);
  }

  getActiveTool(): Tool {
    return this.tools.get(this.activeToolId)!;
  }

  getActiveToolId(): NieToolId {
    return this.activeToolId;
  }

  setActiveTool(id: NieToolId): void {
    const prev = this.tools.get(this.activeToolId);
    prev?.onDeactivate?.(this.ctx());
    this.activeToolId = id;
    this.tools.get(id)?.onActivate?.(this.ctx());
    this.requestRender();
  }

  onRender(listener: () => void): () => void {
    this.renderListeners.add(listener);
    return () => this.renderListeners.delete(listener);
  }

  requestRender(): void {
    for (const l of this.renderListeners) l();
  }

  private ctx(): ToolContext {
    const self = this;
    return {
      doc: this.doc,
      history: this.history,
      requestRender: () => this.requestRender(),
      openFilePicker: this.openFilePicker,
      openExport: this.openExport,
      brush: this.brush,
      shapeKind: this.shapeKind,
      get fillColor() {
        return self.fillColor;
      },
      set fillColor(value: string) {
        self.fillColor = value;
      },
      isFeatureEnabled: this.isFeatureEnabled,
      setActiveTool: (t) => this.setActiveTool(t),
    };
  }

  screenToDoc(screenX: number, screenY: number, canvasRect: DOMRect): { x: number; y: number } {
    const { zoom, panX, panY } = this.doc.viewport;
    return {
      x: (screenX - canvasRect.left - panX) / zoom,
      y: (screenY - canvasRect.top - panY) / zoom,
    };
  }

  pointerDown(e: PointerEventData): void {
    this.getActiveTool().pointerDown(e, this.ctx());
  }

  pointerMove(e: PointerEventData): void {
    this.getActiveTool().pointerMove(e, this.ctx());
  }

  pointerUp(e: PointerEventData): void {
    this.getActiveTool().pointerUp(e, this.ctx());
  }

  doubleClick(e: PointerEventData): void {
    this.getActiveTool().doubleClick?.(e, this.ctx());
  }

  render(
    target: HTMLCanvasElement,
    showOverlay = true,
    options: { stageColor?: string | null } = {},
  ): void {
    const ctx = target.getContext('2d');
    if (!ctx) return;
    const { zoom, panX, panY } = this.doc.viewport;
    const dpr =
      typeof window !== 'undefined' && window.devicePixelRatio
        ? window.devicePixelRatio
        : 1;

    // Clear in device pixels. Leave transparent when stageColor is null so the
    // themed CSS checkerboard on `.ngx-nie__stage` shows through.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, target.width, target.height);
    if (options.stageColor) {
      ctx.fillStyle = options.stageColor;
      ctx.fillRect(0, 0, target.width, target.height);
    }

    const offscreen = renderDocument(this.doc, undefined, {
      showOverlay,
      showGrid: this.doc.snap.showGrid,
      showGuides: this.doc.snap.showGuides,
    });
    // Map CSS-pixel pan/zoom into the backing store (fixes Retina misalignment).
    ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, panX * dpr, panY * dpr);
    ctx.drawImage(offscreen, 0, 0);

    const tool = this.getActiveTool();
    if (tool.drawOverlay) {
      ctx.save();
      tool.drawOverlay(ctx, this.ctx());
      ctx.restore();
    }
  }

  /** Update the artboard background (e.g. when chrome theme changes). */
  setDocumentBackground(color: string): void {
    if (this.doc.background === color) return;
    this.doc.background = color;
    this.doc.notify();
  }

  async loadImageFile(file: File): Promise<void> {
    const url = URL.createObjectURL(file);
    const img = await loadHtmlImage(url);
    const maxW = this.doc.width * 0.8;
    const maxH = this.doc.height * 0.8;
    const scale = Math.min(1, maxW / img.width, maxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    const layer = createImageLayer({
      name: file.name || 'Image',
      source: img,
      objectUrl: url,
      transform: defaultTransform({
        x: (this.doc.width - w) / 2,
        y: (this.doc.height - h) / 2,
        width: w,
        height: h,
      }),
    });
    this.history.execute(new AddLayerCommand(this.doc, layer));
    this.requestRender();
  }

  /** Delete every layer at once (undoable). */
  clearAllLayers(): void {
    if (this.doc.getLayers().length === 0) return;
    this.history.execute(new ClearAllLayersCommand(this.doc));
    this.requestRender();
  }

  /** Start a completely fresh canvas: remove all layers, guides, selection and history. */
  newCanvas(options: { width?: number; height?: number; background?: string } = {}): void {
    this.doc.clearAllLayers();
    if (options.width) this.doc.width = options.width;
    if (options.height) this.doc.height = options.height;
    if (options.background) this.doc.background = options.background;
    this.doc.guides = [];
    this.doc.setViewport({ zoom: 1, panX: 0, panY: 0 });
    this.history.clear();
    this.doc.notify();
    this.requestRender();
  }

  /** Manually create an empty drawing layer and select it. */
  addDrawingLayer(name = 'Layer'): string {
    const n = this.doc.getLayers().filter((l) => l.type === 'drawing').length + 1;
    const layer = createDrawingLayer({
      name: name === 'Layer' ? `Layer ${n}` : name,
      transform: defaultTransform({
        x: 0,
        y: 0,
        width: this.doc.width,
        height: this.doc.height,
      }),
    });
    this.history.execute(new AddLayerCommand(this.doc, layer));
    this.requestRender();
    return layer.id;
  }

  /**
   * Premium: import PDF pages as image layers.
   * Requires feature gate `pdf` and optional peer `pdfjs-dist`.
   */
  async loadPdfFile(
    file: File,
    options: {
      pages?: number[];
      scale?: number;
      maxPages?: number;
      workerSrc?: string;
      /** When true, resize the artboard to the first page. Default true for empty docs. */
      fitDocument?: boolean;
    } = {},
  ): Promise<number> {
    if (!this.isFeatureEnabled('pdf')) {
      throw new Error('PDF import is a premium feature');
    }
    const { rasterizePdfPages } = await import('./pdf-import');
    const rasters = await rasterizePdfPages(file, {
      pages: options.pages,
      scale: options.scale,
      maxPages: options.maxPages,
      workerSrc: options.workerSrc,
    });
    if (!rasters.length) return 0;

    const fit =
      options.fitDocument ?? this.doc.getLayers().length === 0;
    if (fit) {
      const first = rasters[0]!;
      this.doc.width = first.width;
      this.doc.height = first.height;
      this.doc.setViewport({ zoom: Math.min(1, 0.85), panX: 24, panY: 24 });
    }

    const baseName = file.name.replace(/\.pdf$/i, '') || 'PDF';
    let offset = 0;
    for (const page of rasters) {
      const maxW = this.doc.width * 0.95;
      const maxH = this.doc.height * 0.95;
      const scale = Math.min(1, maxW / page.width, maxH / page.height);
      const w = page.width * scale;
      const h = page.height * scale;
      const layer = createImageLayer({
        name: `${baseName} — p${page.pageNumber}`,
        source: page.canvas,
        transform: defaultTransform({
          x: (this.doc.width - w) / 2 + offset,
          y: (this.doc.height - h) / 2 + offset,
          width: w,
          height: h,
        }),
      });
      this.history.execute(new AddLayerCommand(this.doc, layer));
      offset += 16;
    }
    this.requestRender();
    return rasters.length;
  }

  async export(options: ExportOptions): Promise<ExportResult> {
    return exportDocument(this.doc, options);
  }

  async exportAndDownload(options: ExportOptions): Promise<ExportResult> {
    const result = await this.export(options);
    downloadExport(result);
    return result;
  }

  handleShortcut(action: ShortcutAction, editingText: boolean): boolean {
    if (editingText && !action.startsWith('edit.') && action !== 'file.export') {
      // Allow only a few while typing
      if (!['edit.undo', 'edit.redo'].includes(action)) return false;
    }

    switch (action) {
      case 'tool.move':
        this.setActiveTool('move');
        return true;
      case 'tool.transform':
      case 'transform.free':
        this.setActiveTool('transform');
        return true;
      case 'tool.crop':
        this.setActiveTool('crop');
        return true;
      case 'tool.text':
        this.setActiveTool('text');
        return true;
      case 'tool.shape':
        this.setActiveTool('shape');
        return true;
      case 'tool.brush':
        if (this.isFeatureEnabled('brush')) this.setActiveTool('brush');
        return true;
      case 'tool.eraser':
        if (this.isFeatureEnabled('eraser')) this.setActiveTool('eraser');
        return true;
      case 'tool.select-rect':
        this.setActiveTool('select-rect');
        return true;
      case 'tool.select-ellipse':
        this.setActiveTool('select-ellipse');
        return true;
      case 'tool.lasso':
        if (this.isFeatureEnabled('advancedSelection')) this.setActiveTool('lasso');
        return true;
      case 'tool.magic-wand':
        if (this.isFeatureEnabled('advancedSelection')) this.setActiveTool('magic-wand');
        return true;
      case 'tool.clone':
        if (this.isFeatureEnabled('cloneStamp')) this.setActiveTool('clone');
        return true;
      case 'tool.healing':
        if (this.isFeatureEnabled('healing')) this.setActiveTool('healing');
        return true;
      case 'tool.eyedropper':
        this.setActiveTool('eyedropper');
        return true;
      case 'tool.fill':
        this.setActiveTool('fill');
        return true;
      case 'tool.pan':
        this.setActiveTool('pan');
        return true;
      case 'tool.zoom':
        this.setActiveTool('zoom');
        return true;
      case 'edit.undo':
        this.history.undo();
        this.requestRender();
        return true;
      case 'edit.redo':
        this.history.redo();
        this.requestRender();
        return true;
      case 'edit.delete': {
        const id = this.doc.activeLayerId;
        if (id) {
          this.history.execute(new RemoveLayerCommand(this.doc, id));
          this.requestRender();
        }
        return true;
      }
      case 'edit.duplicate':
        this.history.execute(new DuplicateLayerCommand(this.doc));
        this.requestRender();
        return true;
      case 'edit.copy': {
        const active = this.doc.getActiveLayer();
        if (active) this.clipboard = structuredClone({ ...active, source: (active as { source?: unknown }).source }) as AnyLayer;
        return true;
      }
      case 'edit.cut': {
        const active = this.doc.getActiveLayer();
        if (active) {
          this.clipboard = active;
          this.history.execute(new RemoveLayerCommand(this.doc, active.id));
          this.requestRender();
        }
        return true;
      }
      case 'edit.paste': {
        if (this.clipboard) {
          const copy = {
            ...structuredClone(this.clipboard),
            id: `${this.clipboard.type}_${Date.now()}`,
            name: `${this.clipboard.name} copy`,
          } as AnyLayer;
          if (this.clipboard.type === 'image') {
            (copy as { source: unknown }).source = (this.clipboard as { source: unknown }).source;
          }
          copy.transform = {
            ...copy.transform,
            x: copy.transform.x + 16,
            y: copy.transform.y + 16,
          };
          this.history.execute(new AddLayerCommand(this.doc, copy));
          this.requestRender();
        }
        return true;
      }
      case 'edit.select-all':
        // Select topmost layer
        if (this.doc.rootOrder.length) {
          this.doc.setActiveLayer(this.doc.rootOrder[this.doc.rootOrder.length - 1]!);
        }
        return true;
      case 'edit.deselect':
        this.doc.setActiveLayer(null);
        this.doc.setSelection(createEmptySelection());
        this.requestRender();
        return true;
      case 'layer.group': {
        if (!this.isFeatureEnabled('groups')) return true;
        const id = this.doc.activeLayerId;
        if (id) {
          // Group with previous sibling if any
          const idx = this.doc.rootOrder.indexOf(id);
          if (idx > 0) {
            this.doc.groupSelected([this.doc.rootOrder[idx - 1]!, id]);
            this.requestRender();
          }
        }
        return true;
      }
      case 'layer.ungroup': {
        if (this.doc.activeLayerId) {
          this.doc.ungroup(this.doc.activeLayerId);
          this.requestRender();
        }
        return true;
      }
      case 'layer.bring-forward':
        if (this.doc.activeLayerId) this.doc.bringForward(this.doc.activeLayerId);
        return true;
      case 'layer.send-backward':
        if (this.doc.activeLayerId) this.doc.sendBackward(this.doc.activeLayerId);
        return true;
      case 'layer.bring-to-front':
        if (this.doc.activeLayerId) this.doc.bringToFront(this.doc.activeLayerId);
        return true;
      case 'layer.send-to-back':
        if (this.doc.activeLayerId) this.doc.sendToBack(this.doc.activeLayerId);
        return true;
      case 'transform.nudge-left':
      case 'transform.nudge-right':
      case 'transform.nudge-up':
      case 'transform.nudge-down':
      case 'transform.nudge-left-large':
      case 'transform.nudge-right-large':
      case 'transform.nudge-up-large':
      case 'transform.nudge-down-large': {
        const layer = this.doc.getActiveLayer();
        if (!layer) return true;
        const large = action.includes('large');
        const step = large ? 10 : 1;
        const after = { ...layer.transform };
        if (action.includes('left')) after.x -= step;
        if (action.includes('right')) after.x += step;
        if (action.includes('up')) after.y -= step;
        if (action.includes('down')) after.y += step;
        this.history.execute(new TransformLayerCommand(this.doc, layer.id, after));
        this.requestRender();
        return true;
      }
      case 'view.zoom-in':
        this.doc.setViewport({ zoom: Math.min(8, this.doc.viewport.zoom * 1.25) });
        this.requestRender();
        return true;
      case 'view.zoom-out':
        this.doc.setViewport({ zoom: Math.max(0.1, this.doc.viewport.zoom / 1.25) });
        this.requestRender();
        return true;
      case 'view.fit':
        this.doc.setViewport({ zoom: 1, panX: 40, panY: 40 });
        this.requestRender();
        return true;
      case 'view.actual':
        this.doc.setViewport({ zoom: 1 });
        this.requestRender();
        return true;
      case 'view.toggle-grid':
        this.doc.updateSnap({ showGrid: !this.doc.snap.showGrid });
        this.requestRender();
        return true;
      case 'view.toggle-guides':
        this.doc.updateSnap({ showGuides: !this.doc.snap.showGuides });
        this.requestRender();
        return true;
      case 'view.toggle-rulers':
        this.doc.updateSnap({ showRulers: !this.doc.snap.showRulers });
        this.requestRender();
        return true;
      case 'file.export':
        this.openExport?.();
        return true;
      case 'file.open':
        this.openFilePicker?.();
        return true;
      default:
        return false;
    }
  }

  /** Temporary space-to-pan. */
  setSpacePan(down: boolean): void {
    if (down && !this.spacePan) {
      this.prevTool = this.activeToolId;
      this.setActiveTool('pan');
      this.spacePan = true;
    } else if (!down && this.spacePan) {
      this.spacePan = false;
      if (this.prevTool) this.setActiveTool(this.prevTool);
      this.prevTool = null;
    }
  }
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = url;
  });
}
