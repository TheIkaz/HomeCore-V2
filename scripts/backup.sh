#!/bin/bash
# HomeCore V2 — Backup semanal
# ─────────────────────────────────────────────────────────────────
# Vuelca las bases de datos y configuraciones críticas y las sube
# a Google Drive con Rclone. Conserva los últimos 4 backups.
#
# Qué incluye:
#   - PostgreSQL de Authentik (volcado SQL)
#   - SQLite de HomeCore
#   - Configuración de Jellyfin
#   - Caddyfile
#
# Uso manual:
#   bash /srv/homecore/homecore/scripts/backup.sh
#
# Cron (cada domingo a las 03:00):
#   0 3 * * 0 /srv/homecore/homecore/scripts/backup.sh >> /srv/homecore/logs/backup.log 2>&1
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuración ─────────────────────────────────────────────────
ENV_FILE="/srv/homecore/compose/.env"
COMPOSE_FILE="/srv/homecore/homecore/compose/docker-compose.yml"
FECHA=$(date +%Y-%m-%d)
BACKUP_DIR="/tmp/homecore-backup-${FECHA}"
ARCHIVO_TAR="/tmp/homecore-backup-${FECHA}.tar.gz"
RCLONE_DEST="gdrive:HomeCore-backups"
RETENSION=4   # número de backups a conservar en Google Drive

# ── Colores ────────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

ok()    { echo -e "${GREEN}  ✓ $1${NC}"; }
info()  { echo -e "${CYAN}  → $1${NC}"; }
warn()  { echo -e "${YELLOW}  ! $1${NC}"; }
error() { echo -e "${RED}  ✗ $1${NC}"; exit 1; }

# ── Limpieza en caso de error ──────────────────────────────────────
cleanup() {
    rm -rf "$BACKUP_DIR" "$ARCHIVO_TAR" 2>/dev/null || true
}
trap cleanup ERR

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        HomeCore V2 — Backup semanal          ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
info "Fecha: $(date '+%Y-%m-%d %H:%M')"
info "Destino: $RCLONE_DEST"
echo ""


# ── Cargar variables de entorno ────────────────────────────────────
[ -f "$ENV_FILE" ] || error "No se encontró el fichero .env en $ENV_FILE"
set -a; source "$ENV_FILE"; set +a


# ── Preparar directorio temporal ───────────────────────────────────
mkdir -p "$BACKUP_DIR"


# ── 1. Volcar PostgreSQL (Authentik) ───────────────────────────────
info "Volcando base de datos de Authentik (PostgreSQL)..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    exec -T postgresql \
    pg_dump -U "$AUTHENTIK_DB_USER" "$AUTHENTIK_DB_NAME" \
    > "$BACKUP_DIR/authentik.sql"
ok "PostgreSQL volcado ($(du -sh "$BACKUP_DIR/authentik.sql" | cut -f1))"


# ── 2. Copiar SQLite de HomeCore ───────────────────────────────────
info "Copiando base de datos de HomeCore (SQLite)..."
cp /srv/homecore/homecore/homecore/data/homecore.db "$BACKUP_DIR/homecore.db"
ok "SQLite copiado ($(du -sh "$BACKUP_DIR/homecore.db" | cut -f1))"


# ── 3. Copiar configuración de Jellyfin ───────────────────────────
info "Copiando configuración de Jellyfin..."
cp -r /srv/homecore/homecore/jellyfin/config "$BACKUP_DIR/jellyfin-config"
ok "Config Jellyfin copiada ($(du -sh "$BACKUP_DIR/jellyfin-config" | cut -f1))"


# ── 4. Copiar Caddyfile ────────────────────────────────────────────
info "Copiando Caddyfile..."
cp /srv/homecore/homecore/caddy/Caddyfile "$BACKUP_DIR/Caddyfile"
ok "Caddyfile copiado"


# ── 5. Comprimir todo ──────────────────────────────────────────────
info "Comprimiendo backup..."
tar -czf "$ARCHIVO_TAR" -C /tmp "$(basename "$BACKUP_DIR")"
ok "Backup comprimido: $(du -sh "$ARCHIVO_TAR" | cut -f1)"
rm -rf "$BACKUP_DIR"


# ── 6. Subir a Google Drive ────────────────────────────────────────
info "Subiendo a Google Drive..."
rclone copy "$ARCHIVO_TAR" "$RCLONE_DEST/"
ok "Subido a $RCLONE_DEST/$(basename "$ARCHIVO_TAR")"
rm -f "$ARCHIVO_TAR"


# ── 7. Limpiar backups antiguos en Google Drive ───────────────────
info "Limpiando backups antiguos (conservando los últimos $RETENSION)..."
TOTAL=$(rclone lsf "$RCLONE_DEST/" 2>/dev/null | grep -c "homecore-backup-" || echo 0)
if [ "$TOTAL" -gt "$RETENSION" ]; then
    ELIMINAR=$((TOTAL - RETENSION))
    rclone lsf "$RCLONE_DEST/" | grep "homecore-backup-" | sort | head -n "$ELIMINAR" | while read -r f; do
        rclone deletefile "$RCLONE_DEST/$f"
        warn "Eliminado backup antiguo: $f"
    done
fi
ok "Limpieza completada (${TOTAL} → conservados ${RETENSION})"


echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║           ¡Backup completado!                ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
info "Backups disponibles en Google Drive:"
rclone lsf "$RCLONE_DEST/" | grep "homecore-backup-" | while read -r f; do
    echo "      $f"
done
echo ""
