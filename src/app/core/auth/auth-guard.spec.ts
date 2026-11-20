import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { Auth } from './auth';
import { authGuard, guestGuard } from './auth-guard';

describe('guards de autenticación', () => {
  const isAuthenticated = signal(false);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: Auth, useValue: { isAuthenticated } }],
    });
  });

  const run = (guard: typeof authGuard) =>
    TestBed.runInInjectionContext(() => guard({} as never, {} as never));
  const url = (r: unknown) => TestBed.inject(Router).serializeUrl(r as UrlTree);

  it('authGuard manda a /login sin sesión', () => {
    isAuthenticated.set(false);
    expect(url(run(authGuard))).toBe('/login');
  });

  it('authGuard deja pasar con sesión', () => {
    isAuthenticated.set(true);
    expect(run(authGuard)).toBe(true);
  });

  it('guestGuard manda al inicio con sesión', () => {
    isAuthenticated.set(true);
    expect(url(run(guestGuard))).toBe('/');
  });
});
