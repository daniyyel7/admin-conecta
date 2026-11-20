import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Auth } from '../../core/auth/auth';
import { UserMenu } from './user-menu';

describe('UserMenu', () => {
  const logout = vi.fn(() => of(undefined));

  beforeEach(async () => {
    logout.mockClear();
    await TestBed.configureTestingModule({
      imports: [UserMenu],
      providers: [
        provideRouter([]),
        {
          provide: Auth,
          useValue: {
            user: signal({ email: 'david.mazariegos@conecta7.org', name: 'David Mazariegos' }),
            logout,
          },
        },
      ],
    }).compileComponents();
  });

  it('muestra las iniciales y abre el menú con los datos del usuario', async () => {
    const fixture = TestBed.createComponent(UserMenu);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector('button')!;
    expect(trigger.textContent).toContain('DM');
    expect(el.querySelector('[role=menu]')).toBeNull();

    trigger.click();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelector('[role=menu]')?.textContent).toContain('david.mazariegos@conecta7.org');
  });

  it('ofrece cambiar la contraseña y avisa al shell', async () => {
    const fixture = TestBed.createComponent(UserMenu);
    let pedido = false;
    fixture.componentInstance.changePassword.subscribe(() => (pedido = true));
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('button')!.click();
    await fixture.whenStable();
    const items = [...el.querySelectorAll<HTMLButtonElement>('[role=menuitem]')];
    expect(items.map((i) => i.textContent?.trim())).toEqual(['Cambiar contraseña', 'Cerrar sesión']);
    items[0].click();
    await fixture.whenStable();
    expect(pedido).toBe(true);
    expect(el.querySelector('[role=menu]')).toBeNull();
  });

  it('cierra sesión y vuelve al login', async () => {
    const fixture = TestBed.createComponent(UserMenu);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    el.querySelector('button')!.click();
    await fixture.whenStable();
    [...el.querySelectorAll<HTMLButtonElement>('[role=menuitem]')]
      .find((b) => b.textContent?.includes('Cerrar sesión'))!
      .click();
    expect(logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith('/login');
  });
});
