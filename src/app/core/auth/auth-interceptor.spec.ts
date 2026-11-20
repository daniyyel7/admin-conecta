import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Auth } from './auth';
import { authInterceptor } from './auth-interceptor';

describe('authInterceptor', () => {
  const api = environment.apiUrl;
  let http: HttpClient;
  let ctrl: HttpTestingController;
  let auth: Auth;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpClient);
    ctrl = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(Auth);
  });

  afterEach(() => ctrl.verify());

  async function iniciarSesion() {
    const login = firstValueFrom(auth.login({ email: 'a@b.mx', password: 'Secreta123' }));
    ctrl.expectOne(`${api}/auth/login`).flush({
      accessToken: 'token-1',
      expiresIn: 900,
      user: { id: 'u1', email: 'a@b.mx', name: 'Ana', role: 'admin' },
    });
    await login;
  }

  it('agrega el token y no lo pone en las rutas públicas de /auth', async () => {
    await iniciarSesion();
    const r = firstValueFrom(http.get(`${api}/eventos`));
    const req = ctrl.expectOne(`${api}/eventos`);
    expect(req.request.headers.get('Authorization')).toBe('Bearer token-1');
    req.flush([]);
    await r;

    // forgot-password es pública: va sin Authorization.
    const f = firstValueFrom(auth.requestPasswordReset('a@b.mx'));
    const forgot = ctrl.expectOne(`${api}/auth/forgot-password`);
    expect(forgot.request.headers.has('Authorization')).toBe(false);
    forgot.flush(null, { status: 204, statusText: 'No Content' });
    await f;
  });

  it('con 401 renueva la sesión y repite la petición con el token nuevo', async () => {
    await iniciarSesion();
    const r = firstValueFrom(http.get<number[]>(`${api}/eventos`));

    ctrl.expectOne(`${api}/eventos`).flush({ message: 'vencido' }, { status: 401, statusText: 'Unauthorized' });
    const refresh = ctrl.expectOne(`${api}/auth/refresh`);
    expect(refresh.request.withCredentials).toBe(true);
    refresh.flush({ accessToken: 'token-2', expiresIn: 900 });

    const repetida = ctrl.expectOne(`${api}/eventos`);
    expect(repetida.request.headers.get('Authorization')).toBe('Bearer token-2');
    repetida.flush([1, 2]);
    expect(await r).toEqual([1, 2]);
  });

  it('si la sesión ya no se puede renovar, manda al login', async () => {
    await iniciarSesion();
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const r = firstValueFrom(http.get(`${api}/eventos`));

    ctrl.expectOne(`${api}/eventos`).flush({}, { status: 401, statusText: 'Unauthorized' });
    ctrl.expectOne(`${api}/auth/refresh`).flush({}, { status: 401, statusText: 'Unauthorized' });

    await expect(r).rejects.toBeTruthy();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(auth.isAuthenticated()).toBe(false);
  });
});
