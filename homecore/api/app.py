import os
from flask import Flask, send_from_directory
from .database import init_db
from .blueprints.apps import apps_bp
from .blueprints.inventario import inventario_bp
from .blueprints.configuracion import configuracion_bp


def create_app():
    app = Flask(
        __name__,
        static_folder=os.path.join(os.path.dirname(__file__), "../web/dist"),
        static_url_path=""
    )

    init_db(app)

    app.register_blueprint(apps_bp, url_prefix="/api/apps")
    app.register_blueprint(inventario_bp, url_prefix="/api/inventario")
    app.register_blueprint(configuracion_bp, url_prefix="/api/configuracion")

    # Sirve el frontend React para cualquier ruta no-API
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_frontend(path):
        dist = app.static_folder
        if path and os.path.exists(os.path.join(dist, path)):
            return send_from_directory(dist, path)
        return send_from_directory(dist, "index.html")

    return app
