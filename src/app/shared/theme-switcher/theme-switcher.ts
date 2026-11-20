import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Theme, ThemePreference } from '../../core/theme/theme';

const SUN = [
  'M12 3v1.5M12 19.5V21M4.6 4.6l1.1 1.1M18.3 18.3l1.1 1.1M3 12h1.5M19.5 12H21M4.6 19.4l1.1-1.1M18.3 5.7l1.1-1.1',
  'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
];
const MOON = ['M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z'];
const MONITOR = ['M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z', 'M8 21h8M12 17v4'];

interface Option {
  value: ThemePreference;
  label: string;
  icon: string[];
}

/**
 * Selector de tema.
 * - `segmented` (por defecto): Sistema / Claro / Oscuro.
 * - `icon`: un solo botón que alterna claro ↔ oscuro (para pantallas como el login).
 */
@Component({
  selector: 'app-theme-switcher',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    @if (variant() === 'icon') {
      <button
        type="button"
        (click)="theme.toggle()"
        class="grid size-10 place-items-center rounded-full border border-line bg-surface/80 text-muted shadow-sm shadow-shade/20 backdrop-blur transition hover:text-fg focus-visible:outline-2 focus-visible:outline-accent"
        [attr.aria-label]="theme.resolved() === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'"
      >
        <svg class="size-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          @for (d of theme.resolved() === 'dark' ? sun : moon; track $index) {
            <path [attr.d]="d" />
          }
        </svg>
      </button>
    } @else {
      <div role="radiogroup" aria-label="Tema" class="grid grid-cols-3 gap-1 rounded-lg bg-chip p-1">
        @for (opt of options; track opt.value) {
          <button
            type="button"
            role="radio"
            [attr.aria-checked]="theme.preference() === opt.value"
            (click)="theme.set(opt.value)"
            class="flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-accent"
            [class]="
              theme.preference() === opt.value
                ? 'bg-surface text-fg shadow-sm shadow-shade/30'
                : 'text-muted hover:text-fg'
            "
          >
            <svg class="size-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              @for (d of opt.icon; track $index) {
                <path [attr.d]="d" />
              }
            </svg>
            {{ opt.label }}
          </button>
        }
      </div>
    }
  `,
})
export class ThemeSwitcher {
  protected readonly theme = inject(Theme);
  readonly variant = input<'segmented' | 'icon'>('segmented');

  protected readonly sun = SUN;
  protected readonly moon = MOON;
  protected readonly options: Option[] = [
    { value: 'system', label: 'Sistema', icon: MONITOR },
    { value: 'light', label: 'Claro', icon: SUN },
    { value: 'dark', label: 'Oscuro', icon: MOON },
  ];
}
