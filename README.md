# HomeCore V2

Servidor privado doméstico sobre Raspberry Pi 4. Centraliza el acceso a aplicaciones y servicios del hogar bajo un único punto de entrada seguro, con SSO unificado y sin depender de servicios externos para los datos personales.

---

## Stack

| Capa | Tecnología |
|---|---|
| Contenedores | Docker + Docker Compose |
| Reverse proxy | Caddy |
| Autenticación | Authentik (SSO) |
| Acceso remoto | Cloudflare Tunnel (familia) + ZeroTier (admin SSH) |
| Hub / dashboard | HomeCore — Flask + React |
| Archivos | Filebrowser |
| Streaming | Jellyfin |
| Backups | Rclone → Google Drive |

---

## Servicios

| URL | Servicio |
|---|---|
| `https://auth.theikaz.com` | Authentik — SSO y gestión de usuarios |
| `https://homecore.theikaz.com` | HomeCore — dashboard principal |
| `https://files.theikaz.com` | Filebrowser — explorador de archivos |
| `https://media.theikaz.com` | Jellyfin — streaming de media |

---

## Características

- **SSO unificado** — un único login de Authentik da acceso a todos los servicios
- **Sin puertos expuestos** — acceso remoto 100% a través de Cloudflare Tunnel
- **Dashboard dinámico** — cada usuario ve solo las apps de su grupo
- **Gestión de usuarios** — el admin crea usuarios directamente desde HomeCore
- **Inventario doméstico** — control de stock con lista de la compra integrada
- **Backups automáticos** — copia semanal cifrada a Google Drive con Rclone
- **Datos en local** — todo en un SSD propio, sin clouds de terceros

---

## Fases completadas

| Fase | Descripción |
|---|---|
| ✅ Fase 1 | Infraestructura base — Caddy, Authentik, Cloudflare Tunnel |
| ✅ Fase 2 | HomeCore dashboard — Flask + React, catálogo de apps, módulo inventario |
| ✅ Fase 3 | Servicios de contenido — Filebrowser y Jellyfin con SSO |
| ✅ Fase 4 | Backups semanales a Google Drive con Rclone |
| ✅ Fase 5 | UX — estados de carga, confirmaciones, punto de entrada único |
| ✅ Fase 6.1 | Alta de usuarios desde HomeCore vía API de Authentik |

---

## Estructura del repositorio

```
HomeCore-V2/
├── homecore/               # Código fuente Flask + React
│   ├── api/                # Backend Flask
│   │   ├── blueprints/     # apps, inventario, configuracion, admin
│   │   ├── utils/          # auth.py (lectura de cabeceras Authentik)
│   │   └── database.py     # SQLite — tablas apps y productos
│   ├── web/                # Frontend React (Vite)
│   │   └── src/
│   │       ├── pages/      # Dashboard, Inventario, Admin
│   │       └── api/        # Capa de llamadas a la API Flask
│   └── Dockerfile          # Build multi-etapa: Node + Python
├── compose/
│   ├── docker-compose.yml
│   └── docker-compose.example.env
├── caddy/
│   └── Caddyfile
├── scripts/
│   ├── setup.sh            # Preparación inicial de la Pi
│   ├── backup.sh           # Backup semanal a Google Drive
│   └── restore.sh          # Restauración interactiva desde Drive
└── docs/
    ├── arquitectura.md     # Visión completa del sistema
    ├── progreso.md         # Estado, roadmap y comandos de operación
    ├── conexiones.md       # Configuración detallada de cada servicio
    └── arranque_inicial.md # Guía paso a paso para nuevo despliegue
```

---

## Arranque rápido (desde la Pi)

```bash
git clone https://github.com/TheIkaz/HomeCore-V2.git /srv/homecore/homecore
cp /srv/homecore/homecore/compose/docker-compose.example.env /srv/homecore/compose/.env
nano /srv/homecore/compose/.env   # Rellenar con valores reales
docker compose -f /srv/homecore/homecore/compose/docker-compose.yml --env-file /srv/homecore/compose/.env up -d
```

Ver [Guía de arranque inicial](docs/arranque_inicial.md) para los pasos completos incluyendo configuración de Authentik.

---

## Documentación

- [Arquitectura del sistema](docs/arquitectura.md)
- [Estado y roadmap del proyecto](docs/progreso.md)
- [Mapa de conexiones internas](docs/conexiones.md)
- [Guía de arranque inicial](docs/arranque_inicial.md)

---

> El fichero `.env` nunca se incluye en este repositorio. Contiene secretos y vive únicamente en el SSD de la Pi.
