import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import type { AnyLayer } from '../../engine/layers/types';

@Component({
  selector: 'ngx-nie-layers-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ngx-nie__panel">
      <div class="ngx-nie__panel-header">Layers</div>
      <div class="ngx-nie__panel-body">
        @for (layer of layersReversed(); track layer.id) {
          <div
            class="ngx-nie__layer"
            [class.active]="layer.id === activeLayerId()"
            (click)="select.emit(layer.id)"
          >
            <button
              type="button"
              class="ngx-nie__btn ngx-nie__btn--icon ngx-nie__layer-action"
              [title]="layer.visible ? 'Hide layer' : 'Show layer'"
              (click)="toggleVisible.emit(layer.id); $event.stopPropagation()"
            >
              {{ layer.visible ? '👁' : '–' }}
            </button>
            <div class="ngx-nie__layer-thumb">{{ thumb(layer) }}</div>
            <span class="ngx-nie__layer-name">{{ layer.name }}</span>
            @if (layer.locked) {
              <span title="Locked">🔒</span>
            }
            <button
              type="button"
              class="ngx-nie__btn ngx-nie__btn--icon ngx-nie__layer-action ngx-nie__layer-action--danger"
              title="Delete layer"
              (click)="remove.emit(layer.id); $event.stopPropagation()"
            >
              ×
            </button>
          </div>
        } @empty {
          <p style="color:var(--nie-muted);font-size:12px;padding:8px">No layers yet.</p>
        }
      </div>
    </div>
  `,
})
export class NieLayersPanelComponent {
  readonly layers = input.required<AnyLayer[]>();
  readonly activeLayerId = input<string | null>(null);
  readonly select = output<string>();
  readonly toggleVisible = output<string>();
  readonly duplicate = output<void>();
  readonly remove = output<string>();

  layersReversed(): AnyLayer[] {
    return [...this.layers()].reverse();
  }

  thumb(layer: AnyLayer): string {
    switch (layer.type) {
      case 'image':
        return '🖼';
      case 'text':
        return 'T';
      case 'shape':
        return '◇';
      case 'drawing':
        return '✎';
      case 'group':
        return '📁';
      case 'adjustment':
        return '🎚';
      default:
        return '•';
    }
  }
}
