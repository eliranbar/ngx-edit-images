import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  signal,
} from '@angular/core';
import type { NieToolId } from '../../config/tokens';
import { NIE_FEATURES, type NieFeatureId } from '../../config/features';
import { isMacPlatform, resolveModifierHints } from '../../engine/platform';

export interface ToolbarItem {
  id: NieToolId;
  label: string;
  /**
   * Short description shown in the tooltip. May contain the `{altClick}` /
   * `{altDrag}` placeholders, which are rendered with platform-specific wording.
   */
  description: string;
  icon: string;
  shortcut: string;
  feature?: NieFeatureId;
  premium?: boolean;
}

@Component({
  selector: 'ngx-nie-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'ngx-nie__toolbar-host',
  },
  template: `
    <div
      class="ngx-nie__toolbar"
      role="toolbar"
      aria-label="Tools"
      (scroll)="hideTip()"
    >
      @for (item of items(); track item.id) {
        <button
          type="button"
          class="ngx-nie__btn ngx-nie__btn--icon ngx-nie__tool"
          [class.active]="item.id === activeTool()"
          [class.premium-locked]="item.premium && !isEnabled(item)"
          [attr.aria-label]="item.label"
          [attr.aria-description]="describe(item)"
          [attr.aria-pressed]="item.id === activeTool()"
          (mouseenter)="showTip($event, item)"
          (mouseleave)="hideTip()"
          (focus)="showTip($event, item)"
          (blur)="hideTip()"
          (click)="onSelect(item)"
        >
          <span aria-hidden="true">{{ item.icon }}</span>
        </button>
      }
    </div>

    @if (tip(); as t) {
      <div
        class="ngx-nie__tooltip"
        role="tooltip"
        [style.top.px]="t.top"
        [style.left.px]="t.left"
      >
        <strong>{{ t.title }}</strong>
        <span>{{ t.body }}</span>
      </div>
    }
  `,
})
export class NieToolbarComponent {
  readonly items = input.required<ToolbarItem[]>();
  readonly activeTool = input.required<NieToolId>();
  readonly enabledFeatures = input.required<ReadonlySet<NieFeatureId>>();
  readonly toolSelect = output<NieToolId>();
  readonly gatedAttempt = output<NieFeatureId>();

  readonly tip = signal<{
    top: number;
    left: number;
    title: string;
    body: string;
  } | null>(null);

  private readonly isMac = isMacPlatform();

  isEnabled(item: ToolbarItem): boolean {
    if (!item.feature) return true;
    return this.enabledFeatures().has(item.feature);
  }

  describe(item: ToolbarItem): string {
    return resolveModifierHints(item.description, this.isMac);
  }

  tipTitle(item: ToolbarItem): string {
    const premium = item.premium && !this.isEnabled(item) ? ' · Premium' : '';
    const shortcut = item.shortcut ? ` (${item.shortcut})` : '';
    return `${item.label}${shortcut}${premium}`;
  }

  showTip(event: Event, item: ToolbarItem): void {
    const el = event.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    this.tip.set({
      top: rect.top + rect.height / 2,
      left: rect.right + 10,
      title: this.tipTitle(item),
      body: this.describe(item),
    });
  }

  hideTip(): void {
    this.tip.set(null);
  }

  onSelect(item: ToolbarItem): void {
    this.hideTip();
    if (item.feature && !this.isEnabled(item)) {
      this.gatedAttempt.emit(item.feature);
      return;
    }
    this.toolSelect.emit(item.id);
  }
}

export const DEFAULT_TOOLBAR_ITEMS: ToolbarItem[] = [
  {
    id: 'move',
    label: 'Move',
    description: 'Select and drag layers on the canvas.',
    icon: '✥',
    shortcut: 'V',
    feature: NIE_FEATURES.move,
  },
  {
    id: 'transform',
    label: 'Transform',
    description: 'Resize, move, or rotate the active layer.',
    icon: '⤢',
    shortcut: '⌘T',
    feature: NIE_FEATURES.transform,
  },
  {
    id: 'crop',
    label: 'Crop',
    description: 'Drag a rectangle to crop the artboard.',
    icon: '⛶',
    shortcut: 'C',
    feature: NIE_FEATURES.crop,
  },
  {
    id: 'pan',
    label: 'Pan',
    description: 'Drag to move the viewport. Hold Space to pan temporarily.',
    icon: '✋',
    shortcut: 'H',
    feature: NIE_FEATURES.zoomPan,
  },
  {
    id: 'zoom',
    label: 'Zoom',
    description: 'Click to zoom in. {altClick} to zoom out.',
    icon: '🔍',
    shortcut: 'Z',
    feature: NIE_FEATURES.zoomPan,
  },
  {
    id: 'text',
    label: 'Text',
    description: 'Click to add text, or click existing text to edit.',
    icon: 'T',
    shortcut: 'T',
    feature: NIE_FEATURES.text,
  },
  {
    id: 'shape',
    label: 'Shape',
    description: 'Drag to draw a shape. Pick type and fill in Properties.',
    icon: '▭',
    shortcut: 'U',
    feature: NIE_FEATURES.shapes,
  },
  {
    id: 'brush',
    label: 'Brush',
    description: 'Freehand paint on a drawing layer.',
    icon: '✎',
    shortcut: 'B',
    feature: NIE_FEATURES.brush,
    premium: true,
  },
  {
    id: 'eraser',
    label: 'Eraser',
    description: 'Erase on the active image. {altClick} for magic erase.',
    icon: '⌫',
    shortcut: 'E',
    feature: NIE_FEATURES.eraser,
    premium: true,
  },
  {
    id: 'select-rect',
    label: 'Rect select',
    description: 'Drag a rectangular pixel selection.',
    icon: '▢',
    shortcut: 'M',
  },
  {
    id: 'select-ellipse',
    label: 'Ellipse select',
    description: 'Drag an elliptical pixel selection.',
    icon: '◯',
    shortcut: '⇧M',
  },
  {
    id: 'lasso',
    label: 'Lasso',
    description: 'Drag a freehand selection path.',
    icon: '〰️',
    shortcut: 'L',
    feature: NIE_FEATURES.advancedSelection,
    premium: true,
  },
  {
    id: 'magic-wand',
    label: 'Magic wand',
    description: 'Click to select similar colors. Hold Shift for wider tolerance.',
    icon: '✨',
    shortcut: 'W',
    feature: NIE_FEATURES.advancedSelection,
    premium: true,
  },
  {
    id: 'clone',
    label: 'Clone',
    description: '{altClick} to set source, then paint to clone pixels.',
    icon: '◎',
    shortcut: 'S',
    feature: NIE_FEATURES.cloneStamp,
    premium: true,
  },
  {
    id: 'healing',
    label: 'Healing',
    description: '{altClick} to set source, then paint to blend/heal.',
    icon: '🩹',
    shortcut: 'J',
    feature: NIE_FEATURES.healing,
    premium: true,
  },
  {
    id: 'eyedropper',
    label: 'Eyedropper',
    description: 'Sample a color into brush and fill.',
    icon: '💉',
    shortcut: 'I',
  },
  {
    id: 'fill',
    label: 'Fill',
    description: 'Click a shape to fill it with the current fill color.',
    icon: '🪣',
    shortcut: 'G',
  },
];
