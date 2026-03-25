import sqlite3
import os
from flask import g

# La base de datos vive en el SSD, mapeada al contenedor en /data/
DATABASE = os.environ.get("DATABASE_PATH", "/data/homecore.db")


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(e=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db(app):
    app.teardown_appcontext(close_db)
    with app.app_context():
        _crear_tablas()
        _seed_apps()


def _crear_tablas():
    db = get_db()
    db.executescript("""
        CREATE TABLE IF NOT EXISTS apps (
            id                INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre            TEXT UNIQUE NOT NULL,
            nombre_visible    TEXT NOT NULL,
            url               TEXT NOT NULL,
            icono             TEXT NOT NULL,
            grupos_requeridos TEXT NOT NULL DEFAULT 'familia',
            activo            INTEGER NOT NULL DEFAULT 1
        );

        CREATE TABLE IF NOT EXISTS productos (
            id              TEXT PRIMARY KEY,
            nombre          TEXT NOT NULL,
            categoria       TEXT NOT NULL,
            cantidad        REAL NOT NULL DEFAULT 0,
            unidad          TEXT NOT NULL,
            umbral_agotado  REAL NOT NULL DEFAULT 0,
            agotado         INTEGER NOT NULL DEFAULT 0,
            en_lista_compra INTEGER NOT NULL DEFAULT 0
        );
    """)
    db.commit()


def _seed_apps():
    """Inserta las apps iniciales si la tabla está vacía."""
    db = get_db()
    if db.execute("SELECT COUNT(*) FROM apps").fetchone()[0] > 0:
        return

    apps_iniciales = [
        ("inventario",   "Inventario", "/inventario",               "Package",    "familia"),
        ("filebrowser",  "Archivos",   "https://files.theikaz.com", "FolderOpen", "familia"),
        ("jellyfin",     "Media",      "https://media.theikaz.com", "Play",       "familia"),
    ]
    db.executemany(
        "INSERT INTO apps (nombre, nombre_visible, url, icono, grupos_requeridos) VALUES (?,?,?,?,?)",
        apps_iniciales
    )
    db.commit()
