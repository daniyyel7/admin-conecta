import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Auth } from '../../../../core/auth/auth';
import { EventosInicio } from '../../components/eventos-inicio/eventos-inicio';

@Component({
  selector: 'app-home',
  imports: [EventosInicio],
  templateUrl: './home.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  styles: `
    .hero {
      background:
        radial-gradient(ellipse 45% 120% at 62% 70%, rgb(243 156 31 / 0.09), transparent 70%),
        radial-gradient(ellipse 40% 140% at 100% 50%, rgb(243 156 31 / 0.06), transparent 70%),
        var(--c-hero);
      box-shadow: 0 10px 30px -12px color-mix(in srgb, var(--c-shade) 60%, transparent);
    }
  `,
})
export class Home {
  private readonly auth = inject(Auth);

  protected readonly userName = computed(() => this.auth.user()?.name ?? '');
  protected readonly today = formatToday(new Date());
}

/** "Sábado, 28 de Febrero 2026" */
function formatToday(date: Date): string {
  const parts = new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return `${cap(get('weekday'))}, ${get('day')} de ${cap(get('month'))} ${get('year')}`;
}
