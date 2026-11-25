import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import { ConfirmDialog } from '../../../../shared/confirm-dialog/confirm-dialog';
import { formatFecha, normalizar } from '../../../../shared/format';
import { AvisoFormDialog } from '../../components/aviso-form-dialog/aviso-form-dialog';
import { Aviso, etiquetaIcono } from '../../models/aviso';
import { AvisosStore } from '../../services/avisos-store';

type Filtro = 'todos' | 'visibles' | 'ocultos' | 'importantes';

/** Avisos generales: lo que la app muestra en `/avisos/generales`. */
@Component({
  selector: 'app-avisos-list',
  imports: [ConfirmDialog, AvisoFormDialog],
  templateUrl: './avisos-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class AvisosList {
  protected readonly store = inject(AvisosStore);

  protected readonly search = signal('');
  protected readonly filtro = signal<Filtro>('todos');
  protected readonly filtros: { id: Filtro; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'visibles', label: 'Visibles' },
    { id: 'ocultos', label: 'Ocultos' },
    { id: 'importantes', label: 'Importantes' },
  ];

  protected readonly formOpen = signal(false);
  protected readonly editing = signal<Aviso | null>(null);
  protected readonly toDelete = signal<Aviso | null>(null);
  protected readonly deleting = signal(false);
  protected readonly togglingId = signal<string | null>(null);
  protected readonly toast = signal<string | null>(null);
  private toastTimer?: ReturnType<typeof setTimeout>;

  protected readonly formatFecha = formatFecha;
  protected readonly etiquetaIcono = etiquetaIcono;
  protected readonly skeletons = [0, 1, 2];

  protected readonly filtered = computed(() => {
    const q = normalizar(this.search());
    const f = this.filtro();
    return this.store.avisos().filter((a) => {
      if (f === 'visibles' && !a.visible) return false;
      if (f === 'ocultos' && a.visible) return false;
      if (f === 'importantes' && !a.importante) return false;
      if (!q) return true;
      const texto = normalizar([a.titulo, a.mensaje, formatFecha(a.fecha)].join(' '));
      return q.split(/\s+/).every((p) => texto.includes(p));
    });
  });

  protected readonly hasFilters = computed(
    () => !!this.search().trim() || this.filtro() !== 'todos',
  );

  constructor() {
    this.store.load();
  }

  protected clearFilters(): void {
    this.search.set('');
    this.filtro.set('todos');
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(a: Aviso): void {
    this.editing.set(a);
    this.formOpen.set(true);
  }

  protected onSaved(a: Aviso): void {
    const nuevo = !this.editing();
    this.formOpen.set(false);
    this.editing.set(null);
    this.showToast(
      nuevo ? `Se publicó "${a.titulo}".` : `Se guardaron los cambios de "${a.titulo}".`,
    );
  }

  protected toggleVisible(a: Aviso): void {
    this.togglingId.set(a.id);
    this.store
      .setVisible(a.id, !a.visible)
      .pipe(finalize(() => this.togglingId.set(null)))
      .subscribe({
        next: (u) =>
          this.showToast(
            u.visible
              ? `"${u.titulo}" ahora es visible en la app.`
              : `"${u.titulo}" se ocultó de la app.`,
          ),
        error: (e: unknown) =>
          this.showToast(e instanceof Error ? e.message : 'No se pudo completar la acción.'),
      });
  }

  protected confirmDelete(): void {
    const a = this.toDelete();
    if (!a) return;
    this.deleting.set(true);
    this.store
      .remove(a.id)
      .pipe(finalize(() => this.deleting.set(false)))
      .subscribe({
        next: () => {
          this.toDelete.set(null);
          this.showToast(`Se eliminó el aviso "${a.titulo}".`);
        },
        error: (e: unknown) => {
          this.toDelete.set(null);
          this.showToast(e instanceof Error ? e.message : 'No se pudo eliminar.');
        },
      });
  }

  private showToast(message: string): void {
    clearTimeout(this.toastTimer);
    this.toast.set(message);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }
}
