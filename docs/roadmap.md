# HomeCore — Roadmap

**Última actualización: marzo 2026**

---

## Estado del sistema

| Servicio / Módulo | Estado |
|---|---|
| Authentik (SSO) | ✅ Operativo |
| Caddy (reverse proxy) | ✅ Operativo |
| HomeCore (dashboard + API) | ✅ Operativo |
| Inventario | ✅ Operativo |
| Calendario | ✅ Operativo |
| Filebrowser | ✅ Operativo |
| Jellyfin | ✅ Operativo |
| Backups (Rclone → Drive) | ✅ Operativo |
| PWA (instalable en móvil) | ✅ Operativo |
| Monitorización Pi (admin) | ✅ Operativo |
| Vaultwarden | 🔲 Pendiente |
| Gastos domésticos | 🔲 Pendiente |
| Menú semanal | 🔲 Pendiente |
| Tareas del hogar | 🔲 Pendiente |

---

## Próximo — Fase 12: Vaultwarden

Gestor de contraseñas self-hosted (implementación compatible con Bitwarden). Es un servicio externo accesible como tile del dashboard, no un módulo de HomeCore.

**Alcance:**
- Contenedor `vaultwarden` en `docker-compose.yml`
- Subdominio `vault.theikaz.com` en Caddyfile
- Autenticación propia de Vaultwarden — sin forward auth por requisito de seguridad
- Tile en HomeCore visible para grupo `familia`

**Dependencias:** ninguna.

---

## Módulos del dominio Hogar

Los tres módulos siguientes forman un sistema integrado. El orden recomendado de implementación refleja sus dependencias y el valor que aportan por separado.

### 1. Gastos domésticos

Registro de gastos del hogar. Puede implementarse de forma completamente independiente.

**Integración con módulos existentes:** cuando se implemente la integración, "Terminar compra" en Inventario generará automáticamente un gasto.

**Alcance:**
- Registro de gasto: importe, categoría, descripción, fecha, registrado_por
- Listado con filtros por mes y categoría
- Totales por mes y por categoría
- **Pendiente de decisión:** incluir gráficas o mantener como lista simple

**Esquema de base de datos:**
```
gastos
──────────────────────
id
importe (float)
categoria (texto)
descripcion (texto)
fecha (date)
registrado_por (username)
```

---

### 2. Tareas del hogar

Lista de tareas compartida entre todos los miembros de la familia. Puede implementarse de forma independiente.

**Alcance:**
- Crear tarea: título, descripción opcional, responsable, estado
- Estados: Pendiente → En progreso → Hecha
- Cualquier miembro puede crear tareas y cambiar el estado
- Sin notificaciones en esta versión

**Esquema de base de datos:**
```
tareas
──────────────────────
id
titulo
descripcion (opcional)
responsable (username, opcional)
estado (pendiente | en_progreso | hecha)
creado_por (username)
creado_en (timestamp)
```

---

### 3. Menú semanal

Planificador de menús con restricciones alimentarias por usuario y asistencia de IA. Depende de que la Lista de compra esté operativa (ya lo está).

**Integración con módulos existentes:** el menú generado puede añadir ingredientes directamente a la Lista de compra.

**Alcance:**
- Restricciones alimentarias por usuario (tabla propia)
- Formulario: selección de comensales, días, comida/cena por día, notas libres
- Generación asistida (motor pendiente de decisión — ver abajo)
- Resultado por días con opción de regenerar un día concreto sin alterar el resto
- Historial de las últimas 3–4 semanas

**Esquema de base de datos:**
```
restricciones_alimentarias     menus_semanales
──────────────────────────     ───────────────────────────────
id                             id
usuario (username)             semana (ej. 2026-W14)
alimento                       dia (lunes…domingo)
                               tipo (comida | cena)
                               descripcion
                               comensales (texto)
                               generado_en (timestamp)
```

**Decisión pendiente: motor de generación**

| Opción | Velocidad | Dependencia externa | Coste | Privacidad |
|---|---|---|---|---|
| Groq API (LLaMA/Mixtral) | ~2–3 seg | Sí (cuenta Groq) | Gratuito (tier libre) | Datos enviados al exterior |
| Ollama local (llama3.2:3b) | ~2–4 min | No (100% self-hosted) | 0 | Total |
| Reglas + base de datos de platos | Instantáneo | No | 0 | Total |

> El backend sería idéntico para Groq y Ollama (API compatible). La decisión afecta solo a la configuración del endpoint y a la experiencia de espera del usuario.

---

## Integraciones entre módulos

Una vez implementados los módulos anteriores, las integraciones previstas por orden de prioridad:

| Integración | Descripción | Prioridad | Dependencia |
|---|---|---|---|
| Compra completada → Gastos | "Terminar compra" genera un gasto automáticamente | Alta | Gastos implementado |
| Menú → Lista de compra | El menú generado añade ingredientes a la lista | Media | Menú implementado |
| Producto agotado → Notificación | Push o email con Ntfy cuando un producto llega al umbral | Baja | Ntfy desplegado |

---

## Evolución técnica del backend

Mejoras técnicas planificadas para abordar cuando se implementen los módulos del dominio Hogar (Gastos, Menú, Tareas). No son urgentes ahora — el código actual funciona correctamente — pero serán necesarias a medida que el sistema crezca.

### Service layer

**Cuándo:** al implementar el segundo o tercer módulo nuevo.

**Por qué:** los módulos actuales tienen lógica de negocio directamente en los blueprints Flask. Mientras cada módulo es independiente, esto funciona. En cuanto aparezca lógica compartida entre módulos (ej. "terminar compra" debe actualizar inventario *y* registrar un gasto), duplicar esa lógica en los endpoints es insostenible.

**Qué implica:**
- Crear `homecore/api/services/` con un módulo por dominio (`inventario_service.py`, `gastos_service.py`, etc.)
- Los blueprints quedan como capa fina: reciben la petición, llaman al servicio, devuelven la respuesta
- La lógica de negocio y las llamadas a la base de datos se mueven a los servicios

### Migraciones de base de datos

**Cuándo:** antes de añadir el primer módulo nuevo que requiera cambios de esquema.

**Por qué:** actualmente `init_db()` en `database.py` mezcla creación de tablas, alteraciones de esquema y seed de datos iniciales. Funciona para el esquema actual, pero cada vez que se añada una tabla o columna hay que editar `init_db` directamente, sin trazabilidad ni posibilidad de rollback.

**Qué implica:**
- Separar `init_db` en tres responsabilidades:
  - `schema.sql` — definición de tablas (estructura base, solo CREATE TABLE IF NOT EXISTS)
  - `seed.sql` — datos iniciales (apps del catálogo, categorías de calendario)
  - Migraciones numeradas (`migrations/001_gastos.sql`, `migrations/002_menu.sql`, etc.) para cambios incrementales
- La herramienta puede ser tan simple como un script Python que aplique los `.sql` pendientes en orden, registrando cuáles ya se han ejecutado en una tabla `schema_migrations`

### Eliminar paths hardcodeados en scripts

**Cuándo:** antes de cualquier migración de hardware (nueva Pi, reubicación del SSD, cambio de punto de montaje).

**Por qué:** los scripts de backup y operación (`scripts/backup.sh`, `scripts/restore.sh`) contienen rutas absolutas hardcodeadas (`/srv/homecore`). Si el SSD se monta en una ruta diferente en la nueva máquina, los scripts fallan silenciosamente o apuntan a directorios incorrectos.

**Qué implica:**
- Definir una variable de entorno `HOMECORE_BASE` (ej. `/srv/homecore`) en el `.env`
- Sustituir todas las ocurrencias de la ruta absoluta en los scripts por `${HOMECORE_BASE}`
- Documentar en `arranque_inicial.md` que esta variable debe ajustarse si la ruta de montaje del SSD es diferente

**Alcance:** solo afecta a `scripts/`. El `docker-compose.yml` ya usa rutas relativas desde su propio directorio, por lo que es portable por diseño.

---

## En reserva

Ideas anotadas sin fecha ni compromiso de implementación.

| Módulo | Notas |
|---|---|
| Fotos familiares | Posible integración con Immich (alternativa self-hosted a Google Fotos) |
| Notificaciones de stock | Push/email con Ntfy cuando un producto se agota |

---

## Descartado

| Módulo | Motivo |
|---|---|
| Recetas | Descartado |
| Panel de descargas | Innecesario |
| Watchtower | Riesgo de actualizaciones automáticas no controladas |
