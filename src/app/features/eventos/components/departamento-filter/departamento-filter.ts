import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { ClickOutside } from '../../../../shared/click-outside';
import { Departamento, normalizar } from '../../models/evento';

export interface DepartamentoOpcion {
  depto: Departamento;
  count: number;
}

/**
 * Filtro de departamentos con selección múltiple.
 * Los cambios se preparan aparte y solo se aplican con "Aplicar".
 * `selected` vacío significa "todos".
 */
@Component({
  selector: 'app-departamento-filter',
  imports: [ClickOutside],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'relative block' },
  templateUrl: './departamento-filter.html',
})
export class DepartamentoFilter {
  readonly opciones = input.required<DepartamentoOpcion[]>();
  readonly selected = input<ReadonlySet<string>>(new Set());
  readonly selectedChange = output<Set<string>>();

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('search');

  protected readonly open = signal(false);
  protected readonly query = signal('');
  protected readonly draft = signal<Set<string>>(new Set());

  protected readonly total = computed(() => this.opciones().reduce((n, o) => n + o.count, 0));
  protected readonly visibles = computed(() => {
    const q = normalizar(this.query());
    return q ? this.opciones().filter((o) => normalizar(o.depto.nombre).includes(q)) : this.opciones();
  });
  protected readonly allChecked = computed(() => this.draft().size === this.opciones().length);
  protected readonly someChecked = computed(() => this.draft().size > 0 && !this.allChecked());

  /** Texto de la insignia del botón: "Todos (7)" o "3 de 7". */
  protected readonly badge = computed(() => {
    const n = this.selected().size;
    const all = this.opciones().length;
    return n === 0 || n === all ? `Todos (${all})` : `${n} de ${all}`;
  });
  protected readonly isFiltered = computed(() => {
    const n = this.selected().size;
    return n > 0 && n < this.opciones().length;
  });

  protected toggleOpen(): void {
    if (this.open()) {
      this.close();
      return;
    }
    const current = this.selected();
    this.draft.set(new Set(current.size ? current : this.opciones().map((o) => o.depto.id)));
    this.query.set('');
    this.open.set(true);
    setTimeout(() => this.searchInput()?.nativeElement.focus());
  }

  protected close(): void {
    this.open.set(false);
  }

  protected isChecked(id: string): boolean {
    return this.draft().has(id);
  }

  protected toggle(id: string): void {
    this.draft.update((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected toggleAll(): void {
    this.draft.set(this.allChecked() ? new Set() : new Set(this.opciones().map((o) => o.depto.id)));
  }

  /** Quita el filtro (vuelve a "todos") y cierra. */
  protected clear(): void {
    this.selectedChange.emit(new Set());
    this.close();
  }

  protected apply(): void {
    const draft = this.draft();
    this.selectedChange.emit(draft.size === this.opciones().length ? new Set() : new Set(draft));
    this.close();
  }
}
