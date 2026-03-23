# HomeCore — Dockerfile
# Build multi-etapa: Node construye el frontend, Python sirve todo.

# ── Etapa 1: build del frontend React ────────────────────────────
FROM node:20-alpine AS frontend

WORKDIR /build
COPY web/package*.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ── Etapa 2: imagen final con Flask ──────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Herramientas del sistema
RUN apt-get update && apt-get install -y sqlite3 && rm -rf /var/lib/apt/lists/*

# Dependencias Python
COPY api/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Código del backend
COPY api/ ./api/
COPY wsgi.py ./

# Build del frontend (copiado desde etapa 1)
COPY --from=frontend /build/dist ./web/dist

# La base de datos SQLite vive en un volumen externo (/data)
# para que persista entre actualizaciones del contenedor
VOLUME ["/data"]

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "wsgi:app"]
