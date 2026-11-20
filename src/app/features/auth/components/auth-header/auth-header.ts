import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';

/** Logo, insignia y título que comparten las pantallas de autenticación. */
@Component({
  selector: 'app-auth-header',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col items-center text-center' },
  styles: `
    .logo-frame {
      box-shadow: 0 0 18px -2px rgb(243 156 31 / var(--c-glow));
    }
  `,
  template: `
    <div
      class="logo-frame grid size-[72px] place-items-center rounded-2xl border border-line-strong bg-field p-1.5"
    >
      <img
        ngSrc="logo-conecta7.png"
        width="60"
        height="60"
        priority
        alt="Conecta 7"
        class="size-full rounded-xl object-cover"
      />
    </div>

    <span
      class="mt-3.5 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-accent-fg uppercase"
    >
      Portal administrador
    </span>
    <h1 [id]="titleId()" class="mt-2 text-xs font-normal text-fg-2">{{ title() }}</h1>
  `,
})
export class AuthHeader {
  readonly title = input.required<string>();
  readonly titleId = input('auth-title');
}
