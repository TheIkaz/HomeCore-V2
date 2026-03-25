import os
import requests
from flask import Blueprint, jsonify, request
from ..utils.auth import es_admin

admin_bp = Blueprint("admin", __name__)

_AUTHENTIK_URL = "http://authentik-server:9000"
_GRUPOS = {
    "familia": "Familia",
    "admin":   "authentik Admins",
}


def _headers():
    token = os.environ.get("AUTHENTIK_API_TOKEN", "")
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


def _solo_admin(fn):
    from functools import wraps
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not es_admin():
            return jsonify({"status": "error", "mensaje": "Acceso restringido a administradores"}), 403
        return fn(*args, **kwargs)
    return wrapper


@admin_bp.route("/invitar", methods=["POST"])
@_solo_admin
def invitar():
    data     = request.get_json(silent=True) or {}
    nombre   = data.get("nombre",   "").strip()
    email    = data.get("email",    "").strip()
    username = data.get("username", "").strip()
    grupo    = data.get("grupo",    "familia").strip()

    if not all([nombre, email, username]):
        return jsonify({"status": "error", "mensaje": "Nombre, email y nombre de usuario son obligatorios"}), 400

    nombre_grupo = _GRUPOS.get(grupo)
    if not nombre_grupo:
        return jsonify({"status": "error", "mensaje": "Grupo no válido"}), 400

    # 1. Buscar el grupo en Authentik
    try:
        r = requests.get(
            f"{_AUTHENTIK_URL}/api/v3/core/groups/?name={nombre_grupo}",
            headers=_headers(), timeout=10,
        )
        r.raise_for_status()
        grupos = r.json().get("results", [])
        if not grupos:
            return jsonify({"status": "error", "mensaje": f"Grupo '{nombre_grupo}' no encontrado"}), 500
        grupo_pk = grupos[0]["pk"]
    except requests.RequestException as e:
        return jsonify({"status": "error", "mensaje": f"Error buscando grupo: {e}"}), 500

    # 2. Crear el usuario
    try:
        r = requests.post(
            f"{_AUTHENTIK_URL}/api/v3/core/users/",
            headers=_headers(),
            json={"username": username, "name": nombre, "email": email, "is_active": True},
            timeout=10,
        )
        if not r.ok:
            return jsonify({"status": "error", "mensaje": f"Error al crear usuario: {r.text}"}), 500
        user_pk = r.json()["pk"]
    except requests.RequestException as e:
        return jsonify({"status": "error", "mensaje": f"Error creando usuario: {e}"}), 500

    # 3. Añadir al grupo
    try:
        r = requests.post(
            f"{_AUTHENTIK_URL}/api/v3/core/groups/{grupo_pk}/add_user/",
            headers=_headers(),
            json={"pk": user_pk},
            timeout=10,
        )
        r.raise_for_status()
    except requests.RequestException as e:
        return jsonify({"status": "error", "mensaje": f"Error asignando grupo: {e}"}), 500

    # 4. Generar enlace para que el usuario establezca su contraseña
    try:
        r = requests.post(
            f"{_AUTHENTIK_URL}/api/v3/core/users/{user_pk}/recovery/",
            headers=_headers(),
            timeout=10,
        )
        if not r.ok:
            return jsonify({"status": "error", "mensaje": f"Usuario creado pero error generando enlace: {r.text}"}), 500
        enlace = r.json().get("link", "")
    except requests.RequestException as e:
        return jsonify({"status": "error", "mensaje": f"Error generando enlace: {e}"}), 500

    return jsonify({"status": "ok", "enlace": enlace})
