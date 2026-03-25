import os
import uuid
import requests
from flask import Blueprint, jsonify, request
from ..utils.auth import es_admin

admin_bp = Blueprint("admin", __name__)

_AUTHENTIK_URL = "http://authentik-server:9000"
_FLOW_SLUG     = "enrollment-invitation"


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
    data   = request.get_json(silent=True) or {}
    nombre = data.get("nombre", "").strip()
    email  = data.get("email", "").strip()

    if not nombre or not email:
        return jsonify({"status": "error", "mensaje": "Nombre y email son obligatorios"}), 400

    # Obtener UUID del flow de enrollment
    try:
        r = requests.get(
            f"{_AUTHENTIK_URL}/api/v3/flows/instances/?slug={_FLOW_SLUG}",
            headers=_headers(), timeout=10,
        )
        r.raise_for_status()
        resultados = r.json().get("results", [])
        if not resultados:
            return jsonify({"status": "error", "mensaje": "Flow de enrollment no encontrado en Authentik"}), 500
        flow_pk = resultados[0]["pk"]
    except requests.RequestException:
        return jsonify({"status": "error", "mensaje": "No se pudo conectar con Authentik"}), 500

    # Crear la invitación
    try:
        inv = requests.post(
            f"{_AUTHENTIK_URL}/api/v3/stages/invitation/invitations/",
            headers=_headers(),
            json={
                "name":       f"inv-{uuid.uuid4().hex[:8]}",
                "flow":       flow_pk,
                "fixed_data": {"name": nombre, "email": email},
                "single_use": True,
            },
            timeout=10,
        )
        if not inv.ok:
            return jsonify({"status": "error", "mensaje": f"Authentik: {inv.status_code} — {inv.text}"}), 500
        inv.raise_for_status()
    except requests.RequestException as e:
        return jsonify({"status": "error", "mensaje": f"Error de conexión: {e}"}), 500

    dominio = os.environ.get("DOMINIO", "")
    inv_pk  = inv.json()["pk"]
    enlace  = f"https://auth.{dominio}/if/flow/{_FLOW_SLUG}/?itoken={inv_pk}"

    return jsonify({"status": "ok", "enlace": enlace})
