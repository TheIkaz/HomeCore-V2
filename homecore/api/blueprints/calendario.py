from flask import Blueprint, jsonify, request
from ..database import get_db
from ..utils.auth import get_usuario_actual

calendario_bp = Blueprint("calendario", __name__)


@calendario_bp.route("/eventos")
def listar_eventos():
    mes  = request.args.get("mes",  type=int)
    anio = request.args.get("anio", type=int)

    db = get_db()
    if mes and anio:
        filas = db.execute(
            """
            SELECT e.id, e.titulo, e.fecha, e.hora, e.descripcion, e.creado_por,
                   c.id AS categoria_id, c.nombre AS categoria_nombre, c.color AS categoria_color
            FROM eventos_calendario e
            LEFT JOIN categorias_calendario c ON e.categoria_id = c.id
            WHERE strftime('%m', e.fecha) = ? AND strftime('%Y', e.fecha) = ?
            ORDER BY e.fecha, e.hora
            """,
            (f"{mes:02d}", str(anio)),
        ).fetchall()
    else:
        filas = db.execute(
            """
            SELECT e.id, e.titulo, e.fecha, e.hora, e.descripcion, e.creado_por,
                   c.id AS categoria_id, c.nombre AS categoria_nombre, c.color AS categoria_color
            FROM eventos_calendario e
            LEFT JOIN categorias_calendario c ON e.categoria_id = c.id
            ORDER BY e.fecha, e.hora
            """,
        ).fetchall()

    return jsonify({"status": "ok", "datos": [dict(f) for f in filas]})


@calendario_bp.route("/eventos", methods=["POST"])
def crear_evento():
    data        = request.get_json(silent=True) or {}
    titulo      = data.get("titulo",      "").strip()
    fecha       = data.get("fecha",       "").strip()
    hora        = data.get("hora",        "").strip() or None
    descripcion = data.get("descripcion", "").strip() or None
    categoria_id = data.get("categoria_id")

    if not titulo or not fecha:
        return jsonify({"status": "error", "mensaje": "Título y fecha son obligatorios"}), 400

    usuario = get_usuario_actual()
    db = get_db()
    cur = db.execute(
        "INSERT INTO eventos_calendario (titulo, fecha, hora, descripcion, categoria_id, creado_por) VALUES (?,?,?,?,?,?)",
        (titulo, fecha, hora, descripcion, categoria_id, usuario["username"]),
    )
    db.commit()
    return jsonify({"status": "ok", "id": cur.lastrowid}), 201


@calendario_bp.route("/eventos/<int:evento_id>", methods=["DELETE"])
def eliminar_evento(evento_id):
    db = get_db()
    db.execute("DELETE FROM eventos_calendario WHERE id = ?", (evento_id,))
    db.commit()
    return jsonify({"status": "ok"})


@calendario_bp.route("/categorias")
def listar_categorias():
    db = get_db()
    filas = db.execute("SELECT id, nombre, color FROM categorias_calendario ORDER BY nombre").fetchall()
    return jsonify({"status": "ok", "datos": [dict(f) for f in filas]})


@calendario_bp.route("/categorias", methods=["POST"])
def crear_categoria():
    data   = request.get_json(silent=True) or {}
    nombre = data.get("nombre", "").strip()
    color  = data.get("color",  "#6366f1").strip()

    if not nombre:
        return jsonify({"status": "error", "mensaje": "Nombre es obligatorio"}), 400

    db = get_db()
    try:
        cur = db.execute(
            "INSERT INTO categorias_calendario (nombre, color) VALUES (?,?)",
            (nombre, color),
        )
        db.commit()
        return jsonify({"status": "ok", "id": cur.lastrowid}), 201
    except Exception:
        return jsonify({"status": "error", "mensaje": "Ya existe una categoría con ese nombre"}), 409
