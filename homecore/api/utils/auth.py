from flask import request


def get_usuario_actual():
    """
    Lee la identidad del usuario desde las cabeceras que inyecta Authentik.
    Caddy valida la sesión antes de que cualquier petición llegue aquí,
    por lo que estas cabeceras siempre están presentes en producción.
    """
    grupos_raw = request.headers.get("X-Authentik-Groups", "")
    grupos = [g.strip() for g in grupos_raw.split(",") if g.strip()]

    return {
        "username": request.headers.get("X-Authentik-Username", ""),
        "email":    request.headers.get("X-Authentik-Email", ""),
        "nombre":   request.headers.get("X-Authentik-Name", ""),
        "grupos":   grupos,
    }


def es_admin():
    return "admin" in get_usuario_actual()["grupos"]
