import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { PASSWORD_RULES } from '../../core/auth/password-rules';

/** Lista de requisitos de la contraseña que se van marcando al escribir. */
@Component({
  selector: 'app-password-checklist',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ul class="mt-2 grid gap-1" aria-label="Requisitos de la contraseña">
      @for (r of estado(); track r.id) {
        <li class="flex items-center gap-1.5 text-[11px]" [class]="r.ok ? 'text-success' : 'text-subtle'">
          <svg class="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            @if (r.ok) {
              <path d="m5 12 5 5 9-10" />
            } @else {
              <circle cx="12" cy="12" r="8" />
            }
          </svg>
          {{ r.label }}
          <span class="sr-only">{{ r.ok ? '(cumple)' : '(pendiente)' }}</span>
        </li>
      }
    </ul>
  `,
})
export class PasswordChecklist {
  readonly value = input('');

  protected readonly estado = computed(() =>
    PASSWORD_RULES.map((r) => ({ id: r.id, label: r.label, ok: r.test(this.value()) })),
  );
}
