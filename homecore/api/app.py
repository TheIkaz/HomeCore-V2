import os
from flask import Flask, send_from_directory
from .database import init_db
from .blueprints.apps import apps_bp
from .blueprints.inventario import inventario_bp
from .blueprints.configuracion import configuracion_bp
from .blueprints.admin import admin_bp
from .blueprints.calendario import calendario_bp

_DIST = os.path.join(os.path.dirname(__file__), "../web/dist")


def create_app():
    # static_folder=None para que Flask no registre su propio handler de
    # ficheros estáticos, que interceptaría rutas de React Router y devolvería
    # 404 cuando no encuentra el fichero (ej. refresco en /inventario/lista).
    app = Flask(__name__, static_folder=None)

    init_db(app)

    app.register_blueprint(apps_bp, url_prefix="/api/apps")
    app.register_blueprint(inventario_bp, url_prefix="/api/inventario")
    app.register_blueprint(configuracion_bp, url_prefix="/api/configuracion")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(calendario_bp, url_prefix="/api/calendario")

    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        full = os.path.join(_DIST, path)
        if path and os.path.isfile(full):
            return send_from_directory(_DIST, path)
        return send_from_directory(_DIST, "index.html")

    return app
