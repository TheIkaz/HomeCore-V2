import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getListaCompra, getProductos,
  modificarProducto, crearProducto,
} from "../../api/inventario";
import styles from "./Inventario.module.css";

export default function ListaCompra() {
  const navigate = useNavigate();
  const [productos,      setProductos]      = useState([]);
  const [todosProductos, setTodosProductos] = useState([]);
  const [enCesta,        setEnCesta]        = useState(new Set());
  const [mostrarPanel,   setMostrarPanel]   = useState(false);
  const [mostrarNuevo,   setMostrarNuevo]   = useState(false);
  const [formNuevo,      setFormNuevo]      = useState({ nombre: "", categoria: "", catNueva: "", unidad: "" });
  const [cargando,       setCargando]       = useState(true);
  const [error,          setError]          = useState(null);

  const cargar = () =>
    Promise.all([
      getListaCompra().then((d) => setProductos(d.datos)),
      getProductos().then((d)   => setTodosProductos(d.datos)),
    ]).finally(() => setCargando(false));

  useEffect(() => {
    cargar();
    const intervalo = setInterval(cargar, 10000);
    return () => clearInterval(intervalo);
  }, []);

  if (cargando) return <p className={styles.cargando}>Cargando...</p>;

  const toggleCesta = (id) =>
    setEnCesta((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const terminarCompra = async () => {
    await Promise.all(
      [...enCesta].map((id) => modificarProducto(id, { en_lista_compra: false }))
    );
    setEnCesta(new Set());
    cargar();
  };

  const añadirALista = (p) =>
    modificarProducto(p.id, { en_lista_compra: true }).then(() => cargar());

  const guardarNuevo = async (e) => {
    e.preventDefault();
    setError(null);
    const categoria = formNuevo.categoria === "__nueva__"
      ? formNuevo.catNueva.trim()
      : formNuevo.categoria;
    if (!categoria) { setError("La categoría es obligatoria"); return; }
    try {
      await crearProducto({
        nombre:          formNuevo.nombre.trim(),
        categoria,
        unidad:          formNuevo.unidad.trim(),
        cantidad:        0,
        umbral_agotado:  0,
        en_lista_compra: true,
      });
      setFormNuevo({ nombre: "", categoria: "", catNueva: "", unidad: "" });
      setMostrarNuevo(false);
      cargar();
    } catch (err) {
      setError(err.message);
    }
  };

  const enListaIds  = new Set(productos.map((p) => p.id));
  const disponibles = todosProductos.filter((p) => !enListaIds.has(p.id));
  const categorias  = [...new Set(todosProductos.map((p) => p.categoria).filter(Boolean))].sort();

  return (
    <div>
      <button className={styles.btnVolver} onClick={() => navigate("/inventario")}>← Volver</button>
      <div className={styles.header}>
        <h1 className={styles.titulo}>Lista de la compra</h1>
        <button className={styles.btnPrimario} onClick={() => { setMostrarPanel((v) => !v); setMostrarNuevo(false); }}>
          + Añadir artículo
        </button>
      </div>

      {/* Panel de añadir */}
      {mostrarPanel && (
        <div className={styles.panelAnadir}>
          {disponibles.length > 0 && disponibles.map((p) => (
            <div key={p.id} className={styles.itemDisponible}>
              <span>{p.nombre} <small>({p.categoria})</small></span>
              <button onClick={() => añadirALista(p)}>Añadir</button>
            </div>
          ))}

          {!mostrarNuevo ? (
            <button className={styles.btnNuevoEnLista} onClick={() => setMostrarNuevo(true)}>
              + Crear artículo nuevo
            </button>
          ) : (
            <form className={styles.formNuevoEnLista} onSubmit={guardarNuevo}>
              <strong className={styles.formNuevoTitulo}>Nuevo artículo</strong>
              <input
                placeholder="Nombre"
                value={formNuevo.nombre}
                onChange={e => setFormNuevo(p => ({ ...p, nombre: e.target.value }))}
                required
              />
              <select
                value={formNuevo.categoria}
                onChange={e => setFormNuevo(p => ({ ...p, categoria: e.target.value }))}
                required
              >
                <option value="" disabled>Categoría</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                <option value="__nueva__">── Nueva categoría ──</option>
              </select>
              {formNuevo.categoria === "__nueva__" && (
                <input
                  placeholder="Nombre de la nueva categoría"
                  value={formNuevo.catNueva}
                  onChange={e => setFormNuevo(p => ({ ...p, catNueva: e.target.value }))}
                  required
                />
              )}
              <input
                placeholder="Unidad (ud, kg, L…)"
                value={formNuevo.unidad}
                onChange={e => setFormNuevo(p => ({ ...p, unidad: e.target.value }))}
                required
              />
              {error && <p className={styles.errorMsg}>{error}</p>}
              <div className={styles.formNuevoAcciones}>
                <button type="submit" className={styles.btnPrimario}>Añadir a la lista</button>
                <button type="button" onClick={() => { setMostrarNuevo(false); setError(null); }}>Cancelar</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Lista */}
      {productos.length === 0 ? (
        <p className={styles.vacio}>La lista de la compra está vacía.</p>
      ) : (
        <>
          <ul className={styles.listaCompra}>
            {productos.map((p) => (
              <li
                key={p.id}
                className={`${styles.itemCompra} ${enCesta.has(p.id) ? styles.itemMarcado : ""}`}
                onClick={() => toggleCesta(p.id)}
              >
                <input
                  type="checkbox"
                  className={styles.check}
                  checked={enCesta.has(p.id)}
                  onChange={() => toggleCesta(p.id)}
                  onClick={e => e.stopPropagation()}
                />
                <span className={styles.itemNombre}>
                  {p.nombre} <small>({p.categoria})</small>
                </span>
              </li>
            ))}
          </ul>

          <button
            className={styles.btnCompraHecha}
            disabled={enCesta.size === 0}
            onClick={terminarCompra}
          >
            Terminar compra
          </button>
        </>
      )}
    </div>
  );
}
