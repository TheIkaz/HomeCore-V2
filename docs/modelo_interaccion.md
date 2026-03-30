# HomeCore — Modelo de interacción entre módulos

**Versión 1.0 · Marzo 2026**

Este documento define las reglas de interacción entre los módulos del dominio Hogar. Es un contrato de diseño: rige cómo se comunican los módulos, quién es responsable de qué datos y cómo se gestiona la comunicación desacoplada. Aplica a todos los módulos presentes y futuros.

---

## 1. Propiedad de datos

Cada módulo es el único dueño de sus datos. Ningún módulo externo puede leer ni escribir directamente en las tablas de otro.

| Módulo | Datos que posee |
|---|---|
| Inventario | `productos` — stock, agotados, lista de compra |
| Gastos | `gastos` — transacciones económicas del hogar |
| Menú semanal | `menus_semanales`, `restricciones_alimentarias` |
| Tareas | `tareas` — estado y responsables |
| Calendario | `eventos_calendario`, `categorias_calendario` |

**Regla:** toda lectura o modificación de datos de un módulo se hace a través de su propia API. Nunca mediante acceso directo a su tabla SQLite desde otro blueprint.

---

## 2. Tipos de comunicación

### Lectura

Un módulo puede consultar datos de otro llamando a su endpoint. El módulo consultado decide qué expone.

```
Menú semanal → GET /api/inventario/buscar?nombre=tomate
               ← { "datos": [...] }
```

### Escritura cruzada

Ningún módulo modifica directamente los datos de otro. Cuando una acción en un módulo debe provocar un cambio en otro, lo hace mediante un **evento**.

```
Inventario emite → compra_realizada { productos, importe }
Gastos escucha  → registra el gasto correspondiente
```

El módulo emisor no sabe ni le importa quién consume el evento. Si el consumidor no existe (módulo no implementado aún) o falla, el emisor continúa sin bloquearse.

---

## 3. Modelo de eventos

### Estructura

Todos los eventos siguen el mismo formato:

```json
{
  "evento": "nombre_evento",
  "origen": "modulo_emisor",
  "timestamp": "2026-03-30T12:00:00Z",
  "payload": {
    "...datos relevantes del evento..."
  }
}
```

### Catálogo de eventos del sistema

| Evento | Emisor | Consumidores actuales | Payload clave |
|---|---|---|---|
| `producto_agotado` | Inventario | Lista de compra | `producto_id`, `nombre` |
| `compra_realizada` | Inventario | Gastos | `productos[]`, `importe_total`, `registrado_por` |
| `menu_generado` | Menú semanal | Lista de compra | `semana`, `ingredientes[]` |
| `tarea_completada` | Tareas | — (futuro) | `tarea_id`, `completada_por` |

> El catálogo se amplía cuando se implementa cada módulo. Un evento puede no tener consumidores en el momento de definirse — se documenta igualmente para establecer el contrato.

### Reglas de los eventos

- **El emisor no conoce a los consumidores.** Emite y olvida.
- **Los consumidores deciden si actuar.** Un módulo puede ignorar un evento sin que eso afecte al emisor.
- **Si el consumidor no está implementado**, el evento se descarta sin error. El emisor no falla.
- **Si el consumidor falla**, registra el error en el log y continúa. El sistema no se bloquea por un fallo parcial.

---

## 4. Implementación por fases

### Fase actual — llamadas síncronas dentro del monolito

En la implementación actual (Flask monolito, proceso único), los "eventos" son llamadas a funciones dentro del mismo proceso. No hay broker, cola ni transporte externo.

Lo que se define aquí es el **contrato de interfaz** (nombre, estructura, payload), no el transporte. Esto es deliberado: si en el futuro se introduce un sistema de colas real (Redis pub/sub, Celery), el contrato no cambia — solo cambia cómo se entrega el evento.

Ejemplo de implementación actual de `compra_realizada`:

```python
# En inventario/blueprints/inventario.py
# Tras actualizar el stock:
_emitir_evento("compra_realizada", {
    "productos": productos_comprados,
    "importe_total": importe,
    "registrado_por": usuario
})

# _emitir_evento es una función simple que en esta fase
# llama directamente al handler del módulo destino si existe,
# o no hace nada si el módulo no está implementado.
```

### Fase futura — broker de eventos

Cuando la complejidad lo requiera (múltiples consumidores, necesidad de reintentos, procesamiento asíncrono), se puede introducir Redis pub/sub o Celery sin cambiar los contratos definidos aquí. El stack ya incluye Redis como dependencia de Authentik.

---

## 5. Gestión de errores

| Escenario | Comportamiento esperado |
|---|---|
| Módulo destino no implementado | El evento se descarta. El emisor no lanza excepción. |
| Módulo destino falla al procesar | Se registra en el log. El emisor continúa. |
| Lectura de API falla (timeout, 500) | El módulo solicitante maneja el error localmente. No propaga. |
| Dependencia circular | Prohibida. Si se detecta, rediseñar el flujo. |

**Principio:** un fallo en un módulo no debe impedir que el resto del sistema funcione.

---

## 6. Reglas de acoplamiento

1. Los módulos no se llaman entre sí para lógica de negocio — solo para lectura de datos.
2. Las acciones que afectan a otro módulo se expresan como eventos, no como llamadas directas.
3. No hay dependencias circulares: si A depende de B, B no puede depender de A.
4. Un módulo puede existir y funcionar aunque sus consumidores de eventos no estén implementados.

---

## 7. Principios de diseño

- **Responsabilidad única:** cada módulo gestiona un único dominio de datos.
- **Bajo acoplamiento:** los módulos se comunican por contrato, no por implementación.
- **Comunicación explícita:** toda interacción entre módulos está documentada en este fichero.
- **Evolución progresiva:** el modelo es válido desde una implementación simple (llamadas síncronas) hasta una arquitectura orientada a eventos real, sin cambiar los contratos.
- **Resiliencia parcial:** el sistema funciona aunque algún módulo falle o no esté implementado.
