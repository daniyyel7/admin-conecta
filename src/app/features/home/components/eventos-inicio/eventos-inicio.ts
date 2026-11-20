import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { finalize } from 'rxjs';
import { departamentoPorId } from '../../../../core/catalogos/departamentos';
import { formatFecha } from '../../../../shared/format';
import { ESTADO_LABEL, Evento } from '../../../eventos/models/evento';
import { EventosStore } from '../../../eventos/services/eventos-store';
import { InicioStore, MAX_EVENTOS_INICIO } from '../../services/inicio-store';

/** Se envía a la app solo si está en curso o es próximo. */
const seMuestra = (e: Evento) => e.estado === 'en-curso' || e.estado === 'proximo';

/**
 * "Eventos en el inicio de la app": elegir hasta 5 eventos y su orden para `GET /home`.
 * Los cambios se hacen en una copia local y se guardan con el botón Guardar.
 */
@Component({
  selector: 'app-eventos-inicio',
  templateUrl: './eventos-inicio.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
})
export class EventosInicio {
  private readonly inicio = inject(InicioStore);
  private readonly eventos = inject(EventosStore);

  protected readonly max = MAX_EVENTOS_INICIO;
  protected readonly estadoLabel = ESTADO_LABEL;
  protected readonly formatFecha = formatFecha;
  protected readonly departamentoPorId = departamentoPorId;
  protected readonly seMuestra = seMuestra;

  protected readonly loading = this.inicio.loading;
  protected readonly loadError = this.inicio.error;

  /** Copia editable de la selección (orden = posición en la app). */
  protected readonly lista = signal<Evento[]>([]);
  protected readonly saving = signal(false);
  protected readonly mensaje = signal<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  protected readonly cambios = computed(
    () => ids(this.lista()).join(',') !== ids(this.inicio.seleccion()).join(','),
  );
  protected readonly lleno = computed(() => this.lista().length >= MAX_EVENTOS_INICIO);
  /** Eventos que se pueden agregar: en curso o próximos y que aún no están en la lista. */
  protected readonly disponibles = computed(() => {
    const elegidos = new Set(ids(this.lista()));
    return this.eventos
      .eventos()
      .filter((e) => seMuestra(e) && !elegidos.has(e.id))
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  });

  constructor() {
    this.inicio.load();
    this.eventos.load();
    // Cuando llega (o se guarda) la selección de la API, la copia local se pone igual.
    effect(() => {
      const guardada = this.inicio.seleccion();
      untracked(() => this.lista.set([...guardada]));
    });
  }

  protected agregar(select: HTMLSelectElement): void {
    const evento = this.disponibles().find((e) => e.id === select.value);
    select.value = '';
    if (!evento || this.lleno()) return;
    this.lista.update((l) => [...l, evento]);
    this.mensaje.set(null);
  }

  protected mover(index: number, delta: -1 | 1): void {
    const destino = index + delta;
    this.lista.update((l) => {
      if (destino < 0 || destino >= l.length) return l;
      const copia = [...l];
      [copia[index], copia[destino]] = [copia[destino], copia[index]];
      return copia;
    });
    this.mensaje.set(null);
  }

  protected quitar(index: number): void {
    this.lista.update((l) => l.filter((_, i) => i !== index));
    this.mensaje.set(null);
  }

  protected descartar(): void {
    this.lista.set([...this.inicio.seleccion()]);
    this.mensaje.set(null);
  }

  protected guardar(): void {
    // Los que ya terminaron o se cancelaron no se pueden volver a guardar: se quitan.
    const aGuardar = this.lista().filter(seMuestra);
    this.saving.set(true);
    this.mensaje.set(null);
    this.inicio
      .guardar(ids(aGuardar))
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: () => this.mensaje.set({ tipo: 'ok', texto: 'Se guardó el Inicio de la app.' }),
        error: (e: unknown) =>
          this.mensaje.set({
            tipo: 'error',
            texto: e instanceof Error ? e.message : 'No se pudo guardar el Inicio.',
          }),
      });
  }
}

function ids(eventos: Evento[]): string[] {
  return eventos.map((e) => e.id);
}
