# API para el panel admin-conecta

Lista de endpoints que necesita el panel de administración de Conecta 7 para funcionar con datos reales.
Hoy todo está simulado en el frontend; cada endpoint indica qué pantalla lo usa y qué archivo del panel se conecta a él.

## Convenciones

| Tema | Propuesta |
|---|---|
| URL base | `https://app.umch.org.mx/api/admin` (en este documento las rutas son relativas a esa base) |
| Formato | JSON (`Content-Type: application/json`), salvo la subida de archivos (`multipart/form-data`) |
| Fechas | `yyyy-mm-dd` (ej. `2026-11-19`). Para calcular estados usar la zona horaria `America/Mexico_City` |
| Autenticación | `Authorization: Bearer <accessToken>` en todo excepto login, refresh, forgot-password y reset-password (incluye validate) |
| IDs | Texto (`"EVT-2026-105"`, `"1"`) |
| CORS | Permitir el origen `https://app.umch.org.mx` |

### Formato de errores (todos los endpoints)

```json
{
  "message": "Texto para mostrar al usuario",
  "errors": { "nombre": ["Es obligatorio"], "fechaFin": ["Debe ser posterior a fechaInicio"] }
}
```

| Código | Cuándo |
|---|---|
| `400` / `422` | Datos inválidos (con `errors` por campo) |
| `401` | Sin sesión o token vencido → el panel intenta `refresh` y si falla manda al login |
| `410` | Enlace de recuperación vencido o ya usado |
| `403` | El usuario no tiene permiso |
| `404` | No existe |
| `409` | La acción no aplica al estado actual (ej. cancelar un evento finalizado) |
| `413` | Archivo demasiado grande |
| `429` | Demasiados intentos (login, forgot password) |

---

## 1. Autenticación

Pantallas: Login, Recuperar contraseña, Restablecer contraseña, menú de usuario (Cambiar contraseña, Cerrar sesión), saludo del Inicio.
Archivo del panel: `src/app/core/auth/auth.ts`.

### 1.1 `POST /auth/login` — Iniciar sesión

```json
// Petición
{ "email": "david.mazariegos@conecta7.org", "password": "••••••" }

// 200
{
  "accessToken": "eyJ...",
  "expiresIn": 900,
  "user": { "id": "12", "name": "David Mazariegos", "email": "david.mazariegos@conecta7.org", "role": "admin" }
}
```
- El `refreshToken` va en una cookie `httpOnly; Secure; SameSite=Strict` (no en el JSON).
- `401` si las credenciales son incorrectas (mensaje genérico, sin decir cuál campo falló).
- `429` después de varios intentos fallidos.
- `user.name` es el que aparece en "¡Bienvenido David Mazariegos!" y en el menú de usuario.

### 1.2 `POST /auth/refresh` — Renovar sesión
Usa la cookie de refresh y devuelve un nuevo `{ "accessToken", "expiresIn" }`. `401` si la sesión ya no es válida.

### 1.3 `GET /auth/me` — Usuario actual
Devuelve el mismo objeto `user` del login. Se usa al recargar la página para confirmar que la sesión sigue activa.

### 1.4 `POST /auth/logout` — Cerrar sesión
Invalida el refresh token y borra la cookie. Responde `204`.

### 1.5 `POST /auth/forgot-password` — Pedir enlace de recuperación

```json
{ "email": "pastor.admin@conecta7.org" }
```
- Responde **siempre `204`**, exista o no la cuenta (para no revelar qué correos están registrados).
- Envía un correo con un enlace como `https://app.umch.org.mx/admin/restablecer-contrasena?token=XXXX` (token de un solo uso, con vencimiento, p. ej. 1 hora).

### 1.6 `GET /auth/reset-password/validate?token=XXXX` — Validar enlace
Se llama al abrir la pantalla Restablecer contraseña (mientras muestra "Verificando el enlace…").
`204` si el token sirve; `410` si venció o ya se usó (el panel muestra "El enlace ya no es válido" y el botón "Pedir un enlace nuevo").

### 1.7 `POST /auth/reset-password` — Guardar la nueva contraseña

```json
{ "token": "XXXX", "password": "NuevaContraseña123" }
```
- `204` si se cambió (el panel muestra "¡Contraseña actualizada!" y el botón "Iniciar sesión").
- `410` si el token no sirve; `422` si la contraseña no cumple las reglas.
- Después de usarse, el token debe quedar inválido. Recomendado: cerrar las sesiones abiertas de ese usuario.
- La pantalla ya existe en el panel: `https://app.umch.org.mx/admin/restablecer-contrasena?token=XXXX` (es el enlace que debe ir en el correo del 1.5).

### 1.8 `POST /auth/change-password` — Cambiar contraseña (con sesión iniciada)
Usado en: menú de perfil → "Cambiar contraseña" (en escritorio y en el menú lateral del celular).

```json
{ "currentPassword": "ContraseñaActual1", "newPassword": "NuevaContraseña2" }
```
- `204` si se cambió.
- `400` con `{ "errors": { "currentPassword": ["La contraseña actual no es correcta."] } }` si la actual no coincide (el panel muestra el mensaje bajo ese campo).
- `422` si la nueva no cumple las reglas o es igual a la actual.
- `429` si hay muchos intentos con la contraseña actual incorrecta.
- Recomendado: mantener la sesión actual y cerrar las demás sesiones del usuario.

### Reglas de contraseña nueva (1.7 y 1.8)
El panel las muestra como lista que se va marcando y no deja enviar si no se cumplen; el servidor debe validar las mismas:
- Al menos 8 caracteres
- Al menos una letra
- Al menos un número

Están en `src/app/core/auth/password-rules.ts` por si se cambian.

---

## 2. Catálogos (listas desplegables)

Se cargan una vez al entrar. Hoy están fijos en el código; con estos endpoints se administran desde el servidor.

### 2.1 `GET /catalogos/departamentos`
Usado en: filtro de Departamento de Eventos, formulario de evento, chips y formulario de colecciones.

```json
[
  { "id": "escuela-sabatica", "nombre": "Escuela Sabática", "color": "#eab308", "activo": true },
  { "id": "juvenil", "nombre": "Ministerio Juvenil", "color": "#f4a77a", "activo": true }
]
```
- `color` es opcional (el punto de color de cada departamento). Si no viene, el panel asigna uno.
- La app móvil muestra "Ver todo (13)": el panel hoy tiene 7, así que este catálogo debe traer los 13 reales.
- Archivo: `src/app/core/catalogos/departamentos.ts`.

### 2.2 `GET /catalogos/categorias-recursos`
Usado en: lista desplegable "Categoría" de Nueva/Editar colección.

```json
[{ "id": "libros", "nombre": "Libros" }, { "id": "devocionales", "nombre": "Devocionales" }]
```

### 2.3 `GET /catalogos/estados-evento` *(opcional)*
Usado en: filtro de Estado de Eventos. Si no existe, el panel usa la lista fija:

```json
[
  { "id": "proximo", "label": "Próximo" },
  { "id": "en-curso", "label": "En curso" },
  { "id": "finalizado", "label": "Finalizado" },
  { "id": "cancelado", "label": "Cancelado" }
]
```

### 2.4 `GET /catalogos/tipos-recurso` *(opcional, recomendado)*
Para que los formatos y tamaños máximos que valida el panel sean los mismos que acepta el servidor.

```json
[
  { "type": "pdf", "label": "PDF", "mode": "file", "accept": ".pdf,application/pdf", "maxMb": 25 },
  { "type": "video", "label": "Video", "mode": "file-or-url", "accept": "video/*", "maxMb": 500 },
  { "type": "drive", "label": "Google Drive", "mode": "url" }
]
```
Si no existe, el panel usa los valores de `src/app/features/recursos/models/recurso.ts`.

---

## 3. Eventos

Pantallas: Eventos (lista), Nuevo evento, Editar evento.
Archivo del panel: `src/app/features/eventos/services/eventos-store.ts`.

### Objeto `Evento`

```json
{
  "id": "EVT-2026-105",
  "nombre": "Encuentro Distrital de Damas",
  "descripcion": "Convivencia y oración para mujeres del distrito.",
  "departamentoId": "mujer",
  "estado": "proximo",
  "fechaInicio": "2027-01-16",
  "fechaFin": "2027-01-16",
  "ubicacion": "Distrito Comitán",
  "imagen": "https://app.umch.org.mx/media/eventos/evt-2026-105.jpg",
  "etiquetas": ["Convivencia & Oración"]
}
```

- **`estado` lo calcula el servidor** (el panel nunca lo envía):
  - `proximo`: hoy < `fechaInicio`
  - `en-curso`: `fechaInicio` ≤ hoy ≤ `fechaFin`
  - `finalizado`: hoy > `fechaFin`
  - `cancelado`: solo con el endpoint 3.5, y se mantiene aunque se edite el evento.
- `etiquetas`: el panel ya no las edita, solo las muestra en la lista (debajo del nombre). Si el servidor no las maneja puede mandar `[]`.

### 3.1 `GET /eventos` — Lista de eventos
Usado en: tabla de Eventos, tarjetas "Total eventos" y "En curso activos", conteos de los filtros.

Opción A (simple, recomendada mientras haya pocos cientos de eventos): devolver **todos** los eventos `Evento[]`; el panel ya busca, filtra y pagina por su cuenta.

Opción B (para muchos eventos), filtros en el servidor:

| Parámetro | Ejemplo | Uso |
|---|---|---|
| `q` | `diciembre tuxtla` | Busca en nombre, ID, departamento, ubicación, etiquetas y fecha escrita, sin importar acentos |
| `departamentos` | `juvenil,mujer` | Varios departamentos |
| `estado` | `en-curso` | Un estado |
| `page`, `pageSize` | `1`, `5` | Paginación (el panel muestra 5 por página) |

```json
{
  "items": [ /* Evento[] */ ],
  "total": 18,
  "page": 1,
  "pageSize": 5,
  "resumen": { "total": 18, "enCurso": 4 },
  "conteos": {
    "departamentos": { "evangelismo": 4, "juvenil": 5 },
    "estados": { "en-curso": 4, "proximo": 10, "finalizado": 3, "cancelado": 1 }
  }
}
```
`resumen` alimenta las tarjetas de arriba y `conteos` los números de los filtros ("Ministerio Juvenil (5)", "En curso 4").

### 3.2 `GET /eventos/:id` — Un evento
Usado en: Editar evento (cuando se entra directo por URL o se recarga la página). `404` si no existe.

### 3.3 `POST /eventos` — Crear evento

```json
{
  "nombre": "Congreso Juvenil 2027",
  "descripcion": "Congreso anual para jóvenes de toda la unión.",
  "departamentoId": "juvenil",
  "fechaInicio": "2027-03-20",
  "fechaFin": "2027-03-22",
  "ubicacion": "Auditorio UMCH, Tuxtla Gutiérrez",
  "imagen": "https://app.umch.org.mx/media/eventos/abc.jpg"
}
```
- **Todos los campos son obligatorios.** Validar también en el servidor: `nombre` 3–120 caracteres, `descripcion` 10–500, `fechaFin ≥ fechaInicio`, `ubicacion` ≤ 150, `departamentoId` existente.
- `imagen` es la URL devuelta por la subida de archivos (sección 4).
- Responde `201` con el `Evento` completo (con `id` y `estado`).

### 3.4 `PUT /eventos/:id` — Editar evento
Mismo cuerpo que crear. Responde el `Evento` actualizado (el `estado` se recalcula, salvo que esté `cancelado`).

### 3.5 `POST /eventos/:id/cancelar` — Cancelar evento
Usado en: menú ⋮ → "Cancelar evento".

```json
{ "motivo": "Por condiciones climáticas" }   // opcional, por si se quiere guardar
```
- Responde el `Evento` con `estado: "cancelado"`. **No se elimina.**
- `409` si el evento ya está `finalizado` o `cancelado`.

### 3.6 `DELETE /eventos/:id` — Eliminar evento
Usado en: botón 🗑 de la lista (con confirmación). Responde `204`. Debe borrar también su imagen de portada.

---

## 4. Archivos (subidas)

### 4.1 `POST /archivos` — Subir un archivo
Usado en: imagen de portada del evento y recursos de tipo PDF, Documento, Video, Audio e Imagen.

`multipart/form-data`:

| Campo | Ejemplo | Descripción |
|---|---|---|
| `file` | (archivo) | El archivo |
| `destino` | `evento-portada` \| `recurso` | Para guardarlo en la carpeta correcta y aplicar sus límites |
| `tipo` | `pdf` | Solo cuando `destino = recurso`: tipo de recurso, para validar formato y tamaño |

```json
// 201
{
  "url": "https://app.umch.org.mx/media/publico/pdf/guia-lideres-2027.pdf",
  "nombre": "guia-lideres-2027.pdf",
  "tamano": 300512,
  "mimeType": "application/pdf"
}
```

Límites que valida el panel (el servidor debe validar lo mismo):

| Destino / tipo | Formatos | Máximo |
|---|---|---|
| Portada de evento | JPG, PNG, WebP | 2 MB |
| `pdf` | PDF | 25 MB |
| `document` | DOC, DOCX, PPT, PPTX, XLS, XLSX, ODT, ODP, TXT | 25 MB |
| `video` | MP4, MOV, WEBM | 500 MB |
| `audio` | MP3, M4A, WAV, OGG | 100 MB |
| `image` | JPG, PNG, WebP | 10 MB |

- El panel muestra una barra de progreso, así que el servidor solo tiene que aceptar la subida normal (el progreso lo mide el navegador).
- Si el archivo no corresponde, responder `422`; si es muy pesado, `413`.
- Para videos grandes conviene que el servidor (o el proxy) permita cuerpos de hasta 500 MB y tiempos de espera largos.
- **Limpieza:** si un archivo subido no queda asociado a ningún evento o recurso (el usuario canceló), el servidor debería borrarlo después de un tiempo (ej. 24 h).

---

## 5. Recursos — Colecciones

Pantallas: Recursos (lista de colecciones), detalle de una colección, formulario Nueva/Editar colección.
Archivo del panel: `src/app/features/recursos/services/colecciones-store.ts`.
Se respetan los nombres de campo del JSON que ya existe (`allEvents`, `apartment`, `numberReources`…).

### Objeto `Collection`

```json
{
  "id": "1",
  "visible": true,
  "status": "En curso",
  "category": "Libros",
  "apartment": "Escuela Sabática",
  "date": "2026-11-01",
  "location": "Unión Mexicana de Chiapas",
  "link": "/recursos/1",
  "title": "Libros UMCH 2026",
  "numberReources": "5 archivos",
  "description": "Libros y guías oficiales del año para iglesias y distritos.",
  "resources": [ /* Resource[] */ ]
}
```

- `status` lo calcula el servidor con `date`, igual que en eventos.
- `link` y `numberReources` los arma el servidor.

### 5.1 `GET /recursos` — Todas las colecciones con sus recursos

```json
{ "allEvents": [ /* Collection[] */ ] }
```
Usado en: tarjetas de colecciones, indicadores (Colecciones / Recursos / Visibles), chips de departamento y búsqueda.
Filtros opcionales si crecen mucho: `?q=` y `?apartment=`.

### 5.2 `GET /recursos/:id` — Una colección
Usado en: detalle de la colección (al entrar directo o recargar). Devuelve `Collection` con `resources`. `404` si no existe.

### 5.3 `POST /recursos` — Crear colección

```json
{
  "title": "Semana de Oración 2027",
  "description": "Lecturas diarias y música para la semana de oración.",
  "apartment": "Ministerio Personal",
  "category": "Devocionales",
  "date": "2027-01-10",
  "location": "Todas las iglesias",
  "visible": true
}
```
Todos los campos son obligatorios. Responde `201` con la `Collection` (sin recursos).

### 5.4 `PUT /recursos/:id` — Editar colección
Mismo cuerpo que crear. Si cambian `apartment`, `category` o `date`, sus recursos deben reflejarlo (ver nota de campos repetidos al final).

### 5.5 `PATCH /recursos/:id/visible` — Mostrar u ocultar en la app
Usado en: interruptor "Visible" de cada tarjeta.

```json
{ "visible": false }
```
Responde la `Collection`. Una colección oculta (y sus recursos) no debe aparecer en la app de los miembros.

### 5.6 `DELETE /recursos/:id` — Eliminar colección
Responde `204`. Elimina también sus recursos y los archivos subidos de esos recursos.

---

## 6. Recursos — Elementos de una colección

### Objeto `Resource`

```json
{
  "id": "1-6",
  "type": "pdf",
  "visible": true,
  "status": "En curso",
  "category": "Libros",
  "apartment": "Escuela Sabática",
  "date": "2026-11-01",
  "link": "https://app.umch.org.mx/media/publico/pdf/guia-lideres-2027.pdf",
  "title": "Guía para Líderes",
  "description": "Grupos pequeños familiares"
}
```

`type`: `pdf` | `document` | `video` | `audio` | `image` | `drive` | `link`.

### 6.1 `POST /recursos/:id/resources` — Agregar recurso

```json
{
  "type": "drive",
  "title": "Carpeta de especialidades",
  "description": "Requisitos y hojas de trabajo",
  "link": "https://drive.google.com/drive/folders/1EBW7-wf0l6JDsDibyQNKcCf0ZR_LoifM",
  "visible": true
}
```
- `title`, `description` y `link` son obligatorios.
- `link` es la URL de `POST /archivos` (tipos con archivo) o el enlace escrito (Drive, Enlace, video de YouTube/Vimeo).
- Validar en el servidor:
  - `drive`: `https://drive.google.com/...` o `https://docs.google.com/...`
  - `video` con enlace: YouTube (`youtube.com`, `youtu.be`) o Vimeo
  - `link`: cualquier `https://`
- `status`, `category`, `apartment` y `date` los copia el servidor de la colección.
- Responde `201` con el `Resource`.

### 6.2 `PUT /recursos/:id/resources/:resourceId` — Editar recurso
Mismo cuerpo que agregar. Si cambió el archivo, borrar el anterior.

### 6.3 `PATCH /recursos/:id/resources/:resourceId/visible` — Mostrar u ocultar
`{ "visible": true }`. Usado en el interruptor de cada recurso.

### 6.4 `DELETE /recursos/:id/resources/:resourceId` — Eliminar recurso
Responde `204` y borra su archivo si fue subido.

### 6.5 `PUT /recursos/:id/resources/orden` — Ordenar recursos *(a futuro)*
`{ "ids": ["1-3", "1-1", "1-2"] }`. El panel aún no permite reordenar; se agregaría si quieren controlar el orden en la app.

---

## Resumen

Pantallas del panel (ruta en producción bajo `https://app.umch.org.mx/admin`):
**Login** (`/login`), **Recuperar contraseña** (`/recuperar-contrasena`), **Restablecer contraseña** (`/restablecer-contrasena`),
**Inicio** (`/`), **Eventos** (`/eventos`), **Nuevo evento** (`/eventos/nuevo`), **Editar evento** (`/eventos/:id/editar`),
**Recursos** (`/recursos`), **Colección** (`/recursos/:id`), y el **menú de perfil** / **menú lateral** que aparecen en todas las pantallas con sesión.

| # | Método | Ruta | Para qué | Cómo se usa | Pantallas |
|---|---|---|---|---|---|
| 1 | POST | `/auth/login` | Iniciar sesión | Al pulsar **Iniciar Sesión** con correo y contraseña. Si responde bien, se guarda el token y se entra al Inicio; si no, se muestra "Usuario o contraseña incorrectos". | Login |
| 2 | POST | `/auth/refresh` | Renovar el token | Automático, sin que el usuario haga nada: cuando cualquier petición responde `401`, se renueva el token y se repite la petición. Si falla, se manda al login. | Todas las pantallas con sesión |
| 3 | GET | `/auth/me` | Usuario actual | Al abrir o recargar el panel, para confirmar que la sesión sigue activa y obtener el nombre y correo. | Inicio (saludo "¡Bienvenido…!"), menú de perfil, menú lateral |
| 4 | POST | `/auth/logout` | Cerrar sesión | Al pulsar **Cerrar sesión**. Luego se manda al login. | Menú de perfil, menú lateral |
| 5 | POST | `/auth/forgot-password` | Enviar correo de recuperación | Al pulsar **Enviar enlace** y también **Reenviar enlace**. Siempre muestra "Revisa tu correo". | Recuperar contraseña |
| 6 | GET | `/auth/reset-password/validate` | Validar enlace del correo | Automático al abrir el enlace del correo, mientras se ve "Verificando el enlace…". Decide si se muestra el formulario o "El enlace ya no es válido". | Restablecer contraseña |
| 7 | POST | `/auth/reset-password` | Guardar nueva contraseña (con el enlace del correo) | Al pulsar **Guardar contraseña**. Si sale bien, se muestra "¡Contraseña actualizada!". | Restablecer contraseña |
| 8 | POST | `/auth/change-password` | Cambiar contraseña desde el menú de perfil | Al pulsar **Cambiar contraseña** en la ventana que abre la opción del menú. | Menú de perfil, menú lateral (en cualquier pantalla con sesión) |
| 9 | GET | `/catalogos/departamentos` | Lista de departamentos | Una vez al entrar al panel; se reutiliza en todas las listas y filtros de departamento. | Eventos (filtro Departamento), Nuevo/Editar evento (lista Departamento), Recursos (chips y formulario de colección) |
| 10 | GET | `/catalogos/categorias-recursos` | Categorías de colecciones | Una vez al entrar a Recursos; llena la lista desplegable **Categoría**. | Recursos y Colección (ventana Nueva/Editar colección) |
| 11 | GET | `/catalogos/estados-evento` | Estados de evento *(opcional)* | Una vez al entrar a Eventos; llena el filtro **Estado** y sus etiquetas. | Eventos |
| 12 | GET | `/catalogos/tipos-recurso` | Formatos y límites por tipo *(opcional)* | Al abrir **Agregar recurso**; define qué tipos aparecen, qué archivos acepta y su tamaño máximo. | Colección (ventana Agregar/Editar recurso) |
| 13 | GET | `/eventos` | Lista, resumen y conteos | Al entrar a Eventos (y al buscar, filtrar o cambiar de página si se usa la opción con filtros en el servidor). Llena la tabla, las tarjetas "Total eventos" / "En curso activos" y los números de los filtros. | Eventos |
| 14 | GET | `/eventos/:id` | Un evento | Al abrir **Editar** (✏️) un evento, para llenar el formulario con sus datos. | Editar evento |
| 15 | POST | `/eventos` | Crear evento | Al pulsar **Crear evento** después de llenar el formulario. Luego regresa a la lista con el aviso "Se creó el evento…". | Nuevo evento |
| 16 | PUT | `/eventos/:id` | Editar evento | Al pulsar **Guardar cambios**. Luego regresa a la lista con el aviso "Se guardaron los cambios…". | Editar evento |
| 17 | POST | `/eventos/:id/cancelar` | Cancelar evento | Menú **⋮** de un evento → **Cancelar evento** → confirmar **Sí, cancelar evento**. Solo disponible si está Próximo o En curso. | Eventos |
| 18 | DELETE | `/eventos/:id` | Eliminar evento | Botón 🗑 de un evento → confirmar **Eliminar**. | Eventos |
| 19 | POST | `/archivos` | Subir archivo (portadas y recursos) | En cuanto el usuario elige o arrastra un archivo (antes de guardar), con barra de progreso. La URL que devuelve se envía después al guardar el evento o recurso. | Nuevo/Editar evento (Imagen de portada), Colección (Agregar/Editar recurso de tipo PDF, Documento, Video, Audio, Imagen) |
| 20 | GET | `/recursos` | Colecciones con sus recursos | Al entrar a Recursos. Llena las tarjetas, los indicadores (Colecciones / Recursos / Visibles) y los chips de departamento. | Recursos |
| 21 | GET | `/recursos/:id` | Una colección | Al abrir **Administrar recursos** o el nombre de una colección (y al recargar esa página). | Colección |
| 22 | POST | `/recursos` | Crear colección | Botón **Nueva colección** → llenar la ventana → **Crear colección**. Luego abre la colección nueva para agregarle recursos. | Recursos |
| 23 | PUT | `/recursos/:id` | Editar colección | Botón ✏️ de la tarjeta o **Editar colección** → **Guardar cambios**. | Recursos, Colección |
| 24 | PATCH | `/recursos/:id/visible` | Mostrar/ocultar colección | Al mover el interruptor **Visible** de una tarjeta (se guarda al instante). | Recursos |
| 25 | DELETE | `/recursos/:id` | Eliminar colección | Botón 🗑 de la tarjeta → confirmar **Eliminar**. | Recursos |
| 26 | POST | `/recursos/:id/resources` | Agregar recurso | Botón **Agregar recurso** → elegir tipo → subir archivo o pegar enlace → **Agregar recurso**. | Colección |
| 27 | PUT | `/recursos/:id/resources/:resourceId` | Editar recurso | Botón ✏️ de un recurso → **Guardar cambios**. | Colección |
| 28 | PATCH | `/recursos/:id/resources/:resourceId/visible` | Mostrar/ocultar recurso | Al mover el interruptor **Visible** de un recurso (se guarda al instante). | Colección |
| 29 | DELETE | `/recursos/:id/resources/:resourceId` | Eliminar recurso | Botón 🗑 de un recurso → confirmar **Eliminar**. | Colección |
| 30 | PUT | `/recursos/:id/resources/orden` | Ordenar recursos *(a futuro)* | Todavía no se usa: sería al arrastrar los recursos para cambiar su orden. | Colección *(cuando se agregue)* |

### Endpoints por pantalla

| Pantalla | Endpoints |
|---|---|
| Login | 1 |
| Recuperar contraseña | 5 |
| Restablecer contraseña | 6, 7 |
| Inicio | 3 |
| Eventos | 9, 11, 13, 17, 18 |
| Nuevo evento | 9, 15, 19 |
| Editar evento | 9, 14, 16, 19 |
| Recursos | 9, 10, 20, 22, 23, 24, 25 |
| Colección | 10, 12, 19, 21, 23, 26, 27, 28, 29 |
| Menú de perfil / menú lateral (todas las pantallas con sesión) | 2, 3, 4, 8 |

## Pendientes y observaciones para el backend

1. **Nombres de campo.** Eventos usa español (`nombre`, `departamentoId`) y Recursos inglés (`title`, `apartment`). Conviene elegir un solo idioma; el panel se adapta a lo que decidan.
2. **`apartment` → `department`.** "Apartment" significa departamento de vivienda. Además se manda el **nombre** ("Escuela sábatica", con el acento mal puesto); es mejor mandar el `id` del catálogo (`"escuela-sabatica"`).
3. **`numberReources`** tiene un error de escritura (`numberResources`) y el panel puede calcularlo con `resources.length`.
4. **Campos repetidos en cada recurso** (`status`, `category`, `apartment`, `date`): ya vienen en la colección. Si se mantienen, el servidor debe actualizarlos cuando cambia la colección.
5. **`status` como texto** ("En curso"): es mejor un código (`en-curso`) y que la app ponga el texto, como en eventos.
6. **Etiquetas de eventos:** el formulario ya no las captura. Definir si el servidor las genera o se quitan de la lista.
7. **Roles y permisos:** ¿todos los administradores pueden todo, o hay administradores por departamento? Si es por departamento, `GET` debe filtrar y las demás acciones responder `403`.
8. **Relación evento ↔ colección:** hoy son independientes. Si una colección pertenece a un evento, agregar `eventoId` en la colección.
