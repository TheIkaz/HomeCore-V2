from flask import Blueprint, jsonify, request
from ..database import get_db

inventario_bp = Blueprint("inventario", __name__)


def _producto_a_dict(row):
    return {
        "id":              row["id"],
        "nombre":          row["nombre"],
        "categoria":       row["categoria"],
        "cantidad":        row["cantidad"],
        "unidad":          row["unidad"],
        "umbral_agotado":  row["umbral_agotado"],
        "agotado":         bool(row["agotado"]),
        "en_lista_compra": bool(row["en_lista_compra"]),
    }


@inventario_bp.route("", methods=["GET"])
@inventario_bp.route("/", methods=["GET"])
def listar():
    db = get_db()
    productos = db.execute("SELECT * FROM productos ORDER BY categoria, nombre").fetchall()
    return jsonify({"status": "ok", "datos": [_producto_a_dict(p) for p in productos]})


@inventario_bp.route("/agotados")
def agotados():
    db = get_db()
    productos = db.execute("SELECT * FROM productos WHERE agotado = 1").fetchall()
    return jsonify({"status": "ok", "datos": [_producto_a_dict(p) for p in productos]})


@inventario_bp.route("/lista-compra")
def lista_compra():
    db = get_db()
    productos = db.execute("SELECT * FROM productos WHERE en_lista_compra = 1").fetchall()
    return jsonify({"status": "ok", "datos": [_producto_a_dict(p) for p in productos]})


@inventario_bp.route("/buscar")
def buscar():
    nombre    = request.args.get("nombre", "").lower()
    categoria = request.args.get("categoria", "").lower()
    agotado   = request.args.get("agotado")
    en_lista  = request.args.get("en_lista")

    query  = "SELECT * FROM productos WHERE 1=1"
    params = []

    if nombre:
        query += " AND LOWER(nombre) LIKE ?"
        params.append(f"%{nombre}%")
    if categoria:
        query += " AND LOWER(categoria) = ?"
        params.append(categoria)
    if agotado is not None:
        query += " AND agotado = ?"
        params.append(1 if agotado.lower() == "true" else 0)
    if en_lista is not None:
        query += " AND en_lista_compra = ?"
        params.append(1 if en_lista.lower() == "true" else 0)

    db = get_db()
    productos = db.execute(query, params).fetchall()
    return jsonify({"status": "ok", "datos": [_producto_a_dict(p) for p in productos]})


@inventario_bp.route("/<id_producto>")
def obtener(id_producto):
    db = get_db()
    producto = db.execute("SELECT * FROM productos WHERE id = ?", (id_producto,)).fetchone()
    if not producto:
        return jsonify({"status": "error", "mensaje": f"Producto '{id_producto}' no encontrado"}), 404
    return jsonify({"status": "ok", "datos": _producto_a_dict(producto)})


@inventario_bp.route("", methods=["POST"])
@inventario_bp.route("/", methods=["POST"])
def crear():
    data = request.get_json(silent=True) or {}
    error = _validar_producto(data, nuevo=True)
    if error:
        return jsonify({"status": "error", "mensaje": error}), 400

    db = get_db()
    if db.execute("SELECT id FROM productos WHERE id = ?", (data["id"],)).fetchone():
        return jsonify({"status": "error", "mensaje": f"Ya existe un producto con id '{data['id']}'"}), 409

    db.execute(
        """INSERT INTO productos (id, nombre, categoria, cantidad, unidad, umbral_agotado, agotado, en_lista_compra)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            data["id"], data["nombre"], data["categoria"],
            data["cantidad"], data["unidad"], data["umbral_agotado"],
            int(data.get("agotado", False)),
            int(data.get("en_lista_compra", False)),
        )
    )
    db.commit()
    _actualizar_agotado(db, data["id"])
    return jsonify({"status": "ok", "mensaje": "Producto creado correctamente"})


@inventario_bp.route("/<id_producto>", methods=["PUT"])
def editar(id_producto):
    data = request.get_json(silent=True) or {}
    error = _validar_producto(data, nuevo=False)
    if error:
        return jsonify({"status": "error", "mensaje": error}), 400

    db = get_db()
    if not db.execute("SELECT id FROM productos WHERE id = ?", (id_producto,)).fetchone():
        return jsonify({"status": "error", "mensaje": f"Producto '{id_producto}' no encontrado"}), 404

    db.execute(
        """UPDATE productos SET nombre=?, categoria=?, cantidad=?, unidad=?,
           umbral_agotado=?, agotado=?, en_lista_compra=? WHERE id=?""",
        (
            data["nombre"], data["categoria"], data["cantidad"],
            data["unidad"], data["umbral_agotado"],
            int(data.get("agotado", False)),
            int(data.get("en_lista_compra", False)),
            id_producto,
        )
    )
    db.commit()
    _actualizar_agotado(db, id_producto)
    return jsonify({"status": "ok", "mensaje": "Producto actualizado correctamente"})


@inventario_bp.route("/<id_producto>", methods=["PATCH"])
def modificar(id_producto):
    data = request.get_json(silent=True) or {}
    db = get_db()

    producto = db.execute("SELECT * FROM productos WHERE id = ?", (id_producto,)).fetchone()
    if not producto:
        return jsonify({"status": "error", "mensaje": f"Producto '{id_producto}' no encontrado"}), 404

    campos_permitidos = {"nombre", "categoria", "cantidad", "unidad", "umbral_agotado", "agotado", "en_lista_compra"}
    updates = {k: v for k, v in data.items() if k in campos_permitidos}
    if not updates:
        return jsonify({"status": "error", "mensaje": "No se proporcionaron campos válidos"}), 400

    set_clause = ", ".join(f"{k} = ?" for k in updates)
    db.execute(f"UPDATE productos SET {set_clause} WHERE id = ?", [*updates.values(), id_producto])
    db.commit()
    _actualizar_agotado(db, id_producto)
    return jsonify({"status": "ok", "mensaje": "Producto modificado correctamente"})


@inventario_bp.route("/<id_producto>", methods=["DELETE"])
def eliminar(id_producto):
    db = get_db()
    resultado = db.execute("DELETE FROM productos WHERE id = ?", (id_producto,))
    if resultado.rowcount == 0:
        return jsonify({"status": "error", "mensaje": f"Producto '{id_producto}' no encontrado"}), 404
    db.commit()
    return jsonify({"status": "ok", "mensaje": "Producto eliminado correctamente"})


# ── Helpers ────────────────────────────────────────────────────────

def _validar_producto(data, nuevo):
    campos_requeridos = ["id", "nombre", "categoria", "cantidad", "unidad", "umbral_agotado"]
    if nuevo:
        for campo in campos_requeridos:
            if campo not in data:
                return f"Campo requerido: '{campo}'"
    if "cantidad" in data and not isinstance(data["cantidad"], (int, float)):
        return "El campo 'cantidad' debe ser numérico"
    if "umbral_agotado" in data and not isinstance(data["umbral_agotado"], (int, float)):
        return "El campo 'umbral_agotado' debe ser numérico"
    return None


def _actualizar_agotado(db, id_producto):
    """Recalcula el flag agotado según la cantidad y el umbral."""
    producto = db.execute(
        "SELECT cantidad, umbral_agotado FROM productos WHERE id = ?", (id_producto,)
    ).fetchone()
    if producto:
        agotado = 1 if producto["cantidad"] <= producto["umbral_agotado"] else 0
        db.execute("UPDATE productos SET agotado = ? WHERE id = ?", (agotado, id_producto))
        db.commit()
