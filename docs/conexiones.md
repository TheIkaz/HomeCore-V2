# HomeCore V2 — Mapa de conexiones internas

**Versión 1.0 · Marzo 2026**
Referencia técnica permanente de todas las integraciones del sistema.

---

## 1. Flujo completo de una petición

```
Usuario (navegador)
  └─▶ Cloudflare (TLS termination, HTTPS)
        └─▶ cloudflared (túnel saliente desde la Pi)
              └─▶ Caddy :80 (HTTP interno)
                    ├─▶ Authentik :9000 (forward auth — valida sesión)
                    │     └─▶ redirige a login si no hay sesión
                    └─▶ Servicio destino (HomeCore, Nextcloud, etc.)
                          └─▶ respuesta al usuario
```

Caddy **nunca** reenvía una petición al servicio destino sin que Authentik la haya validado primero (excepto `auth.theikaz.com`, que es el propio Authentik).

---

## 2. Cloudflare Tunnel

| Parámetro | Valor |
|---|---|
| Contenedor | `homecore-cloudflared` |
| Imagen | `cloudflare/cloudflared:latest` |
| Variable de entorno | `TUNNEL_TOKEN=${CLOUDFLARE_TUNNEL_TOKEN}` |
| Fuente del token | `.env` en `/srv/homecore/compose/.env` |
| Comando | `tunnel --no-autoupdate run` |
| Protocolo hacia la Pi | HTTP (Cloudflare termina TLS antes) |

**Cómo funciona:** cloudflared establece una conexión saliente cifrada a los servidores de Cloudflare. No abre ningún puerto en el router. Todo el tráfico entra por ese túnel.

**Si cloudflared no arranca:** verificar que `CLOUDFLARE_TUNNEL_TOKEN` esté en el `.env` y que el token sea válido en el panel de Cloudflare (Zero Trust → Tunnels).

---

## 3. Caddy — reverse proxy

| Parámetro | Valor |
|---|---|
| Contenedor | `homecore-caddy` |
| Imagen | `caddy:2` |
| Caddyfile en el repo | `caddy/Caddyfile` |
| Caddyfile en la Pi | `/srv/homecore/homecore/caddy/Caddyfile` (fichero físico, **no symlink**) |
| Variable de entorno | `DOMINIO=${DOMINIO}` (ej. `theikaz.com`) |
| Puerto expuesto | `80` y `443` (TLS lo gestiona Cloudflare, no Caddy) |

### Snippet de forward auth

```caddy
(autenticacion) {
    forward_auth authentik-server:9000 {
        uri /outpost.goauthentik.io/auth/caddy
        copy_headers X-Authentik-Username X-Authentik-Groups X-Authentik-Email \
                     X-Authentik-Name X-Authentik-Uid
        trusted_proxies private_ranges
    }
}
```

Todos los subdominios protegidos incluyen `import autenticacion`. El subdominio `auth.{$DOMINIO}` **no** lo incluye (es el propio proveedor de identidad).

### Subdominios configurados

| Subdominio | Destino interno | Forward auth |
|---|---|---|
| `auth.theikaz.com` | `authentik-server:9000` | No |
| `homecore.theikaz.com` | `homecore:5000` | Sí |
| `files.theikaz.com` | `nextcloud:80` | No (SSO nativo OIDC) — Fase 3 |
| `media.theikaz.com` | `jellyfin:8096` | No (plugin SSO) — Fase 3 |
| `docs.theikaz.com` | `paperless:8000` | No (SSO nativo OIDC) — Fase 3 |

---

## 4. Authentik — proveedor de identidad SSO

| Parámetro | Valor |
|---|---|
| Contenedor servidor | `homecore-authentik-server` |
| Contenedor worker | `homecore-authentik-worker` |
| Imagen | `ghcr.io/goauthentik/server:2024.12` |
| Puerto expuesto | `9000` (acceso directo vía ZeroTier para admin) |
| Acceso admin externo | `https://auth.theikaz.com/if/admin/` |
| Acceso admin emergencia | `http://10.147.18.210:9000/if/admin/` (ZeroTier) |
| Base de datos | PostgreSQL en `homecore-postgresql:5432` |

### Variables de entorno requeridas en `.env`

```
AUTHENTIK_SECRET_KEY=<openssl rand -hex 32>
AUTHENTIK_DB_NAME=authentik
AUTHENTIK_DB_USER=authentik
AUTHENTIK_DB_PASSWORD=<secreto>
AUTHENTIK_BOOTSTRAP_EMAIL=admin@theikaz.com
AUTHENTIK_BOOTSTRAP_PASSWORD=<contraseña inicial>
```

> `AUTHENTIK_BOOTSTRAP_*` solo se aplican la **primera vez** que Authentik arranca con una base de datos vacía. En reinicios posteriores se ignoran — las credenciales están en la base de datos persistida.

### Outpost

- Usar siempre el **Embedded Outpost** (ya integrado en `authentik-server`).
- **No crear un outpost personalizado.**
- El endpoint de forward auth que usa Caddy es `/outpost.goauthentik.io/auth/caddy`, servido por el embedded outpost en el mismo contenedor `authentik-server:9000`.

### Formato de las cabeceras de identidad

Authentik inyecta estas cabeceras en cada petición validada:

| Cabecera | Contenido | Ejemplo |
|---|---|---|
| `X-Authentik-Username` | Login del usuario | `akadmin` |
| `X-Authentik-Email` | Email | `admin@theikaz.com` |
| `X-Authentik-Name` | Nombre completo | `Admin` |
| `X-Authentik-Groups` | Grupos en formato `Nombre\|slug` separados por coma | `authentik Admins\|admin,Familia\|familia` |
| `X-Authentik-Uid` | UUID interno del usuario | `abc123...` |

> **IMPORTANTE — formato de grupos:** Authentik envía cada grupo como `Nombre visible|slug`. El código de HomeCore extrae el **slug** (parte después de `|`) para comparar con `grupos_requeridos`. Ver `homecore/api/utils/auth.py`.

### Grupos del sistema

| Grupo (slug) | Nombre en Authentik | Acceso |
|---|---|---|
| `familia` | Familia | Apps del catálogo HomeCore |
| `admin` | authentik Admins | Todo lo anterior + funciones de admin |

> `akadmin` debe pertenecer al grupo `admin` (no solo ser superusuario). Verificar en **Directory → Users → akadmin → Groups**.

---

## 5. HomeCore — Flask + React

| Parámetro | Valor |
|---|---|
| Contenedor | `homecore-app` |
| Puerto interno | `5000` |
| Variable de entorno | `DATABASE_PATH=/data/homecore.db` |
| Base de datos | SQLite en `/data/homecore.db` dentro del contenedor |
| Ruta real en la Pi | `/srv/homecore/homecore/homecore/data/homecore.db` |

### Cómo lee la identidad del usuario

`homecore/api/utils/auth.py` lee las cabeceras inyectadas por Authentik/Caddy:

```python
grupos_raw = request.headers.get("X-Authentik-Groups", "")
# Parsea "Nombre|slug" → extrae el slug
grupos = [entrada.split("|")[-1].strip() ... for entrada in grupos_raw.split(",")]
```

**HomeCore no tiene autenticación propia.** Si una petición llega a Flask, es porque Caddy ya validó la sesión con Authentik.

### Catálogo de apps (`apps` table en SQLite)

| Campo | Descripción |
|---|---|
| `nombre` | Identificador único |
| `nombre_visible` | Texto del icono en el dashboard |
| `url` | URL destino — si empieza por `/` es ruta interna de React Router; si empieza por `https://` abre en nueva pestaña |
| `icono` | Nombre del icono de `lucide-react` |
| `grupos_requeridos` | Slugs de grupos separados por coma (ej. `familia`) |
| `activo` | `1` visible, `0` oculto |

> El seed solo corre cuando la tabla `apps` está vacía. Si la BD ya existe, insertar manualmente con: `docker exec homecore-app sqlite3 /data/homecore.db "INSERT OR IGNORE INTO apps ..."`.

---

## 6. Red interna Docker

Todos los contenedores comparten la red `homecore` (bridge). Se comunican por nombre de servicio:

| Servicio | Host interno | Puerto |
|---|---|---|
| `authentik-server` | `authentik-server` | `9000` |
| `homecore` | `homecore` | `5000` |
| `postgresql` | `postgresql` | `5432` |
| `redis` | `redis` | `6379` |
| `caddy` | `caddy` | `80`, `443` |

---

## 7. Rutas de datos persistentes en la Pi

> Todas relativas al directorio del compose (`/srv/homecore/homecore/compose/`), que resuelve `../` a `/srv/homecore/homecore/`.

| Dato | Ruta en la Pi |
|---|---|
| Base de datos PostgreSQL (Authentik) | `/srv/homecore/homecore/authentik/postgresql/` |
| Media y templates de Authentik | `/srv/homecore/homecore/authentik/media/` |
| Certificados internos de Authentik | `/srv/homecore/homecore/authentik/certs/` |
| Datos y config de Caddy | `/srv/homecore/homecore/caddy/data/` |
| Caddyfile físico (no symlink) | `/srv/homecore/homecore/caddy/Caddyfile` |
| Base de datos SQLite de HomeCore | `/srv/homecore/homecore/homecore/data/homecore.db` |
| Fichero `.env` (nunca en Git) | `/srv/homecore/compose/.env` |

---

## 8. Diagnóstico rápido

### Dashboard vacío (sin apps)
1. Ir a `https://homecore.theikaz.com/api/apps/catalogo`
2. Si `usuario` está vacío → las cabeceras de Authentik no llegan (problema de outpost o Caddy)
3. Si `usuario` tiene valor pero `datos` está vacío → el usuario no tiene grupos asignados o los slugs no coinciden con `grupos_requeridos`
4. Solución: verificar en Authentik que el usuario pertenece al grupo `admin` o `familia`

### cloudflared en bucle de reinicios
- Causa más probable: `CLOUDFLARE_TUNNEL_TOKEN` vacío en el `.env`
- Verificar: `docker logs homecore-cloudflared`

### Authentik devuelve 404 en `/outpost.goauthentik.io/auth/caddy`
- El embedded outpost no tiene providers asignados o aún está inicializando
- Esperar 30 segundos tras el arranque y reintentar
- Si persiste: verificar en **Applications → Outposts** que el embedded outpost tiene el Proxy Provider asignado

### Contraseña de Authentik perdida
```bash
docker exec homecore-authentik-server ak shell -c "
from authentik.core.models import User
u = User.objects.get(username='akadmin')
u.set_password('nueva_contraseña')
u.save()
"
```
