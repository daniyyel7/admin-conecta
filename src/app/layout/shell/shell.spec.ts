import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { Auth } from '../../core/auth/auth';
import { Shell } from './shell';

describe('Shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            user: signal({ email: 'david.mazariegos@conecta7.org', name: 'David Mazariegos' }),
            logout: vi.fn(),
          },
        },
      ],
    }).compileComponents();
  });

  it('abre y cierra el menú hamburguesa', async () => {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const burger = el.querySelector<HTMLButtonElement>('[aria-label="Abrir menú"]')!;
    const drawer = el.querySelector<HTMLElement>('#mobile-drawer')!;

    expect(drawer.classList).not.toContain('is-open');
    expect(drawer.inert).toBe(true);

    burger.click();
    await fixture.whenStable();
    expect(burger.getAttribute('aria-expanded')).toBe('true');
    expect(drawer.classList).toContain('is-open');
    expect(drawer.inert).toBe(false);
    expect(drawer.textContent).toContain('Eventos');
    expect(drawer.textContent).toContain('david.mazariegos@conecta7.org');

    el.querySelector<HTMLButtonElement>('[aria-label="Cerrar menú"]')!.click();
    await fixture.whenStable();
    expect(drawer.classList).not.toContain('is-open');
  });
});
