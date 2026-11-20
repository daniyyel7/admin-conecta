import { ChangeDetectionStrategy, Component, computed, input, model, signal } from '@angular/core';
import { ClickOutside } from '../../../../shared/click-outside';
import { ESTADOS, EstadoEvento } from '../../models/evento';

/** Filtro de estado (selección única). `value` null = todos los estados. */
@Component({
  selector: 'app-estado-filter',
  imports: [ClickOutside],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
  template: `
    <div appClickOutside (clickOutside)="open.set(false)" (keydown.escape)="open.set(false)">
      <button
        type="button"
        class="filter-btn"
        [class.is-active]="value() !== null"
        (click)="open.set(!open())"
        aria-haspopup="listbox"
        [attr.aria-expanded]="open()"
        aria-controls="estado-listbox"
      >
        Estado: <span class="font-medium text-fg">{{ label() }}</span>
        <svg class="size-4 shrink-0 text-muted transition" [class.rotate-180]="open()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      @if (open()) {
        <ul
          id="estado-listbox"
          role="listbox"
          aria-label="Estado del evento"
          class="popover absolute left-0 z-30 mt-2 w-56 py-1.5"
        >
          @for (opt of opciones(); track opt.id) {
            <li
              role="option"
              tabindex="0"
              [attr.aria-selected]="value() === opt.id"
              (click)="select(opt.id)"
              (keydown.enter)="select(opt.id)"
              (keydown.space)="$event.preventDefault(); select(opt.id)"
              class="mx-1.5 flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-xs text-fg-2 outline-none hover:bg-hover focus-visible:bg-hover"
            >
              <span class="flex-1">{{ opt.label }}</span>
              @if (counts()[opt.id ?? 'todos'] !== undefined) {
                <span class="text-[10px] text-muted">{{ counts()[opt.id ?? 'todos'] }}</span>
              }
              <svg class="size-3.5 text-accent-fg" [class.invisible]="value() !== opt.id" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="m5 12 5 5 9-10" />
              </svg>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class EstadoFilter {
  readonly value = model<EstadoEvento | null>(null);
  /** Conteo por estado (clave 'todos' para el total). */
  readonly counts = input<Partial<Record<EstadoEvento | 'todos', number>>>({});

  protected readonly open = signal(false);
  protected readonly opciones = signal<{ id: EstadoEvento | null; label: string }[]>([
    { id: null, label: 'Todos los estados' },
    ...ESTADOS,
  ]);
  protected readonly label = computed(
    () => this.opciones().find((o) => o.id === this.value())?.label ?? 'Todos los estados',
  );

  protected select(id: EstadoEvento | null): void {
    this.value.set(id);
    this.open.set(false);
  }
}
