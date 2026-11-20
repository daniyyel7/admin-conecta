/**
 * Desarrollo: `ng serve` reenvía `/api-appumch` a la API local (http://localhost:3201)
 * con `proxy.conf.json`, así el navegador lo ve como el mismo origen (cookies sin CORS).
 */
export const environment = {
  apiUrl: '/api-appumch/v1/admin',
};
