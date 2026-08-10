import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import type { AnyLayer, BlendMode, ShapeKind } from '../../engine/layers/types';
import type { FilterDescriptor, FilterType } from '../../engine/filters/types';
import { BASIC_FILTER_TYPES, EXTENDED_FILTER_TYPES } from '../../engine/filters/types';

@Component({
  selector: 'ngx-nie-properties-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DecimalPipe],
  template: `
    <div class="ngx-nie__panel">
      <div class="ngx-nie__panel-header">Properties</div>
      <div class="ngx-nie__panel-body">
        <div class="ngx-nie__field">
          <label>Brush color</label>
          <input
            type="color"
            [value]="brushColor()"
            (input)="brushColorChange.emit($any($event.target).value)"
          />
        </div>
        <div class="ngx-nie__field">
          <label>Brush size ({{ brushSize() }})</label>
          <input
            type="range"
            min="1"
            max="80"
            [value]="brushSize()"
            (input)="brushSizeChange.emit(+$any($event.target).value)"
          />
        </div>
        <div class="ngx-nie__field">
          <label>Shape</label>
          <select
            [value]="shapeKind()"
            (change)="shapeKindChange.emit($any($event.target).value)"
          >
            <option value="rect">Rectangle</option>
            <option value="ellipse">Ellipse</option>
            <option value="line">Line</option>
            <option value="arrow">Arrow</option>
            <option value="polygon">Polygon</option>
            <option value="star">Star</option>
          </select>
        </div>
        <div class="ngx-nie__field">
          <label>Fill</label>
          <input
            type="color"
            [value]="fillColor()"
            (input)="fillColorChange.emit($any($event.target).value)"
          />
        </div>

        @if (layer(); as l) {
          <hr style="border:none;border-top:1px solid var(--nie-border);margin:12px 0" />
          <div class="ngx-nie__field">
            <label>Opacity ({{ (l.opacity * 100) | number: '1.0-0' }}%)</label>
            <input
              type="range"
              min="0"
              max="100"
              [value]="l.opacity * 100"
              (input)="opacityChange.emit(+$any($event.target).value / 100)"
            />
          </div>
          @if (blendModesEnabled()) {
            <div class="ngx-nie__field">
              <label>Blend mode <span class="ngx-nie__badge ngx-nie__badge--premium">Pro</span></label>
              <select
                [value]="l.blendMode"
                (change)="blendModeChange.emit($any($event.target).value)"
              >
                @for (mode of blendModes; track mode) {
                  <option [value]="mode">{{ mode }}</option>
                }
              </select>
            </div>
          }
          <div class="ngx-nie__field">
            <label>Filters</label>
            <select (change)="onAddFilter($any($event.target).value); $any($event.target).value = ''">
              <option value="">Add filter…</option>
              @for (t of basicFilters; track t) {
                <option [value]="t">{{ t }}</option>
              }
              @if (extendedFiltersEnabled()) {
                @for (t of extendedFilters; track t) {
                  <option [value]="t">{{ t }} (pro)</option>
                }
              }
            </select>
          </div>
          @for (f of l.filters; track f.id) {
            <div class="ngx-nie__field">
              <label>{{ f.type }} ({{ f.amount }})</label>
              <input
                type="range"
                min="-100"
                max="100"
                [value]="f.amount"
                (input)="onFilterAmount(f.id, +$any($event.target).value)"
              />
            </div>
          }
        } @else {
          <p style="color:var(--nie-muted);font-size:12px">Select a layer to edit properties.</p>
        }
      </div>
    </div>
  `,
})
export class NiePropertiesPanelComponent {
  readonly layer = input<AnyLayer | null>(null);
  readonly brushColor = input('#5b8def');
  readonly brushSize = input(12);
  readonly shapeKind = input<ShapeKind>('rect');
  readonly fillColor = input('#5b8def');
  readonly blendModesEnabled = input(false);
  readonly extendedFiltersEnabled = input(false);

  readonly brushColorChange = output<string>();
  readonly brushSizeChange = output<number>();
  readonly shapeKindChange = output<ShapeKind>();
  readonly fillColorChange = output<string>();
  readonly opacityChange = output<number>();
  readonly blendModeChange = output<BlendMode>();
  readonly filtersChange = output<FilterDescriptor[]>();

  readonly blendModes: BlendMode[] = [
    'source-over',
    'multiply',
    'screen',
    'overlay',
    'darken',
    'lighten',
    'soft-light',
    'hard-light',
    'difference',
  ];
  readonly basicFilters = BASIC_FILTER_TYPES;
  readonly extendedFilters = EXTENDED_FILTER_TYPES;

  onAddFilter(type: string): void {
    if (!type || !this.layer()) return;
    const next: FilterDescriptor[] = [
      ...this.layer()!.filters,
      {
        id: `flt_${Date.now()}`,
        type: type as FilterType,
        amount: type === 'blur' || type === 'sharpen' ? 20 : 0,
        enabled: true,
      },
    ];
    this.filtersChange.emit(next);
  }

  onFilterAmount(id: string, amount: number): void {
    if (!this.layer()) return;
    this.filtersChange.emit(
      this.layer()!.filters.map((f) => (f.id === id ? { ...f, amount } : f)),
    );
  }
}
