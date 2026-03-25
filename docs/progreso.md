# HomeCore V2 — Estado del proyecto

**Última actualización: 25 marzo 2026**
Repo: https://github.com/TheIkaz/HomeCore-V2

---

## Qué está hecho

### Infraestructura base
- Repositorio GitHub creado: `TheIkaz/HomeCore-V2`
- `.gitignore`, `README.md` y estructura de carpetas
- `compose/docker-compose.yml` con todos los servicios:
  - PostgreSQL + Redis (base para Authentik)
  - Authentik server + worker (SSO)
  - Caddy (reverse proxy, forward auth)
  - cloudflared (Cloudflare Tunnel)
  - HomeCore (Flask + React)
- `compose/docker-compose.example.env` — plantilla con todas las variables necesarias
- `caddy/Caddyfile` — enrutamiento por subdominio para `theikaz.com`, snippet de forward auth
- `scripts/setup.sh` — script para preparar la Pi (directorios, .env, verificar Docker)

### HomeCore — backend Flask (`homecore/api/`)
- `database.py` — SQLite con tablas `apps` y `productos`, seed con apps iniciales
- `utils/auth.py` — lee identidad desde cabeceras `X-Authentik-*` (sin JWT propio)
- `blueprints/apps.py` — `GET /api/apps/catalogo` filtrado por grupos del usuario
- `blueprints/inventario.py` — CRUD completo (listar, agotados, lista-compra, buscar, crear, editar, modificar, eliminar)
- `blueprints/configuracion.py` — gestión del catálogo de apps (solo admin)
- `blueprints/admin.py` — gestión de usuarios vía API de Authentik (solo admin)

### HomeCore — frontend React (`homecore/web/`)
- Vite + React Router + lucide-react
- `Dashboard` — grid de apps cargado dinámicamente desde `/api/apps/catalogo`
- Módulo `Inventario` completo: lista, agotados, lista de la compra, formulario alta/edición
- `pages/Admin/Invitar.jsx` — formulario de alta de usuarios (solo admin)
- `api/client.js`, `api/apps.js`, `api/inventario.js`, `api/admin.js` — capa de llamadas a la API
- CSS modules con tema oscuro

### Docker
- `homecore/Dockerfile` — build multi-etapa: Node construye React, Python sirve todo con Gunicorn

---

## Fases completadas

### ~~Fase 1 — Infraestructura base~~ ✅

### ~~Fase 2 — HomeCore como dashboard~~ ✅
- Dashboard con catálogo dinámico de apps
- Módulo Inventario completo
- Sidebar eliminado — barra superior fina con icono de casa
- Mejoras UX: botones +/−, lista de la compra, navegación Atrás

### ~~Fase 3 — Servicios de contenido~~ ✅ — 25 marzo 2026

Servicios añadidos al `docker-compose.yml`:
- **Filebrowser** — explorador de ficheros web. Forward auth de Authentik (sin login propio). ✅
- **Jellyfin** — streaming de media. Biblioteca de solo lectura sobre la carpeta media/ de Filebrowser. ✅

SSO:
- Filebrowser: forward auth de Caddy ✅
- Jellyfin: plugin 9p4/SSO-Auth con proveedor OIDC de Authentik ✅
  - URL de acceso directo: `https://media.theikaz.com/sso/OID/start/authentik`
  - Caddy envía `X-Forwarded-Proto: https` para que Jellyfin use HTTPS en las URLs de callback

### ~~Fase 4 — Estabilidad y backups~~ ✅ — 25 marzo 2026

- `scripts/backup.sh` — backup semanal a Google Drive (`gdrive:HomeCore-backups`) con Rclone, retención 4 semanas
- `scripts/restore.sh` — restauración interactiva desde Drive
- Watchtower descartado (riesgo de actualizaciones automáticas no controladas)
- Cron en la Pi: cada domingo a las 03:00

Qué incluye el backup:
- `pg_dump` de PostgreSQL (base de datos de Authentik)
- SQLite de HomeCore
- Config de Jellyfin
- Caddyfile

### ~~Fase 5 — Experiencia de usuario~~ ✅ — 25 marzo 2026

- **5.1 Sesión unificada Jellyfin** — no era bug. Con sesión activa el SSO funciona sin pedir login.
- **5.2 HomeCore como único punto de entrada** — configurado en Authentik → System → Brands → Default application → HomeCore.
- **5.3 Acceso rápido a Authentik desde HomeCore (solo admin)** — tile "Administración" con `grupos_requeridos=admin`.
- **5.5 Estados de carga en React** — spinner "Cargando..." en Dashboard, InventarioLista, Agotados y ListaCompra.
- **5.6 Diálogos de confirmación propios** — componente `ConfirmDialog` reutilizable. Sustituye `confirm()` nativo.

### ~~Fase 6.1 — Alta de usuarios (solo admin)~~ ✅ — 25 marzo 2026

**Flujo:**
1. Admin abre el tile "Invitar usuario" en HomeCore (solo visible para admin).
2. Rellena el formulario: nombre completo, nombre de usuario, contraseña inicial y grupo (Familia / Admin).
3. HomeCore llama a la API de Authentik con el token de admin para:
   - Crear el usuario (`POST /api/v3/core/users/`)
   - Asignarlo al grupo correspondiente (`POST /api/v3/core/groups/{pk}/add_user/`)
   - Establecer la contraseña (`POST /api/v3/core/users/{pk}/set_password/`)
4. Si todo va bien, el formulario muestra "Usuario creado correctamente" y se limpia.
5. El admin comparte las credenciales con el usuario manualmente.
6. El usuario entra en `homecore.theikaz.com` con esas credenciales.
7. Para cambiar la contraseña, el usuario va al tile "Mi cuenta" → `auth.theikaz.com/if/user/`.

**Requisitos técnicos:**
- `AUTHENTIK_API_TOKEN` en el `.env` de la Pi (token de admin de Authentik, sin caducidad).
- Variable `AUTHENTIK_API_TOKEN` inyectada en el contenedor de HomeCore en el `docker-compose.yml`.
- No requiere ninguna configuración adicional en Authentik (sin enrollment flows, sin recovery flows).

**Tile "Mi cuenta":**
- Visible para todos los usuarios del grupo Familia.
- Enlaza a `https://auth.theikaz.com/if/user/` — panel de usuario de Authentik.
- Desde ahí el usuario puede cambiar su contraseña, ver sus apps y gestionar sus tokens.
- Los usuarios del grupo Familia no tienen permisos de admin — solo ven sus propias opciones.

---

---

## Roadmap — Pasos futuros

### ~~Fase 6.2 — Persistencia de sesión~~ ✅ — 25 marzo 2026

Configurado en Authentik → Flows & Stages → Stage `default-authentication-login`:
- **Session duration**: `days=30`
- **Remember me offset**: `days=30`

Sin cambios de código. Los nuevos logins duran 30 días.

### ~~Fase 7 — Lista de la compra en tiempo real~~ ✅ — 25 marzo 2026

Polling cada 10 segundos en `ListaCompra.jsx` con `setInterval` + limpieza en el unmount. Sin cambios en el backend.

### ~~Fase 8 — App móvil / PWA~~ ✅ — 25 marzo 2026

- `public/manifest.json` — nombre, colores, display standalone
- `public/sw.js` — service worker con cache-first para estáticos, network-first para `/api/`
- `public/icon.svg` + `generate-icons.js` — icono SVG convertido a PNG (192 y 512px) con `sharp` en el prebuild
- Registrado en `main.jsx` e inyectado en `index.html`
- Instalable desde Chrome (Android) y Safari (iOS) con "Añadir a pantalla de inicio"

### ~~Fase 9 — Monitorización de la Pi (solo admin)~~ ✅ — 25 marzo 2026

Página `/admin/sistema` visible solo para admin con:
- CPU, RAM, temperatura y disco con barras de progreso y colores dinámicos (verde/naranja/rojo según nivel)
- Sparklines SVG con historial de los últimos 2 minutos
- Polling cada 5 segundos con `psutil` en el backend

### ~~Fase 10 — Documento técnico de arquitectura detallado~~ ✅ — 25 marzo 2026

`docs/arquitectura_tecnica.md` — 1061 líneas, 14 secciones con diagramas Mermaid:
- Flujos de petición, forward auth, OIDC, backup y service worker
- Arquitectura interna Flask + React con blueprints y rutas
- Schema de base de datos SQLite
- Mapa de volúmenes SSD → contenedores
- Guía paso a paso para añadir nuevos servicios

---

## Ideas de futuras aplicaciones en HomeCore

Módulos que podrían añadirse como tiles al dashboard en el futuro:

| Aplicación | Descripción |
|---|---|
| **Gastos domésticos** | Registrar gastos del hogar, categorías, histórico mensual y presupuesto. Extensión natural del módulo de inventario. |
| **Recetas / menú semanal** | Planificador de menús que al confirmar el menú de la semana añada automáticamente los ingredientes que falten a la lista de la compra. |
| **Tareas del hogar** | Lista de tareas compartida con asignación por persona y recordatorios. |
| **Calendario familiar** | Eventos compartidos visibles por todos los miembros. Podría integrarse con un servidor CalDAV propio (p. ej. Radicale). |
| **Panel de descargas** | Interfaz para gestionar descargas (p. ej. integración con qBittorrent) directamente desde HomeCore. |
| **Fotos familiares** | Galería privada de fotos accesible desde cualquier dispositivo. Podría integrarse con Immich (alternativa self-hosted a Google Fotos). |
| **Notificaciones de stock** | Aviso automático (push o email vía Ntfy) cuando un producto del inventario llega al umbral de agotado. |
| **Gestor de contraseñas** | Integración con Vaultwarden (Bitwarden self-hosted) como tile de acceso rápido. |

---

## Subdominios configurados

| URL | Servicio | Estado |
|---|---|---|
| `auth.theikaz.com` | Authentik | ✅ Operativo |
| `homecore.theikaz.com` | HomeCore dashboard | ✅ Operativo |
| `files.theikaz.com` | Filebrowser | ✅ Operativo |
| `media.theikaz.com` | Jellyfin | ✅ Operativo |

---

## Variables de entorno necesarias (`.env` en la Pi)

```
DOMINIO=theikaz.com
AUTHENTIK_SECRET_KEY=<openssl rand -hex 32>
AUTHENTIK_DB_NAME=authentik
AUTHENTIK_DB_USER=authentik
AUTHENTIK_DB_PASSWORD=<openssl rand -hex 16>
AUTHENTIK_BOOTSTRAP_EMAIL=admin@theikaz.com
AUTHENTIK_BOOTSTRAP_PASSWORD=<contraseña segura>
CLOUDFLARE_TUNNEL_TOKEN=<token del panel de Cloudflare>
AUTHENTIK_API_TOKEN=<token de API de Authentik — sin caducidad>
```

---

## Comandos de operación en la Pi

> **IMPORTANTE:** Leer esta sección antes de tocar cualquier contenedor.

### Por qué importa el comando exacto

El `docker-compose.yml` usa rutas relativas para los volúmenes (`../authentik/`, `../caddy/`, `../homecore/`). Docker Compose resuelve esas rutas relativas **desde el directorio del fichero compose**, no desde el directorio de trabajo. Si se ejecuta el comando con una ruta distinta a la que se usó al crear los contenedores por primera vez, los volúmenes apuntan a directorios distintos y los datos (base de datos de Authentik, SQLite de HomeCore) parecen desaparecer — en realidad están en otra ruta.

### Actualizar código y reconstruir HomeCore

Este es el comando de uso habitual para desplegar cambios:

```bash
cd /srv/homecore/homecore && git pull && docker compose -f compose/docker-compose.yml --env-file /srv/homecore/compose/.env up -d --build homecore
```

### Arrancar o actualizar todos los servicios

```bash
docker compose -f /srv/homecore/homecore/compose/docker-compose.yml --env-file /srv/homecore/compose/.env up -d
```

### Ver logs de un servicio

```bash
docker compose -f /srv/homecore/homecore/compose/docker-compose.yml --env-file /srv/homecore/compose/.env logs -f homecore
```

### Parar todos los servicios

```bash
docker compose -f /srv/homecore/homecore/compose/docker-compose.yml --env-file /srv/homecore/compose/.env down
```

### Insertar app en la BD existente (cuando el seed ya se ejecutó)

```bash
docker exec homecore-app sqlite3 /data/homecore.db "INSERT INTO apps (nombre, nombre_visible, url, icono, grupos_requeridos) VALUES ('nombre', 'Nombre visible', 'https://...', 'IconoLucide', 'familia');"
```

### Acceso de emergencia a Authentik

Si el túnel de Cloudflare falla o `auth.theikaz.com` no responde, Authentik es accesible directamente vía ZeroTier:

```
http://10.147.18.210:9000/if/admin/
```

### Rutas de datos persistentes en el SSD

| Dato | Ruta real en el SSD |
|---|---|
| Base de datos de Authentik (PostgreSQL) | `/srv/homecore/homecore/authentik/postgresql/` |
| Media y templates de Authentik | `/srv/homecore/homecore/authentik/media/` |
| Certificados TLS de Authentik | `/srv/homecore/homecore/authentik/certs/` |
| Datos y config de Caddy | `/srv/homecore/homecore/caddy/data/` |
| Base de datos SQLite de HomeCore | `/srv/homecore/homecore/homecore/data/homecore.db` |
| Archivos de usuario (Filebrowser) | `/srv/homecore/homecore/filebrowser/data/` |
| Config de Jellyfin | `/srv/homecore/homecore/jellyfin/config/` |

---

## Para continuar en la próxima sesión

Pasar al asistente:
- Este fichero `docs/progreso.md`
- El fichero `docs/arquitectura.md`
- Indicar el tema a tratar (próximo: Fase 6.2 — persistencia de sesión)
