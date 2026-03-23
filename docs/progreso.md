# HomeCore V2 — Estado del proyecto

**Última actualización: Marzo 2026**
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

---

## Qué falta

### Fase 3 — Servicios de contenido
Añadir al `docker-compose.yml`:
- **Nextcloud** + PostgreSQL propio (o reutilizar el de Authentik en BD separada)
- **Jellyfin**
- **Paperless-ngx** + Redis propio (o reutilizar)

Descomentar en el `Caddyfile`:
- `files.theikaz.com` → Nextcloud
- `media.theikaz.com` → Jellyfin
- `docs.theikaz.com` → Paperless

Configurar SSO con Authentik en cada servicio (OIDC para Nextcloud y Paperless, plugin para Jellyfin).

### Fase 4 — Estabilidad y backups
- `scripts/backup.sh` — Restic + Rclone
- `scripts/restore.sh` — procedimiento de restauración
- Añadir **Watchtower** al docker-compose para actualizaciones automáticas de contenedores

### Pendiente fuera del código
- Registrar dominio `theikaz.com` en Cloudflare (bloqueado temporalmente por cuenta nueva)
- Obtener token del túnel de Cloudflare (Zero Trust > Tunnels)
- Rellenar `.env` en la Pi con valores reales y arrancar los contenedores
- Configuración manual post-arranque de Authentik:
  - Crear grupos `familia` y `admin`
  - Crear usuarios
  - Configurar outpost de forward auth (para que Caddy pueda delegar en Authentik)
  - Configurar OIDC para Nextcloud y Paperless

---

## Subdominios configurados

| URL | Servicio | Estado |
|---|---|---|
| `auth.theikaz.com` | Authentik | Listo en Caddyfile |
| `homecore.theikaz.com` | HomeCore dashboard | Listo en Caddyfile |
| `files.theikaz.com` | Nextcloud | Comentado — Fase 3 |
| `media.theikaz.com` | Jellyfin | Comentado — Fase 3 |
| `docs.theikaz.com` | Paperless-ngx | Comentado — Fase 3 |

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

## Para continuar en la próxima sesión

Pasar al asistente:
- Este fichero `docs/progreso.md`
- El fichero `docs/arquitectura.md`
- Indicar por qué fase continuar (Fase 3 recomendada)
