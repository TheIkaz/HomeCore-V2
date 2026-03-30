# HomeCore V2 — Estado del proyecto

**Última actualización: 30 marzo 2026**
Repo: https://github.com/TheIkaz/HomeCore-V2

---

## Sistema en producción

| Componente | Estado | Notas |
|---|---|---|
| Authentik | ✅ Operativo | `https://auth.theikaz.com` |
| Caddy + Cloudflare Tunnel | ✅ Operativo | Sin puertos expuestos |
| HomeCore (dashboard + API) | ✅ Operativo | `https://homecore.theikaz.com` |
| Inventario | ✅ Operativo | Lista de compra y flujo de compra incluidos |
| Calendario | ✅ Operativo | Edición de eventos y rangos de días incluidos |
| Filebrowser | ✅ Operativo | `https://files.theikaz.com` |
| Jellyfin | ✅ Operativo | `https://media.theikaz.com` — SSO resuelto el 28 marzo |
| Backups (Rclone → Drive) | ✅ Operativo | Cron domingos 03:00, retención 4 semanas |
| PWA | ✅ Operativo | Instalable en Android e iOS |
| Monitorización Pi | ✅ Operativo | Solo admin — `/admin/sistema` |
| Alta de usuarios | ✅ Operativo | Solo admin — `/admin/invitar` |

---

## Fases completadas

| Fase | Descripción | Fecha |
|---|---|---|
| 1 | Infraestructura base (Caddy, Authentik, Cloudflare Tunnel) | Mar 2026 |
| 2 | HomeCore como dashboard (catálogo de apps, Inventario) | Mar 2026 |
| 3 | Servicios externos (Filebrowser, Jellyfin + SSO) | 25 mar 2026 |
| 4 | Backups (Rclone, scripts backup/restore) | 25 mar 2026 |
| 5 | Experiencia de usuario (sesión unificada, ConfirmDialog, estados de carga) | 25 mar 2026 |
| 6.1 | Alta de usuarios desde HomeCore | 25 mar 2026 |
| 6.2 | Persistencia de sesión (30 días) | 25 mar 2026 |
| 7 | Lista de compra en tiempo real (polling 10s) | 25 mar 2026 |
| 8 | PWA (manifest, service worker, iconos) | 25 mar 2026 |
| 9 | Monitorización de la Pi (CPU, RAM, disco, temperatura, sparklines) | 25 mar 2026 |
| 10 | Documentación técnica detallada (`arquitectura_tecnica.md`) | 25 mar 2026 |
| 11 | Calendario familiar | 25 mar 2026 |

---

## Mejoras pendientes en módulos existentes

### Inventario
- Grupos de productos (agrupación visual por categoría en lista de compra)

### Calendario
- Sin mejoras pendientes identificadas

---

## Incidencias cerradas

### Jellyfin — admin inaccesible (resuelta 28 marzo 2026)

**Causa raíz:** el plugin SSO tenía `EnableAuthorization=true` con `AdminRoles` vacío, lo que sobreescribía los permisos de jellyfin.db y quitaba el rol admin al usuario al entrar por SSO.

**Solución aplicada:** `EnableAuthorization=false`, `EnableAllFolders=true`, `CanonicalLinks` actualizado con el GUID correcto de `akadmin`.

**Nota operacional:** `SSO-Auth.xml` no está en Git. Ruta en la Pi: `/srv/homecore/homecore/jellyfin/config/plugins/configurations/SSO-Auth.xml`. Backup en `~/jellyfin-sso-backup/`.

---

## Referencias

| Documento | Contenido |
|---|---|
| `docs/plataforma.md` | Definición del sistema, arquitectura en capas, dominios, integraciones |
| `docs/roadmap.md` | Próximas fases, módulos pendientes, decisiones abiertas |
| `docs/arquitectura.md` | Arquitectura general y flujo de acceso |
| `docs/arquitectura_tecnica.md` | Referencia técnica completa (14+ secciones) |
| `docs/conexiones.md` | Comandos de operación, diagnóstico, rutas de datos |
| `docs/arranque_inicial.md` | Guía de instalación desde cero |
