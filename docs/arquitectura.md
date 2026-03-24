# HomeCore — Documento de Arquitectura

**Versión 1.2 · Marzo 2026**
Servidor privado doméstico — Raspberry Pi 4 · 8 GB RAM · SSD 1 TB

---

## 1. Visión general

HomeCore es un servidor privado doméstico cuyo objetivo es centralizar el acceso a aplicaciones y servicios del hogar bajo un único punto de entrada seguro, con gestión de usuarios unificada y sin depender de servicios externos de terceros para los datos personales.

El sistema está diseñado para:

- Ser accesible desde cualquier dispositivo de la familia, dentro y fuera de casa, sin exponer ningún puerto al exterior.
- Gestionar usuarios, sesiones y permisos desde un único panel de administración.
- Permitir añadir nuevas aplicaciones en el futuro sin rediseñar la arquitectura.
- Mantener todos los datos en almacenamiento local bajo control propio.

---

## 2. Hardware

| Componente | Especificación | Función |
|---|---|---|
| Placa principal | Raspberry Pi 4 — 8 GB RAM | Servidor principal. Ejecuta todos los servicios. |
| Almacenamiento OS | Tarjeta microSD | Solo sistema operativo. Sin datos de apps. |
| Almacenamiento datos | SSD externo USB — 1 TB | Toda la persistencia: configs, datos, media. |
| Sistema operativo | Raspberry Pi OS 64-bit | Base del sistema. Docker corre sobre él. |

> **Nota:** La tarjeta SD contiene exclusivamente el sistema operativo. Todos los datos de aplicaciones, configuraciones de Docker y archivos de usuario residen en el SSD. Esto es crítico: las SD degradan con escrituras intensivas.

---

## 3. Acceso remoto

El servidor no expone ningún puerto directamente a internet. El acceso remoto se resuelve con dos capas complementarias.

### 3.1 Cloudflare Tunnel — acceso de la familia

La Raspberry establece un túnel saliente cifrado hacia los servidores de Cloudflare. El tráfico de los usuarios entra por Cloudflare y llega a la Pi a través de ese túnel. Ningún puerto del router está abierto.

| Característica | Detalle |
|---|---|
| Coste | Gratuito con cuenta Cloudflare |
| Dominio | Subdominio de Cloudflare gratuito o dominio propio |
| Fricción usuario | Ninguna — acceso por navegador, sin instalar apps |
| Seguridad | TLS extremo a extremo, la Pi nunca expone puertos |
| Quién lo usa | Toda la familia para acceso cotidiano |

### 3.2 ZeroTier — acceso de administración

ZeroTier crea una red virtual privada P2P cifrada. Se mantiene exclusivamente para el administrador del sistema (acceso SSH a la Pi, tareas de mantenimiento). La familia no necesita instalarlo.

| Característica | Detalle |
|---|---|
| Coste | Gratuito hasta 25 dispositivos |
| Fricción usuario | Requiere instalar app ZeroTier en el dispositivo admin |
| Uso | SSH, diagnóstico, acceso de bajo nivel a la Pi |
| Quién lo usa | Solo el administrador del sistema |

---

## 4. Stack de software

Todos los servicios corren en contenedores Docker, orquestados con Docker Compose. Esto garantiza aislamiento, reproducibilidad y facilidad para añadir o actualizar servicios sin afectar al resto.

| Capa | Software elegido | Justificación |
|---|---|---|
| Contenedores | Docker + Docker Compose | Aislamiento de servicios, fácil despliegue y actualización. |
| Reverse proxy | Caddy | TLS automático, configuración simple, integración nativa con Authentik. |
| Autenticación | Authentik | SSO, gestión de usuarios con UI web, MFA, sesiones por dispositivo. |
| Hub / dashboard | HomeCore (Flask + React) | Desarrollo propio. Pantalla principal y módulos personalizados. |
| Archivos | Filebrowser | Explorador de ficheros web ligero. Subir y descargar contenido al SSD desde navegador o móvil. |
| Streaming media | Jellyfin | Películas y música. Libre, sin suscripción. |
| Documentos / OCR | Paperless-ngx | Gestión de documentos escaneados con OCR y búsqueda. |
| Backups | Restic + Rclone | Backups incrementales cifrados con copia offsite. |

---

## 5. Arquitectura de red y flujo de acceso

### 5.1 Flujo de una petición

Toda petición sigue siempre el mismo camino, independientemente del servicio al que se acceda:

| Paso | Descripción |
|---|---|
| 1 — Dispositivo | El usuario abre el navegador y accede al dominio configurado. |
| 2 — Cloudflare Tunnel | La petición llega cifrada a la Pi a través del túnel. Ningún puerto expuesto. |
| 3 — Caddy | Recibe la petición. Comprueba si el usuario tiene sesión válida consultando a Authentik (forward auth). |
| 4 — Authentik | Si no hay sesión, muestra la pantalla de login. Si la hay, confirma la identidad y devuelve las cabeceras del usuario. |
| 5 — Servicio destino | Caddy reenvía la petición al servicio correspondiente (HomeCore, Nextcloud, Jellyfin, Paperless) con las cabeceras de identidad incluidas. |
| 6 — Respuesta | El servicio responde. El usuario nunca abandona el dominio — todo pasa por Caddy. |

### 5.2 Subdominios

Cada servicio tiene su propio subdominio bajo el dominio principal. Caddy enruta por subdominio hacia el contenedor correspondiente en la red interna de Docker.

| Subdominio | Servicio |
|---|---|
| homecore.tudominio.com | HomeCore — dashboard principal |
| auth.tudominio.com | Authentik — login y panel de admin |
| files.tudominio.com | Filebrowser |
| media.tudominio.com | Jellyfin |
| docs.tudominio.com | Paperless-ngx |

> **Nota:** Los servicios internos (Nextcloud, Jellyfin, Paperless) solo escuchan en la red interna de Docker. Nunca son accesibles directamente desde el exterior.

---

## 6. Autenticación y gestión de usuarios

### 6.1 Modelo SSO

Authentik actúa como proveedor de identidad único (SSO — Single Sign-On) para todo el sistema. Los usuarios existen una sola vez en Authentik. El resto de servicios no tienen su propio sistema de login — delegan en Authentik mediante el protocolo estándar OIDC (OpenID Connect).

Consecuencias prácticas:
- Crear un usuario en Authentik le da acceso automáticamente a todos los servicios asignados.
- Bloquear un usuario en Authentik le corta el acceso a todos los servicios a la vez.
- El usuario solo recuerda una contraseña para todo el sistema.
- Cambiar la contraseña en Authentik la cambia en todos los servicios.

### 6.2 Grupos y permisos

| Grupo | Acceso |
|---|---|
| familia | HomeCore, Filebrowser (acceso al SSD), Jellyfin (todas las bibliotecas), Paperless |
| admin | Todo lo anterior más el panel de administración de Authentik y acceso SSH vía ZeroTier |

### 6.3 Gestión de dispositivos y sesiones

Authentik permite, desde su panel de administración web:
- Ver qué sesiones tiene abiertas cada usuario y desde qué IP y dispositivo.
- Cerrar una sesión concreta o todas las sesiones de un usuario.
- Obligar a reautenticación en el siguiente acceso.
- Configurar MFA por usuario o por grupo.

### 6.4 Integración con HomeCore

HomeCore no gestiona autenticación propia. Caddy valida la sesión con Authentik antes de que cualquier petición llegue a Flask. HomeCore recibe la identidad del usuario en cabeceras HTTP estándar:

| Cabecera HTTP | Contenido |
|---|---|
| X-Forwarded-User | Nombre de usuario (login) |
| X-Forwarded-Email | Email del usuario |
| X-Forwarded-Groups | Grupos a los que pertenece |

Con esa información, HomeCore sabe quién es el usuario y qué apps mostrarle en el dashboard, sin base de datos de usuarios propia ni gestión de tokens JWT.

---

## 7. HomeCore — detalle del hub

### 7.1 Función

HomeCore es la pantalla principal del sistema. Su función es:
- Mostrar el catálogo de aplicaciones disponibles para el usuario según sus grupos.
- Alojar módulos propios desarrollados a medida (inventario, lista de la compra, etc.).
- Servir como punto de lanzamiento hacia los servicios externos (Nextcloud, Jellyfin, Paperless).

### 7.2 Arquitectura interna

| Capa | Tecnología / descripción |
|---|---|
| Frontend | React (Vite) — SPA servida como ficheros estáticos |
| Backend API | Flask (Python) — blueprints por módulo |
| Base de datos | SQLite — catálogo de apps, datos de módulos propios |
| Contenedor | Docker — imagen Python + build de React |

### 7.3 Blueprints de la API

| Blueprint | Función |
|---|---|
| /api/apps/catalogo | Devuelve las apps disponibles para el usuario actual (filtra por grupos de Authentik) |
| /api/inventario/* | Módulo de inventario doméstico |
| /api/configuracion/* | Ajustes del sistema accesibles al admin |
| Futuros módulos | Cada módulo nuevo es un blueprint Flask independiente |

> **Nota:** Los blueprints de auth del código legacy desaparecen. La autenticación la gestiona Authentik + Caddy completamente fuera de HomeCore.

### 7.4 Catálogo de apps

El catálogo es una tabla en SQLite que HomeCore consulta para saber qué apps existen y cuál es su URL.

| Campo | Descripción |
|---|---|
| nombre | Identificador único (nextcloud, jellyfin, paperless...) |
| nombre_visible | Texto que se muestra en el dashboard |
| url | URL del servicio (subdominio de Caddy) |
| icono | Nombre del icono (lucide-react) |
| grupos_requeridos | Grupos de Authentik que pueden ver esta app |
| activo | Permite ocultar una app sin eliminarla |

---

## 8. Servicios de contenido

### 8.1 Filebrowser — archivos

| Aspecto | Detalle |
|---|---|
| Función | Explorador de ficheros web. Subir, descargar, crear carpetas y mover archivos en el SSD desde el navegador o el móvil. Actúa como "cargador" de contenido para Jellyfin y Paperless. |
| Acceso | Navegador (escritorio y móvil). Sin app adicional. |
| Autenticación | Forward auth de Authentik vía Caddy (igual que HomeCore). Sin OIDC. |
| Carpetas expuestas | `/srv/homecore/homecore/filebrowser/data/` — contiene subcarpetas `media/` y `documentos/` que montan Jellyfin y Paperless respectivamente. |
| Base de datos | SQLite ligera para configuración interna (usuarios, preferencias). |
| Flujo típico | Subir película → Jellyfin la detecta automáticamente. Subir PDF → Paperless lo indexa con OCR. |

### 8.2 Jellyfin — streaming de media

| Aspecto | Detalle |
|---|---|
| Función | Streaming de películas y música para la familia. |
| Acceso | Navegador, app móvil, app de Smart TV, Chromecast. |
| Autenticación | SSO via Authentik (requiere plugin SSO — instalación sencilla). |
| Bibliotecas | Asignables por usuario o grupo desde el panel de Jellyfin. |
| Transcoding | Desactivado por defecto en Pi 4 — sirve ficheros directos para evitar saturar CPU. |
| Datos | SSD: /srv/homecore/media/ |

### 8.3 Paperless-ngx — gestión documental

| Aspecto | Detalle |
|---|---|
| Función | Archivo y búsqueda de documentos escaneados, facturas y recibos con OCR automático. |
| Acceso | Navegador únicamente. |
| Autenticación | SSO via Authentik (OIDC nativo). |
| OCR | Reconocimiento automático de texto en PDFs e imágenes al subir. |
| Permisos | Documentos privados por usuario. Documentos compartidos por grupo. |
| Datos | SSD: /srv/homecore/data/paperless/ |

---

## 9. Estructura de directorios en el SSD

| Ruta en el SSD | Contenido |
|---|---|
| /srv/homecore/ | Raíz de todo el proyecto |
| /srv/homecore/compose/ | Ficheros docker-compose.yml y .env |
| /srv/homecore/caddy/ | Caddyfile y certificados TLS |
| /srv/homecore/authentik/ | Configuración y base de datos de Authentik |
| /srv/homecore/homecore/ | Código fuente de HomeCore (repo clonado) |
| /srv/homecore/homecore/filebrowser/data/media/ | Archivos de media (películas, series, música) — compartido con Jellyfin |
| /srv/homecore/homecore/filebrowser/data/documentos/ | Documentos para Paperless (PDFs, facturas, recibos) |
| /srv/homecore/homecore/filebrowser/db/ | Base de datos SQLite de Filebrowser |
| /srv/homecore/homecore/paperless/data/ | Datos internos y BD de Paperless-ngx |
| /srv/homecore/homecore/paperless/media/ | Archivos procesados por Paperless |
| /srv/homecore/backups/ | Snapshots locales de Restic |
| /srv/homecore/logs/ | Logs centralizados de los servicios |

---

## 10. Backups

Estrategia 3-2-1: tres copias, en dos medios distintos, uno fuera del hogar.

| Capa | Detalle |
|---|---|
| Herramienta | Restic para snapshots incrementales cifrados + Rclone para sincronización offsite. |
| Backup local | Snapshot diario en /srv/homecore/backups/ — retención 7 días. |
| Backup offsite | Rclone sincroniza los snapshots cifrados a un proveedor cloud (Backblaze B2 o similar). |
| Qué se incluye | Datos de Nextcloud, base de datos de Paperless, configuración de Authentik, SQLite de HomeCore, Caddyfile. |
| Qué se excluye | Media de Jellyfin (películas/música) — son ficheros originales recuperables. |
| Frecuencia | Cron diario a las 03:00. Verificación de integridad semanal. |
| Cifrado | Restic cifra los snapshots con contraseña antes de enviarlos offsite. |

---

## 11. Fases de construcción

| Fase | Título | Contenido |
|---|---|---|
| Fase 1 | Base de infraestructura | Docker + Caddy + Authentik + Cloudflare Tunnel. Resultado: login centralizado funcional. |
| Fase 2 | HomeCore como dashboard | Refactorizar HomeCore, catálogo de apps en SQLite, dashboard React dinámico. |
| Fase 3 | Servicios de contenido | Nextcloud + Jellyfin + Paperless con SSO integrado. |
| Fase 4 | Estabilidad y backups | Restic + Rclone + Watchtower. Sistema completo en producción. |

---

## 12. Escalabilidad — añadir servicios en el futuro

Añadir cualquier servicio nuevo sigue siempre el mismo proceso:

1. Añadir el contenedor al docker-compose.yml.
2. Añadir una entrada en el Caddyfile para el nuevo subdominio.
3. Si el servicio soporta OIDC: configurar la integración con Authentik. Si no: Caddy actúa de forward auth.
4. Insertar una fila en el catálogo de apps de HomeCore. El dashboard lo muestra automáticamente.

---

## 13. Control de versiones

| Dato | Valor |
|---|---|
| Repositorio | https://github.com/TheIkaz/HomeCore-V2 |
| Visibilidad | Público — nunca contiene secretos |

### Tags por fase

| Tag Git | Contenido |
|---|---|
| v0.1 | Docker + Caddy + Authentik + Cloudflare Tunnel funcionando |
| v0.2 | HomeCore como dashboard con catálogo de apps dinámico |
| v0.3 | Nextcloud, Jellyfin y Paperless con SSO integrado |
| v1.0 | Backups, monitorización y sistema completo en producción |

---

## 14. Glosario

| Término | Significado |
|---|---|
| Authentik | Servidor de identidad open-source. Gestiona usuarios, sesiones, MFA y SSO. |
| Caddy | Servidor web y reverse proxy con gestión automática de certificados TLS. |
| Cloudflare Tunnel | Túnel cifrado saliente que permite acceso remoto sin abrir puertos en el router. |
| Docker Compose | Herramienta para definir y ejecutar múltiples contenedores Docker desde un único fichero YAML. |
| Forward Auth | Mecanismo por el que Caddy consulta a Authentik si el usuario tiene sesión válida antes de servir cualquier ruta. |
| OIDC | OpenID Connect. Protocolo estándar de autenticación delegada. |
| Restic | Herramienta de backup incremental con cifrado. |
| Rclone | Herramienta de sincronización de ficheros hacia proveedores cloud. |
| SSO | Single Sign-On. Un único login da acceso a todos los servicios sin volver a autenticarse. |
| ZeroTier | Red virtual privada P2P. Usada exclusivamente para acceso de administración a la Pi por SSH. |
