import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  input,
  output,
  viewChild,
} from '@angular/core';

/**
 * Diálogo modal de confirmación (usa <dialog> nativo: foco atrapado y Escape incluidos).
 * Se abre al crearse; el padre lo muestra con @if y lo quita al recibir `confirmed` o `cancelled`.
 */
@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog
      #dialog
      class="confirm-dialog m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-line-strong bg-surface p-0 text-fg shadow-2xl shadow-shade/60"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-message"
      (cancel)="onCancel($event)"
      (click)="onBackdropClick($event)"
    >
      <div class="p-6">
        <div
          class="grid size-11 place-items-center rounded-full"
          [class]="danger() ? 'bg-danger/10 text-danger' : 'bg-accent/15 text-accent-fg'"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
          </svg>
        </div>
        <h2 id="confirm-title" class="mt-4 text-base font-semibold">{{ title() }}</h2>
        <p id="confirm-message" class="mt-1.5 text-sm leading-relaxed text-muted">{{ message() }}</p>

        <div class="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autofocus
            class="rounded-lg px-4 py-2.5 text-sm font-medium text-fg-2 transition hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent"
            (click)="cancelled.emit()"
          >
            {{ cancelLabel() }}
          </button>
          <button
            type="button"
            class="rounded-lg px-4 py-2.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-wait disabled:opacity-70"
            [class]="
              danger()
                ? 'bg-danger-solid text-white hover:brightness-110 focus-visible:outline-danger'
                : 'bg-accent text-on-accent hover:brightness-105 focus-visible:outline-accent'
            "
            [disabled]="busy()"
            (click)="confirmed.emit()"
          >
            {{ busy() ? 'Procesando…' : confirmLabel() }}
          </button>
        </div>
      </div>
    </dialog>
  `,
  styles: `
    .confirm-dialog::backdrop {
      background: var(--c-scrim);
      backdrop-filter: blur(2px);
    }
  `,
})
export class ConfirmDialog {
  readonly title = input.required<string>();
  readonly message = input('');
  readonly confirmLabel = input('Confirmar');
  readonly cancelLabel = input('Cancelar');
  readonly danger = input(false);
  readonly busy = input(false);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    afterNextRender(() => {
      const el = this.dialog().nativeElement;
      if (typeof el.showModal === 'function') el.showModal();
      else el.setAttribute('open', '');
    });
  }

  protected onCancel(event: Event): void {
    event.preventDefault(); // el padre decide cerrar
    if (!this.busy()) this.cancelled.emit();
  }

  /** Clic en el fondo oscuro (fuera del contenido) = cancelar. */
  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === this.dialog().nativeElement && !this.busy()) this.cancelled.emit();
  }
}
