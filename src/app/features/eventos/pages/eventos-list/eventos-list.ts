import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  linkedSignal,
  signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { ClickOutside } from '../../../../shared/click-outside';
import { ConfirmDialog } from '../../../../shared/confirm-dialog/confirm-dialog';
import {
  DepartamentoFilter,
  DepartamentoOpcion,
} from '../../components/departamento-filter/departamento-filter';
import { EstadoFilter } from '../../components/estado-filter/estado-filter';
import {
  departamentos,
  ESTADO_LABEL,
  EstadoEvento,
  Evento,
  departamentoDe,
  formatFecha,
  normalizar,
  sePuedeCancelar,
} from '../../models/evento';
import { EventosStore } from '../../services/eventos-store';

const PAGE_SIZE = 5;

@Component({
  selector: 'app-eventos-list',
  imports: [
    RouterLink,
    NgTemplateOutlet,
    ClickOutside,
    ConfirmDialog,
    DepartamentoFilter,
    EstadoFilter,
  ],
  templateUrl: './eventos-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EventosList {
  protected readonly store = inject(EventosStore);

  // Filtros
  protected readonly search = signal('');
  protected readonly deptos = signal<ReadonlySet<string>>(new Set());
  protected readonly estado = signal<EstadoEvento | null>(null);

  // Al cambiar cualquier filtro se vuelve a la página 1.
  protected readonly page = linkedSignal({
    source: () => [this.search(), this.deptos(), this.estado()],
    computation: () => 1,
  });

  // UI — la clave del menú abierto es vista + id ('tabla…' / 'movil…'), porque cada fila existe en ambas vistas.
  protected readonly menuOpenId = signal<string | null>(null);
  protected readonly toDelete = signal<Evento | null>(null);
  protected readonly deleting = signal(false);
  protected readonly toCancel = signal<Evento | null>(null);
  protected readonly cancelling = signal(false);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly estadoLabel = ESTADO_LABEL;
  protected readonly departamentoDe = departamentoDe;
  protected readonly formatFecha = formatFecha;
  protected readonly sePuedeCancelar = sePuedeCancelar;
  protected readonly skeletonRows = Array.from({ length: PAGE_SIZE }, (_, i) => i);

  protected readonly opcionesDepto = computed<DepartamentoOpcion[]>(() => {
    const counts = new Map<string, number>();
    for (const e of this.store.eventos())
      counts.set(e.departamentoId, (counts.get(e.departamentoId) ?? 0) + 1);
    return departamentos().map((depto) => ({ depto, count: counts.get(depto.id) ?? 0 }));
  });

  protected readonly estadoCounts = computed(() => {
    const counts: Partial<Record<EstadoEvento | 'todos', number>> = { todos: this.store.total() };
    for (const e of this.store.eventos()) counts[e.estado] = (counts[e.estado] ?? 0) + 1;
    return counts;
  });

  protected readonly filtered = computed(() => {
    const q = normalizar(this.search());
    const deptos = this.deptos();
    const estado = this.estado();
    return this.store.eventos().filter((e) => {
      if (deptos.size && !deptos.has(e.departamentoId)) return false;
      if (estado && e.estado !== estado) return false;
      if (!q) return true;
      const texto = normalizar(
        [
          e.nombre,
          e.id,
          departamentoDe(e).nombre,
          e.ubicacion,
          formatFecha(e.fechaInicio),
          e.fechaInicio,
          ...e.etiquetas,
        ].join(' '),
      );
      return q.split(/\s+/).every((palabra) => texto.includes(palabra));
    });
  });

  protected readonly hasFilters = computed(
    () => !!this.search().trim() || this.deptos().size > 0 || this.estado() !== null,
  );

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)),
  );
  /** La página actual nunca pasa de la última (p. ej. después de eliminar). */
  protected readonly currentPage = computed(() => Math.min(this.page(), this.totalPages()));
  protected readonly pageItems = computed(() => {
    const start = (this.currentPage() - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });
  protected readonly rangeStart = computed(() =>
    this.filtered().length ? (this.currentPage() - 1) * PAGE_SIZE + 1 : 0,
  );
  protected readonly rangeEnd = computed(() =>
    Math.min(this.currentPage() * PAGE_SIZE, this.filtered().length),
  );
  /** Hasta 5 números de página alrededor de la actual. */
  protected readonly pageNumbers = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const start = Math.max(1, Math.min(current - 2, total - 4));
    return Array.from({ length: Math.min(5, total) }, (_, i) => start + i);
  });

  constructor() {
    this.store.load();
    // Aviso enviado por el formulario al guardar (router state).
    const toast = inject(Router).currentNavigation()?.extras.state?.['toast'];
    if (typeof toast === 'string') this.showToast(toast);
  }

  protected goTo(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
  }

  protected clearFilters(): void {
    this.search.set('');
    this.deptos.set(new Set());
    this.estado.set(null);
  }

  protected toggleMenu(key: string): void {
    this.menuOpenId.update((current) => (current === key ? null : key));
  }

  protected closeMenu(key: string): void {
    if (this.menuOpenId() === key) this.menuOpenId.set(null);
  }

  protected askDelete(evento: Evento): void {
    this.menuOpenId.set(null);
    this.toDelete.set(evento);
  }

  protected confirmDelete(): void {
    const evento = this.toDelete();
    if (!evento) return;
    this.deleting.set(true);
    this.store
      .remove(evento.id)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        error: (e: unknown) => {
          this.toDelete.set(null);
          this.showToast(e instanceof Error ? e.message : 'No se pudo eliminar.');
        },
        next: () => {
          this.toDelete.set(null);
          this.showToast(`Se eliminó "${evento.nombre}".`);
        },
      });
  }

  protected askCancel(evento: Evento): void {
    this.menuOpenId.set(null);
    if (sePuedeCancelar(evento)) this.toCancel.set(evento);
  }

  protected confirmCancel(): void {
    const evento = this.toCancel();
    if (!evento) return;
    this.cancelling.set(true);
    this.store
      .cancel(evento.id)
      .pipe(finalize(() => this.cancelling.set(false)))
      .subscribe({
        error: (e: unknown) => {
          this.toCancel.set(null);
          this.showToast(e instanceof Error ? e.message : 'No se pudo cancelar.');
        },
        next: () => {
          this.toCancel.set(null);
          this.showToast(`Se canceló "${evento.nombre}".`);
        },
      });
  }

  protected initials(nombre: string): string {
    return nombre
      .replace(/["“”]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  private showToast(message: string): void {
    clearTimeout(this.toastTimer);
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }
}
