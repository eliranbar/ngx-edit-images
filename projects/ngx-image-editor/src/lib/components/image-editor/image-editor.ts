import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NIE_CONFIG, type NieTheme, type NieToolId, DEFAULT_TOOLS } from '../../config/tokens';
import { NIE_FEATURES, type NieFeatureId } from '../../config/features';
import { FeatureGateService } from '../../license/feature-gate.service';
import { ImageEditorEngine } from '../../engine/engine';
import type { ExportFormat, ExportResult } from '../../engine/export';
import type { AnyLayer, BlendMode, ShapeKind, TextLayer } from '../../engine/layers/types';
import type { FilterDescriptor } from '../../engine/filters/types';
import {
  SetOpacityCommand,
  SetBlendModeCommand,
  SetFiltersCommand,
  RemoveLayerCommand,
  DuplicateLayerCommand,
  UpdateLayerPropsCommand,
} from '../../engine/commands';
import {
  NieToolbarComponent,
  DEFAULT_TOOLBAR_ITEMS,
  type ToolbarItem,
} from '../toolbar/toolbar';
import { NieLayersPanelComponent } from '../layers-panel/layers-panel';
import { NiePropertiesPanelComponent } from '../properties-panel/properties-panel';

@Component({
  selector: 'ngx-image-editor',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NieToolbarComponent, NieLayersPanelComponent, NiePropertiesPanelComponent, DecimalPipe],
  host: {
    class: 'ngx-nie',
    '[class.ngx-nie--dark]': 'resolvedTheme() === "dark"',
    '[class.ngx-nie--light]': 'resolvedTheme() === "light"',
    tabindex: '0',
    '(keydown)': 'onKeyDown($event)',
    '(keyup)': 'onKeyUp($event)',
  },
  template: `
    <div class="ngx-nie__menubar">
      <span class="ngx-nie__menubar-title">ngx-image-editor</span>
      <button type="button" class="ngx-nie__btn" (click)="fileInput.click()">
        Upload
      </button>
      <button
        type="button"
        class="ngx-nie__btn"
        [disabled]="!canUndo()"
        (click)="undo()"
        [title]="'Undo (' + shortcutLabel('edit.undo') + ')'"
      >
        Undo
      </button>
      <button
        type="button"
        class="ngx-nie__btn"
        [disabled]="!canRedo()"
        (click)="redo()"
        [title]="'Redo (' + shortcutLabel('edit.redo') + ')'"
      >
        Redo
      </button>
      <button
        type="button"
        class="ngx-nie__btn"
        [disabled]="!activeLayer()"
        (click)="duplicateLayer()"
        [title]="'Duplicate (' + shortcutLabel('edit.duplicate') + ')'"
      >
        Duplicate
      </button>
      <button
        type="button"
        class="ngx-nie__btn"
        [disabled]="!activeLayer()"
        (click)="deleteLayer()"
        [title]="'Delete (' + shortcutLabel('edit.delete') + ')'"
      >
        Delete
      </button>
      <span style="flex:1"></span>
      <button type="button" class="ngx-nie__btn ngx-nie__btn--primary" (click)="showExport.set(true)">
        Export
      </button>
      <input
        #fileInput
        class="ngx-nie__file-input"
        type="file"
        accept="image/*"
        multiple
        (change)="onFilesSelected($event)"
      />
    </div>

    <div class="ngx-nie__chrome">
      <ngx-nie-toolbar
        [items]="toolbarItems()"
        [activeTool]="activeTool()"
        [enabledFeatures]="enabledFeatures()"
        (toolSelect)="selectTool($event)"
        (gatedAttempt)="onGated($event)"
      />

      <div
        class="ngx-nie__stage"
        (dragover)="onDragOver($event)"
        (dragleave)="dragging.set(false)"
        (drop)="onDrop($event)"
      >
        <canvas
          #canvas
          class="ngx-nie__canvas"
          [style.cursor]="cursor()"
          (pointerdown)="onPointerDown($event)"
          (pointermove)="onPointerMove($event)"
          (pointerup)="onPointerUp($event)"
          (pointercancel)="onPointerUp($event)"
          (dblclick)="onDblClick($event)"
          (wheel)="onWheel($event)"
        ></canvas>

        @if (editingText(); as textLayer) {
          <textarea
            class="ngx-nie-text-editor"
            [style.left.px]="textEditorStyle().left"
            [style.top.px]="textEditorStyle().top"
            [style.width.px]="textEditorStyle().width"
            [style.height.px]="textEditorStyle().height"
            [style.fontSize.px]="textLayer.fontSize * zoom()"
            [style.color]="textLayer.color"
            [value]="textLayer.text"
            autofocus
            (focus)="$any($event.target).select()"
            (input)="onTextInput($event)"
            (blur)="commitTextEdit()"
            (keydown.escape)="commitTextEdit()"
            (pointerdown)="$event.stopPropagation()"
          ></textarea>
        }

        <div class="ngx-nie__drop" [class.visible]="dragging()">Drop images to add layers</div>

        @if (layerCount() === 0 && !dragging()) {
          <div class="ngx-nie__empty">
            <strong>Drop an image or click Upload</strong>
            <span>Move · Resize · Crop · Text · Shapes · Filters · Export</span>
          </div>
        }
      </div>

      <div class="ngx-nie__side">
        <ngx-nie-layers-panel
          [layers]="layers()"
          [activeLayerId]="activeLayerId()"
          (select)="selectLayer($event)"
          (toggleVisible)="toggleVisible($event)"
          (remove)="removeLayer($event)"
        />
        <ngx-nie-properties-panel
          [layer]="activeLayer()"
          [brushColor]="brushColor()"
          [brushSize]="brushSize()"
          [shapeKind]="shapeKind()"
          [fillColor]="fillColor()"
          [blendModesEnabled]="isFeatureEnabled(NIE_FEATURES.blendModes)"
          [extendedFiltersEnabled]="isFeatureEnabled(NIE_FEATURES.extendedFilters)"
          (brushColorChange)="brushColor.set($event); engine.brush.color = $event"
          (brushSizeChange)="brushSize.set($event); engine.brush.size = $event"
          (shapeKindChange)="shapeKind.set($event); engine.shapeKind = $event"
          (fillColorChange)="fillColor.set($event); engine.fillColor = $event"
          (opacityChange)="onOpacity($event)"
          (blendModeChange)="onBlendMode($event)"
          (filtersChange)="onFilters($event)"
        />
      </div>
    </div>

    <div class="ngx-nie__statusbar">
      <span>{{ docWidth() }} × {{ docHeight() }}</span>
      <span>{{ (zoom() * 100) | number: '1.0-0' }}%</span>
      <span>Tool: {{ activeTool() }}</span>
      <span style="margin-left:auto">{{ layerCount() }} layers</span>
    </div>

    @if (showExport()) {
      <div class="ngx-nie__export-dialog" (click)="showExport.set(false)">
        <div class="ngx-nie__export-card" (click)="$event.stopPropagation()">
          <h3>Export</h3>
          <div class="ngx-nie__field">
            <label>Format</label>
            <select [value]="exportFormat()" (change)="exportFormat.set($any($event.target).value)">
              <option value="png">PNG</option>
              <option value="jpeg">JPEG</option>
              <option value="webp">WebP</option>
              @if (isFeatureEnabled(NIE_FEATURES.exportSvg)) {
                <option value="svg">SVG (Premium)</option>
              }
            </select>
          </div>
          <div class="ngx-nie__field">
            <label>Quality ({{ exportQuality() }})</label>
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.05"
              [value]="exportQuality()"
              (input)="exportQuality.set(+$any($event.target).value)"
            />
          </div>
          <div class="ngx-nie__export-actions">
            <button type="button" class="ngx-nie__btn" (click)="showExport.set(false)">Cancel</button>
            <button type="button" class="ngx-nie__btn ngx-nie__btn--primary" (click)="doExport()">
              Download
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ImageEditorComponent implements AfterViewInit, OnDestroy {
  readonly theme = input<NieTheme | undefined>(undefined);
  readonly width = input<number | undefined>(undefined);
  readonly height = input<number | undefined>(undefined);

  readonly exported = output<ExportResult>();
  readonly documentChange = output<void>();
  readonly ready = output<ImageEditorEngine>();

  @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput', { static: true }) fileInputRef!: ElementRef<HTMLInputElement>;

  private readonly config = inject(NIE_CONFIG);
  readonly features = inject(FeatureGateService, { optional: true });

  readonly NIE_FEATURES = NIE_FEATURES;

  engine!: ImageEditorEngine;

  readonly revision = signal(0);
  readonly activeTool = signal<NieToolId>('move');
  readonly dragging = signal(false);
  readonly showExport = signal(false);
  readonly exportFormat = signal<ExportFormat>('png');
  readonly exportQuality = signal(0.92);
  readonly brushColor = signal('#5b8def');
  readonly brushSize = signal(12);
  readonly shapeKind = signal<ShapeKind>('rect');
  readonly fillColor = signal('#5b8def');
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  readonly enabledFeatures = signal<ReadonlySet<NieFeatureId>>(new Set());

  readonly resolvedTheme = computed(
    () => this.theme() ?? this.config.theme ?? 'dark',
  );

  readonly layers = computed(() => {
    this.revision();
    return this.engine?.doc.getLayers() ?? [];
  });
  readonly activeLayerId = computed(() => {
    this.revision();
    return this.engine?.doc.activeLayerId ?? null;
  });
  readonly activeLayer = computed(() => {
    this.revision();
    return this.engine?.doc.getActiveLayer() ?? null;
  });
  readonly layerCount = computed(() => this.layers().length);
  readonly zoom = computed(() => {
    this.revision();
    return this.engine?.doc.viewport.zoom ?? 1;
  });
  readonly docWidth = computed(() => {
    this.revision();
    return this.engine?.doc.width ?? 0;
  });
  readonly docHeight = computed(() => {
    this.revision();
    return this.engine?.doc.height ?? 0;
  });
  readonly cursor = computed(() => this.engine?.getActiveTool().cursor ?? 'default');

  readonly editingText = computed((): TextLayer | null => {
    this.revision();
    const layer = this.engine?.doc.getActiveLayer();
    if (layer?.type === 'text' && layer.editing) return layer;
    return null;
  });

  readonly textEditorStyle = computed(() => {
    this.revision();
    const layer = this.editingText();
    const vp = this.engine?.doc.viewport ?? { zoom: 1, panX: 0, panY: 0 };
    if (!layer) return { left: 0, top: 0, width: 0, height: 0 };
    return {
      left: layer.transform.x * vp.zoom + vp.panX,
      top: layer.transform.y * vp.zoom + vp.panY,
      width: Math.max(80, layer.transform.width * vp.zoom),
      height: Math.max(40, layer.transform.height * vp.zoom),
    };
  });

  readonly toolbarItems = computed((): ToolbarItem[] => {
    const allowed = new Set(this.config.tools ?? DEFAULT_TOOLS);
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
    return DEFAULT_TOOLBAR_ITEMS.filter((i) => allowed.has(i.id)).map((item) => {
      const action = toolToShortcut(item.id);
      const label = action && this.engine
        ? this.engine.shortcuts.label(action, isMac)
        : item.shortcut;
      return { ...item, shortcut: label };
    });
  });

  private unsubDoc?: () => void;
  private unsubHist?: () => void;
  private unsubRender?: () => void;
  private resizeObserver?: ResizeObserver;
  private pointerActive = false;

  constructor() {
    effect(() => {
      const theme = this.resolvedTheme();
      if (!this.engine) return;
      this.applyThemeToDocument(theme);
    });
  }

  async ngAfterViewInit(): Promise<void> {
    if (this.features) {
      await this.features.init();
      this.enabledFeatures.set(this.features.features());
    } else {
      // No provider — free tier only via empty gate
      this.enabledFeatures.set(new Set(Object.values(NIE_FEATURES).filter((f) =>
        [
          'canvas','imageLayers','upload','move','transform','crop','zoomPan','undoRedo',
          'text','shapes','layersPanel','opacity','basicFilters','guides','grid','alignment','exportRaster',
        ].includes(f),
      )) as Set<NieFeatureId>);
    }

    const initialTheme = this.resolvedTheme();
    this.engine = new ImageEditorEngine({
      width: this.width() ?? this.config.canvasWidth ?? 1200,
      height: this.height() ?? this.config.canvasHeight ?? 800,
      background: this.documentBackgroundForTheme(initialTheme),
      shortcuts: this.config.shortcuts,
      isFeatureEnabled: (f) => this.features?.isEnabled(f as NieFeatureId) ?? this.enabledFeatures().has(f as NieFeatureId),
    });

    this.engine.openFilePicker = () => this.fileInputRef.nativeElement.click();
    this.engine.openExport = () => this.showExport.set(true);

    this.unsubDoc = this.engine.doc.subscribe(() => {
      this.revision.update((v) => v + 1);
      this.documentChange.emit();
      this.paint();
    });
    this.unsubHist = this.engine.history.subscribe(() => {
      this.canUndo.set(this.engine.history.canUndo());
      this.canRedo.set(this.engine.history.canRedo());
    });
    this.unsubRender = this.engine.onRender(() => this.paint());

    const canvas = this.canvasRef.nativeElement;
    this.resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => this.resizeCanvas())
      : undefined;
    this.resizeObserver?.observe(canvas.parentElement!);
    // Fallback initial size for environments without ResizeObserver (unit tests)
    if (!this.resizeObserver) {
      canvas.width = 800;
      canvas.height = 600;
    } else {
      this.resizeCanvas();
    }
    this.engine.doc.setViewport({ zoom: 0.6, panX: 40, panY: 40 });
    this.ready.emit(this.engine);
    this.paint();
  }

  ngOnDestroy(): void {
    this.unsubDoc?.();
    this.unsubHist?.();
    this.unsubRender?.();
    this.resizeObserver?.disconnect();
  }

  /** Public API for host apps. */
  getEngine(): ImageEditorEngine {
    return this.engine;
  }

  shortcutLabel(action: Parameters<ImageEditorEngine['shortcuts']['label']>[0]): string {
    if (!this.engine) return '';
    const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
    return this.engine.shortcuts.label(action, isMac);
  }

  selectTool(id: NieToolId): void {
    this.engine.setActiveTool(id);
    this.activeTool.set(id);
  }

  onGated(feature: NieFeatureId): void {
    this.features?.require(feature, true);
  }

  selectLayer(id: string): void {
    this.engine.doc.setActiveLayer(id);
  }

  toggleVisible(id: string): void {
    const layer = this.engine.doc.getLayer(id);
    if (!layer) return;
    this.engine.history.execute(
      new UpdateLayerPropsCommand(this.engine.doc, id, { visible: !layer.visible }),
    );
  }

  undo(): void {
    this.engine.history.undo();
    this.engine.requestRender();
  }

  redo(): void {
    this.engine.history.redo();
    this.engine.requestRender();
  }

  duplicateLayer(): void {
    this.engine.history.execute(new DuplicateLayerCommand(this.engine.doc));
  }

  deleteLayer(): void {
    const id = this.engine.doc.activeLayerId;
    if (id) this.engine.history.execute(new RemoveLayerCommand(this.engine.doc, id));
  }

  removeLayer(id: string): void {
    this.engine.history.execute(new RemoveLayerCommand(this.engine.doc, id));
  }

  onOpacity(v: number): void {
    const id = this.engine.doc.activeLayerId;
    if (id) this.engine.history.execute(new SetOpacityCommand(this.engine.doc, id, v));
  }

  onBlendMode(mode: BlendMode): void {
    if (!this.features?.require(NIE_FEATURES.blendModes)) return;
    const id = this.engine.doc.activeLayerId;
    if (id) this.engine.history.execute(new SetBlendModeCommand(this.engine.doc, id, mode));
  }

  onFilters(filters: FilterDescriptor[]): void {
    const id = this.engine.doc.activeLayerId;
    if (id) this.engine.history.execute(new SetFiltersCommand(this.engine.doc, id, filters));
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await this.engine.loadImageFile(file);
      }
    }
    input.value = '';
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(true);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        await this.engine.loadImageFile(file);
      }
    }
  }

  onPointerDown(event: PointerEvent): void {
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    this.pointerActive = true;
    this.engine.pointerDown(this.toPointer(event));
    this.syncColorsFromEngine();
    this.activeTool.set(this.engine.getActiveToolId());
    this.revision.update((v) => v + 1);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.pointerActive && event.buttons === 0) return;
    this.engine.pointerMove(this.toPointer(event));
  }

  onPointerUp(event: PointerEvent): void {
    this.pointerActive = false;
    this.engine.pointerUp(this.toPointer(event));
    this.syncColorsFromEngine();
    this.revision.update((v) => v + 1);
  }

  onDblClick(event: MouseEvent): void {
    this.engine.doubleClick(this.toPointer(event));
    this.revision.update((v) => v + 1);
  }

  onTextInput(event: Event): void {
    const layer = this.editingText();
    if (!layer) return;
    const value = (event.target as HTMLTextAreaElement).value;
    this.engine.doc.updateLayer(layer.id, { text: value } as never);
  }

  commitTextEdit(): void {
    const layer = this.editingText();
    if (!layer) return;
    this.engine.doc.updateLayer(layer.id, { editing: false } as never);
  }

  private syncColorsFromEngine(): void {
    if (!this.engine) return;
    this.brushColor.set(this.engine.brush.color);
    this.fillColor.set(this.engine.fillColor);
  }

  isFeatureEnabled(feature: NieFeatureId): boolean {
    return this.features?.isEnabled(feature) ?? this.enabledFeatures().has(feature);
  }

  onWheel(event: WheelEvent): void {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const zoom = Math.max(0.1, Math.min(8, this.engine.doc.viewport.zoom * factor));
    this.engine.doc.setViewport({ zoom });
    this.engine.requestRender();
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.code === 'Space' && !event.repeat) {
      event.preventDefault();
      this.engine.setSpacePan(true);
      this.activeTool.set(this.engine.getActiveToolId());
      return;
    }
    const editing = this.engine.doc.getActiveLayer()?.type === 'text'
      && (this.engine.doc.getActiveLayer() as { editing?: boolean }).editing;
    const action = this.engine.shortcuts.match(event);
    if (!action) return;
    // Skip when typing in native inputs outside canvas
    const tag = (event.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (this.engine.handleShortcut(action, !!editing)) {
      event.preventDefault();
      this.activeTool.set(this.engine.getActiveToolId());
      this.revision.update((v) => v + 1);
    }
  }

  onKeyUp(event: KeyboardEvent): void {
    if (event.code === 'Space') {
      this.engine.setSpacePan(false);
      this.activeTool.set(this.engine.getActiveToolId());
    }
  }

  async doExport(): Promise<void> {
    const format = this.exportFormat();
    if (format === 'svg' && !this.features?.require(NIE_FEATURES.exportSvg)) {
      return;
    }
    const result = await this.engine.exportAndDownload({
      format,
      quality: this.exportQuality(),
    });
    this.exported.emit(result);
    this.showExport.set(false);
  }

  private toPointer(event: PointerEvent | MouseEvent) {
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const { x, y } = this.engine.screenToDoc(event.clientX, event.clientY, rect);
    return {
      x,
      y,
      screenX,
      screenY,
      button: 'button' in event ? event.button : 0,
      shiftKey: event.shiftKey,
      altKey: event.altKey,
      metaKey: event.metaKey,
      pressure: 'pressure' in event ? event.pressure || 1 : 1,
    };
  }

  private resizeCanvas(): void {
    const canvas = this.canvasRef.nativeElement;
    const parent = canvas.parentElement!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(parent.clientWidth * dpr));
    canvas.height = Math.max(1, Math.floor(parent.clientHeight * dpr));
    canvas.style.width = `${parent.clientWidth}px`;
    canvas.style.height = `${parent.clientHeight}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.paint();
  }

  private paint(): void {
    if (!this.engine || !this.canvasRef) return;
    try {
      // Transparent stage fill so the themed CSS checkerboard shows through.
      this.engine.render(this.canvasRef.nativeElement, true, { stageColor: null });
    } catch {
      // Canvas may be unavailable in non-browser test environments.
    }
  }

  private documentBackgroundForTheme(theme: NieTheme): string {
    if (this.config.canvasBackground) return this.config.canvasBackground;
    return theme === 'light' ? '#ffffff' : '#1a1f2e';
  }

  private applyThemeToDocument(theme: NieTheme): void {
    this.engine.setDocumentBackground(this.documentBackgroundForTheme(theme));
    this.paint();
  }
}

function toolToShortcut(id: NieToolId): Parameters<ImageEditorEngine['shortcuts']['label']>[0] | null {
  const map: Partial<Record<NieToolId, Parameters<ImageEditorEngine['shortcuts']['label']>[0]>> = {
    move: 'tool.move',
    transform: 'tool.transform',
    crop: 'tool.crop',
    text: 'tool.text',
    shape: 'tool.shape',
    brush: 'tool.brush',
    eraser: 'tool.eraser',
    'select-rect': 'tool.select-rect',
    'select-ellipse': 'tool.select-ellipse',
    lasso: 'tool.lasso',
    'magic-wand': 'tool.magic-wand',
    clone: 'tool.clone',
    healing: 'tool.healing',
    eyedropper: 'tool.eyedropper',
    fill: 'tool.fill',
    pan: 'tool.pan',
    zoom: 'tool.zoom',
  };
  return map[id] ?? null;
}
