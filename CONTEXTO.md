# HomeCore — Guía de contexto para nuevas sesiones

Este fichero es el punto de entrada para cualquier sesión nueva.
Lee en este orden antes de hacer nada.

---

## 1. Documentos a leer

| Orden | Fichero | Por qué |
|---|---|---|
| 1 | `docs/progreso.md` | Estado actual: qué está hecho, roadmap, comandos de operación |
| 2 | `docs/arquitectura.md` | Visión completa: hardware, stack, autenticación, módulos |
| 3 | `docs/conexiones.md` | Referencia técnica detallada: configuración de cada servicio, diagnóstico |
| 4 | `caddy/Caddyfile` | Configuración real del reverse proxy |
| 5 | `compose/docker-compose.yml` | Todos los servicios, volúmenes y redes |

---

## 2. Estado actual (25 marzo 2026)

**Fases completadas:**
- ✅ Fase 1 — Infraestructura base (Caddy + Authentik + Cloudflare Tunnel)
- ✅ Fase 2 — HomeCore dashboard (Flask + React, inventario, catálogo de apps)
- ✅ Fase 3 — Servicios de contenido (Filebrowser + Jellyfin con SSO)
- ✅ Fase 4 — Backups semanales a Google Drive (Rclone)
- ✅ Fase 5 — UX: estados de carga, modal de confirmación, HomeCore como punto de entrada único, tile de admin
- ✅ Fase 6.1 — Alta de usuarios desde HomeCore (formulario admin → API Authentik → usuario creado con contraseña)
- ✅ Fase 6.2 — Persistencia de sesión (Login Stage → 30 días)

**Próxima fase:** 7 — Lista de la compra en tiempo real

**Sistema en producción en:** Raspberry Pi 4 · 8 GB RAM · SSD 1 TB

**Servicios operativos:**

| URL | Servicio | Auth |
|---|---|---|
| `https://auth.theikaz.com` | Authentik (SSO) | — |
| `https://homecore.theikaz.com` | HomeCore dashboard | Forward auth |
| `https://files.theikaz.com` | Filebrowser | Forward auth |
| `https://media.theikaz.com` | Jellyfin | SSO via plugin OIDC |

---

## 3. Cosas importantes a tener en cuenta

### Comando para actualizar código en la Pi

```bash
cd /srv/homecore/homecore && git pull && docker compose -f compose/docker-compose.yml --env-file /srv/homecore/compose/.env up -d --build homecore
```

### Arrancar o actualizar todos los servicios

```bash
docker compose -f /srv/homecore/homecore/compose/docker-compose.yml --env-file /srv/homecore/compose/.env up -d
```

### Caddyfile — problema de inode
Cuando git reemplaza el Caddyfile, Docker puede retener el inode antiguo. Si un subdominio muestra página en blanco tras un `git pull`, forzar recreación:
```bash
docker compose -f /srv/homecore/homecore/compose/docker-compose.yml --env-file /srv/homecore/compose/.env up -d --force-recreate caddy
```

### Jellyfin SSO
- URL de acceso directo: `https://media.theikaz.com/sso/OID/start/authentik`
- El Authorization flow del provider OIDC debe ser `default-provider-authorization-implicit-consent`
- La sesión de Authentik se comparte: iniciar sesión en HomeCore da acceso directo a Jellyfin sin login adicional

### El `.env` nunca está en Git
Vive en `/srv/homecore/compose/.env` en la Pi. Plantilla en `compose/docker-compose.example.env`.

### Insertar app en la BD existente
El seed solo corre cuando la tabla `apps` está vacía. Para añadir apps a una instalación existente:
```bash
docker exec homecore-app sqlite3 /data/homecore.db "INSERT INTO apps (nombre, nombre_visible, url, icono, grupos_requeridos) VALUES ('nombre', 'Nombre visible', 'https://...', 'IconoLucide', 'familia');"
```

---

## 4. Código fuente relevante

| Fichero | Qué hace |
|---|---|
| `homecore/api/utils/auth.py` | Lee cabeceras `X-Authentik-*`, extrae usuario y grupos |
| `homecore/api/blueprints/apps.py` | `GET /api/apps/catalogo` — filtra apps por grupo del usuario |
| `homecore/api/blueprints/admin.py` | `POST /api/admin/invitar` — crea usuario en Authentik vía API |
| `homecore/api/database.py` | SQLite: tablas `apps` y `productos`, seed inicial |
| `homecore/web/src/pages/Dashboard.jsx` | Grid de apps dinámico cargado desde la API |
| `homecore/web/src/pages/Admin/Invitar.jsx` | Formulario de alta de usuarios (solo admin) |
