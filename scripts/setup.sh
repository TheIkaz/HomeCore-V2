#!/bin/bash
# HomeCore V2 — Setup inicial completo
# ─────────────────────────────────────────────────────────────────
# Ejecutar una sola vez en la Raspberry Pi via SSH:
#
#   bash <(curl -fsSL https://raw.githubusercontent.com/TheIkaz/HomeCore-V2/master/scripts/setup.sh)
#
# Qué hace:
#   1. Para y elimina el servicio HomeCore antiguo
#   2. Instala Docker si no está instalado
#   3. Detecta el SSD y crea la estructura de directorios
#   4. Clona el repositorio HomeCore-V2
#   5. Genera el fichero .env con tus valores
#   6. Arranca todos los contenedores
# ─────────────────────────────────────────────────────────────────

set -e

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
titulo(){ echo -e "\n${CYAN}━━━ $1 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"; }

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║        HomeCore V2 — Setup inicial           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
warn "Este script para el HomeCore antiguo, limpia el SSD"
warn "y prepara el entorno desde cero."
echo ""
read -p "  ¿Continuar? (s/N): " confirm
[[ "$confirm" =~ ^[sS]$ ]] || { echo "Cancelado."; exit 0; }


# ════════════════════════════════════════════════════════════════
titulo "PASO 1 — Parar el HomeCore antiguo"
# ════════════════════════════════════════════════════════════════

if systemctl is-active --quiet homecore 2>/dev/null; then
    info "Parando servicio homecore..."
    sudo systemctl stop homecore
    sudo systemctl disable homecore
    sudo rm -f /etc/systemd/system/homecore.service
    sudo systemctl daemon-reload
    ok "Servicio homecore eliminado."
else
    # Buscar proceso Python suelto
    PIDS=$(pgrep -f "main.py\|gunicorn\|flask" 2>/dev/null || true)
    if [ -n "$PIDS" ]; then
        info "Matando procesos Python del proyecto anterior..."
        kill $PIDS 2>/dev/null || true
        ok "Procesos eliminados."
    else
        ok "No había ningún servicio HomeCore corriendo."
    fi
fi


# ════════════════════════════════════════════════════════════════
titulo "PASO 2 — Instalar Docker"
# ════════════════════════════════════════════════════════════════

if command -v docker &>/dev/null; then
    DOCKER_VER=$(docker --version | awk '{print $3}' | tr -d ',')
    ok "Docker ya instalado: $DOCKER_VER"
else
    info "Instalando Docker (puede tardar unos minutos)..."
    curl -fsSL https://get.docker.com | sh
    ok "Docker instalado."
fi

# Añadir usuario al grupo docker
if ! groups "$USER" | grep -q docker; then
    info "Añadiendo $USER al grupo docker..."
    sudo usermod -aG docker "$USER"
    ok "Usuario añadido al grupo docker."
fi

# Verificar que Docker funciona (con sudo por si el grupo aún no está activo)
sudo docker info &>/dev/null || error "Docker no responde. Revisa la instalación."
COMPOSE_VER=$(sudo docker compose version | awk '{print $4}')
ok "Docker Compose: $COMPOSE_VER"


# ════════════════════════════════════════════════════════════════
titulo "PASO 3 — Detectar y preparar el SSD"
# ════════════════════════════════════════════════════════════════

echo ""
echo "  Dispositivos de bloque disponibles:"
lsblk -o NAME,SIZE,MOUNTPOINT | grep -v "loop"
echo ""

# Intentar detectar el SSD (dispositivo USB externo)
SSD_MOUNT=$(lsblk -o MOUNTPOINT,TRAN 2>/dev/null | grep usb | awk '{print $1}' | grep -v "^$" | head -1 || true)

if [ -n "$SSD_MOUNT" ]; then
    info "SSD detectado montado en: $SSD_MOUNT"
    read -p "  ¿Es correcto? (s/N): " ok_mount
    if [[ ! "$ok_mount" =~ ^[sS]$ ]]; then
        SSD_MOUNT=""
    fi
fi

if [ -z "$SSD_MOUNT" ]; then
    read -p "  Introduce la ruta de montaje del SSD (ej: /mnt/ssd): " SSD_MOUNT
    [ -z "$SSD_MOUNT" ] && error "Ruta de montaje vacía."
fi

HOMECORE_ROOT="/srv/homecore"

# Si el SSD no está montado en /srv/homecore, crear enlace simbólico o mover el mountpoint
if [ "$SSD_MOUNT" != "$HOMECORE_ROOT" ]; then
    info "El SSD está en $SSD_MOUNT. Configurando $HOMECORE_ROOT..."
    # Actualizar fstab si hay entrada del SSD
    UUID=$(sudo blkid -o value -s UUID "$(findmnt -n -o SOURCE "$SSD_MOUNT")" 2>/dev/null || true)
    if [ -n "$UUID" ]; then
        if grep -q "$UUID" /etc/fstab; then
            info "Actualizando punto de montaje en /etc/fstab..."
            sudo sed -i "s|$SSD_MOUNT|$HOMECORE_ROOT|g" /etc/fstab
        else
            info "Añadiendo entrada en /etc/fstab..."
            echo "UUID=$UUID  $HOMECORE_ROOT  ext4  defaults,nofail  0  2" | sudo tee -a /etc/fstab
        fi
        # Crear punto de montaje y remontar
        sudo mkdir -p "$HOMECORE_ROOT"
        sudo mount -a
        ok "SSD remontado en $HOMECORE_ROOT"
    else
        warn "No se pudo detectar el UUID. Usando enlace simbólico."
        sudo mkdir -p "$HOMECORE_ROOT"
        sudo mount --bind "$SSD_MOUNT" "$HOMECORE_ROOT"
    fi
fi

# Limpiar contenido antiguo del SSD
echo ""
warn "Se eliminará todo el contenido de $HOMECORE_ROOT"
read -p "  ¿Confirmar limpieza? (s/N): " confirm_clean
if [[ "$confirm_clean" =~ ^[sS]$ ]]; then
    info "Limpiando $HOMECORE_ROOT..."
    sudo rm -rf "${HOMECORE_ROOT:?}"/*
    ok "SSD limpio."
fi

# Crear estructura de directorios
info "Creando estructura de directorios..."
sudo mkdir -p \
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
sudo chown -R "$USER:$USER" "$HOMECORE_ROOT"
ok "Estructura creada en $HOMECORE_ROOT"


# ════════════════════════════════════════════════════════════════
titulo "PASO 4 — Clonar el repositorio"
# ════════════════════════════════════════════════════════════════

REPO_DIR="$HOMECORE_ROOT/homecore"

if [ -d "$REPO_DIR/.git" ]; then
    info "Repositorio ya clonado. Actualizando..."
    git -C "$REPO_DIR" pull
else
    info "Clonando HomeCore-V2..."
    git clone https://github.com/TheIkaz/HomeCore-V2.git "$REPO_DIR"
fi
ok "Repositorio listo en $REPO_DIR"


# ════════════════════════════════════════════════════════════════
titulo "PASO 5 — Configurar el fichero .env"
# ════════════════════════════════════════════════════════════════

ENV_FILE="$HOMECORE_ROOT/compose/.env"

if [ -f "$ENV_FILE" ]; then
    warn ".env ya existe. Omitiendo este paso."
    warn "Edítalo manualmente si necesitas cambiar valores: nano $ENV_FILE"
else
    info "Generando claves automáticamente..."
    AUTHENTIK_SECRET_KEY=$(openssl rand -hex 32)
    AUTHENTIK_DB_PASSWORD=$(openssl rand -hex 16)

    echo ""
    echo "  Necesito algunos datos para configurar el sistema:"
    echo ""

    read -p "  Token de Cloudflare Tunnel: " CF_TOKEN
    [ -z "$CF_TOKEN" ] && warn "Token vacío — puedes añadirlo después en $ENV_FILE"

    read -p "  Email del administrador [admin@theikaz.com]: " ADMIN_EMAIL
    ADMIN_EMAIL=${ADMIN_EMAIL:-admin@theikaz.com}

    read -s -p "  Contraseña del administrador de Authentik: " ADMIN_PASS
    echo ""
    [ -z "$ADMIN_PASS" ] && error "La contraseña no puede estar vacía."

    cat > "$ENV_FILE" <<EOF
# HomeCore V2 — configuración
# Generado el $(date '+%Y-%m-%d %H:%M')

DOMINIO=theikaz.com

AUTHENTIK_SECRET_KEY=$AUTHENTIK_SECRET_KEY

AUTHENTIK_DB_NAME=authentik
AUTHENTIK_DB_USER=authentik
AUTHENTIK_DB_PASSWORD=$AUTHENTIK_DB_PASSWORD

AUTHENTIK_BOOTSTRAP_EMAIL=$ADMIN_EMAIL
AUTHENTIK_BOOTSTRAP_PASSWORD=$ADMIN_PASS

CLOUDFLARE_TUNNEL_TOKEN=$CF_TOKEN
EOF

    chmod 600 "$ENV_FILE"
    ok ".env creado en $ENV_FILE"
fi


# ════════════════════════════════════════════════════════════════
titulo "PASO 6 — Arrancar los contenedores"
# ════════════════════════════════════════════════════════════════

COMPOSE_FILE="$REPO_DIR/compose/docker-compose.yml"

info "Arrancando contenedores (puede tardar unos minutos la primera vez)..."
sudo docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d

echo ""
ok "Contenedores arrancados."
echo ""
sudo docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps


# ════════════════════════════════════════════════════════════════
echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║           ¡Setup completado!                 ║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "  Accede a Authentik para la configuración inicial:"
echo "  → http://10.147.18.210:9000"
echo ""
echo "  Cuando Authentik esté configurado, accede al dashboard:"
echo "  → https://homecore.theikaz.com"
echo ""
warn "IMPORTANTE: cierra sesión SSH y vuelve a entrar para"
warn "que el grupo docker quede activo sin necesidad de sudo."
echo ""
