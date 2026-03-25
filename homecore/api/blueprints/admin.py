import os
import psutil
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
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    grupo    = data.get("grupo",    "familia").strip()

    if not all([nombre, username, password]):
        return jsonify({"status": "error", "mensaje": "Nombre, usuario y contraseña son obligatorios"}), 400

    nombre_grupo = _GRUPOS.get(grupo)
    if not nombre_grupo:
        return jsonify({"status": "error", "mensaje": "Grupo no válido"}), 400

    # 1. Buscar el grupo en Authentik (comparación flexible, sin distinción de mayúsculas)
    try:
        r = requests.get(
            f"{_AUTHENTIK_URL}/api/v3/core/groups/",
            headers=_headers(), timeout=10,
        )
        r.raise_for_status()
        todos = r.json().get("results", [])
        coincidencia = [g for g in todos if nombre_grupo.lower() in g["name"].lower()]
        if not coincidencia:
            nombres = [g["name"] for g in todos]
            return jsonify({"status": "error", "mensaje": f"Grupo '{nombre_grupo}' no encontrado. Grupos disponibles: {nombres}"}), 500
        grupo_pk = coincidencia[0]["pk"]
    except requests.RequestException as e:
        return jsonify({"status": "error", "mensaje": f"Error buscando grupo: {e}"}), 500

    # 2. Crear el usuario
    try:
        r = requests.post(
            f"{_AUTHENTIK_URL}/api/v3/core/users/",
            headers=_headers(),
            json={"username": username, "name": nombre, "is_active": True},
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

    # 4. Asignar contraseña
    try:
        r = requests.post(
            f"{_AUTHENTIK_URL}/api/v3/core/users/{user_pk}/set_password/",
            headers=_headers(),
            json={"password": password},
            timeout=10,
        )
        r.raise_for_status()
    except requests.RequestException as e:
        return jsonify({"status": "error", "mensaje": f"Error asignando contraseña: {e}"}), 500

    return jsonify({"status": "ok"})


@admin_bp.route("/sistema", methods=["GET"])
@_solo_admin
def sistema():
    cpu = psutil.cpu_percent(interval=0.5)

    ram = psutil.virtual_memory()

    disco = psutil.disk_usage("/")

    temp = None
    try:
        temps = psutil.sensors_temperatures()
        if temps:
            for entries in temps.values():
                if entries:
                    temp = round(entries[0].current, 1)
                    break
    except AttributeError:
        pass

    return jsonify({
        "status": "ok",
        "cpu": cpu,
        "ram": {
            "usado":      round(ram.used    / 1024 ** 3, 2),
            "total":      round(ram.total   / 1024 ** 3, 2),
            "porcentaje": ram.percent,
        },
        "disco": {
            "usado":      round(disco.used  / 1024 ** 3, 1),
            "total":      round(disco.total / 1024 ** 3, 1),
            "porcentaje": disco.percent,
        },
        "temperatura": temp,
    })
