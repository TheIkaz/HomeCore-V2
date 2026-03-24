from flask import Blueprint, jsonify
from ..database import get_db
from ..utils.auth import get_usuario_actual

apps_bp = Blueprint("apps", __name__)


@apps_bp.route("/catalogo")
def catalogo():
    """
    Devuelve las apps visibles para el usuario actual.
    Filtra por grupos_requeridos — solo muestra apps a las que el usuario tiene acceso.
    """
    usuario = get_usuario_actual()
    grupos_usuario = set(usuario["grupos"])

    db = get_db()
    apps = db.execute(
        "SELECT nombre, nombre_visible, url, icono, grupos_requeridos FROM apps WHERE activo = 1"
    ).fetchall()

    resultado = []
    for app in apps:
        grupos_requeridos = {g.strip() for g in app["grupos_requeridos"].split(",")}
        # El grupo 'admin' tiene acceso a todo
        if grupos_usuario & grupos_requeridos or "admin" in grupos_usuario:
            resultado.append({
                "nombre":         app["nombre"],
                "nombre_visible": app["nombre_visible"],
                "url":            app["url"],
                "icono":          app["icono"],
            })

    return jsonify({
        "status":  "ok",
        "usuario": usuario["username"],
        "grupos":  usuario["grupos"],
        "datos":   resultado,
    })
