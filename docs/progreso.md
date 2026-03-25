# HomeCore V2 — Estado del proyecto

**Última actualización: 25 marzo 2026 (madrugada)**
Repo: https://github.com/TheIkaz/HomeCore-V2

---

## Qué está hecho

### Infraestructura base
- Repositorio GitHub creado: `TheIkaz/HomeCore-V2`
- `.gitignore`, `README.md` y estructura de carpetas
- `compose/docker-compose.yml` con todos los servicios de Fase 1 y 2:
  - PostgreSQL + Redis (base para Authentik)
  - Authentik server + worker (SSO)
  - Caddy (reverse proxy, forward auth)
  - cloudflared (Cloudflare Tunnel)
  - HomeCore (Flask + React)
- `compose/docker-compose.example.env` — plantilla con todas las variables necesarias
- `caddy/Caddyfile` — enrutamiento por subdominio para `theikaz.com`, snippet de forward auth, bloques comentados para Fase 3
- `scripts/setup.sh` — script para preparar la Pi (directorios, .env, verificar Docker)

### HomeCore — backend Flask (`homecore/api/`)
- `database.py` — SQLite con tablas `apps` y `productos`, seed con apps iniciales
- `utils/auth.py` — lee identidad desde cabeceras `X-Authentik-*` (sin JWT propio)
- `blueprints/apps.py` — `GET /api/apps/catalogo` filtrado por grupos del usuario
- `blueprints/inventario.py` — CRUD completo (listar, agotados, lista-compra, buscar, crear, editar, modificar, eliminar)
- `blueprints/configuracion.py` — gestión del catálogo de apps (solo admin)
- `wsgi.py` — punto de entrada para Gunicorn

### HomeCore — frontend React (`homecore/web/`)
- Vite + React Router + lucide-react
- `Dashboard` — grid de apps cargado dinámicamente desde `/api/apps/catalogo`
- `Layout` — sidebar con navegación
- Módulo `Inventario` completo: lista, agotados, lista de la compra, formulario alta/edición
- `api/client.js`, `api/apps.js`, `api/inventario.js` — capa de llamadas a la API
- CSS modules con tema oscuro

### Docker
- `homecore/Dockerfile` — build multi-etapa: Node construye React, Python sirve todo con Gunicorn

### Navegación y Dashboard
- Sidebar eliminado — sustituido por barra superior fina con icono de casa (→ `/`)
- Dashboard muestra el catálogo de apps dinámico: Inventario (interno), Archivos, Media, Documentos
- URLs internas usan React Router Link; URLs externas abren en nueva pestaña
- Fix: grupos de Authentik llegan en formato `Nombre|slug` — se parsea el slug correctamente

### Despliegue en producción (✅ COMPLETADO — 24 marzo 2026)
- Sistema desplegado en Raspberry Pi 4 (8GB, 1TB SSD en `/srv/homecore`)
- Cloudflare Tunnel conectado y enrutando tráfico
- `https://auth.theikaz.com` — Authentik operativo, login funcionando
- `https://homecore.theikaz.com` — Dashboard accesible con SSO vía forward auth
- Grupos `familia` y `admin` creados en Authentik
- Outpost: usar **authentik Embedded Outpost** (no crear outpost personalizado)

---

## Qué falta

### Mejoras pendientes — HomeCore dashboard

~~1. **Refresco de página devuelve 404**~~ ✅ — `static_folder=None` en Flask; el catch-all sirve siempre `index.html`.
~~2. **Botones +/− de cantidad en el inventario**~~ ✅ — Añadidos en la columna Cantidad de `InventarioLista`.
~~3. **Lista de la compra mejorada**~~ ✅ — Campo de cantidad a comprar, actualización de stock al marcar comprado, panel para añadir artículos manuales.
~~4. **Botones de navegación Atrás**~~ ✅ — Añadidos en `InventarioLista`, `Agotados` y `ListaCompra`.
~~5. **ID automático al crear producto**~~ ✅ — Backend genera UUID4; formulario ya no muestra el campo ID.

---

### ~~Fase 3 — Servicios de contenido~~ ✅ COMPLETADA — 25 marzo 2026

Servicios añadidos al `docker-compose.yml`:
- **Filebrowser** — explorador de ficheros web. Subir, descargar y organizar ficheros en el SSD desde el navegador. Forward auth de Authentik (sin login propio). ✅
- **Jellyfin** — streaming de media. Monta la carpeta `media/` de Filebrowser como biblioteca de solo lectura. ✅

Flujo de uso:
1. El usuario sube archivos a `files.theikaz.com` (Filebrowser)
2. Jellyfin detecta automáticamente los nuevos archivos en su biblioteca

SSO:
- Filebrowser: forward auth de Caddy ✅
- Jellyfin: plugin 9p4/SSO-Auth con proveedor OIDC de Authentik ✅
  - URL de acceso directo: `https://media.theikaz.com/sso/OID/start/authentik`
  - Caddy envía `X-Forwarded-Proto: https` para que Jellyfin use HTTPS en las URLs de callback

### Fase 4 — Estabilidad y backups
- `scripts/backup.sh` — Restic + Rclone
- `scripts/restore.sh` — procedimiento de restauración
- Añadir **Watchtower** al docker-compose para actualizaciones automáticas de contenedores

### Pendiente fuera del código
- ~~Registrar dominio `theikaz.com` en Cloudflare~~ ✅
- ~~Obtener token del túnel de Cloudflare~~ ✅
- ~~Rellenar `.env` en la Pi y arrancar contenedores~~ ✅
- ~~Configuración manual de Authentik (grupos, outpost)~~ ✅
- ~~Desplegar Filebrowser y Jellyfin~~ ✅
- ~~Configurar SSO de Jellyfin con Authentik~~ ✅
- Crear usuarios adicionales en Authentik (familia)

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
```

---

## Comandos de operación en la Pi

> **IMPORTANTE:** Leer esta sección antes de tocar cualquier contenedor.

### Por qué importa el comando exacto

El `docker-compose.yml` usa rutas relativas para los volúmenes (`../authentik/`, `../caddy/`, `../homecore/`). Docker Compose resuelve esas rutas relativas **desde el directorio del fichero compose**, no desde el directorio de trabajo. Si se ejecuta el comando con una ruta distinta a la que se usó al crear los contenedores por primera vez, los volúmenes apuntan a directorios distintos y los datos (base de datos de Authentik, SQLite de HomeCore) parecen desaparecer — en realidad están en otra ruta.

El comando canónico que se usó para el despliegue inicial y que **debe usarse siempre** es:

```bash
docker compose \
  -f /srv/homecore/homecore/compose/docker-compose.yml \
  --env-file /srv/homecore/compose/.env \
  up -d
```

Con este comando:
- El fichero compose se lee desde el repo (`/srv/homecore/homecore/compose/`)
- Las variables de entorno se leen desde `/srv/homecore/compose/.env` (nunca en el repo)
- Los volúmenes resuelven a `/srv/homecore/homecore/authentik/`, `/srv/homecore/homecore/caddy/`, etc.

### Comandos habituales

**Arrancar o actualizar todos los servicios:**
```bash
docker compose \
  -f /srv/homecore/homecore/compose/docker-compose.yml \
  --env-file /srv/homecore/compose/.env \
  up -d
```

**Actualizar código y reconstruir solo HomeCore:**
```bash
cd /srv/homecore/homecore && git pull
docker compose \
  -f /srv/homecore/homecore/compose/docker-compose.yml \
  --env-file /srv/homecore/compose/.env \
  up -d --build homecore
```

**Ver logs de un servicio:**
```bash
docker compose \
  -f /srv/homecore/homecore/compose/docker-compose.yml \
  --env-file /srv/homecore/compose/.env \
  logs -f homecore
```

**Parar todos los servicios:**
```bash
docker compose \
  -f /srv/homecore/homecore/compose/docker-compose.yml \
  --env-file /srv/homecore/compose/.env \
  down
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
| Base de datos SQLite de HomeCore | `/srv/homecore/homecore/homecore/data/` |

---

## Para continuar en la próxima sesión

Pasar al asistente:
- Este fichero `docs/progreso.md`
- El fichero `docs/arquitectura.md`
- Indicar por qué fase continuar (Fase 3 recomendada)
