from flask import Blueprint, jsonify, request
from ..database import get_db
from ..utils.auth import es_admin, get_usuario_actual

configuracion_bp = Blueprint("configuracion", __name__)


def _solo_admin(fn):
    """Decorador: rechaza la petición si el usuario no es admin."""
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not es_admin():
            return jsonify({"status": "error", "mensaje": "Acceso restringido a administradores"}), 403
        return fn(*args, **kwargs)
    return wrapper


@configuracion_bp.route("/apps")
@_solo_admin
def listar_apps():
    """Lista todas las apps del catálogo (incluidas las inactivas)."""
    db = get_db()
    apps = db.execute("SELECT * FROM apps ORDER BY nombre").fetchall()
    return jsonify({
        "status": "ok",
        "datos": [dict(app) for app in apps]
    })


@configuracion_bp.route("/apps", methods=["POST"])
@_solo_admin
def crear_app():
    """Añade una nueva app al catálogo."""
    data = request.get_json(silent=True) or {}
    campos = ["nombre", "nombre_visible", "url", "icono"]
    for campo in campos:
        if not data.get(campo):
            return jsonify({"status": "error", "mensaje": f"Campo requerido: '{campo}'"}), 400

    db = get_db()
    try:
        db.execute(
            """INSERT INTO apps (nombre, nombre_visible, url, icono, grupos_requeridos, activo)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                data["nombre"], data["nombre_visible"], data["url"], data["icono"],
                data.get("grupos_requeridos", "familia"),
                int(data.get("activo", True)),
            )
        )
        db.commit()
    except Exception:
        return jsonify({"status": "error", "mensaje": f"Ya existe una app con nombre '{data['nombre']}'"}), 409

    return jsonify({"status": "ok", "mensaje": "App añadida al catálogo"})


@configuracion_bp.route("/apps/<nombre>", methods=["PATCH"])
@_solo_admin
def actualizar_app(nombre):
    """Actualiza campos de una app (url, activo, icono, grupos_requeridos...)."""
    data = request.get_json(silent=True) or {}
    db = get_db()

    if not db.execute("SELECT nombre FROM apps WHERE nombre = ?", (nombre,)).fetchone():
        return jsonify({"status": "error", "mensaje": f"App '{nombre}' no encontrada"}), 404

    campos_permitidos = {"nombre_visible", "url", "icono", "grupos_requeridos", "activo"}
    updates = {k: v for k, v in data.items() if k in campos_permitidos}
    if not updates:
        return jsonify({"status": "error", "mensaje": "No se proporcionaron campos válidos"}), 400

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    db.execute(f"UPDATE apps SET {set_clause} WHERE nombre = ?", [*updates.values(), nombre])
    db.commit()
    return jsonify({"status": "ok", "mensaje": "App actualizada"})


@configuracion_bp.route("/apps/<nombre>", methods=["DELETE"])
@_solo_admin
def eliminar_app(nombre):
    """Elimina una app del catálogo."""
    db = get_db()
    resultado = db.execute("DELETE FROM apps WHERE nombre = ?", (nombre,))
    if resultado.rowcount == 0:
        return jsonify({"status": "error", "mensaje": f"App '{nombre}' no encontrada"}), 404
    db.commit()
    return jsonify({"status": "ok", "mensaje": "App eliminada del catálogo"})
