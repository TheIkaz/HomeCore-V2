from flask import request


def get_usuario_actual():
    """
    Lee la identidad del usuario desde las cabeceras que inyecta Authentik.
    Caddy valida la sesión antes de que cualquier petición llegue aquí,
    por lo que estas cabeceras siempre están presentes en producción.
    """
    grupos_raw = request.headers.get("X-Authentik-Groups", "")
    grupos = []
    for entrada in grupos_raw.split(","):
        entrada = entrada.strip()
        if not entrada:
            continue
        # Authentik envía "Nombre visible|slug" — usamos el slug
        grupos.append(entrada.split("|")[-1].strip() if "|" in entrada else entrada)

    return {
        "username": request.headers.get("X-Authentik-Username", ""),
        "email":    request.headers.get("X-Authentik-Email", ""),
        "nombre":   request.headers.get("X-Authentik-Name", ""),
        "grupos":   grupos,
    }


def es_admin():
    return "admin" in get_usuario_actual()["grupos"]
