import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { Guide } from '../../engine/snapping';

@Component({
  selector: 'ngx-nie-ruler-guides',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (showRulers()) {
      <div class="ngx-nie-rulers" aria-hidden="true">
        <div class="ngx-nie-rulers__h"></div>
        <div class="ngx-nie-rulers__v"></div>
      </div>
    }
    @if (showGuides()) {
      @for (g of guides(); track g.id) {
        <div
          class="ngx-nie-guide"
          [class.ngx-nie-guide--h]="g.orientation === 'horizontal'"
          [class.ngx-nie-guide--v]="g.orientation === 'vertical'"
          [style.top.px]="g.orientation === 'horizontal' ? g.position * zoom() + panY() : null"
          [style.left.px]="g.orientation === 'vertical' ? g.position * zoom() + panX() : null"
        ></div>
      }
    }
  `,
  styles: `
    .ngx-nie-rulers__h,
    .ngx-nie-rulers__v {
      position: absolute;
      background: rgba(148, 163, 184, 0.08);
      pointer-events: none;
      z-index: 2;
    }
    .ngx-nie-rulers__h {
      top: 0;
      left: 24px;
      right: 0;
      height: 24px;
    }
    .ngx-nie-rulers__v {
      top: 24px;
      left: 0;
      bottom: 0;
      width: 24px;
    }
    .ngx-nie-guide {
      position: absolute;
      pointer-events: none;
      z-index: 3;
      background: #a855f7;
    }
    .ngx-nie-guide--h {
      left: 0;
      right: 0;
      height: 1px;
    }
    .ngx-nie-guide--v {
      top: 0;
      bottom: 0;
      width: 1px;
    }
  `,
})
export class NieRulerGuidesComponent {
  readonly showRulers = input(true);
  readonly showGuides = input(true);
  readonly guides = input<Guide[]>([]);
  readonly zoom = input(1);
  readonly panX = input(0);
  readonly panY = input(0);
}
