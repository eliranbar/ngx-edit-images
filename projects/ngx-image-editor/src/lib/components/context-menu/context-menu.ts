import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

export interface ContextMenuItem {
  id: string;
  label: string;
  shortcut?: string;
  disabled?: boolean;
}

@Component({
  selector: 'ngx-nie-context-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (open()) {
      <div
        class="ngx-nie-context"
        [style.left.px]="x()"
        [style.top.px]="y()"
        role="menu"
      >
        @for (item of items(); track item.id) {
          <button
            type="button"
            role="menuitem"
            [disabled]="item.disabled"
            (click)="select.emit(item.id)"
          >
            <span>{{ item.label }}</span>
            @if (item.shortcut) {
              <kbd>{{ item.shortcut }}</kbd>
            }
          </button>
        }
      </div>
    }
  `,
  styles: `
    .ngx-nie-context {
      position: fixed;
      z-index: 50;
      min-width: 180px;
      padding: 6px;
      border-radius: 10px;
      border: 1px solid var(--nie-border, rgba(148, 163, 184, 0.14));
      background: var(--nie-surface, #0d1220);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    }
    .ngx-nie-context button {
      width: 100%;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      appearance: none;
      border: 0;
      background: transparent;
      color: var(--nie-text, #e8eefc);
      font: inherit;
      font-size: 12px;
      padding: 8px 10px;
      border-radius: 6px;
      cursor: pointer;
    }
    .ngx-nie-context button:hover:not(:disabled) {
      background: rgba(91, 141, 239, 0.16);
    }
    .ngx-nie-context button:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .ngx-nie-context kbd {
      color: var(--nie-muted, #94a3b8);
      font-size: 10px;
    }
  `,
})
export class NieContextMenuComponent {
  readonly open = input(false);
  readonly x = input(0);
  readonly y = input(0);
  readonly items = input<ContextMenuItem[]>([]);
  readonly select = output<string>();
}
