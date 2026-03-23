# HomeCore — Guía de arranque inicial

**Versión 1.0 · Marzo 2026**
Limpieza del sistema actual e instalación de la base desde cero

---

## Estado actual del sistema

| Elemento | Estado actual |
|---|---|
| Raspberry Pi 4 — 8 GB RAM | En funcionamiento con Raspberry Pi OS 64-bit |
| HomeCore | Corriendo directamente con Python (sin Docker), probablemente como servicio systemd |
| SSD externo USB | Montado y con datos del proyecto: logs, ficheros JSON de usuarios, backups propios |
| Docker | No instalado |
| Acceso SSH | Disponible por ZeroTier (10.147.18.210) |
| Repositorio GitHub | https://github.com/TheIkaz/HomeCore-V2 |

---

## Objetivo de esta guía

Dejar la Raspberry Pi en estado limpio y listo para la Fase 1 de la nueva arquitectura, **sin grabar la SD ni reinstalar el sistema operativo**. Esto implica:

- Parar y eliminar el servicio HomeCore actual.
- Limpiar el SSD — conservar solo la estructura de montaje, eliminar datos del proyecto antiguo.
- Instalar Docker y Docker Compose.
- Clonar el repositorio en el SSD.
- Verificar que todo está listo para empezar la Fase 1.

> **Advertencia:** Todos los datos del SSD (logs, JSONs de usuarios, backups del proyecto antiguo) se eliminarán en el proceso. Si hay datos que quieras conservar, cópialos a otro sitio antes de empezar.

---

## Pasos

### Paso 1 — Conectar a la Pi por SSH

```bash
ssh pi@10.147.18.210
```

---

### Paso 2 — Identificar y parar el servicio HomeCore

```bash
sudo systemctl status homecore
```

Si existe y está activo:

```bash
sudo systemctl stop homecore
sudo systemctl disable homecore
sudo rm -f /etc/systemd/system/homecore.service
sudo systemctl daemon-reload
```

Si no existe como servicio, busca el proceso Python:

```bash
ps aux | grep python
kill <PID>
```

> **Resultado esperado:** Ningún proceso de HomeCore corriendo. Puerto 5000 libre.

---

### Paso 3 — Limpiar el SSD

Identifica el punto de montaje:

```bash
df -h
lsblk
```

Elimina el contenido del proyecto anterior (ajusta la ruta a la real):

```bash
sudo rm -rf /mnt/ssd/*
ls -la /mnt/ssd/
```

Crea la nueva estructura:

```bash
sudo mkdir -p /srv/homecore/{compose,caddy,authentik,homecore,data/{nextcloud,paperless},media/{peliculas,series,musica},backups,logs}
sudo chown -R $USER:$USER /srv/homecore
find /srv/homecore -type d
```

---

### Paso 4 — Actualizar el punto de montaje del SSD en fstab

```bash
sudo blkid | grep sda
# Apunta el UUID del SSD
sudo nano /etc/fstab
# La línea debe quedar así (sustituye el UUID):
# UUID=tu-uuid-aqui  /srv/homecore  ext4  defaults,nofail  0  2
sudo mount -a
df -h | grep srv
```

> **Resultado esperado:** SSD montado en /srv/homecore.

---

### Paso 5 — Instalar Docker y Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
docker run hello-world
```

> **Resultado esperado:** Docker 24.x o superior. Docker Compose 2.x o superior.

---

### Paso 6 — Clonar el repositorio en el SSD

```bash
cd /srv/homecore
git clone https://github.com/TheIkaz/HomeCore-V2.git homecore
cd homecore
git log --oneline -3
```

---

### Paso 7 — Crear el fichero .env

```bash
cp /srv/homecore/homecore/compose/docker-compose.example.env /srv/homecore/compose/.env
nano /srv/homecore/compose/.env
```

Rellena los valores reales. Genera la clave secreta de Authentik con:

```bash
openssl rand -hex 25
```

> **Advertencia:** El fichero .env nunca debe subirse a GitHub. Está en el .gitignore. Guarda una copia en un lugar seguro fuera de la Pi.

---

### Paso 8 — Verificación final

```bash
# Docker funcionando
docker --version && docker compose version

# SSD montado
df -h | grep srv

# Estructura de directorios
find /srv/homecore -maxdepth 2 -type d

# Repositorio clonado
cd /srv/homecore/homecore && git log --oneline -3

# .env existe y no está en Git
ls -la /srv/homecore/compose/.env
git -C /srv/homecore/homecore status

# Ningún proceso HomeCore antiguo
ps aux | grep python | grep -v grep
sudo systemctl status homecore 2>/dev/null || echo 'servicio homecore no existe - correcto'
```

---

## Siguiente paso — Fase 1

Con el sistema en este estado: levantar Caddy + Authentik con Docker Compose y configurar el túnel de Cloudflare.

Necesitarás:
- Token del túnel de Cloudflare (generado en el panel Zero Trust > Tunnels)
- Dominio configurado en Cloudflare
