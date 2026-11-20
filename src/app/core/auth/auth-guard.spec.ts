import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, isObservable, Observable, of } from 'rxjs';
import { Auth } from './auth';
import { authGuard, guestGuard } from './auth-guard';

describe('guards de autenticación', () => {
  let conSesion = false;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: { ensureSession: () => of(conSesion) } },
      ],
    });
  });

  const run = async (guard: typeof authGuard) => {
    const r = TestBed.runInInjectionContext(() => guard({} as never, {} as never));
    return isObservable(r) ? firstValueFrom(r as Observable<unknown>) : r;
  };
  const url = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  it('authGuard manda a /login sin sesión (ni cookie para recuperarla)', async () => {
    conSesion = false;
    expect(url(await run(authGuard))).toBe('/login');
  });

  it('authGuard deja pasar con sesión', async () => {
    conSesion = true;
    expect(await run(authGuard)).toBe(true);
  });

  it('guestGuard manda al inicio con sesión', async () => {
    conSesion = true;
    expect(url(await run(guestGuard))).toBe('/');
  });

  it('guestGuard deja ver el login sin sesión', async () => {
    conSesion = false;
    expect(await run(guestGuard)).toBe(true);
  });
});
