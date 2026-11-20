import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Auth } from '../../../../core/auth/auth';
import { Home } from './home';

describe('Home', () => {
  it('saluda al usuario con su nombre y muestra la fecha', async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        {
          provide: Auth,
          useValue: { user: signal({ email: 'd@x.org', name: 'David Mazariegos' }) },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('h1')?.textContent?.trim()).toBe('¡Bienvenido David Mazariegos!');
    expect(el.querySelector('time')?.textContent).toMatch(/^[A-ZÁÉÍÓÚ][a-záéíóú]+, \d{1,2} de [A-Z][a-z]+ \d{4}$/);
  });
});
