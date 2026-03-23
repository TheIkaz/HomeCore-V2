#!/bin/bash
# HomeCore — Script de setup inicial
# Ejecutar una sola vez en la Raspberry Pi, después de instalar Docker.
#
# Uso:
#   bash /srv/homecore/homecore/scripts/setup.sh
#
# Qué hace:
#   1. Crea la estructura de directorios en el SSD
#   2. Copia la plantilla .env si no existe
#   3. Verifica que Docker está instalado y funcionando

set -e

HOMECORE_ROOT="/srv/homecore"
REPO_DIR="$HOMECORE_ROOT/homecore"

echo "=== HomeCore — Setup inicial ==="
echo ""

# ── 1. Estructura de directorios ───────────────────────────────────
echo "[1/3] Creando estructura de directorios en $HOMECORE_ROOT..."

mkdir -p \
    "$HOMECORE_ROOT/compose" \
    "$HOMECORE_ROOT/caddy/data" \
    "$HOMECORE_ROOT/caddy/config" \
    "$HOMECORE_ROOT/authentik/postgresql" \
    "$HOMECORE_ROOT/authentik/redis" \
    "$HOMECORE_ROOT/authentik/media" \
    "$HOMECORE_ROOT/authentik/certs" \
    "$HOMECORE_ROOT/authentik/templates" \
    "$HOMECORE_ROOT/homecore/data" \
    "$HOMECORE_ROOT/data/nextcloud" \
    "$HOMECORE_ROOT/data/paperless" \
    "$HOMECORE_ROOT/media/peliculas" \
    "$HOMECORE_ROOT/media/series" \
    "$HOMECORE_ROOT/media/musica" \
    "$HOMECORE_ROOT/backups" \
    "$HOMECORE_ROOT/logs"

chown -R "$USER:$USER" "$HOMECORE_ROOT"
echo "    OK — estructura creada."

# ── 2. Fichero .env ────────────────────────────────────────────────
echo "[2/3] Comprobando fichero .env..."

ENV_FILE="$HOMECORE_ROOT/compose/.env"
ENV_EXAMPLE="$REPO_DIR/compose/docker-compose.example.env"

if [ -f "$ENV_FILE" ]; then
    echo "    OK — .env ya existe, no se sobreescribe."
else
    if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo "    .env creado desde la plantilla. Edítalo antes de arrancar:"
        echo "    nano $ENV_FILE"
    else
        echo "    AVISO — no se encontró la plantilla en $ENV_EXAMPLE"
        echo "    Crea manualmente $ENV_FILE antes de arrancar los contenedores."
    fi
fi

# ── 3. Verificación de Docker ──────────────────────────────────────
echo "[3/3] Verificando Docker..."

if ! command -v docker &>/dev/null; then
    echo "    ERROR — Docker no está instalado."
    echo "    Instálalo con: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

if ! docker info &>/dev/null; then
    echo "    ERROR — Docker no está corriendo o el usuario no tiene permisos."
    echo "    Ejecuta: sudo usermod -aG docker \$USER && newgrp docker"
    exit 1
fi

DOCKER_VERSION=$(docker --version | awk '{print $3}' | tr -d ',')
COMPOSE_VERSION=$(docker compose version | awk '{print $4}')
echo "    OK — Docker $DOCKER_VERSION / Compose $COMPOSE_VERSION"

# ── Resumen ────────────────────────────────────────────────────────
echo ""
echo "=== Setup completado ==="
echo ""
echo "Siguientes pasos:"
echo "  1. Edita el fichero .env con tus valores reales:"
echo "     nano $ENV_FILE"
echo ""
echo "  2. Arranca los contenedores:"
echo "     docker compose -f $REPO_DIR/compose/docker-compose.yml up -d"
echo ""
echo "  3. Comprueba que todo está corriendo:"
echo "     docker compose -f $REPO_DIR/compose/docker-compose.yml ps"
echo ""
echo "  4. Accede a Authentik para la configuración inicial:"
echo "     http://10.147.18.210:9000"
echo ""
