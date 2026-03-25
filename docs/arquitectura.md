# HomeCore — Documento de Arquitectura

**Versión 1.3 · Marzo 2026**
Servidor privado doméstico — Raspberry Pi 4 · 8 GB RAM · SSD 1 TB

---

## 1. Visión general

HomeCore es un servidor privado doméstico cuyo objetivo es centralizar el acceso a aplicaciones y servicios del hogar bajo un único punto de entrada seguro, con gestión de usuarios unificada y sin depender de servicios externos de terceros para los datos personales.

El sistema está diseñado para:

- Ser accesible desde cualquier dispositivo de la familia, dentro y fuera de casa, sin exponer ningún puerto al exterior.
- Gestionar usuarios, sesiones y permisos desde un único panel de administración.
- Permitir añadir nuevas aplicaciones en el futuro sin rediseñar la arquitectura.
- Mantener todos los datos en almacenamiento local bajo control propio.

---

## 2. Hardware

| Componente | Especificación | Función |
|---|---|---|
| Placa principal | Raspberry Pi 4 — 8 GB RAM | Servidor principal. Ejecuta todos los servicios. |
| Almacenamiento OS | Tarjeta microSD | Solo sistema operativo. Sin datos de apps. |
| Almacenamiento datos | SSD externo USB — 1 TB | Toda la persistencia: configs, datos, media. |
| Sistema operativo | Raspberry Pi OS 64-bit | Base del sistema. Docker corre sobre él. |

> **Nota:** La tarjeta SD contiene exclusivamente el sistema operativo. Todos los datos de aplicaciones, configuraciones de Docker y archivos de usuario residen en el SSD. Esto es crítico: las SD degradan con escrituras intensivas.

---

## 3. Acceso remoto

El servidor no expone ningún puerto directamente a internet. El acceso remoto se resuelve con dos capas complementarias.

### 3.1 Cloudflare Tunnel — acceso de la familia

La Raspberry establece un túnel saliente cifrado hacia los servidores de Cloudflare. El tráfico de los usuarios entra por Cloudflare y llega a la Pi a través de ese túnel. Ningún puerto del router está abierto.

| Característica | Detalle |
|---|---|
| Coste | Gratuito con cuenta Cloudflare |
| Dominio | `theikaz.com` (dominio propio registrado en Cloudflare) |
| Fricción usuario | Ninguna — acceso por navegador, sin instalar apps |
| Seguridad | TLS extremo a extremo, la Pi nunca expone puertos |
| Quién lo usa | Toda la familia para acceso cotidiano |

### 3.2 ZeroTier — acceso de administración

ZeroTier crea una red virtual privada P2P cifrada. Se mantiene exclusivamente para el administrador del sistema (acceso SSH a la Pi, tareas de mantenimiento). La familia no necesita instalarlo.

| Característica | Detalle |
|---|---|
| Coste | Gratuito hasta 25 dispositivos |
| Fricción usuario | Requiere instalar app ZeroTier en el dispositivo admin |
| Uso | SSH, diagnóstico, acceso de bajo nivel a la Pi |
| IP de la Pi en ZeroTier | `10.147.18.210` |
| Quién lo usa | Solo el administrador del sistema |

---

## 4. Stack de software

Todos los servicios corren en contenedores Docker, orquestados con Docker Compose. Esto garantiza aislamiento, reproducibilidad y facilidad para añadir o actualizar servicios sin afectar al resto.

| Capa | Software elegido | Justificación |
|---|---|---|
| Contenedores | Docker + Docker Compose | Aislamiento de servicios, fácil despliegue y actualización. |
| Reverse proxy | Caddy | TLS automático, configuración simple, integración nativa con Authentik. |
| Autenticación | Authentik | SSO, gestión de usuarios con UI web, MFA, sesiones por dispositivo. |
| Hub / dashboard | HomeCore (Flask + React) | Desarrollo propio. Pantalla principal y módulos personalizados. |
| Archivos | Filebrowser | Explorador de ficheros web ligero. Subir y descargar contenido al SSD desde navegador o móvil. |
| Streaming media | Jellyfin | Películas y música. Libre, sin suscripción. SSO con Authentik via plugin. |
| Backups | Restic + Rclone | Backups incrementales cifrados con copia offsite. **Pendiente — Fase 4.** |

---

## 5. Arquitectura de red y flujo de acceso

### 5.1 Flujo de una petición

Toda petición sigue siempre el mismo camino, independientemente del servicio al que se acceda:

| Paso | Descripción |
|---|---|
| 1 — Dispositivo | El usuario abre el navegador y accede al dominio configurado. |
| 2 — Cloudflare Tunnel | La petición llega cifrada a la Pi a través del túnel. Ningún puerto expuesto. |
| 3 — Caddy | Recibe la petición. Según el subdominio, aplica forward auth (HomeCore, Filebrowser) o reenvía directamente (Jellyfin, Authentik). |
| 4 — Authentik | Si hay forward auth y no hay sesión, muestra la pantalla de login. Si la hay, confirma la identidad y devuelve las cabeceras del usuario. |
| 5 — Servicio destino | Caddy reenvía la petición al servicio correspondiente con las cabeceras de identidad incluidas. |
| 6 — Respuesta | El servicio responde. El usuario nunca abandona el dominio — todo pasa por Caddy. |

### 5.2 Subdominios

| Subdominio | Servicio | Autenticación |
|---|---|---|
| `auth.theikaz.com` | Authentik — login y panel de admin | Sin auth (es el propio proveedor) |
| `homecore.theikaz.com` | HomeCore — dashboard principal | Forward auth (Authentik) |
| `files.theikaz.com` | Filebrowser | Forward auth (Authentik) |
| `media.theikaz.com` | Jellyfin | SSO via plugin 9p4/SSO-Auth |

> **Nota:** Los servicios solo escuchan en la red interna de Docker. Nunca son accesibles directamente desde el exterior.

---

## 6. Autenticación y gestión de usuarios

### 6.1 Modelo SSO

Authentik actúa como proveedor de identidad único (SSO — Single Sign-On) para todo el sistema. Los usuarios existen una sola vez en Authentik. El resto de servicios no tienen su propio sistema de login — delegan en Authentik.

Hay dos mecanismos de integración según el servicio:

| Mecanismo | Servicios | Cómo funciona |
|---|---|---|
| **Forward auth** | HomeCore, Filebrowser | Caddy pregunta a Authentik si hay sesión antes de servir la petición. Sin OIDC. |
| **OIDC/OAuth2** | Jellyfin | El servicio redirige al navegador a Authentik. Authentik devuelve un token. |

### 6.2 Grupos y permisos

| Grupo (slug) | Nombre en Authentik | Acceso |
|---|---|---|
| `familia` | Familia | HomeCore, Filebrowser, Jellyfin |
| `admin` | authentik Admins | Todo lo anterior más el panel de administración de Authentik |

> `akadmin` debe pertenecer al grupo `admin` (no solo ser superusuario). Verificar en **Directory → Users → akadmin → Groups**.

### 6.3 Cabeceras de identidad (forward auth)

Authentik inyecta estas cabeceras en cada petición validada por forward auth:

| Cabecera | Contenido |
|---|---|
| `X-Authentik-Username` | Login del usuario |
| `X-Authentik-Email` | Email |
| `X-Authentik-Name` | Nombre completo |
| `X-Authentik-Groups` | Grupos en formato `Nombre\|slug` separados por coma |
| `X-Authentik-Uid` | UUID interno del usuario |

> **Formato de grupos:** cada grupo llega como `Nombre visible|slug`. HomeCore extrae el **slug** (parte después de `|`) para comparar con `grupos_requeridos`.

### 6.4 Sesión unificada

Cuando el usuario inicia sesión para acceder a HomeCore (forward auth), Authentik crea una cookie de sesión en `auth.theikaz.com`. Esta misma sesión es reutilizada cuando el usuario accede a Jellyfin via OIDC, por lo que no necesita volver a introducir credenciales.

**El flujo natural es:** entrar primero a HomeCore → la sesión queda activa → el resto de servicios SSO entran sin pedir login.

---

## 7. HomeCore — detalle del hub

### 7.1 Función

HomeCore es la pantalla principal del sistema. Su función es:
- Mostrar el catálogo de aplicaciones disponibles para el usuario según sus grupos.
- Alojar módulos propios desarrollados a medida (inventario, lista de la compra, etc.).
- Servir como punto de lanzamiento hacia los servicios externos (Filebrowser, Jellyfin).

### 7.2 Arquitectura interna

| Capa | Tecnología / descripción |
|---|---|
| Frontend | React (Vite) — SPA servida como ficheros estáticos |
| Backend API | Flask (Python) — blueprints por módulo |
| Base de datos | SQLite — catálogo de apps, datos de módulos propios |
| Contenedor | Docker — imagen Python + build de React (multi-etapa) |

### 7.3 Blueprints de la API

| Blueprint | Función |
|---|---|
| `/api/apps/catalogo` | Devuelve las apps disponibles para el usuario actual (filtra por grupos de Authentik) |
| `/api/inventario/*` | Módulo de inventario doméstico |
| `/api/configuracion/*` | Ajustes del sistema accesibles al admin |

### 7.4 Catálogo de apps

El catálogo es una tabla en SQLite que HomeCore consulta para saber qué apps existen y cuál es su URL.

| Campo | Descripción |
|---|---|
| `nombre` | Identificador único |
| `nombre_visible` | Texto que se muestra en el dashboard |
| `url` | URL destino. Si empieza por `/` es ruta interna de React Router. Si empieza por `https://` abre en nueva pestaña. |
| `icono` | Nombre del icono de `lucide-react` |
| `grupos_requeridos` | Slugs de grupos separados por coma (ej. `familia`) |
| `activo` | `1` visible, `0` oculto |

---

## 8. Servicios de contenido (Fase 3)

### 8.1 Filebrowser — archivos

| Aspecto | Detalle |
|---|---|
| Función | Explorador de ficheros web. Subir, descargar, crear carpetas y mover archivos en el SSD desde el navegador o el móvil. Actúa como cargador de contenido para Jellyfin. |
| Acceso | Navegador (escritorio y móvil). Sin app adicional. |
| Autenticación | Forward auth de Authentik vía Caddy. Filebrowser arranca con `--noauth` — Caddy es la única capa de auth. |
| Carpetas expuestas | `/srv/homecore/homecore/filebrowser/data/` — contiene subcarpeta `media/` que monta Jellyfin en solo lectura. |

### 8.2 Jellyfin — streaming de media

| Aspecto | Detalle |
|---|---|
| Función | Streaming de películas y música para la familia. |
| Acceso | Navegador, app móvil, app de Smart TV. |
| Autenticación | SSO via plugin **9p4/jellyfin-plugin-sso** con Authentik como proveedor OIDC. |
| URL de acceso SSO | `https://media.theikaz.com/sso/OID/start/authentik` |
| Authorization flow en Authentik | `default-provider-authorization-implicit-consent` (reutiliza sesión existente sin pedir login) |
| Header de proxy | Caddy envía `X-Forwarded-Proto: https` para que Jellyfin use HTTPS en las URLs de callback. |
| Bibliotecas | La carpeta `media/` de Filebrowser montada en solo lectura. |
| Datos | `/srv/homecore/homecore/jellyfin/config/` y `/srv/homecore/homecore/jellyfin/cache/` |

---

## 9. Estructura de directorios en el SSD

| Ruta en el SSD | Contenido |
|---|---|
| `/srv/homecore/` | Raíz de todo el proyecto |
| `/srv/homecore/compose/` | `.env` con secretos (nunca en Git) |
| `/srv/homecore/homecore/` | Repo clonado de GitHub |
| `/srv/homecore/homecore/compose/` | `docker-compose.yml` |
| `/srv/homecore/homecore/caddy/` | `Caddyfile` (fichero físico, no symlink) y datos de Caddy |
| `/srv/homecore/homecore/authentik/` | PostgreSQL, Redis, media, certs de Authentik |
| `/srv/homecore/homecore/homecore/data/` | `homecore.db` (SQLite de HomeCore) |
| `/srv/homecore/homecore/filebrowser/data/` | Archivos del usuario (media/, etc.) |
| `/srv/homecore/homecore/filebrowser/db/` | BD SQLite de configuración de Filebrowser |
| `/srv/homecore/homecore/jellyfin/config/` | Configuración de Jellyfin |
| `/srv/homecore/homecore/jellyfin/cache/` | Caché de Jellyfin |

> **IMPORTANTE:** El `docker-compose.yml` usa rutas relativas desde su propio directorio. Siempre lanzar con `-f /srv/homecore/homecore/compose/docker-compose.yml` para que los volúmenes resuelvan correctamente.

---

## 10. Backups (Fase 4 — pendiente)

Estrategia 3-2-1: tres copias, en dos medios distintos, uno fuera del hogar.

| Capa | Detalle |
|---|---|
| Herramienta | Restic para snapshots incrementales cifrados + Rclone para sincronización offsite. |
| Backup local | Snapshot diario en `/srv/homecore/backups/` — retención 7 días. |
| Backup offsite | Rclone sincroniza los snapshots cifrados a un proveedor cloud. |
| Qué se incluye | Base de datos PostgreSQL (Authentik), SQLite de HomeCore, Caddyfile, config de Jellyfin. |
| Qué se excluye | Media de Jellyfin (películas/música) — son ficheros originales recuperables. |
| Frecuencia | Cron diario a las 03:00. Verificación de integridad semanal. |

---

## 11. Fases de construcción

| Fase | Título | Estado |
|---|---|---|
| Fase 1 | Base de infraestructura | ✅ Completada |
| Fase 2 | HomeCore como dashboard | ✅ Completada |
| Fase 3 | Servicios de contenido (Filebrowser + Jellyfin) | ✅ Completada — 25 marzo 2026 |
| Fase 4 | Estabilidad y backups | Pendiente |

---

## 12. Escalabilidad — añadir servicios en el futuro

Añadir cualquier servicio nuevo sigue siempre el mismo proceso:

1. Añadir el contenedor al `docker-compose.yml`.
2. Añadir una entrada en el `Caddyfile` para el nuevo subdominio.
3. Si el servicio soporta OIDC: configurar la integración con Authentik. Si no: Caddy actúa de forward auth con `import autenticacion`.
4. Insertar una fila en el catálogo de apps de HomeCore. El dashboard lo muestra automáticamente.

---

## 13. Control de versiones

| Dato | Valor |
|---|---|
| Repositorio | https://github.com/TheIkaz/HomeCore-V2 |
| Visibilidad | Público — nunca contiene secretos |

---

## 14. Glosario

| Término | Significado |
|---|---|
| Authentik | Servidor de identidad open-source. Gestiona usuarios, sesiones, MFA y SSO. |
| Caddy | Servidor web y reverse proxy con gestión automática de certificados TLS. |
| Cloudflare Tunnel | Túnel cifrado saliente que permite acceso remoto sin abrir puertos en el router. |
| Docker Compose | Herramienta para definir y ejecutar múltiples contenedores Docker desde un único fichero YAML. |
| Forward Auth | Mecanismo por el que Caddy consulta a Authentik si el usuario tiene sesión válida antes de servir cualquier ruta. |
| OIDC | OpenID Connect. Protocolo estándar de autenticación delegada. Usado por Jellyfin. |
| Restic | Herramienta de backup incremental con cifrado. |
| Rclone | Herramienta de sincronización de ficheros hacia proveedores cloud. |
| SSO | Single Sign-On. Un único login da acceso a todos los servicios sin volver a autenticarse. |
| ZeroTier | Red virtual privada P2P. Usada exclusivamente para acceso de administración a la Pi por SSH. |
