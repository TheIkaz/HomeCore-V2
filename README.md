# HomeCore V2

Servidor privado doméstico — Raspberry Pi 4 · 8 GB RAM · SSD 1 TB

Centraliza el acceso a aplicaciones y servicios del hogar bajo un único punto de entrada seguro, con gestión de usuarios unificada y sin depender de servicios externos para los datos personales.

## Stack

| Capa | Tecnología |
|---|---|
| Contenedores | Docker + Docker Compose |
| Reverse proxy | Caddy |
| Autenticación | Authentik (SSO) |
| Acceso remoto | Cloudflare Tunnel (familia) + ZeroTier (admin) |
| Hub / dashboard | HomeCore — Flask + React |
| Archivos | Nextcloud |
| Streaming | Jellyfin |
| Documentos | Paperless-ngx |
| Backups | Restic + Rclone |

## Estructura del repositorio

```
HomeCore-V2/
├── homecore/           # Código fuente Flask + React
├── compose/
│   ├── docker-compose.yml
│   └── docker-compose.example.env
├── caddy/
│   └── Caddyfile
├── scripts/
│   ├── setup.sh
│   ├── backup.sh
│   └── restore.sh
├── docs/
│   ├── arquitectura.md
│   └── arranque_inicial.md
├── .gitignore
└── README.md
```

## Fases de construcción

| Tag | Fase |
|---|---|
| v0.1 | Docker + Caddy + Authentik + Cloudflare Tunnel |
| v0.2 | HomeCore como dashboard con catálogo de apps |
| v0.3 | Nextcloud, Jellyfin y Paperless con SSO |
| v1.0 | Backups, monitorización y sistema completo |

## Arranque rápido (desde la Pi)

```bash
git clone https://github.com/TheIkaz/HomeCore-V2.git /srv/homecore/homecore
cp /srv/homecore/homecore/compose/docker-compose.example.env /srv/homecore/compose/.env
# Edita .env con tus valores reales
docker compose -f /srv/homecore/compose/docker-compose.yml up -d
```

## Documentación

- [Arquitectura del sistema](docs/arquitectura.md)
- [Guía de arranque inicial](docs/arranque_inicial.md)

---

> El fichero `.env` nunca se incluye en este repositorio. Contiene secretos y vive únicamente en el SSD de la Pi.
