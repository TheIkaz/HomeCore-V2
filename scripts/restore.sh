#!/bin/bash
# HomeCore V2 — Restaurar desde backup
# ─────────────────────────────────────────────────────────────────
# Descarga un backup de Google Drive y restaura:
#   - PostgreSQL de Authentik
#   - SQLite de HomeCore
#   - Configuración de Jellyfin
#   - Caddyfile
#
# Uso:
#   bash /srv/homecore/homecore/scripts/restore.sh
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuración ─────────────────────────────────────────────────
ENV_FILE="/srv/homecore/compose/.env"
COMPOSE_FILE="/srv/homecore/homecore/compose/docker-compose.yml"
RCLONE_DEST="gdrive:HomeCore-backups"
RESTORE_DIR="/tmp/homecore-restore"

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

# ── Limpieza al salir ──────────────────────────────────────────────
cleanup() {
    rm -rf "$RESTORE_DIR" 2>/dev/null || true
}
trap cleanup EXIT

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       HomeCore V2 — Restaurar backup         ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
warn "Este script sobreescribirá los datos actuales del sistema."
warn "Los contenedores se pararán durante la restauración."
echo ""
read -p "  ¿Continuar? (s/N): " confirm
[[ "$confirm" =~ ^[sS]$ ]] || { echo "Cancelado."; exit 0; }


# ── Cargar variables de entorno ────────────────────────────────────
[ -f "$ENV_FILE" ] || error "No se encontró el fichero .env en $ENV_FILE"
set -a; source "$ENV_FILE"; set +a


# ── Listar backups disponibles ─────────────────────────────────────
echo ""
info "Backups disponibles en Google Drive:"
echo ""
mapfile -t BACKUPS < <(rclone lsf "$RCLONE_DEST/" | grep "homecore-backup-" | sort -r)

if [ ${#BACKUPS[@]} -eq 0 ]; then
    error "No se encontraron backups en $RCLONE_DEST"
fi

for i in "${!BACKUPS[@]}"; do
    echo "      [$((i+1))] ${BACKUPS[$i]}"
done
echo ""
read -p "  Elige el número del backup a restaurar: " eleccion

# Validar elección
if ! [[ "$eleccion" =~ ^[0-9]+$ ]] || [ "$eleccion" -lt 1 ] || [ "$eleccion" -gt ${#BACKUPS[@]} ]; then
    error "Elección no válida."
fi

BACKUP_FILE="${BACKUPS[$((eleccion-1))]}"
info "Backup seleccionado: $BACKUP_FILE"
echo ""


# ── Descargar backup ───────────────────────────────────────────────
mkdir -p "$RESTORE_DIR"
info "Descargando $BACKUP_FILE..."
rclone copy "$RCLONE_DEST/$BACKUP_FILE" "$RESTORE_DIR/"
ok "Descargado"

info "Descomprimiendo..."
tar -xzf "$RESTORE_DIR/$BACKUP_FILE" -C "$RESTORE_DIR/"
BACKUP_CONTENIDO="$RESTORE_DIR/$(basename "$BACKUP_FILE" .tar.gz)"
ok "Descomprimido en $BACKUP_CONTENIDO"


# ── Parar contenedores ────────────────────────────────────────────
echo ""
info "Parando contenedores..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
ok "Contenedores parados"


# ── 1. Restaurar PostgreSQL (Authentik) ───────────────────────────
info "Restaurando PostgreSQL de Authentik..."
# Arrancar solo PostgreSQL para poder restaurar
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgresql
sleep 5

# Vaciar la base de datos y restaurar
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    exec -T postgresql \
    psql -U "$AUTHENTIK_DB_USER" -c "DROP DATABASE IF EXISTS ${AUTHENTIK_DB_NAME};"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    exec -T postgresql \
    psql -U "$AUTHENTIK_DB_USER" -c "CREATE DATABASE ${AUTHENTIK_DB_NAME};"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    exec -T postgresql \
    psql -U "$AUTHENTIK_DB_USER" "$AUTHENTIK_DB_NAME" \
    < "$BACKUP_CONTENIDO/authentik.sql"
ok "PostgreSQL restaurado"


# ── 2. Restaurar SQLite de HomeCore ───────────────────────────────
info "Restaurando SQLite de HomeCore..."
cp "$BACKUP_CONTENIDO/homecore.db" /srv/homecore/homecore/homecore/data/homecore.db
ok "SQLite restaurado"


# ── 3. Restaurar configuración de Jellyfin ────────────────────────
info "Restaurando configuración de Jellyfin..."
rm -rf /srv/homecore/homecore/jellyfin/config
cp -r "$BACKUP_CONTENIDO/jellyfin-config" /srv/homecore/homecore/jellyfin/config
ok "Config Jellyfin restaurada"


# ── 4. Restaurar Caddyfile ────────────────────────────────────────
info "Restaurando Caddyfile..."
cp "$BACKUP_CONTENIDO/Caddyfile" /srv/homecore/homecore/caddy/Caddyfile
ok "Caddyfile restaurado"


# ── Arrancar todos los contenedores ───────────────────────────────
echo ""
info "Arrancando todos los contenedores..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
ok "Contenedores arrancados"


echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        ¡Restauración completada!             ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
info "Backup restaurado: $BACKUP_FILE"
info "Puede tardar unos segundos hasta que Authentik esté listo."
echo ""
