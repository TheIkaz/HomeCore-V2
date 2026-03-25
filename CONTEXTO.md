# HomeCore — Guía de contexto para nuevas sesiones

Este fichero es el punto de entrada para cualquier sesión nueva.
Lee en este orden antes de hacer nada.

---

## 1. Documentos a leer

| Orden | Fichero | Por qué |
|---|---|---|
| 1 | `docs/progreso.md` | Estado actual del proyecto: qué está hecho, qué falta, comandos de operación |
| 2 | `docs/arquitectura.md` | Visión completa del sistema: hardware, stack, fases, autenticación |
| 3 | `docs/conexiones.md` | Referencia técnica detallada: cómo está configurado cada servicio, variables de entorno, diagnóstico |
| 4 | `caddy/Caddyfile` | Configuración real del reverse proxy |
| 5 | `compose/docker-compose.yml` | Todos los servicios, volúmenes y redes |

---

## 2. Estado actual (25 marzo 2026)

**Fases completadas:**
- ✅ Fase 1 — Infraestructura base (Caddy + Authentik + Cloudflare Tunnel)
- ✅ Fase 2 — HomeCore dashboard (Flask + React, inventario, catálogo de apps)
- ✅ Fase 3 — Servicios de contenido (Filebrowser + Jellyfin con SSO)

**Sistema en producción en:** Raspberry Pi 4 · 8 GB RAM · SSD 1 TB

**Servicios operativos:**

| URL | Servicio | Auth |
|---|---|---|
| `https://auth.theikaz.com` | Authentik (SSO) | — |
| `https://homecore.theikaz.com` | HomeCore dashboard | Forward auth |
| `https://files.theikaz.com` | Filebrowser | Forward auth |
| `https://media.theikaz.com` | Jellyfin | SSO via plugin OIDC |

---

## 3. Próximo trabajo — Fase 4

- `scripts/backup.sh` — Restic + Rclone (backups incrementales cifrados)
- `scripts/restore.sh` — procedimiento de restauración
- Añadir **Watchtower** al docker-compose para actualizaciones automáticas
- Crear usuarios adicionales en Authentik para la familia

---

## 4. Cosas importantes a tener en cuenta

### Comandos en la Pi
Siempre usar el comando canónico con rutas absolutas:
```bash
docker compose \
  -f /srv/homecore/homecore/compose/docker-compose.yml \
  --env-file /srv/homecore/compose/.env \
  up -d
```
Las rutas relativas en el compose resuelven desde el directorio del fichero, no desde donde se ejecuta el comando.

### Actualizar código en la Pi
```bash
cd /srv/homecore/homecore && git pull
docker compose \
  -f /srv/homecore/homecore/compose/docker-compose.yml \
  --env-file /srv/homecore/compose/.env \
  up -d --build homecore
```

### Caddyfile — problema de inode
Cuando git reemplaza el Caddyfile, Docker puede retener el inode antiguo. Si un subdominio muestra página en blanco tras un `git pull`, forzar recreación:
```bash
docker compose \
  -f /srv/homecore/homecore/compose/docker-compose.yml \
  --env-file /srv/homecore/compose/.env \
  up -d --force-recreate caddy
```

### Jellyfin SSO
- URL de acceso directo: `https://media.theikaz.com/sso/OID/start/authentik`
- El Authorization flow del provider OIDC debe ser `default-provider-authorization-implicit-consent`
- La sesión de Authentik se comparte: iniciar sesión en HomeCore da acceso directo a Jellyfin sin login adicional

### El `.env` nunca está en Git
Vive en `/srv/homecore/compose/.env` en la Pi. Nunca en el repositorio.

---

## 5. Código fuente relevante

| Fichero | Qué hace |
|---|---|
| `homecore/api/utils/auth.py` | Lee las cabeceras `X-Authentik-*` y extrae usuario y grupos |
| `homecore/api/blueprints/apps.py` | `GET /api/apps/catalogo` — filtra apps por grupo del usuario |
| `homecore/api/database.py` | SQLite: tablas `apps` y `productos`, seed inicial |
| `homecore/web/src/pages/Dashboard.jsx` | Grid de apps dinámico cargado desde la API |
