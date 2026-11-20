import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Página provisional para secciones que aún no se construyen. Recibe `title` desde `data` de la ruta. */
@Component({
  selector: 'app-coming-soon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  template: `
    <section
      class="rounded-xl border border-dashed border-line-strong bg-surface/50 px-6 py-16 text-center"
    >
      <h1 class="text-2xl font-bold tracking-tight text-fg">{{ heading() }}</h1>
      <p class="mt-2 text-sm text-muted">Esta sección estará disponible próximamente.</p>
    </section>
  `,
})
export class ComingSoon {
  readonly heading = input('Próximamente');
}
